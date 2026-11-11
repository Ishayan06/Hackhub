"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import StatusBadge from "@/components/StatusBadge";
import TeamPanel from "@/components/TeamPanel";
import { api, fmtDate, statusOf } from "@/lib/api";
import CertificateButton from "@/components/CertificateButton";

/* ---------- Participant: submit project ---------- */
function SubmissionForm({ hackathon, existing, onSaved }) {
  const [form, setForm] = useState({
    title: existing?.title || "",
    description: existing?.description || "",
    repoUrl: existing?.repoUrl || "",
    demoUrl: existing?.demoUrl || "",
  });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const status = statusOf(hackathon);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      await api(`/hackathons/${hackathon.id}/submissions`, { method: "POST", body: form });
      setMsg({ type: "success", text: "Submission saved." });
      onSaved();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (status === "upcoming") {
    return <div className="alert success">You're in! Submissions open when the hackathon starts.</div>;
  }

  return (
    <form className="form" onSubmit={submit}>
      {msg.text && <div className={`alert ${msg.type}`}>{msg.text}</div>}
      {status === "ended" && <div className="alert error">Submissions are closed.</div>}
      <div className="field">
        <label>Project title *</label>
        <input required value={form.title} onChange={set("title")} disabled={status === "ended"} />
      </div>
      <div className="field">
        <label>Description *</label>
        <textarea required value={form.description} onChange={set("description")} disabled={status === "ended"} />
      </div>
      <div className="row">
        <div className="field">
          <label>Repository URL</label>
          <input type="url" placeholder="https://github.com/…" value={form.repoUrl} onChange={set("repoUrl")} disabled={status === "ended"} />
        </div>
        <div className="field">
          <label>Demo URL</label>
          <input type="url" placeholder="https://…" value={form.demoUrl} onChange={set("demoUrl")} disabled={status === "ended"} />
        </div>
      </div>
      {status !== "ended" && (
        <button className="btn" disabled={busy}>
          {busy ? "Saving…" : existing ? "Update submission" : "Submit project"}
        </button>
      )}
    </form>
  );
}

/* ---------- Maker: one submission with scoring ---------- */
function SubmissionRow({ hackathonId, s, onSaved }) {
  const [score, setScore] = useState(s.score ?? "");
  const [feedback, setFeedback] = useState(s.feedback || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await api(`/hackathons/${hackathonId}/submissions/${s._id}`, {
        method: "PATCH",
        body: { score: score === "" ? undefined : Number(score), feedback },
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sub-card">
      <h4>{s.title}</h4>
      <small style={{ color: "var(--muted)" }}>by {s.participant?.name} · {s.participant?.email}</small>
      <p className="prose" style={{ marginTop: 8 }}>{s.description}</p>
      <div className="links">
        {s.repoUrl && <a href={s.repoUrl} target="_blank" rel="noreferrer">Repository ↗</a>}
        {s.demoUrl && <a href={s.demoUrl} target="_blank" rel="noreferrer">Demo ↗</a>}
      </div>
      <div className="score-row">
        <input className="num" type="number" min="0" max="100" placeholder="Score /100" value={score} onChange={(e) => setScore(e.target.value)} />
        <input className="fb" placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <button className="btn small" onClick={save} disabled={busy}>{busy ? "…" : "Save"}</button>
      </div>
      {err && <div className="alert error" style={{ marginTop: 10, marginBottom: 0 }}>{err}</div>}
    </div>
  );
}

/* ---------- Page ---------- */
export default function HackathonDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api(`/hackathons/${id}`);
      setData(res.hackathon);
      setMySubmission(res.mySubmission);
      if (res.hackathon.isOwner) {
        const s = await api(`/hackathons/${id}/submissions`);
        setSubmissions(s.submissions);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, user, load]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const leave = async () => {
    if (!confirm("Leave this hackathon? Your submission will be removed.")) return;
    try {
      await api(`/hackathons/${id}/leave`, { method: "POST" });
      router.push("/dashboard");
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this hackathon and all submissions? This cannot be undone.")) return;
    try {
      await api(`/hackathons/${id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !data) return <div className="alert error">{error}</div>;
  if (!data) return <div className="center">Loading…</div>;

  const isParticipant = user?.role === "participant";

  return (
    <>
      <div className="page-head">
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h1>{data.title}</h1>
            <StatusBadge hackathon={data} />
          </div>
          <p>Hosted by {data.maker?.name}</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="detail-grid">
        {/* LEFT */}
        <div>
          <div className="card">
            <h3>About</h3>
            <p className="prose" style={{ marginTop: 10 }}>{data.description}</p>
            {data.tags?.length > 0 && (
              <div className="tags">{data.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            )}
          </div>

          {/* Maker (owner): submissions */}
          {data.isOwner && (
            <>
              <h2 className="section-title">Submissions ({submissions.length})</h2>
              {submissions.length === 0 ? (
                <div className="empty"><p>No submissions yet.</p></div>
              ) : (
                <div className="list">
                  {submissions.map((s) => (
                    <SubmissionRow key={s._id + (s.updatedAt || "")} hackathonId={id} s={s} onSaved={load} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Participant (joined): team + my submission */}
          {isParticipant && data.isJoined && (
            <>
              <h2 className="section-title">Your team</h2>
              <TeamPanel
                hackathonId={id}
                minTeamSize={data.minTeamSize}
                maxTeamSize={data.maxTeamSize}
                status={statusOf(data)}
              />

              <h2 className="section-title">Your submission</h2>
              <div className="card">
                {mySubmission?.score != null && (
                  <div className="alert success">
                    Score: <strong>{mySubmission.score}/100</strong>
                    {mySubmission.feedback && <> — {mySubmission.feedback}</>}
                  </div>
                )}
                <SubmissionForm
                  key={mySubmission?._id || "new"}
                  hackathon={data}
                  existing={mySubmission}
                  onSaved={load}
                />
              </div>
            </>
          )}
        </div>

        {/* RIGHT */}
        <aside style={{ display: "grid", gap: 18 }}>
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Details</h3>
            <div className="kv">
              <div><span>Starts</span><span>{fmtDate(data.startDate)}</span></div>
              <div><span>Ends</span><span>{fmtDate(data.endDate)}</span></div>
              <div><span>Mode</span><span style={{ textTransform: "capitalize" }}>{data.mode}</span></div>
              {data.location && <div><span>Location</span><span>{data.location}</span></div>}
              {data.theme && <div><span>Theme</span><span>{data.theme}</span></div>}
              {data.prize && <div><span>Prize</span><span>{data.prize}</span></div>}
              <div>
                <span>Team size</span>
                <span>{data.minTeamSize}–{data.maxTeamSize}</span>
              </div>
              <div>
                <span>Teams</span>
                <span>{data.teamCount ?? 0} / {data.maxTeams || "∞"}</span>
              </div>
            </div>
          </div>

          {/* Owner panel */}
          {data.isOwner && (
            <>
              <div className="card">
                <h3>Join code</h3>
                <p className="desc" style={{ WebkitLineClamp: "unset" }}>Share this with people you want to let in.</p>
                <div className="code-box">
                  <code>{data.joinCode}</code>
                  <button className="btn small secondary" onClick={copyCode}>{copied ? "Copied" : "Copy"}</button>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 12 }}>Participants ({data.participants?.length || 0})</h3>
                {data.participants?.length ? (
                  <div className="list">
                    {data.participants.map((p) => (
                      <div key={p.user?._id} className="list-item">
                        <div>
                          {p.user?.name}
                          <br />
                          <small>{p.user?.email}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="desc">Nobody has joined yet.</p>
                )}
              </div>

              <button className="btn danger" onClick={remove}>Delete hackathon</button>
            </>
          )}

          {/* Participant actions */}
          {isParticipant && !data.isJoined && (
            <div className="card">
              <h3>Want to join?</h3>
              <p className="desc" style={{ margin: "6px 0 14px", WebkitLineClamp: "unset" }}>
                Ask the maker for the join code and enter it to get inside.
              </p>
              <Link href="/join" className="btn block">Enter join code</Link>
            </div>
          )}
          {isParticipant && data.isJoined && statusOf(data) === "ended" && (
  <div className="card">
    <h3>Certificate</h3>
    <p className="desc" style={{ margin: "6px 0 14px", WebkitLineClamp: "unset" }}>
      Thanks for participating! Download your certificate of participation.
    </p>
    <CertificateButton name={user.name} hackathon={data} />
  </div>
)}
          {isParticipant && data.isJoined && (
            <button className="btn danger" onClick={leave}>Leave hackathon</button>
          )}

          {/* Logged out */}
          {!user && !authLoading && (
            <div className="card">
              <h3>Login to participate</h3>
              <p className="desc" style={{ margin: "6px 0 14px", WebkitLineClamp: "unset" }}>
                Sign in as a participant, then join with the maker's code.
              </p>
              <Link href="/login" className="btn block">Login</Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}