import { useSeoMeta } from "@unhead/react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { CadenceApp } from "@/components/app/CadenceApp";
import { AuthGate, FullPageLoader } from "@/components/app/AuthGate";

/**
 * The app itself. `AuthGate` renders the loader, the error screen with a retry
 * button, or a redirect to /login — so we never spin forever.
 */
export default function App() {
  const { user } = useAuth();

  useSeoMeta({
    title: "Cadence",
    description: "Servers, channels and DMs for your community.",
    robots: "noindex",
  });

  if (!user) return <Navigate to="/login" replace />;

  return (
    <AuthGate>
      <CadenceApp />
    </AuthGate>
  );
}

export { FullPageLoader };