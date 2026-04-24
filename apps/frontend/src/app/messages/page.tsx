"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AdminSiteMenu } from "../admin/_components/admin-site-menu";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { useConversationsWorkspace } from "../../hooks/use-conversations-workspace";
import {
  formatConversationDate,
  formatRelativeConversationTime,
  groupConsecutiveMessages,
  groupConversationMessages
} from "../../lib/communication/types";

function avatarLabel(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m16 16 4 4" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3 10 14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 3-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l1-2h8l1 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    </svg>
  );
}

function ChatAvatar({
  name,
  image,
  size = "md"
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const sizeClass =
    size === "sm" ? "h-10 w-10 text-xs" : size === "lg" ? "h-14 w-14 text-base" : "h-12 w-12 text-sm";

  if (image && !hasImageError) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setHasImageError(true)}
        className={`${sizeClass} rounded-full border border-slate-200 object-cover shadow-sm`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 font-semibold text-white shadow-sm`}
    >
      {avatarLabel(name)}
    </span>
  );
}

function autosizeComposer(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "0px";
  const computed = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computed.lineHeight || "24");
  const verticalPadding =
    Number.parseFloat(computed.paddingTop || "0") + Number.parseFloat(computed.paddingBottom || "0");
  const minHeight = lineHeight + verticalPadding;
  const maxHeight = lineHeight * 3 + verticalPadding;
  const nextHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getGroupBubbleTone(senderId: string) {
  const tones = [
    {
      bubble: "bg-sky-50 text-sky-950",
      time: "text-sky-400",
      name: "text-sky-600"
    },
    {
      bubble: "bg-cyan-50 text-cyan-950",
      time: "text-cyan-400",
      name: "text-cyan-600"
    },
    {
      bubble: "bg-blue-50 text-blue-950",
      time: "text-blue-400",
      name: "text-blue-600"
    },
    {
      bubble: "bg-indigo-50 text-indigo-950",
      time: "text-indigo-400",
      name: "text-indigo-600"
    }
  ] as const;

  return tones[hashString(senderId) % tones.length];
}

export default function MessagesPage() {
  const workspace = useConversationsWorkspace({ kind: "MESSAGES" });
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");
  const [composerTab, setComposerTab] = useState<"direct" | "group" | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingConversationTitle, setEditingConversationTitle] = useState("");
  const groupImageInputId = "group-image-upload";
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const conversations = workspace.filteredConversations ?? [];
  const active = workspace.activeConversation;
  const groupedMessages = active ? groupConversationMessages(active.messages) : [];
  const isInstructor = workspace.user?.role === "INSTRUCTOR";
  const isStudent = workspace.user?.role === "STUDENT";

  useEffect(() => {
    if (active && mobilePane === "chat") {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [active, groupedMessages, mobilePane]);

  useEffect(() => {
    autosizeComposer(composerRef.current);
  }, [workspace.composerText]);

  if (!workspace.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Messages</p>;
  }

  if (!workspace.isAuthorized || !workspace.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Messages</p>;
  }

  return (
    <PageShell
      title="Messages"
      actionsInlineOnMobile
      maxWidthClassName="max-w-[110rem]"
      actions={
        <AdminSiteMenu
          accessToken={workspace.accessToken}
          canHandleSupport
        />
      }
    >
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:grid lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside
          className={`border-r border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fd_100%)] ${
            mobilePane === "chat" ? "hidden lg:flex" : "flex"
          } min-h-[calc(100vh-3rem)] flex-col`}
        >
          <div className="border-b border-slate-200 px-4 pb-4 pt-5 sm:px-5 lg:px-6">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-[1.9rem] font-bold tracking-tight text-slate-950">Chats</h2>
              <p className="shrink-0 text-sm text-slate-500">
                {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
              </p>
            </div>

            {workspace.conversationsQuery.isError ? (
              <div className="mt-4">
                <StatusBanner variant="error">Conversations unavailable</StatusBanner>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>
                <input
                  value={workspace.searchQuery}
                  onChange={(event) => workspace.setSearchQuery(event.target.value)}
                  placeholder="Search Messages"
                  className="w-full rounded-full border border-transparent bg-slate-100 pl-11 pr-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white"
                />
              </div>
              <label className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
                <input
                  type="checkbox"
                  checked={workspace.unreadOnly}
                  onChange={(event) => workspace.setUnreadOnly(event.target.checked)}
                  className="rounded border-slate-300"
                />
                Unread
              </label>
            </div>

            <div className="mt-4">
              <div className={`grid gap-2 ${isInstructor ? "grid-cols-2" : "grid-cols-1"}`}>
                <button
                  type="button"
                  onClick={() => setComposerTab((current) => (current === "direct" ? null : "direct"))}
                  className={`flex h-11 w-full items-center justify-between gap-2 whitespace-nowrap rounded-2xl border px-3.5 text-[13px] font-semibold transition ${
                    composerTab === "direct"
                      ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700"
                  }`}
                >
                  New chat
                  <ChevronDownIcon open={composerTab === "direct"} />
                </button>
                {isInstructor ? (
                  <button
                    type="button"
                    onClick={() => setComposerTab((current) => (current === "group" ? null : "group"))}
                    className={`flex h-11 w-full items-center justify-between gap-2 whitespace-nowrap rounded-2xl border px-3.5 text-[13px] font-semibold transition ${
                      composerTab === "group"
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
                    }`}
                  >
                    New group
                    <ChevronDownIcon open={composerTab === "group"} />
                  </button>
                ) : null}
              </div>

              {composerTab === "direct" ? (
                <div className="mt-3 rounded-[24px] border border-slate-200 bg-white px-4 pb-4 pt-3 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={workspace.directTargetId}
                      onChange={(event) => workspace.setDirectTargetId(event.target.value)}
                      className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <option value="">Choose a person</option>
                      {(workspace.directTargetsQuery.data ?? []).map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.fullName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void workspace.onStartDirectConversation()}
                      disabled={workspace.createDirectMutation.isPending}
                      className="rounded-full bg-[#0084ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0070db] disabled:cursor-not-allowed disabled:bg-sky-300"
                    >
                      {workspace.createDirectMutation.isPending ? "Opening..." : "Chat"}
                    </button>
                  </div>
                  {workspace.directStartError ? (
                    <p className="mt-2 text-sm text-rose-600">{workspace.directStartError}</p>
                  ) : null}
                </div>
              ) : null}

              {isInstructor && composerTab === "group" ? (
                <div className="mt-3 rounded-[24px] border border-slate-200 bg-white px-4 pb-4 pt-3 shadow-sm">
                  <div className="space-y-2">
                    <input
                      value={workspace.groupTitle}
                      onChange={(event) => workspace.setGroupTitle(event.target.value)}
                      placeholder="Group title"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    />
                    <select
                      value={workspace.groupScope}
                      onChange={(event) =>
                        workspace.setGroupScope(event.target.value as "COURSE" | "FOLLOWERS" | "SELECTED")
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                    >
                      <option value="FOLLOWERS">All followers</option>
                      <option value="COURSE">Course learners</option>
                      <option value="SELECTED">Selected students</option>
                    </select>
                    {workspace.groupScope === "COURSE" ? (
                      <select
                        value={workspace.groupCourseId}
                        onChange={(event) => workspace.setGroupCourseId(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      >
                        <option value="">Choose a course</option>
                        {(workspace.groupTargetsQuery.data?.courses ?? []).map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {workspace.groupScope !== "COURSE" ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                        <input
                          id={groupImageInputId}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={(event) => workspace.setGroupImageFile(event.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <label
                            htmlFor={groupImageInputId}
                            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                          >
                            Choose file
                          </label>
                          <span className="truncate text-sm text-slate-500">
                            {workspace.groupImageFile?.name ?? "No file chosen"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-sky-50 px-4 py-3 text-xs text-sky-700">
                        Course groups automatically use the selected course image.
                      </div>
                    )}
                    {workspace.groupError ? <p className="text-sm text-rose-600">{workspace.groupError}</p> : null}
                    <button
                      type="button"
                      onClick={() => void workspace.onStartGroupConversation()}
                      disabled={workspace.createGroupMutation.isPending}
                      className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {workspace.createGroupMutation.isPending ? "Creating..." : "Create group"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3 sm:px-3">
            {workspace.conversationsQuery.isLoading ? (
              <div className="space-y-2 px-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-[22px] bg-white px-4 py-4 shadow-sm">
                    <div className="h-4 w-32 rounded-full bg-slate-200" />
                    <div className="mt-3 h-3 w-48 rounded-full bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-2">
                <EmptyInboxCard />
              </div>
            ) : (
              conversations.map((conversation) => {
                const displayName =
                  conversation.kind === "GROUP"
                    ? conversation.groupTitle ?? "Group conversation"
                    : conversation.otherParticipant?.fullName ?? "Conversation";
                const displayImage =
                  conversation.kind === "GROUP"
                    ? conversation.groupImage
                    : conversation.otherParticipant?.profileImage;
                const previewText =
                  conversation.kind === "GROUP"
                    ? `${conversation.participantCount} members${
                        conversation.course ? ` | ${conversation.course.title}` : ""
                      }`
                    : conversation.latestMessage?.body ?? "No messages yet";
                const toneClass =
                  conversation.kind === "GROUP"
                    ? workspace.activeConversationId === conversation.id
                      ? "bg-sky-100 shadow-sm"
                      : "bg-sky-50/70 hover:bg-sky-100/70"
                    : workspace.activeConversationId === conversation.id
                      ? "bg-blue-100 shadow-sm"
                      : "bg-blue-50/50 hover:bg-blue-100/60";

                return (
                  <div
                    key={conversation.id}
                    className={`group mx-2 mb-1.5 w-[calc(100%-1rem)] rounded-[24px] transition ${toneClass}`}
                  >
                    <div className="flex items-center gap-3 px-3 py-3">
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            workspace.setActiveConversationId(conversation.id);
                            setMobilePane("chat");
                          }}
                          className="relative block rounded-full text-left"
                        >
                          <ChatAvatar name={displayName} image={displayImage} />
                          {conversation.unreadCount > 0 ? (
                            <span className="absolute -bottom-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#0084ff] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </button>
                      </div>
                      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            workspace.setActiveConversationId(conversation.id);
                            setMobilePane("chat");
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-[0.95rem] font-semibold text-slate-950">{displayName}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{previewText}</p>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <p className="text-xs text-slate-400">
                            {formatRelativeConversationTime(conversation.lastMessageAt)}
                          </p>
                          {conversation.kind === "GROUP" &&
                          conversation.groupInstructor?.id === workspace.user?.id &&
                          editingConversationId !== conversation.id ? (
                            <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                              <button
                                type="button"
                                aria-label="Edit chat name"
                                title="Edit chat name"
                                onClick={() => {
                                  setEditingConversationId(conversation.id);
                                  setEditingConversationTitle(conversation.groupTitle ?? "");
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete chat"
                                title="Delete chat"
                                onClick={() => {
                                  if (window.confirm("Do you want to delete this group chat?")) {
                                    void workspace.onDeleteGroupConversation(conversation.id);
                                  }
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 transition hover:border-rose-300"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {conversation.kind === "GROUP" &&
                    conversation.groupInstructor?.id === workspace.user?.id &&
                    editingConversationId === conversation.id ? (
                      <div className="px-3 pb-3 pt-1">
                        {
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={editingConversationTitle}
                              onChange={(event) => setEditingConversationTitle(event.target.value)}
                              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void workspace
                                    .onRenameGroupConversation(conversation.id, editingConversationTitle)
                                    .then(() => {
                                      setEditingConversationId(null);
                                      setEditingConversationTitle("");
                                    })
                                }
                                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingConversationId(null);
                                  setEditingConversationTitle("");
                                }}
                                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <section className={`${mobilePane === "list" ? "hidden lg:flex" : "flex"} min-h-[calc(100vh-3rem)] flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]`}>
          {workspace.activeConversationQuery.isLoading ? (
            <div className="p-8 text-sm text-slate-500">Loading conversation...</div>
          ) : workspace.activeConversationQuery.isError ? (
            <div className="p-6">
              <StatusBanner variant="error">Conversation unavailable</StatusBanner>
            </div>
          ) : !active ? (
            <EmptyConversationPane />
          ) : (
            <>
              <div className="border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur sm:px-5 lg:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setMobilePane("list")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                    >
                      <ArrowLeftIcon />
                    </button>
                    <ChatAvatar
                      name={
                        active.kind === "GROUP"
                          ? active.groupTitle ?? "Group conversation"
                          : active.otherParticipant?.fullName ?? "Conversation"
                      }
                      image={
                        active.kind === "GROUP"
                          ? active.groupImage
                          : active.otherParticipant?.profileImage
                      }
                      size="lg"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-[1.05rem] font-semibold text-slate-950">
                        {active.kind === "GROUP"
                          ? active.groupTitle ?? "Group conversation"
                          : active.otherParticipant?.fullName ?? "Conversation"}
                      </h2>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {active.kind === "GROUP"
                          ? `${active.participantCount} members${
                              active.course ? ` | ${active.course.title}` : ""
                            }`
                          : active.otherParticipant?.tenant?.name ??
                            workspace.supportStatusLabel ??
                            "Active conversation"}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#f6fafe_0%,#ffffff_45%)] px-3 py-4 sm:px-5 lg:px-6">
                {active.messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm rounded-[28px] border border-dashed border-slate-200 bg-white/80 px-8 py-10 text-center">
                      <p className="text-lg font-semibold text-slate-900">No messages yet</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Start the conversation and this thread will feel like a real Messenger chat.
                      </p>
                    </div>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.label} className="space-y-4">
                      <div className="sticky top-0 z-10 flex justify-center py-2">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 shadow-sm backdrop-blur">
                          {group.label}
                        </span>
                      </div>
                      {groupConsecutiveMessages(group.items).map((run) => {
                        const firstMessage = run.items[0];
                        const isMine = firstMessage.sender.id === workspace.user?.id;
                        const senderTone =
                          active.kind === "GROUP" && !isMine
                            ? getGroupBubbleTone(firstMessage.sender.id)
                            : null;

                        return (
                          <div
                            key={`${group.label}-${firstMessage.id}`}
                            className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            {!isMine ? (
                              <div className="shrink-0 self-end">
                                <ChatAvatar
                                  name={firstMessage.sender.fullName}
                                  image={firstMessage.sender.profileImage}
                                  size="sm"
                                />
                              </div>
                            ) : null}
                            <div className={`max-w-[84%] space-y-1.5 sm:max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
                              {!isMine ? (
                                <p
                                  className={`px-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                    senderTone?.name ?? "text-slate-400"
                                  }`}
                                >
                                  {firstMessage.sender.fullName}
                                </p>
                              ) : null}
                              {run.items.map((message, index) => {
                                const isLastInRun = index === run.items.length - 1;

                                return (
                                  <div
                                    key={message.id}
                                    className={`rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                                      isMine
                                        ? `${index === 0 ? "rounded-tr-[22px]" : ""} ${
                                            isLastInRun ? "rounded-br-[10px]" : "rounded-br-[22px]"
                                          } bg-[#0084ff] text-white`
                                        : `${index === 0 ? "rounded-tl-[22px]" : ""} ${
                                            isLastInRun ? "rounded-bl-[10px]" : "rounded-bl-[22px]"
                                          } ${senderTone?.bubble ?? "bg-white text-slate-900"}`
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                                    <p
                                      className={`mt-2 text-[11px] ${
                                        isMine ? "text-sky-100" : senderTone?.time ?? "text-slate-400"
                                      }`}
                                    >
                                      {formatConversationDate(message.createdAt)}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messageEndRef} />
              </div>

              <div className="border-t border-slate-200 bg-white/92 px-3 py-3 backdrop-blur sm:px-5 lg:px-6">
                {!active.canReply ? (
                  <StatusBanner variant="error">Replying is disabled in this conversation.</StatusBanner>
                ) : null}
                <div className="mt-3 flex items-end gap-3">
                  <textarea
                    ref={composerRef}
                    value={workspace.composerText}
                    onChange={(event) => workspace.setComposerText(event.target.value)}
                    placeholder="Aa"
                    rows={1}
                    className="h-[52px] flex-1 resize-none rounded-[28px] border border-transparent bg-slate-100 px-5 py-[14px] text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => void workspace.onSendMessage()}
                    disabled={
                      workspace.sendMessageMutation.isPending ||
                      !workspace.activeConversation?.canReply ||
                      !workspace.composerText.trim()
                    }
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-white shadow-sm transition hover:bg-[#0070db] disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function EmptyInboxCard() {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
      No conversations yet.
    </div>
  );
}

function EmptyConversationPane() {
  return (
    <div className="flex h-full min-h-[calc(100vh-3rem)] items-center justify-center bg-[radial-gradient(circle_at_top,#f6fafe_0%,#ffffff_45%)] p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#e7f3ff] text-[#0084ff] shadow-sm">
          <SendIcon />
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-slate-950">Select a chat</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Pick a conversation from the left and the Messenger-style chat view will open here.
        </p>
      </div>
    </div>
  );
}
