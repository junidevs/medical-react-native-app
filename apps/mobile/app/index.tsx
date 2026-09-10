import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/auth-context";

export default function IndexRoute() {
  const { status } = useAuth();
  if (status === "loading") return null;
  if (status === "authenticated") return <Redirect href="/appointments" />;
  return <Redirect href="/login" />;
}

