"use client";

import { Entity, Relationship } from "@/types";

const TYPE_BADGES: Record<string, string> = {
  religion: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  figure: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  text: "bg-green-500/15 text-green-300 border-green-500/20",
  event: "bg-red-500/15 text-red-300 border-red-500/20",
  mystical_order: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  secret_society: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  military_order: "bg-red-700/15 text-red-300 border-red-700/20",
  place: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  motif: "bg-teal-500/15 text-teal-300 border-teal-500/20",
  sect: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
  deity: "bg-yellow-400/15 text-yellow-200 border-yellow-400/20",
  concept: "bg-teal-500/15 text-teal-300 border-teal-500/20",
  ritual: "bg-orange-500/15 text-orange-300 border-orange-500/20",
  movement: "bg-green-500/15 text-green-300 border-green-500/20",
  practice: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  prophecy_text: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  accusation: "bg-red-500/15 text-red-300 border-red-500/20",
  transmission_event: "bg-gray-500/15 text-gray-300 border-gray-500/20",
  disputed_attribution: "bg-gray-500/15 text-gray-300 border-gray-500/20",
  polity: "bg-amber-600/15 text-amber-300 border-amber-600/20",
  legal_tradition: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  lineage: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  artifact: "bg-amber-700/15 text-amber-200 border-amber-700/20",
  institution: "bg-slate-600/15 text-slate-300 border-slate-600/20",
  council: "bg-red-500/15 text-red-300 border-red-500/20",
  cosmological_concept: "bg-slate-700/15 text-slate-300 border-slate-700/20",
  initiatory_grade: "bg-purple-700/15 text-purple-300 border-purple-700/20",
};

const CONF_COLORS: Record<string, string> = {
  high: "text-emerald-400",
  medium: "text-yellow-400",
  low: "text-orange-400",
  none: "text-red-400",
};

const CONF_LABELS: Record<string, string> = {
  high: "Well-documented",
  medium: "Partial evidence",
  low: "Limited evidence",
  none: "No direct evidence",
};

const CONSENSUS_COLORS: Record<string, string> = {
  strong: "text-emerald-400",
  divided: "text-yellow-400",
  minority: "text-orange-400",
  absent: "text-red-400",
};

interface Props {
  entity: Entity;
  relationships: Relationship[];
  entities: Entity[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  mobile?: boolean;
}

// Group relationships by type for cleaner display
function groupRelationships(
  rels: Relationship[],
  entityId: string,
  entities: Entity[]
) {
  const groups: Record<
    string,
    { label: string; items: { id: string; name: string; summary?: string; outgoing: boolean }[] }
  > = {};

  for (const r of rels) {
    const outgoing = r.source === entityId;
    const otherId = outgoing ? r.target : r.source;
    const other = entities.find((e) => e.id === otherId);
    const label = r.type.replace(/_/g, " ");

    if (!groups[label]) groups[label] = { label, items: [] };
    groups[label].items.push({
      id: otherId,
      name: other?.name || otherId,
      summary: r.summary,
      outgoing,
    });
  }

  return Object.values(groups);
}

export default function EntityPanel({
  entity,
  relationships,
  entities,
  onClose,
  onNavigate,
  mobile = false,
}: Props) {
  const doc = entity.confidence.historical_documentation;
  const groups = groupRelationships(relationships, entity.id, entities);

  return (
    <div className={mobile ? "flex flex-col flex-1 overflow-y-auto bg-[#0a0a12]" : "w-[380px] border-l border-gray-800/50 bg-[#0a0a12]/95 backdrop-blur overflow-y-auto shrink-0 flex flex-col"}>
      {/* Header */}
      <div className={`sticky top-0 bg-[#0a0a12]/98 backdrop-blur-sm border-b border-gray-800/40 z-10 ${mobile ? "p-3 pb-2" : "p-4 pb-3"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`font-bold text-white leading-tight truncate ${mobile ? "text-base" : "text-lg"}`}>
              {entity.name}
            </h2>
            {entity.aliases && entity.aliases.length > 0 && (
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {entity.aliases.join(" \u00B7 ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-white transition-colors p-1 -mt-0.5 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1L13 13M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              TYPE_BADGES[entity.type] || "bg-gray-700/30 text-gray-300 border-gray-600/20"
            }`}
          >
            {entity.type.replace(/_/g, " ")}
          </span>
          {entity.era && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800/40 text-gray-500 border border-gray-700/20">
              {entity.era}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Summary */}
        <p className="text-[13px] text-gray-300 leading-relaxed">{entity.summary}</p>

        {/* Evidence card */}
        <div className="bg-gray-900/40 rounded-lg p-3 border border-gray-800/30">
          <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
            Evidence Quality
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
            <span className="text-gray-500">Documentation</span>
            <span className={`text-right ${CONF_COLORS[doc]}`}>{CONF_LABELS[doc]}</span>

            <span className="text-gray-500">Consensus</span>
            <span
              className={`text-right capitalize ${
                CONSENSUS_COLORS[entity.confidence.scholarly_consensus]
              }`}
            >
              {entity.confidence.scholarly_consensus}
            </span>

            <span className="text-gray-500">Primary sources</span>
            <span
              className={`text-right ${
                entity.confidence.primary_source_available
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {entity.confidence.primary_source_available ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>

        {/* Interpretations */}
        {entity.interpretations &&
          Object.keys(entity.interpretations).length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
                By Tradition
              </h3>
              <div className="flex flex-col gap-1.5">
                {Object.entries(entity.interpretations).map(([tradition, text]) => (
                  <details
                    key={tradition}
                    className="group bg-gray-900/30 rounded-lg border border-gray-800/20 overflow-hidden"
                  >
                    <summary className="px-3 py-2 cursor-pointer text-[11px] font-medium text-amber-400/80 hover:text-amber-300 transition-colors flex items-center justify-between capitalize select-none">
                      {tradition.replace(/_/g, " ")}
                      <svg
                        className="w-3 h-3 text-gray-600 group-open:rotate-180 transition-transform"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </summary>
                    <p className="px-3 pb-2.5 text-[11px] text-gray-400 leading-relaxed">
                      {text}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

        {/* Connections (grouped) */}
        {groups.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
              Connections ({relationships.length})
            </h3>
            <div className="flex flex-col gap-2">
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1 px-1">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item, i) => (
                      <button
                        key={`${item.id}-${i}`}
                        onClick={() => onNavigate(item.id)}
                        className="text-left text-[11px] px-2.5 py-1.5 rounded-md hover:bg-gray-800/50 transition-colors group flex items-center gap-1.5"
                      >
                        <span className="text-gray-600 text-[10px]">
                          {item.outgoing ? "\u2192" : "\u2190"}
                        </span>
                        <span className="text-blue-400 group-hover:text-blue-300 transition-colors">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {entity.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800/40 text-gray-500 border border-gray-700/20"
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {entity.links && entity.links.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
              Read & Explore
            </h3>
            <div className="flex flex-col gap-1">
              {entity.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] px-2.5 py-1.5 rounded-md bg-gray-900/40 border border-gray-800/30 hover:border-amber-500/30 hover:bg-gray-800/40 transition-colors flex items-center gap-2 group"
                >
                  <svg className="w-3 h-3 text-gray-600 group-hover:text-amber-400 shrink-0 transition-colors" fill="none" viewBox="0 0 12 12">
                    <path d="M5 1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7M7 1h4v4M11 1 5.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-blue-400 group-hover:text-blue-300 transition-colors">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Citations */}
        {entity.citations && entity.citations.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
              Academic Citations
            </h3>
            <div className="flex flex-col gap-1.5">
              {entity.citations.map((c, i) => (
                <p key={i} className="text-[10px] text-gray-500 leading-relaxed pl-3 border-l-2 border-gray-800/40 italic">
                  {c}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {entity.sources && entity.sources.length > 0 && (
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">
              Sources
            </h3>
            <ul className="text-[11px] text-gray-500 flex flex-col gap-0.5">
              {entity.sources.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-gray-700 mt-0.5">&bull;</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lenses */}
        <div className="mt-auto pt-2">
          <div className="flex gap-1 items-center">
            <span className="text-[10px] text-gray-700 mr-1">Visible in:</span>
            {entity.lens.map((l) => (
              <span
                key={l}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/30 text-gray-600 capitalize"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
