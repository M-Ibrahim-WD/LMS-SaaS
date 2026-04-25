import { registerAs } from "@nestjs/config";

export const appConfig = registerAs("app", () => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? "api",
  jwtSecret: process.env.JWT_SECRET ?? "super-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  databaseUrl: process.env.DATABASE_URL ?? "",
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
  publicWebUrl: process.env.PUBLIC_WEB_URL?.trim() ?? "http://localhost:3000",
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
  }
}));
