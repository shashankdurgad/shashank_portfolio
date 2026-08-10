# Content archive

Everything that lived in `content/resume.ts` and `content/projects.ts` before the
work / education / projects sections were removed. Preserved verbatim so the UX can be
rebuilt from here.

The `readout` fields are recorded too — they named a 3D visualisation preset per role and
project (`waveform`, `bars`, `orbit`, `lattice`, `flow`). That registry was deleted along
with the telemetry wall; the values are kept in case the idea returns.

---

## Profile

- **Name**: Shashank Durgad
- **Tagline**: agentic AI systems and the infra that make them measurably better
- **Blurb**: CS at UCL, SWE intern at Overmind. I build agentic systems and the
  measurement layer around them — traces, evals, and the pipelines that turn both into
  better models.
- **Location**: London, UK
- **Email**: shashankdurgad@gmail.com
- **Phone**: +44 7440351581
- **GitHub**: https://github.com/shashankdurgad
- **LinkedIn**: https://linkedin.com/in/shashank-durgad

**Interests**: agentic systems · reinforcement learning · model training · data pipelining

---

## Experience

### Overmind — Software Engineering Intern
`id: overmind` · Jul 2026 — Present · London, UK
*readout: waveform, accent arc, density 1, seed 5*

**Stack**: Python, TypeScript, Django, Docker, OpenTelemetry, PostgreSQL, Cursor SDK

- Ran end-to-end agent optimisation experiments on the Overmind platform, driving
  iterative prompt/tool/logic improvements through a state-machine-based optimiser with
  automated eval scoring.
- Working full-stack on the agent improvement pipeline — from trace/dataset ingestion and
  data engineering through agentic optimisation experiments, model fine-tuning and
  production rollout.

### Onflow — Founding Engineer (AI and Growth)
`id: onflow-role` · Oct 2025 — Jul 2026 · London, UK
*readout: bars, accent cyan, density 0.8, seed 17*

**Stack**: Next.js, GitHub API, Playwright, LangChain, Gemini CLI

- Won 1st Place at the Bloomsbury Startup Academy Demo Day; 2nd Place at the Gemini 3
  London Hackathon, judged by Google and industry leaders.
- Architected an agentic platform using LangChain to simulate user behaviour and generate
  actionable feedback, with Playwright for browser automation.
- Authored a white paper on simulated agentic web-use interaction.

---

## Education

### University College London
`id: ucl` · Sep 2025 — Jun 2028 · London, UK
**BSc Computer Science — Predicted First Class Honours**

- UCL Data Science Society — Vice-President
- UCL AI Society — First Year Representative
- Foundry Labs (Cohort 4) · Bloomsbury Startup Academy (Demo Day Winner)

### Anglo-Chinese School (Independent)
`id: acs` · Jan 2017 — Dec 2022 · Singapore
**International Baccalaureate — 42/45**

- Vice-Chairman, Robotics Technology Society
- Head of Operations, Young Entrepreneurs' Society

---

## Projects

### FIG.01 — Sentinel
`id: sentinel` · autonomous collision avoidance · Mar 2026
**Award**: Environment Track — NVIDIA GTC Hack for Impact
*readout: orbit, accent amber, density 0.85, seed 11*

A decentralised system where autonomous agents negotiate satellite collision avoidance
manoeuvres in seconds, reducing debris cascades.

- Agents powered by NVIDIA Nemotron 30B negotiate avoidance manoeuvres in seconds.
- Dual-path collision risk classifier pairing rule-based thresholds with an XGBoost model
  (8 features, 4 risk classes) to capture compound interactions beyond hard rules.
- Real-time feature extraction from live CelesTrak conjunction data and NOAA space weather
  feeds, serving inference via the XGBoost native API with a conservative max of ML and
  rule-based scores.

**Tags**: Python, XGBoost, NumPy, FastAPI, Pydantic

### FIG.02 — Sentrix
`id: sentrix` · multi-agent compliance monitoring · Feb – Mar 2026
**Award**: 1st Place — UCL BUILD AI Festival
*readout: lattice, accent cyan, density 1, seed 23*

A multi-agent AI compliance monitoring system, built around a patrol swarm that escalates
findings through a staged investigation pipeline.

- LangGraph and NVIDIA Nemotron drive a patrol swarm using pheromone-based sampling and
  quorum voting.
- A 4-stage investigation pipeline fed by an ETL layer ingesting raw agent outputs — A2A
  messages, emails, PRs, documents — into a central SQLite store backed by NetworkX for
  inter-agent graph analysis.
- Exposed via FastAPI + SSE with a React/TypeScript frontend for real-time threat
  monitoring.

**Tags**: Python, LangGraph, SQLite, NetworkX, FastAPI

> Note: the CV calls this project **AIEngine**; the GitHub profile README calls it
> **Sentrix**. Sentrix was used here as the more recent naming. Still unconfirmed.

### FIG.03 — Onflow
`id: onflow` · simulated agentic web use · Oct 2025 – Jul 2026
**Award**: 1st Place — Bloomsbury Startup Academy Demo Day
*readout: flow, accent arc, density 0.9, seed 37*
**Paper**: https://arxiv.org/abs/2604.09581

An agentic platform that simulates real user behaviour against a live product and turns
the traces into actionable UX feedback and codegen fixes.

- Architected a LangChain agent platform that simulates user behaviour and generates
  actionable feedback, with Playwright driving the browser and visualising agentic
  navigation.
- GitHub API and Gemini CLI close the loop with automated codegen fixes.
- Synthetic automated user testing drove a 30% conversion rate in preliminary beta.
- 2nd Place at the Gemini 3 London Hackathon (judged by Google and industry leaders);
  shortlisted for the Google AI Futures Fund interview.

**Tags**: Next.js, GitHub API, Playwright, LangChain, Gemini CLI

---

## Skills

**Languages** `id: languages`: Python, TypeScript, Swift, Java, C/C++, SQL, HTML/CSS

**AI / ML** `id: aiml`: LangGraph, LangChain, PyTorch, Scikit-learn, XGBoost, pandas,
NumPy, OpenCV, MediaPipe

**Frameworks & Tools** `id: tools`: Next.js, React, FastAPI, Django, SQLite, PostgreSQL,
NetworkX, Docker, Playwright, OpenTelemetry, Git, Figma
