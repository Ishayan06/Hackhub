"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Guard from "@/components/Guard";
import { api } from "@/lib/api";

const toLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function CreateForm() {
  const router = useRouter();
  const now = new Date();
  const [form, setForm] = useState({
    title: "",
    description: "",
    theme: "",
    mode: "online",
    location: "",
    prize: "",
    tags: "",
    maxTeams: "",
    minTeamSize: "1",
    maxTeamSize: "4",
    startDate: toLocalInput(new Date(now.getTime() + 24 * 3600 * 1000)),
    endDate: toLocalInput(new Date(now.getTime() + 3 * 24 * 3600 * 1000)),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { hackathon } = await api("/hackathons", {
        method: "POST",
        body: {
          ...form,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          maxTeams: Number(form.maxTeams) || 0,
          minTeamSize: Number(form.minTeamSize) || 1,
          maxTeamSize: Number(form.maxTeamSize) || 4,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        },
      });
      router.push(`/hackathons/${hackathon.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="page-head">
        <div>
          <h1>Create a hackathon</h1>
          <p>A private join code is generated automatically — share it with your participants.</p>
        </div>
      </div>

      <form className="card form" onSubmit={submit}>
        {error && <div className="alert error">{error}</div>}
        <div className="field">
          <label>Title *</label>
          <input required maxLength={120} value={form.title} onChange={set("title")} placeholder="e.g. CodeSprint 2026" />
        </div>
        <div className="field">
          <label>Description *</label>
          <textarea required value={form.description} onChange={set("description")} placeholder="What is this hackathon about? Rules, judging criteria…" />
        </div>
        <div className="row">
          <div className="field">
            <label>Theme</label>
            <input value={form.theme} onChange={set("theme")} placeholder="AI, FinTech, Open Innovation…" />
          </div>
          <div className="field">
            <label>Mode</label>
            <select value={form.mode} onChange={set("mode")}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Start *</label>
            <input type="datetime-local" required value={form.startDate} onChange={set("startDate")} />
          </div>
          <div className="field">
            <label>End *</label>
            <input type="datetime-local" required value={form.endDate} onChange={set("endDate")} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Prize</label>
            <input value={form.prize} onChange={set("prize")} placeholder="₹50,000" />
          </div>
          <div className="field">
            <label>Max teams (0 = unlimited)</label>
            <input type="number" min="0" value={form.maxTeams} onChange={set("maxTeams")} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Min members per team</label>
            <input type="number" min="1" value={form.minTeamSize} onChange={set("minTeamSize")} />
          </div>
          <div className="field">
            <label>Max members per team</label>
            <input type="number" min="1" value={form.maxTeamSize} onChange={set("maxTeamSize")} />
          </div>
        </div>
        {form.mode !== "online" && (
          <div className="field">
            <label>Location</label>
            <input value={form.location} onChange={set("location")} placeholder="Venue / city" />
          </div>
        )}
        <div className="field">
          <label>Tags (comma separated)</label>
          <input value={form.tags} onChange={set("tags")} placeholder="web, ai, mobile" />
        </div>
        <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create hackathon"}</button>
      </form>
    </div>
  );
}

export default function NewHackathonPage() {
  return (
    <Guard role="maker">
      <CreateForm />
    </Guard>
  );
}