import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";

import { AppointmentsModule } from "./appointments/appointments.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CorrelationMiddleware } from "./common/correlation.middleware.js";
import { RedisRateLimitGuard } from "./common/redis-rate-limit.guard.js";
import { AppConfigModule } from "./config/app-config.module.js";
import { DoctorsModule } from "./doctors/doctors.module.js";
import { HealthModule } from "./health/health.module.js";
import { LoyaltyModule } from "./loyalty/loyalty.module.js";
import { MockIdentityModule } from "./mock-identity/mock-identity.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { PortalModule } from "./portal/portal.module.js";
import { RedisModule } from "./redis/redis.module.js";

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers.set-cookie",
            "req.body.email",
            "req.body.deviceToken",
            "req.body.access_token",
            "req.body.refresh_token"
          ],
          censor: "[REDACTED]"
        }
      }
    }),
    AuthModule,
    RedisModule,
    DoctorsModule,
    AppointmentsModule,
    NotificationsModule,
    PortalModule,
    LoyaltyModule,
    HealthModule,
    MockIdentityModule
  ],
  providers: [{ provide: APP_GUARD, useClass: RedisRateLimitGuard }]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes("*");
  }
}

