"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Wrap pages that need login (and optionally a specific role).
export default function Guard({ role, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (role && user.role !== role) router.replace("/dashboard");
  }, [user, loading, role, router]);

  if (loading || !user || (role && user.role !== role)) {
    return <div className="center">Loading…</div>;
  }
  return children;
}
