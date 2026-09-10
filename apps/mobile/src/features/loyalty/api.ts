import { useQuery } from "@tanstack/react-query";

import { loyaltySummarySchema } from "@medconnect/shared";
import { useAuth } from "@/features/auth/auth-context";
import { apiRequest } from "@/lib/api-client";

export function useLoyaltySummary() {
  const { getAccessToken } = useAuth();
  return useQuery({
    queryKey: ["loyalty"],
    queryFn: async () => {
      const accessToken = await getAccessToken();
      return apiRequest({ path: "/loyalty", schema: loyaltySummarySchema, accessToken });
    }
  });
}
