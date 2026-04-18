const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const LOCAL_HOST_NAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const TRANSIENT_RETRY_DELAY_MS = 350;
const TRANSIENT_RETRY_ATTEMPTS = 2;

interface FetchOptions extends RequestInit {
  token?: string;
  retryOnNetworkFailure?: boolean;
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function resolveApiUrl() {
  if (typeof window === "undefined") {
    return DEFAULT_API_URL;
  }

  try {
    const configuredUrl = new URL(DEFAULT_API_URL);
    if (!LOCAL_HOST_NAMES.has(configuredUrl.hostname) || LOCAL_HOST_NAMES.has(window.location.hostname)) {
      return configuredUrl.toString().replace(/\/$/, "");
    }

    configuredUrl.hostname = window.location.hostname;
    configuredUrl.protocol = window.location.protocol === "https:" ? "https:" : configuredUrl.protocol;

    return configuredUrl.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_URL.replace(/\/$/, "");
  }
}

function isLikelyTransientFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  );
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  const apiUrl = resolveApiUrl();
  const method = (options.method ?? "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD" || options.retryOnNetworkFailure === true;

  if (!isFormDataBody) {
    headers.set("Content-Type", "application/json");
  } else {
    headers.delete("Content-Type");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers
      });
      break;
    } catch (error) {
      if (canRetry && attempt < TRANSIENT_RETRY_ATTEMPTS && isLikelyTransientFetchError(error)) {
        await wait(TRANSIENT_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      const message =
        error instanceof Error && error.message
          ? error.message
          : "Network request failed.";

      if (isLikelyTransientFetchError(error)) {
        throw new Error(
          "Cannot reach the LMS server right now. Please try again in a few seconds. If the issue continues, make sure the backend is running and the API URL is configured correctly."
        );
      }

      throw new Error(message);
    }
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as {
        message?: string | string[];
        error?: string;
        errors?: string[];
      };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(", ");
      } else if (payload.message) {
        message = payload.message;
      } else if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        message = payload.errors.join(", ");
      } else if (payload.error) {
        message = payload.error;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
        // Keep default status-based message when the response body is not readable.
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
