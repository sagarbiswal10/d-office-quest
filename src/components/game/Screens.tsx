import { useEffect, useState } from "react";
import { Keyboard, MousePointer2, Pause, RotateCcw, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { RANKS, TOTAL_THREATS, rankFor } from "@/game/data";
import { loadLeaderboard, saveScore, useGame, type LeaderEntry } from "@/game/store";
import { setMuted } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Leaderboard({ entries, highlight }: { entries: LeaderEntry[]; highlight?: number | undefined }) {
  return <div className="panel p-4"><div className="mb-3 font-display text-sm uppercase text-primary">Top responders</div>{entries.length === 0 && <div className="text-xs text-muted-foreground">No completed shifts yet.</div>}<ol className="space-y-2 font-mono text-xs">{entries.map((entry, i) => <li key={entry.runId ?? `${entry.date}-${i}`} className={cn("grid grid-cols-[1fr_auto] gap-3", i === highlight && "text-warning")}><span>{String(i + 1).padStart(2, "0")}. {entry.name}</span><span>{entry.score.toLocaleString()}</span><span className="col-span-2 text-[10px] text-muted-foreground">{entry.rank}</span></li>)}</ol></div>;
}

export function Menu() {
  const { playerName, setName, start } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [muted, setMutedState] = useState(false);
  useEffect(() => setLeaderboard(loadLeaderboard()), []);
  return <div className="fixed inset-0 z-20 flex items-center justify-center overflow-auto bg-background/45 p-4 backdrop-blur-[2px] sm:p-6"><div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.35fr_0.65fr]">
    <section className="panel animate-scale-in p-6 sm:p-8"><div className="text-xs uppercase text-accent">Security Operations Center · Night Shift</div><h1 className="glitch mt-2 font-display text-4xl font-black text-primary sm:text-6xl">CYBER RAID</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Five incidents are hidden across the office network. Investigate each alert, identify the threat, then isolate the affected device. The shift ends only when every incident is contained.</p>
      <label className="mt-6 block text-[10px] uppercase text-muted-foreground">Analyst callsign</label><input value={playerName} maxLength={16} onChange={(event) => setName(event.target.value)} placeholder="ANALYST" className="mt-1 w-full rounded-sm border border-primary/40 bg-input/70 px-3 py-2 uppercase outline-none focus:border-primary" />
      <div className="mt-5 grid gap-2 sm:grid-cols-3"><Step icon={<MousePointer2/>} title="Select" text="Click or tap the flashing device"/><Step icon={<Keyboard/>} title="Investigate" text="Press I or use the button"/><Step icon={<ShieldCheck/>} title="Contain" text="Press X only after analysis"/></div>
      <div className="mt-7 flex flex-wrap items-center gap-3"><Button size="lg" onClick={start} className="font-display uppercase">Begin shift</Button><Button variant="ghost" size="icon" title={muted ? "Turn sound on" : "Mute sound"} aria-label={muted ? "Turn sound on" : "Mute sound"} onClick={() => { const next = !muted; setMutedState(next); setMuted(next); }}>{muted ? <VolumeX/> : <Volume2/>}</Button><span className="text-[11px] text-muted-foreground">No camera or hand gestures required.</span></div>
    </section>
    <aside className="space-y-4"><div className="panel p-4 text-xs leading-6 text-muted-foreground"><div className="mb-2 font-display text-sm uppercase text-primary">Shift protocol</div><p>Threats arrive one at a time with a quiet interval between incidents.</p><p>Investigation slows an attack and unlocks isolation.</p><p>The firewall buys eight seconds when pressure rises.</p><p>Protect network integrity and contain all {TOTAL_THREATS} threats.</p></div><Leaderboard entries={leaderboard}/></aside>
  </div></div>;
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="border border-border bg-secondary/45 p-3"><div className="mb-2 flex items-center gap-2 text-primary">{icon}<strong className="font-display text-xs uppercase">{title}</strong></div><p className="text-[11px] text-muted-foreground">{text}</p></div>; }

export function PauseScreen() {
  const phase = useGame((s) => s.phase);
  const togglePause = useGame((s) => s.togglePause);
  const toMenu = useGame((s) => s.toMenu);
  if (phase !== "paused") return null;
  return <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/45 backdrop-blur-sm"><div className="panel p-7 text-center"><Pause className="mx-auto mb-3 size-8 text-primary"/><h2 className="font-display text-2xl">SHIFT PAUSED</h2><p className="mt-2 text-sm text-muted-foreground">Threat activity is frozen.</p><div className="mt-5 flex gap-2"><Button onClick={togglePause}>Resume</Button><Button variant="outline" onClick={toMenu}>Exit shift</Button></div></div></div>;
}

export function Results() {
  const s = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [highlight, setHighlight] = useState<number>();
  useEffect(() => {
    const entry = { runId: s.runId, name: (s.playerName.trim() || "ANALYST").toUpperCase(), score: s.score, rank: rankFor(s.score), date: new Date().toISOString() };
    const list = saveScore(entry);
    setLeaderboard(list);
    const index = list.findIndex((item) => item.runId === entry.runId);
    setHighlight(index >= 0 ? index : undefined);
  }, [s.playerName, s.runId, s.score]);
  const rank = rankFor(s.score);
  const next = RANKS.find((candidate) => candidate.min > s.score);
  const minute = Math.floor(s.elapsed / 60);
  const second = String(Math.floor(s.elapsed % 60)).padStart(2, "0");
  return <div className="fixed inset-0 z-20 flex items-center justify-center overflow-auto bg-background/60 p-4 backdrop-blur-sm"><div className="grid w-full max-w-4xl gap-4 md:grid-cols-2"><section className="panel animate-scale-in p-6 sm:p-8"><div className="text-xs uppercase text-accent">Shift report</div><div className={cn("mt-2 font-display text-2xl", s.victory ? "text-success" : "text-destructive")}>{s.endReason}</div><div className="mt-5 font-display text-5xl text-primary">{s.score.toLocaleString()}</div><div className="font-display text-lg uppercase">{rank}</div>{next && <div className="text-xs text-muted-foreground">{(next.min - s.score).toLocaleString()} points to {next.name}</div>}<div className="mt-6 grid grid-cols-2 gap-2"><Stat label="Contained" value={`${s.contained}/${TOTAL_THREATS}`}/><Stat label="Breaches" value={s.breaches}/><Stat label="Response time" value={`${minute}:${second}`}/><Stat label="Integrity" value={`${Math.round(s.integrity)}%`}/></div><div className="mt-6 flex gap-2"><Button onClick={s.start}><RotateCcw/>Redeploy</Button><Button variant="outline" onClick={s.toMenu}>Briefing</Button></div></section><Leaderboard entries={leaderboard} highlight={highlight}/></div></div>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="border border-border bg-secondary/35 p-3"><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="mt-1 text-lg">{value}</div></div>; }
