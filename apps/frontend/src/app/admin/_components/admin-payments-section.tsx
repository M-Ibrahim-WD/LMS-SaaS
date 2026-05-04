"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import { apiFetch, getResolvedApiUrl } from "../../../lib/api/client";
import type { AdminPaymentSummary } from "./admin-control-center.shared";
import { money } from "./admin-control-center.shared";

type ManualPlatformMethodType =
  | "INSTAPAY"
  | "VODAFONE_CASH"
  | "ORANGE_CASH"
  | "ETISALAT_CASH"
  | "WE_CASH"
  | "FAWRY"
  | "BANK"
  | "CUSTOM";

type GatewayType = "STRIPE" | "PAYPAL" | "PAYMOB" | "PAYTABS" | "PAYONEER";
type PlatformMethodType = ManualPlatformMethodType | GatewayType | "OTHER";

type PlatformPaymentMethod = {
  id: string;
  type: PlatformMethodType;
  category: "MANUAL" | "ONLINE";
  label: string;
  details: string;
  isActive: boolean;
  isConfigured: boolean;
  isSelectable: boolean;
  configKeys?: string[];
};

type AdminSubscriptionPaymentSummary = {
  id: string;
  status: "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "PAID" | "FAILED";
  provider: "MANUAL" | "STRIPE" | "PAYPAL" | "PAYMOB" | "PAYTABS" | "OTHER";
  amount: number;
  billingPeriod: "MONTHLY" | "YEARLY";
  proof?: string | null;
  createdAt: string;
  tenant: { id: string; name: string };
  user: { id: string; fullName: string; email: string };
  plan: { id: string; name: string; code: string };
  platformPaymentMethod?: PlatformPaymentMethod | null;
};

interface AdminPaymentsSectionProps {
  accessToken: string;
  payments?: AdminPaymentSummary[];
  isLoading: boolean;
  subscriptionPayments?: AdminSubscriptionPaymentSummary[];
  subscriptionPaymentsLoading?: boolean;
  onApproveSubscriptionPayment?: (id: string) => void;
  onRejectSubscriptionPayment?: (id: string) => void;
  subscriptionPaymentActionPending?: boolean;
}

const manualOptions: Array<{ value: ManualPlatformMethodType; label: string; placeholder: string }> = [
  { value: "VODAFONE_CASH", label: "Vodafone Cash", placeholder: "010xxxxxxxx" },
  { value: "ORANGE_CASH", label: "Orange Cash", placeholder: "012xxxxxxxx" },
  { value: "ETISALAT_CASH", label: "Etisalat Cash", placeholder: "011xxxxxxxx" },
  { value: "WE_CASH", label: "WE Cash", placeholder: "015xxxxxxxx" },
  { value: "INSTAPAY", label: "Instapay", placeholder: "Phone number or username@instapay" },
  { value: "FAWRY", label: "Fawry", placeholder: "Reference or payment instructions" },
  { value: "BANK", label: "Bank Transfer", placeholder: "Bank: ...\nName: ...\nAccount: ... or IBAN: ..." },
  { value: "CUSTOM", label: "Custom Manual Method", placeholder: "Payment instructions" }
];

const gatewayLabels: Record<GatewayType, string> = {
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
  PAYMOB: "PayMob",
  PAYTABS: "PayTabs",
  PAYONEER: "Payoneer"
};

const initialGatewayFields: Record<GatewayType, Record<string, string>> = {
  STRIPE: { label: "Stripe", secretKey: "", webhookSecret: "", currency: "USD", successUrl: "", cancelUrl: "" },
  PAYPAL: {
    label: "PayPal",
    clientId: "",
    clientSecret: "",
    environment: "SANDBOX",
    currency: "USD",
    returnUrl: "",
    cancelUrl: ""
  },
  PAYMOB: {
    label: "PayMob",
    secretKey: "",
    publicKey: "",
    integrationId: "",
    iframeId: "",
    hmacSecret: "",
    currency: "EGP",
    callbackUrl: "",
    redirectUrl: ""
  },
  PAYTABS: {
    label: "PayTabs",
    profileId: "",
    serverKey: "",
    endpointUrl: "https://secure.paytabs.com",
    currency: "USD",
    returnUrl: "",
    callbackUrl: ""
  },
  PAYONEER: {
    label: "Payoneer",
    apiBaseUrl: "",
    merchantId: "",
    programId: "",
    apiToken: "",
    currency: "USD",
    returnUrl: "",
    callbackUrl: ""
  }
};

const gatewayFieldLabels: Record<string, string> = {
  label: "Display name",
  secretKey: "Secret key",
  publicKey: "Public key",
  apiKey: "API key",
  integrationId: "Integration ID",
  iframeId: "Iframe ID",
  hmacSecret: "HMAC secret",
  currency: "Currency",
  callbackUrl: "Callback / webhook URL",
  redirectUrl: "Redirect URL",
  clientId: "Client ID",
  clientSecret: "Client secret",
  environment: "Environment",
  returnUrl: "Return URL",
  cancelUrl: "Cancel URL",
  webhookSecret: "Webhook secret",
  profileId: "Profile ID",
  serverKey: "Server key",
  endpointUrl: "Endpoint URL",
  apiBaseUrl: "API base URL",
  merchantId: "Merchant ID",
  programId: "Program ID",
  apiToken: "API token"
};

export function AdminPaymentsSection({
  accessToken,
  payments,
  isLoading,
  subscriptionPayments,
  subscriptionPaymentsLoading,
  onApproveSubscriptionPayment,
  onRejectSubscriptionPayment,
  subscriptionPaymentActionPending
}: AdminPaymentsSectionProps) {
  const queryClient = useQueryClient();
  const [manualType, setManualType] = useState<ManualPlatformMethodType>("VODAFONE_CASH");
  const [manualLabel, setManualLabel] = useState("Vodafone Cash");
  const [manualAccount, setManualAccount] = useState("");
  const [manualBankName, setManualBankName] = useState("");
  const [manualAccountHolder, setManualAccountHolder] = useState("");
  const [manualBankAccount, setManualBankAccount] = useState("");
  const [manualCustomDetails, setManualCustomDetails] = useState("");
  const [manualInstructions, setManualInstructions] = useState("");
  const [gatewayType, setGatewayType] = useState<GatewayType>("STRIPE");
  const [gatewayFields, setGatewayFields] = useState<Record<GatewayType, Record<string, string>>>(initialGatewayFields);
  const [methodError, setMethodError] = useState<string | null>(null);

  const platformMethodsQuery = useQuery({
    queryKey: ["admin", "platform-payment-methods"],
    queryFn: () => apiFetch<PlatformPaymentMethod[]>("/subscription/payment-methods/admin", { token: accessToken }),
    enabled: Boolean(accessToken)
  });

  const refreshPlatformMethods = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "platform-payment-methods"] });
  };

  const createManualMutation = useMutation({
    mutationFn: () =>
      apiFetch("/subscription/payment-methods/admin/manual", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          type: manualType,
          label: manualLabel,
          details: buildManualDetails(),
          instructions: manualInstructions,
          isActive: true
        })
      }),
    onSuccess: async () => {
      setMethodError(null);
      setManualAccount("");
      setManualBankName("");
      setManualAccountHolder("");
      setManualBankAccount("");
      setManualCustomDetails("");
      setManualInstructions("");
      await refreshPlatformMethods();
    },
    onError: (error) => setMethodError(error instanceof Error ? error.message : "Failed to create manual method.")
  });

  const createGatewayMutation = useMutation({
    mutationFn: () => {
      const fields = gatewayFields[gatewayType];
      return apiFetch(`/subscription/payment-methods/admin/${gatewayType.toLowerCase()}`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ ...fields, isActive: true })
      });
    },
    onSuccess: async () => {
      setMethodError(null);
      await refreshPlatformMethods();
    },
    onError: (error) => setMethodError(error instanceof Error ? error.message : "Failed to configure gateway.")
  });

  const updateMethodMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiFetch(`/subscription/payment-methods/admin/${id}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify(payload)
      }),
    onSuccess: async () => {
      setMethodError(null);
      await refreshPlatformMethods();
    },
    onError: (error) => setMethodError(error instanceof Error ? error.message : "Failed to update payment method.")
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/subscription/payment-methods/admin/${id}`, {
        method: "DELETE",
        token: accessToken
      }),
    onSuccess: refreshPlatformMethods,
    onError: (error) => setMethodError(error instanceof Error ? error.message : "Failed to delete payment method.")
  });

  const updateGatewayField = (key: string, value: string) => {
    setGatewayFields((current) => ({
      ...current,
      [gatewayType]: {
        ...current[gatewayType],
        [key]: value
      }
    }));
  };

  const openSubscriptionProof = async (paymentId: string) => {
    try {
      const response = await fetch(`${getResolvedApiUrl()}/subscription/payment-requests/${paymentId}/proof`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error("Payment proof could not be opened.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      setMethodError(null);
    } catch (error) {
      setMethodError(error instanceof Error ? error.message : "Payment proof could not be opened.");
    }
  };

  const buildManualDetails = () => {
    if (manualType === "BANK") {
      return `Bank: ${manualBankName}\nName: ${manualAccountHolder}\nAccount: ${manualBankAccount}`;
    }
    if (manualType === "CUSTOM" || manualType === "FAWRY") {
      return manualCustomDetails;
    }
    return manualAccount;
  };

  const renderManualDetailsFields = () => {
    if (manualType === "BANK") {
      return (
        <>
          <label className="block">
            <span className="field-label">Bank name</span>
            <input className="field-input" value={manualBankName} onChange={(event) => setManualBankName(event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Account holder</span>
            <input className="field-input" value={manualAccountHolder} onChange={(event) => setManualAccountHolder(event.target.value)} />
          </label>
          <label className="block md:col-span-2">
            <span className="field-label">Account number or IBAN</span>
            <input className="field-input" value={manualBankAccount} onChange={(event) => setManualBankAccount(event.target.value)} />
          </label>
        </>
      );
    }

    if (manualType === "CUSTOM" || manualType === "FAWRY") {
      return (
        <label className="block md:col-span-2">
          <span className="field-label">{manualType === "FAWRY" ? "Fawry details" : "Payment details"}</span>
          <textarea
            className="field-textarea"
            value={manualCustomDetails}
            onChange={(event) => setManualCustomDetails(event.target.value)}
            placeholder={manualOptions.find((item) => item.value === manualType)?.placeholder}
          />
        </label>
      );
    }

    return (
      <label className="block md:col-span-2">
        <span className="field-label">{manualType === "INSTAPAY" ? "Instapay account" : "Wallet phone number"}</span>
        <input
          className="field-input"
          value={manualAccount}
          onChange={(event) => setManualAccount(event.target.value)}
          placeholder={manualOptions.find((item) => item.value === manualType)?.placeholder}
        />
      </label>
    );
  };

  const renderGatewayFields = () => {
    const fields = gatewayFields[gatewayType];
    return Object.keys(fields).map((key) => {
      if (key === "environment") {
        return (
          <label key={key} className="block">
            <span className="field-label">Environment</span>
            <select className="field-select" value={fields[key]} onChange={(event) => updateGatewayField(key, event.target.value)}>
              <option value="SANDBOX">Sandbox</option>
              <option value="LIVE">Live</option>
            </select>
          </label>
        );
      }

      return (
        <label key={key} className="block">
          <span className="field-label">{gatewayFieldLabels[key] ?? key.replace(/([A-Z])/g, " $1")}</span>
          <input
            className="field-input"
            type={
              key.toLowerCase().includes("secret") ||
              key.toLowerCase().includes("token") ||
              key === "apiKey"
                ? "password"
                : "text"
            }
            value={fields[key]}
            onChange={(event) => updateGatewayField(key, event.target.value)}
          />
        </label>
      );
    });
  };

  const manualMethods = platformMethodsQuery.data?.filter((method) => method.category === "MANUAL") ?? [];
  const onlineMethods = platformMethodsQuery.data?.filter((method) => method.category === "ONLINE") ?? [];

  return (
    <div className="space-y-6">
      <ContentCard className="p-6">
        <p className="section-kicker">Platform methods</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Manual payment methods</h3>
        <p className="mt-2 text-sm text-slate-600">
          These work like instructor manual payment methods, but the money goes to the platform.
        </p>

        <form
          className="mt-5 grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            createManualMutation.mutate();
          }}
        >
          <label className="block">
            <span className="field-label">Method type</span>
            <select
              className="field-select"
              value={manualType}
              onChange={(event) => {
                const nextType = event.target.value as ManualPlatformMethodType;
                setManualType(nextType);
                setManualLabel(manualOptions.find((item) => item.value === nextType)?.label ?? nextType);
              }}
            >
              {manualOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Label</span>
            <input className="field-input" value={manualLabel} onChange={(event) => setManualLabel(event.target.value)} />
          </label>
          {renderManualDetailsFields()}
          <label className="block md:col-span-2">
            <span className="field-label">Teacher instructions</span>
            <textarea
              className="field-textarea"
              value={manualInstructions}
              onChange={(event) => setManualInstructions(event.target.value)}
              placeholder="Explain exactly what the teacher should write in the proof note or transfer reference."
            />
          </label>
          <button
            type="submit"
            disabled={createManualMutation.isPending}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createManualMutation.isPending ? "Saving..." : "Add manual method"}
          </button>
        </form>
      </ContentCard>

      <ContentCard className="p-6">
        <p className="section-kicker">Online gateways</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Gateway-specific setup</h3>
        <p className="mt-2 text-sm text-slate-600">
          Each gateway has its own fields and checkout flow. No generic JSON setup is used.
        </p>

        <form
          className="mt-5 space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            createGatewayMutation.mutate();
          }}
        >
          <label className="block">
            <span className="field-label">Gateway</span>
            <select className="field-select" value={gatewayType} onChange={(event) => setGatewayType(event.target.value as GatewayType)}>
              {Object.entries(gatewayLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">{renderGatewayFields()}</div>
          <button
            type="submit"
            disabled={createGatewayMutation.isPending}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createGatewayMutation.isPending ? "Saving..." : `Configure ${gatewayLabels[gatewayType]}`}
          </button>
        </form>
      </ContentCard>

      <ContentCard className="p-6">
        <p className="section-kicker">Configured methods</p>
        {methodError ? <StatusBanner variant="error">{methodError}</StatusBanner> : null}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {[...manualMethods, ...onlineMethods].length ? (
            [...manualMethods, ...onlineMethods].map((method) => (
              <div key={method.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{method.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {method.type} | {method.category.toLowerCase()}
                    </p>
                    {method.details ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{method.details}</p> : null}
                    {method.category === "ONLINE" ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Saved fields: {method.configKeys?.length ? method.configKeys.join(", ") : "not configured"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip tone={method.isActive ? "success" : "default"}>{method.isActive ? "Active" : "Inactive"}</StatusChip>
                    <StatusChip tone={method.isConfigured ? "success" : "warning"}>{method.isConfigured ? "Ready" : "Not connected"}</StatusChip>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={updateMethodMutation.isPending}
                    onClick={() => updateMethodMutation.mutate({ id: method.id, payload: { isActive: !method.isActive } })}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {method.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    disabled={deleteMethodMutation.isPending}
                    onClick={() => deleteMethodMutation.mutate(method.id)}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : platformMethodsQuery.isLoading ? (
            <StatusBanner>Loading platform payment methods...</StatusBanner>
          ) : (
            <EmptyState title="No platform payment methods" description="Add manual methods and gateway setups here." />
          )}
        </div>
      </ContentCard>

      <ContentCard className="p-6">
        <div>
          <p className="section-kicker">Subscriptions</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Platform subscription payments</h3>
        </div>
        <div className="mt-5 space-y-4">
          {subscriptionPayments?.length ? (
            subscriptionPayments.map((payment) => (
              <div key={payment.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-950">{payment.plan.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.user.fullName} | {payment.tenant.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {payment.platformPaymentMethod?.label ?? payment.provider} | {payment.billingPeriod.toLowerCase()} | {money.format(payment.amount)}
                    </p>
                    {payment.proof ? (
                      <button
                        type="button"
                        onClick={() => openSubscriptionProof(payment.id)}
                        className="mt-2 text-sm font-semibold text-sky-700 underline decoration-sky-200 underline-offset-4"
                      >
                        View uploaded proof
                      </button>
                    ) : null}
                  </div>
                  <StatusChip tone={payment.status === "PAID" ? "success" : "warning"}>{payment.status}</StatusChip>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={subscriptionPaymentActionPending}
                    onClick={() => onApproveSubscriptionPayment?.(payment.id)}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={subscriptionPaymentActionPending}
                    onClick={() => onRejectSubscriptionPayment?.(payment.id)}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : subscriptionPaymentsLoading ? (
            <StatusBanner>Loading subscription payments...</StatusBanner>
          ) : (
            <EmptyState title="No subscription payments pending" description="Manual subscription payments will appear here for review." />
          )}
        </div>
      </ContentCard>

      <ContentCard className="p-6">
        <div>
          <p className="section-kicker">Course payments</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Course payment review queue</h3>
        </div>
        <div className="mt-5 space-y-4">
          {payments?.length ? (
            payments.map((payment) => (
              <div key={payment.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-950">{payment.course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.user.fullName} | {payment.tenant.name}
                    </p>
                  </div>
                  <StatusChip tone={payment.status === "APPROVED" ? "success" : "warning"}>{payment.status}</StatusChip>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {payment.method.label} | {money.format(payment.amount)}
                </p>
              </div>
            ))
          ) : isLoading ? (
            <StatusBanner>Loading payments...</StatusBanner>
          ) : (
            <EmptyState title="No course payments yet" description="Course payment review entries will appear here when transactions begin." />
          )}
        </div>
      </ContentCard>
    </div>
  );
}
