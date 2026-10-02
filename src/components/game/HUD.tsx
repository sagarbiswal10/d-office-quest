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
          ● {label} (👉 PINCH TO SCAN · ✌️ RIGHT 'V' TO ISOLATE)
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
      if (event.code === "KeyF") useGame.getState().firewall();
      if (event.code === "Escape" || event.code === "KeyP") useGame.getState().togglePause();
      if (event.key === "+" || event.key === "=") useGame.getState().adjustZoom(-3.5);
      if (event.key === "-" || event.key === "_") useGame.getState().adjustZoom(3.5);
      if (event.key === "[" || event.code === "ArrowLeft") useGame.getState().adjustOrbit(-0.25, 0);
      if (event.key === "]" || event.code === "ArrowRight") useGame.getState().adjustOrbit(0.25, 0);
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
            "panel pointer-events-auto flex w-[min(74vw,620px)] flex-wrap gap-3 px-3 py-2 sm:gap-5 sm:px-4 sm:py-3 transition-colors duration-300",
            isAttackActive
              ? "border-red-500/70 bg-black/90 shadow-red-950/60"
              : "border-emerald-500/50 bg-black/90",
          )}
        >
          <Bar
            label="Network Integrity"
            value={s.integrity}
            tone={isAttackActive ? "bg-red-500 animate-pulse" : "bg-emerald-500"}
          />
          <Bar
            label="Threat Level"
            value={threatLevel(s.nodes)}
            tone={isAttackActive ? "bg-red-600 animate-pulse" : "bg-emerald-400"}
          />
          <Bar
            label="Firewall Energy"
            value={s.energy}
            tone={s.firewallFor > 0 ? "bg-emerald-400 animate-pulse" : "bg-cyan-500"}
          />
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
              title="360° Pan Left (Left hand pan)"
            >
              <RotateCw className="size-3.5 -scale-x-100 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustOrbit(0.25, 0)}
              title="360° Pan Right (Left hand pan)"
            >
              <RotateCw className="size-3.5 text-primary" />
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

      {/* Center Mission Progress & Attack Indicator */}
      <div className="pointer-events-none absolute left-1/2 top-16 w-[min(94vw,560px)] -translate-x-1/2 text-center space-y-2">
        {/* Mission Progress: 0/5 -> 1/5 -> 2/5 -> 3/5 -> 4/5 -> 5/5 */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-black/90 px-4 py-1 text-xs text-foreground shadow-2xl backdrop-blur-md">
          <span className="text-muted-foreground uppercase font-bold text-[10px]">
            Mission Progress:
          </span>
          <span className="font-display text-sm font-black tracking-widest text-primary">
            {s.missionProgress}/5
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-[10px] text-cyan-400 font-semibold">
            {s.missionProgress === 0
              ? "0/5 (1 Server, 1 PC, 1 Router Active)"
              : s.missionProgress === 1
                ? "1/5 (+1 PC Connected)"
                : s.missionProgress === 2
                  ? "2/5 (+1 Server Connected)"
                  : s.missionProgress === 3
                    ? "3/5 (+1 Router Connected)"
                    : s.missionProgress === 4
                      ? "4/5 (+1 PC & +1 Server Connected)"
                      : "5/5 (Full Enterprise · Multi-Incident Crisis)"}
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 text-[10px]">
            {minute}:{second}
          </span>
        </div>

        {/* Active Emergency Firewall Shield Banner */}
        {s.firewallFor > 0 && (
          <div className="animate-pulse border-2 border-cyan-400 bg-cyan-950/95 text-cyan-100 shadow-[0_0_40px_rgba(6,182,212,0.9)] px-5 py-2.5 rounded-md flex items-center justify-center gap-3 backdrop-blur-md">
            <ShieldCheck className="size-6 text-cyan-300 shrink-0 animate-spin" />
            <div className="text-center font-display tracking-wider uppercase">
              <div className="text-sm sm:text-base font-black text-cyan-200 drop-shadow">
                🛡️ ZERO-TRUST FIREWALL ENGAGED ({s.firewallFor.toFixed(1)}s) 🛡️
              </div>
              <div className="text-[11px] text-cyan-300 font-semibold tracking-normal">
                ALL THREAT GROWTH & INTEGRITY LOSS COMPLETELY FROZEN!
              </div>
            </div>
            <ShieldCheck className="size-6 text-cyan-300 shrink-0 animate-spin" />
          </div>
        )}

        {/* Large Dynamic Attack vs Green Flow Alert */}
        {isAttackActive ? (
          <div className="animate-pulse border-2 border-red-500 bg-red-950/90 text-red-100 shadow-[0_0_50px_rgba(239,68,68,0.8)] px-5 py-3 rounded-md flex items-center justify-center gap-3 backdrop-blur-md">
            <ShieldAlert className="size-6 text-red-400 shrink-0 animate-bounce" />
            <div className="text-center font-display tracking-wider uppercase">
              <div className="text-base sm:text-lg font-black text-red-300 drop-shadow">
                🚨 {attackTitle} 🚨
              </div>
              <div className="text-[11px] text-red-200 mt-0.5 tracking-normal">
                POINT AT INFECTED DEVICE TO SELECT · PINCH TO ANALYZE · 🖐️ 5 FINGERS: FREEZE THREAT
              </div>
            </div>
            <ShieldAlert className="size-6 text-red-400 shrink-0 animate-bounce" />
          </div>
        ) : (
          <div className="border border-emerald-500/60 bg-emerald-950/80 text-emerald-300 px-4 py-1.5 rounded-md inline-flex items-center justify-center gap-2 backdrop-blur-md shadow-lg shadow-emerald-950/40">
            <ShieldCheck className="size-4 text-emerald-400 animate-pulse" />
            <span className="font-display text-xs uppercase tracking-wider font-bold">
              ✓ NETWORK SECURE · CONTINUOUS TRAFFIC FLOWING
            </span>
          </div>
        )}

        {/* Biometric Directive Quick-Tip */}
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black/75 px-3 py-0.5 text-[9.5px] text-zinc-400 backdrop-blur-sm">
          <span className="text-purple-400">👈 Left: V(Zoom In)/W(Zoom Out)</span>
          <span className="text-zinc-600">·</span>
          <span className="text-cyan-400">👉 Right: Point/Pinch(Scan)</span>
          <span className="text-zinc-600">·</span>
          <span className="text-emerald-400">✌️ Right 'V': Isolate</span>
          <span className="text-zinc-600">·</span>
          <span className="text-sky-400">🖐️ 4 Fingers: Dismiss Box</span>
          <span className="text-zinc-600">·</span>
          <span className="text-cyan-300 font-bold">🖐️ 5-Palm: Firewall Shield</span>
        </div>
      </div>

      {/* GSAP-Smoothed Pointing Gesture Crosshair HUD Overlay */}
      {s.pointingCrosshair?.active && (
        <GSAPCrosshair
          x={s.pointingCrosshair.x}
          y={s.pointingCrosshair.y}
          label={s.pointingCrosshair.label}
        />
      )}

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
              title="Activate Emergency Zero-Trust Firewall (Show 5 Fingers / Open Palm or Key F)"
            >
              <ShieldCheck className="size-4 text-cyan-400" />
              <span className="text-[10px]">
                {s.firewallFor > 0 ? `${s.firewallFor.toFixed(1)}s Active` : "🖐️ 5-Palm · Shield"}
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
  );
}
