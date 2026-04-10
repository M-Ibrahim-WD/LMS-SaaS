"use client";

import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import type { Plan, PlanForm, PlanStepTitle } from "./admin-control-center.shared";
import {
  defaultPlanForm,
  featureFieldGroups,
  money,
  numericFieldMeta,
  planStepOrder
} from "./admin-control-center.shared";

interface AdminPlansSectionProps {
  plans?: Plan[];
  plansLoading: boolean;
  selectedPlanId: string | null;
  setSelectedPlanId: (value: string | null) => void;
  beginEditPlan: (plan: Plan) => void;
  archivePlan: (planId: string) => void;
  planForm: PlanForm;
  setPlanForm: Dispatch<SetStateAction<PlanForm>>;
  activePlanStep: PlanStepTitle;
  setActivePlanStep: (value: PlanStepTitle) => void;
  currentStepIndex: number;
  wizardProgress: number;
  renderPlanStepFrame: (input: { title: PlanStepTitle; description: string; children: ReactNode }) => ReactNode;
  submitPlan: (event: FormEvent<HTMLFormElement>) => void;
}

export function AdminPlansSection({
  plans,
  plansLoading,
  selectedPlanId,
  setSelectedPlanId,
  beginEditPlan,
  archivePlan,
  planForm,
  setPlanForm,
  activePlanStep,
  setActivePlanStep,
  currentStepIndex,
  wizardProgress,
  renderPlanStepFrame,
  submitPlan
}: AdminPlansSectionProps) {
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Plans</h2>
        <div className="mt-4 space-y-3">
          {plans?.length ? (
            plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {plan.name} <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{plan.code}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{plan.description || "No description provided."}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {money.format(plan.monthlyPrice)}/mo | {money.format(plan.yearlyPrice)}/yr | {plan.maxCourses} courses | {plan.maxStudentsTotal} students | {plan.maxStorageMb} MB
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan._count?.tenants ?? 0} tenants | {plan._count?.subscriptions ?? 0} subscription records {plan.isArchived ? "| Archived" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${plan.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </span>
                    <button type="button" onClick={() => beginEditPlan(plan)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">Edit</button>
                    {!plan.isArchived ? (
                      <button type="button" onClick={() => archivePlan(plan.id)} className="rounded-full border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700">
                        Archive
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : plansLoading ? (
            <StatusBanner>Loading plans...</StatusBanner>
          ) : (
            <EmptyState title="No plans yet" description="Create your first SaaS plan to start controlling tenant limits." />
          )}
        </div>
      </ContentCard>

      <ContentCard className="p-6">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
          <h2 className="text-lg font-semibold text-slate-950">{selectedPlanId ? "Edit Subscription Plan" : "Create Subscription Plan"}</h2>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {planStepOrder.map((step, index) => {
            const isCurrent = step === activePlanStep;
            const isPast = planStepOrder.indexOf(activePlanStep) > index;
            return (
              <span
                key={step}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isCurrent ? "bg-slate-950 text-white" : isPast ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {index + 1}. {step}
              </span>
            );
          })}
        </div>

        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${wizardProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
            Progress: {currentStepIndex + 1} / {planStepOrder.length}
          </p>
        </div>

        <form onSubmit={submitPlan} className="mt-5 space-y-5">
          {renderPlanStepFrame({
            title: "Identity",
            description: "These fields define how the plan appears to admins and instructors.",
            children: (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Plan code</span>
                  <input value={planForm.code} onChange={(event) => setPlanForm((c) => ({ ...c, code: event.target.value }))} placeholder="STUDIO" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Plan name</span>
                  <input value={planForm.name} onChange={(event) => setPlanForm((c) => ({ ...c, name: event.target.value }))} placeholder="Studio" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" required />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-slate-800">Description</span>
                  <textarea value={planForm.description} onChange={(event) => setPlanForm((c) => ({ ...c, description: event.target.value }))} placeholder="Balanced workspace for serious independent instructors." className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                </label>
              </div>
            )
          })}

          {renderPlanStepFrame({
            title: "Pricing",
            description: "Set the recurring price points for monthly and yearly billing.",
            children: (
              <div className="grid gap-4 md:grid-cols-2">
                {numericFieldMeta.filter((field) => field.key === "monthlyPrice" || field.key === "yearlyPrice").map((field) => (
                  <label key={field.key} className="block rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block text-sm font-medium text-slate-800">{field.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{field.help}</span>
                    <input type="number" min={field.min ?? 0} value={planForm[field.key]} onChange={(event) => setPlanForm((c) => ({ ...c, [field.key]: event.target.value }))} className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm" />
                  </label>
                ))}
              </div>
            )
          })}

          {renderPlanStepFrame({
            title: "Workspace Limits",
            description: "Hard numeric caps that control content growth, learners, storage, and team size.",
            children: (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {numericFieldMeta.filter((field) => field.key !== "monthlyPrice" && field.key !== "yearlyPrice").map((field) => (
                  <label key={field.key} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="block text-sm font-medium text-slate-800">{field.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{field.help}</span>
                    <input type="number" min={field.min ?? 0} value={planForm[field.key]} onChange={(event) => setPlanForm((c) => ({ ...c, [field.key]: event.target.value }))} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm" />
                  </label>
                ))}
              </div>
            )
          })}

          {featureFieldGroups.map((group) => renderPlanStepFrame({
            title: group.title as PlanStepTitle,
            description: group.description,
            children: (
              <div className="grid gap-3 md:grid-cols-2">
                {group.fields.map((field) => (
                  <label key={field.key} className={`flex items-start gap-3 rounded-2xl border p-4 transition ${planForm[field.key] ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                    <input type="checkbox" checked={planForm[field.key]} onChange={(event) => setPlanForm((c) => ({ ...c, [field.key]: event.target.checked }))} className="mt-1 h-4 w-4 rounded border-slate-300" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{field.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{field.help}</span>
                    </span>
                  </label>
                ))}
              </div>
            )
          }))}

          {activePlanStep === "Plan Status" ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Quick Summary</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Billing</p>
                    <p className="mt-2 text-lg font-semibold">{money.format(Number(planForm.monthlyPrice || 0))} / {money.format(Number(planForm.yearlyPrice || 0))}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Content</p>
                    <p className="mt-2 text-sm text-slate-100">{planForm.maxCourses} courses, {planForm.maxSectionsPerCourse} sections/course, {planForm.maxLessonsPerSection} lessons/section</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Students</p>
                    <p className="mt-2 text-sm text-slate-100">{planForm.maxStudentsTotal} total, {planForm.maxStudentsPerCourse} per course</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Key Features</p>
                    <p className="mt-2 text-sm text-slate-100">{[
                      planForm.canCreatePaidCourses ? "Paid courses" : null,
                      planForm.canUseAnalytics ? "Analytics" : null,
                      planForm.canUseAssignments ? "Assignments" : null,
                      planForm.canIssueCertificates ? "Certificates" : null
                    ].filter(Boolean).join(", ") || "Basic teaching tools"}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">{planForm.code || "PLAN"}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planForm.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{planForm.isActive ? "Active for assignment" : "Inactive"}</span>
                    </div>
                    <h3 className="mt-4 text-3xl font-semibold text-slate-950">{planForm.name || "Untitled Plan"}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{planForm.description?.trim() || "No description yet."}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Monthly</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money.format(Number(planForm.monthlyPrice || 0))}</p></div>
                      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Yearly</p><p className="mt-2 text-2xl font-semibold text-slate-950">{money.format(Number(planForm.yearlyPrice || 0))}</p></div>
                      <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.18em] text-slate-400">Storage</p><p className="mt-2 text-2xl font-semibold text-slate-950">{planForm.maxStorageMb} MB</p></div>
                    </div>
                  </div>
                  <div className="w-full max-w-sm rounded-[24px] bg-slate-950 p-5 text-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Preview</p>
                    <p className="mt-3 text-2xl font-semibold">{planForm.name || "Untitled Plan"}</p>
                    <p className="mt-2 text-sm text-slate-300">{planForm.canCreatePaidCourses ? "Built for instructors who want to sell and scale their academy." : "Best for free-course academies and lightweight teaching."}</p>
                    <div className="mt-5 space-y-3 text-sm text-slate-100">
                      <p>{planForm.maxCourses} courses included</p>
                      <p>{planForm.maxStudentsTotal} students total</p>
                      <p>{planForm.maxSectionsPerCourse} sections per course</p>
                      <p>{planForm.maxLessonsPerSection} lessons per section</p>
                      <p>{planForm.canUseQuizzes ? "Quizzes enabled" : "Quizzes disabled"}</p>
                      <p>{planForm.canUseAssignments ? "Assignments enabled" : "Assignments disabled"}</p>
                      <p>{planForm.canIssueCertificates ? "Certificates enabled" : "Certificates disabled"}</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white">{selectedPlanId ? "Update Plan" : "Create Plan"}</button>
                {selectedPlanId ? (
                  <button type="button" onClick={() => { setSelectedPlanId(null); setPlanForm(defaultPlanForm); setActivePlanStep("Identity"); }} className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700">Cancel editing</button>
                ) : null}
              </div>
            </>
          ) : null}
        </form>
      </ContentCard>
    </div>
  );
}
