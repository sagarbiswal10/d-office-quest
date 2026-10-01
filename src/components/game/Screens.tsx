import { useEffect, useState } from "react";
import {
  Camera,
  Eye,
  Hand,
  Keyboard,
  MousePointer2,
  Pause,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  ZoomIn,
} from "lucide-react";
import { RANKS, TOTAL_THREATS, rankFor } from "@/game/data";
import { loadLeaderboard, saveScore, useGame, type LeaderEntry } from "@/game/store";
import { setMuted } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Leaderboard({
  entries,
  highlight,
}: {
  entries: LeaderEntry[];
  highlight?: number | undefined;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-3 font-display text-sm uppercase text-primary">Top SOC Responders</div>
      {entries.length === 0 && (
        <div className="text-xs text-muted-foreground">No completed shifts recorded.</div>
      )}
      <ol className="space-y-2 font-mono text-xs">
        {entries.map((entry, i) => (
          <li
            key={entry.runId ?? `${entry.date}-${i}`}
            className={cn(
              "grid grid-cols-[1fr_auto] gap-3",
              i === highlight && "text-warning font-bold",
            )}
          >
            <span>
              {String(i + 1).padStart(2, "0")}. {entry.name}
            </span>
            <span>{entry.score.toLocaleString()}</span>
            <span className="col-span-2 text-[10px] text-muted-foreground">{entry.rank}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Menu() {
  const { playerName, setName, start } = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [muted, setMutedState] = useState(false);

  useEffect(() => setLeaderboard(loadLeaderboard()), []);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-auto bg-background/50 p-4 backdrop-blur-[3px] sm:p-6 font-mono">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="panel animate-scale-in p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs uppercase text-accent font-bold">
            <ShieldAlert className="size-4 text-destructive animate-pulse" />
            Security Operations Center · Real-Time Incident Defense
          </div>

          <h1 className="glitch mt-2 font-display text-4xl font-black text-primary sm:text-6xl tracking-tight">
            CYBER RAID
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Defend an enterprise 3D Security Operations Center from live cyber warfare attacks. Use
            cutting-edge <strong className="text-foreground">MediaPipe AI Camera Gestures</strong>{" "}
            or keyboard/mouse to investigate malware, review forensic dossiers, and quarantine
            compromised hosts with a wink.
          </p>

          <label className="mt-5 block text-[10px] uppercase text-muted-foreground font-semibold">
            Analyst Callsign
          </label>
          <input
            value={playerName}
            maxLength={16}
            onChange={(e) => setName(e.target.value)}
            placeholder="CYBER_OPERATOR_01"
            className="mt-1 w-full rounded-sm border border-primary/40 bg-input/70 px-3 py-2 uppercase outline-none focus:border-primary font-mono text-sm"
          />

          {/* Gesture Protocol Cards */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              icon={<Hand className="size-4" />}
              title="Pinch (Scan)"
              text="Pinch thumb & index to investigate threat dossier"
            />
            <Step
              icon={<Eye className="size-4" />}
              title="Eye Wink"
              text="Wink or blink to isolate & quarantine compromised host"
            />
            <Step
              icon={<ZoomIn className="size-4" />}
              title="Pinch ↔ L"
              text="Pinch to L zooms in; L to Pinch zooms out"
            />
            <Step
              icon={<Camera className="size-4" />}
              title="360° View"
              text="Tilt head or move hand to pan around the 3D office"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={start}
              className="font-display uppercase text-sm font-bold tracking-wide"
            >
              Begin SOC Shift
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title={muted ? "Unmute audio" : "Mute audio"}
              aria-label={muted ? "Unmute audio" : "Mute audio"}
              onClick={() => {
                const next = !muted;
                setMutedState(next);
                setMuted(next);
              }}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Webcam supported · On-screen gesture simulator & keyboard always available.
            </span>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="panel p-4 text-xs leading-6 text-muted-foreground">
            <div className="mb-2 font-display text-sm uppercase text-primary font-bold">
              Shift Directives
            </div>
            <p>1. Threats manifest across workstations, SAN storage, and core database racks.</p>
            <p>2. Pinching an infected machine launches the forensic investigation dossier.</p>
            <p>3. Winking an eye biometrically isolates the host, terminating the attack spread.</p>
            <p>
              4. Neutralize all {TOTAL_THREATS} cyber incidents to secure the enterprise network.
            </p>
          </div>
          <Leaderboard entries={leaderboard} />
        </aside>
      </div>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border border-border/80 bg-secondary/40 p-2.5 rounded-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-primary">
        {icon}
        <strong className="font-display text-xs uppercase">{title}</strong>
      </div>
      <p className="text-[10px] text-muted-foreground leading-normal">{text}</p>
    </div>
  );
}

export function PauseScreen() {
  const phase = useGame((s) => s.phase);
  const togglePause = useGame((s) => s.togglePause);
  const toMenu = useGame((s) => s.toMenu);

  if (phase !== "paused") return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-sm font-mono">
      <div className="panel p-7 text-center max-w-sm w-full mx-4">
        <Pause className="mx-auto mb-3 size-8 text-primary" />
        <h2 className="font-display text-2xl font-bold">SHIFT PAUSED</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Network packets and threat growth frozen.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={togglePause}>Resume</Button>
          <Button variant="outline" onClick={toMenu}>
            Exit to Briefing
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Results() {
  const s = useGame();
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [highlight, setHighlight] = useState<number>();

  useEffect(() => {
    const entry = {
      runId: s.runId,
      name: (s.playerName.trim() || "OPERATOR").toUpperCase(),
      score: s.score,
      rank: rankFor(s.score),
      date: new Date().toISOString(),
    };
    const list = saveScore(entry);
    setLeaderboard(list);
    const index = list.findIndex((item) => item.runId === entry.runId);
    setHighlight(index >= 0 ? index : undefined);
  }, [s.playerName, s.runId, s.score]);

  const rank = rankFor(s.score);
  const next = RANKS.find((candidate) => candidate.min > s.score);
  const minute = Math.floor(s.elapsed / 60);
  const second = String(Math.floor(s.elapsed % 60)).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-auto bg-background/65 p-4 backdrop-blur-sm font-mono">
      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
        <section className="panel animate-scale-in p-6 sm:p-8">
          <div className="text-xs uppercase text-accent font-bold">Shift Debriefing</div>
          <div
            className={cn(
              "mt-2 font-display text-2xl font-bold",
              s.victory ? "text-success" : "text-destructive",
            )}
          >
            {s.endReason}
          </div>
          <div className="mt-4 font-display text-5xl font-black text-primary">
            {s.score.toLocaleString()}
          </div>
          <div className="font-display text-lg uppercase text-muted-foreground">{rank}</div>
          {next && (
            <div className="text-xs text-muted-foreground mt-1">
              {(next.min - s.score).toLocaleString()} points to next promotion: {next.name}
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Stat label="Threats Contained" value={`${s.contained}/${TOTAL_THREATS}`} />
            <Stat label="Network Breaches" value={s.breaches} />
            <Stat label="Response Duration" value={`${minute}:${second}`} />
            <Stat label="System Integrity" value={`${Math.round(s.integrity)}%`} />
          </div>
          <div className="mt-6 flex gap-2">
            <Button onClick={s.start}>
              <RotateCcw className="size-4 mr-1.5" />
              Redeploy Shift
            </Button>
            <Button variant="outline" onClick={s.toMenu}>
              Mission Briefing
            </Button>
          </div>
        </section>
        <Leaderboard entries={leaderboard} highlight={highlight} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border/80 bg-secondary/35 p-3 rounded-sm">
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
