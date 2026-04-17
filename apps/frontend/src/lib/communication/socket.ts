"use client";

import { io, type Socket } from "socket.io-client";

function getSocketBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

  if (typeof window === "undefined") {
    return apiUrl.replace(/\/api\/?$/, "");
  }

  try {
    const parsed = new URL(apiUrl);
    const currentHost = window.location.hostname;
    const configuredIsLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    const currentIsLocal = ["localhost", "127.0.0.1", "::1"].includes(currentHost);

    if (configuredIsLocal && !currentIsLocal) {
      parsed.hostname = currentHost;
      parsed.protocol = window.location.protocol === "https:" ? "https:" : parsed.protocol;
    }

    return parsed.toString().replace(/\/api\/?$/, "");
  } catch {
    return apiUrl.replace(/\/api\/?$/, "");
  }
}

export function createConversationSocket(token: string): Socket {
  return io(`${getSocketBaseUrl()}/conversations`, {
    transports: ["websocket"],
    auth: {
      token: `Bearer ${token}`
    }
  });
}
