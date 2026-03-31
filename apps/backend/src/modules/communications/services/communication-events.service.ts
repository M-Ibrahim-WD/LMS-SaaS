import { Injectable } from "@nestjs/common";
import { Subject } from "rxjs";
import { ConversationKind, ConversationStatus } from "@prisma/client";

export type CommunicationEvent =
  | {
      type: "conversation.message.created";
      conversationId: string;
      kind: ConversationKind;
      participantUserIds: string[];
      supportAdminIds?: string[];
    }
  | {
      type: "conversation.read.updated";
      conversationId: string;
      userId: string;
    }
  | {
      type: "conversation.status.updated";
      conversationId: string;
      kind: ConversationKind;
      status: ConversationStatus;
      participantUserIds: string[];
      supportAdminIds?: string[];
    }
  | {
      type: "support.assignment.updated";
      conversationId: string;
      adminUserId: string;
      requesterUserId?: string | null;
    };

@Injectable()
export class CommunicationEventsService {
  private readonly eventsSubject = new Subject<CommunicationEvent>();

  readonly events$ = this.eventsSubject.asObservable();

  publish(event: CommunicationEvent) {
    this.eventsSubject.next(event);
  }
}
