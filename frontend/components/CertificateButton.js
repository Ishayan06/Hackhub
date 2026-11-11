"use client";

import { useState } from "react";

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function CertificateButton({ name, hackathon }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth(); // 297
      const H = doc.internal.pageSize.getHeight(); // 210
      const cx = W / 2;

      // Border
      doc.setDrawColor(124, 92, 255);
      doc.setLineWidth(2);
      doc.rect(8, 8, W - 16, H - 16);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, W - 24, H - 24);

      // Heading
      doc.setTextColor(40, 40, 70);
      doc.setFont("times", "bold");
      doc.setFontSize(38);
      doc.text("CERTIFICATE", cx, 42, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(124, 92, 255);
      doc.text("OF PARTICIPATION", cx, 53, { align: "center" });

      // Body
      doc.setTextColor(90, 90, 110);
      doc.setFontSize(14);
      doc.text("This is to certify that", cx, 75, { align: "center" });

      // Participant name (shrinks if too long)
      doc.setTextColor(30, 30, 60);
      doc.setFont("times", "bolditalic");
      let size = 40;
      doc.setFontSize(size);
      while (doc.getTextWidth(name) > W - 60 && size > 16) {
        size -= 2;
        doc.setFontSize(size);
      }
      doc.text(name, cx, 97, { align: "center" });
      doc.setDrawColor(150, 150, 170);
      doc.setLineWidth(0.4);
      doc.line(cx - 75, 102, cx + 75, 102);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(90, 90, 110);
      doc.text("has successfully participated in", cx, 116, { align: "center" });

      // Hackathon title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(30, 30, 60);
      const lines = doc.splitTextToSize(hackathon.title, W - 80);
      const ty = 130;
      doc.text(lines, cx, ty, { align: "center" });
      const after = ty + (lines.length - 1) * 10 + 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(90, 90, 110);
      doc.text(`held from ${fmt(hackathon.startDate)} to ${fmt(hackathon.endDate)}`, cx, after, {
        align: "center",
      });
      if (hackathon.maker?.name) {
        doc.text(`Organized by ${hackathon.maker.name}`, cx, after + 8, { align: "center" });
      }

      // Signature row
      doc.setDrawColor(150, 150, 170);
      doc.setLineWidth(0.4);
      doc.line(40, 175, 100, 175);
      doc.line(W - 100, 175, W - 40, 175);
      doc.setFontSize(11);
      doc.text(fmt(new Date()), 70, 182, { align: "center" });
      doc.text("Date of issue", 70, 188, { align: "center" });
      doc.text(hackathon.maker?.name || "Organizer", W - 70, 182, { align: "center" });
      doc.text("Organizer", W - 70, 188, { align: "center" });

      const safe = String(hackathon.title).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
      doc.save(`Certificate-${safe || "hackathon"}.pdf`);
    } catch (e) {
      setError("Could not generate the certificate. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error && <div className="alert error">{error}</div>}
      <button className="btn block" onClick={download} disabled={busy}>
        {busy ? "Preparing…" : "Download certificate"}
      </button>
    </>
  );
}