import type { AppUserRole } from "../auth/token";

export interface ConversationUser {
  id: string;
  fullName: string;
  email: string;
  role: AppUserRole;
  profileImage?: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
}

export interface ConversationMessage {
  id: string;
  body: string;
  createdAt: string;
  sender: ConversationUser;
}

export interface ConversationSummary {
  id: string;
  tenantId: string | null;
  kind: "DIRECT" | "SUPPORT" | "GROUP";
  status: "OPEN" | "CLOSED";
  courseId: string | null;
  groupTitle: string | null;
  groupScope: "COURSE" | "FOLLOWERS" | "SELECTED" | null;
  groupImage: string | null;
  groupInstructor: ConversationUser | null;
  participantPreview: ConversationUser[];
  participantCount: number;
  course: {
    id: string;
    title: string;
    thumbnailImage?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  unreadCount: number;
  otherParticipant: ConversationUser | null;
  requester: ConversationUser | null;
  assignedAdmin: ConversationUser | null;
  latestMessage: ConversationMessage | null;
  canReply: boolean;
  isAssignedToCurrentAdmin: boolean;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface MessageGroup {
  label: string;
  items: ConversationMessage[];
}

export function formatConversationDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString();
}

export function formatRelativeConversationTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const target = new Date(value).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - target);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return new Date(value).toLocaleDateString();
}

export function groupConversationMessages(messages: ConversationMessage[]): MessageGroup[] {
  const groups = new Map<string, ConversationMessage[]>();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const message of messages) {
    const createdAt = new Date(message.createdAt);
    const startOfMessageDay = new Date(
      createdAt.getFullYear(),
      createdAt.getMonth(),
      createdAt.getDate()
    );
    const diffInDays = Math.floor(
      (startOfToday.getTime() - startOfMessageDay.getTime()) / (1000 * 60 * 60 * 24)
    );

    let label = startOfMessageDay.toLocaleDateString();
    if (diffInDays === 0) {
      label = "Today";
    } else if (diffInDays === 1) {
      label = "Yesterday";
    } else if (diffInDays > 1 && diffInDays < 7) {
      label = "Earlier this week";
    } else if (diffInDays >= 7 && diffInDays < 30) {
      label = "Earlier";
    }

    const bucket = groups.get(label) ?? [];
    bucket.push(message);
    groups.set(label, bucket);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items
  }));
}
