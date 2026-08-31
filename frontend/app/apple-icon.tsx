import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#15803d",
          borderRadius: 42,
        }}
      >
        <svg width="112" height="112" viewBox="0 0 112 112" fill="none">
          <path
            d="M28 70c0-19 15-35 35-35 7 0 13 1 18 4-5 21-20 36-41 41-8-3-12-7-12-10Z"
            stroke="white"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M55 35c0 16 4 28 15 39"
            stroke="white"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
