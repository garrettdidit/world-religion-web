import { Lens } from "@/types";

export const STORAGE_PREFIX = "wrw.graph-layout.v1";

export const GRAPH_UI_STORAGE_KEY = "wrw.graph-ui.v1";

export const VALID_LENSES: readonly Lens[] = ["all", "historical", "devotional", "esoteric"] as const;

export const VALID_FOCUS_DEPTHS = [1, 2] as const;

export type FocusDepth = (typeof VALID_FOCUS_DEPTHS)[number];
export type PersistedLayoutSnapshot = {
  positions: Record<string, { x: number; y: number }>;
  viewport?: { zoom: number; pan: { x: number; y: number } };
  savedAt: number;
};

export type PathScope = "visible" | "filtered";

export type GraphUrlState = {
  focusId: string | null;
  depth: FocusDepth | null;
  lens: Lens;
  types: string[];
  search: string;
  pathStartId: string | null;
  pathEndId: string | null;
  pathScope: PathScope;
};

export type GraphUiState = {
  lens: Lens;
  types: string[];
  search: string;
};

function isFocusDepth(value: number): value is FocusDepth {
  return VALID_FOCUS_DEPTHS.includes(value as FocusDepth);
}

function normalizeLens(value: string | null | undefined): Lens | null {
  if (!value) return null;
  return VALID_LENSES.includes(value as Lens) ? (value as Lens) : null;
}

function normalizeTypes(value: string | null | undefined): string[] {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).sort();
}

function parseFocusDepth(value: string | null | undefined): FocusDepth | null {
  if (!value) return null;
  const parsed = Number(value);
  return isFocusDepth(parsed) ? parsed : null;
}

function cleanSearch(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function cleanEntityId(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function normalizePathScope(value: string | null | undefined): PathScope {
  return value === "filtered" ? "filtered" : "visible";
}

function parseHashParams(hash: string): URLSearchParams {
  const trimmed = hash.replace(/^#/, "").trim();
  if (!trimmed) return new URLSearchParams();
  return new URLSearchParams(trimmed.includes("=") ? trimmed : `focus=${trimmed}`);
}

function readJsonStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseGraphUrlState(): GraphUrlState {
  if (typeof window === "undefined") {
    return {
      focusId: null,
      depth: null,
      lens: "all",
      types: [],
      search: "",
      pathStartId: null,
      pathEndId: null,
      pathScope: "visible",
    };
  }

  const url = new URL(window.location.href);
  const hashParams = parseHashParams(window.location.hash);

  return {
    focusId: cleanEntityId(url.searchParams.get("focus") || hashParams.get("focus")),
    depth: parseFocusDepth(url.searchParams.get("depth")) ?? parseFocusDepth(hashParams.get("depth")),
    lens: normalizeLens(url.searchParams.get("lens")) ?? normalizeLens(hashParams.get("lens")) ?? "all",
    types: normalizeTypes(url.searchParams.get("types") || hashParams.get("types")),
    search: cleanSearch(url.searchParams.get("search") || hashParams.get("search")),
    pathStartId: cleanEntityId(url.searchParams.get("pathStart") || hashParams.get("pathStart")),
    pathEndId: cleanEntityId(url.searchParams.get("pathEnd") || hashParams.get("pathEnd")),
    pathScope: normalizePathScope(url.searchParams.get("pathScope") || hashParams.get("pathScope")),
  };
}

export function syncGraphUrlState(state: GraphUrlState, push = false) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams();

  if (state.focusId) {
    url.searchParams.set("focus", state.focusId);
    hashParams.set("focus", state.focusId);
  } else {
    url.searchParams.delete("focus");
  }

  if (state.depth) {
    const depth = String(state.depth);
    url.searchParams.set("depth", depth);
    hashParams.set("depth", depth);
  } else {
    url.searchParams.delete("depth");
  }

  if (state.lens !== "all") {
    url.searchParams.set("lens", state.lens);
    hashParams.set("lens", state.lens);
  } else {
    url.searchParams.delete("lens");
  }

  if (state.types.length > 0) {
    const types = state.types.join(",");
    url.searchParams.set("types", types);
    hashParams.set("types", types);
  } else {
    url.searchParams.delete("types");
  }

  if (state.search) {
    url.searchParams.set("search", state.search);
    hashParams.set("search", state.search);
  } else {
    url.searchParams.delete("search");
  }

  if (state.pathStartId) {
    url.searchParams.set("pathStart", state.pathStartId);
    hashParams.set("pathStart", state.pathStartId);
  } else {
    url.searchParams.delete("pathStart");
  }

  if (state.pathEndId) {
    url.searchParams.set("pathEnd", state.pathEndId);
    hashParams.set("pathEnd", state.pathEndId);
  } else {
    url.searchParams.delete("pathEnd");
  }

  if (state.pathScope !== "visible") {
    url.searchParams.set("pathScope", state.pathScope);
    hashParams.set("pathScope", state.pathScope);
  } else {
    url.searchParams.delete("pathScope");
  }

  url.hash = hashParams.toString();

  if (push) {
    window.history.pushState({}, "", url);
  } else {
    window.history.replaceState({}, "", url);
  }
}

export function readGraphUiState(): GraphUiState | null {
  return readJsonStorage<GraphUiState>(GRAPH_UI_STORAGE_KEY);
}

export function persistGraphUiState(state: GraphUiState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      GRAPH_UI_STORAGE_KEY,
      JSON.stringify({
        lens: state.lens,
        types: Array.from(new Set(state.types)).sort(),
        search: cleanSearch(state.search),
      } satisfies GraphUiState)
    );
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

export function buildLayoutStorageKey(
  layoutName: string,
  visibleNodeIds: string[],
  selectedId: string | null,
  focusDepth: FocusDepth | null
) {
  const visibilityKey = visibleNodeIds.join("|");
  const scope = selectedId && focusDepth ? `focus:${selectedId}:${focusDepth}` : "full";
  return `${STORAGE_PREFIX}:${layoutName}:${scope}:${visibilityKey}`;
}

export function readLayoutSnapshot(storageKey: string): PersistedLayoutSnapshot | null {
  return readJsonStorage<PersistedLayoutSnapshot>(storageKey);
}

export function getInitialGraphControls(): GraphUiState {
  const urlState = parseGraphUrlState();
  const storedState = readGraphUiState();

  return {
    lens: urlState.lens ?? storedState?.lens ?? "all",
    types: urlState.types.length > 0 ? urlState.types : storedState?.types ?? [],
    search: urlState.search || storedState?.search || "",
  };
}
