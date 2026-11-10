"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "participant" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const roles = [
    { value: "participant", title: "Participant", sub: "Join hackathons with a code" },
    { value: "maker", title: "Maker", sub: "Create & manage hackathons" },
  ];

  return (
    <div className="auth-wrap card">
      <h1>Create your account</h1>
      <p className="sub">Pick how you want to use HackHub.</p>
      {error && <div className="alert error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <div className="role-toggle">
          {roles.map((r) => (
            <button
              type="button"
              key={r.value}
              className={`role-option ${form.role === r.value ? "active" : ""}`}
              onClick={() => setForm({ ...form, role: r.value })}
            >
              <strong>{r.title}</strong>
              <span>{r.sub}</span>
            </button>
          ))}
        </div>
        <div className="field">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password (min 6 chars)</label>
          <input type="password" minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn block" disabled={busy}>{busy ? "Creating…" : "Sign up"}</button>
      </form>
      <p className="alt">
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </div>
  );
}
