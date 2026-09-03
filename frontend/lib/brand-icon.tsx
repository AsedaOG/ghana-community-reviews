/**
 * Shared renderer for the app/apple icon routes — the Star Gate mark on a
 * solid Canopy square, per brand identity guidelines §03 ("App icon: mark
 * at 58% of the canvas, optically centred, on solid Canopy").
 */
export function StarGateIcon({ size }: { size: number }) {
  const scale = (size * 0.58) / 88;
  const gateWidth = 84 * scale;
  const gateHeight = 88 * scale;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1D3E26",
        borderRadius: size * 0.223,
      }}
    >
      <svg width={gateWidth} height={gateHeight} viewBox="0 0 84 88">
        <path
          d="M4.0,88.0 A4.0,4.0 0 0 1 0,84.0 L0,42.0 A42.0,42.0 0 0 1 84.0,42.0 L84.0,84.0 A4.0,4.0 0 0 1 80.0,88.0 Z"
          fill="#FFFFFF"
        />
        <path
          d="M42.000,20.000 L47.613,37.274 L65.776,37.275 L51.083,47.951 L56.695,65.225 L42.000,54.550 L27.305,65.225 L32.917,47.951 L18.224,37.275 L36.387,37.274 Z"
          fill="#E9C260"
        />
      </svg>
    </div>
  );
}
