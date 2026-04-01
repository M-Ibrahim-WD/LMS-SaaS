"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api/client";
import { createConversationSocket } from "../lib/communication/socket";
import {
  formatConversationDate,
  formatRelativeConversationTime,
  groupConversationMessages,
  type ConversationDetail,
  type ConversationSummary,
  type ConversationUser
} from "../lib/communication/types";
import { useAuthStore } from "../store/auth.store";

type HubPane = "DIRECT" | "SUPPORT" | null;
type HubTab = "SUPPORT" | "MESSAGES";
type HubView = "HOME" | "LIST" | "NEW";

function HubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A2.5 2.5 0 0 1 6.5 6h5A2.5 2.5 0 0 1 14 8.5v4A2.5 2.5 0 0 1 11.5 15H9l-3 2v-2H6.5A2.5 2.5 0 0 1 4 12.5v-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10.5A2.5 2.5 0 0 1 15.5 8H18a2.5 2.5 0 0 1 2.5 2.5v4A2.5 2.5 0 0 1 18 17h-.5v2l-3-2h-1" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 7 6.5 5 6.5-5" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1 1 15 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12v2.5A2.5 2.5 0 0 0 7 17h1.5v-5H7a2.5 2.5 0 0 0-2.5 2.5Zm15 0A2.5 2.5 0 0 0 17 12h-1.5v5H17a2.5 2.5 0 0 0 2.5-2.5V12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20.5h5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 7-5 5 5 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.24" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DeliveredIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m7.5 12.5 2.3 2.3 4.7-5.3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 12.5 2.3 2.3 4.7-5.3" />
    </svg>
  );
}

function getInitials(name?: string | null) {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function FloatingCommunicationHub() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<HubTab>("SUPPORT");
  const [tabViews, setTabViews] = useState<Record<HubTab, HubView>>({
    SUPPORT: "HOME",
    MESSAGES: "HOME"
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<HubPane>(null);
  const [composerText, setComposerText] = useState("");
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [directTargetId, setDirectTargetId] = useState("");
  const [directStartError, setDirectStartError] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const unreadMarkerCountRef = useRef<Record<string, number>>({});

  const shouldRender =
    Boolean(hasHydrated && accessToken && user) &&
    user?.role !== "ADMIN";

  const unreadMessagesQuery = useQuery({
    queryKey: ["conversations", "hub-direct-unread"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=DIRECT&status=OPEN&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const unreadSupportQuery = useQuery({
    queryKey: ["conversations", "hub-support-unread"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=SUPPORT&status=OPEN&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const directConversationsQuery = useQuery({
    queryKey: ["conversations", "hub-direct-open"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=DIRECT&status=OPEN", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const supportConversationsQuery = useQuery({
    queryKey: ["conversations", "hub-support-open"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=SUPPORT&status=OPEN", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const directTargetsQuery = useQuery({
    queryKey: ["conversations", "hub-direct-targets"],
    queryFn: () =>
      apiFetch<ConversationUser[]>("/conversations/direct-targets", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const activeConversationQuery = useQuery({
    queryKey: ["conversation", "hub", activeConversationId],
    queryFn: () =>
      apiFetch<ConversationDetail>(`/conversations/${activeConversationId}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender && activeConversationId)
  });

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${activeConversationId}/messages`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          body: composerText.trim()
        })
      }),
    onSuccess: async () => {
      setComposerText("");
      setDeliveredAt(new Date().toISOString());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", "hub", activeConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
  });

  const createDirectMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      apiFetch<ConversationSummary>("/conversations/direct", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          targetUserId
        })
      }),
    onSuccess: async (conversation) => {
      setDirectStartError(null);
      setDirectTargetId("");
      setActiveConversationId(conversation.id);
      setActivePane("DIRECT");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    },
    onError: (error) => {
      setDirectStartError(error instanceof Error ? error.message : "Could not open the selected chat.");
    }
  });

  const createSupportMutation = useMutation({
    mutationFn: () =>
      apiFetch<ConversationSummary>("/conversations/support", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          subject: supportSubject.trim() || undefined,
          message: supportMessage.trim()
        })
      }),
    onSuccess: async (conversation) => {
      setSupportError(null);
      setSupportSubject("");
      setSupportMessage("");
      setActiveConversationId(conversation.id);
      setActivePane("SUPPORT");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    },
    onError: (error) => {
      setSupportError(error instanceof Error ? error.message : "Could not start the support chat.");
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch(`/conversations/${conversationId}/read`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async (_, conversationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", "hub", conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (activeConversationId) {
          setActiveConversationId(null);
          setActivePane(null);
          return;
        }
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeConversationId, open]);

  useEffect(() => {
    if (!deliveredAt) {
      return;
    }

    const timeout = window.setTimeout(() => setDeliveredAt(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [deliveredAt]);

  useEffect(() => {
    if (!accessToken || !activeConversationId) {
      return;
    }

    const socket = createConversationSocket(accessToken);

    socket.on("connect", () => {
      socket.emit("conversation.join", { conversationId: activeConversationId });
    });

    const onRefresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation", "hub", activeConversationId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("conversation.message.created", onRefresh);
    socket.on("conversation.read.updated", onRefresh);
    socket.on("conversation.status.updated", onRefresh);
    socket.on("support.assignment.updated", onRefresh);

    return () => {
      socket.emit("conversation.leave", { conversationId: activeConversationId });
      socket.off("conversation.message.created", onRefresh);
      socket.off("conversation.read.updated", onRefresh);
      socket.off("conversation.status.updated", onRefresh);
      socket.off("support.assignment.updated", onRefresh);
      socket.disconnect();
    };
  }, [accessToken, activeConversationId, queryClient]);

  const unreadMessages = unreadMessagesQuery.data ?? [];
  const unreadSupport = unreadSupportQuery.data ?? [];
  const directConversations = directConversationsQuery.data ?? [];
  const supportConversations = supportConversationsQuery.data ?? [];
  const directTargets = directTargetsQuery.data ?? [];
  const totalUnread = unreadMessages.length + unreadSupport.length;
  const activeConversation = activeConversationQuery.data ?? null;

  useEffect(() => {
    if (!activeConversationId || !activeConversation || activeConversation.unreadCount <= 0) {
      return;
    }

    if (unreadMarkerCountRef.current[activeConversationId] == null) {
      unreadMarkerCountRef.current[activeConversationId] = activeConversation.unreadCount;
    }
  }, [activeConversation, activeConversationId]);

  useEffect(() => {
    if (!open || !activeConversation || activeConversation.unreadCount === 0 || !activeConversationId) {
      return;
    }

    void markReadMutation.mutateAsync(activeConversationId);
  }, [activeConversation, activeConversationId, markReadMutation, open]);

  const groupedMessages = activeConversation ? groupConversationMessages(activeConversation.messages) : [];

  const unreadMarkerMessageId = useMemo(() => {
    if (!activeConversation || !activeConversationId) {
      return null;
    }

    const unreadCount = unreadMarkerCountRef.current[activeConversationId] ?? 0;
    if (unreadCount <= 0) {
      return null;
    }

    let remaining = unreadCount;
    for (let index = activeConversation.messages.length - 1; index >= 0; index -= 1) {
      const message = activeConversation.messages[index];
      if (message.sender.id === user?.id) {
        continue;
      }
      remaining -= 1;
      if (remaining === 0) {
        return message.id;
      }
    }

    return null;
  }, [activeConversation, activeConversationId, user?.id]);

  useEffect(() => {
    if (!activeConversation || !open) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages, activeConversation, open]);

  if (!shouldRender) {
    return null;
  }

  const showMessagesSection = pathname !== "/messages";
  const showSupportSection = pathname !== "/support";
  const activeTabVisible =
    activeTab === "MESSAGES"
      ? showMessagesSection
        ? "MESSAGES"
        : "SUPPORT"
      : showSupportSection
        ? "SUPPORT"
        : "MESSAGES";
  const currentTabView = tabViews[activeTabVisible];
  const currentTabConversations = activeTabVisible === "MESSAGES" ? directConversations : supportConversations;
  const currentTabUnread = activeTabVisible === "MESSAGES" ? unreadMessages.length : unreadSupport.length;
  const activeTabAccent =
    activeTabVisible === "MESSAGES"
      ? {
          solid: "bg-sky-600 hover:bg-sky-700",
          subtle: "border border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-100",
          muted: "border border-sky-200 bg-sky-50/80",
          badge: "bg-sky-100 text-sky-700"
        }
      : {
          solid: "bg-emerald-600 hover:bg-emerald-700",
          subtle: "border border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
          muted: "border border-emerald-200 bg-emerald-50/80",
          badge: "bg-emerald-100 text-emerald-700"
        };

  const resetThreadState = () => {
    setActiveConversationId(null);
    setActivePane(null);
    setComposerText("");
    setDeliveredAt(null);
  };

  const openConversation = (conversationId: string, pane: Exclude<HubPane, null>) => {
    setActiveConversationId(conversationId);
    setActivePane(pane);
    setComposerText("");
    setDeliveredAt(null);
  };

  const switchTab = (tab: HubTab) => {
    setActiveTab(tab);
    resetThreadState();
    setDirectStartError(null);
    setSupportError(null);
  };

  const openExisting = () => {
    resetThreadState();
    setTabViews((current) => ({
      ...current,
      [activeTabVisible]: "LIST"
    }));
  };

  const openNew = () => {
    resetThreadState();
    setTabViews((current) => ({
      ...current,
      [activeTabVisible]: "NEW"
    }));
  };

  const backFromThread = () => {
    resetThreadState();
    setTabViews((current) => ({
      ...current,
      [activeTabVisible]: currentTabConversations.length > 0 ? "LIST" : "HOME"
    }));
  };

  const handleNewDirectConversation = async () => {
    if (!directTargetId) {
      setDirectStartError("Select a person first.");
      return;
    }
    await createDirectMutation.mutateAsync(directTargetId);
  };

  const handleNewSupportConversation = async () => {
    if (!supportMessage.trim()) {
      setSupportError("Write your support message first.");
      return;
    }
    await createSupportMutation.mutateAsync();
  };

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <div
        className={`surface-card-strong w-[min(92vw,22rem)] rounded-[28px] p-4 transition duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="space-y-4">
          <div className="flex rounded-full border border-slate-200 bg-slate-100/80 p-1">
            {showSupportSection ? (
              <button
                type="button"
                onClick={() => switchTab("SUPPORT")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTabVisible === "SUPPORT"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                Support
              </button>
            ) : null}
            {showMessagesSection ? (
              <button
                type="button"
                onClick={() => switchTab("MESSAGES")}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTabVisible === "MESSAGES"
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 hover:text-sky-700"
                }`}
              >
                Messages
              </button>
            ) : null}
          </div>

          {activeConversation ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={backFromThread}
                    aria-label="Back to communication actions"
                    title="Back to communication actions"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <BackIcon />
                  </button>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">
                    {activePane === "DIRECT"
                      ? activeConversation.otherParticipant?.fullName ?? "Conversation"
                      : activeConversation.requester?.fullName ?? "Support conversation"}
                  </h3>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeTabAccent.badge}`}>
                  {activePane === "DIRECT" ? "Messages" : "Support"}
                </span>
              </div>

              <div className="ui-scrollbar max-h-[16rem] space-y-3 overflow-y-auto pr-1">
              {activePane === "DIRECT" && directConversations.length > 1 ? (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {directConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openConversation(conversation.id, "DIRECT")}
                      className={`shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                        activeConversationId === conversation.id
                          ? "bg-sky-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700"
                      }`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        activeConversationId === conversation.id ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700"
                      }`}>
                        {getInitials(conversation.otherParticipant?.fullName)}
                      </span>
                      {conversation.otherParticipant?.fullName ?? "Conversation"}
                    </button>
                  ))}
                </div>
              ) : null}
              {activePane === "SUPPORT" && supportConversations.length > 1 ? (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {supportConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => openConversation(conversation.id, "SUPPORT")}
                      className={`shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                        activeConversationId === conversation.id
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        activeConversationId === conversation.id ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {getInitials(conversation.requester?.fullName)}
                      </span>
                      {conversation.requester?.fullName ?? "Support"}
                    </button>
                  ))}
                </div>
              ) : null}
              {activeConversationQuery.isLoading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Loading conversation...
                </p>
              ) : groupedMessages.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No messages yet. Send the first one.
                </p>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <div className="flex justify-center">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                        {group.label}
                      </span>
                    </div>
                    {group.items.map((message) => {
                      const isMine = message.sender.id === user?.id;
                      return (
                        <div key={message.id}>
                          {!isMine && unreadMarkerMessageId === message.id ? (
                            <div className="mb-3 flex justify-center">
                              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-sm ${
                                activePane === "DIRECT"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                Unread replies
                              </span>
                            </div>
                          ) : null}
                          <div
                            className={`max-w-[88%] rounded-[22px] px-4 py-3 shadow-sm ${
                              isMine
                                ? activePane === "DIRECT"
                                  ? "ml-auto bg-sky-600 text-white"
                                  : "ml-auto bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <p className="text-xs font-semibold opacity-80">
                              {isMine ? "You" : message.sender.fullName}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                              {message.body}
                            </p>
                            <p className={`mt-3 text-xs ${isMine ? "text-white/80" : "text-slate-500"}`}>
                              {formatConversationDate(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

              <div className="border-t border-slate-200 pt-4">
              <div className="flex flex-col gap-3">
                  <textarea
                    value={composerText}
                    onChange={(event) => setComposerText(event.target.value)}
                  placeholder={
                    activePane === "DIRECT"
                      ? "Write your reply..."
                      : activeConversation.status === "OPEN"
                        ? "Write a support reply..."
                        : "This support conversation is closed."
                  }
                  disabled={activePane === "SUPPORT" && activeConversation.status !== "OPEN"}
                    className="min-h-20 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => void sendMessageMutation.mutateAsync()}
                  disabled={
                    sendMessageMutation.isPending ||
                    !composerText.trim() ||
                    (activePane === "SUPPORT" && activeConversation.status !== "OPEN")
                  }
                  className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                    activePane === "DIRECT"
                      ? "bg-sky-600 hover:bg-sky-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {sendMessageMutation.isPending ? <SpinnerIcon /> : null}
                    {sendMessageMutation.isPending ? "Sending..." : "Send reply"}
                  </span>
                </button>
                {deliveredAt ? (
                  <p className={`text-xs font-semibold ${
                    activePane === "DIRECT" ? "text-sky-700" : "text-emerald-700"
                  }`}>
                    <span className="inline-flex items-center gap-2">
                      <DeliveredIcon />
                      Delivered {formatRelativeConversationTime(deliveredAt)}
                    </span>
                  </p>
                ) : null}
              </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openExisting}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${activeTabAccent.subtle}`}
                >
                  Open existing
                  {currentTabConversations.length > 0 ? (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeTabAccent.badge}`}>
                      {currentTabConversations.length}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={openNew}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition ${activeTabAccent.solid}`}
                >
                  New chat
                  {currentTabUnread > 0 ? (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {currentTabUnread}
                    </span>
                  ) : null}
                </button>
              </div>

              {currentTabView === "HOME" ? (
                <div className={`rounded-[20px] p-4 ${activeTabAccent.muted}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                        {activeTabVisible === "MESSAGES" ? (
                          <span className="text-sky-700">
                            <MessageIcon />
                          </span>
                        ) : (
                          <span className="text-emerald-700">
                            <SupportIcon />
                          </span>
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {activeTabVisible === "MESSAGES" ? "Direct chats" : "Support chats"}
                        </p>
                        <p className="text-xs text-slate-600">
                          {currentTabUnread > 0
                            ? `${currentTabUnread} unread`
                            : currentTabConversations.length > 0
                              ? `${currentTabConversations.length} active`
                              : "Ready"}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeTabAccent.badge}`}>
                      {currentTabUnread > 0 ? `${currentTabUnread} unread` : "All clear"}
                    </span>
                  </div>
                </div>
              ) : null}

              {currentTabView === "LIST" ? (
                <div className={`rounded-[20px] p-3 ${activeTabAccent.muted}`}>
                  {currentTabConversations.length === 0 ? (
                    <p className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      {activeTabVisible === "MESSAGES" ? "No existing direct chats yet." : "No existing support chats yet."}
                    </p>
                  ) : (
                    <div className="ui-scrollbar max-h-[16rem] space-y-2 overflow-y-auto pr-1">
                      {currentTabConversations.map((conversation) => {
                        const participantName =
                          activeTabVisible === "MESSAGES"
                            ? conversation.otherParticipant?.fullName ?? "Conversation"
                            : conversation.requester?.fullName ?? "Support";

                        return (
                          <button
                            key={conversation.id}
                            type="button"
                            onClick={() =>
                              openConversation(conversation.id, activeTabVisible === "MESSAGES" ? "DIRECT" : "SUPPORT")
                            }
                            className="flex w-full items-start gap-3 rounded-[20px] border border-white/80 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-200 hover:bg-slate-50"
                          >
                            <span
                              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                activeTabVisible === "MESSAGES" ? "bg-sky-100 text-sky-700" : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {getInitials(participantName)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-slate-900">{participantName}</span>
                                <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                                  {formatRelativeConversationTime(conversation.lastMessageAt)}
                                </span>
                              </span>
                              <span className="mt-1 line-clamp-2 block text-sm leading-6 text-slate-600">
                                {conversation.latestMessage?.body ?? "Open this conversation."}
                              </span>
                            </span>
                            {conversation.unreadCount > 0 ? (
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeTabAccent.badge}`}>
                                {conversation.unreadCount}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {currentTabView === "NEW" && activeTabVisible === "MESSAGES" ? (
                <div className="rounded-[20px] border border-sky-200 bg-sky-50/80 p-4">
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                      Choose a person
                    </label>
                    <select
                      value={directTargetId}
                      onChange={(event) => {
                        setDirectTargetId(event.target.value);
                        setDirectStartError(null);
                      }}
                      className="w-full rounded-[18px] border border-sky-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400"
                    >
                      <option value="">
                        {directTargetsQuery.isLoading ? "Loading people..." : "Select a teacher or student"}
                      </option>
                      {directTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.fullName} ({target.role === "INSTRUCTOR" ? "Teacher" : "Student"})
                        </option>
                      ))}
                    </select>
                    {directStartError ? <p className="text-xs font-semibold text-rose-600">{directStartError}</p> : null}
                    <button
                      type="button"
                      onClick={() => void handleNewDirectConversation()}
                      disabled={createDirectMutation.isPending || !directTargetId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {createDirectMutation.isPending ? <SpinnerIcon /> : null}
                      {createDirectMutation.isPending ? "Opening..." : "Open or start chat"}
                    </button>
                  </div>
                </div>
              ) : null}

              {currentTabView === "NEW" && activeTabVisible === "SUPPORT" ? (
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-4">
                  <div className="space-y-3">
                    <input
                      value={supportSubject}
                      onChange={(event) => {
                        setSupportSubject(event.target.value);
                        setSupportError(null);
                      }}
                      placeholder="Subject (optional)"
                      className="w-full rounded-[18px] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400"
                    />
                    <textarea
                      value={supportMessage}
                      onChange={(event) => {
                        setSupportMessage(event.target.value);
                        setSupportError(null);
                      }}
                      placeholder="Write your support message..."
                      className="min-h-24 w-full rounded-[20px] border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400"
                    />
                    {supportError ? <p className="text-xs font-semibold text-rose-600">{supportError}</p> : null}
                    <button
                      type="button"
                      onClick={() => void handleNewSupportConversation()}
                      disabled={createSupportMutation.isPending || !supportMessage.trim()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {createSupportMutation.isPending ? <SpinnerIcon /> : null}
                      {createSupportMutation.isPending ? "Opening..." : "Start support chat"}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label={open ? "Close communication hub" : "Open communication hub"}
        title="Communication"
        onClick={() => {
          setOpen((current) => {
            if (!current) {
              setActiveTab("SUPPORT");
              setTabViews({ SUPPORT: "HOME", MESSAGES: "HOME" });
              setActiveConversationId(null);
              setActivePane(null);
              setComposerText("");
              setDirectTargetId("");
              setDirectStartError(null);
              setSupportSubject("");
              setSupportMessage("");
              setSupportError(null);
            }
            return !current;
          });
        }}
        className={`group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_20px_45px_-18px_rgba(15,23,42,0.7)] transition duration-200 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_24px_55px_-18px_rgba(15,23,42,0.82)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 ${
          totalUnread > 0 ? "hub-launcher-pulse" : ""
        }`}
      >
        {totalUnread > 0 ? (
          <span className="pointer-events-none absolute inset-0 rounded-full border border-slate-300/80 hub-launcher-ring" />
        ) : null}
        <HubIcon />
        {totalUnread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            {totalUnread}
          </span>
        ) : null}
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Communication
        </span>
      </button>
    </div>
  );
}
