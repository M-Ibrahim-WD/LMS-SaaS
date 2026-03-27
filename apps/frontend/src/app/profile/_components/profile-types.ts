"use client";

export type AppRole = "ADMIN" | "INSTRUCTOR" | "STUDENT";

export interface ProfileSummary {
  id: string;
  fullName: string;
  email: string;
  bio?: string | null;
  profileImage?: string | null;
  role: AppRole;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
  } | null;
  stats:
    | {
        studentsCount: number;
        coursesCount: number;
      }
    | {
        coursesCount: number;
        certificatesCount: number;
        followingCount: number;
      };
}

export interface InstructorProfile {
  id: string;
  fullName: string;
  email: string;
  bio?: string | null;
  profileImage?: string | null;
  tenant?: {
    id: string;
    name: string;
    inviteCode: string;
  } | null;
  stats: {
    studentsCount: number;
    coursesCount: number;
    publicCoursesCount: number;
    totalRevenue: number;
    salesCount: number;
    reviewsCount: number;
    averageRating: number | null;
  };
}

export interface InstructorAnalytics {
  totals: {
    studentsCount: number;
    totalRevenue: number;
  };
  studentsGrowth: {
    currentWindow: number;
    previousWindow: number;
    delta: number;
  };
  salesPerCourse: Array<{
    id: string;
    title: string;
    status: "DRAFT" | "PUBLISHED";
    studentsCount: number;
    revenue: number;
  }>;
}

export interface CourseCardItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  isPaid?: boolean;
  price?: number | null;
  status?: "DRAFT" | "PUBLISHED";
  studentsCount?: number;
}

export interface EnrollmentItem {
  id: string;
  courseId: string;
  course: CourseCardItem & {
    instructor?: {
      id: string;
      fullName: string;
    };
  };
  progress?: {
    percentage: number;
    completedLessons: number;
    totalLessons: number;
  } | null;
  learningState?: {
    nextLesson?: {
      id: string;
      title: string;
    } | null;
  } | null;
}

export interface CertificateItem {
  id: string;
  issuedAt: string;
  certificateNumber: string;
  course: {
    id: string;
    title: string;
    instructor?: {
      id: string;
      fullName: string;
    };
  };
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

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  student: {
    id: string;
    fullName: string;
  };
  course?: {
    id: string;
    title: string;
  };
}

export interface PaymentMethod {
  id: string;
  label: string;
  type: string;
  category: "MANUAL" | "ONLINE";
  details: string;
  isActive: boolean;
}

export interface InstructorPayment {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proofContentType?: string | null;
  proofFileName?: string | null;
  course: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    fullName: string;
    email: string;
  };
  method: {
    id: string;
    label: string;
    type: string;
  };
}
