import { useEffect } from "react";
import {
  Bug,
  CirclePause,
  Eye,
  FileSearch,
  Flame,
  Hand,
  LockKeyhole,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { NETWORK, THREATS, TOTAL_THREATS, rankFor } from "@/game/data";
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

export function HUD() {
  const s = useGame();
  const selectedNode = s.selected === null ? null : s.nodes[s.selected];
  const selectedDef = s.selected === null ? null : NETWORK.nodes[s.selected];
  const active = s.nodes.filter((node) => node.status === "infected").length;
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

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 font-mono sm:p-4">
      {/* Top Telemetry Bar */}
      <div className="flex items-start justify-between gap-2">
        <div className="panel pointer-events-auto flex w-[min(74vw,620px)] flex-wrap gap-3 px-3 py-2 sm:gap-5 sm:px-4 sm:py-3">
          <Bar label="Network Integrity" value={s.integrity} tone="bg-success" />
          <Bar label="Threat Level" value={threatLevel(s.nodes)} tone="bg-destructive" />
          <Bar
            label="Firewall Energy"
            value={s.energy}
            tone={s.firewallFor > 0 ? "bg-success animate-pulse" : "bg-primary"}
          />
        </div>

        {/* Top Right Controls & Score */}
        <div className="flex items-center gap-2">
          {/* Zoom & 360 Controls in HUD */}
          <div className="panel pointer-events-auto hidden items-center gap-1 px-2 py-1 sm:flex">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustZoom(-3.5)}
              title="Zoom In (Pinch → L)"
            >
              <ZoomIn className="size-3.5 text-accent" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustZoom(3.5)}
              title="Zoom Out (L → Pinch)"
            >
              <ZoomOut className="size-3.5 text-accent" />
            </Button>
            <div className="h-4 w-px bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustOrbit(-0.25, 0)}
              title="360° Pan Left (Face/Hand Pan)"
            >
              <RotateCw className="size-3.5 -scale-x-100 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => s.adjustOrbit(0.25, 0)}
              title="360° Pan Right (Face/Hand Pan)"
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

      {/* Center Alert Indicator */}
      <div className="pointer-events-none absolute left-1/2 top-20 w-[min(94vw,520px)] -translate-x-1/2 text-center">
        <div className="mission-strip">
          <span>
            THREATS {s.contained}/{TOTAL_THREATS}
          </span>
          <strong className="flex items-center justify-center gap-1.5">
            {active ? (
              <>
                <ShieldAlert className="size-3.5 text-destructive animate-pulse" />
                <span className="text-destructive font-bold">{active} THREATS IN PROGRESS</span>
              </>
            ) : s.nextThreat < TOTAL_THREATS ? (
              `NEXT INCIDENT IN ${Math.max(0, Math.ceil(s.spawnIn))}s`
            ) : (
              "NETWORK SECURE"
            )}
          </strong>
          <span>
            {minute}:{second}
          </span>
        </div>

        {/* Gesture Guidance Bar */}
        <div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-black/70 px-3 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
          <span className="flex items-center gap-1 text-primary font-bold">
            <Hand className="size-3" /> Point to Select
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1 text-accent font-bold">
            <Sparkles className="size-3" /> Pinch to Scan
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1 text-success font-bold">
            <Eye className="size-3" /> Eye Blink to Isolate
          </span>
          <span className="text-border">·</span>
          <span className="text-foreground">Face/Hand 360° Pan</span>
        </div>

        {/* Eye Blink Isolation Alert Banner */}
        {s.isolateBanner && Date.now() - s.isolateBanner.time < 3500 && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border-2 border-success bg-black/90 px-4 py-2 text-xs font-bold text-success shadow-2xl animate-bounce backdrop-blur-md">
            <Eye className="size-4 animate-ping" />
            <span>👁️ BIOMETRIC EYE BLINK DETECTED · QUARANTINED {s.isolateBanner.label}!</span>
          </div>
        )}
      </div>

      {/* Pointing Gesture Crosshair HUD Overlay */}
      {s.pointingCrosshair?.active && (
        <div
          className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{
            left: `${s.pointingCrosshair.x}px`,
            top: `${s.pointingCrosshair.y}px`,
          }}
        >
          <div className="relative flex items-center justify-center">
            <div className="size-10 rounded-full border-2 border-primary/80 animate-spin border-t-transparent" />
            <div className="size-2 rounded-full bg-primary absolute" />
            <div className="absolute left-7 top-1 whitespace-nowrap rounded bg-black/90 border border-primary/60 px-2 py-0.5 text-[10px] font-bold text-primary shadow-lg">
              🎯 TARGET: {s.pointingCrosshair.label} (PINCH TO INVESTIGATE)
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row */}
      <div className="flex items-end justify-between gap-3">
        {/* Operations Log */}
        <div className="panel hidden w-80 px-3 py-2 text-xs lg:block">
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">SOC Operations Log</div>
          {s.log.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className={cn(
                "animate-fade-in truncate",
                item.tone === "good" && "text-success",
                item.tone === "bad" && "text-destructive",
              )}
            >
              › {item.text}
            </div>
          ))}
          {s.lastTip && (
            <div className="mt-2 border-t border-border pt-1.5 text-[11px] text-accent">
              INTEL: {s.lastTip}
            </div>
          )}
        </div>

        {/* Main Incident Command Panel */}
        <div className="panel pointer-events-auto mx-auto w-full max-w-xl px-3 py-3 sm:px-4">
          <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
            <div>
              <div className="font-display text-base font-bold flex items-center gap-2">
                <span>{selectedDef?.label ?? "SELECT ACTIVE ALERT"}</span>
                {selectedDef && (
                  <span className="text-xs text-muted-foreground">({selectedDef.department})</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {selectedNode?.status === "infected" ? (
                  selectedNode.investigated && selectedNode.threat ? (
                    <span className="text-destructive font-semibold">
                      {THREATS[selectedNode.threat].name} ·{" "}
                      {Math.round(selectedNode.infection * 100)}% Infection
                    </span>
                  ) : (
                    <span className="text-warning">
                      Alert Active · Execute Pinch or click Investigate to reveal malware dossier
                    </span>
                  )
                ) : (
                  "Click a 3D workstation/server or perform Pinch gesture"
                )}
              </div>
            </div>
            <div className="text-right text-[10px] uppercase text-muted-foreground">
              <div className="font-bold text-foreground text-xs">
                {s.score.toLocaleString()} pts
              </div>
              <div>x{s.combo} Combo</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="h-12 flex-col gap-0.5"
              onClick={() => s.investigate()}
              disabled={
                !selectedNode || selectedNode.status !== "infected" || selectedNode.investigated
              }
              title="Investigate with Pinch gesture or key I"
            >
              <Search className="size-4" />
              <span className="text-[10px]">Pinch · Investigate</span>
            </Button>

            <Button
              variant="default"
              className="h-12 flex-col gap-0.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md shadow-destructive/20"
              onClick={() => s.isolate()}
              disabled={!selectedNode?.investigated}
              title="Isolate with Eye Wink / Blink or key X"
            >
              <LockKeyhole className="size-4" />
              <span className="text-[10px]">Wink · Isolate</span>
            </Button>

            <Button
              variant="secondary"
              className="h-12 flex-col gap-0.5"
              onClick={s.firewall}
              disabled={s.energy < 35 || s.firewallFor > 0}
              title="Deploy Counter-Firewall (Key F)"
            >
              <ShieldCheck className="size-4" />
              <span className="text-[10px]">Firewall · F</span>
            </Button>

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
            <Bug className={active ? "text-destructive animate-pulse" : "text-success"} />
            <span>
              {active
                ? "Scan alert with Pinch, then Wink to isolate."
                : "SOC perimeter quiet. Room scan active."}
            </span>
            {s.firewallFor > 0 && <Flame className="text-success animate-pulse" />}
          </div>
        </div>
      </div>
    </div>
  );
}
