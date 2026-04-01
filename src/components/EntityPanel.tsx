"use client";

import { Entity, Relationship } from "@/types";

const TYPE_BADGES: Record<string, string> = {
  religion: "bg-amber-600/30 text-amber-300",
  figure: "bg-blue-600/30 text-blue-300",
  text: "bg-green-600/30 text-green-300",
  event: "bg-red-600/30 text-red-300",
  mystical_order: "bg-purple-600/30 text-purple-300",
  secret_society: "bg-purple-600/30 text-purple-300",
  military_order: "bg-red-700/30 text-red-300",
  place: "bg-orange-600/30 text-orange-300",
  motif: "bg-teal-600/30 text-teal-300",
  sect: "bg-yellow-600/30 text-yellow-300",
};

const CONFIDENCE_DISPLAY: Record<string, { label: string; color: string }> = {
  high: { label: "Well-documented", color: "text-green-400" },
  medium: { label: "Partially documented", color: "text-yellow-400" },
  low: { label: "Limited evidence", color: "text-orange-400" },
  none: { label: "No direct evidence", color: "text-red-400" },
};

interface Props {
  entity: Entity;
  relationships: Relationship[];
  entities: Entity[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}

export default function EntityPanel({ entity, relationships, entities, onClose, onNavigate }: Props) {
  const getEntityName = (id: string) => entities.find((e) => e.id === id)?.name || id;
  const conf = CONFIDENCE_DISPLAY[entity.confidence.historical_documentation];

  return (
    <div className="w-96 border-l border-gray-800 bg-[#0d0d14] overflow-y-auto shrink-0">
      {/* Header */}
      <div className="sticky top-0 bg-[#0d0d14] border-b border-gray-800 p-4 z-10">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{entity.name}</h2>
            {entity.aliases && entity.aliases.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                aka {entity.aliases.join(", ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_BADGES[entity.type] || "bg-gray-700 text-gray-300"}`}>
            {entity.type.replace(/_/g, " ")}
          </span>
          {entity.era && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
              {entity.era}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Summary */}
        <div>
          <p className="text-sm text-gray-300 leading-relaxed">{entity.summary}</p>
        </div>

        {/* Confidence */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Evidence</h3>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Documentation</span>
              <span className={conf.color}>{conf.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Scholarly consensus</span>
              <span className="text-gray-300">{entity.confidence.scholarly_consensus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Primary sources</span>
              <span className={entity.confidence.primary_source_available ? "text-green-400" : "text-red-400"}>
                {entity.confidence.primary_source_available ? "Available" : "Unavailable"}
              </span>
            </div>
          </div>
        </div>

        {/* Interpretations */}
        {entity.interpretations && Object.keys(entity.interpretations).length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Interpretations by Tradition
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(entity.interpretations).map(([tradition, text]) => (
                <div key={tradition} className="bg-gray-900/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-400 mb-1 capitalize">
                    {tradition.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships */}
        {relationships.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Connections ({relationships.length})
            </h3>
            <div className="flex flex-col gap-1">
              {relationships.map((r) => {
                const isSource = r.source === entity.id;
                const otherId = isSource ? r.target : r.source;
                const otherName = getEntityName(otherId);
                const label = r.type.replace(/_/g, " ");

                return (
                  <button
                    key={r.id}
                    onClick={() => onNavigate(otherId)}
                    className="text-left text-xs p-2 rounded hover:bg-gray-800 transition-colors group"
                  >
                    <span className="text-gray-500">
                      {isSource ? `${label} →` : `← ${label}`}
                    </span>{" "}
                    <span className="text-blue-400 group-hover:text-blue-300">
                      {otherName}
                    </span>
                    {r.summary && (
                      <p className="text-gray-600 mt-0.5">{r.summary}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags */}
        {entity.tags.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {entity.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {entity.sources && entity.sources.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Sources</h3>
            <ul className="text-xs text-gray-400 list-disc list-inside flex flex-col gap-0.5">
              {entity.sources.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Lenses */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Visible in Lenses</h3>
          <div className="flex gap-1">
            {entity.lens.map((l) => (
              <span
                key={l}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize"
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
