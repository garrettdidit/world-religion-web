"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape, { Core, EventObject } from "cytoscape";
import { entities, relationships } from "@/data/seed";
import { Entity, Lens } from "@/types";
import EntityPanel from "./EntityPanel";

const TYPE_COLORS: Record<string, string> = {
  religion: "#e6a817",
  denomination: "#c4951a",
  sect: "#9e7a15",
  mystical_order: "#9b59b6",
  secret_society: "#8e44ad",
  military_order: "#c0392b",
  figure: "#3498db",
  text: "#2ecc71",
  event: "#e74c3c",
  doctrine: "#1abc9c",
  symbol: "#f39c12",
  place: "#d35400",
  motif: "#16a085",
};

const TYPE_SHAPES: Record<string, string> = {
  religion: "hexagon",
  figure: "ellipse",
  text: "rectangle",
  event: "diamond",
  mystical_order: "octagon",
  secret_society: "octagon",
  military_order: "pentagon",
  place: "star",
  motif: "round-triangle",
  sect: "round-hexagon",
};

const EDGE_COLORS: Record<string, string> = {
  parent_of: "#e6a817",
  influences: "#95a5a6",
  foundational_to: "#3498db",
  venerated_by: "#9b59b6",
  scripture_of: "#2ecc71",
  mystical_dimension_of: "#9b59b6",
  diverges_from: "#e74c3c",
  fought_in: "#c0392b",
  headquartered_at: "#d35400",
  symbolically_adopted_by: "#8e44ad",
  symbolically_central_to: "#8e44ad",
  borrows_symbolism_from: "#f39c12",
  sacred_to: "#e6a817",
  preserved_in: "#2ecc71",
  present_in: "#16a085",
  built: "#d35400",
  associated_with: "#95a5a6",
};

export default function GraphExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [activeLens, setActiveLens] = useState<Lens>("all");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const allTypes = Array.from(new Set(entities.map((e) => e.type))).sort();

  const buildElements = useCallback(() => {
    const filteredEntities = entities.filter((e) => {
      if (activeLens !== "all" && !e.lens.includes(activeLens)) return false;
      if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q)) ||
          (e.aliases && e.aliases.some((a) => a.toLowerCase().includes(q)))
        );
      }
      return true;
    });

    const entityIds = new Set(filteredEntities.map((e) => e.id));

    const filteredRels = relationships.filter((r) => {
      if (!entityIds.has(r.source) || !entityIds.has(r.target)) return false;
      if (activeLens !== "all" && !r.lens.includes(activeLens)) return false;
      return true;
    });

    const nodes = filteredEntities.map((e) => ({
      data: {
        id: e.id,
        label: e.name,
        type: e.type,
        color: TYPE_COLORS[e.type] || "#95a5a6",
        shape: TYPE_SHAPES[e.type] || "ellipse",
        size: e.type === "religion" ? 55 : e.type === "figure" ? 45 : 35,
      },
    }));

    const edges = filteredRels.map((r) => ({
      data: {
        id: r.id,
        source: r.source,
        target: r.target,
        label: r.type.replace(/_/g, " "),
        color: EDGE_COLORS[r.type] || "#555",
        confidence: r.confidence,
      },
    }));

    return [...nodes, ...edges];
  }, [activeLens, activeTypes, searchQuery]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "data(color)",
            shape: "data(shape)" as never,
            width: "data(size)",
            height: "data(size)",
            color: "#e0e0e0",
            "font-size": "11px",
            "text-outline-width": 2,
            "text-outline-color": "#111",
            "text-valign": "bottom",
            "text-margin-y": 5,
            "border-width": 2,
            "border-color": "#222",
            "transition-property": "background-color, border-color, width, height",
            "transition-duration": 200,
          } as never,
        },
        {
          selector: "node:active, node:selected",
          style: {
            "border-width": 3,
            "border-color": "#fff",
            "background-color": "data(color)",
          } as never,
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "data(color)",
            "target-arrow-color": "data(color)",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            opacity: 0.6,
            label: "data(label)",
            "font-size": "8px",
            color: "#888",
            "text-rotation": "autorotate",
            "text-outline-width": 1,
            "text-outline-color": "#111",
            "text-opacity": 0,
          } as never,
        },
        {
          selector: "edge:active, edge:selected",
          style: {
            "text-opacity": 1,
            opacity: 1,
            width: 3,
          } as never,
        },
        {
          selector: ".highlighted",
          style: {
            "border-color": "#fff",
            "border-width": 3,
          } as never,
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.15,
          } as never,
        },
        {
          selector: ".neighbor-edge",
          style: {
            opacity: 1,
            width: 2.5,
            "text-opacity": 1,
          } as never,
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        gravity: 0.3,
        padding: 50,
      } as never,
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cy.on("tap", "node", (evt: EventObject) => {
      const nodeId = evt.target.id();
      const entity = entities.find((e) => e.id === nodeId);
      if (entity) setSelected(entity);

      // Highlight neighborhood
      cy.elements().removeClass("highlighted dimmed neighbor-edge");
      const neighborhood = evt.target.neighborhood();
      cy.elements().addClass("dimmed");
      evt.target.removeClass("dimmed").addClass("highlighted");
      neighborhood.removeClass("dimmed");
      neighborhood.edges().addClass("neighbor-edge");
    });

    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelected(null);
        cy.elements().removeClass("highlighted dimmed neighbor-edge");
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [buildElements]);

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const lenses: { value: Lens; label: string }[] = [
    { value: "all", label: "All Layers" },
    { value: "historical", label: "Historical" },
    { value: "devotional", label: "Devotional" },
    { value: "esoteric", label: "Esoteric" },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0f] text-gray-200">
      {/* Left sidebar - controls */}
      <div className="w-64 border-r border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div>
          <h1 className="text-xl font-bold text-amber-400 mb-1">World Religion Web</h1>
          <p className="text-xs text-gray-500">Interactive Knowledge Graph</p>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Lens selector */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Lens</h3>
          <div className="flex flex-col gap-1">
            {lenses.map((l) => (
              <button
                key={l.value}
                onClick={() => setActiveLens(l.value)}
                className={`text-left text-sm px-3 py-1.5 rounded transition-colors ${
                  activeLens === l.value
                    ? "bg-amber-600/30 text-amber-300 border border-amber-600/50"
                    : "hover:bg-gray-800 text-gray-400"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filters */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Node Types</h3>
          <div className="flex flex-col gap-1">
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`text-left text-sm px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${
                  activeTypes.size === 0 || activeTypes.has(type)
                    ? "text-gray-200"
                    : "text-gray-600"
                } hover:bg-gray-800`}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[type] || "#555" }}
                />
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-auto pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-600">
            {entities.length} entities &middot; {relationships.length} relationships
          </p>
          <p className="text-xs text-gray-600 mt-1">Seed v0.1 &middot; Abrahamic Core</p>
        </div>
      </div>

      {/* Graph area */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur rounded-lg p-3 text-xs">
          <p className="text-gray-400 mb-1">Click a node to explore. Click empty space to reset.</p>
          <p className="text-gray-500">Scroll to zoom. Drag to pan. Drag nodes to rearrange.</p>
        </div>
      </div>

      {/* Right panel - entity detail */}
      {selected && (
        <EntityPanel
          entity={selected}
          relationships={relationships.filter(
            (r) => r.source === selected.id || r.target === selected.id
          )}
          entities={entities}
          onClose={() => {
            setSelected(null);
            cyRef.current?.elements().removeClass("highlighted dimmed neighbor-edge");
          }}
          onNavigate={(id) => {
            const entity = entities.find((e) => e.id === id);
            if (entity) {
              setSelected(entity);
              const node = cyRef.current?.getElementById(id);
              if (node) {
                cyRef.current?.elements().removeClass("highlighted dimmed neighbor-edge");
                const neighborhood = node.neighborhood();
                cyRef.current?.elements().addClass("dimmed");
                node.removeClass("dimmed").addClass("highlighted");
                neighborhood.removeClass("dimmed");
                neighborhood.edges().addClass("neighbor-edge");
                cyRef.current?.animate({ center: { eles: node }, zoom: 1.5 } as never, { duration: 500 });
              }
            }
          }}
        />
      )}
    </div>
  );
}
