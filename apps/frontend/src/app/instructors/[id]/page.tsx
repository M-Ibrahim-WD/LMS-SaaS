"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackButton } from "../../../components/back-button";
import { EmptyState } from "../../../components/empty-state";
import { ProfileCourseCard } from "../../../components/profile/course-card";
import { ChatIcon, GridIcon } from "../../../components/profile/profile-icons";
import { ProfileHeader } from "../../../components/profile/profile-header";
import { ReviewsList, SectionHeader } from "../../../components/profile/profile-support";
import { ProfilePanel, ProfileShell, ProfileSkeleton } from "../../../components/profile/profile-shell";
import { ProfileTabs } from "../../../components/profile/profile-tabs";
import { apiFetch } from "../../../lib/api/client";
import type { ReviewItem } from "../../profile/_components/profile-types";

interface PublicInstructorProfile {
  id: string;
  fullName: string;
  bio?: string | null;
  profileImage?: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
  stats: {
    studentsCount: number;
    coursesCount: number;
    reviewsCount: number;
    averageRating: number | null;
  };
  courses: Array<{
    id: string;
    title: string;
    description?: string | null;
    thumbnailImage?: string | null;
    isPaid: boolean;
    price?: number | null;
    studentsCount: number;
    averageRating: number | null;
    reviewsCount: number;
  }>;
  reviews: ReviewItem[];
}

type PublicTab = "courses" | "reviews";

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = rating >= index + 0.5;

        return (
          <span
            key={index}
            className={`text-sm leading-none ${filled ? "text-amber-500" : "text-slate-300"}`}
          >
            {"\u2605"}
          </span>
        );
      })}
    </span>
  );
}

export default function PublicInstructorProfilePage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<PublicTab>("courses");

  const profileQuery = useQuery({
    queryKey: ["public-instructor-profile", params.id],
    queryFn: () => apiFetch<PublicInstructorProfile>(`/instructor/public/${params.id}`),
    enabled: Boolean(params.id)
  });

  return (
    <ProfileShell>
      <div className="mb-4 flex items-center justify-between gap-3">
        <BackButton fallbackHref="/dashboard" label="Back" />
        <Link href="/courses" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Browse courses
        </Link>
      </div>

      {profileQuery.isLoading ? <ProfileSkeleton /> : null}

      {profileQuery.data ? (
        <>
          <ProfileHeader
            name={profileQuery.data.fullName}
            bio={profileQuery.data.bio}
            imageUrl={profileQuery.data.profileImage}
            badge={profileQuery.data.tenant?.name ?? "Instructor"}
            stats={[
              { label: "Students", value: String(profileQuery.data.stats.studentsCount) },
              { label: "Courses", value: String(profileQuery.data.stats.coursesCount) },
              {
                label: "Reviews",
                value:
                  profileQuery.data.stats.averageRating !== null
                    ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <RatingStars rating={profileQuery.data.stats.averageRating} />
                          <span>{profileQuery.data.stats.averageRating.toFixed(1)} / 5</span>
                        </span>
                      )
                    : "No ratings",
                helper: `${profileQuery.data.stats.reviewsCount} review${profileQuery.data.stats.reviewsCount === 1 ? "" : "s"}`
              }
            ]}
          />

          <ProfileTabs
            activeKey={tab}
            onChange={(key) => setTab(key as PublicTab)}
            items={[
              { key: "courses", label: "Courses", icon: <GridIcon /> },
              { key: "reviews", label: "Reviews", icon: <ChatIcon /> }
            ]}
          />

          <div className="mt-6">
            {tab === "courses" ? (
              <ProfilePanel>
                <SectionHeader eyebrow="Courses" title="Published courses" description="A storefront view of this instructor's available learning catalog." />
                {profileQuery.data.courses.length ? (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                    {profileQuery.data.courses.map((course) => (
                      <ProfileCourseCard
                        key={course.id}
                        id={course.id}
                        title={course.title}
                        description={course.description}
                        imageUrl={course.thumbnailImage}
                        price={course.price}
                        isPaid={course.isPaid}
                        studentsCount={course.studentsCount}
                        averageRating={course.averageRating}
                        reviewsCount={course.reviewsCount}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No courses published yet" description="This instructor has not published any courses yet." />
                )}
              </ProfilePanel>
            ) : null}

            {tab === "reviews" ? <ReviewsList reviews={profileQuery.data.reviews} /> : null}
          </div>
        </>
      ) : null}

      {profileQuery.isError ? (
        <div className="mt-6">
          <ProfilePanel>
            <EmptyState title="Instructor unavailable" description="We could not load this instructor profile right now." />
          </ProfilePanel>
        </div>
      ) : null}
    </ProfileShell>
  );
}
