import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";

import { AuthenticatedUser } from "../auth/authenticated-user.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";

export interface PortalTicketPayload {
  userId: string;
  name: string;
  email: string;
}

export interface PairingBrowser {
  userAgent: string;
  ip: string;
}

export type PairingStatus = "pending" | "approved" | "denied";

export interface PairingRecord {
  status: PairingStatus;
  browser: PairingBrowser;
  browserSecret: string;
  createdAt: string;
  approvedBy?: { name: string; email: string };
  ticket?: string;
}

export interface PortalData {
  upcoming: Array<{
    doctor: string;
    specialty: string;
    clinic: string;
    startTime: string;
    reason: string;
  }>;
  upcomingCount: number;
  completedVisits: number;
  points: number;
  tier: "BRONZE" | "SILVER" | "GOLD";
}

const WELCOME_BONUS = 100;
const POINTS_PER_VISIT = 50;
const SILVER_AT = 200;
const GOLD_AT = 300;

@Injectable()
export class PortalService {
  private readonly ticketTtlSeconds = 300;
  private readonly pairingTtlSeconds = 300;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async createSession(user: AuthenticatedUser, baseUrl: string) {
    const ticket = await this.mintTicket(user);
    return {
      portalUrl: `${baseUrl}/portal/page`,
      ticket,
      expiresAt: new Date(Date.now() + this.ticketTtlSeconds * 1000).toISOString()
    };
  }

  async readTicket(ticket: string): Promise<PortalTicketPayload | null> {
    const raw = await this.consumeRedisKey(`portal-ticket:${ticket}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PortalTicketPayload;
    } catch {
      return null;
    }
  }

  async createPairing(browser: PairingBrowser) {
    this.assertPortalPairingEnabled();
    const pairId = randomUUID();
    const browserSecret = randomUUID();
    const record: PairingRecord = {
      status: "pending",
      browser,
      browserSecret,
      createdAt: new Date().toISOString()
    };
    await this.redisService
      .getClient()
      .set(`portal-pair:${pairId}`, JSON.stringify(record), "EX", this.pairingTtlSeconds);
    return { pairId, browserSecret, maxAgeSeconds: this.pairingTtlSeconds };
  }

  async getPairing(pairId: string): Promise<PairingRecord | null> {
    const raw = await this.redisService.getClient().get(`portal-pair:${pairId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PairingRecord;
    } catch {
      return null;
    }
  }

  async resolvePairing(
    pairId: string,
    user: AuthenticatedUser,
    decision: "approve" | "deny"
  ): Promise<PairingRecord | null> {
    const record = await this.getPairing(pairId);
    if (!record || record.status !== "pending") return null;

    if (decision === "deny") {
      record.status = "denied";
    } else {
      record.status = "approved";
      record.approvedBy = { name: user.name, email: user.email };
      record.ticket = await this.mintTicket(user);
    }

    // Keep whatever TTL is left on the pairing key.
    const redis = this.redisService.getClient();
    const ttl = await redis.ttl(`portal-pair:${pairId}`);
    await redis.set(
      `portal-pair:${pairId}`,
      JSON.stringify(record),
      "EX",
      ttl > 0 ? ttl : this.pairingTtlSeconds
    );
    return record;
  }

  async getBrowserPairingStatus(pairId: string, browserSecret: string) {
    if (!this.isPortalPairingEnabled()) return null;
    const record = await this.getPairing(pairId);
    if (!record || record.browserSecret !== browserSecret) return null;
    return { status: record.status };
  }

  async consumeBrowserPairing(pairId: string, browserSecret: string) {
    if (!this.isPortalPairingEnabled()) return null;
    const record = await this.getPairing(pairId);
    if (!record || record.browserSecret !== browserSecret) return null;
    if (record.status !== "approved" || !record.ticket) return null;

    await this.redisService.getClient().del(`portal-pair:${pairId}`);
    return this.readTicket(record.ticket);
  }

  async getPortalData(userId: string): Promise<PortalData> {
    const patient = await this.prisma.user.findUnique({ where: { entraObjectId: userId } });
    if (!patient) {
      return {
        upcoming: [],
        upcomingCount: 0,
        completedVisits: 0,
        points: WELCOME_BONUS,
        tier: "BRONZE"
      };
    }

    const now = new Date();
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId: patient.id, deletedAt: null, status: { not: "CANCELLED" } },
      include: { slot: { include: { doctor: { include: { specialty: true } } } } }
    });

    const completedVisits = appointments.filter(
      (appointment) => appointment.status === "COMPLETED" || appointment.slot.endTime < now
    ).length;
    const points = WELCOME_BONUS + completedVisits * POINTS_PER_VISIT;
    const tier = points >= GOLD_AT ? "GOLD" : points >= SILVER_AT ? "SILVER" : "BRONZE";

    const upcoming = appointments
      .filter((appointment) => appointment.status !== "COMPLETED" && appointment.slot.startTime >= now)
      .sort((a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime())
      .slice(0, 5)
      .map((appointment) => ({
        doctor: appointment.slot.doctor.name,
        specialty: appointment.slot.doctor.specialty.name,
        clinic: appointment.slot.doctor.clinicName,
        startTime: appointment.slot.startTime.toISOString(),
        reason: appointment.reason
      }));

    return { upcoming, upcomingCount: upcoming.length, completedVisits, points, tier };
  }

  private async mintTicket(user: AuthenticatedUser) {
    const ticket = randomUUID();
    const payload: PortalTicketPayload = { userId: user.id, name: user.name, email: user.email };
    await this.redisService
      .getClient()
      .set(`portal-ticket:${ticket}`, JSON.stringify(payload), "EX", this.ticketTtlSeconds);
    return ticket;
  }

  private isPortalPairingEnabled() {
    return this.configService.getOrThrow<boolean>("features.portalPairing");
  }

  private assertPortalPairingEnabled() {
    if (!this.isPortalPairingEnabled()) {
      throw new ForbiddenException("Portal pairing is disabled.");
    }
  }

  private async consumeRedisKey(key: string): Promise<string | null> {
    const result = await this.redisService.getClient().eval(
      "local v = redis.call('GET', KEYS[1]); if v then redis.call('DEL', KEYS[1]); end; return v",
      1,
      key
    );
    return typeof result === "string" ? result : null;
  }
}
