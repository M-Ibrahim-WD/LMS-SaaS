"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api/client";
import { useAuthStore } from "../store/auth.store";

type ProtectedMediaKind = "VIDEO" | "FILE";
type ResolvedViewerKind = "video" | "stream-video" | "pdf" | "image" | "audio" | "text" | "generic";
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
  watermarkText?: string | null;
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
  title,
  watermarkText
}: {
  src: string;
  title: string;
  watermarkText?: string | null;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function renderPdf() {
      setLoading(true);
      setError(null);
      setPageCount(0);

      try {
        const response = await fetch(src, { credentials: "omit" });
        if (!response.ok) {
          throw new Error("Could not load the protected PDF pages.");
        }

        const metadata = (await response.json()) as { pageCount?: number };
        const nextPageCount = Number(metadata.pageCount ?? 0);

        if (isActive) {
          setPageCount(Number.isFinite(nextPageCount) && nextPageCount > 0 ? nextPageCount : 0);
        }
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
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

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
        {title}
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

  const pageImageUrl = (pageNumber: number) => {
    const url = new URL(src);
    const query = url.search;
    return `${url.origin}${url.pathname}/${pageNumber}${query}`;
  };

  return (
    <div ref={frameRef} className="flex h-full flex-col overflow-hidden rounded-[20px] bg-slate-100 p-2 sm:rounded-[24px] sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600">
          {pageCount > 0 ? `${pageCount} protected page${pageCount === 1 ? "" : "s"}` : title}
        </p>
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
        >
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </button>
      </div>
      {pageCount > 0 ? (
        <div
          className="min-h-0 flex-1 overflow-auto rounded-[20px] bg-slate-200 p-3"
          aria-label={`${title} protected PDF pages`}
          onContextMenu={(event) => event.preventDefault()}
        >
          {Array.from({ length: pageCount }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <div key={pageNumber} className="mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pageImageUrl(pageNumber)}
                  alt={`${title} page ${pageNumber}`}
                  className="mx-auto max-w-full select-none rounded-[18px] bg-white shadow-sm"
                  draggable={false}
                  loading={pageNumber <= 2 ? "eager" : "lazy"}
                  onContextMenu={(event) => event.preventDefault()}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function formatMediaTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function ProtectedCanvasVideoPlayer({
  src,
  title,
  watermarkText,
  onContextMenuAttempt
}: {
  src: string;
  title: string;
  watermarkText?: string | null;
  onContextMenuAttempt: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = frameRef.current;
    if (!canvas || !host) {
      return;
    }

    const syncCanvasSize = () => {
      const rect = host.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const drawFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!video || !canvas || !context) {
        return;
      }

      context.fillStyle = "#020617";
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (video.videoWidth && video.videoHeight) {
        const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const drawWidth = video.videoWidth * scale;
        const drawHeight = video.videoHeight * scale;
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;
        context.drawImage(video, x, y, drawWidth, drawHeight);
      }

      if (watermarkText) {
        const seconds = Date.now() / 1000;
        const padding = 18 * (window.devicePixelRatio || 1);
        const fontSize = 10 * (window.devicePixelRatio || 1);
        context.font = `600 ${fontSize}px sans-serif`;
        context.textBaseline = "middle";
        const textWidth = context.measureText(watermarkText).width;
        const badgeWidth = textWidth + padding * 1.4;
        const badgeHeight = fontSize * 2.2;
        const positions = [
          { x: padding, y: padding },
          { x: canvas.width - badgeWidth - padding, y: padding },
          { x: canvas.width - badgeWidth - padding, y: canvas.height - badgeHeight - padding },
          { x: padding, y: canvas.height - badgeHeight - padding }
        ];
        const loopDurationSeconds = 56;
        const progress = (seconds % loopDurationSeconds) / loopDurationSeconds;
        const segmentPosition = progress * positions.length;
        const startIndex = Math.floor(segmentPosition) % positions.length;
        const endIndex = (startIndex + 1) % positions.length;
        const segmentProgress = segmentPosition - Math.floor(segmentPosition);
        const easedProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
        const start = positions[startIndex];
        const end = positions[endIndex];
        const point = {
          x: start.x + (end.x - start.x) * easedProgress,
          y: start.y + (end.y - start.y) * easedProgress
        };
        context.fillStyle = "rgba(2, 6, 23, 0.4)";
        context.beginPath();
        context.roundRect(point.x, point.y, badgeWidth, badgeHeight, badgeHeight / 2);
        context.fill();
        context.fillStyle = "rgba(255, 255, 255, 0.84)";
        context.fillText(watermarkText, point.x + padding * 0.7, point.y + badgeHeight / 2);
      }

      animationFrameRef.current = window.requestAnimationFrame(drawFrame);
    };

    animationFrameRef.current = window.requestAnimationFrame(drawFrame);
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [watermarkText]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play().catch(() => undefined);
      return;
    }

    video.pause();
  };

  const toggleFullscreen = async () => {
    const host = frameRef.current;
    if (!host) {
      return;
    }

    if (document.fullscreenElement === host) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await host.requestFullscreen().catch(() => undefined);
  };

  return (
    <div
      ref={frameRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[24px] bg-slate-950"
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenuAttempt();
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
        className="pointer-events-none absolute h-px w-px opacity-0"
        aria-hidden="true"
        tabIndex={-1}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onVolumeChange={(event) => setVolume(event.currentTarget.volume)}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenuAttempt();
        }}
        onDragStart={(event) => event.preventDefault()}
      />
      <canvas ref={canvasRef} aria-label={title} className="min-h-0 flex-1 bg-slate-950" />
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-slate-950/95 px-3 py-2 text-white">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <span className="text-xs font-medium text-white/75">{formatMediaTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || currentTime)}
          onChange={(event) => {
            const nextTime = Number(event.target.value);
            if (videoRef.current) {
              videoRef.current.currentTime = nextTime;
            }
            setCurrentTime(nextTime);
          }}
          className="min-w-[160px] flex-1 accent-cyan-300"
          aria-label="Video progress"
        />
        <span className="text-xs font-medium text-white/75">{formatMediaTime(duration)}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(event) => {
            const nextVolume = Number(event.target.value);
            if (videoRef.current) {
              videoRef.current.volume = nextVolume;
            }
            setVolume(nextVolume);
          }}
          className="w-20 accent-cyan-300"
          aria-label="Volume"
        />
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
        >
          {isFullscreen ? "Exit" : "Full"}
        </button>
      </div>
    </div>
  );
}

function ProtectedStreamVideoPlayer({
  src,
  title,
  watermarkText,
  onContextMenuAttempt
}: {
  src: string;
  title: string;
  watermarkText?: string | null;
  onContextMenuAttempt: () => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const host = frameRef.current;
    if (!host) {
      return;
    }

    if (document.fullscreenElement === host) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await host.requestFullscreen().catch(() => undefined);
  };

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden rounded-[24px] bg-slate-950"
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenuAttempt();
      }}
    >
      <iframe
        src={src}
        title={title}
        className="h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        sandbox="allow-same-origin allow-scripts allow-presentation"
      />
      {watermarkText ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-slate-950/55 px-3 py-1 text-[10px] font-semibold text-white/90 shadow-sm animate-[media-watermark-drift_56s_linear_infinite]">
          {watermarkText}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className="absolute bottom-3 right-3 rounded-full border border-white/20 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-slate-900"
      >
        {isFullscreen ? "Exit" : "Full"}
      </button>
      <style jsx>{`
        @keyframes media-watermark-drift {
          0% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(calc(100vw - 220px), 0);
          }
          50% {
            transform: translate(calc(100vw - 220px), calc(100vh - 180px));
          }
          75% {
            transform: translate(0, calc(100vh - 180px));
          }
          100% {
            transform: translate(0, 0);
          }
        }
      `}</style>
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
  const authUser = useAuthStore((state) => state.user);
  const sessionIdRef = useRef<string | null>(null);
  const loggedEventKeysRef = useRef<Set<string>>(new Set());
  const [activeSession, setActiveSession] = useState<MediaSessionResponse | null>(null);

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
    if (mediaSessionQuery.data) {
      setActiveSession(mediaSessionQuery.data);
    }
  }, [mediaSessionQuery.data]);

  useEffect(() => {
    sessionIdRef.current = activeSession?.sessionId ?? null;
    loggedEventKeysRef.current.clear();
  }, [activeSession?.sessionId]);

  const resolvedViewerKind = useMemo<ResolvedViewerKind>(() => {
    const sourceType = activeSession?.mediaContentType ?? mediaContentType ?? "";
    const viewerUrl = activeSession?.viewerUrl ?? "";

    if (viewerUrl.includes("iframe.videodelivery.net")) {
      return "stream-video";
    }

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
  }, [mediaKind, mediaContentType, activeSession?.mediaContentType, activeSession?.viewerUrl]);

  const mediaAccessToken = useMemo(() => {
    if (!activeSession?.viewerUrl) {
      return null;
    }

    try {
      return new URL(activeSession.viewerUrl).searchParams.get("token");
    } catch {
      return null;
    }
  }, [activeSession?.viewerUrl]);

  useEffect(() => {
    if (!activeSession?.expiresAt || !activeSession.sessionId || !mediaAccessToken || !accessToken) {
      return;
    }

    const expiresAt = new Date(activeSession.expiresAt).getTime();
    const renewInMs = Math.max(15_000, expiresAt - Date.now() - 120_000);
    const timeout = window.setTimeout(() => {
      void apiFetch<MediaSessionResponse>(`/lessons/${lessonId}/media-session/${activeSession.sessionId}/renew`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          token: mediaAccessToken,
          deviceLabel:
            typeof navigator !== "undefined"
              ? `${navigator.platform} / ${navigator.userAgent}`
              : undefined
        })
      })
        .then((nextSession) => {
          setActiveSession(nextSession);
        })
        .catch(() => {
          // A failed renewal should not interrupt active playback; the current session can continue until expiry.
        });
    }, renewInMs);

    return () => window.clearTimeout(timeout);
  }, [accessToken, activeSession?.expiresAt, activeSession?.sessionId, lessonId, mediaAccessToken]);

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
    if (!activeSession?.sessionId) {
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
      if (
        event.key === "F12" ||
        (isModifier && event.key.toLowerCase() === "u") ||
        (isModifier && event.shiftKey && ["i", "j", "c"].includes(event.key.toLowerCase()))
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [courseTitle, lessonId, lessonTitle, activeSession?.sessionId]);

  if (mediaSessionQuery.isLoading) {
    return (
      <div className={`rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600 ${className ?? ""}`}>
        {lessonTitle}
      </div>
    );
  }

  if (mediaSessionQuery.isError || !activeSession) {
    return (
      <div className={`rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 ${className ?? ""}`}>
        <p className="font-semibold">{lessonTitle}</p>
      </div>
    );
  }

  const sessionFileName = mediaFileName ?? activeSession.mediaFileName ?? null;
  const watermarkText = activeSession.watermarkText ?? authUser?.fullName ?? authUser?.email ?? null;

  const viewerFrame =
    resolvedViewerKind === "stream-video" ? (
      <ProtectedStreamVideoPlayer
        key={activeSession.sessionId}
        src={activeSession.viewerUrl}
        title={lessonTitle}
        watermarkText={watermarkText}
        onContextMenuAttempt={() => {
          void sendSecurityEvent("CONTEXT_MENU_ATTEMPT", { target: "stream-video" }, { onceKey: "context-menu-stream-video" });
        }}
      />
    ) : resolvedViewerKind === "video" ? (
      <ProtectedCanvasVideoPlayer
        key={activeSession.sessionId}
        src={activeSession.viewerUrl}
        title={lessonTitle}
        watermarkText={watermarkText}
        onContextMenuAttempt={() => {
          void sendSecurityEvent("CONTEXT_MENU_ATTEMPT", { target: "video" }, { onceKey: "context-menu-video" });
        }}
      />
    ) : resolvedViewerKind === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={activeSession.sessionId}
        src={activeSession.viewerUrl}
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
          key={activeSession.sessionId}
          src={activeSession.viewerUrl}
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
        key={activeSession.sessionId}
        src={activeSession.viewerUrl}
        title={lessonTitle}
        watermarkText={watermarkText}
      />
    ) : (
      <iframe
        key={activeSession.sessionId}
        src={activeSession.viewerUrl}
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
            {resolvedViewerKind === "video" || resolvedViewerKind === "stream-video"
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
          <div className="relative h-full w-full bg-slate-950">{viewerFrame}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
