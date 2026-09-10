import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDoctors(cursor?: string, limit = 20) {
    const doctors = await this.prisma.doctor.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { name: "asc" },
      include: { specialty: true }
    });

    const page = doctors.slice(0, limit);
    const nextCursor = doctors.length > limit ? page.at(-1)?.id : undefined;

    return {
      data: page.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        specialtyId: doctor.specialtyId,
        specialtyName: doctor.specialty.name,
        clinicName: doctor.clinicName,
        rating: doctor.rating.toNumber()
      })),
      nextCursor
    };
  }

  async listSlots(doctorId: string) {
    return this.prisma.slot.findMany({
      where: {
        doctorId,
        status: "AVAILABLE",
        startTime: { gte: new Date() }
      },
      orderBy: { startTime: "asc" },
      take: 50
    });
  }
}

