"use client";

import { io, type Socket } from "socket.io-client";

function getSocketBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  return apiUrl.replace(/\/api\/?$/, "");
}

export function createConversationSocket(token: string): Socket {
  return io(`${getSocketBaseUrl()}/conversations`, {
    transports: ["websocket"],
    auth: {
      token: `Bearer ${token}`
    }
  });
}
