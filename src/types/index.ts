// ── Entity Types ─────────────────────────────────────────────────────
// Includes original v0.1 types + all v0.2 ontology expansion types
export type EntityType =
  | "religion"
  | "denomination"
  | "sect"
  | "mystical_order"
  | "secret_society"
  | "military_order"
  | "figure"
  | "text"
  | "event"
  | "doctrine"
  | "symbol"
  | "place"
  | "motif"
  // v0.2 ontology additions
  | "deity"
  | "concept"
  | "ritual"
  | "movement"
  | "practice"
  | "prophecy_text"
  | "accusation"
  | "transmission_event"
  | "disputed_attribution"
  | "polity"
  | "legal_tradition"
  | "lineage"
  | "artifact"
  | "institution"
  | "council"
  | "cosmological_concept"
  | "initiatory_grade";

// ── Evidence & Lens ──────────────────────────────────────────────────
export type EvidenceLevel = "primary" | "secondary" | "legendary" | "esoteric" | "disputed";

export type Lens = "historical" | "devotional" | "esoteric" | "all";

// ── Governance & Status ──────────────────────────────────────────────
export type VisibilityLevel = "public" | "sensitive" | "restricted";
export type RecordStatus = "seed" | "proposed" | "reviewed" | "approved";
export type ReviewStatus = "unreviewed" | "in_review" | "approved" | "disputed";
export type TemporalPrecision = "exact" | "decade" | "century" | "era" | "mythic";

// ── Confidence ───────────────────────────────────────────────────────
export interface Confidence {
  historical_documentation: "high" | "medium" | "low" | "none";
  scholarly_consensus: "strong" | "divided" | "minority" | "absent";
  primary_source_available: boolean;
}

// ── Temporal Scope ───────────────────────────────────────────────────
export interface TemporalScope {
  start?: number;
  end?: number;
  precision: TemporalPrecision;
}

// ── Entity ───────────────────────────────────────────────────────────
export interface Entity {
  id: string;
  name: string;
  aliases?: string[];
  type: EntityType;
  subtype?: string;
  summary: string;
  traditions: string[];
  era?: string;
  date_start?: number;
  date_end?: number;
  time_precision?: TemporalPrecision;
  geography?: string[];
  coordinates?: [number, number][];
  tags: string[];
  controversy_score?: number;
  visibility_level?: VisibilityLevel;
  status?: RecordStatus;
  review_status?: ReviewStatus;
  created_by?: string;
  updated_by?: string;
  reviewed_by?: string;
  confidence: Confidence;
  evidence_level: EvidenceLevel;
  lens: Lens[];
  interpretations?: Record<string, string>;
  sources?: string[];
  links?: { label: string; url: string }[];
  citations?: string[];
}

// ── Relationship ─────────────────────────────────────────────────────
export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  summary?: string;
  confidence: "high" | "medium" | "low";
  lens: Lens[];
  evidence_level?: EvidenceLevel;
  source_refs?: string[];
  temporal_scope?: TemporalScope;
  status?: RecordStatus;
  review_status?: ReviewStatus;
}

// ── Claim ────────────────────────────────────────────────────────────
export type ClaimType = "doctrine" | "historical" | "legendary" | "esoteric" | "polemical" | "conspiracy";
export type DisputeStatus = "undisputed" | "contested" | "debunked";

export interface Claim {
  id: string;
  subject_entity_id: string;
  predicate: string;
  object_entity_id?: string;
  value?: string;
  claim_text: string;
  claim_type: ClaimType;
  asserted_by_tradition: string;
  contradicted_by: string[];
  source_refs: string[];
  evidence_level: EvidenceLevel;
  confidence: number;
  dispute_status: DisputeStatus;
  interpretation_mode: Lens;
}

// ── Source ────────────────────────────────────────────────────────────
export type SourceType = "scripture" | "academic" | "primary_historical" | "encyclopedia" | "commentary" | "esoteric_manual";
export type SourceRank = "primary" | "secondary" | "tertiary";

export interface Source {
  id: string;
  title: string;
  author: string;
  source_type: SourceType;
  primary_or_secondary: SourceRank;
  tradition_context?: string;
  url?: string;
  reliability_notes?: string;
  citation_format: string;
  published_year?: number;
}
