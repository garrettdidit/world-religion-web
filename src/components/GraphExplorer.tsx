"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import cytoscape, { Core, ElementDefinition, EventObject, LayoutOptions, NodeSingular } from "cytoscape";
import { entities, relationships } from "@/data/seed";
import { Entity, Lens } from "@/types";
import EntityPanel from "./EntityPanel";
import {
  buildLayoutStorageKey,
  FocusDepth,
  getInitialGraphControls,
  PathScope,
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

type PathPickMode = "start" | "end" | null;

type PathResult = {
  found: boolean;
  nodeIds: string[];
  edgeIds: string[];
  distance: number;
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

function computePathResult(
  pathState: PathDraft,
  allowedEntityIds: Set<string>,
  allowedRelationshipIds: Set<string>
): PathResult | null {
  if (!pathState.startId || !pathState.endId || pathState.startId === pathState.endId) {
    return null;
  }

  if (!allowedEntityIds.has(pathState.startId) || !allowedEntityIds.has(pathState.endId)) {
    return null;
  }

  const queue = [pathState.startId];
  const visited = new Set<string>([pathState.startId]);
  const previous = new Map<string, { nodeId: string; edgeId: string }>();

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    if (current === pathState.endId) break;

    relationships.forEach((relationship) => {
      if (!allowedRelationshipIds.has(relationship.id)) return;

      let neighborId: string | null = null;
      if (relationship.source === current && allowedEntityIds.has(relationship.target)) {
        neighborId = relationship.target;
      } else if (relationship.target === current && allowedEntityIds.has(relationship.source)) {
        neighborId = relationship.source;
      }

      if (!neighborId || visited.has(neighborId)) return;
      visited.add(neighborId);
      previous.set(neighborId, { nodeId: current, edgeId: relationship.id });
      queue.push(neighborId);
    });
  }

  if (!visited.has(pathState.endId)) {
    return {
      found: false,
      nodeIds: [],
      edgeIds: [],
      distance: Number.POSITIVE_INFINITY,
    };
  }

  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let cursor: string | null = pathState.endId;

  while (cursor) {
    nodeIds.unshift(cursor);
    const step = previous.get(cursor);
    if (!step) break;
    edgeIds.unshift(step.edgeId);
    cursor = step.nodeId;
  }

  return {
    found: true,
    nodeIds,
    edgeIds,
    distance: Math.max(nodeIds.length - 1, 0),
  };
}

function applyPathHighlight(cy: Core, pathState: PathDraft, pathResult: PathResult | null): PathResult | null {
  cy.elements().removeClass(
    "path-node path-edge path-dim path-start path-end path-context path-ghost-edge path-active-label"
  );

  if (!pathResult || !pathState.startId || !pathState.endId || !pathResult.found) {
    return pathResult;
  }

  const start = cy.getElementById(pathState.startId);
  const end = cy.getElementById(pathState.endId);
  const pathNodes = cy.nodes().filter((node) => pathResult.nodeIds.includes(node.id()));
  const pathEdges = cy.edges().filter((edge) => pathResult.edgeIds.includes(edge.id()));
  const contextEdges = pathNodes.connectedEdges(":visible").difference(pathEdges);

  cy.elements(":visible").addClass("path-dim");
  pathNodes.removeClass("path-dim").addClass("path-node");
  pathEdges.removeClass("path-dim").addClass("path-edge path-active-label");
  contextEdges.removeClass("path-dim").addClass("path-ghost-edge");
  start.removeClass("path-dim").addClass("path-start");
  end.removeClass("path-dim").addClass("path-end");

  return pathResult;
}

function getPathStatus(
  pathDraft: PathDraft,
  pathResult: PathResult | null,
  entityMap: Map<string, Entity>,
  visibleEntityIds: Set<string>,
  pathScope: PathScope = "visible"
) {
  const start = pathDraft.startId ? entityMap.get(pathDraft.startId) ?? null : null;
  const end = pathDraft.endId ? entityMap.get(pathDraft.endId) ?? null : null;

  const scopeLabel = pathScope === "filtered" ? "filtered" : "visible";

  if (!pathDraft.startId) {
    return {
      tone: "neutral" as const,
      title: "Choose two nodes to trace a path",
      detail: `Pick a start node, then pick an end node. The graph highlights the shortest route inside the ${scopeLabel} graph.`,
    };
  }

  if (!visibleEntityIds.has(pathDraft.startId)) {
    return {
      tone: "warning" as const,
      title: `${start?.name ?? "Start node"} is outside the ${scopeLabel} graph`,
      detail: "Clear filters or focus mode to bring the start node back into scope.",
    };
  }

  if (!pathDraft.endId) {
    return {
      tone: "neutral" as const,
      title: `Starting from ${start?.name ?? "your selected node"}`,
      detail: `Now choose an end node from the controls or by clicking another node in the ${scopeLabel} graph.`,
    };
  }

  if (!visibleEntityIds.has(pathDraft.endId)) {
    return {
      tone: "warning" as const,
      title: `${end?.name ?? "End node"} is outside the ${scopeLabel} graph`,
      detail: `The end node is outside the current ${scopeLabel} graph. Relax filters or return to the full graph.`,
    };
  }

  if (pathDraft.startId === pathDraft.endId) {
    return {
      tone: "warning" as const,
      title: "Choose two different nodes",
      detail: "The start and end points are the same node, so there is no path to trace yet.",
    };
  }

  if (!pathResult) {
    return {
      tone: "neutral" as const,
      title: `Tracing shortest ${scopeLabel} path…`,
      detail: "The path highlighter updates after the graph renders the current view.",
    };
  }

  if (!pathResult.found) {
    return {
      tone: "warning" as const,
      title: `No ${scopeLabel} path from ${start?.name ?? "start"} to ${end?.name ?? "end"}`,
      detail: "These nodes may connect outside the current filter, lens, or focus window.",
    };
  }

  return {
    tone: "success" as const,
    title: `${start?.name ?? "Start"} → ${end?.name ?? "End"}`,
    detail: `${Math.max(pathResult.nodeIds.length - 1, 0)} hops across ${pathResult.edgeIds.length} relationships are highlighted in gold.`,
  };
}

const MOBILE_QUERY = "(max-width: 767px)";
function subscribeMediaQuery(cb: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}
function getIsMobile() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;
}
const SERVER_FALSE = () => false;

export default function GraphExplorer() {
  const isMobile = useSyncExternalStore(subscribeMediaQuery, getIsMobile, SERVER_FALSE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

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
  const [pathDraft, setPathDraft] = useState<PathDraft>({
    startId: initialUrlState.pathStartId,
    endId: initialUrlState.pathEndId,
  });
  const [pathPickMode, setPathPickMode] = useState<PathPickMode>(initialUrlState.pathStartId && !initialUrlState.pathEndId ? "end" : null);
  const [pathScope, setPathScope] = useState<PathScope>(initialUrlState.pathScope);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const isRestoringFromPopstate = useRef(false);
  const prevUrlStateKeyRef = useRef<string>("");

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

  const pathEligibleEntityIds = useMemo(
    () => (pathScope === "filtered" ? baseVisibleEntityIds : visibleEntityIds),
    [baseVisibleEntityIds, pathScope, visibleEntityIds]
  );

  const pathSelectableEntities = useMemo(
    () => entities.filter((entity) => pathEligibleEntityIds.has(entity.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [pathEligibleEntityIds]
  );

  const scopedPathDraft = useMemo<PathDraft>(() => {
    if (!pathDraft.startId || !pathEligibleEntityIds.has(pathDraft.startId)) {
      return { startId: null, endId: null };
    }

    if (pathDraft.endId && !pathEligibleEntityIds.has(pathDraft.endId)) {
      return { startId: pathDraft.startId, endId: null };
    }

    return pathDraft;
  }, [pathDraft, pathEligibleEntityIds]);

  const pathRelationshipIds = useMemo(() => {
    return new Set(
      relationships
        .filter((relationship) => {
          if (!pathEligibleEntityIds.has(relationship.source) || !pathEligibleEntityIds.has(relationship.target)) {
            return false;
          }
          if (activeLens !== "all" && !relationship.lens.includes(activeLens)) return false;
          return true;
        })
        .map((relationship) => relationship.id)
    );
  }, [activeLens, pathEligibleEntityIds]);

  const computedPathResult = useMemo(
    () => computePathResult(scopedPathDraft, pathEligibleEntityIds, pathRelationshipIds),
    [pathEligibleEntityIds, pathRelationshipIds, scopedPathDraft]
  );

  const pathDisplayEntityIds = useMemo(() => {
    if (pathScope !== "filtered" || !computedPathResult?.found) return visibleEntityIds;
    return new Set([...visibleEntityIds, ...computedPathResult.nodeIds]);
  }, [computedPathResult, pathScope, visibleEntityIds]);

  const pathDisplayRelationshipIds = useMemo(() => {
    if (pathScope !== "filtered" || !computedPathResult?.found) return visibleRelationshipIds;
    return new Set([...visibleRelationshipIds, ...computedPathResult.edgeIds]);
  }, [computedPathResult, pathScope, visibleRelationshipIds]);

  const visibleNodeIdsForStorage = useMemo(() => Array.from(pathDisplayEntityIds).sort(), [pathDisplayEntityIds]);

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

  const pathStart = pathDraft.startId ? entityMap.get(pathDraft.startId) ?? null : null;
  const pathEnd = pathDraft.endId ? entityMap.get(pathDraft.endId) ?? null : null;
  const pathStatus = getPathStatus(scopedPathDraft, computedPathResult, entityMap, pathEligibleEntityIds, pathScope);

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
            "transition-property": "line-opacity, width, text-opacity, opacity, line-color, target-arrow-color",
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
            "border-color": "#f6c451",
            "border-width": 4,
            "background-opacity": 1,
            "shadow-opacity": 0.46,
            "shadow-blur": 22,
            "z-index": 12,
          } as never,
        },
        {
          selector: ".path-start",
          style: {
            "border-color": "#6ee7b7",
            "border-width": 5,
            "shadow-color": "#6ee7b7",
            "shadow-opacity": 0.5,
            "z-index": 14,
          } as never,
        },
        {
          selector: ".path-end",
          style: {
            "border-color": "#fda4af",
            "border-width": 5,
            "shadow-color": "#fda4af",
            "shadow-opacity": 0.5,
            "z-index": 14,
          } as never,
        },
        {
          selector: ".path-edge",
          style: {
            width: 4.4,
            "line-color": "#f6c451",
            "target-arrow-color": "#f6c451",
            "line-opacity": 0.98,
            "text-opacity": 1,
            color: "#f6e6b8",
            "font-size": "9px",
            "text-background-color": "#120f08",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
            "text-border-opacity": 0,
            "z-index": 13,
          } as never,
        },
        {
          selector: ".path-ghost-edge",
          style: {
            opacity: 0.22,
            "line-opacity": 0.22,
            width: 1.6,
            "target-arrow-color": "#666",
          } as never,
        },
        {
          selector: ".path-active-label",
          style: {
            "text-opacity": 1,
          } as never,
        },
        {
          selector: ".path-dim",
          style: {
            opacity: 0.06,
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
      setPathPickMode((currentPickMode) => {
        if (currentPickMode === "start") {
          setPathDraft((current) => ({
            startId: entity.id,
            endId: current.endId === entity.id ? null : current.endId,
          }));
          return "end";
        }

        if (currentPickMode === "end") {
          setPathDraft((current) => ({
            startId: current.startId,
            endId: current.startId === entity.id ? null : entity.id,
          }));
          return null;
        }

        return currentPickMode;
      });

      tooltip?.classList.remove("visible");
      applySelection(cy, entity.id);
    });

    cy.on("tap", (evt: EventObject) => {
      if (evt.target === cy) {
        setSelected(null);
        setFocusDepth(null);
        setPathPickMode(null);
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
        node.style("display", pathDisplayEntityIds.has(node.id()) ? "element" : "none");
      });
      cy.edges().forEach((edge) => {
        edge.style("display", pathDisplayRelationshipIds.has(edge.id()) ? "element" : "none");
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

    const hasActivePath = computedPathResult?.found && scopedPathDraft.startId && scopedPathDraft.endId;
    if (!hasActivePath) {
      if (selected && visibleEntityIds.has(selected.id)) {
        applySelection(cy, selected.id);
      } else {
        clearSelection(cy);
      }
    }
  }, [computedPathResult, layoutName, layoutStorageKey, pathDisplayEntityIds, pathDisplayRelationshipIds, scopedPathDraft, selected, visibleEntityIds]);

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
    const state: import("./graphExplorerState").GraphUrlState = {
      focusId: selected?.id ?? null,
      depth: focusDepth,
      lens: activeLens,
      types: Array.from(activeTypes).sort(),
      search: searchQuery,
      pathStartId: pathDraft.startId,
      pathEndId: pathDraft.endId,
      pathScope,
    };

    const key = [
      state.focusId ?? "",
      state.depth ?? "",
      state.lens,
      state.types.join(","),
      state.pathStartId ?? "",
      state.pathEndId ?? "",
      state.pathScope,
    ].join("|");

    const shouldPush = !isRestoringFromPopstate.current && prevUrlStateKeyRef.current !== "" && key !== prevUrlStateKeyRef.current;
    prevUrlStateKeyRef.current = key;
    isRestoringFromPopstate.current = false;

    syncGraphUrlState(state, shouldPush);
  }, [activeLens, activeTypes, focusDepth, pathDraft, pathScope, searchQuery, selected]);

  useEffect(() => {
    const handlePopstate = () => {
      const restored = parseGraphUrlState();
      isRestoringFromPopstate.current = true;

      setActiveLens(restored.lens);
      setActiveTypes(new Set(restored.types));
      setSearchQuery(restored.search);
      setFocusDepth(restored.depth);
      setPathDraft({ startId: restored.pathStartId, endId: restored.pathEndId });
      setPathScope(restored.pathScope);

      if (restored.focusId) {
        const entity = entityMap.get(restored.focusId) ?? null;
        setSelected(entity);
      } else {
        setSelected(null);
      }
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [entityMap]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !selected || !visibleEntityIds.has(selected.id)) return;

    const node = cy.getElementById(selected.id);
    if (!node.nonempty() || node.style("display") === "none") return;

    const hasActivePath = computedPathResult?.found && scopedPathDraft.startId && scopedPathDraft.endId;
    if (!hasActivePath) {
      applySelection(cy, selected.id);
    }

    cy.animate(
      { center: { eles: node }, zoom: Math.max(cy.zoom(), focusDepth ? 1.5 : 1.2) } as never,
      { duration: 350 }
    );
  }, [computedPathResult, focusDepth, scopedPathDraft, selected, visibleEntityIds]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const nextResult = applyPathHighlight(cy, scopedPathDraft, computedPathResult);
    setPathResult(nextResult);
  }, [computedPathResult, scopedPathDraft, pathDisplayEntityIds, pathDisplayRelationshipIds]);

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
    setPathPickMode(null);
    setPathDraft((current) => ({ startId: selected.id, endId: current.endId === selected.id ? null : current.endId }));
  }, [selected]);

  const setPathStart = useCallback((id: string | null) => {
    setPathPickMode(null);
    setPathDraft((current) => ({
      startId: id,
      endId: id && current.endId === id ? null : current.endId,
    }));
  }, []);

  const setPathEnd = useCallback((id: string | null) => {
    setPathPickMode(null);
    setPathDraft((current) => ({
      startId: current.startId,
      endId: id === current.startId ? null : id,
    }));
  }, []);

  const swapPathDirection = useCallback(() => {
    setPathDraft((current) => ({ startId: current.endId, endId: current.startId }));
  }, []);

  const clearPathDraft = useCallback(() => {
    setPathPickMode(null);
    setPathDraft({ startId: null, endId: null });
  }, []);

  const fitPath = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || !pathResult?.found) return;

    const pathElements = cy.elements().filter((ele) => {
      return (
        (ele.isNode() && pathResult.nodeIds.includes(ele.id())) ||
        (ele.isEdge() && pathResult.edgeIds.includes(ele.id()))
      );
    });

    if (!pathElements.length) return;

    cy.animate({ fit: { eles: pathElements, padding: 100 } } as never, { duration: 450 });
  }, [pathResult]);

  const pathReady = Boolean(pathResult?.found && scopedPathDraft.startId && scopedPathDraft.endId && scopedPathDraft.startId !== scopedPathDraft.endId);
  const pathModeActive = pathPickMode !== null;
  const pathModeLabel = pathPickMode === "start" ? "Pick a start node" : pathPickMode === "end" ? "Pick an end node" : "Path mode off";

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

  // Sidebar content (shared between desktop sidebar and mobile drawer)
  const sidebarContent = (
      <>
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

          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-3 text-[11px] space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-amber-200 font-medium tracking-wide uppercase text-[10px]">Path finder</p>
                <button
                  onClick={() => setPathPickMode((current) => (current ? null : pathDraft.startId ? "end" : "start"))}
                  className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                    pathModeActive
                      ? "border-amber-400/40 bg-amber-500/12 text-amber-100"
                      : "border-gray-700/70 text-gray-300 hover:bg-gray-800/50"
                  }`}
                >
                  {pathModeActive ? "Exit path mode" : "Enter path mode"}
                </button>
              </div>
              <p className="text-gray-400 mt-1 leading-relaxed">
                Choose endpoints explicitly, then highlight the shortest route in the current scope. The pair stays shareable in the URL.
              </p>
            </div>

            <div className="rounded-lg border border-gray-800/70 bg-gray-950/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Interaction mode</p>
              <p className="mt-1 text-sm text-gray-200">{pathModeLabel}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                {pathPickMode === "start"
                  ? "Click any in-scope node to set the starting point."
                  : pathPickMode === "end"
                    ? "Click any in-scope node to finish the pair."
                    : "Node clicks stay in normal explore mode until you arm the picker."}
              </p>
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Path scope</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPathScope("visible")}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      pathScope === "visible"
                        ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
                        : "border-gray-800 text-gray-400 hover:bg-gray-800/40"
                    }`}
                  >
                    Visible graph
                    <span className="mt-1 block text-[10px] text-gray-500">Respect focus mode and the current viewport subset.</span>
                  </button>
                  <button
                    onClick={() => setPathScope("filtered")}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      pathScope === "filtered"
                        ? "border-sky-400/35 bg-sky-500/10 text-sky-100"
                        : "border-gray-800 text-gray-400 hover:bg-gray-800/40"
                    }`}
                  >
                    Filtered graph
                    <span className="mt-1 block text-[10px] text-gray-500">Ignore focus window, but still respect lens and type filters.</span>
                  </button>
                </div>
              </div>

              <label className="block space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">Start node</span>
                  <button
                    onClick={() => setPathPickMode((current) => (current === "start" ? null : "start"))}
                    className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                      pathPickMode === "start"
                        ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-200"
                        : "border-gray-700/70 text-gray-400 hover:bg-gray-800/50"
                    }`}
                  >
                    {pathPickMode === "start" ? "Click a node…" : "Pick on graph"}
                  </button>
                </div>
                <select
                  value={pathDraft.startId ?? ""}
                  onChange={(event) => setPathStart(event.target.value || null)}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm text-gray-200 focus:border-emerald-400/50 focus:outline-none"
                >
                  <option value="">Choose a {pathScope === "filtered" ? "filtered" : "visible"} start…</option>
                  {pathSelectableEntities.map((entity) => (
                    <option key={`path-start-${entity.id}`} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPathPickMode(null);
                    swapPathDirection();
                  }}
                  disabled={!pathDraft.startId && !pathDraft.endId}
                  className="rounded-md border border-gray-700/70 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-gray-300 transition hover:bg-gray-800/50 disabled:cursor-not-allowed disabled:text-gray-600"
                >
                  Swap
                </button>
                <p className="text-[10px] text-gray-600">
                  {pathScope === "visible"
                    ? "Use only the currently focused graph when tracing a route."
                    : "Search across the full filtered graph, even when focus mode is narrowing the view."}
                </p>
              </div>

              <label className="block space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">End node</span>
                  <button
                    onClick={() => setPathPickMode((current) => (current === "end" ? null : "end"))}
                    className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider transition ${
                      pathPickMode === "end"
                        ? "border-rose-400/40 bg-rose-500/12 text-rose-200"
                        : "border-gray-700/70 text-gray-400 hover:bg-gray-800/50"
                    }`}
                  >
                    {pathPickMode === "end" ? "Click a node…" : "Pick on graph"}
                  </button>
                </div>
                <select
                  value={pathDraft.endId ?? ""}
                  onChange={(event) => setPathEnd(event.target.value || null)}
                  className="w-full rounded-lg border border-gray-800 bg-gray-950/70 px-3 py-2 text-sm text-gray-200 focus:border-rose-400/50 focus:outline-none"
                >
                  <option value="">Choose a {pathScope === "filtered" ? "filtered" : "visible"} end…</option>
                  {pathSelectableEntities.map((entity) => (
                    <option key={`path-end-${entity.id}`} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              className={`rounded-lg border px-3 py-2 space-y-1 ${
                pathStatus.tone === "success"
                  ? "border-emerald-400/20 bg-emerald-500/8"
                  : pathStatus.tone === "warning"
                    ? "border-amber-400/20 bg-amber-500/8"
                    : "border-gray-800/70 bg-gray-950/40"
              }`}
            >
              <p className="text-sm text-gray-200">{pathStatus.title}</p>
              <p className="text-[11px] leading-relaxed text-gray-400">{pathStatus.detail}</p>
              {pathReady && pathStart && pathEnd && (
                <div className="flex items-center gap-2 pt-1 text-[10px] uppercase tracking-wider text-gray-500">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-300" /> start</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-300" /> path</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-300" /> end</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={fitPath}
                disabled={!pathReady}
                className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:border-gray-800 disabled:text-gray-600"
              >
                Fit path
              </button>
              <button
                onClick={clearPathDraft}
                className="rounded-lg border border-gray-700/70 px-3 py-2 text-xs text-gray-300 transition hover:bg-gray-800/50"
              >
                Clear path
              </button>
            </div>

            {visibleSelected && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={startPathFromSelected}
                  className="rounded-lg border border-emerald-400/25 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  Set start from selected
                </button>
                <button
                  onClick={() => {
                    setPathPickMode(null);
                    setPathEnd(visibleSelected.id);
                  }}
                  className="rounded-lg border border-rose-400/25 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/10"
                >
                  Set end from selected
                </button>
              </div>
            )}
          </div>

          {(visibleSelected || hiddenSelected) && (
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/8 p-2.5 text-[11px] space-y-2">
              <div>
                <p className="text-sky-200 font-medium">Focused node</p>
                <p className="text-gray-400 mt-0.5">{selected?.name}</p>
                {hiddenSelected && <p className="text-amber-300/90 mt-1">Hidden by current lens or type filters.</p>}
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

          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Lens</h3>
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
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Layout</h3>
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
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Node Types</h3>
            <div className="flex flex-col gap-0.5">
              {allTypes.map((type) => {
                const active = activeTypes.size === 0 || activeTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`text-left text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-150 ${
                      active ? "text-gray-300 hover:bg-gray-800/50" : "text-gray-700 hover:bg-gray-800/30"
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
            <h3 className="text-[10px] uppercase tracking-widest text-gray-600 mb-1.5 px-1">Edge Confidence</h3>
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
          <p className="text-[10px] text-gray-700 mt-0.5">v0.4 path-finding UX &middot; URL state &middot; persisted layouts</p>
        </div>
      </>
    );

  const closeEntityPanel = useCallback(() => {
    setSelected(null);
    setFocusDepth(null);
    setSheetExpanded(false);
    const cy = cyRef.current;
    if (cy) clearSelection(cy);
  }, []);

  const navigateEntityPanel = useCallback((id: string) => {
    const entity = entityMap.get(id);
    const cy = cyRef.current;
    const node = cy?.getElementById(id);
    if (!entity || !cy || !node?.nonempty() || node.style("display") === "none") return;

    setSelected(entity);
    setPathPickMode((currentPickMode) => {
      if (currentPickMode === "start") {
        setPathDraft((current) => ({
          startId: id,
          endId: current.endId === id ? null : current.endId,
        }));
        return "end";
      }
      if (currentPickMode === "end") {
        setPathDraft((current) => ({
          startId: current.startId,
          endId: current.startId === id ? null : id,
        }));
        return null;
      }
      return currentPickMode;
    });
    applySelection(cy, id);
    cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.8) } as never, { duration: 400 });
  }, [entityMap]);

  const visibleSelectedRelationships = useMemo(
    () => (visibleSelected
      ? relationships.filter((r) => r.source === visibleSelected.id || r.target === visibleSelected.id)
      : []),
    [visibleSelected]
  );

  const activeFilterCount = (activeLens !== "all" ? 1 : 0) + activeTypes.size + (searchActive ? 1 : 0);

  /* ───────── MOBILE LAYOUT ───────── */
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen bg-[#060609] text-gray-200">
        <div ref={tooltipRef} className="cy-tooltip" />

        {/* Mobile top bar — respects iPhone safe area */}
        <div className="flex items-center justify-between px-4 pb-2.5 border-b border-gray-800/40 bg-[#08080f]/90 backdrop-blur shrink-0 z-30" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0.75rem))" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-gray-400 hover:text-amber-300 transition-colors p-2 -ml-2 min-h-[44px] min-w-[44px]"
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30">
                {activeFilterCount}
              </span>
            )}
          </button>

          <h1 className="text-sm font-bold tracking-tight">
            <span className="text-amber-400">World</span>{" "}
            <span className="text-gray-200">Religion</span>{" "}
            <span className="text-amber-600/80">Web</span>
          </h1>

          <button
            onClick={fitGraph}
            className="text-gray-500 hover:text-amber-300 p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
            title="Fit view"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Graph canvas (full screen) */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(230, 168, 23, 0.03) 0%, rgba(6, 6, 9, 0) 70%)",
            }}
          />
          <div ref={containerRef} className="w-full h-full" />

          {/* Mobile stats pill */}
          <div className="absolute top-3 left-3 bg-gray-900/70 backdrop-blur-sm border border-gray-800/30 rounded-full px-3 py-1 text-[10px] text-gray-500">
            {visibleCount} / {entities.length} entities
          </div>
        </div>

        {/* Mobile drawer (sidebar) */}
        {drawerOpen && (
          <>
            <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-[#08080f] border-r border-gray-800/60 flex flex-col drawer-panel" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <div className="flex items-center justify-between p-3 border-b border-gray-800/40">
                <h2 className="text-sm font-bold text-amber-400">Filters & Tools</h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-600 hover:text-white p-1 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sidebarContent}
              </div>
            </div>
          </>
        )}

        {/* Mobile bottom sheet (entity detail) */}
        {visibleSelected && (
          <>
            <div className="bottom-sheet-backdrop" onClick={closeEntityPanel} />
            <div className={`bottom-sheet bg-[#0a0a12] border-t border-gray-700/50 ${sheetExpanded ? "bottom-sheet-full" : ""}`} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              {/* Drag handle */}
              <div
                className="flex justify-center py-3 cursor-pointer shrink-0"
                onClick={() => setSheetExpanded(!sheetExpanded)}
              >
                <div className="w-12 h-1.5 rounded-full bg-gray-500" />
              </div>
              <EntityPanel
                entity={visibleSelected}
                relationships={visibleSelectedRelationships}
                entities={entities}
                onClose={closeEntityPanel}
                onNavigate={navigateEntityPanel}
                mobile
              />
            </div>
          </>
        )}
      </div>
    );
  }

  /* ───────── DESKTOP LAYOUT ───────── */
  return (
    <div className="flex h-screen w-screen bg-[#060609] text-gray-200">
      <div ref={tooltipRef} className="cy-tooltip" />

      {/* Desktop sidebar */}
      <div className="w-72 border-r border-gray-800/60 flex flex-col shrink-0 bg-[#08080f]/80 backdrop-blur">
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
        {sidebarContent}
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(230, 168, 23, 0.03) 0%, rgba(6, 6, 9, 0) 70%)",
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

        <div className="absolute bottom-4 left-4 bg-gray-900/60 backdrop-blur-sm border border-gray-800/30 rounded-lg px-3 py-2 text-[11px] space-y-0.5 max-w-md">
          <p className="text-gray-500">
            <span className="text-gray-400">Hover</span> to preview &middot; <span className="text-gray-400">Click</span> to explore &middot; <span className="text-gray-400">Drag</span> to rearrange
          </p>
          <p className="text-gray-600">Path mode traces the shortest route between chosen endpoints within the {pathScope === "filtered" ? "filtered" : "visible"} graph.</p>
        </div>
      </div>

      {/* Desktop entity panel */}
      {visibleSelected && (
        <div className="panel-enter">
          <EntityPanel
            entity={visibleSelected}
            relationships={visibleSelectedRelationships}
            entities={entities}
            onClose={closeEntityPanel}
            onNavigate={navigateEntityPanel}
          />
        </div>
      )}
    </div>
  );
}
