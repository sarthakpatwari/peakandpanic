"use client";

import { useEffect, useRef } from "react";

interface GlowingWaveProgressProps {
    leftPercent: number;  // Dynamic receipts % (e.g., 72)
    rightPercent: number; // Dynamic fiscal deficit % (e.g., 28)
    leftLabel?: string;
    rightLabel?: string;
    className?: string;
}

export default function GlowingWaveProgress({
    leftPercent,
    rightPercent,
    leftLabel,
    rightLabel,
    className = "",
}: GlowingWaveProgressProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Normalize so the split adds up cleanly to 100
    const total = leftPercent + rightPercent || 100;
    const normalizedLeft = (leftPercent / total) * 100;

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        // Sparkle / Glitter particles
        interface Sparkle {
            xRatio: number;
            yRatio: number;
            size: number;
            alpha: number;
            alphaSpeed: number;
            speedX: number;
        }

        const sparkleCount = 35;
        const sparkles: Sparkle[] = [];

        for (let i = 0; i < sparkleCount; i++) {
            sparkles.push({
                xRatio: Math.random(),
                yRatio: Math.random(),
                size: Math.random() * 1.3 + 0.4,
                alpha: Math.random() * 0.7 + 0.1,
                alphaSpeed: (Math.random() * 0.01 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
                speedX: (Math.random() - 0.5) * 0.0004,
            });
        }

    // Continuous light rays that span seamlessly across the ENTIRE loading bar from 0 to width.
    // The wave math is continuous; the light spreads organically from the minutest center pixel outwards.
    interface ContinuousRay {
      freq: number;
      freq2: number;
      amp: number;
      offsetY: number;
      speed: number;
      phase: number;
      intensity: number; // Overall radiance factor
    }

    const continuousRays: ContinuousRay[] = [
      // Ray 1: Primary radiant wave - sweeping central light beam
      {
        freq: 0.016,
        freq2: 0.030,
        amp: 13.5,
        offsetY: 0,
        speed: 0.005,
        phase: 0.5,
        intensity: 1.0,
      },
      // Ray 2: Harmonic wave - flowing, dancing light beam
      {
        freq: 0.023,
        freq2: 0.038,
        amp: 11.5,
        offsetY: 3.0,
        speed: 0.0062,
        phase: 2.8,
        intensity: 0.78,
      },
      // Ray 3: Upper soft wave - gentle weaving light beam
      {
        freq: 0.014,
        freq2: 0.022,
        amp: 10.0,
        offsetY: -3.0,
        speed: 0.0042,
        phase: 4.2,
        intensity: 0.65,
      },
    ];

        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(container);

    // Cascading Gaussian dispersion layers: continuously spreads light outward pixel by pixel
    const dispersionLayers = [
      { width: 42, alphaFactor: 0.05, blur: 30 }, // Broad atmospheric illumination (fills the capsule chamber)
      { width: 28, alphaFactor: 0.09, blur: 22 }, // Soft glowing mist
      { width: 17, alphaFactor: 0.16, blur: 15 }, // Mid luminous body
      { width: 9,  alphaFactor: 0.28, blur: 9 },  // Radiant core mantle
      { width: 4.5,alphaFactor: 0.48, blur: 4 },  // Bright core stream
      { width: 1.6,alphaFactor: 0.85, blur: 2 },  // Minutest center pixel filament
    ];

    // Draw an individual continuous light ray with natural pixel-by-pixel light diffusion
    const drawContinuousRay = (
      r: ContinuousRay,
      width: number,
      height: number,
      splitX: number
    ) => {
      const centerY = height / 2 + r.offsetY;
      const splitRatio = Math.max(0.05, Math.min(0.95, splitX / width));

            // Compute continuous wave points across the ENTIRE width (0 to width)
            const points: { x: number; y: number }[] = [];
            for (let x = 0; x <= width; x += 2) {
                const y =
                    centerY +
                    Math.sin(x * r.freq - r.phase) * r.amp +
                    Math.cos(x * r.freq2 + r.phase * 0.6) * (r.amp * 0.3);
                points.push({ x, y });
            }

            const buildPath = () => {
                ctx.beginPath();
                for (let i = 0; i < points.length; i++) {
                    if (i === 0) ctx.moveTo(points[i].x, points[i].y);
                    else ctx.lineTo(points[i].x, points[i].y);
                }
            };

      // Render the cascading continuous dispersion from widest ambient glow down to minutest core
      dispersionLayers.forEach((layer) => {
        const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
        const a = layer.alphaFactor * r.intensity;

        // Smooth transition from Emerald to Amber across splitX
        strokeGrad.addColorStop(0, `rgba(16, 185, 129, ${a * 0.4})`);
        strokeGrad.addColorStop(Math.max(0, splitRatio * 0.5), `rgba(52, 211, 153, ${a * 0.95})`);
        strokeGrad.addColorStop(Math.max(0, splitRatio - 0.02), `rgba(110, 231, 183, ${a})`);
        strokeGrad.addColorStop(Math.min(1, splitRatio + 0.02), `rgba(253, 230, 138, ${a})`);
        strokeGrad.addColorStop(Math.min(1, splitRatio + (1 - splitRatio) * 0.5), `rgba(251, 191, 36, ${a * 0.95})`);
        strokeGrad.addColorStop(1, `rgba(245, 158, 11, ${a * 0.4})`);

        ctx.save();
        buildPath();
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = layer.width;
        ctx.shadowBlur = layer.blur;
        ctx.shadowColor = splitRatio > 0.5 ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      });

            // Smooth peaceful drift
            r.phase += r.speed;
        };

        const render = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            const splitX = (normalizedLeft / 100) * width;

            ctx.clearRect(0, 0, width, height);

            // --- Clip to Capsule Pill Shape ---
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0.5, 0.5, width - 1, height - 1, 16);
            ctx.clip();

      // --- Deep Dark Obsidian Base ---
      ctx.fillStyle = "#020504";
      ctx.fillRect(0, 0, width, height);

      // --- Additive Luminous Lighting (Only the spreading light illuminates the bar) ---
      ctx.globalCompositeOperation = "lighter";

      // 1. Natural Ambient Light Dispersion (Bathes the green and gold chambers softly in light)
      const greenChamber = ctx.createRadialGradient(
        splitX * 0.5, height * 0.5, 2,
        splitX * 0.5, height * 0.5, splitX * 0.65
      );
      greenChamber.addColorStop(0, "rgba(16, 185, 129, 0.18)");
      greenChamber.addColorStop(0.6, "rgba(16, 185, 129, 0.07)");
      greenChamber.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = greenChamber;
      ctx.fillRect(0, 0, splitX, height);

      const goldChamber = ctx.createRadialGradient(
        splitX + (width - splitX) * 0.5, height * 0.5, 2,
        splitX + (width - splitX) * 0.5, height * 0.5, (width - splitX) * 0.65
      );
      goldChamber.addColorStop(0, "rgba(245, 158, 11, 0.16)");
      goldChamber.addColorStop(0.6, "rgba(245, 158, 11, 0.06)");
      goldChamber.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = goldChamber;
      ctx.fillRect(splitX, 0, width - splitX, height);

      // 2. Continuous Organic Light Waves (Spreading from minutest center outward)
      continuousRays.forEach((ray) => drawContinuousRay(ray, width, height, splitX));

      // 3. Glitter Particles (Twinkling emerald on left, gold on right)
      sparkles.forEach((s) => {
        s.xRatio += s.speedX;
        if (s.xRatio < 0) s.xRatio = 1;
        if (s.xRatio > 1) s.xRatio = 0;

                s.alpha += s.alphaSpeed;
                if (s.alpha > 1) {
                    s.alpha = 1;
                    s.alphaSpeed = -Math.abs(s.alphaSpeed);
                } else if (s.alpha < 0.1) {
                    s.alpha = 0.1;
                    s.alphaSpeed = Math.abs(s.alphaSpeed);
                }

                const px = s.xRatio * width;
                const py = s.yRatio * height;
                const isLeft = px < splitX;

                ctx.save();
                ctx.globalAlpha = s.alpha;
                ctx.fillStyle = isLeft ? "#a7f3d0" : "#fef08a";
                ctx.shadowBlur = 8;
                ctx.shadowColor = isLeft ? "#10b981" : "#f59e0b";

                ctx.beginPath();
                ctx.arc(px, py, s.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.restore(); // Exit capsule clipping

            // --- Sleek Segment Borders & Center Divider ---
            // Left Emerald Segment Outer Frame
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(0.5, 0.5, splitX, height - 1, [16, 0, 0, 16]);
            ctx.strokeStyle = "rgba(52, 211, 153, 0.40)";
            ctx.lineWidth = 1;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(16, 185, 129, 0.35)";
            ctx.stroke();
            ctx.restore();

            // Right Amber Segment Outer Frame
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(splitX, 0.5, width - splitX - 1, height - 1, [0, 16, 16, 0]);
            ctx.strokeStyle = "rgba(251, 191, 36, 0.38)";
            ctx.lineWidth = 1;
            ctx.shadowBlur = 8;
            ctx.shadowColor = "rgba(245, 158, 11, 0.35)";
            ctx.stroke();
            ctx.restore();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            ro.disconnect();
        };
    }, [normalizedLeft]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-[54px] rounded-2xl select-none ${className}`}
        >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Percentage Numbers */}
            <div className="absolute inset-0 flex items-center justify-between pointer-events-none font-bold text-lg text-white">
                <div
                    style={{ width: `${normalizedLeft}%` }}
                    className="flex items-center justify-center text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] tracking-wide"
                >
                    {leftLabel ?? `${Math.round(leftPercent)}%`}
                </div>
                <div
                    style={{ width: `${100 - normalizedLeft}%` }}
                    className="flex items-center justify-center text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] tracking-wide"
                >
                    {rightLabel ?? `${Math.round(rightPercent)}%`}
                </div>
            </div>
        </div>
    );
}