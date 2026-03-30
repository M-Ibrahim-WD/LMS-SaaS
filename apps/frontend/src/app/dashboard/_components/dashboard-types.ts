import type { PaymentMethodType } from "../../../lib/payments/payment-methods";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export interface InviteCodeResponse {
  inviteCode: string;
}

export interface StudentInstructorItem {
  id: string;
  createdAt: string;
  instructor: {
    id: string;
    fullName: string;
    email: string;
    tenant?: {
      id: string;
      name: string;
      inviteCode: string;
    } | null;
  };
}

export interface StudentCourse {
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
  learningState?: LearningState | null;
}

export interface EnrolledCourse {
  id: string;
  courseId: string;
  createdAt: string;
  course: StudentCourse;
  progress?: CourseProgress | null;
  learningState?: LearningState | null;
}

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isComplete: boolean;
}

export interface LearningState {
  lastLessonId: string | null;
  nextLesson?: {
    id: string;
    title: string;
    order: number;
  } | null;
}

export type StudentTab = "ALL" | "MY" | "INSTRUCTOR";
export type CourseFilter = "ALL" | "FREE" | "PAID";

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  category: "MANUAL" | "ONLINE";
  label: string;
  details: string;
  isActive: boolean;
}

export interface InstructorPayment {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  amount: number;
  proof: string;
  proofPreviewUrl?: string;
  proofDownloadUrl?: string;
  proofContentType?: string | null;
  proofFileName?: string | null;
  course: {
    id: string;
    title: string;
    price?: number | null;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  method: {
    id: string;
    label: string;
    type: PaymentMethodType;
  };
}

export interface StudentDashboardCourse extends StudentCourse {
  description: string;
  instructorId: string;
  instructorName: string;
  isEnrolled: boolean;
  progress: CourseProgress | null;
}

export interface ContinueLearningItem {
  courseId: string;
  courseTitle: string;
  thumbnailImage?: string | null;
  instructorName: string;
  lessonId: string;
  lessonTitle: string;
  anchorHref: string;
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
  progress: CourseProgress;
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

export interface NotificationItem {
  id: string;
  type:
    | "WELCOME"
    | "INSTRUCTOR_JOINED"
    | "PAYMENT_SUBMITTED"
    | "PAYMENT_APPROVED"
    | "PAYMENT_REJECTED"
    | "ENROLLMENT_CREATED"
    | "CERTIFICATE_ISSUED";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface InstructorSubscriptionSummary {
  requiresPlanSelection: boolean;
  freezeCreation: boolean;
  daysRemaining: number;
  selectedPlan: { id: string; name: string } | null;
  currentSubscription: {
    id: string;
    state: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    billingPeriod: "MONTHLY" | "YEARLY";
    endsAt: string;
    isTrial: boolean;
  } | null;
}
