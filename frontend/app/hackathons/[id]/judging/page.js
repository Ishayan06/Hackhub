"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Guard from "@/components/Guard";
import { api } from "@/lib/api";

const STEPS = [
  ["OPEN", "Open"],
  ["JUDGING", "Judging"],
  ["RESULTS_READY", "Results ready"],
  ["PUBLISHED", "Published"],
];

function Row({ r, hackathonId, onChanged }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(r.overridden ? String(r.total) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const call = async (path, method, body) => {
    setBusy(true);
    setErr("");
    try {
      await api(`/hackathons/${hackathonId}/evaluations/${r.evaluationId}${path}`, { method, body });
      await onChanged();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const pending = r.status === "PENDING" || r.status === "PROCESSING";

  return (
    <div className="sub-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div>
          <h4>#{r.rank} · {r.title}</h4>
          <small style={{ color: "var(--muted)" }}>
            {r.team && <>by {r.team} · </>}
            {r.link ? (r.link.live ? "Site live" : "Site down / unreachable") : ""}
            {r.siteMatchesDescription === false && " · ⚠ site doesn't match description"}
          </small>
        </div>
        <div style={{ textAlign: "right" }}>
          {pending ? (
            <strong>Evaluating…</strong>
          ) : r.status === "NEEDS_MANUAL_REVIEW" ? (
            <strong>Needs review</strong>
          ) : (
            <>
              <strong style={{ fontSize: 20 }}>{r.total}</strong>/100
              {r.overridden && <div><small>AI: {r.aiTotal}</small></div>}
            </>
          )}
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          {r.summary && <p className="prose">{r.summary}</p>}

          {r.criteria?.length > 0 && (
            <div className="kv" style={{ marginTop: 10 }}>
              {r.criteria.map((c) => (
                <div key={c.name}>
                  <span>{c.name}</span>
                  <span>
                    <strong>{c.score}/10</strong> <small>{c.reason}</small>
                  </span>
                </div>
              ))}
            </div>
          )}

          {r.error && <div className="alert error" style={{ marginTop: 10 }}>{r.error}</div>}

          <div className="score-row" style={{ marginTop: 12 }}>
            <input
              className="num"
              type="number"
              min="0"
              max="100"
              placeholder="Override /100"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
            <button
              className="btn small"
              disabled={busy || val === ""}
              onClick={() => call("", "PATCH", { total: Number(val) })}
            >
              Save override
            </button>
            {r.overridden && (
              <button
                className="btn small secondary"
                disabled={busy}
                onClick={() => { setVal(""); call("", "PATCH", { total: null }); }}
              >
                Clear
              </button>
            )}
            {(r.status === "NEEDS_MANUAL_REVIEW" || r.status === "DONE") && (
              <button className="btn small secondary" disabled={busy} onClick={() => call("/retry", "POST")}>
                Re-run AI
              </button>
            )}
          </div>
          {err && <div className="alert error" style={{ marginTop: 10, marginBottom: 0 }}>{err}</div>}
        </div>
      )}
    </div>
  );
}

function JudgingInner() {
  const { id } = useParams();
  const [hack, setHack] = useState(null);
  const [state, setState] = useState({ judgingStatus: "OPEN", ranking: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([api(`/hackathons/${id}`), api(`/hackathons/${id}/ranking`)]);
      setHack(h.hackathon);
      setState(r);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // JUDGING ke dauran har 5 sec refresh
  useEffect(() => {
    if (state.judgingStatus !== "JUDGING") return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [state.judgingStatus, load]);

  const action = async (path, confirmText) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/hackathons/${id}/${path}`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !hack) return <div className="alert error">{error}</div>;
  if (!hack) return <div className="center">Loading…</div>;
  if (!hack.isOwner) return <div className="alert error">Only the maker can open this page.</div>;

  const { judgingStatus, ranking } = state;
  const doneCount = ranking.filter((r) => r.status === "DONE").length;
  const stepIndex = STEPS.findIndex(([k]) => k === judgingStatus);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>AI Judging</h1>
          <p>{hack.title}</p>
        </div>
        <Link href={`/hackathons/${id}`} className="btn secondary">← Back</Link>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {STEPS.map(([k, label], i) => (
            <span key={k} className="tag" style={{ opacity: i <= stepIndex ? 1 : 0.4, fontWeight: i === stepIndex ? 700 : 400 }}>
              {i + 1}. {label}
            </span>
          ))}
        </div>

        {judgingStatus === "OPEN" && (
          <>
            <p className="desc" style={{ WebkitLineClamp: "unset" }}>
              Deadline ({new Date(hack.endDate).toLocaleString("en-IN")}) ke baad judging automatic start hogi
              (agar AI judging enabled hai). Testing ke liye abhi bhi start kar sakte ho.
            </p>
            <button className="btn" disabled={busy} onClick={() => action("judge-now", "Start AI judging now for all submissions?")}>
              {busy ? "Starting…" : "Judge now"}
            </button>
          </>
        )}

        {judgingStatus === "JUDGING" && (
          <p>Evaluating… <strong>{doneCount}/{ranking.length}</strong> done. Ye page khud refresh hota rahega.</p>
        )}

        {judgingStatus === "RESULTS_READY" && (
          <>
            <p className="desc" style={{ WebkitLineClamp: "unset" }}>
              AI ranking ready hai. Scores check karo, zarurat ho to override karo, phir publish karo.
            </p>
            <button className="btn" disabled={busy} onClick={() => action("publish", "Publish results? Participants ko ranking dikhne lagegi.")}>
              {busy ? "Publishing…" : "Publish results"}
            </button>
          </>
        )}

        {judgingStatus === "PUBLISHED" && <p>Results published. Participants ab ranking dekh sakte hain.</p>}
      </div>

      <h2 className="section-title">Ranking ({ranking.length})</h2>
      {ranking.length === 0 ? (
        <div className="empty"><p>Abhi koi evaluation nahi hai.</p></div>
      ) : (
        <div className="list">
          {ranking.map((r) => (
            <Row key={r.evaluationId + r.total + r.status} r={r} hackathonId={id} onChanged={load} />
          ))}
        </div>
      )}
    </>
  );
}

export default function JudgingPage() {
  return (
    <Guard>
      <JudgingInner />
    </Guard>
  );
}