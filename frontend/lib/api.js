// 
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("hm_token");

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (e) {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Something went wrong");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const fmtDate = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const statusOf = (h) => {
  const now = new Date();
  if (now < new Date(h.startDate)) return "upcoming";
  if (now > new Date(h.endDate)) return "ended";
  return "live";
};

export const teamApi = {
  list: (hid) => api(`/hackathons/${hid}/teams`),
  create: (hid, payload) => api(`/hackathons/${hid}/teams`, { method: "POST", body: payload }),
  join: (inviteCode) => api(`/teams/join`, { method: "POST", body: { inviteCode } }),
  leave: (teamId) => api(`/teams/${teamId}/leave`, { method: "POST" }),
};