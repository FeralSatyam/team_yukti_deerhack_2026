import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

// Brief full-screen spinner shown while the initial session check is in flight.
function SessionSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}

// Gates the app: redirects to /login (remembering where you were headed) until
// the session is confirmed.
export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionSplash />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

// Keeps already-signed-in doctors out of the auth screens.
export function RedirectIfAuthed() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <SessionSplash />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
