# CLAUDE.md — World Religion Web

## Project Overview

Interactive open-source knowledge graph mapping world religions, mystical traditions, sacred texts, and their interconnections. Deployed as a static Next.js app.

**Live**: https://world-religion-web.vercel.app
**Repo**: https://github.com/garrettdidit/world-religion-web (public)
**Local dev**: http://localhost:3200 (or Tailscale http://100.119.230.9:3200)

## Tech Stack

- **Next.js 16** + TypeScript + Tailwind CSS 4
- **Cytoscape.js** for graph visualization
- Static seed data in `src/data/seed.ts` — no database yet
- Deployed on **Vercel** (manual `vercel --prod`, GitHub auto-deploy not yet linked)

## Current State (as of 2026-04-01)

### Data: 105 entities, 64 relationships

| Category | Count | Details |
|----------|-------|---------|
| Religions | 3 | Judaism, Christianity, Islam |
| Figures | 6 | Abraham, Moses, Jesus, Mary, Solomon, Muhammad |
| Mystical traditions | 3 | Kabbalah, Sufism, Gnosticism |
| Military/fraternal orders | 3 | Freemasonry, Knights Templar, Hospitallers |
| Religious texts | 23 | Pyramid Texts through Guru Granth Sahib (see below) |
| Events/motifs | 3 | Crusades, Apocalypse motif, Temple of Solomon |
| Other (from v0.1 seed) | 64 | Remaining original entities |

### Texts (23 — richest content, all have links + citations)

Ordered oldest to newest:
- Pyramid Texts (c. 2400 BCE) — oldest known religious texts
- Epic of Gilgamesh (c. 2100 BCE)
- Coffin Texts (c. 2100 BCE)
- Book of the Dead (c. 1550 BCE)
- Rigveda (c. 1500 BCE)
- Avesta / Gathas (c. 1500 BCE)
- Upanishads (c. 800 BCE)
- Dao De Jing (c. 400 BCE)
- Dhammapada (c. 300 BCE)
- Dead Sea Scrolls (c. 250 BCE)
- Book of Enoch (c. 300 BCE)
- Bhagavad Gita (c. 200 BCE)
- Torah, New Testament, Quran, Nag Hammadi, Zohar
- Talmud, Sahih al-Bukhari, Sahih Muslim
- Gospel of Thomas, Corpus Hermeticum
- Guru Granth Sahib (1604 CE)

Every text entity has:
- `links[]` — open-source full texts (Sacred Texts Archive, Sefaria, Internet Archive, university digital libraries)
- `citations[]` — proper academic format (Author, Year, Publisher)
- `sources[]` — scholarly references
- `interpretations{}` — multi-tradition perspectives

### UI Features

- **Desktop**: 3-panel layout (sidebar filters, Cytoscape graph, entity detail panel)
- **Mobile** (< 768px): Full-screen graph, slide-out drawer sidebar, bottom sheet entity panel
- iPhone safe area insets (Dynamic Island, home indicator)
- 3 graph layouts (Concentric, Cose, Circle)
- 4 lens modes (All, Historical, Devotional, Esoteric)
- Path finder (BFS shortest path between any two nodes)
- Focus mode (1-hop / 2-hop neighborhood)
- Search with highlight
- URL state persistence (shareable links)
- Layout position snapshots in localStorage

### Entity Type System

30 entity types defined in `src/types/index.ts`:
`religion`, `denomination`, `sect`, `mystical_order`, `secret_society`, `military_order`, `figure`, `text`, `event`, `doctrine`, `symbol`, `place`, `motif`, `deity`, `concept`, `ritual`, `movement`, `practice`, `prophecy_text`, `accusation`, `transmission_event`, `disputed_attribution`, `polity`, `legal_tradition`, `lineage`, `artifact`, `institution`, `council`, `cosmological_concept`, `initiatory_grade`

Entity interface includes: `links?`, `citations?`, `sources?`, `interpretations?`, `confidence`, `evidence_level`, `lens[]`, `controversy_score?`, `visibility_level?`

## Key Files

| File | Purpose |
|------|---------|
| `src/data/seed.ts` | All entity + relationship data (single source of truth) |
| `src/types/index.ts` | TypeScript interfaces for Entity, Relationship, Claim, Source |
| `src/components/GraphExplorer.tsx` | Main graph component (~1700 lines) — handles desktop + mobile |
| `src/components/EntityPanel.tsx` | Entity detail panel (links, citations, sources, interpretations) |
| `src/components/graphExplorerState.ts` | URL state, localStorage persistence, layout snapshots |
| `src/app/globals.css` | Custom CSS (tooltips, drawer, bottom sheet, animations) |
| `src/app/layout.tsx` | Root layout with viewport-fit: cover for iPhone |

## Paperclip Research Pipeline

A "World Religion Web" company exists in Paperclip (http://127.0.0.1:3100) with 6 research agents that completed their first research sprint:

| Agent | Domain | Output |
|-------|--------|--------|
| Denominations Scholar | Christian/Islamic/Jewish denominations | `drafts/denominations_research.ts` |
| Figures Scholar | Religious figures | `drafts/figures_research.ts` |
| Events Scholar | Historical events | `drafts/events_research.ts` |
| Texts Scholar | Sacred texts | `drafts/texts_research.ts` |
| Eastern Scholar | Hinduism, Buddhism, Zoroastrianism, Sikhism | `drafts/eastern_research.ts` |
| Esoterica Scholar | Neoplatonism, Hermeticism, Alchemy, etc. | `drafts/esoterica_research.ts` |

Draft output location: `~/Desktop/World Religion Web/workspaces/02-content-research/drafts/`

**Status**: All 6 agents completed. Texts research has been merged into seed.ts. Other 5 domains have draft files ready to review and merge.

## What Still Needs to Happen

### Immediate (merge agent research)
- [ ] **Merge denominations** — 14 entities (Catholicism, Orthodoxy, Protestantism, Sunni, Shia, etc.) from `denominations_research.ts`
- [ ] **Merge figures** — 10 entities (Noah, David, Paul, Ali, Rumi, Maimonides, etc.) from `figures_research.ts`
- [ ] **Merge events** — 8 entities (Council of Nicaea, Great Schism, Reformation, etc.) from `events_research.ts`
- [ ] **Merge eastern religions** — 10 entities (Hinduism, Buddhism, Zoroastrianism, Sikhism + figures) from `eastern_research.ts`
- [ ] **Merge esoterica** — 6 entities (Neoplatonism, Hermeticism, Alchemy, etc.) from `esoterica_research.ts`
- [ ] Add `links[]` and `citations[]` to all merged entities (texts have them, others don't yet)

### v0.2 Targets (100 entities, 250 relationships)
- Currently at 105 entities / 64 relationships after texts expansion
- Merging the 5 remaining drafts adds ~48 entities and ~170 relationships → should exceed v0.2 targets
- QC pass needed: verify all IDs unique, all relationship source/target IDs resolve, no orphaned entities

### v0.3+ (from workspace briefs)
- Entity detail pages (`/entity/[slug]`)
- Interpretation depth (3+ tradition perspectives per shared figure)
- Temporal data (date_start/date_end on all historical entities)
- Top navigation bar + breadcrumbs
- URL-driven focus state for direct linking

### v0.4+
- Compare mode (side-by-side entity/tradition comparison)
- Advanced filter drawer (era, confidence, tradition, evidence level)
- Path finding UX improvements

### v0.5+
- Timeline view with zoomable era bands
- Temporal animation (watch graph evolve through centuries)

### v0.6+ (backend)
- Migrate from static seed.ts to Postgres (API contracts already designed in workspace 05)
- Prisma schema draft ready at `workspaces/05-backend-api/contracts/database/`
- OpenAPI spec ready at `workspaces/05-backend-api/contracts/api/openapi.json`
- Decision threshold for Neo4j: >2000 entities or deep path queries becoming core

### v0.7+ (agent pipeline)
- Automated Firecrawl-powered research agent (daily scout)
- Research → Normalize → Verify → Safety → Human Review pipeline
- Agent workspace page in UI

### Content Gaps (by domain)
- **Eastern religions**: No entities yet in seed (drafts ready)
- **Denominations**: Zero in seed (drafts ready)
- **Historical events**: Only Crusades in seed (drafts ready)
- **African/indigenous traditions**: Not yet researched
- **Chinese/Japanese religions**: Only Dao De Jing added
- **Interpretation depth**: Most entities have 1-2 perspectives, need 3+

## Workspace Reference

Master spec + agent workspaces: `~/Desktop/World Religion Web/`

| Workspace | Status |
|-----------|--------|
| 01-data-ontology | Complete — types, Zod validators, validation scripts |
| 02-content-research | Partial — drafts ready to merge, texts done |
| 03-graph-engine | 90% — core + v0.2 features, layout persistence needed |
| 04-ui-ux | 85% — pages scaffolded, mobile done, entity page next |
| 05-backend-api | Design-complete — OpenAPI, Prisma, DDL all ready |
| 06-agent-pipeline | Brief only — Paperclip agents created but no automation |
| 07-esoterica-special | 85% — sensitivity framework + source policy complete |

## Hard Rules

- Every entity needs: id, name, type, summary, traditions, confidence, evidence_level, lens, tags, sources
- Every entity needs at least 2 relationships
- Distinguish historical fact from tradition claims
- Academic sources required (Tier 1: Stanford Encyclopedia, Britannica, Oxford/Cambridge, university presses)
- Esoterica requires 5-axis classification (historicity, self-description, scholarly status, sensitivity, evidence quality)
- Never cite conspiracy media, antisemitic material, pseudoarchaeology
- Conspiracy narratives only as meta-claims: "Source X alleged Y about Group Z"
- Respect living traditions — use their own language for internal descriptions
- When scholars disagree, set `scholarly_consensus: "divided"` and represent the disagreement

## Deploy

```bash
# Local dev
npm run dev -- -p 3200

# Build check
npm run build

# Deploy to Vercel
vercel --prod

# Push to GitHub (auto-deploy not yet linked)
git push origin main
```
