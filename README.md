# shashank.dev — The Garage Bay

Personal portfolio. A single fixed WebGL scene — an engineering bay with a
telemetry wall and a machine on a hoist — sits behind server-rendered HTML.
The camera dollies through the bay as you scroll.

The metaphor is deliberately broad: an F1 pit wall and a Stark workshop are the
same room, an engineer instrumenting a machine and reading telemetry off it.
That covers agentic systems, RL, model training and data pipelines equally,
because all four are the same loop — instrument, measure, tune, repeat.

## Stack

Next 16 (App Router) · React 19 · TypeScript · Tailwind v4 · three / R3F / drei ·
GSAP ScrollTrigger · Motion · Lenis · Zustand

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Adding a project

Append one object to [`content/projects.ts`](content/projects.ts). Nothing else
needs editing — the card, its 3D wall readout, its camera stop and the page's
scroll length are all derived from this array.

```ts
{
  id: "my-project",
  title: "My Project",
  subtitle: "what it does",
  period: "Jan 2027",
  award: "optional",
  blurb: "One or two sentences.",
  bullets: ["Detail.", "Detail."],
  tags: ["Python", "PyTorch"],
  links: { repo: "...", paper: "..." },
  readout: { kind: "waveform", accent: "cyan", density: 0.8 },
}
```

`readout.kind` picks a 3D preset from the registry in
[`components/canvas/readouts/`](components/canvas/readouts/):

| kind | reads as |
|---|---|
| `waveform` | a live signal trace |
| `lattice` | node graph / swarm |
| `orbit` | orbital or cyclic system |
| `flow` | pipeline, funnel, directed flow |
| `bars` | throughput / histogram |
| `scatter` | dataset, embedding cloud |

If a preset isn't enough, pass a component instead — it renders through the same
path and receives the same `ReadoutProps`:

```ts
readout: { kind: "custom", component: MyScene }
```

Roles and skills work the same way via [`content/resume.ts`](content/resume.ts).

## Architecture notes

- **One canvas, mounted once** ([`SceneCanvas.tsx`](components/canvas/SceneCanvas.tsx)),
  fixed behind the page with `pointer-events: none`. Never remounted per section.
- **Text is real HTML**, not 3D meshes — so it's selectable, indexable and
  readable by screen readers. Verify with
  `curl -s localhost:3000 | grep -i overmind`.
- **Scroll never touches React state.** ScrollTrigger writes to a mutable object
  ([`lib/scrollStore.ts`](lib/scrollStore.ts)) that `useFrame` reads, keeping the
  per-frame path free of re-renders.
- **The camera path is generated**, not hand-tuned
  ([`lib/constants.ts`](lib/constants.ts)) — which is what makes adding a project
  free.
- **Quality tiers** ([`lib/quality.ts`](lib/quality.ts)): `high` / `low` /
  `off`. Under `prefers-reduced-motion` or without WebGL the canvas never mounts
  and a static schematic grid renders instead.
- **Boot sequence** ([`BootLoader.tsx`](components/ui/BootLoader.tsx)) covers
  scene load with a schematic self-test, then lifts and hands off to the hero.
  Progress crosses the R3F boundary via
  [`ProgressBridge`](components/canvas/ProgressBridge.tsx), since `useProgress`
  only works inside the Canvas. It is skipped entirely on the `off` tier — there
  is nothing to wait for — and has both a minimum display time (so a fast load
  doesn't flash) and a hard timeout (so a stalled one can't trap the page).

## Verified

Build, typecheck and lint clean; no console errors. Reduced-motion drops the
canvas with all copy intact and never shows the loader; 390px viewport has no
horizontal overflow and engages the low tier; 120fps scrolling under software
GL. The boot sequence plays its checks, lifts on its own, and hands off to a
fully-opaque hero. Adding a fourth project touches exactly one file and
lengthens the camera path automatically.
