import { useEffect, useRef, useState, useCallback } from "react";

// OKLCH → OKLab → Linear sRGB → sRGB
function oklchToRgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab → LMS (cube root space)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // Cube to get LMS
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS → Linear sRGB
  let r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bv = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const inGamut = r >= -0.0001 && r <= 1.0001 && g >= -0.0001 && g <= 1.0001 && bv >= -0.0001 && bv <= 1.0001;

  // Gamma encode (sRGB)
  const gamma = (c) => {
    c = Math.max(0, Math.min(1, c));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  return {
    r: gamma(r),
    g: gamma(g),
    b: gamma(bv),
    inGamut,
  };
}

function rgbToHex(r, g, b) {
  const h = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

const W = 320;
const H_CANVAS = 280;
const MAX_CHROMA = 0.37;

export default function OKLCHPicker() {
  const canvasRef = useRef(null);
  const [hue, setHue] = useState(200);
  const [selected, setSelected] = useState({ x: 260, y: 80 });
  const [isDragging, setIsDragging] = useState(false);

  const getColorAt = useCallback((x, y) => {
    const C = (x / W) * MAX_CHROMA;
    const L = 1 - y / H_CANVAS;
    return { L, C, H: hue, ...oklchToRgb(L, C, hue) };
  }, [hue]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(W, H_CANVAS);
    const data = imageData.data;

    for (let py = 0; py < H_CANVAS; py++) {
      for (let px = 0; px < W; px++) {
        const idx = (py * W + px) * 4;
        const C = (px / W) * MAX_CHROMA;
        const L = 1 - py / H_CANVAS;
        const { r, g, b, inGamut } = oklchToRgb(L, C, hue);

        if (!inGamut) {
          // Out of gamut: subtle crosshatch pattern
          const checker = (Math.floor(px / 4) + Math.floor(py / 4)) % 2;
          const v = checker ? 40 : 30;
          data[idx] = v; data[idx+1] = v; data[idx+2] = v; data[idx+3] = 255;
        } else {
          data[idx]   = Math.round(r * 255);
          data[idx+1] = Math.round(g * 255);
          data[idx+2] = Math.round(b * 255);
          data[idx+3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [hue]);

  const selectedColor = getColorAt(selected.x, selected.y);
  const hexColor = rgbToHex(selectedColor.r, selectedColor.g, selectedColor.b);
  const oklchString = `oklch(${(selectedColor.L * 100).toFixed(1)}% ${selectedColor.C.toFixed(3)} ${hue}°)`;

  const handleCanvasInteract = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H_CANVAS / rect.height;
    const x = Math.max(0, Math.min(W - 1, (e.clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(H_CANVAS - 1, (e.clientY - rect.top) * scaleY));
    setSelected({ x, y });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0e0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0px", width: W }}>

        {/* Title */}
        <div style={{ color: "#555", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
          OKLCH Color Space · P3 Wide Gamut
        </div>

        {/* Canvas */}
        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H_CANVAS}
            style={{ display: "block", cursor: "crosshair", width: "100%", borderRadius: 3 }}
            onMouseDown={(e) => { setIsDragging(true); handleCanvasInteract(e); }}
            onMouseMove={(e) => { if (isDragging) handleCanvasInteract(e); }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          />

          {/* Axis labels */}
          <div style={{ position: "absolute", top: 4, left: 4, color: "rgba(255,255,255,0.25)", fontSize: 9, letterSpacing: "0.15em" }}>L=100%</div>
          <div style={{ position: "absolute", bottom: 4, left: 4, color: "rgba(255,255,255,0.25)", fontSize: 9, letterSpacing: "0.15em" }}>L=0%</div>
          <div style={{ position: "absolute", bottom: 4, right: 4, color: "rgba(255,255,255,0.25)", fontSize: 9, letterSpacing: "0.15em" }}>C=0.37</div>
          <div style={{ position: "absolute", top: 4, right: "50%", transform: "translateX(50%)", color: "rgba(255,255,255,0.2)", fontSize: 9, letterSpacing: "0.1em" }}>↔ chroma →</div>

          {/* Cursor */}
          <div style={{
            position: "absolute",
            left: `${(selected.x / W) * 100}%`,
            top: `${(selected.y / H_CANVAS) * 100}%`,
            transform: "translate(-50%, -50%)",
            width: 12, height: 12,
            borderRadius: "50%",
            border: `2px solid ${selectedColor.L > 0.5 ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)"}`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
            pointerEvents: "none",
            background: selectedColor.inGamut ? hexColor : "transparent",
          }} />

          {/* Out of gamut label */}
          <div style={{
            position: "absolute",
            top: "50%", left: "15%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.15)",
            fontSize: 9, letterSpacing: "0.1em",
            pointerEvents: "none",
          }}>
            OUT OF<br/>GAMUT
          </div>
        </div>

        {/* Hue slider */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#444", fontSize: 9, letterSpacing: "0.15em" }}>
            <span>HUE</span>
            <span>{hue}°</span>
          </div>
          <div style={{ position: "relative", height: 16 }}>
            <div style={{
              position: "absolute", top: 6, left: 0, right: 0, height: 4,
              borderRadius: 2,
              background: `linear-gradient(to right,
                oklch(65% 0.25 0), oklch(65% 0.25 30), oklch(65% 0.25 60),
                oklch(65% 0.25 90), oklch(65% 0.25 120), oklch(65% 0.25 150),
                oklch(65% 0.25 180), oklch(65% 0.25 210), oklch(65% 0.25 240),
                oklch(65% 0.25 270), oklch(65% 0.25 300), oklch(65% 0.25 330), oklch(65% 0.25 360))`,
            }} />
            <input
              type="range" min={0} max={360} value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              style={{
                position: "absolute", top: 0, left: 0, right: 0,
                width: "100%", opacity: 0, cursor: "pointer", height: 16,
              }}
            />
            {/* Thumb indicator */}
            <div style={{
              position: "absolute",
              left: `${(hue / 360) * 100}%`,
              top: 4, transform: "translateX(-50%)",
              width: 8, height: 8,
              borderRadius: "50%",
              background: `oklch(65% 0.25 ${hue})`,
              border: "1.5px solid rgba(255,255,255,0.5)",
              pointerEvents: "none",
            }} />
          </div>
        </div>

        {/* Color readout */}
        <div style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 4,
            background: selectedColor.inGamut ? hexColor : "#1a1a1a",
            border: "1px solid #2a2a2a",
            flexShrink: 0,
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.05em" }}>{oklchString}</div>
            <div style={{ color: "#555", fontSize: 10, letterSpacing: "0.08em" }}>
              {selectedColor.inGamut ? hexColor : "⚠ out of sRGB gamut"}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
