"use client";

export const dynamic = "force-dynamic";

import { PageShell } from "../../components/page-shell";
import { useConversationsWorkspace } from "../../hooks/use-conversations-workspace";

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

export default function SupportPage() {
  const workspace = useConversationsWorkspace({ kind: "SUPPORT" });

  if (!workspace.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Loading support inbox...</p>;
  }

  if (!workspace.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Redirecting...</p>;
  }

  if (!workspace.canUseSupportInbox) {
    return <p className="p-6 text-sm text-rose-600">You do not have support access.</p>;
  }

  const conversations = workspace.conversationsQuery.data ?? [];
  const active = workspace.activeConversation;
  const isSupportAdmin = workspace.user?.role === "ADMIN";

  return (
    <PageShell
      title="Support Center"
      description="Handle platform technical support with a live, trackable inbox."
      backHref="/dashboard"
      maxWidthClassName="max-w-7xl"
    >
      <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          {!isSupportAdmin ? (
            <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Create support request</h2>
              <p className="mt-2 text-sm text-slate-600">
                Open a technical support conversation with the platform team.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  value={workspace.supportSubject}
                  onChange={(event) => workspace.setSupportSubject(event.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <textarea
                  value={workspace.supportMessage}
                  onChange={(event) => workspace.setSupportMessage(event.target.value)}
                  placeholder="Describe the issue clearly..."
                  className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                {workspace.supportError ? (
                  <p className="text-sm text-rose-600">{workspace.supportError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void workspace.onCreateSupportConversation()}
                  disabled={workspace.createSupportMutation.isPending}
                  className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {workspace.createSupportMutation.isPending ? "Opening..." : "Open support conversation"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {(["OPEN", "CLOSED", "ALL"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => workspace.setStatusFilter(status)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    workspace.statusFilter === status
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {status === "ALL" ? "All" : status === "OPEN" ? "Open" : "Closed"}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workspace.unreadOnly}
                  onChange={(event) => workspace.setUnreadOnly(event.target.checked)}
                />
                Unread only
              </label>
              {isSupportAdmin ? (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={workspace.assignedToMe}
                      onChange={(event) => {
                        workspace.setAssignedToMe(event.target.checked);
                        if (event.target.checked) {
                          workspace.setUnassignedOnly(false);
                        }
                      }}
                    />
                    Assigned to me
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={workspace.unassignedOnly}
                      onChange={(event) => {
                        workspace.setUnassignedOnly(event.target.checked);
                        if (event.target.checked) {
                          workspace.setAssignedToMe(false);
                        }
                      }}
                    />
                    Unassigned only
                  </label>
                </>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {workspace.conversationsQuery.isLoading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Loading support threads...
                </p>
              ) : conversations.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No support conversations found.
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
                          {conversation.requester?.fullName ?? "Support request"}
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
                      {conversation.assignedAdmin
                        ? `Assigned to ${conversation.assignedAdmin.fullName}`
                        : conversation.status === "OPEN"
                          ? "Open · Unassigned"
                          : "Closed · Unassigned"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="rounded-[32px] border border-slate-200 bg-white/95 shadow-sm">
          {workspace.activeConversationQuery.isLoading ? (
            <div className="p-8 text-sm text-slate-500">Loading support conversation...</div>
          ) : !active ? (
            <div className="p-8 text-sm text-slate-500">
              Select or create a support conversation.
            </div>
          ) : (
            <div className="flex min-h-[640px] flex-col">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Support
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      {active.requester?.fullName ?? "Support conversation"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">{workspace.supportStatusLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isSupportAdmin && !active.isAssignedToCurrentAdmin ? (
                      <button
                        type="button"
                        onClick={() => void workspace.onAssignToSelf()}
                        disabled={workspace.assignToSelfMutation.isPending}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        {workspace.assignToSelfMutation.isPending ? "Assigning..." : "Assign to me"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void workspace.onToggleStatus()}
                      disabled={workspace.updateStatusMutation.isPending}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {workspace.updateStatusMutation.isPending
                        ? "Updating..."
                        : active.status === "OPEN"
                          ? "Close conversation"
                          : "Reopen conversation"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {active.messages.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No support messages yet.
                  </p>
                ) : (
                  active.messages.map((message) => {
                    const isMine = message.sender.id === workspace.user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[88%] rounded-[24px] px-4 py-3 shadow-sm ${
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
                    placeholder={
                      active.status === "OPEN"
                        ? "Write a support reply..."
                        : "Reopen the conversation to continue."
                    }
                    disabled={active.status !== "OPEN" || !active.canReply}
                    className="min-h-24 flex-1 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => void workspace.onSendMessage()}
                    disabled={
                      workspace.sendMessageMutation.isPending ||
                      active.status !== "OPEN" ||
                      !active.canReply ||
                      !workspace.composerText.trim()
                    }
                    className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {workspace.sendMessageMutation.isPending ? "Sending..." : "Reply"}
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
