import { Injectable } from "@nestjs/common";
import { BillingPeriod, Plan, SubscriptionState, TenantSubscription } from "@prisma/client";

export const TRIAL_DAYS = 7;

export const trialPermissions = {
  maxCourses: 2,
  maxSectionsPerCourse: 1,
  maxLessonsPerSection: 1,
  canPublishCourses: true,
  canCreatePaidCourses: false,
  maxStudentsTotal: 10,
  maxStudentsPerCourse: 10,
  canUseQuizzes: true,
  canUseAssignments: true,
  canIssueCertificates: true,
  canUseAnalytics: false,
  canUseReviews: true,
  maxStorageMb: 256,
  canUploadThumbnails: true,
  canUploadProfileImage: true,
  canUseManualPayments: true,
  canUseOnlinePayments: false,
  maxAdminUsers: 3,
  maxInstructorUsers: 1,
  hasAdvancedAnalytics: false,
  hasOnlinePayments: false
};

export type EffectivePermissions = typeof trialPermissions;

type CorePlanSeed = {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  permissions: Partial<Plan>;
};

@Injectable()
export class SubscriptionPolicyService {
  getCorePlans(): CorePlanSeed[] {
    return [
      {
        code: "LAUNCH",
        name: "Launch",
        description: "Creator starter plan for early teaching momentum.",
        monthlyPrice: 19,
        yearlyPrice: 190,
        permissions: {
          maxCourses: 5,
          maxSectionsPerCourse: 10,
          maxLessonsPerSection: 20,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 100,
          maxStudentsPerCourse: 50,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: false,
          canUseReviews: true,
          maxStorageMb: 1024,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: false,
          hasOnlinePayments: false,
          maxAdminUsers: 2,
          maxInstructorUsers: 1
        }
      },
      {
        code: "STUDIO",
        name: "Studio",
        description: "Balanced workspace for serious independent instructors.",
        monthlyPrice: 49,
        yearlyPrice: 490,
        permissions: {
          maxCourses: 15,
          maxSectionsPerCourse: 20,
          maxLessonsPerSection: 40,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 500,
          maxStudentsPerCourse: 200,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: true,
          canUseReviews: true,
          maxStorageMb: 5120,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: true,
          hasOnlinePayments: false,
          maxAdminUsers: 4,
          maxInstructorUsers: 2
        }
      },
      {
        code: "GROWTH",
        name: "Growth",
        description: "Expanded teaching and learner capacity for growing academies.",
        monthlyPrice: 99,
        yearlyPrice: 990,
        permissions: {
          maxCourses: 40,
          maxSectionsPerCourse: 30,
          maxLessonsPerSection: 60,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 2000,
          maxStudentsPerCourse: 750,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: true,
          canUseReviews: true,
          maxStorageMb: 20480,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: true,
          hasOnlinePayments: false,
          maxAdminUsers: 8,
          maxInstructorUsers: 5
        }
      },
      {
        code: "EMPIRE",
        name: "Empire",
        description: "Top-tier scale and control for advanced academies.",
        monthlyPrice: 199,
        yearlyPrice: 1990,
        permissions: {
          maxCourses: 200,
          maxSectionsPerCourse: 50,
          maxLessonsPerSection: 100,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 10000,
          maxStudentsPerCourse: 5000,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: true,
          canUseReviews: true,
          maxStorageMb: 102400,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: true,
          hasOnlinePayments: false,
          maxAdminUsers: 20,
          maxInstructorUsers: 10
        }
      }
    ];
  }

  getTrialPermissions() {
    return trialPermissions;
  }

  mapPlanPermissions(plan: Plan): EffectivePermissions {
    return {
      maxCourses: plan.maxCourses,
      maxSectionsPerCourse: plan.maxSectionsPerCourse,
      maxLessonsPerSection: plan.maxLessonsPerSection,
      canPublishCourses: plan.canPublishCourses,
      canCreatePaidCourses: plan.canCreatePaidCourses,
      maxStudentsTotal: plan.maxStudentsTotal,
      maxStudentsPerCourse: plan.maxStudentsPerCourse,
      canUseQuizzes: plan.canUseQuizzes,
      canUseAssignments: plan.canUseAssignments,
      canIssueCertificates: plan.canIssueCertificates,
      canUseAnalytics: plan.canUseAnalytics,
      canUseReviews: plan.canUseReviews,
      maxStorageMb: plan.maxStorageMb,
      canUploadThumbnails: plan.canUploadThumbnails,
      canUploadProfileImage: plan.canUploadProfileImage,
      canUseManualPayments: plan.canUseManualPayments,
      canUseOnlinePayments: plan.hasOnlinePayments,
      maxAdminUsers: plan.maxAdminUsers,
      maxInstructorUsers: plan.maxInstructorUsers,
      hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
      hasOnlinePayments: plan.hasOnlinePayments
    };
  }

  addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  buildDaysRemaining(endsAt: Date | null) {
    if (!endsAt) {
      return 0;
    }

    return Math.max(
      0,
      Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
  }

  mapEntitlementSummary(currentSubscription: (TenantSubscription & { plan: Plan }) | null) {
    return currentSubscription?.state === SubscriptionState.TRIAL
      ? this.getTrialPermissions()
      : currentSubscription
        ? this.mapPlanPermissions(currentSubscription.plan)
        : null;
  }

  buildSubscriptionEndDate(
    startsAt: Date,
    billingPeriod: BillingPeriod,
    options?: { isTrial?: boolean }
  ) {
    return options?.isTrial
      ? this.addDays(startsAt, TRIAL_DAYS)
      : this.addMonths(startsAt, billingPeriod === BillingPeriod.YEARLY ? 12 : 1);
  }
}
