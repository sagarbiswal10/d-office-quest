import { create } from "zustand";
import {
  CAMPAIGN,
  NETWORK,
  OPENING_DELAY,
  THREATS,
  TOTAL_THREATS,
  WAVE_DELAY,
  type ThreatType,
} from "./data";
import { sfx } from "./audio";

export type NodeStatus = "clean" | "infected" | "isolated";
export interface NodeState {
  status: NodeStatus;
  infection: number;
  threat: ThreatType | null;
  investigated: boolean;
  isolatedFor: number;
}
export type Phase = "menu" | "playing" | "paused" | "results";
export interface LogEntry {
  id: number;
  text: string;
  tone: "info" | "good" | "bad";
}
export interface LeaderEntry {
  runId: string;
  name: string;
  score: number;
  rank: string;
  date: string;
}

interface GameState {
  phase: Phase;
  playerName: string;
  nodes: NodeState[];
  selected: number | null;
  elapsed: number;
  integrity: number;
  energy: number;
  firewallFor: number;
  score: number;
  combo: number;
  maxCombo: number;
  contained: number;
  breaches: number;
  nextThreat: number;
  spawnIn: number;
  log: LogEntry[];
  lastTip: string | null;
  endReason: string;
  victory: boolean;
  runId: string;

  // Investigation Modal Dossier
  investigationModalOpen: boolean;
  activeInvestigationNodeId: number | null;
  openInvestigationModal: (nodeId?: number) => void;
  closeInvestigationModal: () => void;

  // MediaPipe Vision & Gesture State
  cameraActive: boolean;
  setCameraActive: (active: boolean) => void;
  activeGesture: string | null;
  setActiveGesture: (gesture: string | null) => void;
  pointingCrosshair: { x: number; y: number; active: boolean; label: string } | null;
  setPointingCrosshair: (
    crosshair: { x: number; y: number; active: boolean; label: string } | null,
  ) => void;
  isolateBanner: { label: string; time: number } | null;

  // 360 Camera & Zoom
  cameraAzimuth: number;
  cameraPolar: number;
  cameraDistance: number;
  adjustOrbit: (deltaAzimuth: number, deltaPolar: number) => void;
  adjustZoom: (delta: number) => void;

  // Core Actions
  setName: (n: string) => void;
  start: () => void;
  toMenu: () => void;
  togglePause: () => void;
  select: (id: number | null) => void;
  investigate: (nodeId?: number) => boolean;
  isolate: (nodeId?: number) => boolean;
  firewall: () => void;
  tick: (dt: number) => void;
}

const fresh = (): NodeState[] =>
  NETWORK.nodes.map(() => ({
    status: "clean",
    infection: 0,
    threat: null,
    investigated: false,
    isolatedFor: 0,
  }));

let logId = 0;
const push = (log: LogEntry[], text: string, tone: LogEntry["tone"]) =>
  [{ id: ++logId, text, tone }, ...log].slice(0, 8);

export const LB_KEY = "cyber-raid-leaderboard-v2";
export function loadLeaderboard(): LeaderEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LB_KEY) || "[]") as LeaderEntry[];
  } catch {
    return [];
  }
}
export function saveScore(entry: LeaderEntry) {
  const existing = loadLeaderboard().filter((item) => item.runId !== entry.runId);
  const leaderboard = [...existing, entry].sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem(LB_KEY, JSON.stringify(leaderboard));
  return leaderboard;
}

function infect(nodes: NodeState[], id: number, threat: ThreatType) {
  const node = nodes[id];
  if (!node || node.status !== "clean") return false;
  nodes[id] = { status: "infected", infection: 0.1, threat, investigated: false, isolatedFor: 0 };
  return true;
}

function finish(
  set: (patch: Partial<GameState>) => void,
  state: GameState,
  victory: boolean,
  reason: string,
) {
  sfx.end();
  const integrityBonus = victory ? Math.round(state.integrity * 18) : 0;
  const paceBonus = victory ? Math.max(0, 1800 - Math.round(state.elapsed * 6)) : 0;
  set({
    phase: "results",
    victory,
    investigationModalOpen: false,
    score: state.score + integrityBonus + paceBonus,
    endReason: `${reason}${victory ? ` Integrity +${integrityBonus}, response +${paceBonus}.` : ""}`,
  });
}

export const useGame = create<GameState>((set, get) => ({
  phase: "menu",
  playerName: "",
  nodes: fresh(),
  selected: null,
  elapsed: 0,
  integrity: 100,
  energy: 100,
  firewallFor: 0,
  score: 0,
  combo: 1,
  maxCombo: 1,
  contained: 0,
  breaches: 0,
  nextThreat: 0,
  spawnIn: OPENING_DELAY,
  log: [],
  lastTip: null,
  endReason: "",
  victory: false,
  runId: "",

  // Modal
  investigationModalOpen: false,
  activeInvestigationNodeId: null,
  openInvestigationModal: (nodeId) => {
    const target = nodeId !== undefined ? nodeId : get().selected;
    if (target !== null && target !== undefined) {
      set({ investigationModalOpen: true, activeInvestigationNodeId: target, selected: target });
    }
  },
  closeInvestigationModal: () => set({ investigationModalOpen: false }),

  // MediaPipe
  cameraActive: false,
  setCameraActive: (active) => set({ cameraActive: active }),
  activeGesture: null,
  setActiveGesture: (gesture) => set({ activeGesture: gesture }),
  pointingCrosshair: null,
  setPointingCrosshair: (c) => set({ pointingCrosshair: c }),
  isolateBanner: null,

  // 360 Orbit & Zoom
  cameraAzimuth: 0,
  cameraPolar: 0.95,
  cameraDistance: 24,
  adjustOrbit: (deltaAzimuth, deltaPolar) => {
    set((s) => ({
      cameraAzimuth: s.cameraAzimuth + deltaAzimuth,
      cameraPolar: Math.max(0.35, Math.min(1.42, s.cameraPolar + deltaPolar)),
    }));
  },
  adjustZoom: (delta) => {
    set((s) => {
      const nextDist = Math.max(12, Math.min(34, s.cameraDistance + delta));
      if (delta < 0) sfx.zoomIn();
      else if (delta > 0) sfx.zoomOut();
      return { cameraDistance: nextDist };
    });
  },

  setName: (playerName) => set({ playerName }),
  start: () => {
    sfx.start();
    set({
      phase: "playing",
      nodes: fresh(),
      selected: null,
      elapsed: 0,
      integrity: 100,
      energy: 100,
      firewallFor: 0,
      score: 0,
      combo: 1,
      maxCombo: 1,
      contained: 0,
      breaches: 0,
      nextThreat: 0,
      spawnIn: OPENING_DELAY,
      investigationModalOpen: false,
      activeInvestigationNodeId: null,
      cameraAzimuth: 0,
      cameraPolar: 0.95,
      cameraDistance: 24,
      log: [
        {
          id: ++logId,
          text: "SOC Shift started. Real-time network telemetry active.",
          tone: "info",
        },
      ],
      lastTip: null,
      endReason: "",
      victory: false,
      runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  },
  toMenu: () => set({ phase: "menu", selected: null, investigationModalOpen: false }),
  togglePause: () =>
    set((s) =>
      s.phase === "playing"
        ? { phase: "paused" }
        : s.phase === "paused"
          ? { phase: "playing" }
          : {},
    ),
  select: (id) => {
    if (get().phase !== "playing") return;
    if (id !== null && id !== get().selected) sfx.select();
    set({ selected: id });
  },

  investigate: (targetNodeId) => {
    const s = get();
    if (s.phase !== "playing") return false;

    // Pick targeted node, or currently selected node, or first active infected node
    let target = targetNodeId !== undefined ? targetNodeId : s.selected;
    if (target === null || target === undefined || !s.nodes[target]) {
      const firstInfected = s.nodes.findIndex((n) => n.status === "infected");
      if (firstInfected >= 0) target = firstInfected;
    }

    if (target === null || target === undefined) return false;
    const node = s.nodes[target];
    const label = NETWORK.nodes[target]?.label ?? "Device";
    if (!node) return false;

    if (node.status !== "infected") {
      sfx.error();
      set({ log: push(s.log, `${label}: No active malware signature detected.`, "info") });
      return false;
    }

    sfx.investigate();
    const nodes = [...s.nodes];
    nodes[target] = {
      ...node,
      investigated: true,
      infection: Math.max(0.04, node.infection - 0.15),
    };
    const threat = node.threat ? THREATS[node.threat] : null;

    set({
      nodes,
      selected: target,
      score: s.score + 80 * s.combo,
      lastTip: threat?.tip ?? null,
      investigationModalOpen: true,
      activeInvestigationNodeId: target,
      log: push(
        s.log,
        `FORENSIC INVESTIGATION: ${label} infected with ${threat?.name ?? "Malware"}. Threat dossier opened.`,
        "info",
      ),
    });
    return true;
  },

  isolate: (targetNodeId) => {
    const s = get();
    if (s.phase !== "playing") return false;

    let target = targetNodeId !== undefined ? targetNodeId : s.selected;
    if (target === null || target === undefined) {
      if (s.activeInvestigationNodeId !== null) target = s.activeInvestigationNodeId;
      else {
        // Look for investigated infected node
        const investigatedIndex = s.nodes.findIndex(
          (n) => n.status === "infected" && n.investigated,
        );
        if (investigatedIndex >= 0) target = investigatedIndex;
        else {
          const firstInfected = s.nodes.findIndex((n) => n.status === "infected");
          if (firstInfected >= 0) target = firstInfected;
        }
      }
    }

    if (target === null || target === undefined) return false;
    const node = s.nodes[target];
    const label = NETWORK.nodes[target]?.label ?? "Device";
    if (!node) return false;

    if (node.status !== "infected") {
      sfx.error();
      set({ log: push(s.log, `${label}: System is clean or already quarantined.`, "bad") });
      return false;
    }

    sfx.blinkIsolate();
    const isInvestigated = node.investigated;
    const gain = Math.round((isInvestigated ? 350 : 220) * s.combo);
    const combo = Math.min(8, s.combo + 1);
    const contained = s.contained + 1;

    const nodes = [...s.nodes];
    nodes[target] = {
      status: "isolated",
      infection: 0,
      threat: null,
      investigated: false,
      isolatedFor: 5.0,
    };

    set({
      nodes,
      score: s.score + gain,
      combo,
      maxCombo: Math.max(s.maxCombo, combo),
      contained,
      energy: Math.min(100, s.energy + 15),
      spawnIn: WAVE_DELAY,
      investigationModalOpen: false,
      activeInvestigationNodeId: null,
      selected: null,
      isolateBanner: { label, time: Date.now() },
      log: push(
        s.log,
        `BIOMETRIC ISOLATION: ${label} quarantined successfully (+${gain} pts).`,
        "good",
      ),
    });

    if (contained >= TOTAL_THREATS && s.nextThreat >= TOTAL_THREATS) {
      finish(
        set,
        { ...s, nodes, contained },
        true,
        "All enterprise cyber threats neutralized. SOC shift accomplished.",
      );
    }
    return true;
  },

  firewall: () => {
    const s = get();
    if (s.phase !== "playing" || s.firewallFor > 0) return;
    if (s.energy < 35) {
      sfx.error();
      set({ log: push(s.log, "Counter-Firewall requires 35% capacitor charge.", "bad") });
      return;
    }
    sfx.firewall();
    set({
      energy: s.energy - 35,
      firewallFor: 9,
      log: push(s.log, "COUNTER-FIREWALL ACTIVE: Enterprise ingress filtered for 9s.", "good"),
    });
  },

  tick: (dt) => {
    const s = get();
    if (s.phase !== "playing") return;
    const nodes = [...s.nodes];
    let { integrity, log, breaches, spawnIn, combo, nextThreat } = s;
    const firewallFactor = s.firewallFor > 0 ? 0.16 : 1;
    let activeThreats = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      if (node.status === "isolated") {
        const left = node.isolatedFor - dt;
        nodes[i] =
          left <= 0 ? { ...node, status: "clean", isolatedFor: 0 } : { ...node, isolatedFor: left };
      } else if (node.status === "infected" && node.threat) {
        activeThreats++;
        const growthRate = THREATS[node.threat]?.growth ?? 0.03;
        const infection =
          node.infection + growthRate * firewallFactor * dt * (node.investigated ? 0.5 : 1);
        integrity -= infection * 0.09 * dt;

        if (infection >= 1) {
          breaches++;
          combo = 1;
          integrity -= 8.5;
          sfx.breach();
          nodes[i] = { ...node, infection: 0.5 };
          const neighbor = NETWORK.neighbors[i]?.find((id) => nodes[id]?.status === "clean");
          if (neighbor !== undefined && node.threat) infect(nodes, neighbor, node.threat);
          log = push(
            log,
            `CRITICAL BREACH: ${NETWORK.nodes[i]?.label ?? "Host"} lateral spread detected!`,
            "bad",
          );
        } else {
          nodes[i] = { ...node, infection };
        }
      }
    }

    if (activeThreats === 0 && nextThreat < TOTAL_THREATS) {
      spawnIn -= dt;
      if (spawnIn <= 0) {
        const candidates = nodes
          .map((n, i) => (n.status === "clean" && NETWORK.nodes[i]?.kind !== "router" ? i : -1))
          .filter((i) => i >= 0);
        if (candidates.length) {
          const id = candidates[(nextThreat * 3 + 2) % candidates.length];
          const threat = CAMPAIGN[nextThreat];
          if (id !== undefined && threat && infect(nodes, id, threat)) {
            nextThreat++;
            sfx.alert();
            log = push(
              log,
              `INCIDENT ALERT ${nextThreat}/${TOTAL_THREATS}: Host ${NETWORK.nodes[id]?.label ?? "System"} showing anomalous telemetry.`,
              "info",
            );
          }
        }
      }
    }

    const patch: Partial<GameState> = {
      nodes,
      integrity: Math.max(0, integrity),
      log,
      breaches,
      spawnIn,
      nextThreat,
      combo,
      elapsed: s.elapsed + dt,
      firewallFor: Math.max(0, s.firewallFor - dt),
      energy: Math.min(100, s.energy + dt * 1.6),
    };

    if (integrity <= 0) {
      finish(
        set,
        { ...s, ...patch } as GameState,
        false,
        "Security breach: Enterprise network integrity collapsed.",
      );
    } else {
      set(patch);
    }
  },
}));

export function threatLevel(nodes: NodeState[]) {
  const sum = nodes.reduce(
    (total, node) => total + (node.status === "infected" ? 0.35 + node.infection : 0),
    0,
  );
  return Math.min(100, Math.round((sum / 3.5) * 100));
}
