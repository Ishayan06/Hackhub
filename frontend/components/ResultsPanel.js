"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function ResultsPanel({ hackathonId }) {
  const [ranking, setRanking] = useState(null); // null = loading
  const [published, setPublished] = useState(false);

  useEffect(() => {
    api(`/hackathons/${hackathonId}/ranking`)
      .then((r) => {
        setPublished(true);
        setRanking(r.ranking);
      })
      .catch(() => {
        setPublished(false);
        setRanking([]);
      });
  }, [hackathonId]);

  if (ranking === null) return null;

  if (!published) {
    return (
      <>
        <h2 className="section-title">Results</h2>
        <div className="card"><p className="desc" style={{ WebkitLineClamp: "unset" }}>Results will be announced soon.</p></div>
      </>
    );
  }

  return (
    <>
      <h2 className="section-title">Results</h2>
      <div className="card">
        <div className="list">
          {ranking.map((r) => (
            <div key={r.evaluationId} className="list-item">
              <div>
                <strong>{MEDAL[r.rank - 1] || `#${r.rank}`} {r.title}</strong>
                {r.team && <small> · {r.team}</small>}
                {r.summary && <><br /><small>{r.summary}</small></>}
              </div>
              <strong>{r.total}/100</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}