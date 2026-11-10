"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import HackathonCard from "@/components/HackathonCard";

const FILTERS = ["all", "live", "upcoming", "ended"];

export default function ExplorePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (status !== "all") params.set("status", status);
        const { hackathons } = await api(`/hackathons?${params}`);
        setList(hackathons);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, status]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Explore hackathons</h1>
          <p>Browse what's happening. To join one, you'll need its code from the maker.</p>
        </div>
      </div>

      <div className="toolbar">
        <input placeholder="Search by title, theme or tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} className={`chip ${status === f ? "active" : ""}`} onClick={() => setStatus(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="center">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>No hackathons found</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid">
          {list.map((h) => (
            <HackathonCard key={h.id} h={h} />
          ))}
        </div>
      )}
    </>
  );
}
