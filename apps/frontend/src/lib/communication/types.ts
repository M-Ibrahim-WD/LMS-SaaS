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
  kind: "DIRECT" | "SUPPORT";
  status: "OPEN" | "CLOSED";
  courseId: string | null;
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
