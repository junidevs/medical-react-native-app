import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

import { ApiException } from "../common/api-exception.js";
import { RedisService } from "../redis/redis.service.js";

interface StoredResponse<TData> {
  requestHash: string;
  payload: TData;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly redisService: RedisService) {}

  async run<TData>(
    key: string,
    requestBody: unknown,
    handler: () => Promise<TData>
  ) {
    const redis = this.redisService.getClient();
    const cacheKey = `idempotency:${key}`;
    const requestHash = this.hash(requestBody);
    const cached = await redis.get(cacheKey);

    if (cached) return this.parseCached<TData>(cached, requestHash);

    const payload = await handler();
    await redis.set(
      cacheKey,
      JSON.stringify({ requestHash, payload }),
      "EX",
      60 * 60 * 24
    );

    return payload;
  }

  private parseCached<TData>(value: string, requestHash: string) {
    const parsed = JSON.parse(value) as StoredResponse<TData>;
    if (parsed.requestHash !== requestHash) {
      throw new ApiException({
        code: "IDEMPOTENCY_CONFLICT",
        message: "Idempotency-Key został użyty z innym payloadem."
      });
    }

    return parsed.payload;
  }

  private hash(input: unknown) {
    return createHash("sha256").update(JSON.stringify(input)).digest("hex");
  }
}

