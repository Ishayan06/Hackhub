"use client";

import { useCallback, useEffect, useState } from "react";
import { teamApi } from "@/lib/api";

const emptyRow = () => ({ name: "", phone: "" });

export default function TeamPanel({
  hackathonId,
  minTeamSize = 1,
  maxTeamSize = 4,
  status,
  onRegistered,
}) {
  const [teams, setTeams] = useState([]);
  const [teamsFull, setTeamsFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [rows, setRows] = useState(() =>
    Array.from({ length: Math.max(1, minTeamSize) }, emptyRow)
  );
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await teamApi.list(hackathonId);
      setTeams(res.teams);
      setTeamsFull(!!res.teamsFull);
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    load();
  }, [load]);

  const myTeam = teams.find((t) => t.isMine);

  const setRow = (i, k) => (e) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: e.target.value } : row)));
  const addRow = () => rows.length < maxTeamSize && setRows((r) => [...r, emptyRow()]);
  const removeRow = (i) => rows.length > 1 && setRows((r) => r.filter((_, idx) => idx !== i));

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      await teamApi.create(hackathonId, { name: teamName, members: rows });
      setMsg({ type: "success", text: "Team registered." });
      await load();
      onRegistered?.();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      await teamApi.join(code.trim());
      setCode("");
      await load();
      onRegistered?.();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!confirm("Leave this team?")) return;
    try {
      await teamApi.leave(myTeam._id);
      await load();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
  };

  if (loading) return <div className="card">Loading team…</div>;

  /* ---- Already in a team ---- */
  if (myTeam) {
    return (
      <div className="card">
        {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}
        <h3>{myTeam.name}</h3>
        <small style={{ color: "var(--muted)" }}>
          {myTeam.size} member{myTeam.size > 1 ? "s" : ""} · allowed {minTeamSize}–{maxTeamSize}
        </small>

        {!myTeam.meetsMinimum && (
          <div className="alert error" style={{ marginTop: 10 }}>
            Team needs at least {minTeamSize} members.
          </div>
        )}

        <div className="list" style={{ marginTop: 12 }}>
          {myTeam.memberDetails?.length
            ? myTeam.memberDetails.map((m) => (
                <div key={m._id} className="list-item">
                  <div>
                    {m.name} {m.isLeader && <small>(Leader)</small>}
                    <br />
                    <small>{m.phone}</small>
                  </div>
                </div>
              ))
            : myTeam.members.map((m) => (
                <div key={m._id} className="list-item">
                  <div>{m.name}</div>
                </div>
              ))}
        </div>

        <p className="desc" style={{ marginTop: 12, WebkitLineClamp: "unset" }}>
          Invite code: <code>{myTeam.inviteCode}</code>
        </p>

        <button className="btn danger small" onClick={leave}>
          Leave team
        </button>
      </div>
    );
  }

  /* ---- Not in a team ---- */
  if (status === "ended") {
    return <div className="alert error">Team registration is closed.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      {/* Create team: leader fills name + phone of everyone */}
      {teamsFull ? (
        <div className="alert error">
          All team slots are filled. You can still join an existing team with an invite code.
        </div>
      ) : (
        <form className="card form" onSubmit={create}>
          <h3>Register a team</h3>

          <div className="field">
            <label>Team name *</label>
            <input required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </div>

          <h4 style={{ margin: "6px 0" }}>
            Members ({rows.length}/{maxTeamSize})
          </h4>

          {rows.map((row, i) => (
            <div className="row" key={i} style={{ alignItems: "flex-end" }}>
              <div className="field">
                <label>{i === 0 ? "Your name (Leader) *" : `Member ${i + 1} name *`}</label>
                <input required value={row.name} onChange={setRow(i, "name")} />
              </div>
              <div className="field">
                <label>Phone *</label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  maxLength={14}
                  value={row.phone}
                  onChange={setRow(i, "phone")}
                />
              </div>
              {i > 0 && (
                <button type="button" className="btn small danger" onClick={() => removeRow(i)}>
                  ✕
                </button>
              )}
            </div>
          ))}

          <div style={{ display: "flex", gap: 10 }}>
            {rows.length < maxTeamSize && (
              <button type="button" className="btn small secondary" onClick={addRow}>
                + Add member
              </button>
            )}
            <button className="btn" disabled={busy}>
              {busy ? "Saving…" : "Register team"}
            </button>
          </div>
        </form>
      )}

      {/* Join an existing team via invite code */}
      <form className="card form" onSubmit={join}>
        <h3>Have an invite code?</h3>
        <div className="field">
          <input
            required
            placeholder="Enter team invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="btn secondary" disabled={busy}>
          Join team
        </button>
      </form>
    </div>
  );
}