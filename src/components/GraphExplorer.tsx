"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape, { Core, EventObject, NodeSingular } from "cytoscape";
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

const LENS_ICONS: Record<string, string> = {
  all: "\u25C9",
  historical: "\u2693",
  devotional: "\u2727",
  esoteric: "\u2B23",
};

function getEntitySummaryShort(id: string): string {
  const e = entities.find((x) => x.id === id);
  if (!e) return "";
  const s = e.summary;
  return s.length > 120 ? s.slice(0, 117) + "..." : s;
}

export default function GraphExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selected, setSelected] = useState<Entity | null>(null);
  const [activeLens, setActiveLens] = useState<Lens>("all");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);

  const allTypes = Array.from(new Set(entities.map((e) => e.type))).sort();

  const buildElements = useCallback(() => {
    const filteredEntities = entities.filter((e) => {
      if (activeLens !== "all" && !e.lens.includes(activeLens)) return false;
      if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false;
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
        size: e.type === "religion" ? 60 : e.type === "figure" ? 48 : 36,
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
  }, [activeLens, activeTypes]);

  // Search highlight (non-destructive)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("search-match search-dim");

    if (searchQuery.trim()) {
      setSearchActive(true);
      const q = searchQuery.toLowerCase();
      cy.nodes().forEach((node) => {
        const id = node.id();
        const e = entities.find((x) => x.id === id);
        if (!e) return;
        const matches =
          e.name.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q)) ||
          (e.aliases && e.aliases.some((a) => a.toLowerCase().includes(q)));
        if (matches) {
          node.addClass("search-match");
        } else {
          node.addClass("search-dim");
        }
      });
      cy.edges().forEach((edge) => {
        const src = edge.source();
        const tgt = edge.target();
        if (src.hasClass("search-dim") && tgt.hasClass("search-dim")) {
          edge.addClass("search-dim");
        }
      });
    } else {
      setSearchActive(false);
    }
  }, [searchQuery]);

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
            "background-opacity": 0.85,
            shape: "data(shape)" as never,
            width: "data(size)",
            height: "data(size)",
            color: "#d0d0d0",
            "font-size": "11px",
            "font-weight": "500",
            "text-outline-width": 2.5,
            "text-outline-color": "#080810",
            "text-outline-opacity": 0.9,
            "text-valign": "bottom",
            "text-margin-y": 6,
            "border-width": 2,
            "border-color": "#1a1a2e",
            "border-opacity": 0.8,
            "transition-property":
              "background-color, border-color, width, height, opacity, background-opacity, border-width",
            "transition-duration": 200,
            "overlay-opacity": 0,
          } as never,
        },
        {
          selector: "node:active, node:selected",
          style: {
            "border-width": 3,
            "border-color": "#fff",
            "background-opacity": 1,
          } as never,
        },
        {
          selector: "edge",
          style: {
            width: 1.2,
            "line-color": "data(color)",
            "line-opacity": 0.35,
            "target-arrow-color": "data(color)",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.7,
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "7px",
            color: "#666",
            "text-rotation": "autorotate",
            "text-outline-width": 1.5,
            "text-outline-color": "#080810",
            "text-opacity": 0,
            "overlay-opacity": 0,
            "transition-property": "line-opacity, width, text-opacity",
            "transition-duration": 200,
          } as never,
        },
        {
          selector: "edge:active, edge:selected",
          style: {
            "text-opacity": 1,
            "line-opacity": 0.9,
            width: 2.5,
          } as never,
        },
        // Neighborhood highlighting
        {
          selector: ".highlighted",
          style: {
            "border-color": "#fff",
            "border-width": 3,
            "background-opacity": 1,
            "z-index": 10,
          } as never,
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.1,
          } as never,
        },
        {
          selector: ".neighbor",
          style: {
            opacity: 1,
            "background-opacity": 0.95,
            "border-width": 2,
            "border-color": "#444",
          } as never,
        },
        {
          selector: ".neighbor-edge",
          style: {
            opacity: 1,
            "line-opacity": 0.8,
            width: 2,
            "text-opacity": 1,
            color: "#aaa",
            "z-index": 5,
          } as never,
        },
        // Search highlighting
        {
          selector: ".search-match",
          style: {
            "border-color": "#e6a817",
            "border-width": 4,
            "background-opacity": 1,
            "z-index": 10,
          } as never,
        },
        {
          selector: ".search-dim",
          style: {
            opacity: 0.12,
          } as never,
        },
        // Hover glow
        {
          selector: ".hover-glow",
          style: {
            "border-color": "#e6a817",
            "border-width": 3,
            "background-opacity": 1,
          } as never,
        },
      ],
      layout: {
        name: "concentric",
        concentric: (node: NodeSingular) => {
          const type = node.data("type");
          if (type === "religion") return 5;
          if (type === "figure") return 4;
          if (type === "text" || type === "event") return 3;
          if (type === "mystical_order" || type === "sect") return 2;
          return 1;
        },
        levelWidth: () => 1,
        animate: true,
        animationDuration: 800,
        padding: 60,
        minNodeSpacing: 50,
      } as never,
      minZoom: 0.15,
      maxZoom: 4,
      wheelSensitivity: 0.25,
    });

    // Tooltip on hover
    const tooltip = tooltipRef.current;

    cy.on("mouseover", "node", (evt: EventObject) => {
      const node = evt.target;
      const id = node.id();
      const e = entities.find((x) => x.id === id);
      if (!e || !tooltip) return;

      node.addClass("hover-glow");

      // Show edge labels for connected edges
      node.connectedEdges().style("text-opacity", 1);
      node.connectedEdges().style("line-opacity", 0.7);

      const typeColor = TYPE_COLORS[e.type] || "#555";
      tooltip.innerHTML = `
        <h4>${e.name}</h4>
        <span class="tt-type" style="background:${typeColor}33;color:${typeColor}">${e.type.replace(/_/g, " ")}</span>
        ${e.era ? `<span class="tt-type" style="background:#33333366;color:#888;margin-left:4px">${e.era}</span>` : ""}
        <p>${getEntitySummaryShort(id)}</p>
      `;
      tooltip.classList.add("visible");
    });

    cy.on("mousemove", "node", (evt: EventObject) => {
      if (!tooltip) return;
      const pos = evt.renderedPosition;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      let left = pos.x + rect.left + 15;
      let top = pos.y + rect.top - 10;

      // Keep tooltip in viewport
      if (left + 290 > window.innerWidth) left = pos.x + rect.left - 295;
      if (top + 150 > window.innerHeight) top = pos.y + rect.top - 120;

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    cy.on("mouseout", "node", (evt: EventObject) => {
      const node = evt.target;
      node.removeClass("hover-glow");

      // Hide edge labels unless in highlight mode
      if (!node.hasClass("highlighted") && !node.hasClass("neighbor")) {
        node.connectedEdges().style("text-opacity", 0);
        node.connectedEdges().style("line-opacity", 0.35);
      }

      if (tooltip) tooltip.classList.remove("visible");
    });

    // Click to select
    cy.on("tap", "node", (evt: EventObject) => {
      const nodeId = evt.target.id();
      const entity = entities.find((e) => e.id === nodeId);
      if (entity) setSelected(entity);

      if (tooltip) tooltip.classList.remove("visible");

      cy.elements().removeClass("highlighted dimmed neighbor neighbor-edge");
      const neighborhood = evt.target.neighborhood();
      cy.elements().addClass("dimmed");
      evt.target.removeClass("dimmed").addClass("highlighted");
      neighborhood.nodes().removeClass("dimmed").addClass("neighbor");
      neighborhood.edges().removeClass("dimmed").addClass("neighbor-edge");
    });

    // Click background to deselect
    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelected(null);
        cy.elements().removeClass("highlighted dimmed neighbor neighbor-edge");
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [buildElements]);

  const fitGraph = () => {
    cyRef.current?.animate(
      { fit: { eles: cyRef.current.elements(), padding: 60 } } as never,
      { duration: 400 }
    );
    setSelected(null);
    cyRef.current?.elements().removeClass("highlighted dimmed neighbor neighbor-edge");
  };

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const lenses: { value: Lens; label: string; icon: string }[] = [
    { value: "all", label: "All Layers", icon: LENS_ICONS.all },
    { value: "historical", label: "Historical", icon: LENS_ICONS.historical },
    { value: "devotional", label: "Devotional", icon: LENS_ICONS.devotional },
    { value: "esoteric", label: "Esoteric", icon: LENS_ICONS.esoteric },
  ];

  const visibleCount = cyRef.current
    ? cyRef.current.nodes().filter((n) => !n.hasClass("search-dim")).length
    : entities.length;

  return (
    <div className="flex h-screen w-screen bg-[#060609] text-gray-200">
      {/* Tooltip portal */}
      <div ref={tooltipRef} className="cy-tooltip" />

      {/* Left sidebar */}
      <div className="w-60 border-r border-gray-800/60 flex flex-col shrink-0 bg-[#08080f]/80 backdrop-blur">
        <div className="p-4 pb-3 border-b border-gray-800/40">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-amber-400">World</span>{" "}
            <span className="text-gray-200">Religion</span>{" "}
            <span className="text-amber-600/80">Web</span>
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5 tracking-wide uppercase">
            Comparative Knowledge Graph
          </p>
        </div>

        <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/60 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-amber-500/50 placeholder-gray-600 transition-colors"
            />
            {searchActive && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                clear
              </button>
            )}
          </div>

          {/* Lens selector */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">
              Lens
            </h3>
            <div className="flex flex-col gap-0.5">
              {lenses.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setActiveLens(l.value)}
                  className={`text-left text-sm px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-2 ${
                    activeLens === l.value
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/25 shadow-sm shadow-amber-500/5"
                      : "hover:bg-gray-800/50 text-gray-500 border border-transparent"
                  }`}
                >
                  <span className="text-sm">{l.icon}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type filters */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">
              Node Types
            </h3>
            <div className="flex flex-col gap-0.5">
              {allTypes.map((type) => {
                const active = activeTypes.size === 0 || activeTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`text-left text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-150 ${
                      active
                        ? "text-gray-300 hover:bg-gray-800/50"
                        : "text-gray-700 hover:bg-gray-800/30"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0 transition-opacity"
                      style={{
                        backgroundColor: TYPE_COLORS[type] || "#555",
                        opacity: active ? 1 : 0.3,
                      }}
                    />
                    {type.replace(/_/g, " ")}
                  </button>
                );
              })}
              {activeTypes.size > 0 && (
                <button
                  onClick={() => setActiveTypes(new Set())}
                  className="text-[10px] text-gray-600 hover:text-amber-400 px-3 py-1 transition-colors"
                >
                  reset filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats footer */}
        <div className="p-3 border-t border-gray-800/40">
          <p className="text-[10px] text-gray-600">
            {searchActive ? `${visibleCount} matches / ` : ""}
            {entities.length} entities &middot; {relationships.length} edges
          </p>
          <p className="text-[10px] text-gray-700 mt-0.5">
            v0.1 &middot; Abrahamic Core + Esoterica
          </p>
        </div>
      </div>

      {/* Graph area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(230, 168, 23, 0.03) 0%, rgba(6, 6, 9, 0) 70%)",
          }}
        />

        <div ref={containerRef} className="w-full h-full" />

        {/* Controls overlay */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={fitGraph}
            className="bg-gray-900/80 backdrop-blur border border-gray-700/50 hover:border-amber-500/30 text-gray-400 hover:text-amber-300 px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
            title="Reset view"
          >
            Fit View
          </button>
        </div>

        {/* Help overlay */}
        <div className="absolute bottom-4 left-4 bg-gray-900/60 backdrop-blur-sm border border-gray-800/30 rounded-lg px-3 py-2 text-[11px] space-y-0.5">
          <p className="text-gray-500">
            <span className="text-gray-400">Hover</span> to preview &middot;{" "}
            <span className="text-gray-400">Click</span> to explore &middot;{" "}
            <span className="text-gray-400">Drag</span> to rearrange
          </p>
          <p className="text-gray-600">
            Scroll to zoom &middot; Click empty space to reset
          </p>
        </div>
      </div>

      {/* Right panel */}
      {selected && (
        <div className="panel-enter">
          <EntityPanel
            entity={selected}
            relationships={relationships.filter(
              (r) => r.source === selected.id || r.target === selected.id
            )}
            entities={entities}
            onClose={() => {
              setSelected(null);
              cyRef.current?.elements().removeClass(
                "highlighted dimmed neighbor neighbor-edge"
              );
            }}
            onNavigate={(id) => {
              const entity = entities.find((e) => e.id === id);
              if (entity) {
                setSelected(entity);
                const node = cyRef.current?.getElementById(id);
                if (node) {
                  cyRef.current
                    ?.elements()
                    .removeClass("highlighted dimmed neighbor neighbor-edge");
                  const neighborhood = node.neighborhood();
                  cyRef.current?.elements().addClass("dimmed");
                  node.removeClass("dimmed").addClass("highlighted");
                  neighborhood.nodes().removeClass("dimmed").addClass("neighbor");
                  neighborhood.edges().removeClass("dimmed").addClass("neighbor-edge");
                  cyRef.current?.animate(
                    { center: { eles: node }, zoom: 1.8 } as never,
                    { duration: 400 }
                  );
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
