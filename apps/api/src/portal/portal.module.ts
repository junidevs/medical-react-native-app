import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { RedisModule } from "../redis/redis.module.js";
import { PortalController } from "./portal.controller.js";
import { PortalPageController } from "./portal-page.controller.js";
import { PortalService } from "./portal.service.js";

@Module({
  imports: [AuthModule, RedisModule, PrismaModule],
  controllers: [PortalController, PortalPageController],
  providers: [PortalService]
})
export class PortalModule {}

