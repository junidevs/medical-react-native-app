import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";

import {
  type Appointment,
  appointmentSchema,
  checkInQrSchema,
  bookAppointmentRequestSchema,
  doctorSchema,
  slotSchema
} from "@medconnect/shared";
import { useAuth } from "@/features/auth/auth-context";
import { endAppointmentActivity } from "@/features/appointments/live-activity";
import { apiRequest, type ApiFailure, type ApiSuccess } from "@/lib/api-client";

type AppointmentListResult = ApiSuccess<Appointment[]> | ApiFailure;

export function useDoctors() {
  const { getAccessToken } = useAuth();
  return useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return apiRequest({ path: "/doctors", schema: doctorSchema.array(), accessToken });
    }
  });
}

export function useDoctor(doctorId: string | null) {
  const doctors = useDoctors();
  const doctor = doctors.data?.ok ? doctors.data.data.find((item) => item.id === doctorId) : null;
  return { ...doctors, doctor };
}

export function useSlots(doctorId: string | null) {
  const { getAccessToken } = useAuth();
  return useQuery({
    queryKey: ["slots", doctorId],
    enabled: Boolean(doctorId),
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return apiRequest({
        path: `/doctors/${doctorId}/slots`,
        schema: slotSchema.array(),
        accessToken
      });
    }
  });
}

export function useAppointments() {
  const { getAccessToken } = useAuth();
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return apiRequest({
        path: "/appointments",
        schema: appointmentSchema.array(),
        accessToken
      });
    }
  });
}

export function useCheckInQr(appointmentId: string | null) {
  const { getAccessToken } = useAuth();
  return useQuery({
    queryKey: ["appointment-check-in", appointmentId],
    enabled: Boolean(appointmentId),
    staleTime: 60_000,
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return apiRequest({
        path: `/appointments/${appointmentId}/check-in`,
        schema: checkInQrSchema,
        accessToken
      });
    }
  });
}

export function useCancelAppointment() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const accessToken = await getAccessToken();
      return apiRequest({
        path: `/appointments/${appointmentId}/cancel`,
        method: "POST",
        schema: appointmentSchema,
        accessToken
      });
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      const previous = queryClient.getQueryData<AppointmentListResult>(["appointments"]);
      queryClient.setQueryData<AppointmentListResult>(["appointments"], (current) => {
        if (!current?.ok) return current;
        return {
          ...current,
          data: current.data.map((appointment) =>
            appointment.id === appointmentId
              ? { ...appointment, status: "CANCELLED", updatedAt: new Date().toISOString() }
              : appointment
          )
        };
      });
      return { previous };
    },
    onError: (_error, _appointmentId, context) => {
      if (context?.previous) queryClient.setQueryData(["appointments"], context.previous);
    },
    onSuccess: (_result, appointmentId) => {
      endAppointmentActivity(appointmentId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
      void queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    }
  });
}

export function useBookAppointment() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: unknown) => {
      const body = bookAppointmentRequestSchema.parse(input);
      const accessToken = await getAccessToken();
      return apiRequest({
        path: "/appointments",
        method: "POST",
        schema: appointmentSchema,
        body,
        accessToken,
        idempotencyKey: Crypto.randomUUID()
      });
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData<AppointmentListResult>(["appointments"], (current) => {
          if (!current?.ok) return current;
          return { ...current, data: [result.data, ...current.data] };
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
      void queryClient.invalidateQueries({ queryKey: ["loyalty"] });
    }
  });
}
