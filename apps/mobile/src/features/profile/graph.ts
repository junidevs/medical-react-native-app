import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuth } from "@/features/auth/auth-context";
import { getString, setString } from "@/lib/storage";

const profileSchema = z.object({
  displayName: z.string().nullable().optional(),
  mail: z.string().nullable().optional(),
  userPrincipalName: z.string().nullable().optional()
});

const cacheKey = "graph.profile.v1";
const photoKey = "graph.photo.v1";

export function usePatientProfile() {
  const { session, getAccessToken } = useAuth();
  return useQuery({
    queryKey: ["patient-profile", session?.userEmail],
    enabled: Boolean(session),
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const cached = readCachedProfile();
      const fallback = {
        displayName: session?.userName ?? "Pacjent MedConnect",
        email: session?.userEmail ?? "",
        photoUrl: getString(photoKey)
      };

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) return cached ?? fallback;

        const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!graphResponse.ok) return cached ?? fallback;
        const profile = profileSchema.parse(await graphResponse.json());
        const photoUrl = await fetchGraphPhoto(accessToken);
        const next = {
          displayName: profile.displayName ?? fallback.displayName,
          email: profile.mail ?? profile.userPrincipalName ?? fallback.email,
          photoUrl: photoUrl ?? fallback.photoUrl
        };
        setString(cacheKey, JSON.stringify(next));
        if (photoUrl) setString(photoKey, photoUrl);
        return next;
      } catch {
        return cached ?? fallback;
      }
    }
  });
}

async function fetchGraphPhoto(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

function readCachedProfile() {
  const raw = getString(cacheKey);
  if (!raw) return null;
  try {
    return z
      .object({ displayName: z.string(), email: z.string(), photoUrl: z.string().nullable().optional() })
      .parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
