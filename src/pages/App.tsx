import { useSeoMeta } from "@unhead/react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { CadenceApp } from "@/components/app/CadenceApp";
import { FullPageLoader } from "@/components/app/CadenceApp";

/**
 * The app itself. Guards on session, then hands off to `CadenceApp`, which
 * renders its own "connect Supabase" notice when env vars are missing.
 */
export default function App() {
  const { user, loading } = useAuth();

  useSeoMeta({
    title: "Cadence",
    description: "Servers, channels and DMs for your community.",
    robots: "noindex",
  });

  if (loading) return <FullPageLoader label="Opening Cadence…" />;
  if (!user) return <Navigate to="/login" replace />;

  return <CadenceApp />;
}
