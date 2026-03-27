import Link from "next/link";

interface CertificateVerificationPageProps {
  params: Promise<{ certificateNumber: string }>;
}

async function getCertificate(certificateNumber: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(`${apiUrl}/certificate-verification/${certificateNumber}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    verified: boolean;
    certificate: {
      certificateNumber: string;
      issuedAt: string;
      user: {
        fullName: string;
      };
      course: {
        title: string;
        instructor?: {
          fullName: string;
        };
      };
    };
  };
}

export default async function CertificateVerificationPage({ params }: CertificateVerificationPageProps) {
  const { certificateNumber } = await params;
  const result = await getCertificate(certificateNumber);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Certificate Verification</p>
        {result?.verified ? (
          <div className="mt-6 space-y-4">
            <div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
              Verified certificate
            </div>
            <div>
              <p className="text-sm text-slate-500">Learner</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{result.certificate.user.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Course</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{result.certificate.course.title}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Instructor</p>
              <p className="mt-1 text-base text-slate-800">
                {result.certificate.course.instructor?.fullName ?? "Instructor"}
              </p>
            </div>
            <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Certificate Number</p>
                <p className="mt-1 font-medium text-slate-900">{result.certificate.certificateNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Issued</p>
                <p className="mt-1 font-medium text-slate-900">
                  {new Date(result.certificate.issuedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800">
              Certificate not found
            </div>
            <p className="text-sm text-slate-600">
              The requested certificate number could not be verified.
            </p>
          </div>
        )}

        <div className="mt-8">
          <Link href="/login" className="text-sm font-medium text-sky-700 underline underline-offset-4">
            Return to the LMS
          </Link>
        </div>
      </div>
    </main>
  );
}

