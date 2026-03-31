"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageShell } from "../../components/page-shell";
import { useConversationsWorkspace } from "../../hooks/use-conversations-workspace";

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

export default function MessagesPage() {
  const workspace = useConversationsWorkspace({ kind: "DIRECT" });

  if (!workspace.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Loading your messages...</p>;
  }

  if (!workspace.isAuthorized || !workspace.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Redirecting...</p>;
  }

  const conversations = workspace.conversationsQuery.data ?? [];
  const active = workspace.activeConversation;

  return (
    <PageShell
      title="Messages"
      description="Keep a direct real-time channel open between instructors and students."
      backHref="/dashboard"
      maxWidthClassName="max-w-7xl"
      actions={
        <Link
          href="/support"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Support
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Start a chat</h2>
            <p className="mt-2 text-sm text-slate-600">
              Pick a teacher or student you already belong with in the workspace.
            </p>
            <div className="mt-4 space-y-3">
              <select
                value={workspace.directTargetId}
                onChange={(event) => workspace.setDirectTargetId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <option value="">Select a conversation target</option>
                {(workspace.directTargetsQuery.data ?? []).map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.fullName} ({target.role === "INSTRUCTOR" ? "Instructor" : "Student"})
                  </option>
                ))}
              </select>
              {workspace.directStartError ? (
                <p className="text-sm text-rose-600">{workspace.directStartError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void workspace.onStartDirectConversation()}
                disabled={workspace.createDirectMutation.isPending}
                className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {workspace.createDirectMutation.isPending ? "Opening..." : "Start conversation"}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Conversations
              </h2>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={workspace.unreadOnly}
                  onChange={(event) => workspace.setUnreadOnly(event.target.checked)}
                />
                Unread only
              </label>
            </div>
            <div className="mt-4 space-y-3">
              {workspace.conversationsQuery.isLoading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Loading conversations...
                </p>
              ) : conversations.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No direct conversations yet.
                </p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => workspace.setActiveConversationId(conversation.id)}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      workspace.activeConversationId === conversation.id
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {conversation.otherParticipant?.fullName ?? "Conversation"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {conversation.latestMessage?.body ?? "No messages yet."}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {formatDate(conversation.lastMessageAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="rounded-[32px] border border-slate-200 bg-white/95 shadow-sm">
          {workspace.activeConversationQuery.isLoading ? (
            <div className="p-8 text-sm text-slate-500">Loading conversation...</div>
          ) : !active ? (
            <div className="p-8 text-sm text-slate-500">
              Select a conversation to start chatting.
            </div>
          ) : (
            <div className="flex min-h-[640px] flex-col">
              <div className="border-b border-slate-200 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Live chat
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {active.otherParticipant?.fullName ?? "Conversation"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Messages update live while the conversation is open.
                </p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {active.messages.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No messages yet. Send the first one.
                  </p>
                ) : (
                  active.messages.map((message) => {
                    const isMine = message.sender.id === workspace.user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[85%] rounded-[24px] px-4 py-3 shadow-sm ${
                          isMine
                            ? "ml-auto bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="text-xs font-semibold opacity-80">
                          {isMine ? "You" : message.sender.fullName}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                          {message.body}
                        </p>
                        <p className={`mt-3 text-xs ${isMine ? "text-emerald-100" : "text-slate-500"}`}>
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 px-6 py-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={workspace.composerText}
                    onChange={(event) => workspace.setComposerText(event.target.value)}
                    placeholder="Write your message..."
                    className="min-h-24 flex-1 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => void workspace.onSendMessage()}
                    disabled={
                      workspace.sendMessageMutation.isPending ||
                      !workspace.activeConversation?.canReply ||
                      !workspace.composerText.trim()
                    }
                    className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {workspace.sendMessageMutation.isPending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
