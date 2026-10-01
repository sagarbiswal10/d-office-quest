import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { GameScene } from "@/components/game/Scene";
import { HUD } from "@/components/game/HUD";
import { Menu, PauseScreen, Results } from "@/components/game/Screens";
import { MediaPipeController } from "@/components/game/MediaPipeController";
import { InvestigationModal } from "@/components/game/InvestigationModal";
import { useGame } from "@/game/store";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cyber Raid — 3D SOC Defense Game with AI Camera Gestures" },
      {
        name: "description",
        content:
          "Investigate and contain enterprise cyber threats inside a realistic 3D Security Operations Center using MediaPipe camera gestures.",
      },
      { property: "og:title", content: "Cyber Raid — 3D SOC Defense Game" },
      {
        property: "og:description",
        content:
          "Defend a 3D security operations center with pinch investigation, eye wink containment, and 360° panoramic tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Scene 3D WebGL fallback triggered:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080e14] p-6 text-center text-muted-foreground font-mono">
          <div className="panel max-w-md p-6 border-destructive/50 bg-black/80">
            <AlertTriangle className="size-10 text-destructive mx-auto mb-3" />
            <h3 className="font-display text-lg text-foreground font-bold uppercase mb-1">
              WebGL Renderer Initializing
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Your browser or graphics acceleration experienced a hitch loading the 3D office.
            </p>
            <Button
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              <span>Retry 3D Scene</span>
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Game() {
  const phase = useGame((s) => s.phase);

  return (
    <main className="fixed inset-0 overflow-hidden bg-background text-foreground font-mono select-none">
      <SceneErrorBoundary>
        <GameScene />
      </SceneErrorBoundary>

      <div className="vignette pointer-events-none fixed inset-0 z-[5]" />

      {/* MediaPipe Camera & AI Gesture Controller */}
      <MediaPipeController />

      {/* Forensic Investigation Popup Modal */}
      <InvestigationModal />

      {(phase === "playing" || phase === "paused") && <HUD />}
      {phase === "menu" && <Menu />}
      {phase === "paused" && <PauseScreen />}
      {phase === "results" && <Results />}
    </main>
  );
}
