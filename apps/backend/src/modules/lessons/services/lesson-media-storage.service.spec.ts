import assert from "node:assert/strict";
import test from "node:test";
import { createPrivateKey, generateKeyPairSync } from "crypto";
import type { JsonWebKey as CryptoJsonWebKey } from "crypto";
import { LessonMediaStorageService } from "./lesson-media-storage.service";

function setEnv(name: string, value: string | undefined) {
  const previous = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  return () => {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  };
}

test("getPublicLessonMediaUrl signs Cloudflare Stream viewer URLs when playback host and signing key are configured", () => {
  const service = new LessonMediaStorageService();
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = createPrivateKey(privateKey.export({ format: "pem", type: "pkcs8" })).export({
    format: "jwk"
  }) as CryptoJsonWebKey;
  const restoreSigningKey = setEnv(
    "CLOUDFLARE_STREAM_SIGNING_KEY",
    JSON.stringify({ ...jwk, kid: "stream-key-1" })
  );

  try {
    const mediaRef = `cfmedia:${Buffer.from(
      JSON.stringify({
        provider: "cloudflare-stream",
        uid: "video-uid-1",
        playbackId: "video-uid-1",
        playbackHost: "customer-example.cloudflarestream.com",
        filename: "lesson.mp4",
        contentType: "video/mp4",
        size: 1024,
        requiresSignedUrls: true
      }),
      "utf8"
    ).toString("base64url")}`;

    const url = service.getPublicLessonMediaUrl("lesson-1", mediaRef);
    assert.ok(url);
    const parsed = new URL(url!);

    assert.equal(parsed.origin, "https://customer-example.cloudflarestream.com");
    assert.match(parsed.pathname, /^\/eyJ.+\/iframe$/);
    assert.ok(!parsed.pathname.includes("/video-uid-1/iframe"));
  } finally {
    restoreSigningKey();
  }
});

test("storeMedia configures signed playback restrictions for Cloudflare Stream uploads when signing key support is enabled", async () => {
  const service = new LessonMediaStorageService();
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = createPrivateKey(privateKey.export({ format: "pem", type: "pkcs8" })).export({
    format: "jwk"
  }) as CryptoJsonWebKey;
  const restoreAccountId = setEnv("CLOUDFLARE_ACCOUNT_ID", "account-1");
  const restoreApiToken = setEnv("CLOUDFLARE_API_TOKEN", "token-1");
  const restoreSigningKey = setEnv(
    "CLOUDFLARE_STREAM_SIGNING_KEY",
    JSON.stringify({ ...jwk, kid: "stream-key-1" })
  );
  const restoreWebUrl = setEnv("PUBLIC_WEB_URL", "https://allinhere.org");
  const restoreCorsOrigins = setEnv("CORS_ORIGINS", "https://www.allinhere.org,https://allinhere.org");

  const fetchCalls: Array<{ url: string; method?: string; body?: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({
      url,
      method: init?.method,
      body: typeof init?.body === "string" ? init.body : undefined
    });

    if (url.endsWith("/stream")) {
      return new Response(
        JSON.stringify({
          success: true,
          result: {
            uid: "stream-uid-1",
            playback: {
              hls: "https://customer-example.cloudflarestream.com/stream-uid-1/manifest/video.m3u8"
            },
            readyToStream: true
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.endsWith("/stream/stream-uid-1")) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    throw new Error(`Unexpected fetch call: ${url}`);
  }) as typeof fetch;

  try {
    const storedRef = await service.storeMedia({
      buffer: Buffer.from("video-bytes"),
      mimetype: "video/mp4",
      size: 11,
      originalname: "lesson.mp4"
    });

    assert.match(storedRef, /^cfmedia:/);
    assert.equal(fetchCalls.length, 2);
    assert.equal(fetchCalls[0]?.method, "POST");
    assert.equal(fetchCalls[1]?.method, "POST");
    const restrictionBody = JSON.parse(fetchCalls[1]?.body ?? "{}") as {
      requireSignedURLs?: boolean;
      allowedOrigins?: string[];
    };
    assert.equal(restrictionBody.requireSignedURLs, true);
    assert.deepEqual(restrictionBody.allowedOrigins, ["allinhere.org", "www.allinhere.org"]);
  } finally {
    globalThis.fetch = originalFetch;
    restoreAccountId();
    restoreApiToken();
    restoreSigningKey();
    restoreWebUrl();
    restoreCorsOrigins();
  }
});
