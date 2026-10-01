import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { NETWORK, THREATS } from "@/game/data";
import { useGame, type NodeState } from "@/game/store";

const OFFICE_PALETTE = {
  roomBg: "#0f172a",
  woodFloor: "#b88752",
  woodFloorDark: "#9a6c38",
  carpetPath: "#1e293b",
  featureWall: "#182234",
  acousticTimber: "#c69259",
  glassDivider: "#38bdf8",
  metalBlack: "#0f172a",
  metalChrome: "#cbd5e1",
  deskWood: "#dfa874",
  deskWhiteDrawer: "#f8fafc",
  chairMesh: "#1e293b",
  chairFrame: "#0f172a",
  chairChrome: "#cbd5e1",
  screenClean: "#0284c7",
  screenGlow: "#00e5ff",
  alertRed: "#ef4444",
  serverBlack: "#090d16",
  selectedGold: "#f59e0b",
};

function statusColor(node: NodeState) {
  if (node.status === "isolated") return "#64748b";
  if (node.status === "infected" && node.threat) return THREATS[node.threat].color;
  return OFFICE_PALETTE.screenClean;
}

function MissionLoop() {
  useFrame((_, rawDelta) => useGame.getState().tick(Math.min(rawDelta, 0.05)));
  return null;
}

// -------------------------------------------------------------------------
// ARCHITECTURAL RECESSED CEILING LIGHTING (Discrete modern office downlights)
// -------------------------------------------------------------------------
function ArchitecturalCeilingLighting() {
  const activeAlerts = useGame((s) => s.nodes.filter((n) => n.status === "infected").length);
  const glowColor = activeAlerts > 0 ? "#ef4444" : "#ffffff";

  return (
    <group position={[0, 8.2, 0]}>
      {/* Discrete Modern Recessed Downlight Fixtures (Images 4 & 5) */}
      {[-16, -6, 6, 16].map((x) =>
        [-12, -4, 4, 12].map((z) => (
          <group key={`downlight-${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.9, 0.04, 0.9]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.022, 0]}>
              <planeGeometry args={[0.78, 0.78]} />
              <meshBasicMaterial color={glowColor} toneMapped={false} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

// -------------------------------------------------------------------------
// REALISTIC WORKSTATION (Honey-Oak Desk, White Drawers, Dual PCs, Ergonomic Chair)
// (Matches Images 1, 2, 3, 5)
// -------------------------------------------------------------------------
function CyberTeamWorkstation({ accent = OFFICE_PALETTE.screenClean }: { accent?: string }) {
  return (
    <group>
      {/* 1. Honey-Oak Rounded Executive Desktop (Images 1, 2, 3) */}
      <RoundedBox
        args={[3.1, 0.1, 1.5]}
        radius={0.05}
        smoothness={2}
        position={[0, 0.88, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={OFFICE_PALETTE.deskWood} roughness={0.35} />
      </RoundedBox>

      {/* Charcoal Metal Underframe & Tapered Legs */}
      {[-1.35, 1.35].map((x) =>
        [-0.58, 0.58].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.44, z]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.84, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
          </mesh>
        )),
      )}

      {/* 2. White Under-Desk Filing Drawer Unit (Directly from Images 3 & 5) */}
      <group position={[1.05, 0.42, 0.0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.76, 0.98]} />
          <meshStandardMaterial color={OFFICE_PALETTE.deskWhiteDrawer} roughness={0.25} />
        </mesh>
        {/* Three Drawer Dividers & Chrome Handles */}
        {[-0.22, 0.02, 0.26].map((y, idx) => (
          <group key={idx} position={[0, y, 0.495]}>
            <mesh>
              <boxGeometry args={[0.54, 0.18, 0.01]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.015]}>
              <boxGeometry args={[0.18, 0.02, 0.015]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Large Stitched Cyber Desk Mat */}
      <mesh position={[-0.15, 0.938, 0.05]} receiveShadow>
        <boxGeometry args={[2.1, 0.008, 0.92]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* 3. DUAL DESKTOP PC MONITORS ON METAL DESK ARM */}
      <group position={[-0.15, 0.94, -0.42]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.56, 8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>

        {/* Primary 27" Curved Monitor */}
        <group position={[-0.45, 0.58, 0.08]} rotation-y={0.06}>
          <mesh castShadow>
            <boxGeometry args={[1.36, 0.8, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[1.3, 0.74]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>

        {/* Secondary Vertical Monitor (Right Side) */}
        <group position={[0.54, 0.58, 0.16]} rotation-y={-0.32}>
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.96, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.022]}>
            <planeGeometry args={[0.54, 0.9]} />
            <meshBasicMaterial color="#0284c7" toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* 4. KEYBOARD & MOUSE */}
      <group position={[-0.3, 0.948, 0.16]}>
        <mesh castShadow>
          <boxGeometry args={[0.74, 0.02, 0.24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.012, 0]}>
          <planeGeometry args={[0.7, 0.2]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>
      <group position={[0.32, 0.948, 0.16]}>
        <mesh castShadow>
          <boxGeometry args={[0.11, 0.035, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
      </group>

      {/* 5. CUTE POTTED SUCCULENT & MODERN TASK LAMP (Images 1, 2) */}
      <group position={[0.82, 0.94, -0.42]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.05, 0.14, 10]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.17, 0]} castShadow>
          <sphereGeometry args={[0.065, 8, 8]} />
          <meshStandardMaterial color="#22c55e" roughness={0.3} />
        </mesh>
      </group>

      {/* 6. ERGONOMIC HIGH-BACK MESH SWIVEL CHAIR (Neatly arranged facing desk - Images 1, 2, 3, 5) */}
      <group position={[-0.15, 0, 1.2]} rotation-y={Math.PI}>
        {/* Ergonomic Curved Mesh Backrest */}
        <RoundedBox
          args={[0.76, 0.94, 0.08]}
          radius={0.04}
          smoothness={2}
          position={[0, 1.28, 0.26]}
          rotation-x={-0.1}
          castShadow
        >
          <meshStandardMaterial color={OFFICE_PALETTE.chairMesh} roughness={0.5} />
        </RoundedBox>
        {/* Soft Padded Seat Cushion */}
        <RoundedBox
          args={[0.78, 0.12, 0.74]}
          radius={0.04}
          smoothness={2}
          position={[0, 0.74, 0]}
          castShadow
        >
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </RoundedBox>
        {/* Armrests */}
        {[-0.42, 0.42].map((x) => (
          <group key={x} position={[x, 0.92, 0.05]}>
            <mesh castShadow>
              <boxGeometry args={[0.06, 0.28, 0.04]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0.14, -0.05]} castShadow>
              <boxGeometry args={[0.08, 0.03, 0.28]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        ))}
        {/* Chrome Gas Lift & 5-Star Wheeled Base */}
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.65, 8]} />
          <meshStandardMaterial color={OFFICE_PALETTE.chairChrome} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.04, 5]} />
          <meshStandardMaterial color="#334155" metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------------------
// 42U HIGH-DENSITY SERVER RACK (Datacenter Vault)
// -------------------------------------------------------------------------
function CyberTeamServerCabinet({ accent = OFFICE_PALETTE.screenClean }: { accent?: string }) {
  return (
    <group>
      <mesh position={[0, 1.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.85, 3.8, 1.55]} />
        <meshStandardMaterial color={OFFICE_PALETTE.serverBlack} roughness={0.3} metalness={0.8} />
      </mesh>
      {/* 8 Blade Trays with Activity LEDs */}
      {Array.from({ length: 8 }, (_, i) => {
        const y = 0.5 + i * 0.4;
        return (
          <group key={i} position={[0, y, 0.76]}>
            <mesh>
              <boxGeometry args={[1.5, 0.26, 0.06]} />
              <meshStandardMaterial color="#1e293b" roughness={0.4} />
            </mesh>
            <mesh position={[-0.55, 0.04, 0.035]}>
              <boxGeometry args={[0.05, 0.05, 0.01]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
            <mesh position={[-0.44, 0.04, 0.035]}>
              <boxGeometry args={[0.04, 0.04, 0.01]} />
              <meshBasicMaterial color="#10b981" toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------------------
// ENTERPRISE NOC ROUTER CONSOLE TABLE
// -------------------------------------------------------------------------
function CyberTeamRouterConsole({ accent = OFFICE_PALETTE.screenClean }: { accent?: string }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.9, 1.4]} />
        <meshStandardMaterial color={OFFICE_PALETTE.deskWood} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[1.8, 0.28, 0.95]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* 4 Gold Antennas */}
      {[-0.6, -0.2, 0.2, 0.6].map((x) => (
        <group key={x} position={[x, 1.25, -0.35]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.9, 6]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.92, 0]}>
            <sphereGeometry args={[0.035, 6, 6]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// -------------------------------------------------------------------------
// BIG REALISTIC OFFICE ARCHITECTURE (Named as CYBER TEAM)
// (Incorporates design features from all 5 reference images)
// -------------------------------------------------------------------------
function CyberTeamOfficeArchitecture() {
  const activeAlerts = useGame((s) => s.nodes.filter((n) => n.status === "infected").length);

  return (
    <group>
      {/* 1. EXPANSIVE HARDWOOD FLOOR (Warm Oak Herringbone/Plank - Images 3, 4, 5) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[62, 54]} />
        <meshStandardMaterial color={OFFICE_PALETTE.woodFloor} roughness={0.32} metalness={0.15} />
      </mesh>

      {/* Charcoal Acoustic Carpet Pathway Runner (Image 1) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]} receiveShadow>
        <planeGeometry args={[26, 42]} />
        <meshStandardMaterial color={OFFICE_PALETTE.carpetPath} roughness={0.8} />
      </mesh>

      {/* Architectural perimeter floor edging */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.008, 0]}>
        <ringGeometry args={[13.2, 13.35, 48]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* 2. REAR ARCHITECTURAL FEATURE WALL WITH 3D "CYBER TEAM" SIGNAGE */}
      <group position={[0, 6, -20.2]}>
        {/* Deep Slate Architectural Feature Wall (Image 3) */}
        <mesh receiveShadow>
          <boxGeometry args={[62, 12, 0.4]} />
          <meshStandardMaterial color={OFFICE_PALETTE.featureWall} roughness={0.4} />
        </mesh>

        {/* Warm Timber Acoustic Slats (Images 1, 2) */}
        {[-24, -20, -16, 16, 20, 24].map((x) => (
          <mesh key={x} position={[x, 0, 0.22]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 11.6, 0.08]} />
            <meshStandardMaterial color={OFFICE_PALETTE.acousticTimber} roughness={0.35} />
          </mesh>
        ))}

        {/* PROMINENT 3D "CYBER TEAM" HEADQUARTERS EMBLEM & SIGNAGE */}
        <group position={[0, 4.2, 0.26]}>
          <Text
            fontSize={1.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.12}
            outlineWidth={0.04}
            outlineColor="#0f172a"
          >
            CYBER TEAM
          </Text>
          <Text
            position={[0, -0.9, 0]}
            fontSize={0.45}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.2}
          >
            SECURITY OPERATIONS CENTER & THREAT INTEL HQ
          </Text>
        </group>
      </group>

      {/* 3. EXECUTIVE WAR ROOM / CONFERENCE BOARDROOM (Images 2 & 4) */}
      <group position={[18, 0, -12]}>
        {/* Glass Wall Partition with Black Framing */}
        <mesh position={[0, 4, 0]}>
          <boxGeometry args={[0.08, 8, 14]} />
          <meshPhysicalMaterial
            color={OFFICE_PALETTE.glassDivider}
            transmission={0.92}
            opacity={0.3}
            transparent
            roughness={0.05}
          />
        </mesh>
        {/* Conference Table (Image 4) */}
        <mesh position={[-3.5, 0.84, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.1, 8.4]} />
          <meshStandardMaterial color={OFFICE_PALETTE.acousticTimber} roughness={0.3} />
        </mesh>
        {/* Conference Chairs */}
        {[-2.5, -0.8, 0.8, 2.5].map((z) => (
          <mesh key={z} position={[-2.2, 0.6, z]} castShadow>
            <boxGeometry args={[0.6, 0.8, 0.6]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* 4. FLOOR-TO-CEILING PANORAMIC CITY SKYLINE WINDOWS (Images 3, 4, 5) */}
      <group position={[-28.8, 6, 0]}>
        {/* Wall Frame */}
        <mesh receiveShadow>
          <boxGeometry args={[0.4, 12, 54]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        {/* Luminous City Skyline Backdrop Panel */}
        <mesh position={[0.22, 0, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[52, 10]} />
          <meshBasicMaterial color="#e0f2fe" toneMapped={false} />
        </mesh>
        {/* Black Industrial Window Mullions */}
        {[-20, -10, 0, 10, 20].map((z) => (
          <mesh key={z} position={[0.24, 0, z]}>
            <boxGeometry args={[0.06, 11, 0.12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        ))}
      </group>

      {/* Right Wall: Matching Panoramic Windows with City Skyline (Mirror of Left Wall) */}
      <group position={[28.8, 6, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.4, 12, 54]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        <mesh position={[-0.22, 0, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[52, 10]} />
          <meshBasicMaterial color="#e0f2fe" toneMapped={false} />
        </mesh>
        {[-20, -10, 0, 10, 20].map((z) => (
          <mesh key={z} position={[-0.24, 0, z]}>
            <boxGeometry args={[0.06, 11, 0.12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        ))}
      </group>

      {/* 5. TROPICAL PLANTERS & FIDDLE-LEAF FIG TREES (Images 1 & 5) */}
      {[
        [-11.5, 0, -14],
        [11.5, 0, -14],
        [-11.5, 0, 14],
        [11.5, 0, 14],
        [-24, 0, -6],
        [-24, 0, 8],
      ].map(([x, y, z], idx) => (
        <group key={idx} position={[x as number, y as number, z as number]}>
          {/* Matte Black Cylindrical Planter Pot */}
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.45, 0.38, 0.9, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </mesh>
          {/* Lush Green Tropical Foliage */}
          <mesh position={[0, 1.25, 0]} castShadow>
            <sphereGeometry args={[0.65, 8, 8]} />
            <meshStandardMaterial color="#166534" roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.85, 0]} castShadow>
            <sphereGeometry args={[0.48, 8, 8]} />
            <meshStandardMaterial color="#22c55e" roughness={0.35} />
          </mesh>
        </group>
      ))}

      {/* 6. DISCRETE MODERN ARCHITECTURAL RECESSED CEILING LIGHTS */}
      <ArchitecturalCeilingLighting />

      {/* 7. MAIN SOC VIDEO WALL (Cyber Team Threat Intel Dashboard) */}
      <group position={[0, 6.2, -19.5]}>
        <mesh position={[0, 0, -0.2]} castShadow>
          <boxGeometry args={[26, 6.5, 0.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
        {/* Main Central Screen */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[14.2, 5.6]} />
          <meshStandardMaterial
            color={activeAlerts > 0 ? "#450a0a" : "#022c22"}
            emissive={activeAlerts > 0 ? "#ef4444" : "#10b981"}
            emissiveIntensity={activeAlerts > 0 ? 0.9 : 0.45}
            roughness={0.1}
          />
        </mesh>
        <Text
          position={[0, 1.9, 0.1]}
          fontSize={0.46}
          color={activeAlerts > 0 ? "#ef4444" : "#10b981"}
          anchorX="center"
        >
          {activeAlerts > 0
            ? `🚨 CYBER TEAM ALERT: ${activeAlerts} ACTIVE THREAT INFECTIONS 🚨`
            : "CYBER TEAM · GLOBAL SOC PERIMETER SECURE"}
        </Text>
        <Text position={[0, 1.1, 0.1]} fontSize={0.28} color="#ffffff" anchorX="center">
          👈 Left: 360° Rotate & Zoom In/Out · 👉 Right: Point to Aim & Pinch to Scan · 👁️ Blink to
          Isolate
        </Text>

        {/* Side Screen: Datacenter Server Telemetry */}
        <group position={[-8.5, 0, 0]}>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[5.8, 5.6]} />
            <meshStandardMaterial color="#041e30" emissive="#0284c7" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[-2.4, 2.1, 0.1]} fontSize={0.26} color="#38bdf8" anchorX="left">
            DATACENTER VAULT
          </Text>
          <Text position={[-2.4, 1.5, 0.1]} fontSize={0.2} color="#94a3b8" anchorX="left">
            42U Blade Racks 1-4 Online
          </Text>
        </group>

        {/* Side Screen: NOC Telecom Telemetry */}
        <group position={[8.5, 0, 0]}>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[5.8, 5.6]} />
            <meshStandardMaterial color="#041e30" emissive="#00e5ff" emissiveIntensity={0.5} />
          </mesh>
          <Text position={[-2.4, 2.1, 0.1]} fontSize={0.26} color="#00e5ff" anchorX="left">
            TELECOM & WIFI NOC
          </Text>
          <Text position={[-2.4, 1.5, 0.1]} fontSize={0.2} color="#94a3b8" anchorX="left">
            10 Gbps SFP+ Fiber Active
          </Text>
        </group>
      </group>
    </group>
  );
}

// -------------------------------------------------------------------------
// INTERACTIVE NETWORK DEVICE COMPONENT (Desks, Servers, Routers)
// -------------------------------------------------------------------------
function InteractiveDevice({ index }: { index: number }) {
  const def = NETWORK.nodes[index];
  const node = useGame((s) => s.nodes[index]);
  const selected = useGame((s) => s.selected === index);
  const phase = useGame((s) => s.phase);

  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const threatHolo = useRef<THREE.Group>(null);

  const color = node ? statusColor(node) : OFFICE_PALETTE.screenClean;

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
      {def.kind === "server" ? (
        <CyberTeamServerCabinet accent={color} />
      ) : def.kind === "router" ? (
        <CyberTeamRouterConsole accent={color} />
      ) : (
        <CyberTeamWorkstation accent={color} />
      )}

      {/* Target Selection Floor Ring */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.3, 1.52, 36]} />
        <meshBasicMaterial
          color={selected ? OFFICE_PALETTE.selectedGold : color}
          transparent
          opacity={selected ? 0.95 : 0.45}
          toneMapped={false}
        />
      </mesh>

      {/* Floating Threat Indicator */}
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
        </group>
      )}

      {/* Floating Label */}
      <Text
        position={[0, def.kind === "server" ? 4.1 : 2.6, 0]}
        fontSize={0.36}
        color={selected ? OFFICE_PALETTE.selectedGold : "#ffffff"}
        anchorX="center"
        outlineWidth={0.03}
        outlineColor="#0f172a"
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

// -------------------------------------------------------------------------
// LASER DATA LINK WITH TRAVELING DATA PACKETS
// -------------------------------------------------------------------------
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

// -------------------------------------------------------------------------
// STABLE, SILKY-SMOOTH CAMERA CONTROLLER
// -------------------------------------------------------------------------
interface OrbitControlsRef {
  getDistance: () => number;
  dollyIn: (scale: number) => void;
  dollyOut: (scale: number) => void;
  setAzimuthalAngle: (angle: number) => void;
  setPolarAngle: (angle: number) => void;
  getAzimuthalAngle: () => number;
  update: () => void;
}

function CameraController() {
  const orbitRef = useRef<OrbitControlsRef | null>(null);
  const cameraDistance = useGame((s) => s.cameraDistance);
  const cameraAzimuth = useGame((s) => s.cameraAzimuth);
  const cameraPolar = useGame((s) => s.cameraPolar);

  const prevDistRef = useRef(cameraDistance);
  const isFirstMount = useRef(true);

  // Smooth zoom synchronization
  useFrame(() => {
    if (orbitRef.current && prevDistRef.current !== cameraDistance) {
      try {
        const currentDist = orbitRef.current.getDistance();
        if (currentDist > 0.01) {
          const delta = cameraDistance - currentDist;
          if (Math.abs(delta) > 0.1) {
            if (delta < 0) orbitRef.current.dollyIn(1.04);
            else orbitRef.current.dollyOut(1.04);
            orbitRef.current.update();
          } else {
            prevDistRef.current = cameraDistance;
          }
        }
      } catch {
        // Safe fallback
      }
    }
  });

  // Smooth orbit synchronization
  useFrame(() => {
    if (orbitRef.current) {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        orbitRef.current.setAzimuthalAngle(cameraAzimuth);
        orbitRef.current.setPolarAngle(cameraPolar);
        orbitRef.current.update();
        return;
      }

      try {
        const curAz = orbitRef.current.getAzimuthalAngle();
        const diffAz = cameraAzimuth - curAz;
        if (Math.abs(diffAz) > 0.01) {
          orbitRef.current.setAzimuthalAngle(curAz + diffAz * 0.15);
          orbitRef.current.update();
        }
      } catch {
        // Safe fallback
      }
    }
  });

  return (
    <OrbitControls
      ref={orbitRef}
      enablePan={false}
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={45}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 1.2, 0]}
    />
  );
}

// -------------------------------------------------------------------------
// MAIN GAME SCENE (Big Realistic Office: CYBER TEAM)
// -------------------------------------------------------------------------
export function GameScene() {
  const activeAlerts = useGame((s) => s.nodes.filter((n) => n.status === "infected").length);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 13, 22], fov: 44, near: 0.1, far: 500 }}
      onPointerMissed={() => useGame.getState().select(null)}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[OFFICE_PALETTE.roomBg]} />

      {/* Clean, high-performance office daylight illumination */}
      <ambientLight intensity={1.4} color="#ffffff" />
      <hemisphereLight args={["#ffffff", "#94a3b8", 1.2]} />
      <directionalLight
        position={[16, 25, 20]}
        intensity={2.6}
        color={activeAlerts > 0 ? "#fca5a5" : "#ffffff"}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-16, 18, -12]} intensity={1.2} color="#bfdbfe" />

      {/* Downward Floodlights for Workstation Pods */}
      <pointLight position={[-4, 7.5, 0]} intensity={16} distance={18} color="#ffffff" />
      <pointLight position={[4, 7.5, 0]} intensity={16} distance={18} color="#ffffff" />

      <CyberTeamOfficeArchitecture />

      {/* Laser network communication links */}
      {NETWORK.links.map(([a, b]) => (
        <CyberNetworkLink key={`${a}-${b}`} a={a} b={b} />
      ))}

      {/* Interactive 3D Nodes (Desks with PCs, Servers, Routers) */}
      {NETWORK.nodes.map((node) => (
        <InteractiveDevice key={node.id} index={node.id} />
      ))}

      <MissionLoop />
      <CameraController />
    </Canvas>
  );
}
