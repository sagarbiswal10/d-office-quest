import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, Line, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useRef, useEffect } from "react";
import * as THREE from "three";
import { NETWORK, THREATS } from "@/game/data";
import { useGame, type NodeState } from "@/game/store";

const PALETTE = {
  // Office furniture & accents (from user reference images)
  oakWood: "#dfa874",
  oakDark: "#c88f58",
  deskWhite: "#ffffff",
  drawerHandle: "#b57c48",
  chairBlue: "#3b82f6",
  chairCushion: "#fef3c7",
  chairBase: "#94a3b8",
  plantGreen: "#15803d",
  leafGreen: "#22c55e",
  potClay: "#e07a5f",
  potBlue: "#38bdf8",
  lampNavy: "#1e293b",
  lampGlow: "#fef08a",
  navyWall: "#1e293b",
  navyAccent: "#0f172a",
  woodSlat: "#d4a373",
  terrazzoFloor: "#e2e8f0",
  rugPattern: "#f8fafc",
  sofaGreen: "#4ade80",
  armchairYellow: "#eab308",
  coffeeWood: "#ede0d4",
  // Matte Black Datacenter Servers (user: "make servers black")
  serverBlack: "#090d16",
  serverMetal: "#1e293b",
  serverBlade: "#0f172a",
  serverTrim: "#334155",
  // Status Colors
  clean: "#0284c7",
  isolated: "#64748b",
  selected: "#f59e0b",
};

function statusColor(node: NodeState) {
  if (node.status === "isolated") return PALETTE.isolated;
  if (node.status === "infected" && node.threat) return THREATS[node.threat].color;
  return PALETTE.clean;
}

function MissionLoop() {
  useFrame((_, rawDelta) => useGame.getState().tick(Math.min(rawDelta, 0.05)));
  return null;
}

// -------------------------------------------------------------
// CUTE DESK POTTED PLANT & DAISY (Reference Image 1)
// -------------------------------------------------------------
function DeskPlantMini({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Terracotta Clay Pot */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.15, 16]} />
        <meshStandardMaterial color={PALETTE.potClay} roughness={0.5} />
      </mesh>
      {/* Rich Soil */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.068, 0.068, 0.02, 16]} />
        <meshStandardMaterial color="#422006" roughness={0.8} />
      </mesh>
      {/* Green Sprout Leaves */}
      <group position={[0, 0.16, 0]}>
        <mesh position={[-0.04, 0.07, 0]} rotation-z={0.35} castShadow>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={PALETTE.leafGreen} roughness={0.3} />
        </mesh>
        <mesh position={[0.04, 0.08, 0]} rotation-z={-0.35} castShadow>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={PALETTE.plantGreen} roughness={0.3} />
        </mesh>
        {/* Tiny Daisy Flower */}
        <mesh position={[0, 0.12, 0.03]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// SLEEK NAVY DESK GOOSENECK LAMP (Reference Image 2)
// -------------------------------------------------------------
function ModernDeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Circular Navy Base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.03, 16]} />
        <meshStandardMaterial color={PALETTE.lampNavy} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Curved Stem */}
      <mesh position={[0, 0.22, -0.04]} rotation-x={-0.2} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
        <meshStandardMaterial color={PALETTE.lampNavy} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Lamp Bell Shade with Warm Glow */}
      <group position={[0, 0.42, 0.06]} rotation-x={0.4}>
        <mesh castShadow>
          <coneGeometry args={[0.09, 0.14, 16, 1, true]} />
          <meshStandardMaterial
            color={PALETTE.lampNavy}
            metalness={0.6}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={PALETTE.lampGlow} />
        </mesh>
        <pointLight intensity={3} distance={2.5} color={PALETTE.lampGlow} />
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// COLORFUL MODERN WORKSTATION (Reference Image 1 & 2)
// -------------------------------------------------------------
function ColorfulWorkstation({ accent = PALETTE.clean }: { accent?: string }) {
  return (
    <group>
      {/* Warm Honey-Oak Tabletop with Rounded Corners */}
      <RoundedBox
        args={[2.8, 0.12, 1.4]}
        radius={0.06}
        smoothness={3}
        position={[0, 0.86, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.oakWood} roughness={0.3} />
      </RoundedBox>

      {/* 3-Drawer Under-Desk Cabinet (White drawers + Oak Frame + Wood Handles) */}
      <group position={[0.82, 0.42, 0]}>
        {/* Oak Cabinet Outer Casing */}
        <RoundedBox args={[0.85, 0.74, 1.25]} radius={0.04} smoothness={2} castShadow receiveShadow>
          <meshStandardMaterial color={PALETTE.oakDark} roughness={0.35} />
        </RoundedBox>
        {/* 3 White Drawer Fronts with Wood Pull Handles */}
        {[-0.23, 0.0, 0.23].map((dy, idx) => (
          <group key={idx} position={[0, dy, 0.63]}>
            <RoundedBox args={[0.76, 0.21, 0.03]} radius={0.02} smoothness={2} castShadow>
              <meshStandardMaterial color={PALETTE.deskWhite} roughness={0.2} />
            </RoundedBox>
            {/* Wooden Pull Handle */}
            <mesh position={[0, 0, 0.025]} castShadow>
              <boxGeometry args={[0.16, 0.035, 0.025]} />
              <meshStandardMaterial color={PALETTE.drawerHandle} roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Solid Warm Wood Tapered Desk Legs (Left Side) */}
      {[-0.55, 0.55].map((z, idx) => (
        <mesh key={idx} position={[-1.2, 0.42, z]} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 0.82, 12]} />
          <meshStandardMaterial color={PALETTE.oakDark} roughness={0.4} />
        </mesh>
      ))}

      {/* Modern Pastel Blue Curved Laptop / Display (Image 1) */}
      <group position={[-0.42, 0.94, -0.05]} rotation-y={0.08}>
        {/* Laptop Base in Pastel Blue */}
        <RoundedBox args={[0.86, 0.03, 0.58]} radius={0.02} smoothness={2} castShadow>
          <meshStandardMaterial color="#bfdbfe" roughness={0.3} metalness={0.2} />
        </RoundedBox>
        {/* Trackpad & Keyboard */}
        <mesh position={[0, 0.018, 0.12]}>
          <planeGeometry args={[0.26, 0.16]} />
          <meshStandardMaterial color="#93c5fd" />
        </mesh>
        <mesh position={[0, 0.018, -0.1]}>
          <planeGeometry args={[0.76, 0.26]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Laptop Display Lid open at 105 degrees */}
        <group position={[0, 0.02, -0.28]} rotation-x={-0.24}>
          <RoundedBox
            args={[0.86, 0.56, 0.025]}
            radius={0.02}
            smoothness={2}
            position={[0, 0.28, 0]}
            castShadow
          >
            <meshStandardMaterial color="#60a5fa" roughness={0.25} />
          </RoundedBox>
          {/* Glowing Display Screen */}
          <mesh position={[0, 0.28, 0.015]}>
            <planeGeometry args={[0.82, 0.52]} />
            <meshStandardMaterial color="#082f49" emissive={accent} emissiveIntensity={0.65} />
          </mesh>
        </group>
      </group>

      {/* Desk Accessories from References */}
      <DeskPlantMini position={[0.42, 0.92, -0.42]} />
      <ModernDeskLamp position={[-1.05, 0.92, -0.42]} />

      {/* Ceramic Coffee Mug & Coaster */}
      <mesh position={[0.35, 0.93, 0.36]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.12, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} />
      </mesh>

      {/* Sky-Blue Ergonomic Swivel Chair with Cream Cushion (Reference Image 1) */}
      <group position={[-0.42, 0, 1.15]} rotation-y={Math.PI}>
        {/* Curved Sky-Blue Backrest */}
        <RoundedBox
          args={[0.74, 0.92, 0.1]}
          radius={0.06}
          smoothness={3}
          position={[0, 1.25, 0.3]}
          rotation-x={-0.12}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.chairBlue} roughness={0.35} />
        </RoundedBox>
        {/* Soft Cream / Beige Seating Cushion Pad */}
        <RoundedBox
          args={[0.76, 0.12, 0.74]}
          radius={0.06}
          smoothness={3}
          position={[0, 0.74, 0]}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.chairCushion} roughness={0.6} />
        </RoundedBox>
        {/* Sky-Blue Cushion Underside Seat Pan */}
        <mesh position={[0, 0.67, 0]}>
          <boxGeometry args={[0.78, 0.04, 0.76]} />
          <meshStandardMaterial color={PALETTE.chairBlue} roughness={0.4} />
        </mesh>
        {/* White Ergonomic Armrests */}
        {[-0.42, 0.42].map((x, idx) => (
          <group key={idx} position={[x, 0.94, 0.06]}>
            <mesh castShadow>
              <boxGeometry args={[0.06, 0.035, 0.48]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.15, -0.15]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.32, 8]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} />
            </mesh>
          </group>
        ))}
        {/* Chrome Gas-Lift Stem */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.65, 12]} />
          <meshStandardMaterial color={PALETTE.chairBase} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* 5-Star Swivel Base with Caster Wheels */}
        <mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.42, 0.42, 0.05, 5]} />
          <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} />
        </mesh>
        {Array.from({ length: 5 }, (_, wi) => {
          const wAngle = (wi * Math.PI * 2) / 5;
          return (
            <mesh key={wi} position={[Math.cos(wAngle) * 0.38, 0.04, Math.sin(wAngle) * 0.38]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// MATTE BLACK 42U ENTERPRISE SERVER RACK (User: "make servers black")
// -------------------------------------------------------------
function MatteBlackServer({ accent = PALETTE.clean }: { accent?: string }) {
  const pulseRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      pulseRef.current.intensity = 8 + Math.sin(clock.elapsedTime * 6) * 4;
    }
  });

  return (
    <group>
      {/* Matte Obsidian Black Steel Frame */}
      <RoundedBox
        args={[1.85, 3.8, 1.55]}
        radius={0.08}
        smoothness={3}
        position={[0, 1.9, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={PALETTE.serverBlack} roughness={0.35} metalness={0.85} />
      </RoundedBox>

      {/* Dark Brushed Aluminum Corner Accents */}
      {[-0.88, 0.88].map((x) => (
        <mesh key={x} position={[x, 1.9, 0.74]}>
          <boxGeometry args={[0.06, 3.75, 0.06]} />
          <meshStandardMaterial color={PALETTE.serverTrim} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Internal Rack Bay Backing */}
      <mesh position={[0, 1.9, 0.66]}>
        <planeGeometry args={[1.6, 3.5]} />
        <meshStandardMaterial color="#050811" roughness={0.9} />
      </mesh>

      {/* 9 Matte Black Blade Server Modules */}
      {Array.from({ length: 9 }, (_, i) => {
        const y = 0.42 + i * 0.37;
        return (
          <group key={i} position={[0, y, 0.7]}>
            {/* Black Blade Faceplate */}
            <mesh castShadow>
              <boxGeometry args={[1.52, 0.29, 0.08]} />
              <meshStandardMaterial color={PALETTE.serverBlade} roughness={0.3} metalness={0.7} />
            </mesh>
            {/* Dark Hex Honeycomb Mesh */}
            <mesh position={[0.26, 0, 0.045]}>
              <planeGeometry args={[0.76, 0.2]} />
              <meshStandardMaterial color="#020408" roughness={0.9} />
            </mesh>
            {/* Silver Blade Ejector Handles */}
            {[-0.72, 0.72].map((hx) => (
              <mesh key={hx} position={[hx, 0, 0.05]}>
                <boxGeometry args={[0.03, 0.18, 0.02]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
            ))}
            {/* Blinking Activity Status LEDs */}
            <mesh position={[-0.58, 0.06, 0.046]}>
              <boxGeometry args={[0.05, 0.05, 0.02]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
            <mesh position={[-0.48, 0.06, 0.046]}>
              <boxGeometry args={[0.04, 0.04, 0.02]} />
              <meshBasicMaterial color="#10b981" toneMapped={false} />
            </mesh>
            <mesh position={[-0.4, 0.06, 0.046]}>
              <boxGeometry args={[0.035, 0.035, 0.02]} />
              <meshBasicMaterial color="#38bdf8" toneMapped={false} />
            </mesh>
            {/* Hot-Swap Drive Bays */}
            {[-0.22, -0.08, 0.06].map((dx, driveIdx) => (
              <mesh key={driveIdx} position={[dx, -0.04, 0.045]}>
                <boxGeometry args={[0.1, 0.14, 0.02]} />
                <meshStandardMaterial color="#475569" metalness={0.7} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Dark Smoked Tempered Glass Door with Chrome Bar Handle */}
      <mesh position={[0, 1.9, 0.78]}>
        <planeGeometry args={[1.7, 3.6]} />
        <meshPhysicalMaterial
          color="#0f172a"
          transmission={0.65}
          opacity={0.4}
          transparent
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0.78, 1.9, 0.81]}>
        <cylinderGeometry args={[0.022, 0.022, 1.4, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
      </mesh>

      {/* Rack Internal Glow */}
      <pointLight ref={pulseRef} position={[0, 2.2, 0.9]} color={accent} distance={4.5} />
    </group>
  );
}

// -------------------------------------------------------------
// DEDICATED HIGH-SPEED WIFI AP / CORE ROUTER (NOC Bay)
// -------------------------------------------------------------
function DedicatedWifiRouter({ accent = PALETTE.clean }: { accent?: string }) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const waveRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pulseRef.current) {
      const s = 1 + Math.sin(t * 5) * 0.14;
      pulseRef.current.scale.set(s, s, 1);
    }
    if (waveRef.current) {
      const ws = (t * 1.5) % 1;
      waveRef.current.scale.set(1 + ws * 1.9, 1 + ws * 1.9, 1);
      (waveRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - ws * 0.85);
    }
  });

  return (
    <group>
      {/* Matte Charcoal & Navy Router Chassis */}
      <RoundedBox
        args={[2.1, 0.54, 1.35]}
        radius={0.08}
        smoothness={2}
        position={[0, 0.3, 0]}
        castShadow
      >
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
      </RoundedBox>

      {/* High-Tech Display Panel with Activity LEDs */}
      <group position={[0, 0.3, 0.69]}>
        <mesh>
          <boxGeometry args={[1.9, 0.36, 0.04]} />
          <meshStandardMaterial color="#020617" roughness={0.2} />
        </mesh>
        <mesh position={[-0.45, 0, 0.025]}>
          <planeGeometry args={[0.75, 0.2]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
        {Array.from({ length: 6 }, (_, idx) => (
          <mesh key={idx} position={[0.15 + idx * 0.12, 0.04, 0.025]}>
            <boxGeometry args={[0.04, 0.04, 0.02]} />
            <meshBasicMaterial color={idx % 2 === 0 ? accent : "#10b981"} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* 4 Gold-Ringed High-Gain WiFi Antennas */}
      {[-0.7, -0.24, 0.24, 0.7].map((x) => (
        <group key={x} position={[x, 0.56, -0.48]}>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.08, 12]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.54, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 1.0, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.06, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Pulsing WiFi Signal Rings */}
      <mesh ref={pulseRef} position={[0, 0.6, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.62, 32]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh ref={waveRef} position={[0, 0.61, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.65, 0.78, 32]} />
        <meshBasicMaterial color={accent} toneMapped={false} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// BREAKOUT LOUNGE AREA (Reference Image 3)
// -------------------------------------------------------------
function BreakoutLounge() {
  return (
    <group position={[14, 0, 12]}>
      {/* Modern Geometric Area Rug (Image 3) */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      {/* Chevron Black Diamond Rug Lines */}
      {[-2.5, -0.8, 0.8, 2.5].map((x) => (
        <mesh key={x} position={[x, 0.025, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.08, 6.2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}

      {/* Vibrant Avocado / Sage Green Modern Sofa (Image 3) */}
      <group position={[0, 0, -2.2]}>
        {/* Sofa Base Cushion */}
        <RoundedBox
          args={[3.2, 0.42, 1.2]}
          radius={0.12}
          smoothness={3}
          position={[0, 0.38, 0]}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.sofaGreen} roughness={0.5} />
        </RoundedBox>
        {/* Sofa Backrest */}
        <RoundedBox
          args={[3.2, 0.72, 0.35]}
          radius={0.12}
          smoothness={3}
          position={[0, 0.78, -0.42]}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.sofaGreen} roughness={0.5} />
        </RoundedBox>
        {/* Sofa Armrests */}
        {[-1.5, 1.5].map((x) => (
          <RoundedBox
            key={x}
            args={[0.26, 0.62, 1.15]}
            radius={0.08}
            smoothness={2}
            position={[x, 0.62, 0]}
            castShadow
          >
            <meshStandardMaterial color={PALETTE.sofaGreen} roughness={0.5} />
          </RoundedBox>
        ))}
        {/* Wooden Tapered Legs */}
        {[-1.3, 1.3].map((x) =>
          [-0.4, 0.4].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.1, z]} castShadow>
              <cylinderGeometry args={[0.035, 0.045, 0.2, 8]} />
              <meshStandardMaterial color={PALETTE.oakWood} />
            </mesh>
          )),
        )}
      </group>

      {/* Cheerful Mustard Yellow Armchair (Image 3) */}
      <group position={[-2.8, 0, 0.5]} rotation-y={0.65}>
        <RoundedBox
          args={[1.1, 0.38, 1.0]}
          radius={0.12}
          smoothness={3}
          position={[0, 0.36, 0]}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.armchairYellow} roughness={0.5} />
        </RoundedBox>
        <RoundedBox
          args={[1.1, 0.68, 0.28]}
          radius={0.12}
          smoothness={3}
          position={[0, 0.74, -0.38]}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.armchairYellow} roughness={0.5} />
        </RoundedBox>
        {[-0.5, 0.5].map((x) => (
          <RoundedBox
            key={x}
            args={[0.18, 0.54, 0.95]}
            radius={0.08}
            smoothness={2}
            position={[x, 0.56, 0]}
            castShadow
          >
            <meshStandardMaterial color={PALETTE.armchairYellow} roughness={0.5} />
          </RoundedBox>
        ))}
      </group>

      {/* Scandinavian Low Coffee Table in Birch Wood (Image 3) */}
      <group position={[0, 0, 0.4]}>
        <RoundedBox
          args={[1.8, 0.08, 1.0]}
          radius={0.04}
          smoothness={2}
          position={[0, 0.38, 0]}
          castShadow
        >
          <meshStandardMaterial color={PALETTE.coffeeWood} roughness={0.4} />
        </RoundedBox>
        {[-0.7, 0.7].map((x) =>
          [-0.35, 0.35].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.18, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.035, 0.36, 8]} />
              <meshStandardMaterial color={PALETTE.oakDark} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// EXPANSIVE, COLORFUL 3D OFFICE ARCHITECTURE (References 1, 2, 3)
// -------------------------------------------------------------
function ColorfulOfficeEnvironment() {
  const activeAlerts = useGame((s) => s.nodes.filter((n) => n.status === "infected").length);
  const emergencyLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (emergencyLightRef.current) {
      if (activeAlerts > 0) {
        emergencyLightRef.current.intensity = 24 + Math.sin(clock.elapsedTime * 8) * 16;
      } else {
        emergencyLightRef.current.intensity = 0;
      }
    }
  });

  return (
    <group>
      {/* Expansive Infinite Studio Platform (Never goes blank when zooming out!) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Main Architectural Office Floor (Terrazzo with Subtle Grid) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[56, 50]} />
        <meshStandardMaterial
          color={PALETTE.terrazzoFloor}
          roughness={0.2}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[56, 50]}
        cellSize={1.2}
        cellColor="#94a3b8"
        sectionSize={6}
        sectionColor="#3b82f6"
        fadeDistance={90}
      />

      {/* Rear Wall with Black-Framed Panoramic Ribbon Windows (Image 3) */}
      <group position={[0, 6, -18.2]}>
        {/* Wall Frame with DoubleSide so zoom-out never clips */}
        <mesh receiveShadow>
          <boxGeometry args={[56, 12, 0.4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Vertical Honey-Oak Acoustic Slat Accents */}
        {[-22, -18, -14, 14, 18, 22].map((x) => (
          <mesh key={x} position={[x, 0, 0.22]}>
            <boxGeometry args={[0.8, 11.6, 0.06]} />
            <meshStandardMaterial color={PALETTE.woodSlat} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Left Wall (Datacenter Server Wing) in Deep Navy Accent (Image 2) */}
      <group position={[-27.8, 6, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.4, 12, 50]} />
          <meshStandardMaterial color={PALETTE.navyWall} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <Text
          position={[0.25, 4.5, 0]}
          rotation-y={Math.PI / 2}
          fontSize={0.65}
          color="#38bdf8"
          anchorX="center"
        >
          ENTERPRISE DATACENTER VAULT · MISSION CRITICAL SERVERS
        </Text>
      </group>

      {/* Glass Partition Wall Separating Datacenter from Open Office */}
      <group position={[-10.2, 5, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 10, 36]} />
          <meshPhysicalMaterial
            color="#93c5fd"
            transmission={0.9}
            opacity={0.25}
            transparent
            roughness={0.05}
          />
        </mesh>
        <mesh position={[0, 4.2, 0]}>
          <boxGeometry args={[0.18, 0.4, 36]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* Right Wall with Black-Framed Industrial Windows (Image 3) */}
      <group position={[27.8, 6, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.4, 12, 50]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Black Window Mullions */}
        {[-16, -6, 4, 14].map((z) => (
          <mesh key={z} position={[-0.22, 0, z]}>
            <boxGeometry args={[0.06, 11.6, 0.12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        ))}
      </group>

      {/* Glass Partition Wall Separating WiFi NOC Bay from Open Office */}
      <group position={[10.2, 5, -5]}>
        <mesh>
          <boxGeometry args={[0.1, 10, 26]} />
          <meshPhysicalMaterial
            color="#93c5fd"
            transmission={0.9}
            opacity={0.25}
            transparent
            roughness={0.05}
          />
        </mesh>
        <mesh position={[0, 4.2, 0]}>
          <boxGeometry args={[0.18, 0.4, 26]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Text
          position={[-0.15, 6.5, 0]}
          rotation-y={-Math.PI / 2}
          fontSize={0.48}
          color="#0284c7"
          anchorX="center"
        >
          TELECOM & HIGH-SPEED WIFI NOC
        </Text>
      </group>

      {/* Lush Green Planter Hedge Dividers (Image 3) */}
      {[-8.5, 8.5].map((x) => (
        <group key={x} position={[x, 0.45, 0]}>
          {/* Dark Charcoal Planter Trough */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.55, 0.85, 18]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* Dense Lush Hedge Greenery */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[0.7, 0.65, 17.8]} />
            <meshStandardMaterial color={PALETTE.plantGreen} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Breakout Lounge Area (Image 3) */}
      <BreakoutLounge />

      {/* Daylight Balanced Overhead Softbox Lighting */}
      {[-16, -6, 6, 16].map((x) =>
        [-8, 3, 14].map((z) => (
          <group key={`${x}-${z}`} position={[x, 11.2, z]}>
            <mesh>
              <boxGeometry args={[4.2, 0.1, 1.2]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2.5} />
            </mesh>
            <pointLight intensity={18} distance={18} color="#ffffff" />
          </group>
        )),
      )}

      {/* Emergency Alert Strobe */}
      <pointLight ref={emergencyLightRef} position={[0, 9.5, -4]} color="#ef4444" distance={28} />

      {/* Modern High-End Video Wall Display */}
      <group position={[0, 6.0, -17.5]}>
        <mesh position={[0, 0, -0.2]}>
          <boxGeometry args={[34, 7.2, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
        {/* Center Main Cyber Intelligence Screen */}
        <mesh position={[0, 0, 0.05]} castShadow>
          <planeGeometry args={[14.5, 6.2]} />
          <meshStandardMaterial
            color={activeAlerts > 0 ? "#2b0a10" : "#022c22"}
            emissive={activeAlerts > 0 ? "#ef4444" : "#10b981"}
            emissiveIntensity={activeAlerts > 0 ? 0.65 : 0.45}
            roughness={0.1}
          />
        </mesh>
        <Text
          position={[0, 2.2, 0.1]}
          fontSize={0.44}
          color={activeAlerts > 0 ? "#ef4444" : "#10b981"}
          anchorX="center"
        >
          {activeAlerts > 0
            ? `🚨 THREAT ALERT: ${activeAlerts} ACTIVE BREACHES`
            : "ALL ENTERPRISE SYSTEMS SECURE"}
        </Text>
        <Text position={[0, 1.3, 0.1]} fontSize={0.3} color="#ffffff" anchorX="center">
          Point to Select · Pinch to Investigate · Eye Wink to Isolate
        </Text>
        {/* Left Screen: Datacenter Radar */}
        <group position={[-11.5, 0, 0]}>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[8.0, 6.2]} />
            <meshStandardMaterial color="#041e30" emissive="#0284c7" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[-3.6, 2.4, 0.1]} fontSize={0.28} color="#38bdf8" anchorX="left">
            DATACENTER VAULT
          </Text>
          <Text position={[-3.6, 1.7, 0.1]} fontSize={0.22} color="#94a3b8" anchorX="left">
            Black 42U Server Racks Online
          </Text>
        </group>
        {/* Right Screen: NOC WiFi Telemetry */}
        <group position={[11.5, 0, 0]}>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[8.0, 6.2]} />
            <meshStandardMaterial color="#041e30" emissive="#00e5ff" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[-3.6, 2.4, 0.1]} fontSize={0.28} color="#00e5ff" anchorX="left">
            TELECOM & WIFI NOC
          </Text>
          <Text position={[-3.6, 1.7, 0.1]} fontSize={0.22} color="#94a3b8" anchorX="left">
            Throughput: 10 Gbps SFP+
          </Text>
        </group>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// INTERACTIVE NETWORK DEVICE COMPONENT (Pointing & Selection)
// -------------------------------------------------------------
function InteractiveDevice({ index }: { index: number }) {
  const def = NETWORK.nodes[index];
  const node = useGame((s) => s.nodes[index]);
  const selected = useGame((s) => s.selected === index);
  const phase = useGame((s) => s.phase);

  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const threatHolo = useRef<THREE.Group>(null);

  const color = node ? statusColor(node) : PALETTE.clean;

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (group.current && node?.status === "infected") {
      group.current.position.y = Math.sin(time * 5 + index) * 0.08;
    } else if (group.current) {
      group.current.position.y = 0;
    }

    if (ring.current) {
      ring.current.rotation.z = time * 0.6;
      const baseScale = selected ? 1.4 : 1;
      const pulse = node?.status === "infected" ? Math.sin(time * 6) * 0.15 : 0;
      ring.current.scale.setScalar(baseScale + pulse);
    }

    if (threatHolo.current) {
      threatHolo.current.rotation.y = time * 2;
    }
  });

  if (!def || !node) return null;

  return (
    <group
      position={def.pos}
      ref={group}
      onClick={(e) => {
        if (phase !== "playing") return;
        e.stopPropagation();
        useGame.getState().select(index);
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {/* 3D Model: Matte Black Servers, Dedicated WiFi Routers, or Colorful Workstations */}
      {def.kind === "server" ? (
        <MatteBlackServer accent={color} />
      ) : def.kind === "router" ? (
        <DedicatedWifiRouter accent={color} />
      ) : (
        <ColorfulWorkstation accent={color} />
      )}

      {/* Target Selection Floor Ring */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.3, 1.52, 36]} />
        <meshBasicMaterial
          color={selected ? PALETTE.selected : color}
          transparent
          opacity={selected ? 0.95 : 0.45}
          toneMapped={false}
        />
      </mesh>

      {/* Floating Infection Indicator */}
      {node.status === "infected" && (
        <group position={[0, def.kind === "server" ? 4.3 : 2.9, 0]} ref={threatHolo}>
          <mesh>
            <octahedronGeometry args={[0.38 + node.infection * 0.25, 0]} />
            <meshBasicMaterial color={color} wireframe toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <pointLight intensity={10} distance={5} color={color} />
        </group>
      )}

      {/* Floating System HUD Label */}
      <Text
        position={[0, def.kind === "server" ? 4.1 : 2.6, 0]}
        fontSize={0.36}
        color={selected ? PALETTE.selected : "#0f172a"}
        anchorX="center"
        outlineWidth={0.03}
        outlineColor="#ffffff"
      >
        {def.label}
        {node.status === "infected" && node.investigated && node.threat
          ? `\n[ ${THREATS[node.threat].name} ]`
          : node.status === "infected"
            ? "\n[ THREAT DETECTED · PINCH ]"
            : ""}
      </Text>
    </group>
  );
}

// -------------------------------------------------------------
// LASER DATA LINK WITH TRAVELING PACKETS
// -------------------------------------------------------------
function CyberNetworkLink({ a, b }: { a: number; b: number }) {
  const first = useGame((s) => s.nodes[a]);
  const second = useGame((s) => s.nodes[b]);
  const firewall = useGame((s) => s.firewallFor > 0);
  const startNode = NETWORK.nodes[a];
  const endNode = NETWORK.nodes[b];

  const packetRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (packetRef.current && startNode && endNode) {
      const t = (clock.elapsedTime * 1.5 + (a + b) * 0.3) % 1;
      packetRef.current.position.x = startNode.pos[0] + (endNode.pos[0] - startNode.pos[0]) * t;
      packetRef.current.position.z = startNode.pos[2] + (endNode.pos[2] - startNode.pos[2]) * t;
    }
  });

  if (!first || !second || !startNode || !endNode) return null;

  const start = startNode.pos;
  const end = endNode.pos;
  const compromised =
    first.status === "infected" ? first : second.status === "infected" ? second : null;
  const offline = first.status === "isolated" || second.status === "isolated";
  const color = offline
    ? "#94a3b8"
    : compromised?.threat
      ? THREATS[compromised.threat].color
      : firewall
        ? "#10b981"
        : "#0284c7";

  return (
    <group>
      <Line
        points={[
          [start[0], 0.05, start[2]],
          [end[0], 0.05, end[2]],
        ]}
        color={color}
        lineWidth={compromised ? 3.5 : 2}
        transparent
        opacity={offline ? 0.25 : 0.85}
      />
      {!offline && (
        <mesh ref={packetRef} position={[start[0], 0.08, start[2]]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// SAFE CAMERA CONTROLLER (No Blank Screen When Zooming Out)
// -------------------------------------------------------------
interface OrbitControlsHandle {
  getDistance: () => number;
  setAzimuthalAngle: (angle: number) => void;
  setPolarAngle: (angle: number) => void;
  dollyIn: (scale: number) => void;
  dollyOut: (scale: number) => void;
  update: () => void;
}

function CameraController() {
  const orbitRef = useRef<OrbitControlsHandle | null>(null);

  const cameraDistance = useGame((s) => s.cameraDistance);
  const cameraAzimuth = useGame((s) => s.cameraAzimuth);
  const cameraPolar = useGame((s) => s.cameraPolar);

  const lastZoomRef = useRef(cameraDistance);
  useEffect(() => {
    if (orbitRef.current) {
      try {
        if (cameraDistance < lastZoomRef.current) {
          orbitRef.current.dollyIn(1.15);
          orbitRef.current.update();
        } else if (cameraDistance > lastZoomRef.current) {
          orbitRef.current.dollyOut(1.15);
          orbitRef.current.update();
        }
      } catch {
        // Safe fallback
      }
      lastZoomRef.current = cameraDistance;
    }
  }, [cameraDistance]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (orbitRef.current) {
      try {
        orbitRef.current.setAzimuthalAngle(cameraAzimuth);
        orbitRef.current.setPolarAngle(cameraPolar);
        orbitRef.current.update();
      } catch {
        // Safe fallback
      }
    }
  }, [cameraAzimuth, cameraPolar]);

  return (
    <OrbitControls
      ref={orbitRef}
      enablePan={false}
      minDistance={5}
      maxDistance={50}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI / 2.05}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
      target={[0, 1.2, 0]}
    />
  );
}

// -------------------------------------------------------------
// MAIN GAME SCENE (Colorful 3D Architectural Office)
// -------------------------------------------------------------
export function GameScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 13, 21], fov: 44, near: 0.1, far: 2000 }}
      onPointerMissed={() => useGame.getState().select(null)}
      gl={{ antialias: true }}
    >
      {/* Studio Backdrop Tone matching miniature 3D references */}
      <color attach="background" args={["#e2e8f0"]} />

      {/* Balanced Sunlight & Ambient Fill */}
      <ambientLight intensity={1.4} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#94a3b8", 1.2]} />
      <directionalLight
        position={[16, 24, 18]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-18, 18, -14]} intensity={1.5} color="#93c5fd" />

      <Suspense fallback={null}>
        <ColorfulOfficeEnvironment />

        {/* Network Laser Links with traveling packets */}
        {NETWORK.links.map(([a, b]) => (
          <CyberNetworkLink key={`${a}-${b}`} a={a} b={b} />
        ))}

        {/* Organized Interactive 3D Devices */}
        {NETWORK.nodes.map((node) => (
          <InteractiveDevice key={node.id} index={node.id} />
        ))}

        <MissionLoop />
        <CameraController />
      </Suspense>
    </Canvas>
  );
}
