import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Eye,
  LockKeyhole,
  Network,
  Server,
  ShieldAlert,
  Terminal,
  User,
  X,
  Zap,
} from "lucide-react";
import { NETWORK, THREATS } from "@/game/data";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InvestigationModal() {
  const isOpen = useGame((s) => s.investigationModalOpen);
  const nodeId = useGame((s) => s.activeInvestigationNodeId);
  const close = useGame((s) => s.closeInvestigationModal);
  const isolate = useGame((s) => s.isolate);
  const nodes = useGame((s) => s.nodes);

  const [hexTick, setHexTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setHexTick((t) => (t + 1) % 100);
    }, 280);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || nodeId === null) return null;

  const nodeState = nodes[nodeId];
  const nodeDef = NETWORK.nodes[nodeId];
  if (!nodeDef || !nodeState) return null;

  const threatType = nodeState.threat;
  const threatInfo = threatType ? THREATS[threatType] : null;
  if (!threatInfo) return null;

  const infectionPercent = Math.round(nodeState.infection * 100);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border-2 border-destructive/60 bg-card/95 shadow-2xl shadow-destructive/20 text-card-foreground">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-destructive/40 bg-destructive/15 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded bg-destructive/25 p-1.5 text-destructive animate-pulse">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold uppercase tracking-wider text-destructive">
                  INCIDENT FORENSIC DOSSIER
                </span>
                <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-black uppercase">
                  {threatInfo.severity} · CVSS {threatInfo.cvssScore}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Biometric Pinch Investigation Verified · Active Threat Signature Identified
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dossier"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Section 1: Malware Identity & Vulnerability */}
          <div className="rounded border border-destructive/30 bg-destructive/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-destructive/20 pb-2 mb-2">
              <div>
                <span className="text-[10px] uppercase text-muted-foreground">
                  Malware Signature & Classification
                </span>
                <h3 className="font-display text-lg font-bold text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  {threatInfo.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-muted-foreground">Malware Family</span>
                <div className="font-semibold text-foreground text-xs">{threatInfo.family}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground">CVE Reference: </span>
                <span className="text-accent font-semibold">{threatInfo.cve}</span>
              </div>
              <div>
                <span className="text-muted-foreground">MITRE ATT&CK: </span>
                <span className="text-primary font-semibold">{threatInfo.mitreTechnique}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Payload Mechanism: </span>
                <span className="text-foreground">{threatInfo.payloadType}</span>
              </div>
            </div>
          </div>

          {/* Section 2: What Activities Are Going On */}
          <div className="rounded border border-border bg-secondary/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase text-primary">
                <Terminal className="size-3.5" />
                Active Malicious Activities Detected
              </span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Infection Progress:</span>
                <span
                  className={cn(
                    "font-bold",
                    infectionPercent > 60 ? "text-destructive" : "text-warning",
                  )}
                >
                  {infectionPercent}%
                </span>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      infectionPercent > 60 ? "bg-destructive" : "bg-warning",
                    )}
                    style={{ width: `${infectionPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <ul className="space-y-1.5 font-mono text-[11px]">
              {threatInfo.liveActivities.map((activity, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded bg-black/40 px-2 py-1.5 border border-border/40 text-foreground"
                >
                  <span className="text-destructive font-bold select-none">›</span>
                  <span className="flex-1">{activity}</span>
                  <span className="text-[9px] text-muted-foreground select-none uppercase">
                    [PID: {4100 + idx * 84}]
                  </span>
                </li>
              ))}
            </ul>

            {/* Live Packet Telemetry Stream */}
            <div className="mt-2.5 rounded bg-black/60 p-2 border border-border/30 text-[10px] text-muted-foreground">
              <div className="flex justify-between items-center text-[9px] border-b border-border/20 pb-1 mb-1 text-primary">
                <span>LIVE RAW PACKET SNIFFER</span>
                <span className="animate-pulse text-destructive">CAPTURE ACTIVE</span>
              </div>
              <div className="font-mono text-[9px] leading-tight text-accent/80 truncate">
                0x{(((hexTick * 41) % 8999) + 1000).toString(16)}: 45 00 02 c5{" "}
                {hexTick.toString(16)} 1c 40 00 40 06 7c 4a 0a 14 50 0c | C2_BEACON_PAYLOAD_STAGE_
                {hexTick % 4}
              </div>
            </div>
          </div>

          {/* Section 3: Whom It Is Affecting */}
          <div className="rounded border border-border bg-secondary/30 p-3">
            <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase text-primary mb-2">
              <Network className="size-3.5" />
              Impacted Assets & Affected Targets
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="rounded bg-black/35 p-2 border border-border/30">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-[10px] uppercase">
                  <Server className="size-3" />
                  Target Host System
                </div>
                <div className="font-bold text-foreground text-xs">
                  {nodeDef.label} ({nodeDef.sublabel})
                </div>
                <div className="text-[10px] text-primary">
                  {threatInfo.affectedEntity.ipAddress}
                </div>
              </div>

              <div className="rounded bg-black/35 p-2 border border-border/30">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1 text-[10px] uppercase">
                  <User className="size-3" />
                  Impacted Department & User
                </div>
                <div className="font-bold text-foreground text-xs">{nodeDef.department}</div>
                <div className="text-[10px] text-muted-foreground">
                  {threatInfo.affectedEntity.affectedUser}
                </div>
              </div>

              <div className="sm:col-span-2 rounded bg-black/35 p-2 border border-border/30">
                <div className="text-muted-foreground text-[10px] uppercase mb-0.5">
                  Critical Assets in Danger
                </div>
                <div className="text-foreground font-semibold">
                  {threatInfo.affectedEntity.criticalAssets}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
                  <AlertTriangle className="size-3" />
                  <span>Blast Radius: {threatInfo.affectedEntity.blastRadius}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Biometric Directive Banner */}
          <div className="rounded border border-primary/40 bg-primary/10 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-full bg-primary/20 p-2 text-primary animate-pulse">
                <Eye className="size-5" />
              </div>
              <div>
                <div className="font-display font-bold text-xs uppercase text-primary">
                  BIOMETRIC CONTAINMENT COMMAND READY
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Perform a <strong className="text-foreground">Face Wink / Eye Blink</strong>{" "}
                  gesture or tap the button below to isolate host.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card p-3">
          <div className="text-[10px] text-muted-foreground">
            Containment reward: <span className="text-primary font-bold">+520 pts</span> (Combo x
            {useGame.getState().combo})
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={close}>
              Dismiss
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/30"
              onClick={() => {
                isolate(nodeId);
              }}
            >
              <LockKeyhole className="size-4" />
              <span>ISOLATE HOST NOW (Blink Eye / Click)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
