"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface PaymentProofActionsProps {
  paymentId: string;
  accessToken: string;
  proofContentType?: string | null;
  proofFileName?: string | null;
}

function fileNameFromDisposition(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const normalMatch = /filename="?([^"]+)"?/i.exec(value);
  return normalMatch?.[1] ?? null;
}

function isImageMime(mimeType: string | null) {
  return Boolean(mimeType && mimeType.startsWith("image/"));
}

export function PaymentProofActions({
  paymentId,
  accessToken,
  proofContentType,
  proofFileName
}: PaymentProofActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(proofContentType ?? null);
  const [resolvedFileName, setResolvedFileName] = useState<string>(proofFileName ?? "proof");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function fetchProofBlob(download: boolean) {
    const suffix = download ? "?download=true" : "";
    const response = await fetch(`${API_URL}/payments/${paymentId}/proof${suffix}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch payment proof");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition");
    const fileName = fileNameFromDisposition(disposition) ?? proofFileName ?? "proof";
    const mimeType = response.headers.get("content-type") ?? blob.type ?? proofContentType ?? "application/octet-stream";

    return {
      blob,
      fileName,
      mimeType
    };
  }

  async function onView() {
    setError(null);
    setIsLoadingPreview(true);

    try {
      const payload = await fetchProofBlob(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const blobUrl = URL.createObjectURL(payload.blob);
      setPreviewUrl(blobUrl);
      setPreviewMime(payload.mimeType);
      setResolvedFileName(payload.fileName);
      setIsOpen(true);
    } catch {
      setError("Could not load proof preview");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function onDownload() {
    setError(null);
    try {
      const payload = await fetchProofBlob(true);
      const blobUrl = URL.createObjectURL(payload.blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = payload.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError("Could not download proof file");
    }
  }

  function onClose() {
    setIsOpen(false);
  }

  return (
    <>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void onView()}
          disabled={isLoadingPreview}
          className="rounded border border-blue-300 px-3 py-1 text-xs text-blue-700 disabled:opacity-60"
        >
          {isLoadingPreview ? "Loading..." : "View Proof"}
        </button>
        <button
          type="button"
          onClick={() => void onDownload()}
          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700"
        >
          Download
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{resolvedFileName}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
              >
                Close
              </button>
            </div>

            {previewUrl ? (
              isImageMime(previewMime) ? (
                <img
                  src={previewUrl}
                  alt={resolvedFileName}
                  className="max-h-[70vh] w-full rounded border object-contain"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={resolvedFileName}
                  className="h-[70vh] w-full rounded border"
                />
              )
            ) : (
              <p className="text-sm text-slate-600">No preview available.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

