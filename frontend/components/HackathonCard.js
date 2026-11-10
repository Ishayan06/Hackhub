import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { fmtDate } from "@/lib/api";

export default function HackathonCard({ h }) {
  const id = h._id || h.id;
  return (
    <Link href={`/hackathons/${id}`} className="card hover">
      <div className="card-top">
        <h3>{h.title}</h3>
        <StatusBadge hackathon={h} />
      </div>
      <p className="desc">{h.description}</p>

      <div className="meta">
        <span>📅 {fmtDate(h.startDate)}</span>
        <span>👥 {h.teamCount ?? 0} / {h.maxTeams || "∞"} teams</span>
        <span>🌐 {h.mode}</span>
        {h.prize && <span>🏆 {h.prize}</span>}
        {h.maxTeamSize > 0 && (
          <span>
            🧑‍🤝‍🧑 {h.minTeamSize === h.maxTeamSize
              ? `Teams of ${h.maxTeamSize}`
              : `Teams of ${h.minTeamSize}–${h.maxTeamSize}`}
          </span>
        )}
      </div>

      {h.tags?.length > 0 && (
        <div className="tags">
          {h.tags.slice(0, 4).map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}
    </Link>
  );
}