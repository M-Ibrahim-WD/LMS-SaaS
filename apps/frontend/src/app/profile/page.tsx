"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BackButton } from "../../components/back-button";
import { EmptyProfilePanel } from "../../components/profile/profile-support";
import { ProfileShell, ProfileSkeleton } from "../../components/profile/profile-shell";
import { useRequireAuth } from "../../hooks/use-require-auth";
import { apiFetch } from "../../lib/api/client";
import { useAuthStore } from "../../store/auth.store";
import { InstructorProfileView } from "./_components/instructor-profile-view";
import {
  CertificateItem,
  CourseCardItem,
  EnrollmentItem,
  InstructorAnalytics,
  InstructorPayment,
  InstructorProfile,
  NotificationItem,
  PaymentMethod,
  ProfileSummary,
  ReviewItem,
  StudentInstructorItem
} from "./_components/profile-types";
import { StudentProfileView } from "./_components/student-profile-view";
import { ProfilePanel } from "../../components/profile/profile-shell";
import { SectionHeader } from "../../components/profile/profile-support";

export default function ProfilePage() {
  const { accessToken, hasHydrated, user } = useRequireAuth();
  const queryClient = useQueryClient();
  const authTenant = useAuthStore((state) => state.tenant);
  const setSession = useAuthStore((state) => state.setSession);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["profile-summary"],
    queryFn: () => apiFetch<ProfileSummary>("/users/profile-summary", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  const instructorProfileQuery = useQuery({
    queryKey: ["instructor-profile", "private"],
    queryFn: () => apiFetch<InstructorProfile>("/instructor/profile", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "INSTRUCTOR")
  });

  const instructorAnalyticsQuery = useQuery({
    queryKey: ["instructor-analytics"],
    queryFn: () => apiFetch<InstructorAnalytics>("/instructor/analytics", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "INSTRUCTOR")
  });

  const instructorCoursesQuery = useQuery({
    queryKey: ["instructor-courses", "profile"],
    queryFn: () => apiFetch<CourseCardItem[]>("/courses", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "INSTRUCTOR")
  });

  const instructorReviewsQuery = useQuery({
    queryKey: ["instructor-public-reviews", user?.id],
    queryFn: () => apiFetch<ReviewItem[]>(`/instructor/public/${user?.id}/reviews`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "INSTRUCTOR" && user?.id)
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods", "my", "profile"],
    queryFn: () => apiFetch<PaymentMethod[]>("/payment-methods/my", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "INSTRUCTOR")
  });

  const instructorPaymentsQuery = useQuery({
    queryKey: ["payments", "instructor", "profile"],
    queryFn: () => apiFetch<InstructorPayment[]>("/payments/instructor", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "INSTRUCTOR")
  });

  const studentCoursesQuery = useQuery({
    queryKey: ["student-courses", "profile"],
    queryFn: () => apiFetch<EnrollmentItem[]>("/enrollments/my-courses", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "STUDENT")
  });

  const studentCertificatesQuery = useQuery({
    queryKey: ["student-certificates", "profile"],
    queryFn: () => apiFetch<CertificateItem[]>("/certificates/my", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "STUDENT")
  });

  const studentFollowingQuery = useQuery({
    queryKey: ["student-following", "profile"],
    queryFn: () => apiFetch<StudentInstructorItem[]>("/student/instructors", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && user?.role === "STUDENT")
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "profile"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications/my", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken)
  });

  useEffect(() => {
    if (summaryQuery.data) {
      setFullName(summaryQuery.data.fullName ?? "");
      setBio(summaryQuery.data.bio ?? "");
      setProfileImage(summaryQuery.data.profileImage ?? null);
    }
  }, [summaryQuery.data]);

  const previewImageUrl = useMemo(() => {
    if (profileImageFile) {
      return URL.createObjectURL(profileImageFile);
    }

    return profileImage;
  }, [profileImage, profileImageFile]);

  useEffect(() => {
    return () => {
      if (previewImageUrl && profileImageFile) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl, profileImageFile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () =>
      apiFetch("/users/profile", {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          fullName: fullName.trim(),
          bio: bio.trim() ? bio.trim() : undefined
        })
      }),
    onSuccess: (updatedUser) => {
      if (accessToken && user) {
        setSession({
          accessToken,
          tenant: authTenant,
          user: updatedUser as typeof user
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["profile-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["instructor-profile", "private"] });
    }
  });

  const uploadProfileImageMutation = useMutation({
    mutationFn: async () => {
      if (!profileImageFile) {
        throw new Error("Please choose an image first.");
      }

      const formData = new FormData();
      formData.append("file", profileImageFile);

      return apiFetch("/users/profile-image", {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: formData
      });
    },
    onSuccess: (updatedUser) => {
      setProfileImageFile(null);
      const uploadedProfileImage =
        typeof updatedUser === "object" &&
        updatedUser !== null &&
        "profileImage" in updatedUser &&
        typeof (updatedUser as { profileImage?: unknown }).profileImage === "string"
          ? ((updatedUser as { profileImage?: string | null }).profileImage ?? null)
          : null;
      setProfileImage(uploadedProfileImage);
      if (accessToken && user) {
        setSession({
          accessToken,
          tenant: authTenant,
          user: updatedUser as typeof user
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["profile-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["instructor-profile", "private"] });
      void queryClient.invalidateQueries({ queryKey: ["public-instructor-profile"] });
    }
  });

  const settingsForm = (
    <ProfilePanel>
      <SectionHeader eyebrow="Settings" title="Edit profile" description="" />
      <form
        className="space-y-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void updateProfileMutation.mutateAsync();
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Name</span>
          <input className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Bio</span>
          <textarea className="min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200" value={bio} onChange={(event) => setBio(event.target.value)} />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Profile image</span>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-700 to-sky-500 text-lg font-semibold text-white">
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImageUrl} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                (fullName || "U")
                  .split(" ")
                  .map((part) => part.trim()[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => setProfileImageFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              <p className="mt-2 text-xs text-slate-500">PNG, JPG, or WEBP up to 3 MB.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!profileImageFile || uploadProfileImageMutation.isPending}
                  onClick={() => void uploadProfileImageMutation.mutateAsync()}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
                >
                  {uploadProfileImageMutation.isPending ? "Uploading..." : "Upload image"}
                </button>
                {profileImageFile ? (
                  <button
                    type="button"
                    onClick={() => setProfileImageFile(null)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
              {uploadProfileImageMutation.isError ? (
                <p className="mt-2 text-sm text-rose-600">{(uploadProfileImageMutation.error as Error).message}</p>
              ) : null}
              {uploadProfileImageMutation.isSuccess ? (
                <p className="mt-2 text-sm text-emerald-700">Profile image uploaded successfully.</p>
              ) : null}
            </div>
          </div>
        </label>
        {updateProfileMutation.isError ? <p className="text-sm text-rose-600">{(updateProfileMutation.error as Error).message}</p> : null}
        {updateProfileMutation.isSuccess ? <p className="text-sm text-emerald-700">Profile updated successfully.</p> : null}
        <button type="submit" disabled={updateProfileMutation.isPending} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </form>
    </ProfilePanel>
  );

  if (!hasHydrated) {
    return <main className="p-8">Profile</main>;
  }

  return (
    <ProfileShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <BackButton fallbackHref="/dashboard" label="Back" />
        <Link href="/dashboard" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Dashboard
        </Link>
      </div>

      {summaryQuery.isLoading ? <ProfileSkeleton /> : null}
      {summaryQuery.isError ? (
        <div className="mt-6">
          <EmptyProfilePanel title="Profile unavailable" description="" />
        </div>
      ) : null}

      {summaryQuery.data?.role === "INSTRUCTOR" && instructorProfileQuery.data ? (
        <InstructorProfileView
          accessToken={accessToken ?? ""}
          profile={instructorProfileQuery.data}
          analytics={instructorAnalyticsQuery.data}
          courses={instructorCoursesQuery.data}
          reviews={instructorReviewsQuery.data}
          paymentMethods={paymentMethodsQuery.data}
          payments={instructorPaymentsQuery.data}
          settingsForm={settingsForm}
        />
      ) : null}

      {summaryQuery.data?.role === "STUDENT" ? (
        <StudentProfileView
          summary={summaryQuery.data}
          courses={studentCoursesQuery.data}
          certificates={studentCertificatesQuery.data}
          following={studentFollowingQuery.data}
          notifications={notificationsQuery.data}
          settingsForm={settingsForm}
        />
      ) : null}
    </ProfileShell>
  );
}


