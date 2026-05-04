import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import type { Request } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 20;
const buckets = new Map<string, Bucket>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const ip =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : request.ip || request.socket.remoteAddress || "unknown";

  return `${ip}:${request.method}:${request.path}`;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const key = getClientKey(request);
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + WINDOW_MS
      });
      return true;
    }

    existing.count += 1;

    if (existing.count > MAX_REQUESTS) {
      throw new HttpException(
        "Too many requests. Please wait a few minutes and try again.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
