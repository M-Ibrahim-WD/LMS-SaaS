"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EmptyState } from "../../../components/empty-state";
import { ProfileCourseCard } from "../../../components/profile/course-card";
import { ActivityIcon, CertificateIcon, GridIcon, PeopleIcon, SettingsIcon } from "../../../components/profile/profile-icons";
import { ProfileHeader } from "../../../components/profile/profile-header";
import { SectionHeader } from "../../../components/profile/profile-support";
import { ProfilePanel } from "../../../components/profile/profile-shell";
import { ProfileTabs } from "../../../components/profile/profile-tabs";
import type { CertificateItem, EnrollmentItem, NotificationItem, ProfileSummary, StudentInstructorItem } from "./profile-types";

type StudentTab = "courses" | "certificates" | "activity" | "following" | "settings";

interface StudentProfileViewProps {
  summary: ProfileSummary;
  courses?: EnrollmentItem[];
  certificates?: CertificateItem[];
  following?: StudentInstructorItem[];
  notifications?: NotificationItem[];
  settingsForm: ReactNode;
}

export function StudentProfileView({
  summary,
  courses,
  certificates,
  following,
  notifications,
  settingsForm
}: StudentProfileViewProps) {
  const [tab, setTab] = useState<StudentTab>("courses");
  const continueLearning =
    courses?.find((item) => item.learningState?.nextLesson) ??
    courses?.find((item) => (item.progress?.percentage ?? 0) > 0) ??
    null;

  return (
    <>
      <ProfileHeader
        name={summary.fullName}
        bio={summary.bio}
        imageUrl={summary.profileImage}
        badge="Student Profile"
        stats={[
          { label: "Courses", value: String((summary.stats as { coursesCount: number }).coursesCount ?? 0) },
          { label: "Certificates", value: String((summary.stats as { certificatesCount: number }).certificatesCount ?? 0) },
          { label: "Following", value: String((summary.stats as { followingCount: number }).followingCount ?? 0) }
        ]}
        actions={
          continueLearning ? (
            <Link
                  href={`/courses/${continueLearning.course.id}${continueLearning.learningState?.nextLesson ? `#lesson-${continueLearning.learningState.nextLesson.id}` : ""}`}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white"
            >
              Continue learning
            </Link>
          ) : undefined
        }
      />

      <ProfileTabs
        activeKey={tab}
        onChange={(key) => setTab(key as StudentTab)}
        items={[
          { key: "courses", label: "My Courses", icon: <GridIcon /> },
          { key: "certificates", label: "Certificates", icon: <CertificateIcon /> },
          { key: "activity", label: "Activity", icon: <ActivityIcon /> },
          { key: "following", label: "Following", icon: <PeopleIcon /> },
          { key: "settings", label: "Settings", icon: <SettingsIcon /> }
        ]}
      />

      <div className="mt-6">
        {tab === "courses" ? (
          <ProfilePanel>
            <SectionHeader eyebrow="Learning" title="Continue where you left off" description="" />
            {courses?.length ? (
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                {courses.map((enrollment) => (
                  <div key={enrollment.id} className="space-y-3">
                    <ProfileCourseCard
                      id={enrollment.course.id}
                      title={enrollment.course.title}
                      description={enrollment.course.description}
                      imageUrl={enrollment.course.thumbnailImage}
                      price={enrollment.course.price}
                      isPaid={enrollment.course.isPaid}
                      studentsCount={enrollment.course.studentsCount}
                      href={
                        enrollment.learningState?.nextLesson
                          ? `/courses/${enrollment.course.id}#lesson-${enrollment.learningState.nextLesson.id}`
                          : `/courses/${enrollment.course.id}`
                      }
                    />
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          Progress {enrollment.progress?.completedLessons ?? 0}/{enrollment.progress?.totalLessons ?? 0}
                        </span>
                        <span>{enrollment.progress?.percentage ?? 0}%</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-sky-600" style={{ width: `${enrollment.progress?.percentage ?? 0}%` }} />
                      </div>
                      {enrollment.learningState?.nextLesson?.title ? (<p className="mt-3 text-sm text-slate-500">{enrollment.learningState.nextLesson.title}</p>) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No enrolled courses yet" description="Browse instructors and enroll in a course to start building your learning library." />
            )}
          </ProfilePanel>
        ) : null}

        {tab === "certificates" ? (
          <ProfilePanel>
            <SectionHeader eyebrow="Certificates" title="Earned outcomes" description="" />
            {certificates?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {certificates.map((certificate) => (
                  <div key={certificate.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-lg font-semibold text-slate-950">{certificate.course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{certificate.course.instructor?.fullName ?? "Instructor"}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">{certificate.certificateNumber}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/certificates/${certificate.id}`} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                        View certificate
                      </Link>
                      <Link href={`/certificate-verification/${certificate.certificateNumber}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                        Verify
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No certificates yet" description="Finish lessons and assessments to unlock certificates here." />
            )}
          </ProfilePanel>
        ) : null}

        {tab === "activity" ? (
          <ProfilePanel>
            <SectionHeader eyebrow="Activity" title="Recent updates" description="" />
            {notifications?.length ? (
              <div className="space-y-3">
                {notifications.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.isRead ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-700"}`}>{item.isRead ? "Read" : "New"}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No activity yet" description="Your notifications and account updates will appear here as you learn and complete work." />
            )}
          </ProfilePanel>
        ) : null}

        {tab === "following" ? (
          <ProfilePanel>
            <SectionHeader eyebrow="Following" title="Instructors you follow" description="" />
            {following?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {following.map((relation) => (
                  <div key={relation.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
                    <p className="text-lg font-semibold text-slate-950">{relation.instructor.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{relation.instructor.tenant?.name ?? relation.instructor.email}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Joined {new Date(relation.createdAt).toLocaleDateString()}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/instructors/${relation.instructor.id}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                        Open profile
                      </Link>
                      <Link href={`/messages?target=${relation.instructor.id}`} className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                        Message instructor
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No instructors yet" description="Join an instructor from the dashboard to build your followed creator list here." />
            )}
          </ProfilePanel>
        ) : null}

        {tab === "settings" ? settingsForm : null}
      </div>
    </>
  );
}




