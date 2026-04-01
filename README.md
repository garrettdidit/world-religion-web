# World Religion Web

An open-source, interactive knowledge graph exploring relationships across world religions, mystical traditions, esoteric orders, secret societies, and civilizational history.

**This is not a static chart of world religions.** It's a multi-layered graph exploration engine where every node carries historical context, scholarly evidence, tradition-specific interpretations, and epistemic confidence ratings.

![Status](https://img.shields.io/badge/status-early%20alpha-orange)

## What It Does

- **Graph Exploration** — Interactive force-directed network visualization of religions, figures, texts, orders, and their relationships
- **Multi-Lens Viewing** — Switch between Historical, Devotional, and Esoteric lenses to see the same entities from different perspectives
- **Epistemic Honesty** — Every node carries confidence ratings, source references, and explicit distinction between documented history, internal belief claims, legendary material, and scholarly interpretation
- **Tradition-Specific Interpretations** — See how Abraham, Jesus, Solomon, and others are understood differently across Judaism, Christianity, Islam, Gnosticism, and esoteric traditions
- **Rich Detail Panels** — Click any node to see its full profile: summary, evidence level, interpretations by tradition, connections, sources, and tags

## Current Seed Data (v0.1 — Abrahamic Core)

- **3 major religions**: Judaism, Christianity, Islam
- **6 key figures**: Abraham, Moses, Jesus, Mary, Solomon, Muhammad
- **5 texts**: Torah, New Testament, Quran, Zohar, Nag Hammadi Library
- **Mystical layers**: Kabbalah, Sufism, Gnosticism
- **Fraternal/Military orders**: Freemasonry, Knights Templar, Knights Hospitaller
- **Motifs & places**: Apocalypse/End Times, Temple of Solomon, The Crusades
- **37 relationships** with edge types like `foundational_to`, `venerated_by`, `diverges_from`, `borrows_symbolism_from`, `symbolically_adopted_by`

## The Vision

This project aims to become a **civilization-scale knowledge graph** covering:

- All major world religions and their branches, denominations, and reform movements
- Shared prophets, saints, mystics, and contested figures
- Sacred texts, apocrypha, commentaries, and suppressed writings
- Esoteric, mystical, and initiatory traditions
- Secret societies, fraternal orders, and mystery schools
- Religious-military orders and political institutions
- Heresies, schisms, councils, and doctrinal contradictions
- Geographic spread, historical transmission, conquest, and syncretism
- Comparative themes: prophecy, salvation, apocalypse, sacred violence, hidden knowledge

The system distinguishes between:
- Historical fact
- Internal belief claims
- Symbolic interpretation
- Polemical accusations
- Legendary or mythic layers
- Scholarly disputes

## Tech Stack

- **Next.js** + TypeScript + Tailwind CSS
- **Cytoscape.js** for graph rendering
- Static seed data (JSON/TypeScript) — no database required for MVP

## Getting Started

```bash
git clone https://github.com/garrettdidit/world-religion-web.git
cd world-religion-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start exploring.

## Contributing

This is an open-source passion project and contributions are very welcome. Here's how you can help:

### Adding Data
The seed dataset is in `src/data/seed.ts`. To add entities or relationships:
1. Follow the existing data model (see `src/types/index.ts`)
2. Every entity needs at minimum: confidence ratings, evidence level, at least one source
3. Clearly separate historical documentation from legendary or esoteric material
4. Submit a PR with your additions and the sources you used

### Types of contributions needed
- **Research** — Adding new entities, relationships, and source citations
- **Data quality** — Improving confidence ratings, adding missing interpretations
- **Visualization** — Better graph layouts, new view modes, UI improvements
- **New traditions** — Expanding beyond the Abrahamic core (Hinduism, Buddhism, Zoroastrianism, indigenous traditions, etc.)
- **Esoteric layers** — Carefully sourced additions for mystical, initiatory, and occult traditions
- **Bug fixes** — The usual

### Content Guidelines
- Cite your sources. No unsourced claims.
- Distinguish between "this tradition teaches X" and "X is historically documented"
- Don't flatten conspiracy theories into historical fact
- Don't sensationalize secret societies or esoteric traditions
- Respect living faiths — describe, don't diminish
- When scholarship disagrees, say so

## License

MIT

## Acknowledgments

Original spec concept by GPT 5.4, with amendments by Claude Sonnet 4.6, Gemini 3 Thinking, and Grok. Built and maintained by humans and AI agents working together.
