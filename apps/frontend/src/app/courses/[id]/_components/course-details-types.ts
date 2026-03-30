"use client";

import type { PaymentMethodType } from "../../../../lib/payments/payment-methods";

export interface Lesson {
  id: string;
  title: string;
  content: string;
  type: "VIDEO" | "TEXT" | "FILE";
  order: number;
  isCompleted?: boolean;
}

export interface Section {
  id: string;
  title: string;
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
  submission: AssignmentSubmission | null;
}

export interface CourseAssessments {
  quizzes: CourseQuiz[];
  assignments: CourseAssignment[];
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
  isEligible: boolean;
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
