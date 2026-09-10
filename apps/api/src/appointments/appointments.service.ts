import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { Prisma } from "../../generated/prisma/client.js";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { ApiException, slotAlreadyBookedException } from "../common/api-exception.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { BookAppointmentDto } from "./dto/book-appointment.dto.js";

@Injectable()
export class AppointmentsService {
  private readonly checkInTtlSeconds = 15 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  async listForUser(user: AuthenticatedUser, cursor?: string, limit = 20) {
    const patient = await this.ensurePatient(user);
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId: patient.id, deletedAt: null },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: this.includeAppointment()
    });

    const page = appointments.slice(0, limit);
    return { data: page.map(this.mapAppointment), nextCursor: page.at(-1)?.id };
  }

  async getForUser(user: AuthenticatedUser, appointmentId: string) {
    const patient = await this.ensurePatient(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, patientId: patient.id, deletedAt: null },
      include: this.includeAppointment()
    });

    if (!appointment) throw new NotFoundException("Appointment not found.");
    return this.mapAppointment(appointment);
  }

  async book(user: AuthenticatedUser, dto: BookAppointmentDto) {
    const patient = await this.ensurePatient(user);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Slot" WHERE id = ${dto.slotId} FOR UPDATE`;
        const slot = await tx.slot.findUnique({ where: { id: dto.slotId } });
        if (!slot || slot.status !== "AVAILABLE") throw slotAlreadyBookedException();

        await tx.slot.update({
          where: { id: dto.slotId },
          data: { status: "BOOKED" }
        });

        const appointment = await tx.appointment.create({
          data: { patientId: patient.id, slotId: dto.slotId, reason: dto.reason },
          include: this.includeAppointment()
        });

        await tx.auditLog.create({
          data: {
            actorUserId: patient.id,
            action: "APPOINTMENT_CREATED",
            entityType: "Appointment",
            entityId: appointment.id,
            metadata: { slotId: dto.slotId }
          }
        });

        return this.mapAppointment(appointment);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async cancel(user: AuthenticatedUser, appointmentId: string) {
    const patient = await this.ensurePatient(user);
    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: { id: appointmentId, patientId: patient.id, deletedAt: null },
        include: this.includeAppointment()
      });

      if (!appointment) throw new NotFoundException("Appointment not found.");
      if (appointment.status === "CANCELLED") return this.mapAppointment(appointment);
      if (appointment.slot.startTime < new Date()) {
        throw new ApiException({
          code: "BAD_REQUEST",
          message: "Nie można anulować wizyty, która już się odbyła."
        });
      }

      await tx.slot.update({
        where: { id: appointment.slotId },
        data: { status: "AVAILABLE" }
      });
      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: "CANCELLED" },
        include: this.includeAppointment()
      });

      await tx.auditLog.create({
        data: {
          actorUserId: patient.id,
          action: "APPOINTMENT_CANCELLED",
          entityType: "Appointment",
          entityId: appointment.id,
          metadata: { slotId: appointment.slotId }
        }
      });

      return this.mapAppointment(updated);
    });
  }

  async createCheckInQr(user: AuthenticatedUser, appointmentId: string) {
    const patient = await this.ensurePatient(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, patientId: patient.id, deletedAt: null },
      include: this.includeAppointment()
    });

    if (!appointment) throw new NotFoundException("Appointment not found.");
    if (appointment.status !== "SCHEDULED") {
      throw new ApiException({ code: "BAD_REQUEST", message: "Check-in is available only for scheduled appointments." });
    }

    const expiresAt = new Date(Date.now() + this.checkInTtlSeconds * 1000).toISOString();
    const code = `MC-${randomUUID().slice(0, 8).toUpperCase()}`;
    const payload = {
      type: "medconnect.check-in",
      code,
      appointmentId: appointment.id,
      patientId: patient.id,
      doctor: appointment.slot.doctor.name,
      startTime: appointment.slot.startTime.toISOString(),
      expiresAt
    };

    await this.redisService
      .getClient()
      .set(`appointment-check-in:${code}`, JSON.stringify(payload), "EX", this.checkInTtlSeconds);

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
      width: 320,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" }
    });

    return { code, qrDataUrl, expiresAt };
  }

  private ensurePatient(user: AuthenticatedUser) {
    return this.prisma.user.upsert({
      where: { entraObjectId: user.id },
      update: { email: user.email, name: user.name },
      create: { entraObjectId: user.id, email: user.email, name: user.name }
    });
  }

  private includeAppointment() {
    return { slot: { include: { doctor: { include: { specialty: true } } } } };
  }

  private mapAppointment(appointment: AppointmentWithRelations) {
    const doctor = appointment.slot.doctor;
    return {
      id: appointment.id,
      status: appointment.status,
      reason: appointment.reason,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialtyId: doctor.specialtyId,
        specialtyName: doctor.specialty.name,
        clinicName: doctor.clinicName,
        rating: doctor.rating.toNumber()
      },
      slot: {
        id: appointment.slot.id,
        doctorId: appointment.slot.doctorId,
        startTime: appointment.slot.startTime.toISOString(),
        endTime: appointment.slot.endTime.toISOString(),
        status: appointment.slot.status
      }
    };
  }
}

interface AppointmentWithRelations {
  id: string;
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED";
  reason: string;
  createdAt: Date;
  updatedAt: Date;
  slot: {
    id: string;
    doctorId: string;
    startTime: Date;
    endTime: Date;
    status: "AVAILABLE" | "BOOKED";
    doctor: {
      id: string;
      name: string;
      specialtyId: string;
      clinicName: string;
      rating: Prisma.Decimal;
      specialty: { name: string };
    };
  };
}

