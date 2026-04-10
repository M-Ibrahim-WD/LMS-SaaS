
"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { useConversationsWorkspace } from "../../hooks/use-conversations-workspace";
import {
  formatConversationDate,
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

export default function MessagesPage() {
  const workspace = useConversationsWorkspace({ kind: "MESSAGES" });

  if (!workspace.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Loading your messages...</p>;
  }

  if (!workspace.isAuthorized || !workspace.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Redirecting...</p>;
  }

  const conversations = workspace.filteredConversations ?? [];
  const active = workspace.activeConversation;
  const groupedMessages = active ? groupConversationMessages(active.messages) : [];
  const isInstructor = workspace.user?.role === "INSTRUCTOR";

  return (
    <PageShell
      title="Messages"
      description="Keep direct and group conversations moving in one real-time workspace."
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
      <div className="grid gap-4 lg:gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
        <aside className="space-y-4">
          {workspace.conversationsQuery.isError ? (
            <StatusBanner variant="error">
              We could not load your conversations right now. Refresh the page and try again.
            </StatusBanner>
          ) : null}
          <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Start a direct chat</h2>
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
              {workspace.directStartError ? <p className="text-sm text-rose-600">{workspace.directStartError}</p> : null}
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

          {isInstructor ? (
            <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Create a group chat</h2>
              <p className="mt-2 text-sm text-slate-600">
                Open one room for a course, all followers, or a selected student list.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  value={workspace.groupTitle}
                  onChange={(event) => workspace.setGroupTitle(event.target.value)}
                  placeholder="Group title"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <select
                  value={workspace.groupScope}
                  onChange={(event) => workspace.setGroupScope(event.target.value as "COURSE" | "FOLLOWERS" | "SELECTED")}
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
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                ) : null}
                {workspace.groupScope === "SELECTED" ? (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {(workspace.groupTargetsQuery.data?.students ?? []).map((student) => {
                      const selected = workspace.groupStudentIds.includes(student.id);
                      return (
                        <label key={student.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              workspace.setGroupStudentIds(
                                event.target.checked
                                  ? [...workspace.groupStudentIds, student.id]
                                  : workspace.groupStudentIds.filter((id) => id !== student.id)
                              );
                            }}
                          />
                          <span>{student.fullName}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                {workspace.groupError ? <p className="text-sm text-rose-600">{workspace.groupError}</p> : null}
                <button
                  type="button"
                  onClick={() => void workspace.onStartGroupConversation()}
                  disabled={workspace.createGroupMutation.isPending}
                  className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {workspace.createGroupMutation.isPending ? "Creating..." : "Create group"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Conversations</h2>
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={workspace.unreadOnly} onChange={(event) => workspace.setUnreadOnly(event.target.checked)} />
                Unread only
              </label>
            </div>
            <input
              value={workspace.searchQuery}
              onChange={(event) => workspace.setSearchQuery(event.target.value)}
              placeholder="Search conversations"
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            />
            <div className="mt-4 space-y-3">
              {workspace.conversationsQuery.isLoading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">Loading conversations...</p>
              ) : conversations.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No conversations yet.</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => workspace.setActiveConversationId(conversation.id)}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${workspace.activeConversationId === conversation.id ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {conversation.kind === "GROUP"
                            ? conversation.groupTitle ?? "Group conversation"
                            : conversation.otherParticipant?.fullName ?? "Conversation"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {conversation.kind === "GROUP"
                            ? `${conversation.participantCount} participants${conversation.course ? ` • ${conversation.course.title}` : ""}`
                            : conversation.latestMessage?.body ?? "No messages yet."}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 ? <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">{conversation.unreadCount}</span> : null}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{formatConversationDate(conversation.lastMessageAt)}</p>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 shadow-sm sm:rounded-[32px]">
          {workspace.activeConversationQuery.isLoading ? (
            <div className="p-8 text-sm text-slate-500">Loading conversation...</div>
          ) : workspace.activeConversationQuery.isError ? (
            <div className="p-8">
              <StatusBanner variant="error">
                We could not load this conversation. Please pick another thread or refresh the page.
              </StatusBanner>
            </div>
          ) : !active ? (
            <div className="p-8 text-sm text-slate-500">Select a conversation to start chatting.</div>
          ) : (
            <div className="flex min-h-[70vh] flex-col sm:min-h-[640px]">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {active.kind === "GROUP" ? "Group chat" : "Live chat"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">
                      {active.kind === "GROUP" ? active.groupTitle ?? "Group conversation" : active.otherParticipant?.fullName ?? "Conversation"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {active.kind === "GROUP"
                        ? `${active.participantCount} participants${active.course ? ` • ${active.course.title}` : ""}`
                        : "Messages update live while the conversation is open."}
                    </p>
                    {active.kind === "GROUP" ? (
                      <div className="mt-4 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap gap-2">
                          {active.participantPreview.slice(0, 6).map((participant) => (
                            <div
                              key={participant.id}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                              title={participant.fullName}
                            >
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
                                {avatarLabel(participant.fullName)}
                              </span>
                              <span className="max-w-[120px] truncate">{participant.fullName}</span>
                            </div>
                          ))}
                          {active.participantCount > active.participantPreview.length ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                              +{active.participantCount - active.participantPreview.length} more
                            </span>
                          ) : null}
                        </div>
                        <input
                          value={workspace.groupEditTitle}
                          onChange={(event) => workspace.setGroupEditTitle(event.target.value)}
                          disabled={!isInstructor || active.groupInstructor?.id !== workspace.user?.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                        {active.groupScope === "SELECTED" && isInstructor && active.groupInstructor?.id === workspace.user?.id ? (
                          <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
                            {(workspace.groupTargetsQuery.data?.students ?? []).map((student) => {
                              const selected = workspace.groupEditStudentIds.includes(student.id);
                              return (
                                <label key={student.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(event) => {
                                      workspace.setGroupEditStudentIds(
                                        event.target.checked
                                          ? [...workspace.groupEditStudentIds, student.id]
                                          : workspace.groupEditStudentIds.filter((id) => id !== student.id)
                                      );
                                    }}
                                  />
                                  <span>{student.fullName}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                        {isInstructor && active.groupInstructor?.id === workspace.user?.id ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void workspace.onUpdateActiveGroup()}
                              disabled={workspace.updateGroupMutation.isPending}
                              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                            >
                              {workspace.updateGroupMutation.isPending
                                ? "Saving..."
                                : active.groupScope === "SELECTED"
                                  ? "Save title and members"
                                  : "Save / sync audience"}
                            </button>
                            {workspace.groupError ? (
                              <p className="self-center text-sm text-rose-600">{workspace.groupError}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {active.kind === "GROUP" && isInstructor && active.groupInstructor?.id === workspace.user?.id ? (
                    <button
                      type="button"
                      onClick={() => void workspace.onDeleteActiveGroup()}
                      disabled={workspace.deleteGroupMutation.isPending}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      {workspace.deleteGroupMutation.isPending ? "Deleting..." : "Delete group"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                {active.messages.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">No messages yet. Send the first one.</p>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.label} className="space-y-4">
                      <div className="sticky top-0 z-10 flex justify-center">
                        <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">{group.label}</span>
                      </div>
                      {group.items.map((message) => {
                        const isMine = message.sender.id === workspace.user?.id;
                        return (
                          <div key={message.id} className={`max-w-[92%] rounded-[20px] px-4 py-3 shadow-sm sm:max-w-[85%] sm:rounded-[24px] ${isMine ? "ml-auto bg-emerald-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                            <p className="text-xs font-semibold opacity-80">{isMine ? "You" : message.sender.fullName}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                            <p className={`mt-3 text-xs ${isMine ? "text-emerald-100" : "text-slate-500"}`}>{formatConversationDate(message.createdAt)}</p>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <textarea
                    value={workspace.composerText}
                    onChange={(event) => workspace.setComposerText(event.target.value)}
                    placeholder="Write your message..."
                    className="min-h-20 flex-1 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 sm:min-h-24 sm:rounded-[24px]"
                  />
                  <button
                    type="button"
                    onClick={() => void workspace.onSendMessage()}
                    disabled={workspace.sendMessageMutation.isPending || !workspace.activeConversation?.canReply || !workspace.composerText.trim()}
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

