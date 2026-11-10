import { statusOf } from "@/lib/api";

export default function StatusBadge({ hackathon }) {
  const s = statusOf(hackathon);
  return <span className={`badge ${s}`}>{s}</span>;
}
