import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Request } from "express";
import { createHash } from "node:crypto";

import { RedisService } from "../redis/redis.service.js";

@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getKey(request);
    const redis = this.redisService.getClient();
    const count = await redis.incr(key);

    if (count === 1) await redis.expire(key, 60);
    if (count > 120) {
      throw new HttpException("Rate limit exceeded.", HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private getKey(request: Request) {
    const auth = request.header("authorization") ?? request.ip ?? "anonymous";
    const hash = createHash("sha256").update(auth).digest("hex");
    return `rate-limit:${hash}:${Math.floor(Date.now() / 60_000)}`;
  }
}

