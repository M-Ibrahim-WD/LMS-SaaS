"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api/client";
import { createConversationSocket } from "../lib/communication/socket";
import type { ConversationDetail, ConversationSummary, ConversationUser } from "../lib/communication/types";
import { useRequireAuth } from "./use-require-auth";

type WorkspaceKind = "DIRECT" | "SUPPORT";

interface UseConversationsWorkspaceOptions {
  kind: WorkspaceKind;
}

export function useConversationsWorkspace({ kind }: UseConversationsWorkspaceOptions) {
  const queryClient = useQueryClient();
  const { accessToken, user, hasHydrated, isAuthorized } = useRequireAuth(
    kind === "DIRECT" ? { roles: ["STUDENT", "INSTRUCTOR"] } : undefined
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "CLOSED">("OPEN");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);
  const [directTargetId, setDirectTargetId] = useState("");
  const [directStartError, setDirectStartError] = useState<string | null>(null);
  const lastMarkedConversationRef = useRef<string | null>(null);
  const initialDirectTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("conversationId");
    const targetUserId = params.get("target");
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
    if (targetUserId) {
      initialDirectTargetRef.current = targetUserId;
      setDirectTargetId(targetUserId);
    }
  }, []);

  const conversationQueryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("kind", kind);
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    if (unreadOnly) {
      params.set("unreadOnly", "true");
    }
    if (assignedToMe) {
      params.set("assignedToMe", "true");
    }
    if (unassignedOnly) {
      params.set("unassignedOnly", "true");
    }
    return params.toString();
  }, [assignedToMe, kind, statusFilter, unreadOnly, unassignedOnly]);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", kind, statusFilter, unreadOnly, assignedToMe, unassignedOnly],
    queryFn: () =>
      apiFetch<ConversationSummary[]>(`/conversations?${conversationQueryString}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && hasHydrated && isAuthorized)
  });

  const directTargetsQuery = useQuery({
    queryKey: ["conversations", "direct-targets"],
    queryFn: () =>
      apiFetch<ConversationUser[]>("/conversations/direct-targets", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && kind === "DIRECT" && isAuthorized)
  });

  const activeConversationQuery = useQuery({
    queryKey: ["conversation", activeConversationId],
    queryFn: () =>
      apiFetch<ConversationDetail>(`/conversations/${activeConversationId}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && activeConversationId)
  });

  useEffect(() => {
    if (!conversationsQuery.data?.length) {
      if (activeConversationId && !conversationsQuery.isLoading) {
        setActiveConversationId(null);
      }
      return;
    }

    if (
      !activeConversationId ||
      !conversationsQuery.data.some((conversation) => conversation.id === activeConversationId)
    ) {
      setActiveConversationId(conversationsQuery.data[0].id);
    }
  }, [activeConversationId, conversationsQuery.data, conversationsQuery.isLoading]);

  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch(`/conversations/${conversationId}/read`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async (_, conversationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
  });

  useEffect(() => {
    const activeConversation = activeConversationQuery.data;
    if (!activeConversation || activeConversation.unreadCount === 0) {
      return;
    }

    const marker = `${activeConversation.id}:${activeConversation.lastMessageAt}`;
    if (lastMarkedConversationRef.current === marker) {
      return;
    }

    lastMarkedConversationRef.current = marker;
    markReadMutation.mutate(activeConversation.id);
  }, [activeConversationQuery.data, markReadMutation]);

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${activeConversationId}/messages`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          body: composerText
        })
      }),
    onSuccess: async () => {
      setComposerText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", activeConversationId] }),
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
      setDirectTargetId("");
      setDirectStartError(null);
      setActiveConversationId(conversation.id);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      setDirectStartError(
        error instanceof Error ? error.message : "Could not start the chat."
      );
    }
  });

  useEffect(() => {
    if (kind !== "DIRECT") {
      return;
    }

    const initialTargetUserId = initialDirectTargetRef.current;
    if (!initialTargetUserId || createDirectMutation.isPending || activeConversationId) {
      return;
    }

    if (!directTargetsQuery.data?.some((target) => target.id === initialTargetUserId)) {
      return;
    }

    initialDirectTargetRef.current = null;
    void createDirectMutation.mutateAsync(initialTargetUserId);
  }, [
    activeConversationId,
    createDirectMutation,
    directTargetsQuery.data,
    kind
  ]);

  const createSupportMutation = useMutation({
    mutationFn: () =>
      apiFetch<ConversationSummary>("/conversations/support", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          subject: supportSubject || undefined,
          message: supportMessage
        })
      }),
    onSuccess: async (conversation) => {
      setSupportSubject("");
      setSupportMessage("");
      setSupportError(null);
      setActiveConversationId(conversation.id);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      setSupportError(
        error instanceof Error ? error.message : "Could not create the support conversation."
      );
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: "OPEN" | "CLOSED") =>
      apiFetch<ConversationSummary>(`/conversations/${activeConversationId}/status`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ status })
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", activeConversationId] })
      ]);
    }
  });

  const assignToSelfMutation = useMutation({
    mutationFn: () =>
      apiFetch<ConversationSummary>(`/support/conversations/${activeConversationId}/assign`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          adminUserId: user?.id
        })
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", activeConversationId] })
      ]);
    }
  });

  useEffect(() => {
    if (!accessToken || !isAuthorized) {
      return;
    }

    const socket = createConversationSocket(accessToken);

    socket.on("connect", () => {
      if (activeConversationId) {
        socket.emit("conversation.join", { conversationId: activeConversationId });
      }
    });

    const onRefresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (activeConversationId) {
        void queryClient.invalidateQueries({ queryKey: ["conversation", activeConversationId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("conversation.message.created", onRefresh);
    socket.on("conversation.read.updated", onRefresh);
    socket.on("conversation.status.updated", onRefresh);
    socket.on("support.assignment.updated", onRefresh);

    return () => {
      if (activeConversationId) {
        socket.emit("conversation.leave", { conversationId: activeConversationId });
      }
      socket.off("conversation.message.created", onRefresh);
      socket.off("conversation.read.updated", onRefresh);
      socket.off("conversation.status.updated", onRefresh);
      socket.off("support.assignment.updated", onRefresh);
      socket.disconnect();
    };
  }, [accessToken, activeConversationId, isAuthorized, queryClient]);

  const activeConversation = activeConversationQuery.data ?? null;

  const canUseSupportInbox =
    user?.role !== "ADMIN" ||
    Boolean(user.isSuperAdmin || user.adminPermissions?.includes("HANDLE_SUPPORT"));

  const supportStatusLabel = useMemo(() => {
    if (!activeConversation) {
      return null;
    }

    if (activeConversation.status === "CLOSED") {
      return "Closed";
    }

    if (activeConversation.kind === "SUPPORT" && activeConversation.assignedAdmin) {
      return `Assigned to ${activeConversation.assignedAdmin.fullName}`;
    }

    return "Open";
  }, [activeConversation]);

  return {
    accessToken,
    user,
    hasHydrated,
    isAuthorized,
    canUseSupportInbox,
    conversationsQuery,
    directTargetsQuery,
    activeConversationQuery,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    statusFilter,
    setStatusFilter,
    unreadOnly,
    setUnreadOnly,
    assignedToMe,
    setAssignedToMe,
    unassignedOnly,
    setUnassignedOnly,
    composerText,
    setComposerText,
    supportSubject,
    setSupportSubject,
    supportMessage,
    setSupportMessage,
    supportError,
    directTargetId,
    setDirectTargetId,
    directStartError,
    sendMessageMutation,
    createDirectMutation,
    createSupportMutation,
    updateStatusMutation,
    assignToSelfMutation,
    supportStatusLabel,
    onSendMessage: async () => {
      const body = composerText.trim();
      if (!body || !activeConversationId) {
        return;
      }
      await sendMessageMutation.mutateAsync();
    },
    onStartDirectConversation: async () => {
      if (!directTargetId) {
        setDirectStartError("Select a person to start the conversation.");
        return;
      }
      await createDirectMutation.mutateAsync(directTargetId);
    },
    onCreateSupportConversation: async () => {
      if (!supportMessage.trim()) {
        setSupportError("Please write the support message first.");
        return;
      }
      await createSupportMutation.mutateAsync();
    },
    onToggleStatus: async () => {
      if (!activeConversation) {
        return;
      }
      await updateStatusMutation.mutateAsync(
        activeConversation.status === "OPEN" ? "CLOSED" : "OPEN"
      );
    },
    onAssignToSelf: async () => {
      if (!user?.id || !activeConversationId) {
        return;
      }
      await assignToSelfMutation.mutateAsync();
    }
  };
}
