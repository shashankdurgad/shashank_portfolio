import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Monogram favicon, in the header's mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0b",
          color: "#f4f4f2",
          fontSize: 34,
          fontWeight: 600,
          borderRadius: 14,
          letterSpacing: -1,
        }}
      >
        sd<span style={{ color: "#d99a2b" }}>/</span>
      </div>
    ),
    size,
  );
}
