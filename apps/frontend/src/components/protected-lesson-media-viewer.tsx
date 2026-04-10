"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api/client";
import { useAuthStore } from "../store/auth.store";

type ProtectedMediaKind = "VIDEO" | "FILE";
type ResolvedViewerKind = "video" | "pdf" | "image" | "audio" | "text" | "generic";
type ProtectedEventType =
  | "PRINT_ATTEMPT"
  | "COPY_ATTEMPT"
  | "CONTEXT_MENU_ATTEMPT";

type MediaSessionResponse = {
  sessionId: string;
  expiresAt: string;
  mediaKind: ProtectedMediaKind;
  mediaContentType?: string | null;
  mediaFileName?: string | null;
  viewerUrl: string;
  policy: {
    disableDownload: boolean;
    disablePictureInPicture: boolean;
    blockContextMenu: boolean;
    watermark: boolean;
    trackVisibility: boolean;
  };
};

interface ProtectedLessonMediaViewerProps {
  lessonId: string;
  lessonTitle: string;
  mediaKind: ProtectedMediaKind;
  mediaContentType?: string | null;
  mediaFileName?: string | null;
  courseTitle: string;
  className?: string;
}

function ProtectedPdfCanvasViewer({
  src,
  title
}: {
  src: string;
  title: string;
}) {
  const objectUrlRef = useRef<string | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const toolbarMaskHostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [maskWidths, setMaskWidths] = useState({ primary: 345, secondary: 128 });

  useEffect(() => {
    let isActive = true;

    async function renderPdf() {
      setLoading(true);
      setError(null);
      setBlobUrl(null);

      try {
        const response = await fetch(src, { credentials: "omit" });
        if (!response.ok) {
          throw new Error("Could not load the PDF file.");
        }

        const blob = await response.blob();
        const nextBlobUrl = URL.createObjectURL(blob);
        objectUrlRef.current = nextBlobUrl;

        if (!isActive) {
          URL.revokeObjectURL(nextBlobUrl);
          return;
        }

        setBlobUrl(nextBlobUrl);
        setLoading(false);
      } catch (viewerError) {
        if (!isActive) {
          return;
        }
        setError(
          viewerError instanceof Error
            ? viewerError.message
            : "Could not render this PDF inside the lesson viewer."
        );
        setLoading(false);
      }
    }

    void renderPdf();

    return () => {
      isActive = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const host = toolbarMaskHostRef.current;
    if (!host || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateMaskWidths = () => {
      const width = host.clientWidth || 0;
      if (!width) {
        return;
      }

      const primary = Math.max(300, Math.min(420, Math.round(width * 0.43)));
      const secondary = isFullscreen
        ? Math.max(110, Math.min(190, Math.round(width * 0.16)))
        : 0;

      setMaskWidths({ primary, secondary });
    };

    updateMaskWidths();

    const observer = new ResizeObserver(() => {
      updateMaskWidths();
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    if (!frameRef.current) {
      return;
    }

    if (document.fullscreenElement === frameRef.current) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await frameRef.current.requestFullscreen().catch(() => undefined);
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] bg-white p-6 text-sm text-slate-600">
        Loading {title}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-[24px] bg-white p-6">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-amber-800">The PDF could not be displayed inline.</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
      <div ref={frameRef} className="flex h-full flex-col overflow-hidden rounded-[20px] bg-slate-100 p-2 sm:rounded-[24px] sm:p-3">
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      {blobUrl ? (
        <div ref={toolbarMaskHostRef} className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] bg-white">
          <object
            data={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            type="application/pdf"
            aria-label={title}
            className="h-full w-full bg-white"
          >
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={title}
              className="h-full w-full border-0 bg-white"
            />
          </object>
          <div
            aria-hidden="true"
            className="pointer-events-auto absolute right-0 top-0 h-12 rounded-tr-[20px] bg-[#3c3c3c]"
            style={{ width: `${maskWidths.primary}px` }}
          />
          {isFullscreen && maskWidths.secondary > 0 ? (
            <div
              aria-hidden="true"
              className="pointer-events-auto absolute top-0 h-12 bg-[#3c3c3c]"
              style={{
                right: `${maskWidths.primary}px`,
                width: `${maskWidths.secondary}px`
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProtectedLessonMediaViewer({
  lessonId,
  lessonTitle,
  mediaKind,
  mediaContentType,
  mediaFileName,
  courseTitle,
  className
}: ProtectedLessonMediaViewerProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const accessToken = useAuthStore((state) => state.accessToken);
  const sessionIdRef = useRef<string | null>(null);
  const loggedEventKeysRef = useRef<Set<string>>(new Set());

  const mediaSessionQuery = useQuery({
    queryKey: ["lesson-media-session", lessonId],
    queryFn: () =>
      apiFetch<MediaSessionResponse>(`/lessons/${lessonId}/media-session`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          deviceLabel:
            typeof navigator !== "undefined"
              ? `${navigator.platform} / ${navigator.userAgent}`
              : undefined
        })
      }),
    enabled: Boolean(accessToken && lessonId),
    staleTime: 60_000
  });

  useEffect(() => {
    sessionIdRef.current = mediaSessionQuery.data?.sessionId ?? null;
    loggedEventKeysRef.current.clear();
  }, [mediaSessionQuery.data?.sessionId]);

  const resolvedViewerKind = useMemo<ResolvedViewerKind>(() => {
    const sourceType = mediaSessionQuery.data?.mediaContentType ?? mediaContentType ?? "";

    if (sourceType.startsWith("video/")) {
      return "video";
    }
    if (sourceType === "application/pdf") {
      return "pdf";
    }
    if (sourceType.startsWith("image/")) {
      return "image";
    }
    if (sourceType.startsWith("audio/")) {
      return "audio";
    }
    if (sourceType.startsWith("text/")) {
      return "text";
    }

    return mediaKind === "VIDEO" ? "video" : "generic";
  }, [mediaKind, mediaContentType, mediaSessionQuery.data?.mediaContentType]);

  const sendSecurityEvent = async (
    eventType: ProtectedEventType,
    metadata?: Record<string, unknown>,
    options?: { onceKey?: string; keepalive?: boolean }
  ) => {
    if (!accessToken || !sessionIdRef.current) {
      return;
    }

    if (options?.onceKey && loggedEventKeysRef.current.has(options.onceKey)) {
      return;
    }

    if (options?.onceKey) {
      loggedEventKeysRef.current.add(options.onceKey);
    }

    const payload = JSON.stringify({
      eventType,
      mediaSessionId: sessionIdRef.current,
      metadata: {
        lessonTitle,
        courseTitle,
        ...metadata
      }
    });

    if (options?.keepalive) {
      void fetch(`${apiUrl}/lessons/${lessonId}/security-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: payload,
        keepalive: true
      }).catch(() => undefined);
      return;
    }

    try {
      await apiFetch(`/lessons/${lessonId}/security-events`, {
        method: "POST",
        token: accessToken,
        body: payload
      });
    } catch {
      // Do not block viewing if an event log fails.
    }
  };

  useEffect(() => {
    if (!mediaSessionQuery.data?.sessionId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.ctrlKey || event.metaKey;
      if (isModifier && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void sendSecurityEvent("PRINT_ATTEMPT", { shortcut: "print" }, { onceKey: "print-attempt" });
      }
      if (isModifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [courseTitle, lessonId, lessonTitle, mediaSessionQuery.data?.sessionId]);

  if (mediaSessionQuery.isLoading) {
    return (
      <div className={`rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 ${className ?? ""}`}>
        Preparing protected lesson media...
      </div>
    );
  }

  if (mediaSessionQuery.isError || !mediaSessionQuery.data) {
    return (
      <div className={`rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 ${className ?? ""}`}>
        <p className="font-semibold">Protected media is unavailable right now.</p>
        <p className="mt-2">
          {mediaSessionQuery.error instanceof Error
            ? mediaSessionQuery.error.message
            : "Please refresh the lesson to create a fresh protected session."}
        </p>
      </div>
    );
  }

  const sessionFileName = mediaFileName ?? mediaSessionQuery.data.mediaFileName ?? null;

  const viewerFrame =
    resolvedViewerKind === "video" ? (
      <video
        key={mediaSessionQuery.data.sessionId}
        src={mediaSessionQuery.data.viewerUrl}
        controls
        playsInline
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        className="h-full w-full rounded-[24px] bg-slate-950 object-contain"
        onContextMenu={(event) => {
          event.preventDefault();
          void sendSecurityEvent("CONTEXT_MENU_ATTEMPT", { target: "video" }, { onceKey: "context-menu-video" });
        }}
        onDragStart={(event) => event.preventDefault()}
      />
    ) : resolvedViewerKind === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={mediaSessionQuery.data.sessionId}
        src={mediaSessionQuery.data.viewerUrl}
        alt={lessonTitle}
        className="h-full w-full rounded-[24px] object-contain"
        draggable={false}
        onContextMenu={(event) => {
          event.preventDefault();
          void sendSecurityEvent("CONTEXT_MENU_ATTEMPT", { target: "image" }, { onceKey: "context-menu-image" });
        }}
      />
    ) : resolvedViewerKind === "audio" ? (
      <div className="flex h-full min-h-[260px] items-center justify-center rounded-[24px] bg-slate-900 p-6">
        <audio
          key={mediaSessionQuery.data.sessionId}
          src={mediaSessionQuery.data.viewerUrl}
          controls
          controlsList="nodownload noplaybackrate noremoteplayback"
          className="w-full max-w-2xl"
          onContextMenu={(event) => {
            event.preventDefault();
            void sendSecurityEvent("CONTEXT_MENU_ATTEMPT", { target: "audio" }, { onceKey: "context-menu-audio" });
          }}
        />
      </div>
    ) : resolvedViewerKind === "pdf" ? (
      <ProtectedPdfCanvasViewer
        key={mediaSessionQuery.data.sessionId}
        src={mediaSessionQuery.data.viewerUrl}
        title={lessonTitle}
      />
    ) : (
      <iframe
        key={mediaSessionQuery.data.sessionId}
        src={mediaSessionQuery.data.viewerUrl}
        title={`${lessonTitle} protected viewer`}
        className="h-full w-full rounded-[24px] border-0 bg-white"
        sandbox="allow-same-origin allow-scripts"
      />
    );

  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[30px] ${className ?? ""}`}
      onContextMenu={(event) => {
        event.preventDefault();
        void sendSecurityEvent("CONTEXT_MENU_ATTEMPT", { target: "viewer-shell" }, { onceKey: "context-menu-shell" });
      }}
      onCopy={() => {
        void sendSecurityEvent("COPY_ATTEMPT", { target: "viewer-shell" }, { onceKey: "copy-attempt" });
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Lesson media</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{lessonTitle}</p>
          {sessionFileName ? <p className="mt-1 text-xs text-slate-500">{sessionFileName}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            {resolvedViewerKind === "video"
              ? "Inline video"
              : resolvedViewerKind === "pdf"
                ? "Inline PDF"
                : resolvedViewerKind === "image"
                  ? "Inline image"
                  : resolvedViewerKind === "audio"
                    ? "Inline audio"
                    : resolvedViewerKind === "text"
                      ? "Inline text"
                      : "Inline file"}
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Available in this course
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-b-[24px] bg-slate-950 p-2 sm:rounded-b-[30px] sm:p-3">
          <div
            className={`mx-auto overflow-hidden rounded-[24px] ${
              resolvedViewerKind === "audio"
                ? "min-h-[180px] bg-slate-900 sm:min-h-[220px]"
                : resolvedViewerKind === "pdf" || resolvedViewerKind === "text" || resolvedViewerKind === "generic"
                  ? "h-[320px] max-h-[60vh] bg-white sm:h-[520px] sm:max-h-[65vh]"
                  : "aspect-video max-h-[55vh] bg-slate-950 sm:max-h-[70vh]"
            }`}
          >
          {viewerFrame}
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:grid-cols-3">
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Access</p>
          <p className="mt-2 leading-5">This lesson stays available inside the course whenever the enrolled learner returns. The access session renews in the background when needed.</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Protection</p>
          <p className="mt-2 leading-5">Access is tied to authenticated course membership and short-lived protected media sessions instead of a permanent public lesson file.</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-3">
          <p className="font-semibold uppercase tracking-[0.18em] text-slate-500">Note</p>
          <p className="mt-2 leading-5">We removed the visual watermark and noisy viewer alerts so the lesson experience stays readable while we continue hardening delivery.</p>
        </div>
      </div>
    </div>
  );
}
