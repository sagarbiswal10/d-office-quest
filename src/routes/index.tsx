import { createFileRoute } from "@tanstack/react-router";
import { GameScene } from "@/components/game/Scene";
import { HUD } from "@/components/game/HUD";
import { Menu, PauseScreen, Results } from "@/components/game/Screens";
import { useGame } from "@/game/store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Cyber Raid — 3D SOC Defense Game" },
    { name: "description", content: "Investigate and contain five cyber threats inside an interactive 3D security operations center." },
    { property: "og:title", content: "Cyber Raid — 3D SOC Defense Game" },
    { property: "og:description", content: "Protect a 3D security operations center by investigating and containing every threat." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Game,
});

function Game() {
  const phase = useGame((s) => s.phase);
  return <main className="fixed inset-0 overflow-hidden bg-background text-foreground"><GameScene/><div className="vignette pointer-events-none fixed inset-0 z-[5]"/>{(phase === "playing" || phase === "paused") && <HUD/>}{phase === "menu" && <Menu/>}{phase === "paused" && <PauseScreen/>}{phase === "results" && <Results/>}</main>;
}
