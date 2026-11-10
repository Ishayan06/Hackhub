"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Guard from "@/components/Guard";
import TeamPanel from "@/components/TeamPanel";
import { api, teamApi, statusOf } from "@/lib/api";

function TeamStep() {
  const { id } = useParams();
  const router = useRouter();
  const [h, setH] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/hackathons/${id}`);
        if (!res.hackathon.isJoined) {
          router.replace("/join");
          return;
        }
        // already has a team -> nothing to fill, go to the hackathon
        const t = await teamApi.list(id);
        if (t.teams.some((x) => x.isMine)) {
          router.replace(`/hackathons/${id}`);
          return;
        }
        setH(res.hackathon);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [id, router]);

  if (error) return <div className="alert error">{error}</div>;
  if (!h) return <div className="center">Loading…</div>;

  const goToHackathon = () => router.push(`/hackathons/${id}`);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
      <div className="page-head">
        <div>
          <h1>Team details</h1>
          <p>
            You joined <strong>{h.title}</strong>. Enter your team name and the name + phone of every
            member ({h.minTeamSize}–{h.maxTeamSize} members).
          </p>
        </div>
      </div>

      <TeamPanel
        hackathonId={id}
        minTeamSize={h.minTeamSize}
        maxTeamSize={h.maxTeamSize}
        status={statusOf(h)}
        onRegistered={goToHackathon}
      />

      <Link href={`/hackathons/${id}`} className="btn secondary">
        Skip for now
      </Link>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Guard role="participant">
      <TeamStep />
    </Guard>
  );
}