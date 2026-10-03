import { create } from "zustand";
import {
  CAMPAIGN,
  NETWORK,
  THREATS,
  getActiveNodeIds,
  getActiveLinks,
  type ThreatType,
} from "./data";
import { sfx } from "./audio";

export type NodeStatus = "clean" | "infected" | "isolated";
export interface NodeState {
  status: NodeStatus;
  infection: number;
  threat: ThreatType | null;
  investigated: boolean;
  threatIdentified: boolean;
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

export interface AttackAlert {
  title: string;
  deviceLabel: string;
  kind: string;
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
  missionProgress: number; // 0 to 5
  breaches: number;
  nextThreat: number;
  spawnIn: number;
  log: LogEntry[];
  lastTip: string | null;
  endReason: string;
  victory: boolean;
  runId: string;

  // Active High-Priority Attack Alert Banner
  activeAttackAlert: AttackAlert | null;

  // Investigation Modal Dossier
  investigationModalOpen: boolean;
  activeInvestigationNodeId: number | null;
  openInvestigationModal: (nodeId?: number) => void;
  closeInvestigationModal: () => void;
  markThreatIdentified: (nodeId: number) => void;

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
  nodeScreenCoords: Record<number, { x: number; y: number }>;
  setNodeScreenCoords: (coords: Record<number, { x: number; y: number }>) => void;

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
  firewall: () => boolean;
  tick: (dt: number) => void;
}

const fresh = (): NodeState[] =>
  NETWORK.nodes.map(() => ({
    status: "clean",
    infection: 0,
    threat: null,
    investigated: false,
    threatIdentified: false,
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
  nodes[id] = {
    status: "infected",
    infection: 0.12,
    threat,
    investigated: false,
    threatIdentified: false,
    isolatedFor: 0,
  };
  return true;
}

function finish(
  set: (patch: Partial<GameState>) => void,
  state: GameState,
  victory: boolean,
  reason: string,
) {
  sfx.end();
  const integrityBonus = victory ? Math.round(state.integrity * 20) : 0;
  const paceBonus = victory ? Math.max(0, 2000 - Math.round(state.elapsed * 6)) : 0;
  set({
    phase: "results",
    victory,
    investigationModalOpen: false,
    activeAttackAlert: null,
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
  missionProgress: 0,
  breaches: 0,
  nextThreat: 0,
  spawnIn: 4.0, // Initial 4 seconds of healthy green network flow
  activeAttackAlert: null,
  log: [
    {
      id: ++logId,
      text: "SOC SHIFT READY: 0/5 Mission Progress. Monitoring 1 Server, 1 PC, 1 Router.",
      tone: "info",
    },
  ],
  lastTip: null,
  endReason: "",
  victory: false,
  runId: "",

  investigationModalOpen: false,
  activeInvestigationNodeId: null,
  openInvestigationModal: (nodeId) => {
    const s = get();
    const target = nodeId !== undefined ? nodeId : s.selected;
    if (target !== null && s.nodes[target]) {
      set({ investigationModalOpen: true, activeInvestigationNodeId: target });
    }
  },
  closeInvestigationModal: () => {
    set({ investigationModalOpen: false });
  },

  markThreatIdentified: (nodeId: number) => {
    const s = get();
    const nodes = [...s.nodes];
    if (nodes[nodeId]) {
      nodes[nodeId] = {
        ...nodes[nodeId],
        investigated: true,
        threatIdentified: true,
      };
      const label = NETWORK.nodes[nodeId]?.label ?? "Host";
      set({
        nodes,
        log: push(
          s.log,
          `✓ THREAT IDENTIFIED: ${label} malware signature verified. ISOLATE UNLOCKED.`,
          "good",
        ),
      });
      sfx.threatIdentified();
    }
  },

  cameraActive: false,
  setCameraActive: (cameraActive) => set({ cameraActive }),
  activeGesture: null,
  setActiveGesture: (activeGesture) => set({ activeGesture }),
  pointingCrosshair: null,
  setPointingCrosshair: (pointingCrosshair) => set({ pointingCrosshair }),
  isolateBanner: null,
  nodeScreenCoords: {},
  setNodeScreenCoords: (nodeScreenCoords) => set({ nodeScreenCoords }),

  cameraAzimuth: 0,
  cameraPolar: 0.95,
  cameraDistance: 27,
  adjustOrbit: (deltaAzimuth, deltaPolar) => {
    set((s) => ({
      cameraAzimuth: s.cameraAzimuth + deltaAzimuth,
      cameraPolar: Math.max(0.55, Math.min(1.3, s.cameraPolar + deltaPolar)),
    }));
  },
  adjustZoom: (delta) => {
    set((s) => {
      const nextDist = Math.max(8, Math.min(42, s.cameraDistance + delta));
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
      missionProgress: 0,
      breaches: 0,
      nextThreat: 0,
      spawnIn: 4.0, // starts attack after a few initial seconds of green operation
      activeAttackAlert: null,
      investigationModalOpen: false,
      activeInvestigationNodeId: null,
      runId: Math.random().toString(36).slice(2, 9),
      log: [
        {
          id: ++logId,
          text: "ENTERPRISE SOC ONLINE: Continuous healthy traffic between Server, PC, Router. Threat monitor active.",
          tone: "good",
        },
      ],
    });
  },

  toMenu: () => {
    const s = get();
    if (s.phase === "results" && s.playerName.trim()) {
      saveScore({
        runId: s.runId,
        name: s.playerName.trim().slice(0, 16),
        score: s.score,
        rank: s.victory ? "SPECIALIST" : "DEFENDER",
        date: new Date().toISOString(),
      });
    }
    set({ phase: "menu", investigationModalOpen: false, activeAttackAlert: null });
  },

  togglePause: () => {
    const p = get().phase;
    if (p === "playing") set({ phase: "paused" });
    else if (p === "paused") set({ phase: "playing" });
  },

  select: (id) => {
    if (id !== null && id !== get().selected) sfx.select();
    set({ selected: id });
  },

  investigate: (targetNodeId) => {
    const s = get();
    if (s.phase !== "playing") return false;

    // RULE: The player must point at / select the infected device.
    // The investigation panel MUST NEVER appear automatically.
    let target = targetNodeId !== undefined ? targetNodeId : s.selected;

    if (target === null || target === undefined) {
      if (s.pointingCrosshair?.active) {
        const found = NETWORK.nodes.findIndex((n) => n.label === s.pointingCrosshair?.label);
        if (found >= 0) target = found;
      }
    }

    if (target === null || target === undefined || !s.nodes[target]) {
      return false;
    }

    const node = s.nodes[target];
    const label = NETWORK.nodes[target]?.label ?? "Device";

    sfx.investigate();

    // If node is clean (non-affected component):
    if (node.status !== "infected") {
      set({
        selected: target,
        investigationModalOpen: true,
        activeInvestigationNodeId: target,
        log: push(
          s.log,
          `✓ ${label} INSPECTED: Clean host. Zero malware signatures detected.`,
          "good",
        ),
      });
      return true;
    }

    // If node is infected:
    const nextNodes = [...s.nodes];
    nextNodes[target] = {
      ...node,
      investigated: true,
      threatIdentified: true,
    };
    const threatName = node.threat ? (THREATS[node.threat]?.name ?? "Malware") : "Malware";

    set({
      selected: target,
      nodes: nextNodes,
      investigationModalOpen: true,
      activeInvestigationNodeId: target,
      log: push(
        s.log,
        `🚨 ${label} COMPROMISED: ${threatName} signature detected! ISOLATE UNLOCKED.`,
        "bad",
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
    }

    // If still no target, check if any active node is infected
    if (target === null || target === undefined) {
      const activeIds = getActiveNodeIds(s.missionProgress);
      const infectedId = activeIds.find((id) => s.nodes[id]?.status === "infected");
      if (infectedId !== undefined) target = infectedId;
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
    const nextProgress = Math.min(5, s.missionProgress + 1);
    const nextNodes = [...s.nodes];

    // Immediately returns to normal with green data packets flowing again!
    nextNodes[target] = {
      status: "clean",
      infection: 0,
      threat: null,
      investigated: false,
      threatIdentified: false,
      isolatedFor: 0,
    };

    const gain = Math.round(500 * s.combo);
    const combo = Math.min(8, s.combo + 1);
    const contained = s.contained + 1;

    // Continuous operation: random interval for next incident (3.5 to 6.5s)
    const randomNextInterval = 3.5 + Math.random() * 3.0;

    let expansionNote = "";
    if (nextProgress === 1) expansionNote = " · [1/5: +1 PC (WS-02) added to traffic]";
    else if (nextProgress === 2) expansionNote = " · [2/5: +1 Server (SRV-02) added to traffic]";
    else if (nextProgress === 3) expansionNote = " · [3/5: +1 Router (WIFI-01) added to traffic]";
    else if (nextProgress === 4) expansionNote = " · [4/5: +1 PC & +1 Server added to traffic]";
    else if (nextProgress === 5)
      expansionNote = " · [5/5: Enterprise Core Connected (Multi-Threat Active)]";

    const keepModalForConfirmation = s.investigationModalOpen;

    set({
      nodes: nextNodes,
      missionProgress: nextProgress,
      score: s.score + gain,
      combo,
      maxCombo: Math.max(s.maxCombo, combo),
      contained,
      energy: Math.min(100, s.energy + 20),
      spawnIn: randomNextInterval,
      activeAttackAlert: null,
      investigationModalOpen: keepModalForConfirmation,
      activeInvestigationNodeId: keepModalForConfirmation ? target : null,
      selected: null,
      isolateBanner: { label, time: Date.now() },
      log: push(
        s.log,
        `✓ THREAT ISOLATED: ${label} quarantined. Network operating normal (${nextProgress}/5)${expansionNote}.`,
        "good",
      ),
    });

    // Check victory condition when all 5 incidents are neutralized
    if (nextProgress >= 5 && contained >= 5) {
      finish(
        set,
        { ...s, nodes: nextNodes, contained, missionProgress: 5 },
        true,
        "Enterprise network secured! All 5 mission incidents neutralized.",
      );
    }
    return true;
  },

  firewall: () => {
    const s = get();
    if (s.phase !== "playing" || s.firewallFor > 0) return false;
    sfx.firewall();
    set({
      energy: Math.max(0, s.energy - 10),
      firewallFor: 6.5,
      log: push(
        s.log,
        "🛡️ ZERO-TRUST FIREWALL SHIELD ACTIVATED: All threat growth completely frozen for 6.5s!",
        "good",
      ),
    });
    return true;
  },

  tick: (dt) => {
    const s = get();
    if (s.phase !== "playing") return;
    const nodes = [...s.nodes];
    let { integrity, log, breaches, spawnIn, combo, nextThreat, activeAttackAlert } = s;
    const isFirewallActive = s.firewallFor > 0;
    const firewallFactor = isFirewallActive ? 0 : 1;

    // Active nodes participating in cyber network traffic
    const activeNodeIds = getActiveNodeIds(s.missionProgress);
    let activeThreats = 0;

    for (const i of activeNodeIds) {
      const node = nodes[i];
      if (!node) continue;

      if (node.status === "infected" && node.threat) {
        activeThreats++;
        if (!isFirewallActive) {
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
            const neighbors = NETWORK.neighbors[i]?.filter((id) => activeNodeIds.includes(id));
            const neighbor = neighbors?.find((id) => nodes[id]?.status === "clean");
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
    }

    // Continuous attack trigger: After a random interval without countdowns
    // At Tier 5 (5/5), allow multiple simultaneous fictional cyber incidents!
    const maxSimultaneous = s.missionProgress >= 5 ? 3 : s.missionProgress >= 4 ? 2 : 1;

    if (activeThreats < maxSimultaneous && s.contained < 5) {
      spawnIn -= dt;
      if (spawnIn <= 0) {
        // Pick an active device to infect
        const cleanActiveIds = activeNodeIds.filter((id) => nodes[id]?.status === "clean");
        if (cleanActiveIds.length > 0) {
          const pickId = cleanActiveIds[Math.floor(Math.random() * cleanActiveIds.length)]!;
          const threatTypes: ThreatType[] = [
            "malware",
            "phishing",
            "ransomware",
            "botnet",
            "exfiltration",
          ];
          const threat = threatTypes[s.missionProgress % threatTypes.length] || "malware";

          if (infect(nodes, pickId, threat)) {
            nextThreat++;
            sfx.alert();
            const def = NETWORK.nodes[pickId];
            let alertTitle = "CRITICAL SERVER FAILURE DETECTED";
            if (def?.kind === "computer") alertTitle = "CRITICAL WORKSTATION COMPROMISED";
            else if (def?.kind === "router") alertTitle = "CORE ROUTER BREACH DETECTED";
            else alertTitle = "SERVER UNDER ATTACK";

            activeAttackAlert = {
              title: alertTitle,
              deviceLabel: def?.label ?? "DEVICE",
              kind: def?.kind ?? "server",
            };

            log = push(
              log,
              `🚨 ${alertTitle}: ${def?.label ?? "System"} network anomaly detected!`,
              "bad",
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
      activeAttackAlert,
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
