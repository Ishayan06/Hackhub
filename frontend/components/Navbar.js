"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const cls = (href) => (pathname === href || pathname.startsWith(href + "/") ? "active" : "");

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo">
          Hack<span>Hub</span>
        </Link>

        <nav className="nav-links">
          <Link href="/hackathons" className={cls("/hackathons")}>Explore</Link>

          {!loading && user && (
            <>
              <Link href="/dashboard" className={cls("/dashboard")}>Dashboard</Link>
              {user.role === "maker" ? (
                <Link href="/hackathons/new" className={cls("/hackathons/new")}>Create</Link>
              ) : (
                <Link href="/join" className={cls("/join")}>Join</Link>
              )}
              <span className="role-pill">{user.role}</span>
              <button
                className="link"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Logout
              </button>
            </>
          )}

          {!loading && !user && (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register" className="btn small" style={{ color: "#fff" }}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
