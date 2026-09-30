import { useEffect } from "react";
import { Bug, CirclePause, Flame, LockKeyhole, Search, ShieldCheck } from "lucide-react";
import { NETWORK, THREATS, TOTAL_THREATS, rankFor } from "@/game/data";
import { threatLevel, useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="min-w-28 flex-1"><div className="mb-1 flex justify-between text-[10px] uppercase text-muted-foreground"><span>{label}</span><span className="text-foreground">{Math.round(value)}%</span></div><div className="h-1.5 overflow-hidden rounded-sm bg-muted"><div className={cn("h-full transition-[width] duration-300", tone)} style={{ width: `${value}%` }} /></div></div>;
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 font-mono sm:p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="panel pointer-events-auto flex w-[min(70vw,560px)] flex-wrap gap-3 px-3 py-2 sm:gap-5 sm:px-4 sm:py-3">
        <Bar label="Integrity" value={s.integrity} tone="bg-success" />
        <Bar label="Threat" value={threatLevel(s.nodes)} tone="bg-destructive" />
        <Bar label="Firewall" value={s.energy} tone={s.firewallFor > 0 ? "bg-success animate-pulse" : "bg-primary"} />
      </div>
      <div className="flex gap-2">
        <div className="panel hidden px-4 py-2 text-right sm:block"><div className="font-display text-2xl text-primary">{s.score.toLocaleString()}</div><div className="text-[10px] uppercase text-muted-foreground">{rankFor(s.score)} · x{s.combo}</div></div>
        <Button variant="secondary" size="icon" className="pointer-events-auto" onClick={s.togglePause} aria-label="Pause mission" title="Pause mission"><CirclePause /></Button>
      </div>
    </div>

    <div className="pointer-events-none absolute left-1/2 top-24 w-[min(92vw,420px)] -translate-x-1/2 text-center">
      <div className="mission-strip"><span>INCIDENTS {s.contained}/{TOTAL_THREATS}</span><strong>{active ? `${active} ACTIVE` : s.nextThreat < TOTAL_THREATS ? `NEXT SWEEP ${Math.max(0, Math.ceil(s.spawnIn))}s` : "CLEAR"}</strong><span>{minute}:{second}</span></div>
    </div>

    <div className="flex items-end justify-between gap-3">
      <div className="panel hidden w-80 px-3 py-2 text-xs lg:block"><div className="mb-1 text-[10px] uppercase text-muted-foreground">Operations log</div>{s.log.slice(0, 4).map((item) => <div key={item.id} className={cn("animate-fade-in", item.tone === "good" && "text-success", item.tone === "bad" && "text-destructive")}>› {item.text}</div>)}{s.lastTip && <div className="mt-2 border-t border-border pt-2 text-[11px] text-accent">INTEL: {s.lastTip}</div>}</div>

      <div className="panel pointer-events-auto mx-auto w-full max-w-lg px-3 py-3 sm:px-4">
        <div className="mb-3 flex min-h-10 items-center justify-between gap-3">
          <div><div className="font-display text-base">{selectedDef?.label ?? "SELECT AN ALERT"}</div><div className="text-[11px] text-muted-foreground">{selectedNode?.status === "infected" ? selectedNode.investigated && selectedNode.threat ? `${THREATS[selectedNode.threat].name} · ${Math.round(selectedNode.infection * 100)}%` : "Unknown threat — investigate first" : "Click or tap a flashing workstation"}</div></div>
          <div className="text-right text-[10px] uppercase text-muted-foreground"><div>{s.score.toLocaleString()} pts</div><div>x{s.combo} combo</div></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-12 flex-col gap-0.5" onClick={s.investigate} disabled={!selectedNode || selectedNode.status !== "infected" || selectedNode.investigated}><Search /><span className="text-[10px]">Investigate · I</span></Button>
          <Button className="h-12 flex-col gap-0.5" onClick={s.isolate} disabled={!selectedNode?.investigated}><LockKeyhole /><span className="text-[10px]">Isolate · X</span></Button>
          <Button variant="secondary" className="h-12 flex-col gap-0.5" onClick={s.firewall} disabled={s.energy < 35 || s.firewallFor > 0}><ShieldCheck /><span className="text-[10px]">Firewall · F</span></Button>
        </div>
      </div>
      <div className="hidden w-80 justify-end lg:flex"><div className="panel flex items-center gap-3 px-3 py-2 text-xs"><Bug className={active ? "text-destructive" : "text-success"}/><span>{active ? "Respond carefully: scan, then isolate." : "Room scan in progress."}</span>{s.firewallFor > 0 && <Flame className="text-success" />}</div></div>
    </div>
  </div>;
}
