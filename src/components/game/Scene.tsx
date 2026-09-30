import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Grid, Lightformer, Line, OrbitControls, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { NETWORK, THREATS } from "@/game/data";
import { useGame, type NodeState } from "@/game/store";

const COLORS = { clean: "#55cfe1", isolated: "#68798a", selected: "#ffd36b", shell: "#18242d", screen: "#123e49", floor: "#243137", wall: "#39494d", wood: "#765f47", chair: "#263136" };

function statusColor(node: NodeState) {
  if (node.status === "isolated") return COLORS.isolated;
  if (node.status === "infected" && node.threat) return THREATS[node.threat].color;
  return COLORS.clean;
}

function MissionLoop() {
  useFrame((_, rawDelta) => useGame.getState().tick(Math.min(rawDelta, 0.05)));
  return null;
}

function ServerRack({ accent = COLORS.clean }: { accent?: string }) {
  return <group>
    <RoundedBox args={[1.3, 2.5, 1.05]} radius={0.08} smoothness={2} position={[0, 1.25, 0]} castShadow receiveShadow><meshStandardMaterial color={COLORS.shell} metalness={0.72} roughness={0.3}/></RoundedBox>
    {Array.from({ length: 7 }, (_, index) => <group key={index} position={[0, 0.42 + index * 0.27, 0.535]}><mesh><boxGeometry args={[1.08, 0.19, 0.035]}/><meshStandardMaterial color="#25343c" metalness={0.5} roughness={0.36}/></mesh><mesh position={[-0.39, 0, 0.025]}><boxGeometry args={[0.06, 0.045, 0.02]}/><meshBasicMaterial color={accent} toneMapped={false}/></mesh><mesh position={[-0.28, 0, 0.025]}><boxGeometry args={[0.035, 0.035, 0.02]}/><meshBasicMaterial color="#89c26e" toneMapped={false}/></mesh></group>)}
    <mesh position={[0, 2.56, 0]}><boxGeometry args={[1.15, 0.06, 0.9]}/><meshStandardMaterial color="#506068" metalness={0.8}/></mesh>
  </group>;
}

function Workstation({ accent = COLORS.clean }: { accent?: string }) {
  return <group><mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.9, 0.12, 0.85]}/><meshStandardMaterial color={COLORS.wood} roughness={0.72}/></mesh>{[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.34, 0]} castShadow><boxGeometry args={[0.08, 0.7, 0.72]}/><meshStandardMaterial color="#27343a" metalness={0.4}/></mesh>)}<group position={[0, 1.28, -0.1]}><mesh castShadow><boxGeometry args={[1.25, 0.74, 0.08]}/><meshStandardMaterial color="#172229" metalness={0.5}/></mesh><mesh position={[0, 0, 0.046]}><planeGeometry args={[1.1, 0.59]}/><meshStandardMaterial color={COLORS.screen} emissive={accent} emissiveIntensity={0.4}/></mesh><mesh position={[0, -0.49, -0.05]}><boxGeometry args={[0.08, 0.28, 0.08]}/><meshStandardMaterial color="#29363c"/></mesh></group><mesh position={[0, 0.81, 0.2]} rotation-x={-0.08}><boxGeometry args={[0.78, 0.035, 0.25]}/><meshStandardMaterial color="#222c31"/></mesh></group>;
}

function Router({ accent = COLORS.clean }: { accent?: string }) {
  return <group><RoundedBox args={[1.35, 0.32, 0.9]} radius={0.08} smoothness={2} position={[0, 0.18, 0]} castShadow><meshStandardMaterial color={COLORS.shell} metalness={0.55} roughness={0.38}/></RoundedBox>{[-0.38, 0, 0.38].map((x) => <mesh key={x} position={[x, 0.36, -0.28]}><cylinderGeometry args={[0.025, 0.025, 0.75, 8]}/><meshStandardMaterial color="#67757b"/></mesh>)}<mesh position={[0, 0.355, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.28, 0.36, 24]}/><meshBasicMaterial color={accent} toneMapped={false}/></mesh></group>;
}

function OfficeChair({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return <group position={position} rotation-y={rotation}><RoundedBox args={[0.85, 0.12, 0.78]} radius={0.08} smoothness={2} position={[0, 0.68, 0]} castShadow><meshStandardMaterial color={COLORS.chair} roughness={0.72}/></RoundedBox><RoundedBox args={[0.88, 1.05, 0.13]} radius={0.08} smoothness={2} position={[0, 1.18, 0.36]} rotation-x={-0.12} castShadow><meshStandardMaterial color={COLORS.chair} roughness={0.72}/></RoundedBox><mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.06, 0.08, 0.62, 10]}/><meshStandardMaterial color="#516067" metalness={0.7}/></mesh><mesh position={[0, 0.06, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.38, 0.38, 0.06, 5]}/><meshStandardMaterial color="#263136"/></mesh></group>;
}

function OfficeShell() {
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[34, 30]}/><meshStandardMaterial color={COLORS.floor} roughness={0.68} metalness={0.1}/></mesh>
    <Grid position={[0, 0.008, 0]} args={[34, 30]} cellSize={1} cellColor="#31444a" sectionSize={5} sectionColor="#4c686e" fadeDistance={36}/>
    <mesh position={[0, 4.2, -14.6]} receiveShadow><boxGeometry args={[34, 8.4, 0.25]}/><meshStandardMaterial color={COLORS.wall} roughness={0.82}/></mesh>
    <mesh position={[-16.8, 4.2, 0]} receiveShadow><boxGeometry args={[0.25, 8.4, 29]}/><meshStandardMaterial color="#334246" roughness={0.82}/></mesh>
    <mesh position={[16.8, 4.2, 0]} receiveShadow><boxGeometry args={[0.25, 8.4, 29]}/><meshStandardMaterial color="#334246" roughness={0.82}/></mesh>
    {[-9, 0, 9].map((x) => <group key={x} position={[x, 4.5, -14.42]}><mesh><boxGeometry args={[7.3, 2.6, 0.08]}/><meshStandardMaterial color="#182e36" emissive="#1b7180" emissiveIntensity={0.25} roughness={0.18}/></mesh><mesh position={[0, 0, 0.05]}><planeGeometry args={[6.9, 2.2]}/><meshBasicMaterial color="#22505b" transparent opacity={0.55}/></mesh></group>)}
    {[-10, 0, 10].map((x) => <group key={x} position={[x, 7.3, -1]}><mesh rotation-x={Math.PI / 2}><planeGeometry args={[5.5, 1.5]}/><meshStandardMaterial color="#dbe7d8" emissive="#dbe7d8" emissiveIntensity={1.4}/></mesh><pointLight position={[0, -1.8, 0]} intensity={20} distance={11} color="#dbe7d8"/></group>)}
    <group position={[-13.8, 0, -10.8]} rotation-y={0.35}><ServerRack accent="#54d4e8"/></group><group position={[-11.9, 0, -10.8]} rotation-y={0.35}><ServerRack accent="#77d59c"/></group><group position={[-10, 0, -10.8]} rotation-y={0.35}><ServerRack accent="#e8b75b"/></group>
    <OfficeChair position={[-5.5, 0, 10.5]} rotation={Math.PI}/><OfficeChair position={[0, 0, 11]} rotation={Math.PI}/><OfficeChair position={[5.5, 0, 10.5]} rotation={Math.PI}/>
    <group position={[0, 0, 12.4]}><mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[13, 0.14, 1.3]}/><meshStandardMaterial color={COLORS.wood}/></mesh>{[-5.8, -2, 2, 5.8].map((x) => <mesh key={x} position={[x, 0.36, 0]}><boxGeometry args={[0.1, 0.72, 1.05]}/><meshStandardMaterial color="#27343a"/></mesh>)}</group>
    <Text position={[-14.2, 6.8, -14.2]} rotation-y={0.25} fontSize={0.42} color="#75d5df" anchorX="left">SECURITY OPERATIONS / NIGHT SHIFT</Text>
  </group>;
}

function Device({ index }: { index: number }) {
  const def = NETWORK.nodes[index];
  const node = useGame((s) => s.nodes[index]);
  const selected = useGame((s) => s.selected === index);
  const phase = useGame((s) => s.phase);
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const color = node ? statusColor(node) : COLORS.clean;
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (group.current) group.current.position.y = node?.status === "infected" ? Math.sin(time * 5 + index) * 0.04 : 0;
    if (ring.current) { ring.current.rotation.z = time * 0.45; const scale = selected ? 1.35 : 1 + (node?.status === "infected" ? Math.sin(time * 4) * 0.08 : 0); ring.current.scale.setScalar(scale); }
  });
  if (!def || !node) return null;
  return <group position={def.pos} ref={group} onClick={(event) => { if (phase !== "playing") return; event.stopPropagation(); useGame.getState().select(index); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = ""; }}>
    {def.kind === "server" ? <ServerRack accent={color}/> : def.kind === "router" ? <Router accent={color}/> : <Workstation accent={color}/>} 
    <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}><ringGeometry args={[0.92, 1.03, 32]}/><meshBasicMaterial color={selected ? COLORS.selected : color} transparent opacity={selected ? 0.95 : 0.52} toneMapped={false}/></mesh>
    {node.status === "infected" && <group position={[0, def.kind === "server" ? 3.05 : 2.25, 0]}><mesh><sphereGeometry args={[0.18 + node.infection * 0.2, 14, 10]}/><meshBasicMaterial color={color} toneMapped={false}/></mesh><pointLight intensity={4} distance={3} color={color}/></group>}
    <Text position={[0, def.kind === "server" ? 2.95 : 2.05, 0]} fontSize={0.3} color={selected ? COLORS.selected : "#d2e2e5"} anchorX="center">{def.label}{node.status === "infected" && node.investigated && node.threat ? `\n${THREATS[node.threat].name}` : ""}</Text>
  </group>;
}

function NetworkLink({ a, b }: { a: number; b: number }) {
  const first = useGame((s) => s.nodes[a]);
  const second = useGame((s) => s.nodes[b]);
  const firewall = useGame((s) => s.firewallFor > 0);
  const startNode = NETWORK.nodes[a];
  const endNode = NETWORK.nodes[b];
  if (!first || !second || !startNode || !endNode) return null;
  const start = startNode.pos;
  const end = endNode.pos;
  const compromised = first.status === "infected" ? first : second.status === "infected" ? second : null;
  const offline = first.status === "isolated" || second.status === "isolated";
  const color = offline ? "#4f5c65" : compromised?.threat ? THREATS[compromised.threat].color : firewall ? "#66d99d" : "#4ba1ad";
  return <Line points={[[start[0], 0.035, start[2]], [end[0], 0.035, end[2]]]} color={color} lineWidth={compromised ? 2.2 : 1.1} transparent opacity={offline ? 0.25 : 0.7}/>;
}

function FirewallField() {
  const active = useGame((s) => s.firewallFor > 0);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (mesh.current) mesh.current.rotation.y = clock.elapsedTime * 0.16; });
  if (!active) return null;
  return <mesh ref={mesh} position={[0, 0.1, 1]}><cylinderGeometry args={[14, 14, 0.08, 48, 1, true]}/><meshBasicMaterial color="#61daa0" wireframe transparent opacity={0.42}/></mesh>;
}

export function GameScene() {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 18, 25], fov: 48 }} onPointerMissed={() => useGame.getState().select(null)} gl={{ antialias: true }}>
    <color attach="background" args={["#0f1c22"]}/><fog attach="fog" args={["#0f1c22", 26, 55]}/><ambientLight intensity={0.55}/><hemisphereLight args={["#b8d9dd", "#26353a", 0.75]}/><directionalLight position={[10, 16, 8]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18}/>
    <Environment resolution={64}><Lightformer intensity={2.6} color="#dbe7df" position={[0, 8, 2]} rotation-x={Math.PI / 2} scale={[20, 18, 1]}/><Lightformer intensity={1.2} color="#62b9c5" position={[-12, 4, -4]} rotation-y={Math.PI / 2} scale={[15, 3, 1]}/></Environment>
    <OfficeShell/>
    {NETWORK.links.map(([a, b]) => <NetworkLink key={`${a}-${b}`} a={a} b={b}/>)}
    <Suspense fallback={null}>{NETWORK.nodes.map((node) => <Device key={node.id} index={node.id}/>)}</Suspense>
    <FirewallField/><MissionLoop/>
    <OrbitControls enablePan={false} minDistance={18} maxDistance={31} minPolarAngle={0.62} maxPolarAngle={1.13} minAzimuthAngle={-0.65} maxAzimuthAngle={0.65} target={[0, 1.5, 1]}/>
  </Canvas>;
}
