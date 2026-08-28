"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useQuality } from "@/lib/quality";

/** Each line completes as load progress crosses its threshold. */
const CHECKS = [
  { at: 12, label: "BAY.PWR", ok: "ONLINE" },
  { at: 38, label: "FLOOR.GRID", ok: "MAPPED" },
  { at: 62, label: "HOIST.SYNC", ok: "LOCKED" },
  { at: 84, label: "TELEMETRY", ok: "STREAMING" },
  { at: 100, label: "BAY.READY", ok: "GO" },
];

/**
 * Boot overlay: a schematic self-test that covers scene load, then lifts.
 *
 * Only ever shown when a canvas is actually mounting — `booted` is pre-set for
 * the reduced-motion / no-WebGL tier, so those users never see it.
 */
export function BootLoader() {
  const ready = useQuality((s) => s.ready);
  const tier = useQuality((s) => s.tier);
  const progress = useQuality((s) => s.progress);
  const booted = useQuality((s) => s.booted);
  const setBooted = useQuality((s) => s.setBooted);
  const setUncovered = useQuality((s) => s.setUncovered);

  /**
   * The displayed value is driven on a floor that climbs on its own, not
   * straight off `progress`. The scene usually loads in well under a second,
   * and a bar that flashes "000%" and disappears reads as a glitch rather than
   * a boot sequence — so the readout always plays through its checks.
   */
  const [shown, setShown] = useState(0);
  const raf = useRef(0);
  const start = useRef(0);
  const MIN_MS = 1400;

  // Keep the latest progress readable from inside the rAF loop without
  // restarting it (which would reset the timing floor).
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    start.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start.current;
      const floor = Math.min(100, (elapsed / MIN_MS) * 100);
      // Never run ahead of real load, never stall behind the floor.
      const target = Math.min(progressRef.current, floor);
      setShown((s) => s + (target - s) * 0.18);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    if (shown < 99.5) return;
    // Hold briefly at 100 so the completed readout is legible.
    const t = setTimeout(setBooted, 500);
    return () => clearTimeout(t);
  }, [shown, setBooted]);

  // Never let a stalled loader trap the page.
  useEffect(() => {
    const t = setTimeout(setBooted, 8000);
    return () => clearTimeout(t);
  }, [setBooted]);

  const visible = ready && tier !== "off" && !booted;

  return (
    /*
     * onExitComplete is the moment the hero is genuinely on screen, which is
     * later than `booted` by the length of the fade. Anything timed to be read
     * by a visitor keys off this.
     */
    <AnimatePresence onExitComplete={setUncovered}>
      {visible && (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-void"
          role="status"
          aria-live="polite"
          aria-label="Loading scene"
        >
          <div className="w-[min(90vw,26rem)] font-mono text-[11px] leading-relaxed">
            {CHECKS.map((c) => {
              const done = shown >= c.at;
              return (
                <div
                  key={c.label}
                  className={`flex items-baseline gap-2 transition-colors duration-300 ${
                    done ? "text-ink-dim" : "text-ink-dim/25"
                  }`}
                >
                  <span className={done ? "text-arc" : "text-line"}>›</span>
                  <span className="tracking-[0.08em]">{c.label}</span>
                  {/* A flexible rule rather than dot characters: leader dots
                      only align under a monospace face. */}
                  <span
                    aria-hidden="true"
                    className="mx-1 h-px flex-1 self-center border-b border-dotted border-line"
                  />
                  <span
                    className={`tracking-[0.08em] ${done ? "text-cyan" : "text-line"}`}
                  >
                    {done ? c.ok : "····"}
                  </span>
                </div>
              );
            })}

            {/* Progress rail */}
            <div className="mt-6 flex items-center gap-3">
              <div className="relative h-px flex-1 bg-line/60">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-arc"
                  style={{ width: `${Math.min(100, shown)}%` }}
                />
              </div>
              <span className="tabular-nums text-arc">
                {String(Math.round(Math.min(100, shown))).padStart(3, "0")}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
