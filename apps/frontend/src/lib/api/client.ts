const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormDataBody) {
    headers.set("Content-Type", "application/json");
  } else {
    headers.delete("Content-Type");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Network request failed.";

    if (message.toLowerCase().includes("failed to fetch")) {
      throw new Error("Cannot reach the LMS server right now. Please make sure the backend is running on port 4000 and try again.");
    }

    throw new Error(message);
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
