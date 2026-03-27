export type PaymentMethodType =
  | "INSTAPAY"
  | "VODAFONE_CASH"
  | "ORANGE_CASH"
  | "ETISALAT_CASH"
  | "WE_CASH"
  | "FAWRY"
  | "BANK"
  | "CUSTOM"
  | "MADA"
  | "KNET"
  | "OMANNET"
  | "APPLE_PAY"
  | "STC_PAY"
  | "GOOGLE_PAY";

export type PaymentMethodCategory = "MANUAL" | "ONLINE";

export const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethodType;
  label: string;
  category: PaymentMethodCategory;
  placeholder: string;
}> = [
  { value: "INSTAPAY", label: "Instapay", category: "MANUAL", placeholder: "Enter username or phone" },
  {
    value: "VODAFONE_CASH",
    label: "Vodafone Cash",
    category: "MANUAL",
    placeholder: "Enter Vodafone number"
  },
  { value: "ORANGE_CASH", label: "Orange Cash", category: "MANUAL", placeholder: "Enter Orange number" },
  {
    value: "ETISALAT_CASH",
    label: "Etisalat Cash",
    category: "MANUAL",
    placeholder: "Enter Etisalat number"
  },
  { value: "WE_CASH", label: "WE Cash", category: "MANUAL", placeholder: "Enter WE Cash number" },
  { value: "FAWRY", label: "Fawry", category: "MANUAL", placeholder: "Enter Fawry code/reference" },
  {
    value: "BANK",
    label: "Bank Transfer",
    category: "MANUAL",
    placeholder: "Enter bank info (IBAN, name...)"
  },
  { value: "CUSTOM", label: "Custom", category: "MANUAL", placeholder: "Enter custom payment instructions" },
  { value: "MADA", label: "MADA (Future)", category: "ONLINE", placeholder: "Not available now" },
  { value: "KNET", label: "KNET (Future)", category: "ONLINE", placeholder: "Not available now" },
  { value: "OMANNET", label: "OMANNET (Future)", category: "ONLINE", placeholder: "Not available now" },
  { value: "APPLE_PAY", label: "Apple Pay (Future)", category: "ONLINE", placeholder: "Not available now" },
  { value: "STC_PAY", label: "STC Pay (Future)", category: "ONLINE", placeholder: "Not available now" },
  { value: "GOOGLE_PAY", label: "Google Pay (Future)", category: "ONLINE", placeholder: "Not available now" }
];

export function placeholderForPaymentType(type: PaymentMethodType) {
  return PAYMENT_METHOD_OPTIONS.find((item) => item.value === type)?.placeholder ?? "Enter details";
}

export function validatePaymentMethodDetails(type: PaymentMethodType, detailsInput: string) {
  const details = detailsInput.trim();

  if (type === "INSTAPAY") {
    const isInstapayPhone = /^01[012]\d{8}$/.test(details);
    const isInstapayUsername = /^[a-z0-9._-]+@instapay$/i.test(details);

    if (!isInstapayPhone && !isInstapayUsername) {
      return "Instapay must be a phone number starting with 010, 011, or 012, or a username ending with @instapay.";
    }
  }

  const walletRules: Partial<Record<PaymentMethodType, { prefix: string; label: string }>> = {
    VODAFONE_CASH: { prefix: "010", label: "Vodafone Cash" },
    ORANGE_CASH: { prefix: "012", label: "Orange Cash" },
    ETISALAT_CASH: { prefix: "011", label: "Etisalat Cash" }
  };

  if (type === "WE_CASH") {
    if (!/^015\d{8}$/.test(details)) {
      return "Invalid WE Cash number";
    }
  }

  const walletRule = walletRules[type];
  if (walletRule) {
    if (!/^\d+$/.test(details)) {
      return `${walletRule.label} number must contain digits only.`;
    }

    if (!details.startsWith(walletRule.prefix)) {
      return `${walletRule.label} number must start with ${walletRule.prefix}.`;
    }

    if (details.length < 11 || details.length > 12) {
      return `${walletRule.label} number must be 11 to 12 digits long.`;
    }
  }

  return null;
}
