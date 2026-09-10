import { z } from "zod";

export const appointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED"
]);

export const slotStatusSchema = z.enum(["AVAILABLE", "BOOKED"]);

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "SLOT_ALREADY_BOOKED",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "PORTAL_TICKET_EXPIRED",
  "INTERNAL_ERROR",
  "NETWORK_OFFLINE"
]);

export const specialtySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1)
});

export const doctorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  specialtyId: z.string().uuid(),
  specialtyName: z.string().min(1),
  clinicName: z.string().min(1),
  rating: z.number().min(0).max(5)
});

export const slotSchema = z.object({
  id: z.string().uuid(),
  doctorId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: slotStatusSchema
});

export const checkInQrSchema = z.object({
  code: z.string().min(4),
  qrDataUrl: z.string().startsWith("data:image/png;base64,"),
  expiresAt: z.string().datetime()
});

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  doctor: doctorSchema,
  slot: slotSchema,
  status: appointmentStatusSchema,
  reason: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const bookAppointmentRequestSchema = z.object({
  slotId: z.string().uuid(),
  reason: z.string().min(3).max(280)
});

export const registerDeviceRequestSchema = z.object({
  platform: z.enum(["ios", "android"]),
  deviceToken: z.string().min(10),
  installationId: z.string().uuid()
});

export const portalSessionResponseSchema = z.object({
  portalUrl: z.string().url(),
  expiresAt: z.string().datetime()
});

export const loyaltyTierSchema = z.enum(["BRONZE", "SILVER", "GOLD"]);

export const loyaltySummarySchema = z.object({
  points: z.number().int().min(0),
  completedVisits: z.number().int().min(0),
  upcomingVisits: z.number().int().min(0),
  tier: loyaltyTierSchema,
  pointsToNextTier: z.number().int().min(0)
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const apiErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  correlationId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional()
});

export const responseMetaSchema = z.object({
  correlationId: z.string(),
  nextCursor: z.string().optional()
});

export function createApiResponseSchema<TSchema extends z.ZodType>(
  dataSchema: TSchema
) {
  return z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      data: dataSchema,
      error: z.null(),
      meta: responseMetaSchema
    }),
    z.object({
      ok: z.literal(false),
      data: z.null(),
      error: apiErrorSchema,
      meta: responseMetaSchema
    })
  ]);
}

export interface Specialty extends z.infer<typeof specialtySchema> {}
export interface Doctor extends z.infer<typeof doctorSchema> {}
export interface Slot extends z.infer<typeof slotSchema> {}
export interface CheckInQr extends z.infer<typeof checkInQrSchema> {}
export interface Appointment extends z.infer<typeof appointmentSchema> {}
export interface BookAppointmentRequest
  extends z.infer<typeof bookAppointmentRequestSchema> {}
export interface RegisterDeviceRequest
  extends z.infer<typeof registerDeviceRequestSchema> {}
export interface PortalSessionResponse
  extends z.infer<typeof portalSessionResponseSchema> {}
export type LoyaltyTier = z.infer<typeof loyaltyTierSchema>;
export interface LoyaltySummary extends z.infer<typeof loyaltySummarySchema> {}
export interface ApiError extends z.infer<typeof apiErrorSchema> {}
export type ErrorCode = z.infer<typeof errorCodeSchema>;

