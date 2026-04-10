"use client";

export type AssessmentScopeType = "LESSON" | "SECTION" | "COURSE";

export interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  content?: string;
  type: "VIDEO" | "TEXT" | "FILE";
  order: number;
  hasProtectedMedia?: boolean;
  mediaKind?: "VIDEO" | "FILE" | null;
  mediaFileName?: string | null;
  mediaContentType?: string | null;
}

export interface ProtectedContentEventSummary {
  id: string;
  eventType:
    | "MEDIA_SESSION_STARTED"
    | "MEDIA_SESSION_ENDED"
    | "TAB_HIDDEN"
    | "FULLSCREEN_EXITED"
    | "PRINT_ATTEMPT"
    | "COPY_ATTEMPT"
    | "CONTEXT_MENU_ATTEMPT"
    | "INVALID_MEDIA_TOKEN"
    | "SUSPICIOUS_SESSION_REGENERATION";
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  lesson: {
    id: string;
    title: string;
  };
  eventMetadata?: Record<string, unknown> | null;
}

export interface Section {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid?: boolean;
  price?: number | null;
  status: "DRAFT" | "PUBLISHED";
  sections: Section[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  order: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  scopeType: AssessmentScopeType;
  sectionId?: string | null;
  lessonId?: string | null;
  scopeLabel: string;
  questions: QuizQuestion[];
}

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  scopeType: AssessmentScopeType;
  sectionId?: string | null;
  lessonId?: string | null;
  scopeLabel: string;
}

export interface CourseAssessments {
  quizzes: Quiz[];
  assignments: Assignment[];
}

export interface InterviewSession {
  id: string;
  title: string;
  description?: string | null;
  provider: "ZOOM" | "GOOGLE_MEET";
  meetingUrl: string;
  scheduledAt: string;
  durationMinutes?: number | null;
  status: "DRAFT" | "SCHEDULED" | "COMPLETED";
  canManage: boolean;
}

export interface LearnerSummary {
  id: string;
  enrolledAt: string;
  learner: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
    isComplete: boolean;
  };
  assessments: {
    quizzesCompleted: number;
    quizzesTotal: number;
    assignmentsSubmitted: number;
    assignmentsTotal: number;
  };
  certificate: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
  } | null;
  learningState: {
    lastLessonId: string | null;
    updatedAt: string;
  } | null;
}

export interface AssignmentSubmissionGroup {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  scopeType: AssessmentScopeType;
  sectionId?: string | null;
  lessonId?: string | null;
  scopeLabel: string;
  submissions: Array<{
    id: string;
    content: string;
    status: "PENDING_REVIEW" | "REVIEWED";
    feedback?: string | null;
    score?: number | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt?: string | null;
    student: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export interface QuizSubmissionGroup {
  id: string;
  title: string;
  description?: string | null;
  scopeType: AssessmentScopeType;
  sectionId?: string | null;
  lessonId?: string | null;
  scopeLabel: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    order: number;
  }>;
  submissions: Array<{
    id: string;
    score: number;
    totalQuestions: number;
    createdAt: string;
    answers: unknown;
    student: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export type EditorMode =
  | { kind: "course" }
  | { kind: "new-section" }
  | { kind: "section"; sectionId: string }
  | { kind: "new-lesson"; sectionId: string }
  | { kind: "lesson"; lessonId: string }
  | { kind: "new-quiz" }
  | { kind: "quiz"; quizId: string }
  | { kind: "new-assignment" }
  | { kind: "assignment"; assignmentId: string };

export type UtilityTab = "assessments" | "learners" | "submissions";

export type LessonDraft = {
  title: string;
  type: Lesson["type"];
  description: string;
};

export type QuizDraft = {
  title: string;
  description: string;
  scopeType: AssessmentScopeType;
  sectionId: string;
  lessonId: string;
  questions: Array<{
    question: string;
    options: string[];
    correctOptionIndex: number;
  }>;
};

export type AssignmentDraft = {
  title: string;
  description: string;
  instructions: string;
  scopeType: AssessmentScopeType;
  sectionId: string;
  lessonId: string;
};

export function formatBuilderDate(value: string) {
  return new Date(value).toLocaleString();
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
