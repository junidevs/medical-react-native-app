import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { PrismaModule } from "../prisma/prisma.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [PrismaModule, RedisModule, TerminusModule],
  controllers: [HealthController]
})
export class HealthModule {}

