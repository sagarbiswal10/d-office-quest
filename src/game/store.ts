import { create } from "zustand";
import { CAMPAIGN, NETWORK, OPENING_DELAY, THREATS, TOTAL_THREATS, WAVE_DELAY, type ThreatType } from "./data";
import { sfx } from "./audio";

export type NodeStatus = "clean" | "infected" | "isolated";
export interface NodeState { status: NodeStatus; infection: number; threat: ThreatType | null; investigated: boolean; isolatedFor: number; }
export type Phase = "menu" | "playing" | "paused" | "results";
export interface LogEntry { id: number; text: string; tone: "info" | "good" | "bad"; }
export interface LeaderEntry { runId: string; name: string; score: number; rank: string; date: string; }

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
  setName: (n: string) => void;
  start: () => void;
  toMenu: () => void;
  togglePause: () => void;
  select: (id: number | null) => void;
  investigate: () => void;
  isolate: () => void;
  firewall: () => void;
  tick: (dt: number) => void;
}

const fresh = (): NodeState[] => NETWORK.nodes.map(() => ({ status: "clean", infection: 0, threat: null, investigated: false, isolatedFor: 0 }));
let logId = 0;
const push = (log: LogEntry[], text: string, tone: LogEntry["tone"]) => [{ id: ++logId, text, tone }, ...log].slice(0, 6);

export const LB_KEY = "cyber-raid-leaderboard-v2";
export function loadLeaderboard(): LeaderEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LB_KEY) || "[]") as LeaderEntry[]; } catch { return []; }
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
  nodes[id] = { status: "infected", infection: 0.08, threat, investigated: false, isolatedFor: 0 };
  return true;
}

function finish(set: (patch: Partial<GameState>) => void, state: GameState, victory: boolean, reason: string) {
  sfx.end();
  const integrityBonus = victory ? Math.round(state.integrity * 18) : 0;
  const paceBonus = victory ? Math.max(0, 1800 - Math.round(state.elapsed * 6)) : 0;
  set({ phase: "results", victory, score: state.score + integrityBonus + paceBonus, endReason: `${reason}${victory ? ` Integrity +${integrityBonus}, response +${paceBonus}.` : ""}` });
}

export const useGame = create<GameState>((set, get) => ({
  phase: "menu", playerName: "", nodes: fresh(), selected: null, elapsed: 0, integrity: 100, energy: 100,
  firewallFor: 0, score: 0, combo: 1, maxCombo: 1, contained: 0, breaches: 0, nextThreat: 0,
  spawnIn: OPENING_DELAY, log: [], lastTip: null, endReason: "", victory: false, runId: "",
  setName: (playerName) => set({ playerName }),
  start: () => {
    sfx.start();
    set({ phase: "playing", nodes: fresh(), selected: null, elapsed: 0, integrity: 100, energy: 100, firewallFor: 0,
      score: 0, combo: 1, maxCombo: 1, contained: 0, breaches: 0, nextThreat: 0, spawnIn: OPENING_DELAY,
      log: [{ id: ++logId, text: "Shift started. First alert expected shortly.", tone: "info" }], lastTip: null,
      endReason: "", victory: false, runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
  },
  toMenu: () => set({ phase: "menu", selected: null }),
  togglePause: () => set((s) => s.phase === "playing" ? { phase: "paused" } : s.phase === "paused" ? { phase: "playing" } : {}),
  select: (id) => {
    if (get().phase !== "playing") return;
    if (id !== null && id !== get().selected) sfx.select();
    set({ selected: id });
  },
  investigate: () => {
    const s = get();
    if (s.phase !== "playing" || s.selected === null) return;
    const node = s.nodes[s.selected];
    const label = NETWORK.nodes[s.selected]?.label ?? "Device";
    if (!node) return;
    if (node.status !== "infected") { sfx.error(); set({ log: push(s.log, `${label}: no active alert to investigate.`, "info") }); return; }
    if (node.investigated) return;
    sfx.investigate();
    const nodes = [...s.nodes];
    nodes[s.selected] = { ...node, investigated: true, infection: Math.max(0.05, node.infection - 0.12) };
    const threat = node.threat ? THREATS[node.threat] : null;
    if (!threat) return;
    set({ nodes, score: s.score + 80 * s.combo, lastTip: threat.tip, log: push(s.log, `${label}: identified ${threat.name}. Isolation unlocked.`, "info") });
  },
  isolate: () => {
    const s = get();
    if (s.phase !== "playing" || s.selected === null) return;
    const node = s.nodes[s.selected];
    const label = NETWORK.nodes[s.selected]?.label ?? "Device";
    if (!node) return;
    if (node.status !== "infected" || !node.investigated) { sfx.error(); set({ log: push(s.log, `${label}: investigate the alert before isolation.`, "bad") }); return; }
    sfx.isolate();
    const nodes = [...s.nodes];
    nodes[s.selected] = { status: "isolated", infection: 0, threat: null, investigated: false, isolatedFor: 3.5 };
    const gain = Math.round((260 + (1 - node.infection) * 240) * s.combo);
    const combo = Math.min(6, s.combo + 1);
    const contained = s.contained + 1;
    set({ nodes, selected: null, score: s.score + gain, combo, maxCombo: Math.max(s.maxCombo, combo), contained,
      energy: Math.min(100, s.energy + 10), spawnIn: WAVE_DELAY,
      log: push(s.log, `${label}: threat contained. +${gain}. Next sweep in ${WAVE_DELAY}s.`, "good") });
    if (contained >= TOTAL_THREATS && s.nextThreat >= TOTAL_THREATS) finish(set, { ...s, nodes, contained }, true, "All five threats contained. Office network secured.");
  },
  firewall: () => {
    const s = get();
    if (s.phase !== "playing" || s.firewallFor > 0) return;
    if (s.energy < 35) { sfx.error(); set({ log: push(s.log, "Firewall needs 35% energy.", "bad") }); return; }
    sfx.firewall();
    set({ energy: s.energy - 35, firewallFor: 8, log: push(s.log, "Firewall active for 8 seconds. Threat growth slowed.", "good") });
  },
  tick: (dt) => {
    const s = get();
    if (s.phase !== "playing") return;
    const nodes = [...s.nodes];
    let { integrity, log, breaches, spawnIn, combo, nextThreat } = s;
    const firewallFactor = s.firewallFor > 0 ? 0.18 : 1;
    let activeThreats = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      if (node.status === "isolated") {
        const left = node.isolatedFor - dt;
        nodes[i] = left <= 0 ? { ...node, status: "clean", isolatedFor: 0 } : { ...node, isolatedFor: left };
      } else if (node.status === "infected" && node.threat) {
        activeThreats++;
        const infection = node.infection + THREATS[node.threat].growth * firewallFactor * dt * (node.investigated ? 0.55 : 1);
        integrity -= infection * 0.08 * dt;
        if (infection >= 1) {
          breaches++;
          combo = 1;
          integrity -= 8;
          sfx.breach();
          nodes[i] = { ...node, infection: 0.58 };
          const neighbor = NETWORK.neighbors[i]?.find((id) => nodes[id]?.status === "clean");
          if (neighbor !== undefined) infect(nodes, neighbor, node.threat);
          log = push(log, `${NETWORK.nodes[i]?.label ?? "Device"}: breach spread to an adjacent system.`, "bad");
        } else nodes[i] = { ...node, infection };
      }
    }

    if (activeThreats === 0 && nextThreat < TOTAL_THREATS) {
      spawnIn -= dt;
      if (spawnIn <= 0) {
        const candidates = nodes.map((n, i) => n.status === "clean" && NETWORK.nodes[i]?.kind !== "router" ? i : -1).filter((i) => i >= 0);
        if (candidates.length) {
          const id = candidates[(nextThreat * 3 + 2) % candidates.length];
          const threat = CAMPAIGN[nextThreat];
          if (id !== undefined && threat && infect(nodes, id, threat)) {
            nextThreat++;
            sfx.alert();
            log = push(log, `Incident ${nextThreat}/${TOTAL_THREATS}: suspicious activity on ${NETWORK.nodes[id]?.label ?? "device"}.`, "info");
          }
        }
      }
    }

    const patch: Partial<GameState> = { nodes, integrity: Math.max(0, integrity), log, breaches, spawnIn,
      nextThreat, combo, elapsed: s.elapsed + dt, firewallFor: Math.max(0, s.firewallFor - dt), energy: Math.min(100, s.energy + dt * 1.5) };
    if (integrity <= 0) finish(set, { ...s, ...patch } as GameState, false, "Network compromised. The shift ended before containment.");
    else set(patch);
  },
}));

export function threatLevel(nodes: NodeState[]) {
  const sum = nodes.reduce((total, node) => total + (node.status === "infected" ? 0.35 + node.infection : 0), 0);
  return Math.min(100, Math.round((sum / 3) * 100));
}
