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
