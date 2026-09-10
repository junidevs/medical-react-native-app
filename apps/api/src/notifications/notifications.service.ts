import { Injectable } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RegisterDeviceDto } from "./dto/register-device.dto.js";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(user: AuthenticatedUser, dto: RegisterDeviceDto) {
    const patient = await this.prisma.user.upsert({
      where: { entraObjectId: user.id },
      update: { email: user.email, name: user.name },
      create: { entraObjectId: user.id, email: user.email, name: user.name }
    });

    await this.prisma.deviceRegistration.upsert({
      where: { installationId: dto.installationId },
      update: { deviceToken: dto.deviceToken, platform: dto.platform },
      create: { ...dto, patientId: patient.id }
    });

    return {
      installationId: dto.installationId,
      tags: [`user:${user.id}`, `platform:${dto.platform}`]
    };
  }
}

