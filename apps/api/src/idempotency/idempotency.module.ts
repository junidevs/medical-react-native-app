import { Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module.js";
import { IdempotencyService } from "./idempotency.service.js";

@Module({
  imports: [RedisModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService]
})
export class IdempotencyModule {}

