import { CheckCircle2, LockKeyhole, ShieldAlert, ShieldCheck, Terminal, X } from "lucide-react";
import { NETWORK, THREATS } from "@/game/data";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";

export function InvestigationModal() {
  const isOpen = useGame((s) => s.investigationModalOpen);
  const nodeId = useGame((s) => s.activeInvestigationNodeId);
  const close = useGame((s) => s.closeInvestigationModal);
  const isolate = useGame((s) => s.isolate);
  const nodes = useGame((s) => s.nodes);

  if (!isOpen || nodeId === null) return null;

  const nodeState = nodes[nodeId];
  const nodeDef = NETWORK.nodes[nodeId];
  if (!nodeDef || !nodeState) return null;

  const isInfected = nodeState.status === "infected";
  const threatType = nodeState.threat;
  const threatInfo = threatType ? THREATS[threatType] : null;

  const malwareName = threatInfo?.name ?? "Malware Threat";
  const malwareFamily = threatInfo?.family ?? "Trojan.Generic.Signature";
  const severity = threatInfo?.severity ?? "HIGH";
  const cvssScore = threatInfo?.cvssScore ?? 8.9;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md animate-fade-in font-mono">
      <div
        className={`relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-md border-2 bg-black shadow-2xl text-foreground ${
          isInfected
            ? "border-red-500/70 shadow-red-950/80"
            : "border-emerald-500/70 shadow-emerald-950/80"
        }`}
      >
        {/* Terminal Header */}
        <div
          className={`flex items-center justify-between border-b px-4 py-2.5 bg-zinc-950 ${
            isInfected ? "border-red-500/40" : "border-emerald-500/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <Terminal className={`size-4 ${isInfected ? "text-red-400" : "text-emerald-400"}`} />
            <span
              className={`font-display text-sm font-bold uppercase tracking-wider ${
                isInfected ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {isInfected ? "MALWARE FORENSIC INVESTIGATION" : "SOC COMPONENT DIAGNOSTIC AUDIT"}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${
                isInfected
                  ? "bg-red-950/80 border-red-500/50 text-red-300"
                  : "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
              }`}
            >
              {nodeDef.label} · {nodeDef.kind}
            </span>
          </div>
          <button
            onClick={close}
            className="rounded p-1 text-muted-foreground hover:bg-zinc-800 hover:text-foreground transition-colors"
            aria-label="Close dossier"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* SOC Analysis Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-zinc-950/90">
          {/* Target Host Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border border-zinc-800 bg-black/60 p-2.5 rounded">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase">Target Host</span>
              <div className="font-bold text-foreground truncate">{nodeDef.label}</div>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase">Role / Dept</span>
              <div className="text-foreground truncate">{nodeDef.department}</div>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase">IP Address</span>
              <div className="text-cyan-400 font-mono">{nodeDef.ip}</div>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase">Status</span>
              <div
                className={`font-bold ${
                  isInfected ? "text-destructive animate-pulse" : "text-emerald-400"
                }`}
              >
                {isInfected ? "COMPROMISED" : "CLEAN / NOMINAL"}
              </div>
            </div>
          </div>

          {/* Report Box: Infected vs Clean */}
          {isInfected ? (
            <div className="rounded border-2 border-red-500/70 bg-red-950/20 p-4 font-mono shadow-inner shadow-red-950/50 space-y-3">
              <div className="flex items-center justify-between border-b border-red-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-5 text-destructive animate-bounce" />
                  <span className="font-bold text-destructive text-sm tracking-wider uppercase">
                    🚨 MALWARE THREAT DETECTED
                  </span>
                </div>
                <span className="text-[10px] text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40">
                  ACTIVE IN MEMORY
                </span>
              </div>

              {/* Direct Virus/Malware Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-zinc-400 text-[11px]">Threat / Virus Name:</span>
                  <div className="text-red-400 font-black text-sm">{malwareName}</div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px]">Malware Family:</span>
                  <div className="text-foreground font-bold">{malwareFamily}</div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px]">Severity Level:</span>
                  <div className="text-red-400 font-bold uppercase">
                    {severity} (CVSS {cvssScore})
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px]">Signature Status:</span>
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                    <span>Verified Payload</span>
                  </div>
                </div>
              </div>

              {threatInfo?.liveActivities && threatInfo.liveActivities.length > 0 && (
                <div className="rounded bg-black/60 border border-zinc-800 p-2.5 text-[11px] text-zinc-300">
                  <span className="text-red-400 font-bold">Malicious Behavior: </span>
                  <span>{threatInfo.liveActivities[0]}</span>
                </div>
              )}

              {/* Recommended Action */}
              <div className="pt-2 border-t border-red-500/20 text-emerald-300 font-bold text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 font-normal">Recommended Action: </span>
                  <span className="text-emerald-400 font-black tracking-wide">
                    ▶ ISOLATE IMMEDIATELY
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/50">
                  ISOLATE BUTTON READY
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded border-2 border-emerald-500/70 bg-emerald-950/20 p-4 font-mono shadow-inner shadow-emerald-950/50 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-400" />
                  <span className="font-bold text-emerald-400 text-sm tracking-wider uppercase">
                    ✓ NO MALWARE DETECTED
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  STATUS: NOMINAL / SAFE
                </span>
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <div className="rounded bg-black/60 border border-zinc-800 p-3 space-y-1.5">
                  <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Host integrity verified. Zero malicious signatures detected.</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    RAM buffer, execution stack, and network interfaces audited. Continuous
                    authorized enterprise data packets flowing nominally.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-zinc-400">Memory Integrity: </span>
                    <span className="text-emerald-400 font-bold">100% UNTOUCHED</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Firewall Filter: </span>
                    <span className="text-foreground">PASSIVE / CLEAN</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 font-normal">Audit Verdict: </span>
                  <span className="text-emerald-400 font-bold">
                    System nominal. No isolation required.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick tip */}
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center justify-between text-[11px] text-zinc-400">
            <span>
              {isInfected
                ? "Quarantine: Click button below or show Right 'V' Sign · Dismiss: Show 4 Fingers (Thumb Tucked 🖐️)."
                : "System Clean: Show 4 Fingers (Thumb Tucked 🖐️) or click Dismiss to close this box."}
            </span>
            <span className="text-cyan-400 font-bold">
              {isInfected ? "+500 PTS" : "DIAGNOSTIC OK"}
            </span>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 p-3">
          <Button variant="outline" size="sm" onClick={close} className="text-xs">
            {isInfected ? "Dismiss (🖐️ 4 Fingers)" : "Close Diagnostic (🖐️ 4 Fingers)"}
          </Button>

          {isInfected ? (
            <Button
              variant="destructive"
              size="default"
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xl shadow-destructive/50 font-bold tracking-wide text-xs sm:text-sm px-5 py-2.5 animate-pulse"
              onClick={() => {
                isolate(nodeId);
              }}
            >
              <LockKeyhole className="size-4" />
              <span>ISOLATE & QUARANTINE HOST NOW (Click / Right 'V')</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={close}
              className="gap-2 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/40 text-xs"
            >
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span>✓ System Safe (🖐️ 4 Fingers / Dismiss)</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
