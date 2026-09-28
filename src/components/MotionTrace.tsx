import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { hardwareService } from '../services/hardwareService';
import type { MotionSample } from '../types';

const WINDOW_MS = 10_000;
const MAX_G = 4;
const IMPACT_G = 2;
const FREEFALL_G = 0.4;

/**
 * Live acceleration magnitude from the band's MPU6050, drawn as a scrolling
 * trace. Free-fall dips and impact spikes are highlighted in red.
 */
export function MotionTrace({ offline, impact }: { offline: boolean; impact?: { g: number; at: string } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const buf = useRef<MotionSample[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => hardwareService.onMotion((b) => (buf.current = b)), []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let fresh = false;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const css = getComputedStyle(cv);
      const accent = css.getPropertyValue('--accent').trim() || '#3159e6';
      const danger = css.getPropertyValue('--danger').trim() || '#dc3345';
      const line = css.getPropertyValue('--line-strong').trim() || '#ccc';
      const muted = css.getPropertyValue('--muted').trim() || '#888';

      const top = 22;
      const bottom = h - 12;
      const y = (g: number) => bottom - (Math.min(g, MAX_G) / MAX_G) * (bottom - top);
      const now = Date.now();
      const x = (t: number) => ((t - (now - WINDOW_MS)) / WINDOW_MS) * w;

      // 1 g reference line (resting)
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y(1));
      ctx.lineTo(w, y(1));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = muted;
      ctx.font = '11px "Instrument Sans", sans-serif';
      ctx.fillText('1 g', 8, y(1) - 5);

      const pts = buf.current.filter((s) => s.t >= now - WINDOW_MS - 200);
      const isFresh = pts.length > 0 && now - pts[pts.length - 1].t < 2000;
      if (isFresh !== fresh) {
        fresh = isFresh;
        setHasData(isFresh);
      }
      if (pts.length < 2) return;

      // Soft fill under the trace
      const grad = ctx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, accent + '33');
      grad.addColorStop(1, accent + '00');
      ctx.beginPath();
      ctx.moveTo(x(pts[0].t), bottom);
      pts.forEach((p) => ctx.lineTo(x(p.t), y(p.g)));
      ctx.lineTo(x(pts[pts.length - 1].t), bottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // The trace, red where the reading is abnormal
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const abnormal = b.g > IMPACT_G || b.g < FREEFALL_G || a.g > IMPACT_G || a.g < FREEFALL_G;
        ctx.strokeStyle = abnormal ? danger : accent;
        ctx.beginPath();
        ctx.moveTo(x(a.t), y(a.g));
        ctx.lineTo(x(b.t), y(b.g));
        ctx.stroke();
      }

      // Mark the peak impact
      const peak = pts.reduce((m, p) => (p.g > m.g ? p : m), pts[0]);
      if (peak.g > IMPACT_G) {
        const px = x(peak.t);
        ctx.strokeStyle = danger;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(px, top - 6);
        ctx.lineTo(px, bottom);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = danger;
        ctx.beginPath();
        ctx.arc(px, y(peak.g), 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '600 12px "Instrument Sans", sans-serif';
        const label = `Impact ${peak.g.toFixed(1)} g`;
        const tw = ctx.measureText(label).width;
        ctx.fillText(label, Math.min(Math.max(px - tw / 2, 4), w - tw - 4), top - 10 < 14 ? y(peak.g) - 10 : top - 10);
      }

      // Live dot at the leading edge
      const last = pts[pts.length - 1];
      ctx.fillStyle = last.g > IMPACT_G || last.g < FREEFALL_G ? danger : accent;
      ctx.beginPath();
      ctx.arc(x(last.t), y(last.g), 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (readout.current) readout.current.textContent = `${last.g.toFixed(2)} g`;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="trace">
      <div className="trace-head">
        <span className="trace-label">
          <Activity size={14} aria-hidden="true" /> Live motion from the MPU6050, last 10 seconds
        </span>
        {impact && (
          <span className="trace-impact num">
            Peak impact {impact.g.toFixed(1)} g at {impact.at}
          </span>
        )}
        {hasData && (
          <span className="trace-readout num" aria-hidden="true">
            <span ref={readout}>1.00 g</span>
          </span>
        )}
      </div>
      <canvas ref={canvas} aria-label="Live acceleration trace from the band's motion sensor" role="img" />
      {!hasData && <div className="trace-empty">{offline ? 'No motion data while the band is offline' : 'Waiting for motion data'}</div>}
    </div>
  );
}
