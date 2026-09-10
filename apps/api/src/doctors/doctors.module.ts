import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { DoctorsController } from "./doctors.controller.js";
import { DoctorsService } from "./doctors.service.js";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DoctorsController],
  providers: [DoctorsService]
})
export class DoctorsModule {}

