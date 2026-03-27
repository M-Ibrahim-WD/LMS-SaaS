export type VideoSource =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "file"; src: string }
  | { kind: "invalid" };

function extractYouTubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();

  if (host.includes("youtube.com")) {
    const id = url.searchParams.get("v");
    if (id) {
      return id;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.findIndex((part) => part === "embed");
    if (embedIndex !== -1 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1];
    }
  }

  if (host.includes("youtu.be")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]) {
      return parts[0];
    }
  }

  return null;
}

function isDirectVideo(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  return pathname.endsWith(".mp4") || pathname.endsWith(".webm");
}

export function detectVideoSource(rawUrl: string): VideoSource {
  try {
    const url = new URL(rawUrl);
    const youtubeId = extractYouTubeId(url);

    if (youtubeId) {
      return { kind: "youtube", embedUrl: `https://www.youtube.com/embed/${youtubeId}` };
    }

    if (isDirectVideo(url)) {
      return { kind: "file", src: rawUrl };
    }

    return { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

