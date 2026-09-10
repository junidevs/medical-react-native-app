import * as Crypto from "expo-crypto";
import { z } from "zod";

import { ApiError, apiErrorSchema } from "@medconnect/shared";
import { env } from "./env";

export interface ApiClientOptions<TSchema extends z.ZodType> {
  path: string;
  schema: TSchema;
  method?: "GET" | "POST";
  body?: unknown;
  accessToken?: string | null;
  idempotencyKey?: string;
}

export interface ApiSuccess<TData> {
  ok: true;
  data: TData;
  correlationId: string;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export async function apiRequest<TSchema extends z.ZodType>(
  options: ApiClientOptions<TSchema>
): Promise<ApiSuccess<z.infer<TSchema>> | ApiFailure> {
  const correlationId = Crypto.randomUUID();
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: buildHeaders(options, correlationId)
  };
  if (options.body) init.body = JSON.stringify(options.body);

  const response = await fetch(`${env.apiUrl}${options.path}`, init);

  const payload = (await response.json()) as unknown;
  if (!response.ok) return parseError(payload, correlationId);

  const envelope = z.object({ data: z.unknown() }).parse(payload);
  const data = options.schema.parse(envelope.data) as z.infer<TSchema>;
  return { ok: true, data, correlationId };
}

function buildHeaders(
  options: ApiClientOptions<z.ZodType>,
  correlationId: string
) {
  return {
    "Content-Type": "application/json",
    "X-Correlation-Id": correlationId,
    ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
  };
}

function parseError(payload: unknown, correlationId: string): ApiFailure {
  const parsed = z.object({ error: apiErrorSchema }).safeParse(payload);
  if (parsed.success) return { ok: false, error: parsed.data.error };

  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Nie udało się wykonać operacji.",
      correlationId
    }
  };
}

