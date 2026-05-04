import { registerAs } from "@nestjs/config";

function requireProductionValue(name: string, fallback = "") {
  const value = process.env[name]?.trim() ?? "";
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`${name} is required in production.`);
  }
  return value || fallback;
}

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? "api",
  jwtSecret: requireProductionValue("JWT_SECRET", "dev-only-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  databaseUrl: requireProductionValue("DATABASE_URL"),
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379)
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    accessKey: process.env.S3_ACCESS_KEY ?? "",
    secretKey: process.env.S3_SECRET_KEY ?? "",
    bucket: process.env.S3_BUCKET ?? ""
  },
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  publicServerUrl: process.env.PUBLIC_SERVER_URL?.trim() ?? "",
  publicWebUrl: requireProductionValue("PUBLIC_WEB_URL", "http://localhost:3000"),
  smtp: {
    host: process.env.SMTP_HOST?.trim() ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    user: process.env.SMTP_USER?.trim() ?? "",
    pass: process.env.SMTP_PASS?.trim() ?? "",
    fromEmail: process.env.SMTP_FROM_EMAIL?.trim() ?? "",
    fromName: process.env.SMTP_FROM_NAME?.trim() ?? "ATHAR LMS"
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() ?? ""
  },
  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "",
    apiToken: process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "",
    r2Bucket: process.env.CLOUDFLARE_R2_BUCKET?.trim() ?? "",
    r2AccessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() ?? "",
    r2SecretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim() ?? "",
    streamSigningKey: process.env.CLOUDFLARE_STREAM_SIGNING_KEY?.trim() ?? ""
  }
}));
