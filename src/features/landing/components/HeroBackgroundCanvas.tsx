import React, { useEffect, useRef } from 'react';

interface DataPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  color: string;
}

interface TechnicalWave {
  yOffset: number;
  amplitude: number;
  wavelength: number;
  speed: number;
  phase: number;
  color: string;
}

export const HeroBackgroundCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Subtle data points in muted olive, soft sage, warm taupe, and champagne
    const particleCount = Math.min(28, Math.max(14, Math.floor((width * height) / 50000)));
    const particles: DataPoint[] = [];
    const colorPalette = [
      'rgba(133, 134, 107, ', // Muted olive
      'rgba(168, 177, 154, ', // Soft sage
      'rgba(197, 173, 130, ', // Champagne accent
      'rgba(183, 170, 152, ', // Warm taupe
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0.04 : 0.18),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0.04 : 0.18),
        radius: Math.random() * 1.5 + 1.2,
        baseAlpha: Math.random() * 0.3 + 0.25,
        color: colorPalette[i % colorPalette.length],
      });
    }

    // Delicate harmonic technical curves in warm neutrals
    const waves: TechnicalWave[] = [
      {
        yOffset: 0.28,
        amplitude: 14,
        wavelength: 550,
        speed: 0.00035,
        phase: 0,
        color: 'rgba(168, 177, 154, 0.22)', // Soft sage
      },
      {
        yOffset: 0.55,
        amplitude: 18,
        wavelength: 720,
        speed: -0.00028,
        phase: 1.5,
        color: 'rgba(183, 170, 152, 0.20)', // Warm taupe
      },
      {
        yOffset: 0.78,
        amplitude: 12,
        wavelength: 480,
        speed: 0.00042,
        phase: 3.14,
        color: 'rgba(197, 173, 130, 0.24)', // Champagne
      },
    ];

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min(time - lastTime, 64);
      lastTime = time;

      // Clear with transparent overlay so the warm cream CSS background shines through
      ctx.clearRect(0, 0, width, height);

      // 1. Subtle warm ambient radial highlight in center-right
      const radialGrad = ctx.createRadialGradient(
        width * 0.7,
        height * 0.45,
        50,
        width * 0.7,
        height * 0.45,
        width * 0.6
      );
      radialGrad.addColorStop(0, 'rgba(251, 249, 244, 0.55)'); // Soft ivory
      radialGrad.addColorStop(1, 'rgba(245, 241, 232, 0)'); // Fade to cream
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw fine technical harmonic lines
      waves.forEach((wave) => {
        if (!prefersReducedMotion) {
          wave.phase += wave.speed * delta;
        }

        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 1;

        const baseHeight = height * wave.yOffset;
        for (let x = 0; x <= width; x += 12) {
          const y = baseHeight + Math.sin(x / wave.wavelength + wave.phase) * wave.amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // 3. Connect close data nodes with subtle sage/olive lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.16;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(168, 177, 154, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 4. Update and render data points
      particles.forEach((p) => {
        if (!prefersReducedMotion) {
          p.x += p.vx * (delta / 16);
          p.y += p.vy * (delta / 16);

          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.baseAlpha})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none w-full h-full ${className}`}
    />
  );
};
