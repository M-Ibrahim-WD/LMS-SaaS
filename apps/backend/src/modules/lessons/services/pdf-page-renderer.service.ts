import { Injectable, InternalServerErrorException } from "@nestjs/common";

type PdfJsDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getViewport(input: { scale: number }): {
      width: number;
      height: number;
    };
    render(input: {
      canvasContext: unknown;
      viewport: unknown;
    }): {
      promise: Promise<void>;
    };
  }>;
  destroy(): Promise<void>;
};

@Injectable()
export class PdfPageRendererService {
  private readonly metadataCache = new Map<string, { pageCount: number; expiresAt: number }>();
  private readonly pageCache = new Map<string, { image: Buffer; expiresAt: number }>();
  private readonly cacheLifetimeMs = 10 * 60 * 1000;

  async getPageCount(cacheKey: string, pdfBuffer: Buffer) {
    const cached = this.metadataCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.pageCount;
    }

    const pdf = await this.loadPdf(pdfBuffer);
    try {
      const pageCount = pdf.numPages;
      this.metadataCache.set(cacheKey, {
        pageCount,
        expiresAt: Date.now() + this.cacheLifetimeMs
      });
      return pageCount;
    } finally {
      await pdf.destroy();
    }
  }

  async renderWatermarkedPage(input: {
    cacheKey: string;
    pdfBuffer: Buffer;
    pageNumber: number;
    watermarkText: string;
  }) {
    const pageCacheKey = `${input.cacheKey}:${input.pageNumber}:${this.safeCacheKey(input.watermarkText)}`;
    const cached = this.pageCache.get(pageCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.image;
    }

    const { createCanvas, DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
    this.installCanvasGlobals({ DOMMatrix, ImageData, Path2D });

    const pdf = await this.loadPdf(input.pdfBuffer);
    try {
      if (input.pageNumber < 1 || input.pageNumber > pdf.numPages) {
        throw new InternalServerErrorException("PDF page does not exist");
      }

      const page = await pdf.getPage(input.pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.max(1.25, 1200 / baseViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      this.drawWatermark(context as unknown as CanvasRenderingContext2D, canvas.width, canvas.height, input.watermarkText);

      const image = canvas.toBuffer("image/png");
      this.pageCache.set(pageCacheKey, {
        image,
        expiresAt: Date.now() + this.cacheLifetimeMs
      });
      return image;
    } finally {
      await pdf.destroy();
      this.pruneExpiredCache();
    }
  }

  private async loadPdf(pdfBuffer: Buffer): Promise<PdfJsDocument> {
    try {
      const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
      this.installCanvasGlobals({ DOMMatrix, ImageData, Path2D });

      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        disableWorker: true
      } as never);

      return (await loadingTask.promise) as PdfJsDocument;
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? `Could not render protected PDF: ${error.message}` : "Could not render protected PDF"
      );
    }
  }

  private drawWatermark(context: CanvasRenderingContext2D, width: number, height: number, watermarkText: string) {
    context.save();
    context.globalAlpha = 0.16;
    context.fillStyle = "#0f172a";
    context.font = "600 18px sans-serif";
    context.translate(width / 2, height / 2);
    context.rotate(-Math.PI / 8);

    for (let y = -height; y < height; y += 190) {
      for (let x = -width; x < width; x += 280) {
        context.fillText(watermarkText, x, y);
      }
    }

    context.restore();
  }

  private installCanvasGlobals(input: { DOMMatrix: unknown; ImageData: unknown; Path2D: unknown }) {
    const globalScope = globalThis as Record<string, unknown>;

    globalScope.DOMMatrix ??= input.DOMMatrix;
    globalScope.ImageData ??= input.ImageData;
    globalScope.Path2D ??= input.Path2D;
  }

  private safeCacheKey(value: string) {
    return Buffer.from(value).toString("base64url").slice(0, 80);
  }

  private pruneExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.metadataCache.entries()) {
      if (value.expiresAt <= now) {
        this.metadataCache.delete(key);
      }
    }
    for (const [key, value] of this.pageCache.entries()) {
      if (value.expiresAt <= now) {
        this.pageCache.delete(key);
      }
    }
  }
}
