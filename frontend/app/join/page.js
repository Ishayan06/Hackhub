"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Guard from "@/components/Guard";
import { api } from "@/lib/api";

function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { hackathonId } = await api("/hackathons/join", { method: "POST", body: { code } });
      router.push(`/hackathons/${hackathonId}/team`);
    } catch (err) {
      // already joined -> /team decides: team exists ? hackathon page : details form
      if (err.status === 409 && err.data?.hackathonId) {
        router.push(`/hackathons/${err.data.hackathonId}/team`);
        return;
      }
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap card">
      <h1>Join a hackathon</h1>
      <p className="sub">Enter the code your hackathon maker shared with you.</p>
      {error && <div className="alert error">{error}</div>}
      <form className="form" onSubmit={submit}>
        <div className="field">
          <input
            className="code-input"
            required
            maxLength={6}
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <button className="btn block" disabled={busy || code.length < 6}>
          {busy ? "Joining…" : "Join"}
        </button>
      </form>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Guard role="participant">
      <JoinForm />
    </Guard>
  );
}