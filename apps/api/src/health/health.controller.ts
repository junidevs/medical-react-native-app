import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";

import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  @Get()
  liveness() {
    return { status: "ok" };
  }

  @Get("db")
  @HealthCheck()
  readiness() {
    return this.health.check([
      async () => {
        await this.prisma.$queryRaw`SELECT 1`;
        return { postgres: { status: "up" } };
      },
      async () => {
        await this.redisService.getClient().ping();
        return { redis: { status: "up" } };
      }
    ]);
  }
}

