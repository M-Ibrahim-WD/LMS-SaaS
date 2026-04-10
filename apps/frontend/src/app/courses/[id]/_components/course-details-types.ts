"use client";

import type { PaymentMethodType } from "../../../../lib/payments/payment-methods";

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
  isCompleted?: boolean;
}

export interface Section {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isComplete: boolean;
}

export interface CourseDetails {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid: boolean;
  price?: number | null;
  status: "DRAFT" | "PUBLISHED";
  instructor?: {
    id: string;
    fullName: string;
  };
  sections: Section[];
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLessonId?: string | null;
  } | null;
}

export interface CourseListItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid: boolean;
  price?: number | null;
  status: "DRAFT" | "PUBLISHED";
  instructor?: {
    id: string;
    fullName: string;
  };
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLessonId?: string | null;
  } | null;
}

export interface EnrollmentItem {
  id: string;
  courseId: string;
  createdAt: string;
  course: CourseListItem;
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLesson?: {
      id: string;
      title: string;
      order: number;
    } | null;
  } | null;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  category: "MANUAL" | "ONLINE";
  label: string;
  details: string;
  isActive: boolean;
}

export interface StudentPayment {
  id: string;
  courseId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proof: string;
  amount: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: "MULTIPLE_CHOICE";
  options: string[];
  order: number;
  correctAnswer?: string;
}

export interface QuizSubmission {
  id: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
  answers: string[];
}

export interface CourseQuiz {
  id: string;
  title: string;
  description?: string | null;
  scopeType: AssessmentScopeType;
  sectionId?: string | null;
  lessonId?: string | null;
  scopeLabel: string;
  isLocked: boolean;
  canAccess: boolean;
  canEdit: boolean;
  status: "LOCKED" | "READY" | "IN_PROGRESS" | "SUBMITTED" | "BLANK";
  lockReason?: string | null;
  attemptStatus: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "BLANK";
  canEnter: boolean;
  hasConsumedAttempt: boolean;
  enteredAt?: string | null;
  questions: QuizQuestion[];
  submission: QuizSubmission | null;
}

export interface AssignmentSubmission {
  id: string;
  content: string;
  status: "PENDING_REVIEW" | "REVIEWED";
  feedback?: string | null;
  score?: number | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
}

export interface CourseAssignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  scopeType: AssessmentScopeType;
  sectionId?: string | null;
  lessonId?: string | null;
  scopeLabel: string;
  isLocked: boolean;
  canAccess: boolean;
  canEdit: boolean;
  status: "LOCKED" | "READY" | "SUBMITTED" | "REVIEWED";
  lockReason?: string | null;
  submission: AssignmentSubmission | null;
}

export interface CourseAssessments {
  quizzes: CourseQuiz[];
  assignments: CourseAssignment[];
}

export interface CourseInterviewSession {
  id: string;
  title: string;
  description?: string | null;
  provider: "ZOOM" | "GOOGLE_MEET";
  meetingUrl: string;
  scheduledAt: string;
  durationMinutes?: number | null;
  status: "DRAFT" | "SCHEDULED" | "COMPLETED";
  canManage: boolean;
  canEdit?: boolean;
  isJoinReady?: boolean;
  attendanceCount?: number;
  studentAttendedCount?: number;
  instructorCreatedCount?: number;
  course: {
    id: string;
    title: string;
  };
}

export interface CourseCompletionStatus {
  lessons: {
    completed: number;
    total: number;
    done: boolean;
  };
  quizzes: {
    completed: number;
    total: number;
    done: boolean;
  };
  assignments: {
    completed: number;
    total: number;
    done: boolean;
  };
  status: "LOCKED" | "ELIGIBLE" | "CERTIFICATE_READY";
  isEligible: boolean;
  lockReason: string | null;
  nextAction: string;
  certificate: {
    id: string;
    issuedAt: string;
    certificateNumber: string;
  } | null;
}

export interface CourseReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ProofUploadState =
  | "idle"
  | "selected"
  | "uploading"
  | "uploaded"
  | "failed";

export type MergedLearningState =
  | {
      lastLessonId: string | null;
      nextLessonId?: string | null;
    }
  | {
      lastLessonId: string | null;
      nextLesson?: {
        id: string;
        title: string;
        order: number;
      } | null;
    };

export function formatCourseDate(value: string) {
  return new Date(value).toLocaleString();
}
