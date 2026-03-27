"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageShell } from "../../../components/page-shell";
import { StatusBanner } from "../../../components/status-banner";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";

interface CertificateDetail {
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
  user: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function CertificateDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, hasHydrated, isAuthorized } = useRequireAuth({ roles: ["STUDENT"] });

  const certificateQuery = useQuery({
    queryKey: ["certificate", params.id],
    queryFn: () => apiFetch<CertificateDetail>(`/certificates/${params.id}`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && isAuthorized && params.id)
  });

  return (
    <PageShell
      title="Certificate"
      description="A printable completion record for the course you finished."
      backHref="/profile"
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Print / Save PDF
        </button>
      }
      maxWidthClassName="max-w-4xl"
    >
      {!hasHydrated || certificateQuery.isLoading ? <StatusBanner>Loading certificate...</StatusBanner> : null}
      {certificateQuery.isError ? (
        <StatusBanner variant="error">Failed to load certificate details.</StatusBanner>
      ) : null}
      {certificateQuery.data ? (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50 p-10 shadow-sm print:border-none print:shadow-none">
          <div className="rounded-2xl border border-amber-200 bg-white p-10 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-700">Certificate of Completion</p>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">
              {certificateQuery.data.user.fullName}
            </h2>
            <p className="mt-4 text-lg text-slate-600">has successfully completed</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{certificateQuery.data.course.title}</p>
            <p className="mt-4 text-sm text-slate-500">
              Instructor: {certificateQuery.data.course.instructor?.fullName ?? "Instructor"}
            </p>
            <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 text-left sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Certificate Number</p>
                <p className="mt-2 text-sm font-medium text-slate-800">{certificateQuery.data.certificateNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Issued</p>
                <p className="mt-2 text-sm font-medium text-slate-800">
                  {new Date(certificateQuery.data.issuedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-8">
              <Link
                href={`/certificate-verification/${certificateQuery.data.certificateNumber}`}
                className="text-sm font-medium text-sky-700 underline underline-offset-4"
              >
                Open public verification page
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

