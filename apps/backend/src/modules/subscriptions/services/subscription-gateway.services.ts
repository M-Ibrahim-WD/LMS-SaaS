import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

export type GatewayCheckoutInput = {
  paymentId: string;
  amount: number;
  currency: string;
  planName: string;
  teacherEmail: string;
  successUrl?: string;
  cancelUrl?: string;
  callbackUrl?: string;
};

export type GatewayCheckoutResult = {
  providerRef: string;
  redirectUrl: string;
  raw?: unknown;
};

function asString(value: unknown, fieldName: string) {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next) {
    throw new BadRequestException(`${fieldName} is required for this payment gateway.`);
  }
  return next;
}

function safeJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function basicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`, "utf8").toString("base64");
}

@Injectable()
export class StripeSubscriptionGatewayService {
  async createCheckout(config: unknown, input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const cfg = safeJsonObject(config);
    const secretKey = asString(cfg.secretKey, "Stripe secret key");
    const successUrl = asString(cfg.successUrl ?? input.successUrl, "Stripe success URL");
    const cancelUrl = asString(cfg.cancelUrl ?? input.cancelUrl, "Stripe cancel URL");
    const currency = asString(cfg.currency ?? input.currency, "Stripe currency").toLowerCase();

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("success_url", successUrl);
    body.set("cancel_url", cancelUrl);
    body.set("client_reference_id", input.paymentId);
    body.set("customer_email", input.teacherEmail);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", currency);
    body.set("line_items[0][price_data][unit_amount]", String(Math.round(input.amount * 100)));
    body.set("line_items[0][price_data][product_data][name]", input.planName);
    body.set("metadata[paymentId]", input.paymentId);

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });
    const payload = (await response.json().catch(() => null)) as { id?: string; url?: string; error?: { message?: string } } | null;

    if (!response.ok || !payload?.id || !payload.url) {
      throw new ServiceUnavailableException(payload?.error?.message || "Stripe checkout could not be created.");
    }

    return { providerRef: payload.id, redirectUrl: payload.url, raw: payload };
  }

  verifyWebhook(config: unknown, rawBody: string, signature: string) {
    const webhookSecret = asString(safeJsonObject(config).webhookSecret, "Stripe webhook secret");
    const timestamp = signature.match(/t=([^,]+)/)?.[1];
    const receivedSignature = signature.match(/v1=([^,]+)/)?.[1];
    if (!timestamp || !receivedSignature) {
      return false;
    }

    const expected = createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    const received = Buffer.from(receivedSignature);
    const expectedBuffer = Buffer.from(expected);
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  }
}

@Injectable()
export class PayPalSubscriptionGatewayService {
  private getBaseUrl(config: Record<string, unknown>) {
    return String(config.environment).toUpperCase() === "LIVE"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  private async getAccessToken(config: Record<string, unknown>) {
    const clientId = asString(config.clientId, "PayPal client ID");
    const clientSecret = asString(config.clientSecret, "PayPal client secret");
    const response = await fetch(`${this.getBaseUrl(config)}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ grant_type: "client_credentials" })
    });
    const payload = (await response.json().catch(() => null)) as { access_token?: string } | null;
    if (!response.ok || !payload?.access_token) {
      throw new ServiceUnavailableException("PayPal access token could not be created.");
    }
    return payload.access_token;
  }

  async createCheckout(config: unknown, input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const cfg = safeJsonObject(config);
    const accessToken = await this.getAccessToken(cfg);
    const response = await fetch(`${this.getBaseUrl(cfg)}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.paymentId,
            amount: {
              currency_code: asString(cfg.currency ?? input.currency, "PayPal currency").toUpperCase(),
              value: input.amount.toFixed(2)
            },
            description: input.planName
          }
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "PAY_NOW",
              return_url: asString(cfg.returnUrl ?? input.successUrl, "PayPal return URL"),
              cancel_url: asString(cfg.cancelUrl ?? input.cancelUrl, "PayPal cancel URL")
            }
          }
        }
      })
    });
    const payload = (await response.json().catch(() => null)) as { id?: string; links?: Array<{ rel: string; href: string }> } | null;
    const approveUrl = payload?.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
    if (!response.ok || !payload?.id || !approveUrl) {
      throw new ServiceUnavailableException("PayPal checkout could not be created.");
    }

    return { providerRef: payload.id, redirectUrl: approveUrl, raw: payload };
  }
}

@Injectable()
export class PayMobSubscriptionGatewayService {
  async createCheckout(config: unknown, input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const cfg = safeJsonObject(config);
    const secretKey = asString(cfg.secretKey ?? cfg.apiKey, "PayMob secret key");
    const publicKey = asString(cfg.publicKey, "PayMob public key");
    const integrationId = Number(asString(cfg.integrationId, "PayMob integration ID"));
    const response = await fetch("https://accept.paymob.com/v1/intention/", {
      method: "POST",
      headers: {
        Authorization: `Token ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(input.amount * 100),
        currency: asString(cfg.currency ?? input.currency, "PayMob currency").toUpperCase(),
        payment_methods: [integrationId],
        billing_data: {
          email: input.teacherEmail,
          first_name: "ATHAR",
          last_name: "Teacher"
        },
        extras: { paymentId: input.paymentId },
        notification_url: asString(cfg.callbackUrl ?? input.callbackUrl, "PayMob callback URL"),
        redirection_url: asString(cfg.redirectUrl ?? input.successUrl, "PayMob redirection URL")
      })
    });
    const payload = (await response.json().catch(() => null)) as { id?: string; client_secret?: string } | null;
    if (!response.ok || !payload?.id || !payload.client_secret) {
      throw new ServiceUnavailableException("PayMob checkout could not be created.");
    }

    return {
      providerRef: String(payload.id),
      redirectUrl: `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(payload.client_secret)}`,
      raw: payload
    };
  }
}

@Injectable()
export class PayTabsSubscriptionGatewayService {
  async createCheckout(config: unknown, input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const cfg = safeJsonObject(config);
    const endpointUrl = asString(cfg.endpointUrl, "PayTabs endpoint URL").replace(/\/$/, "");
    const response = await fetch(`${endpointUrl}/payment/request`, {
      method: "POST",
      headers: {
        Authorization: asString(cfg.serverKey, "PayTabs server key"),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile_id: Number(asString(cfg.profileId, "PayTabs profile ID")),
        tran_type: "sale",
        tran_class: "ecom",
        cart_id: input.paymentId,
        cart_currency: asString(cfg.currency ?? input.currency, "PayTabs currency").toUpperCase(),
        cart_amount: input.amount,
        cart_description: input.planName,
        return: asString(cfg.returnUrl ?? input.successUrl, "PayTabs return URL"),
        callback: asString(cfg.callbackUrl ?? input.callbackUrl, "PayTabs callback URL")
      })
    });
    const payload = (await response.json().catch(() => null)) as { tran_ref?: string; redirect_url?: string } | null;
    if (!response.ok || !payload?.tran_ref || !payload.redirect_url) {
      throw new ServiceUnavailableException("PayTabs checkout could not be created.");
    }

    return { providerRef: payload.tran_ref, redirectUrl: payload.redirect_url, raw: payload };
  }
}

@Injectable()
export class PayoneerSubscriptionGatewayService {
  async createCheckout(config: unknown, input: GatewayCheckoutInput): Promise<GatewayCheckoutResult> {
    const cfg = safeJsonObject(config);
    const apiBaseUrl = asString(cfg.apiBaseUrl, "Payoneer API base URL").replace(/\/$/, "");
    const response = await fetch(`${apiBaseUrl}/api/lists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${asString(cfg.apiToken, "Payoneer API token")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        merchantId: asString(cfg.merchantId, "Payoneer merchant ID"),
        programId: asString(cfg.programId, "Payoneer program ID"),
        reference: input.paymentId,
        amount: input.amount,
        currency: asString(cfg.currency ?? input.currency, "Payoneer currency").toUpperCase(),
        returnUrl: asString(cfg.returnUrl ?? input.successUrl, "Payoneer return URL"),
        callbackUrl: asString(cfg.callbackUrl ?? input.callbackUrl, "Payoneer callback URL"),
        customer: { email: input.teacherEmail }
      })
    });
    const payload = (await response.json().catch(() => null)) as { listId?: string; redirectUrl?: string; links?: Array<{ href?: string }> } | null;
    const redirectUrl = payload?.redirectUrl ?? payload?.links?.find((link) => link.href)?.href;
    if (!response.ok || !redirectUrl) {
      throw new ServiceUnavailableException("Payoneer checkout could not be created.");
    }

    return { providerRef: payload?.listId ?? input.paymentId, redirectUrl, raw: payload };
  }
}
