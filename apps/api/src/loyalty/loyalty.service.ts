import { Injectable } from "@nestjs/common";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { PrismaService } from "../prisma/prisma.service.js";

const WELCOME_BONUS = 100;
const POINTS_PER_VISIT = 50;
const SILVER_AT = 200;
const GOLD_AT = 300;

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser) {
    const patient = await this.prisma.user.upsert({
      where: { entraObjectId: user.id },
      update: { email: user.email, name: user.name },
      create: { entraObjectId: user.id, email: user.email, name: user.name }
    });

    const now = new Date();
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId: patient.id, deletedAt: null, status: { not: "CANCELLED" } },
      select: { status: true, slot: { select: { endTime: true } } }
    });

    const completedVisits = appointments.filter(
      (appointment) => appointment.status === "COMPLETED" || appointment.slot.endTime < now
    ).length;
    const upcomingVisits = appointments.length - completedVisits;
    const points = WELCOME_BONUS + completedVisits * POINTS_PER_VISIT;
    const tier = points >= GOLD_AT ? "GOLD" : points >= SILVER_AT ? "SILVER" : "BRONZE";
    const pointsToNextTier =
      tier === "GOLD" ? 0 : tier === "SILVER" ? GOLD_AT - points : SILVER_AT - points;

    return { points, completedVisits, upcomingVisits, tier, pointsToNextTier };
  }
}
