"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, ElementDefinition, EventObject, LayoutOptions, NodeSingular } from "cytoscape";
import { entities, relationships } from "@/data/seed";
import { Entity, Lens } from "@/types";
import EntityPanel from "./EntityPanel";
import {
  buildLayoutStorageKey,
  FocusDepth,
  getInitialGraphControls,
  parseGraphUrlState,
  persistGraphUiState,
  readLayoutSnapshot,
  syncGraphUrlState,
} from "./graphExplorerState";

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
  deity: "#ffd700",
  concept: "#1abc9c",
  ritual: "#e67e22",
  movement: "#27ae60",
  practice: "#2980b9",
  prophecy_text: "#8e44ad",
  accusation: "#c0392b",
  transmission_event: "#7f8c8d",
  disputed_attribution: "#95a5a6",
  polity: "#d4a017",
  legal_tradition: "#2c3e50",
  lineage: "#8e44ad",
  artifact: "#d4a574",
  institution: "#34495e",
  council: "#c0392b",
  cosmological_concept: "#2e4053",
  initiatory_grade: "#6c3483",
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
  deity: "star",
  concept: "round-rectangle",
  ritual: "diamond",
  movement: "round-hexagon",
  practice: "round-rectangle",
  prophecy_text: "rectangle",
  accusation: "pentagon",
  transmission_event: "diamond",
  disputed_attribution: "rectangle",
  polity: "hexagon",
  legal_tradition: "round-rectangle",
  lineage: "ellipse",
  artifact: "star",
  institution: "hexagon",
  council: "pentagon",
  cosmological_concept: "octagon",
  initiatory_grade: "octagon",
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
  // v0.2 ontology edge types
  founded: "#e6a817",
  founded_by: "#e6a817",
  influenced: "#95a5a6",
  influenced_by: "#95a5a6",
  split_from: "#e74c3c",
  located_in: "#d35400",
  practices: "#2980b9",
  mentions: "#2ecc71",
  worships: "#ffd700",
  opposes: "#c0392b",
  succeeds: "#7f8c8d",
  precedes: "#7f8c8d",
  has_text: "#2ecc71",
  has_site: "#d35400",
  has_ritual: "#e67e22",
  has_practice: "#2980b9",
  has_concept: "#1abc9c",
  has_lineage: "#8e44ad",
  preserves: "#27ae60",
  transmits: "#3498db",
  mistranslated_into: "#e74c3c",
  polemically_inverted: "#c0392b",
  liturgically_absorbed: "#9b59b6",
  suppressed_by: "#c0392b",
  claims_fulfillment_of: "#e6a817",
  claims_corruption_of: "#e74c3c",
  mystically_interprets: "#9b59b6",
  splits_into: "#e74c3c",
  merges_into: "#27ae60",
  contests_site_with: "#d35400",
  initiated_by: "#8e44ad",
};

const LENS_ICONS: Record<string, string> = {
  all: "\u25C9",
  historical: "\u2693",
  devotional: "\u2727",
  esoteric: "\u2B23",
};

const LAYOUT_OPTIONS = [
  { value: "concentric", label: "Concentric" },
  { value: "cose", label: "Cose" },
  { value: "circle", label: "Circle" },
] as const;

const FOCUS_OPTIONS = [
  { value: 1, label: "1-hop neighborhood" },
  { value: 2, label: "2-hop neighborhood" },
] as const;

type LayoutName = (typeof LAYOUT_OPTIONS)[number]["value"];

type PathDraft = {
  startId: string | null;
  endId: string | null;
};

function getEntitySummaryShort(id: string): string {
  const entity = entities.find((item) => item.id === id);
  if (!entity) return "";
  return entity.summary.length > 120 ? `${entity.summary.slice(0, 117)}...` : entity.summary;
}

function getNodeSize(type: string): number {
  if (type === "religion") return 60;
  if (type === "figure") return 48;
  return 36;
}

function getEdgeWidth(confidence: string): number {
  if (confidence === "high") return 2.4;
  if (confidence === "medium") return 1.6;
  return 1;
}

function getLayoutOptions(name: LayoutName): LayoutOptions {
  if (name === "cose") {
    return {
      name: "cose",
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 60,
      nodeRepulsion: 7000,
      idealEdgeLength: 140,
    } as LayoutOptions;
  }

  if (name === "circle") {
    return {
      name: "circle",
      animate: true,
      animationDuration: 400,
      fit: true,
      padding: 60,
      spacingFactor: 1.1,
    } as LayoutOptions;
  }

  return {
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
    animationDuration: 500,
    fit: true,
    padding: 60,
    minNodeSpacing: 50,
  } as LayoutOptions;
}

function applySelection(cy: Core, nodeId: string) {
  const node = cy.getElementById(nodeId);
  if (!node.nonempty() || node.style("display") === "none") return;

  cy.elements().removeClass("highlighted dimmed neighbor neighbor-edge");
  const neighborhood = node.neighborhood(":visible");
  cy.elements(":visible").addClass("dimmed");
  node.removeClass("dimmed").addClass("highlighted");
  neighborhood.nodes().removeClass("dimmed").addClass("neighbor");
  neighborhood.edges().removeClass("dimmed").addClass("neighbor-edge");
}

function clearSelection(cy: Core) {
  cy.elements().removeClass("highlighted dimmed neighbor neighbor-edge");
}

function persistSnapshot(cy: Core, storageKey: string) {
  if (typeof window === "undefined") return;

  const positions: Record<string, { x: number; y: number }> = {};
  cy.nodes(":visible").forEach((node) => {
    const { x, y } = node.position();
    positions[node.id()] = { x, y };
  });

  const snapshot = {
    positions,
    viewport: {
      zoom: cy.zoom(),
      pan: cy.pan(),
    },
    savedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function restoreSnapshot(cy: Core, storageKey: string, fitAfterRestore = false) {
  const snapshot = readLayoutSnapshot(storageKey);
  if (!snapshot) return false;

  const visibleNodes = cy.nodes(":visible");
  if (!visibleNodes.length) return false;

  let allPresent = true;
  visibleNodes.forEach((node) => {
    if (!snapshot.positions[node.id()]) {
      allPresent = false;
    }
  });
  if (!allPresent) return false;

  cy.batch(() => {
    visibleNodes.forEach((node) => {
      const position = snapshot.positions[node.id()];
      node.position(position);
    });
  });

  if (snapshot.viewport && !fitAfterRestore) {
    cy.zoom(snapshot.viewport.zoom);
    cy.pan(snapshot.viewport.pan);
  } else {
    cy.fit(visibleNodes, 60);
  }

  return true;
}

function applyPathHighlight(cy: Core, pathState: PathDraft) {
  cy.elements().removeClass("path-node path-edge path-dim");

  if (!pathState.startId || !pathState.endId || pathState.startId === pathState.endId) {
    return;
  }

  const start = cy.getElementById(pathState.startId);
  const end = cy.getElementById(pathState.endId);
  if (!start.nonempty() || !end.nonempty()) return;
  if (start.style("display") === "none" || end.style("display") === "none") return;

  const result = cy.elements(":visible").dijkstra({
    root: start,
    directed: false,
    weight: () => 1,
  });

  const path = result.pathTo(end);
  if (!path.length) return;

  cy.elements(":visible").addClass("path-dim");
  path.removeClass("path-dim");
  path.nodes().addClass("path-node");
  path.edges().addClass("path-edge show-label");
}

export default function GraphExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const layoutKeyRef = useRef<string | null>(null);
  const initialUrlState = useMemo(() => parseGraphUrlState(), []);
  const initialControls = useMemo(() => getInitialGraphControls(), []);

  const [selected, setSelected] = useState<Entity | null>(() => {
    const focusId = initialUrlState.focusId;
    return focusId ? entities.find((entity) => entity.id === focusId) ?? null : null;
  });
  const [activeLens, setActiveLens] = useState<Lens>(initialControls.lens);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(() => new Set(initialControls.types));
  const [searchQuery, setSearchQuery] = useState(initialControls.search);
  const [layoutName, setLayoutName] = useState<LayoutName>("concentric");
  const [focusDepth, setFocusDepth] = useState<FocusDepth | null>(initialUrlState.depth);
  const [pathDraft, setPathDraft] = useState<PathDraft>({ startId: null, endId: null });

  const entityMap = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), []);
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    entities.forEach((entity) => {
      map.set(entity.id, new Set());
    });

    relationships.forEach((relationship) => {
      map.get(relationship.source)?.add(relationship.target);
      map.get(relationship.target)?.add(relationship.source);
    });

    return map;
  }, []);

  const allTypes = useMemo(() => Array.from(new Set(entities.map((entity) => entity.type))).sort(), []);

  const elementDefinitions = useMemo<ElementDefinition[]>(
    () => [
      ...entities.map((entity) => ({
        data: {
          id: entity.id,
          label: entity.name,
          type: entity.type,
          color: TYPE_COLORS[entity.type] || "#95a5a6",
          shape: TYPE_SHAPES[entity.type] || "ellipse",
          size: getNodeSize(entity.type),
        },
      })),
      ...relationships.map((relationship) => ({
        data: {
          id: relationship.id,
          source: relationship.source,
          target: relationship.target,
          label: relationship.type.replace(/_/g, " "),
          color: EDGE_COLORS[relationship.type] || "#555",
          confidence: relationship.confidence,
          baseWidth: getEdgeWidth(relationship.confidence),
        },
      })),
    ],
    []
  );

  const baseVisibleEntityIds = useMemo(() => {
    return new Set(
      entities
        .filter((entity) => {
          if (activeLens !== "all" && !entity.lens.includes(activeLens)) return false;
          if (activeTypes.size > 0 && !activeTypes.has(entity.type)) return false;
          return true;
        })
        .map((entity) => entity.id)
    );
  }, [activeLens, activeTypes]);

  const focusedEntityIds = useMemo(() => {
    if (!selected || !focusDepth || !baseVisibleEntityIds.has(selected.id)) return null;

    const visited = new Set<string>([selected.id]);
    let frontier = new Set<string>([selected.id]);

    for (let depth = 0; depth < focusDepth; depth += 1) {
      const next = new Set<string>();

      frontier.forEach((id) => {
        adjacencyMap.get(id)?.forEach((neighborId) => {
          if (baseVisibleEntityIds.has(neighborId) && !visited.has(neighborId)) {
            visited.add(neighborId);
            next.add(neighborId);
          }
        });
      });

      frontier = next;
      if (!frontier.size) break;
    }

    return visited;
  }, [adjacencyMap, baseVisibleEntityIds, focusDepth, selected]);

  const visibleEntityIds = useMemo(() => focusedEntityIds ?? baseVisibleEntityIds, [baseVisibleEntityIds, focusedEntityIds]);

  const visibleRelationshipIds = useMemo(() => {
    return new Set(
      relationships
        .filter((relationship) => {
          if (!visibleEntityIds.has(relationship.source) || !visibleEntityIds.has(relationship.target)) {
            return false;
          }
          if (activeLens !== "all" && !relationship.lens.includes(activeLens)) return false;
          return true;
        })
        .map((relationship) => relationship.id)
    );
  }, [activeLens, visibleEntityIds]);

  const visibleNodeIdsForStorage = useMemo(() => Array.from(visibleEntityIds).sort(), [visibleEntityIds]);

  const layoutStorageKey = useMemo(
    () => buildLayoutStorageKey(layoutName, visibleNodeIdsForStorage, selected?.id ?? null, focusDepth),
    [focusDepth, layoutName, selected?.id, visibleNodeIdsForStorage]
  );

  const visibleCount = useMemo(() => {
    const visibleEntities = entities.filter((entity) => visibleEntityIds.has(entity.id));
    const query = searchQuery.trim().toLowerCase();

    if (!query) return visibleEntities.length;

    return visibleEntities.filter((entity) => {
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.summary.toLowerCase().includes(query) ||
        entity.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        entity.aliases?.some((alias) => alias.toLowerCase().includes(query))
      );
    }).length;
  }, [searchQuery, visibleEntityIds]);

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: elementDefinitions,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": "data(color)",
            "background-opacity": 0.88,
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
            "border-color": "data(color)",
            "border-opacity": 0.35,
            "shadow-blur": 16,
            "shadow-color": "data(color)",
            "shadow-opacity": 0.18,
            "shadow-offset-x": 0,
            "shadow-offset-y": 0,
            "transition-property":
              "background-color, border-color, width, height, opacity, background-opacity, border-width, shadow-opacity",
            "transition-duration": 200,
            "overlay-opacity": 0,
          } as never,
        },
        {
          selector: "node:selected, node:active",
          style: {
            "border-width": 3,
            "border-color": "#fff",
            "background-opacity": 1,
            "shadow-opacity": 0.34,
          } as never,
        },
        {
          selector: "edge",
          style: {
            width: "data(baseWidth)",
            "line-color": "data(color)",
            "line-opacity": 0.38,
            "target-arrow-color": "data(color)",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.7,
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "8px",
            color: "#888",
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
          selector: "edge.show-label",
          style: {
            "text-opacity": 0.95,
          } as never,
        },
        {
          selector: "edge:selected, edge:active",
          style: {
            "text-opacity": 1,
            "line-opacity": 0.9,
            width: 2.8,
          } as never,
        },
        {
          selector: ".highlighted",
          style: {
            "border-color": "#fff",
            "border-width": 3,
            "background-opacity": 1,
            "shadow-opacity": 0.32,
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
            "background-opacity": 0.96,
            "border-width": 2,
            "border-color": "#666",
            "shadow-opacity": 0.24,
          } as never,
        },
        {
          selector: ".neighbor-edge",
          style: {
            opacity: 1,
            "line-opacity": 0.82,
            width: 2.4,
            "text-opacity": 1,
            color: "#aaa",
            "z-index": 5,
          } as never,
        },
        {
          selector: ".search-match",
          style: {
            "border-color": "#e6a817",
            "border-width": 4,
            "background-opacity": 1,
            "shadow-opacity": 0.34,
            "z-index": 10,
          } as never,
        },
        {
          selector: ".search-dim",
          style: {
            opacity: 0.12,
          } as never,
        },
        {
          selector: ".hover-glow",
          style: {
            "border-color": "#e6a817",
            "border-width": 3,
            "background-opacity": 1,
            "shadow-opacity": 0.38,
          } as never,
        },
        {
          selector: ".path-node",
          style: {
            "border-color": "#f8d26a",
            "border-width": 4,
            "background-opacity": 1,
            "shadow-opacity": 0.42,
            "z-index": 12,
          } as never,
        },
        {
          selector: ".path-edge",
          style: {
            width: 3.2,
            "line-opacity": 0.95,
            "text-opacity": 1,
            color: "#e7d3a2",
            "z-index": 11,
          } as never,
        },
        {
          selector: ".path-dim",
          style: {
            opacity: 0.08,
          } as never,
        },
      ],
      layout: getLayoutOptions(layoutName),
      minZoom: 0.15,
      maxZoom: 4,
      wheelSensitivity: 0.25,
    });

    const tooltip = tooltipRef.current;

    cy.on("mouseover", "node", (evt: EventObject) => {
      const node = evt.target;
      const entity = entityMap.get(node.id());
      if (!entity || !tooltip) return;

      node.addClass("hover-glow");
      node.connectedEdges().style("line-opacity", 0.7);
      if (cy.zoom() > 1.5) {
        node.connectedEdges().addClass("show-label");
      }

      const typeColor = TYPE_COLORS[entity.type] || "#555";
      tooltip.innerHTML = `
        <h4>${entity.name}</h4>
        <span class="tt-type" style="background:${typeColor}33;color:${typeColor}">${entity.type.replace(/_/g, " ")}</span>
        ${entity.era ? `<span class="tt-type" style="background:#33333366;color:#888;margin-left:4px">${entity.era}</span>` : ""}
        <p>${getEntitySummaryShort(entity.id)}</p>
      `;
      tooltip.classList.add("visible");
    });

    cy.on("mousemove", "node", (evt: EventObject) => {
      if (!tooltip) return;
      const pos = evt.renderedPosition;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      let left = pos.x + rect.left + 15;
      let top = pos.y + rect.top - 10;

      if (left + 290 > window.innerWidth) left = pos.x + rect.left - 295;
      if (top + 150 > window.innerHeight) top = pos.y + rect.top - 120;
      if (left < 8) left = 8;
      if (top < 8) top = 8;

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    cy.on("mouseout", "node", (evt: EventObject) => {
      const node = evt.target;
      node.removeClass("hover-glow");
      if (!node.hasClass("highlighted") && !node.hasClass("neighbor") && cy.zoom() <= 1.5) {
        node.connectedEdges().removeClass("show-label");
        node.connectedEdges().style("line-opacity", 0.38);
      }
      tooltip?.classList.remove("visible");
    });

    cy.on("tap", "node", (evt: EventObject) => {
      const entity = entityMap.get(evt.target.id());
      if (!entity) return;
      setSelected(entity);
      setPathDraft((current) => {
        if (current.startId && current.startId !== entity.id) {
          return { startId: current.startId, endId: entity.id };
        }
        return current;
      });
      tooltip?.classList.remove("visible");
      applySelection(cy, entity.id);
    });

    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelected(null);
        setFocusDepth(null);
        clearSelection(cy);
      }
    });

    cy.on("zoom", () => {
      const showLabels = cy.zoom() > 1.5;
      cy.edges().toggleClass("show-label", showLabels);
    });

    cy.on("dragfree", "node", () => {
      const key = layoutKeyRef.current;
      if (key) persistSnapshot(cy, key);
    });

    cyRef.current = cy;

    return () => {
      tooltip?.classList.remove("visible");
      cy.destroy();
      cyRef.current = null;
    };
  }, [elementDefinitions, entityMap, layoutName]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.batch(() => {
      cy.nodes().forEach((node) => {
        node.style("display", visibleEntityIds.has(node.id()) ? "element" : "none");
      });
      cy.edges().forEach((edge) => {
        edge.style("display", visibleRelationshipIds.has(edge.id()) ? "element" : "none");
      });
    });

    layoutKeyRef.current = layoutStorageKey;

    const restored = restoreSnapshot(cy, layoutStorageKey, true);
    if (!restored) {
      const layout = cy.elements(":visible").layout(getLayoutOptions(layoutName));
      layout.run();
      cy.one("layoutstop", () => {
        if (layoutKeyRef.current === layoutStorageKey) {
          persistSnapshot(cy, layoutStorageKey);
        }
      });
    }

    if (selected && visibleEntityIds.has(selected.id)) {
      applySelection(cy, selected.id);
    } else {
      clearSelection(cy);
    }
  }, [layoutName, layoutStorageKey, selected, visibleEntityIds, visibleRelationshipIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("search-match search-dim");

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return;
    }

    cy.nodes(":visible").forEach((node) => {
      const entity = entityMap.get(node.id());
      if (!entity) return;
      const matches =
        entity.name.toLowerCase().includes(query) ||
        entity.summary.toLowerCase().includes(query) ||
        entity.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        entity.aliases?.some((alias) => alias.toLowerCase().includes(query));

      if (matches) {
        node.addClass("search-match");
      } else {
        node.addClass("search-dim");
      }
    });

    cy.edges(":visible").forEach((edge) => {
      const sourceIsDim = edge.source().hasClass("search-dim");
      const targetIsDim = edge.target().hasClass("search-dim");
      if (sourceIsDim && targetIsDim) {
        edge.addClass("search-dim");
      }
    });
  }, [entityMap, searchQuery]);

  useEffect(() => {
    persistGraphUiState({ lens: activeLens, types: Array.from(activeTypes), search: searchQuery });
  }, [activeLens, activeTypes, searchQuery]);

  useEffect(() => {
    syncGraphUrlState({
      focusId: selected?.id ?? null,
      depth: focusDepth,
      lens: activeLens,
      types: Array.from(activeTypes).sort(),
      search: searchQuery,
    });
  }, [activeLens, activeTypes, focusDepth, searchQuery, selected]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selected || !visibleEntityIds.has(selected.id)) return;

    const node = cy.getElementById(selected.id);
    if (!node.nonempty() || node.style("display") === "none") return;

    applySelection(cy, selected.id);

    cy.animate(
      { center: { eles: node }, zoom: Math.max(cy.zoom(), focusDepth ? 1.5 : 1.2) } as never,
      { duration: 350 }
    );
  }, [focusDepth, selected, visibleEntityIds]);

  const visiblePathDraft = useMemo<PathDraft>(() => {
    if (!pathDraft.startId || !visibleEntityIds.has(pathDraft.startId)) {
      return { startId: null, endId: null };
    }

    if (pathDraft.endId && !visibleEntityIds.has(pathDraft.endId)) {
      return { startId: pathDraft.startId, endId: null };
    }

    return pathDraft;
  }, [pathDraft, visibleEntityIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyPathHighlight(cy, visiblePathDraft);
  }, [visiblePathDraft, visibleEntityIds, visibleRelationshipIds]);

  const fitGraph = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.animate({ fit: { eles: cy.elements(":visible"), padding: 60 } } as never, { duration: 400 });
    persistSnapshot(cy, layoutStorageKey);
  }, [layoutStorageKey]);

  const resetFocusView = useCallback(() => {
    setFocusDepth(null);
  }, []);

  const revealFocusedNode = useCallback(() => {
    if (!selected) return;
    setActiveLens("all");
    setActiveTypes(new Set());
  }, [selected]);

  const toggleType = useCallback((type: string) => {
    setActiveTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const startPathFromSelected = useCallback(() => {
    if (!selected) return;
    setPathDraft({ startId: selected.id, endId: null });
  }, [selected]);

  const clearPathDraft = useCallback(() => {
    setPathDraft({ startId: null, endId: null });
  }, []);

  const pathStart = visiblePathDraft.startId ? entityMap.get(visiblePathDraft.startId) ?? null : null;
  const pathEnd = visiblePathDraft.endId ? entityMap.get(visiblePathDraft.endId) ?? null : null;
  const pathReady = Boolean(
    visiblePathDraft.startId && visiblePathDraft.endId && visiblePathDraft.startId !== visiblePathDraft.endId
  );

  const lenses: { value: Lens; label: string; icon: string }[] = [
    { value: "all", label: "All Layers", icon: LENS_ICONS.all },
    { value: "historical", label: "Historical", icon: LENS_ICONS.historical },
    { value: "devotional", label: "Devotional", icon: LENS_ICONS.devotional },
    { value: "esoteric", label: "Esoteric", icon: LENS_ICONS.esoteric },
  ];

  const searchActive = searchQuery.trim().length > 0;
  const selectedVisible = selected ? visibleEntityIds.has(selected.id) : false;
  const hiddenSelected = selected && !selectedVisible ? selected : null;
  const visibleSelected = selectedVisible ? selected : null;

  return (
    <div className="flex h-screen w-screen bg-[#060609] text-gray-200">
      <div ref={tooltipRef} className="cy-tooltip" />

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
          <div className="relative">
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
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

          {(visibleSelected || hiddenSelected) && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/8 p-2.5 text-[11px] space-y-2">
              <div>
                <p className="text-sky-200 font-medium">Focused node</p>
                <p className="text-gray-400 mt-0.5">{selected?.name}</p>
                {hiddenSelected && (
                  <p className="text-amber-300/90 mt-1">
                    Hidden by current lens or type filters.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {FOCUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFocusDepth(option.value)}
                    disabled={!selectedVisible}
                    className={`text-left px-2.5 py-1.5 rounded-md border transition-all ${
                      focusDepth === option.value
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                        : "border-gray-800/70 text-gray-400 hover:bg-gray-800/40 disabled:text-gray-700 disabled:hover:bg-transparent"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                {focusDepth && (
                  <button
                    onClick={resetFocusView}
                    className="text-left px-2.5 py-1.5 rounded-md border border-amber-500/20 text-amber-300 hover:bg-amber-500/10 transition-all"
                  >
                    Return to full graph
                  </button>
                )}
                {hiddenSelected && (
                  <button
                    onClick={revealFocusedNode}
                    className="text-left px-2.5 py-1.5 rounded-md border border-gray-700/70 text-gray-300 hover:bg-gray-800/50 transition-all"
                  >
                    Reveal by clearing filters
                  </button>
                )}
              </div>
            </div>
          )}

          {(pathStart || pathEnd) && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 p-2.5 text-[11px] space-y-2">
              <div>
                <p className="text-amber-200 font-medium">Path explorer preview</p>
                <p className="text-gray-400 mt-0.5">
                  {pathStart ? `Start: ${pathStart.name}` : "Pick a start node."}
                </p>
                <p className="text-gray-500 mt-0.5">
                  {pathEnd
                    ? `End: ${pathEnd.name}`
                    : pathStart
                      ? "Click another visible node to trace the shortest path."
                      : "Select a node, then mark it as a path start."}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {visibleSelected && (
                  <button
                    onClick={startPathFromSelected}
                    className="text-left px-2.5 py-1.5 rounded-md border border-amber-400/30 text-amber-200 hover:bg-amber-500/10 transition-all"
                  >
                    {pathDraft.startId === visibleSelected.id ? "Reset path start to this node" : "Mark as path start"}
                  </button>
                )}
                {pathReady && (
                  <p className="px-2.5 py-1 text-emerald-300/90">Shortest visible path highlighted in gold.</p>
                )}
                <button
                  onClick={clearPathDraft}
                  className="text-left px-2.5 py-1.5 rounded-md border border-gray-700/70 text-gray-300 hover:bg-gray-800/50 transition-all"
                >
                  Clear path highlight
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">
              Lens
            </h3>
            <div className="flex flex-col gap-0.5">
              {lenses.map((lens) => (
                <button
                  key={lens.value}
                  onClick={() => setActiveLens(lens.value)}
                  className={`text-left text-sm px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-2 ${
                    activeLens === lens.value
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/25 shadow-sm shadow-amber-500/5"
                      : "hover:bg-gray-800/50 text-gray-500 border border-transparent"
                  }`}
                >
                  <span className="text-sm">{lens.icon}</span>
                  {lens.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">
              Layout
            </h3>
            <div className="grid grid-cols-1 gap-0.5">
              {LAYOUT_OPTIONS.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => setLayoutName(layout.value)}
                  className={`text-left text-sm px-3 py-1.5 rounded-lg transition-all duration-150 ${
                    layoutName === layout.value
                      ? "bg-sky-500/12 text-sky-300 border border-sky-500/25"
                      : "hover:bg-gray-800/50 text-gray-500 border border-transparent"
                  }`}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </div>

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

          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">
              Edge Confidence
            </h3>
            <div className="rounded-lg border border-gray-800/50 bg-gray-950/40 p-2 text-[11px] text-gray-500 space-y-1">
              <p><span className="text-gray-300">High</span> — thicker relationship strokes</p>
              <p><span className="text-gray-300">Medium</span> — balanced stroke</p>
              <p><span className="text-gray-300">Low</span> — thinner exploratory links</p>
              <p className="text-gray-600 pt-1">Labels appear automatically above 1.5× zoom.</p>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-gray-800/40">
          <p className="text-[10px] text-gray-600">
            {searchActive ? `${visibleCount} matches / ` : `${visibleCount} visible / `}
            {entities.length} entities &middot; {relationships.length} edges
          </p>
          <p className="text-[10px] text-gray-700 mt-0.5">
            v0.4 groundwork &middot; URL state &middot; persisted layouts
          </p>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(230, 168, 23, 0.03) 0%, rgba(6, 6, 9, 0) 70%)",
          }}
        />

        <div ref={containerRef} className="w-full h-full" />

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={fitGraph}
            className="bg-gray-900/80 backdrop-blur border border-gray-700/50 hover:border-amber-500/30 text-gray-400 hover:text-amber-300 px-3 py-1.5 rounded-lg text-xs transition-all duration-150"
            title="Reset view"
          >
            Fit View
          </button>
        </div>

        <div className="absolute bottom-4 left-4 bg-gray-900/60 backdrop-blur-sm border border-gray-800/30 rounded-lg px-3 py-2 text-[11px] space-y-0.5">
          <p className="text-gray-500">
            <span className="text-gray-400">Hover</span> to preview &middot; <span className="text-gray-400">Click</span> to explore &middot; <span className="text-gray-400">Drag</span> to rearrange
          </p>
          <p className="text-gray-600">Scroll to zoom &middot; Edge labels appear when zoomed in</p>
        </div>
      </div>

      {visibleSelected && (
        <div className="panel-enter">
          <EntityPanel
            entity={visibleSelected}
            relationships={relationships.filter(
              (relationship) =>
                relationship.source === visibleSelected.id || relationship.target === visibleSelected.id
            )}
            entities={entities}
            onClose={() => {
              setSelected(null);
              setFocusDepth(null);
              if (cyRef.current) clearSelection(cyRef.current);
            }}
            onNavigate={(id) => {
              const entity = entityMap.get(id);
              const cy = cyRef.current;
              const node = cy?.getElementById(id);
              if (!entity || !cy || !node?.nonempty() || node.style("display") === "none") return;

              setSelected(entity);
              setPathDraft((current) => {
                if (current.startId && current.startId !== id) {
                  return { startId: current.startId, endId: id };
                }
                return current;
              });
              applySelection(cy, id);
              cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.8) } as never, { duration: 400 });
            }}
          />
        </div>
      )}
    </div>
  );
}
