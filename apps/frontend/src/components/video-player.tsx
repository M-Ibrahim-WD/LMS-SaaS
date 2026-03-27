"use client";

import { detectVideoSource } from "../lib/video/detect-video";

interface VideoPlayerProps {
  title: string;
  url: string;
}

export function VideoPlayer({ title, url }: VideoPlayerProps) {
  const source = detectVideoSource(url);

  if (source.kind === "invalid") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700">Invalid video link</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="mb-3 text-base font-medium text-slate-800">{title}</p>

      {source.kind === "youtube" ? (
        <div className="relative w-full overflow-hidden rounded-xl bg-black pb-[56.25%]">
          <iframe
            className="absolute left-0 top-0 h-full w-full"
            src={source.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <video className="w-full rounded-xl bg-black" controls playsInline preload="metadata">
          <source src={source.src} type={source.src.endsWith(".webm") ? "video/webm" : "video/mp4"} />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}

