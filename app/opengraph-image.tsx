import { ImageResponse } from "next/og";
import { PROFILE, WINS } from "@/content/profile";

export const alt = `${PROFILE.name} — ${PROFILE.pitch}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card, rendered at build time from the same content the page uses,
 * so it cannot fall out of date. Built-in font only — fetching webfonts here
 * would make the build depend on the network.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0a0a0b",
          color: "#f4f4f2",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, color: "#6e6e76" }}>
          {PROFILE.location} · UCL Computer Science
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, letterSpacing: -3, lineHeight: 1 }}>{PROFILE.name}</div>
          <div style={{ marginTop: 28, fontSize: 36, color: "#a1a1a6", maxWidth: 900 }}>
            {PROFILE.pitch}
          </div>
        </div>
        <div style={{ display: "flex", gap: 36, fontSize: 22, color: "#a1a1a6" }}>
          {WINS.map((w) => (
            <div key={w.event} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: "#d99a2b" }}>{w.place}</span>
              <span>{w.event.replace(" Hackathon", "")}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
