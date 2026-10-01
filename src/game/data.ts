export type NodeKind = "server" | "computer" | "router";
export type ThreatType = "malware" | "phishing" | "exfiltration" | "ransomware" | "botnet";

export interface NetNode {
  id: number;
  kind: NodeKind;
  label: string;
  sublabel: string;
  department: string;
  ip: string;
  pos: [number, number, number];
}

export interface ThreatInfo {
  name: string;
  family: string;
  color: string;
  growth: number;
  tip: string;
  cve: string;
  mitreTechnique: string;
  severity: "CRITICAL" | "HIGH" | "ELEVATED";
  cvssScore: number;
  payloadType: string;
  liveActivities: string[];
  affectedEntity: {
    systemName: string;
    department: string;
    affectedUser: string;
    ipAddress: string;
    openPorts: number[];
    criticalAssets: string;
    blastRadius: string;
  };
}

export const THREATS: Record<ThreatType, ThreatInfo> = {
  malware: {
    name: "Worm.Glitchbyte (Wiper / Rootkit)",
    family: "HermeticWiper / Stuxnet v4 Derivative",
    color: "#ee315f",
    growth: 0.032,
    tip: "Malware is malicious software designed to compromise or destroy data. Isolate the infected host immediately to stop lateral network infection.",
    cve: "CVE-2024-21413 (SmartScreen RCE) / CVE-2023-38831",
    mitreTechnique: "T1059.001 (PowerShell Execution) · T1562.001 (Disable Antivirus)",
    severity: "CRITICAL",
    cvssScore: 9.8,
    payloadType: "Memory-Resident Reflective DLL & Kernel Driver Tamper",
    liveActivities: [
      "Injecting malicious unhooked DLL into lsass.exe and winlogon.exe memory",
      "Harvesting plaintext Kerberos tickets from LSASS credential manager",
      "Scanning internal subnet across port 445 (SMB) & 3389 (RDP) for lateral spread",
      "Executing 'vssadmin delete shadows /all /quiet' to prevent restore point recovery",
    ],
    affectedEntity: {
      systemName: "SRV-01 Core Database Primary",
      department: "Enterprise Data Center · Vault 1",
      affectedUser: "sysadmin_svc / Principal Database Architect",
      ipAddress: "10.20.10.14",
      openPorts: [445, 139, 3389, 5432, 8443],
      criticalAssets: "Corporate Customer PII & Financial Ledger Tables (18.4 TB)",
      blastRadius: "Catastrophic — 16 adjacent subnet nodes vulnerable to pass-the-hash",
    },
  },
  phishing: {
    name: "Lure.FakeInvoice (Spearphishing Loader)",
    family: "Emotet / QakBot Modular Trojan",
    color: "#f0a929",
    growth: 0.024,
    tip: "Phishing deceives employees into running malicious payloads. Quarantine the client workstation and revoke active SSO session tokens.",
    cve: "CVE-2023-36884 (Office HTML / Word Remote Code Execution)",
    mitreTechnique: "T1566.001 (Spearphishing Attachment) · T1204 (User Execution)",
    severity: "HIGH",
    cvssScore: 8.9,
    payloadType: "Obfuscated VBA Macro Dropper & Cobalt Strike Beacon",
    liveActivities: [
      "Outlook received weaponized 'Q3_Vendor_Audit_Invoice_9021.docm' attachment",
      "PowerShell spawned hidden background process with base64 encoded payload",
      "Establishing encrypted outbound beaconing to C2 server at 185.220.101.45:443",
      "Dumping Google Chrome & Edge vault passwords and active OAuth2 access tokens",
    ],
    affectedEntity: {
      systemName: "WS-02 Corporate Accounting Terminal",
      department: "Global Finance & Accounts Payable",
      affectedUser: "sarah.finance@corp.internal (Senior Financial Controller)",
      ipAddress: "10.20.12.33",
      openPorts: [80, 443, 8080],
      criticalAssets: "SWIFT Banking Clearance Portal & Executive Expense Accounts",
      blastRadius: "High — Potential compromise of corporate banking credentials",
    },
  },
  exfiltration: {
    name: "Leak.NightOwl (Stealth Data Exfiltrator)",
    family: "BlackCat / APT29 Egress Exfil Utility",
    color: "#bd72e8",
    growth: 0.028,
    tip: "Data exfiltration transmits sensitive trade secrets outside the organization. Sever network adapters and drop egress DNS tunnels.",
    cve: "CVE-2024-1709 (Authentication Bypass) / CVE-2023-46805",
    mitreTechnique: "T1041 (Exfiltration Over C2) · T1071.004 (DNS Tunneling)",
    severity: "CRITICAL",
    cvssScore: 9.4,
    payloadType: "Chunky 7-Zip Encrypted Stager & Base64 DNS Egress Tunnel",
    liveActivities: [
      "Compressing confidential Git source code repositories and proprietary schematics",
      "Splitting archives into 512KB slices and routing over covert port 53 DNS queries",
      "Exfiltrating 4.8 GB of proprietary autonomous AI models and defense contracts",
      "Zeroing out Windows security event logs to bypass SIEM correlation alerts",
    ],
    affectedEntity: {
      systemName: "WS-04 Quantum R&D Workstation",
      department: "Deep Technology Research & Patent Lab",
      affectedUser: "dr.vance@corp.internal (Chief Research Scientist)",
      ipAddress: "10.20.14.78",
      openPorts: [22, 53, 443, 9000],
      criticalAssets: "Proprietary Next-Gen Neural Weights & Classified Architecture Specs",
      blastRadius: "Severe — Irreversible loss of corporate intellectual property",
    },
  },
  ransomware: {
    name: "Lock.CryptoMoth (AES-256 Ransomware)",
    family: "LockBit 3.0 / BlackBasta Double Extortion",
    color: "#ef6937",
    growth: 0.038,
    tip: "Ransomware irreversibly locks business files. Immediate network isolation is the only way to prevent widespread enterprise paralysis.",
    cve: "CVE-2024-3400 (PAN-OS OS Command Injection) / CVE-2023-22515",
    mitreTechnique: "T1486 (Data Encrypted for Impact) · T1490 (Inhibit System Recovery)",
    severity: "CRITICAL",
    cvssScore: 9.9,
    payloadType: "Multi-Threaded AES-256-GCM / RSA-4096 Hybrid Encryptor",
    liveActivities: [
      "Rapidly encrypting file extensions: .sql, .docx, .vmdk, .psd, .xlsx at 1.4 GB/sec",
      "Writing 'README_RESTORE_DECRYPT.txt' ransom demand on all public desktop shares",
      "Forcefully terminating endpoint protection services: Defender, CrowdStrike, Sentinel",
      "Attempting to overwrite Master Boot Record (MBR) on next scheduled reboot",
    ],
    affectedEntity: {
      systemName: "SRV-02 Central SAN Storage Node",
      department: "Enterprise Storage & Archive SAN",
      affectedUser: "storage_admin / Infrastructure Controller",
      ipAddress: "10.20.10.88",
      openPorts: [111, 445, 2049, 3260],
      criticalAssets: "128 Terabytes of Operational Backups & Live Virtual Machines",
      blastRadius: "Catastrophic — Complete operational shutdown if lateral encryption finishes",
    },
  },
  botnet: {
    name: "Swarm.Hivemind (Distributed C2 Zombie)",
    family: "Mirai / Mozi IoT Weaponized Drone",
    color: "#51d99b",
    growth: 0.026,
    tip: "Botnets hijack internet-connected hardware for DDoS and proxying. Block egress C2 addresses and isolate infected hardware controllers.",
    cve: "CVE-2023-28771 (IKE Packet Remote Code Execution) / CVE-2023-1389",
    mitreTechnique: "T1584.005 (Compromise Botnet Infrastructure) · T1498 (Network DoS)",
    severity: "HIGH",
    cvssScore: 8.6,
    payloadType: "SYN Flood / UDP Reflection Weaponized Stager & Darknet Relay",
    liveActivities: [
      "Coordinating 250,000 PPS SYN flood attack against upstream financial clearing house",
      "Scanning adjacent office IoT controllers and smart lighting for default credentials",
      "P2P peer synchronization over encrypted DHT swarm to receive updated targets",
      "Routing darknet proxy traffic through the corporate DMZ egress fiber trunk",
    ],
    affectedEntity: {
      systemName: "RTR-01 Perimeter Firewall & Gateway",
      department: "Perimeter Network Defense & Gateway",
      affectedUser: "edge_daemon / Gateway Controller",
      ipAddress: "10.20.10.1",
      openPorts: [23, 80, 443, 500, 4500, 8080],
      criticalAssets: "Corporate Perimeter BGP Routing Tables & Site-to-Site IPsec VPN",
      blastRadius: "High — Enterprise internet saturation and global IP blacklisting",
    },
  },
};

export const CAMPAIGN: ThreatType[] = [
  "phishing",
  "malware",
  "botnet",
  "exfiltration",
  "ransomware",
];
export const TOTAL_THREATS = CAMPAIGN.length;
export const OPENING_DELAY = 5;
export const WAVE_DELAY = 8;

function buildNetwork() {
  const nodes: NetNode[] = [];
  const links: [number, number][] = [];

  // =========================================================================
  // 1. DEDICATED DATABASE & SERVER ROOM (LEFT WING DATACENTER VAULT)
  // Not beside computers - organized in their own secure server room!
  // =========================================================================
  const servers = [
    {
      id: 0,
      kind: "server" as NodeKind,
      label: "SRV-01",
      sublabel: "Core SQL Database",
      department: "Datacenter Vault",
      ip: "10.20.10.14",
      pos: [-15.5, 0, -6] as [number, number, number],
    },
    {
      id: 1,
      kind: "server" as NodeKind,
      label: "SRV-02",
      sublabel: "SAN Storage Cluster",
      department: "Datacenter Vault",
      ip: "10.20.10.88",
      pos: [-15.5, 0, -1.8] as [number, number, number],
    },
    {
      id: 2,
      kind: "server" as NodeKind,
      label: "SRV-03",
      sublabel: "Active Directory IAM",
      department: "Datacenter Vault",
      ip: "10.20.10.22",
      pos: [-15.5, 0, 2.4] as [number, number, number],
    },
    {
      id: 3,
      kind: "server" as NodeKind,
      label: "SRV-04",
      sublabel: "SIEM Threat Collector",
      department: "Datacenter Vault",
      ip: "10.20.10.50",
      pos: [-15.5, 0, 6.6] as [number, number, number],
    },
  ];

  // =========================================================================
  // 2. DEDICATED WIFI & NETWORK NOC BAY (RIGHT WING COMMUNICATIONS TOWER)
  // Not beside computers - organized in their own telecommunications wing!
  // =========================================================================
  const routers = [
    {
      id: 4,
      kind: "router" as NodeKind,
      label: "RTR-01",
      sublabel: "Enterprise Gateway",
      department: "NOC Network Bay",
      ip: "10.20.10.1",
      pos: [15.5, 0, -6] as [number, number, number],
    },
    {
      id: 5,
      kind: "router" as NodeKind,
      label: "WIFI-01",
      sublabel: "WiFi 7 Mesh AP-North",
      department: "NOC Network Bay",
      ip: "10.20.10.2",
      pos: [15.5, 0, -1.8] as [number, number, number],
    },
    {
      id: 6,
      kind: "router" as NodeKind,
      label: "RTR-02",
      sublabel: "Fiber Distribution",
      department: "NOC Network Bay",
      ip: "10.20.10.3",
      pos: [15.5, 0, 2.4] as [number, number, number],
    },
    {
      id: 7,
      kind: "router" as NodeKind,
      label: "WIFI-02",
      sublabel: "WiFi 7 Mesh AP-South",
      department: "NOC Network Bay",
      ip: "10.20.10.4",
      pos: [15.5, 0, 6.6] as [number, number, number],
    },
  ];

  // =========================================================================
  // 3. ENTERPRISE ANALYST WORKSTATION PODS (CENTER OPEN-OFFICE FLOOR)
  // Organized in clear workstation rows facing the SOC command screen!
  // =========================================================================
  const workstations = [
    {
      id: 8,
      kind: "computer" as NodeKind,
      label: "WS-01",
      sublabel: "Incident Commander",
      department: "SOC Floor",
      ip: "10.20.12.10",
      pos: [-5.5, 0, -2.5] as [number, number, number],
    },
    {
      id: 9,
      kind: "computer" as NodeKind,
      label: "WS-02",
      sublabel: "Finance Terminal",
      department: "Accounts Payable",
      ip: "10.20.12.33",
      pos: [5.5, 0, -2.5] as [number, number, number],
    },
    {
      id: 10,
      kind: "computer" as NodeKind,
      label: "WS-03",
      sublabel: "Threat Hunting Console",
      department: "SOC Floor",
      ip: "10.20.14.19",
      pos: [-5.5, 0, 2.8] as [number, number, number],
    },
    {
      id: 11,
      kind: "computer" as NodeKind,
      label: "WS-04",
      sublabel: "Quantum R&D Station",
      department: "R&D Lab",
      ip: "10.20.14.78",
      pos: [5.5, 0, 2.8] as [number, number, number],
    },
    {
      id: 12,
      kind: "computer" as NodeKind,
      label: "WS-05",
      sublabel: "Cloud Security Console",
      department: "DevOps",
      ip: "10.20.14.44",
      pos: [-5.5, 0, 8.0] as [number, number, number],
    },
    {
      id: 13,
      kind: "computer" as NodeKind,
      label: "WS-06",
      sublabel: "Executive Terminal",
      department: "Executive Suite",
      ip: "10.20.12.80",
      pos: [5.5, 0, 8.0] as [number, number, number],
    },
    {
      id: 14,
      kind: "computer" as NodeKind,
      label: "WS-07",
      sublabel: "HR & Identity Terminal",
      department: "Human Resources",
      ip: "10.20.12.55",
      pos: [0, 0, 0] as [number, number, number],
    },
    {
      id: 15,
      kind: "computer" as NodeKind,
      label: "WS-08",
      sublabel: "SIEM Analytics Station",
      department: "SOC Operations",
      ip: "10.20.14.92",
      pos: [0, 0, 5.5] as [number, number, number],
    },
  ];

  nodes.push(...servers, ...routers, ...workstations);

  // Network Topology Links (Connecting Datacenter, NOC, and Workstations)
  links.push(
    // Datacenter Backbone links
    [0, 1],
    [1, 2],
    [2, 3],
    // NOC Gateway & WiFi mesh links
    [4, 5],
    [5, 6],
    [6, 7],
    // High-speed cross-datacenter to gateway links
    [0, 4],
    [3, 7],
    // Datacenter to core workstation pods
    [0, 8],
    [1, 10],
    [2, 12],
    [1, 14],
    // WiFi and NOC to workstation pods
    [4, 9],
    [5, 11],
    [6, 13],
    [5, 15],
    // Inter-workstation collaboration links
    [8, 14],
    [9, 14],
    [10, 15],
    [11, 15],
    [14, 15],
    [8, 9],
  );

  const neighbors: number[][] = nodes.map(() => []);
  links.forEach(([a, b]) => {
    const first = neighbors[a];
    const second = neighbors[b];
    if (!first || !second) return;
    first.push(b);
    second.push(a);
  });

  return { nodes, links, neighbors };
}

export const NETWORK = buildNetwork();

export const RANKS = [
  { min: 0, name: "Trainee Analyst" },
  { min: 1200, name: "SOC Analyst I" },
  { min: 2600, name: "SOC Analyst II" },
  { min: 4200, name: "Threat Hunter" },
  { min: 6200, name: "Incident Commander" },
  { min: 9000, name: "Chief Information Security Officer" },
];

export function rankFor(score: number) {
  let rank = "Trainee Analyst";
  for (const candidate of RANKS) if (score >= candidate.min) rank = candidate.name;
  return rank;
}
