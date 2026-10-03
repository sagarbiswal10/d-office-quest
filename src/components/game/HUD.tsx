import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  AlertTriangle,
  Bug,
  CirclePause,
  Eye,
  FileSearch,
  Flame,
  Hand,
  Lock,
  LockKeyhole,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { NETWORK, THREATS, rankFor, getActiveNodeIds } from "@/game/data";
import { threatLevel, useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-28 flex-1">
      <div className="mb-1 flex justify-between text-[10px] uppercase text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-sm bg-muted">
        <div
          className={cn("h-full transition-[width] duration-300", tone)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function GSAPCrosshair({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-40 -translate-x-1/2 -translate-y-1/2 will-change-transform"
      style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
    >
      <div className="relative flex items-center justify-center">
        {/* Pure Circle Pointer Only - No target lines, no crosshairs */}
        <div className="size-10 rounded-full border-2 border-cyan-400 bg-cyan-400/20 shadow-[0_0_22px_rgba(6,182,212,0.9)] flex items-center justify-center">
          <div className="size-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(6,182,212,1)]" />
        </div>

        <div className="absolute left-7 top-0 whitespace-nowrap rounded bg-black/95 border border-cyan-500/80 px-2.5 py-1 text-[11px] font-bold text-cyan-300 shadow-2xl backdrop-blur-md">
          ● {label} (👉 PINCH SCAN · ✌️ RIGHT 'V' ISOLATE · 🖖 RIGHT 'W' SHIELD)
        </div>
      </div>
    </div>
  );
}

export function HUD() {
  const s = useGame();
  const selectedNode = s.selected === null ? null : s.nodes[s.selected];
  const selectedDef = s.selected === null ? null : NETWORK.nodes[s.selected];
  const activeNodes = getActiveNodeIds(s.missionProgress);
  const activeInfectedCount = activeNodes.filter((id) => s.nodes[id]?.status === "infected").length;
  const isAttackActive = activeInfectedCount > 0 || !!s.activeAttackAlert;

  const minute = Math.floor(s.elapsed / 60);
  const second = String(Math.floor(s.elapsed % 60)).padStart(2, "0");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "KeyI") useGame.getState().investigate();
      if (event.code === "KeyX" || event.code === "Enter") useGame.getState().isolate();
      if (event.code === "KeyF" || event.code === "KeyW") useGame.getState().firewall();
      if (event.code === "Escape" || event.code === "KeyP") useGame.getState().togglePause();
      if (event.key === "+" || event.key === "=") useGame.getState().adjustZoom(-3.5);
      if (event.key === "-" || event.key === "_") useGame.getState().adjustZoom(3.5);
      if (event.key === "[" || event.code === "ArrowLeft") useGame.getState().adjustOrbit(-0.25, 0);
      if (event.key === "]" || event.code === "ArrowRight") useGame.getState().adjustOrbit(0.25, 0);
      if (event.code === "ArrowUp") useGame.getState().adjustOrbit(0, -0.1);
      if (event.code === "ArrowDown") useGame.getState().adjustOrbit(0, 0.1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Determine attack banner copy
  const attackAlert = s.activeAttackAlert;
  let attackTitle = "CRITICAL SERVER FAILURE DETECTED";
  let attackDevice = "SYSTEM";
  if (attackAlert) {
    attackTitle = attackAlert.title;
    attackDevice = attackAlert.deviceLabel;
  } else if (selectedDef && selectedNode?.status === "infected") {
    attackTitle =
      selectedDef.kind === "server"
        ? "SERVER UNDER ATTACK"
        : selectedDef.kind === "computer"
          ? "CRITICAL WORKSTATION COMPROMISED"
          : "CORE ROUTER BREACH DETECTED";
    attackDevice = selectedDef.label;
  }

  // Check if Isolate is unlocked: active if selected host is infected or any active node is infected
  const hasInfection = s.nodes.some((n) => n.status === "infected");
  const isIsolateUnlocked = (selectedNode && selectedNode.status === "infected") || hasInfection;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 font-mono sm:p-4 transition-colors duration-500",
        isAttackActive
          ? "bg-red-950/15 shadow-[inset_0_0_80px_rgba(239,68,68,0.3)] ring-2 ring-red-500/40"
          : "bg-emerald-950/5",
      )}
    >
      {/* Top Telemetry Dashboard */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "panel pointer-events-auto flex items-center flex-wrap gap-2.5 sm:gap-4 px-3 py-1.5 sm:px-4 sm:py-2 transition-colors duration-300",
            isAttackActive
              ? "border-red-500/70 bg-black/90 shadow-red-950/60"
              : "border-emerald-500/50 bg-black/90",
          )}
        >
          <Bar
            label="Integrity"
            value={s.integrity}
            tone={isAttackActive ? "bg-red-500 animate-pulse" : "bg-emerald-500"}
          />
          <Bar
            label="Threat Level"
            value={threatLevel(s.nodes)}
            tone={isAttackActive ? "bg-red-600 animate-pulse" : "bg-emerald-400"}
          />
          <Bar
            label="Shield Energy"
            value={s.energy}
            tone={s.firewallFor > 0 ? "bg-emerald-400 animate-pulse" : "bg-cyan-500"}
          />
          <div className="h-5 w-px bg-border/60 mx-0.5 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-zinc-400 uppercase text-[9px] font-bold">WAVE</span>
            <span className="font-display font-black text-primary text-sm">
              {s.missionProgress}/5
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400 text-[10px]">
              {minute}:{second}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom & 360 Controls in HUD */}
          <div className="panel pointer-events-auto hidden items-center gap-1 px-2 py-1 sm:flex">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustZoom(-3.5)}
              title="Zoom In (Left 'V' Sign or +)"
            >
              <ZoomIn className="size-3.5 text-accent" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustZoom(3.5)}
              title="Zoom Out (Left 'W' Sign or -)"
            >
              <ZoomOut className="size-3.5 text-accent" />
            </Button>
            <div className="h-4 w-px bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustOrbit(-0.25, 0)}
              title="360° Pan Left (Left hand pan left or Left Arrow)"
            >
              <RotateCw className="size-3.5 -scale-x-100 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustOrbit(0.25, 0)}
              title="360° Pan Right (Left hand pan right or Right Arrow)"
            >
              <RotateCw className="size-3.5 text-primary" />
            </Button>
            <div className="h-4 w-px bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-[10px] text-cyan-300 gap-0.5"
              onClick={() => s.adjustOrbit(0, -0.12)}
              title="Tilt Camera Up (Left hand move up or Up Arrow)"
            >
              <span>▲ Tilt Up</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-1.5 text-[10px] text-cyan-300 gap-0.5"
              onClick={() => s.adjustOrbit(0, 0.12)}
              title="Tilt Camera Down (Left hand move down or Down Arrow)"
            >
              <span>▼ Tilt Down</span>
            </Button>
          </div>

          <div className="panel hidden px-4 py-2 text-right sm:block">
            <div className="font-display text-2xl text-primary">{s.score.toLocaleString()}</div>
            <div className="text-[10px] uppercase text-muted-foreground">
              {rankFor(s.score)} · x{s.combo}
            </div>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="pointer-events-auto"
            onClick={s.togglePause}
            aria-label="Pause mission"
            title="Pause mission"
          >
            <CirclePause />
          </Button>
        </div>
      </div>

      {/* Slim Top Notification Bar (NEVER blocks the center of the screen) */}
      {isAttackActive && (
        <div className="pointer-events-none absolute left-1/2 top-13 -translate-x-1/2 z-20 w-auto max-w-[92vw]">
          <div className="animate-pulse border border-red-500/90 bg-red-950/95 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)] px-4 py-1 rounded-full flex items-center gap-2 backdrop-blur-md">
            <ShieldAlert className="size-3.5 text-red-400 shrink-0 animate-bounce" />
            <span className="font-display font-black text-red-200 uppercase tracking-wide text-xs">
              🚨 {attackTitle}
            </span>
            <span className="text-zinc-300 text-[10px] hidden md:inline">
              · Point to scan · Right 'V' to isolate · 🖖 Right 'W' firewall
            </span>
          </div>
        </div>
      )}

      {s.firewallFor > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-13 -translate-x-1/2 z-20 w-auto max-w-[92vw]">
          <div className="animate-pulse border border-cyan-400 bg-cyan-950/95 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.6)] px-4 py-1 rounded-full flex items-center gap-2 backdrop-blur-md">
            <ShieldCheck className="size-3.5 text-cyan-300 shrink-0 animate-spin" />
            <span className="font-display font-black text-cyan-200 uppercase tracking-wide text-xs">
              🛡️ FIREWALL ACTIVE ({s.firewallFor.toFixed(1)}s)
            </span>
            <span className="text-cyan-400 text-[10px] hidden md:inline">· All threats frozen</span>
          </div>
        </div>
      )}

      {/* GSAP-Smoothed Pointing Gesture Crosshair HUD Overlay */}
      {s.pointingCrosshair?.active && (
        <GSAPCrosshair
          x={s.pointingCrosshair.x}
          y={s.pointingCrosshair.y}
          label={s.pointingCrosshair.label}
        />
      )}

      {/* Bottom Command Deck (Contains Docked Component Ribbon & Action Panel) */}
      <div className="pointer-events-auto flex flex-col gap-1.5 w-full">
        {/* Sleek Docked Component Ribbon - Docked at the bottom, NEVER in the middle */}
        <div className="panel px-3 py-1 text-[10px] bg-black/90 border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto w-full">
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] mr-0.5">
              🖥️ Datacenter:
            </span>
            {NETWORK.nodes
              .filter((n) => n.kind === "server")
              .map((srv) => {
                const node = s.nodes[srv.id];
                const isSel = s.selected === srv.id;
                const isInfected = node?.status === "infected";
                return (
                  <button
                    key={srv.id}
                    onClick={() => s.select(srv.id)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-mono border transition-all flex items-center gap-1 cursor-pointer",
                      isSel
                        ? "border-yellow-400 bg-yellow-950/80 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.5)] font-bold"
                        : isInfected
                          ? "border-red-500/80 bg-red-950/60 text-red-300 animate-pulse"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600",
                    )}
                    title={`Lock / Focus ${srv.label} (${srv.sublabel})`}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full inline-block",
                        isInfected
                          ? "bg-red-400 animate-ping"
                          : isSel
                            ? "bg-yellow-400"
                            : "bg-emerald-400",
                      )}
                    />
                    {srv.label}
                  </button>
                );
              })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] mr-0.5">
              📡 NOC Routers:
            </span>
            {NETWORK.nodes
              .filter((n) => n.kind === "router")
              .map((rtr) => {
                const node = s.nodes[rtr.id];
                const isSel = s.selected === rtr.id;
                const isInfected = node?.status === "infected";
                return (
                  <button
                    key={rtr.id}
                    onClick={() => s.select(rtr.id)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-mono border transition-all flex items-center gap-1 cursor-pointer",
                      isSel
                        ? "border-yellow-400 bg-yellow-950/80 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.5)] font-bold"
                        : isInfected
                          ? "border-red-500/80 bg-red-950/60 text-red-300 animate-pulse"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600",
                    )}
                    title={`Lock / Focus ${rtr.label} (${rtr.sublabel})`}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full inline-block",
                        isInfected
                          ? "bg-red-400 animate-ping"
                          : isSel
                            ? "bg-yellow-400"
                            : "bg-cyan-400",
                      )}
                    />
                    {rtr.label}
                  </button>
                );
              })}
          </div>

          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[9px] mr-0.5">
              💻 Workstations:
            </span>
            {NETWORK.nodes
              .filter((n) => n.kind === "computer" && n.id <= 11)
              .map((pc) => {
                const node = s.nodes[pc.id];
                const isSel = s.selected === pc.id;
                const isInfected = node?.status === "infected";
                return (
                  <button
                    key={pc.id}
                    onClick={() => s.select(pc.id)}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-mono border transition-all flex items-center gap-1 cursor-pointer",
                      isSel
                        ? "border-yellow-400 bg-yellow-950/80 text-yellow-300 font-bold"
                        : isInfected
                          ? "border-red-500/80 bg-red-950/60 text-red-300 animate-pulse"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600",
                    )}
                    title={`Lock / Focus ${pc.label}`}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full inline-block",
                        isInfected ? "bg-red-400 animate-ping" : "bg-emerald-400",
                      )}
                    />
                    {pc.label}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Bottom Command Panel */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          {/* Left Target Device Card */}
          <div className="w-full sm:w-80">
            <div className="panel p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/50 pb-1.5 mb-2">
                <span className="font-bold uppercase tracking-wider text-primary">
                  {selectedDef ? `HOST: ${selectedDef.label}` : "TARGET SENSOR"}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {selectedDef?.kind ?? "NO SELECTION"}
                </span>
              </div>

              {selectedDef && selectedNode ? (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">{selectedDef.sublabel}</span>
                    <span
                      className={cn(
                        "font-bold uppercase px-1.5 py-0.2 rounded text-[10px]",
                        selectedNode.status === "clean"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                          : selectedNode.status === "infected"
                            ? "bg-red-950 text-red-400 border border-red-500/50 animate-pulse"
                            : "bg-zinc-800 text-zinc-300",
                      )}
                    >
                      {selectedNode.status}
                    </span>
                  </div>

                  <div className="text-[10px] text-zinc-400 flex justify-between">
                    <span>IP: {selectedDef.ip}</span>
                    <span>{selectedDef.department}</span>
                  </div>

                  {selectedNode.status === "infected" && (
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-red-400 mb-0.5">
                        <span>Infection Payload</span>
                        <span>{Math.round(selectedNode.infection * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${Math.min(100, selectedNode.infection * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-1">
                  Point at any workstation, server, or router to lock telemetry sensor.
                </p>
              )}
            </div>
          </div>

          {/* Center Action Buttons */}
          <div className="panel pointer-events-auto flex items-center justify-center p-2">
            <div className="grid grid-cols-4 gap-2">
              {/* Investigate Button */}
              <Button
                variant="secondary"
                className="h-12 flex-col gap-0.5 border border-cyan-500/40 hover:bg-cyan-500/20"
                onClick={() => s.investigate()}
                disabled={!selectedNode}
                title="Point at any device & pinch to run forensic threat diagnostic"
              >
                <Search className="size-4 text-cyan-400" />
                <span className="text-[10px]">Pinch · Scan</span>
              </Button>

              {/* Isolate Button */}
              <Button
                variant={isIsolateUnlocked ? "destructive" : "outline"}
                className={cn(
                  "h-12 flex-col gap-0.5 transition-all",
                  isIsolateUnlocked
                    ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 font-bold animate-pulse"
                    : "opacity-50 cursor-not-allowed border-zinc-700 text-zinc-400",
                )}
                onClick={() => s.isolate()}
                disabled={!isIsolateUnlocked}
                title={
                  isIsolateUnlocked
                    ? "Quarantine compromised device with Right Hand 'V' Sign or click"
                    : "No active threat detected"
                }
              >
                {isIsolateUnlocked ? (
                  <LockKeyhole className="size-4 text-white" />
                ) : (
                  <Lock className="size-4 text-zinc-500" />
                )}
                <span className="text-[10px]">
                  {isIsolateUnlocked ? "'V' Sign · Isolate" : "Isolate (Clean)"}
                </span>
              </Button>

              {/* Firewall Button */}
              <Button
                variant={s.firewallFor > 0 ? "default" : "secondary"}
                className={cn(
                  "h-12 flex-col gap-0.5 transition-all",
                  s.firewallFor > 0 &&
                    "border-2 border-cyan-400 bg-cyan-950 text-cyan-200 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.6)]",
                )}
                onClick={() => s.firewall()}
                disabled={s.firewallFor > 0}
                title="Activate Emergency Zero-Trust Firewall (Show 'W' Sign with Right Hand or Key W / F)"
              >
                <ShieldCheck className="size-4 text-cyan-400" />
                <span className="text-[10px]">
                  {s.firewallFor > 0
                    ? `${s.firewallFor.toFixed(1)}s Active`
                    : "🖖 Right 'W' · Shield"}
                </span>
              </Button>

              {/* Dossier Button */}
              <Button
                variant="outline"
                className="h-12 flex-col gap-0.5 border-primary/40 text-primary hover:bg-primary/20"
                onClick={() => {
                  if (s.selected !== null) s.openInvestigationModal(s.selected);
                  else {
                    const firstInfected = s.nodes.findIndex((n) => n.status === "infected");
                    if (firstInfected >= 0) s.openInvestigationModal(firstInfected);
                  }
                }}
                disabled={
                  !selectedNode?.investigated &&
                  !s.nodes.some((n) => n.investigated && n.status === "infected")
                }
                title="Open full malware forensic dossier"
              >
                <FileSearch className="size-4" />
                <span className="text-[10px]">Dossier</span>
              </Button>
            </div>
          </div>

          {/* Right Status Banner */}
          <div className="hidden w-80 justify-end lg:flex">
            <div className="panel flex items-center gap-3 px-3 py-2 text-xs">
              <Bug className={isAttackActive ? "text-red-500 animate-pulse" : "text-emerald-400"} />
              <span className="text-zinc-300">
                {isAttackActive
                  ? "Point at infected host, pinch to analyze, then right 'V' to isolate."
                  : "Continuous traffic flowing. Network operating nominally."}
              </span>
              {s.firewallFor > 0 && <Flame className="text-emerald-400 animate-pulse" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
