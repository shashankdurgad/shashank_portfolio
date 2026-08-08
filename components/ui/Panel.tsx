"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Corner brackets — the recurring schematic motif. */
function Brackets() {
  const arm = "absolute h-4 w-4 border-cyan/45";
  return (
    <>
      <span className={`${arm} left-0 top-0 border-l border-t`} />
      <span className={`${arm} right-0 top-0 border-r border-t`} />
      <span className={`${arm} bottom-0 left-0 border-b border-l`} />
      <span className={`${arm} bottom-0 right-0 border-b border-r`} />
    </>
  );
}

export function Panel({
  fig,
  label,
  children,
  className = "",
}: {
  fig?: string;
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={`relative border border-line/60 bg-panel/40 p-6 backdrop-blur-[2px] sm:p-8 ${className}`}
    >
      <Brackets />
      {(fig || label) && (
        <div className="mb-4 flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.22em]">
          {fig && <span className="text-arc">{fig}</span>}
          {label && <span className="text-ink-dim">{label}</span>}
        </div>
      )}
      {children}
    </motion.div>
  );
}

/** Section wrapper: consistent vertical rhythm and a numbered heading. */
export function Section({
  id,
  index,
  title,
  children,
}: {
  id: string;
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24 sm:px-8"
    >
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-arc">
            {index}
          </span>
          <span className="h-px flex-1 bg-line/70" />
        </div>
        <h2 className="font-display text-2xl font-medium uppercase tracking-[0.08em] text-ink sm:text-3xl">
          {title}
        </h2>
      </header>
      {children}
    </section>
  );
}
