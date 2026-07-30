import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export function HudBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    let raf = 0;
    let scan = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * window.devicePixelRatio;
      canvas.height = innerHeight * window.devicePixelRatio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

      if (particles.length === 0) {
        for (let index = 0; index < 28; index += 1) {
          particles.push({
            x: Math.random() * innerWidth,
            y: Math.random() * innerHeight,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.1,
            radius: 1 + Math.random() * 1.8,
          });
        }
      }
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(20, 255, 172, 0.04)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(42, 247, 198, 0.08)";
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y + scan);
        ctx.lineTo(width, y + scan);
        ctx.stroke();
      }

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        ctx.fillStyle = "rgba(42, 247, 198, 0.55)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < 160) {
            ctx.strokeStyle = `rgba(42, 247, 198, ${(160 - distance) / 160 / 3})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      scan = (scan + 1.1) % 48;
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-75" />
      <div className="scanline absolute inset-x-0 top-0" />
    </div>
  );
}