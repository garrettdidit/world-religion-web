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
  | "motif";

export type EvidenceLevel = "primary" | "secondary" | "legendary" | "esoteric" | "disputed";

export type Lens = "historical" | "devotional" | "esoteric" | "all";

export interface Confidence {
  historical_documentation: "high" | "medium" | "low" | "none";
  scholarly_consensus: "strong" | "divided" | "minority" | "absent";
  primary_source_available: boolean;
}

export interface Entity {
  id: string;
  name: string;
  aliases?: string[];
  type: EntityType;
  summary: string;
  traditions: string[];
  era?: string;
  date_start?: number;
  date_end?: number;
  tags: string[];
  confidence: Confidence;
  evidence_level: EvidenceLevel;
  lens: Lens[];
  interpretations?: Record<string, string>;
  sources?: string[];
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  summary?: string;
  confidence: "high" | "medium" | "low";
  lens: Lens[];
}
