"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Guard from "@/components/Guard";
import HackathonCard from "@/components/HackathonCard";
import { useAuth } from "@/context/AuthContext";
import { api, statusOf } from "@/lib/api";

function Dashboard() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isMaker = user.role === "maker";

  useEffect(() => {
    api("/hackathons/mine")
      .then((d) => setList(d.hackathons))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const count = (s) => list.filter((h) => statusOf(h) === s).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hi, {user.name.split(" ")[0]} 👋</h1>
          <p>{isMaker ? "Hackathons you're hosting." : "Hackathons you've joined."}</p>
        </div>
        {isMaker ? (
          <Link href="/hackathons/new" className="btn">+ Create hackathon</Link>
        ) : (
          <Link href="/join" className="btn">Join with code</Link>
        )}
      </div>

      <div className="stats">
        <div className="card stat"><strong>{list.length}</strong><span>Total</span></div>
        <div className="card stat"><strong>{count("live")}</strong><span>Live</span></div>
        <div className="card stat"><strong>{count("upcoming")}</strong><span>Upcoming</span></div>
        <div className="card stat"><strong>{count("ended")}</strong><span>Ended</span></div>
      </div>

      <h2 className="section-title">{isMaker ? "My hackathons" : "Joined hackathons"}</h2>
      {error && <div className="alert error">{error}</div>}
      {loading ? (
        <div className="center">Loading…</div>
      ) : list.length === 0 ? (
        <div className="empty">
          <h3>{isMaker ? "You haven't created any hackathon yet" : "You haven't joined any hackathon yet"}</h3>
          <p>{isMaker ? "Create one and share the join code." : "Ask a maker for a code, or browse what's available."}</p>
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

export default function DashboardPage() {
  return (
    <Guard>
      <Dashboard />
    </Guard>
  );
}
