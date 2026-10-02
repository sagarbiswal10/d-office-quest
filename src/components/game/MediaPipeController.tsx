import "@/lib/client-error-filter";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  GripHorizontal,
  Maximize2,
  Minimize2,
  MonitorPlay,
  RotateCw,
  Sparkles,
  Zap,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
} from "lucide-react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { NETWORK, getActiveNodeIds } from "@/game/data";
import { useGame } from "@/game/store";
import { sfx } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Minimum consecutive frames before gestures trigger actions to prevent jitter
const MIN_TRACK_FRAMES = 5;

export function MediaPipeController() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActiveState] = useState(false);
  const [virtualCam, setVirtualCam] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Real-time HUD gesture badge
  const [currentGestureBadge, setCurrentGestureBadge] = useState<string>(
    "👈 Left: 'V' Zoom In / 'W' Zoom Out · 👉 Right: 'V' Isolate / Pinch Investigate",
  );
  const [rightHandStatus, setRightHandStatus] = useState<string>("Ready: Searching for Hands...");
  const [leftHandStatus, setLeftHandStatus] = useState<string>("Left Hand Ready");
  const [activeGestureTags, setActiveGestureTags] = useState<{ left?: string; right?: string }>({});

  // Draggable Box State
  const [boxPos, setBoxPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== "undefined") {
      return { x: 24, y: Math.max(70, window.innerHeight - 440) };
    }
    return { x: 24, y: 300 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const virtualAnimRef = useRef<number | null>(null);

  // Tracking stability counters
  const leftTrackFramesRef = useRef<number>(0);
  const rightTrackFramesRef = useRef<number>(0);

  // Left hand memory (360 orbit + V zoom in + W zoom out)
  const prevLeftHandPosRef = useRef<{ x: number; y: number } | null>(null);
  const leftVCountRef = useRef<number>(0);
  const leftWCountRef = useRef<number>(0);

  // Right hand memory (V isolate + pinch investigate)
  const rightVCountRef = useRef<number>(0);
  const rightPinchHoldFramesRef = useRef<number>(0);
  const rightPinchArmedRef = useRef<boolean>(true);

  // Action cooldowns
  const lastActionTimeRef = useRef<{
    isolate: number;
    investigate: number;
    zoom: number;
    dismiss: number;
    firewall: number;
  }>({
    isolate: 0,
    investigate: 0,
    zoom: 0,
    dismiss: 0,
    firewall: 0,
  });

  const lastHandTimeRef = useRef<number>(0);

  // GSAP-style smoothed crosshair coordinates
  const smoothCrosshair = useRef<{ x: number; y: number }>({
    x: typeof window !== "undefined" ? window.innerWidth * 0.5 : 500,
    y: typeof window !== "undefined" ? window.innerHeight * 0.5 : 300,
  });

  const investigate = useGame((s) => s.investigate);
  const isolate = useGame((s) => s.isolate);
  const firewall = useGame((s) => s.firewall);
  const adjustZoom = useGame((s) => s.adjustZoom);
  const adjustOrbit = useGame((s) => s.adjustOrbit);
  const setActiveGesture = useGame((s) => s.setActiveGesture);

  const showGesture = useCallback(
    (text: string) => {
      setCurrentGestureBadge(text);
      setActiveGesture(text);
    },
    [setActiveGesture],
  );

  // Draggable handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - boxPos.x,
      y: e.clientY - boxPos.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const maxX = Math.max(0, window.innerWidth - 330);
    const maxY = Math.max(0, window.innerHeight - 80);
    setBoxPos({
      x: Math.max(8, Math.min(maxX, e.clientX - dragOffsetRef.current.x)),
      y: Math.max(8, Math.min(maxY, e.clientY - dragOffsetRef.current.y)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        const { FilesetResolver, HandLandmarker: HandLandmarkerClass } =
          await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
        );

        if (!isMounted) return;

        let handLm: HandLandmarker | null = null;
        try {
          handLm = await HandLandmarkerClass.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        } catch {
          handLm = await HandLandmarkerClass.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.55,
            minHandPresenceConfidence: 0.55,
            minTrackingConfidence: 0.55,
          });
        }

        if (!isMounted) return;
        handLandmarkerRef.current = handLm;
      } catch (err: unknown) {
        console.warn("HandLandmarker setup status:", err);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
    };
  }, []);

  // WebCam Stream Start
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    setVirtualCam(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access not supported in this browser");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActiveState(true);
            showGesture(
              "👈 Left: 'V' Zoom In / 'W' Zoom Out · 👉 Right: 'V' Isolate / Pinch Investigate",
            );
          });
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn("Webcam status:", errMsg);
      setCameraError(
        errMsg.includes("Permission") || errMsg.includes("denied")
          ? "Camera permission denied. Enable camera access in your browser bar."
          : "Webcam unavailable. Click 'Virtual AI Sensor' below to test.",
      );
      setCameraActiveState(false);
    }
  }, [showGesture]);

  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActiveState(false);
    setVirtualCam(false);
    leftTrackFramesRef.current = 0;
    rightTrackFramesRef.current = 0;
    showGesture("Camera Inactive");
  }, [showGesture]);

  const toggleCamera = () => {
    if (cameraActive) {
      stopCameraStream();
    } else {
      startCameraStream();
    }
  };

  // Automatically activate webcam when entering the futuristic SOC ("Start Mission")
  const phase = useGame((s) => s.phase);
  useEffect(() => {
    if (phase === "playing" && !cameraActive && !cameraError && !virtualCam) {
      startCameraStream();
    }
  }, [phase, cameraActive, cameraError, virtualCam, startCameraStream]);

  // Virtual AI Sensor Simulation
  useEffect(() => {
    if (!virtualCam || cameraActive) {
      if (virtualAnimRef.current) cancelAnimationFrame(virtualAnimRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let simTick = 0;
    const renderVirtual = () => {
      simTick += 0.035;
      ctx.fillStyle = "#030712";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Left Hand: Toggles between 'V' (Zoom In) and 'W' (Zoom Out)
      const leftX = canvas.width * 0.25;
      const leftY = canvas.height * 0.55;
      const isLeftV = Math.sin(simTick * 0.7) > 0;

      if (isLeftV) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(leftX - 8, leftY + 16);
        ctx.lineTo(leftX - 12, leftY - 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(leftX + 8, leftY + 16);
        ctx.lineTo(leftX + 12, leftY - 24);
        ctx.stroke();

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 9px monospace";
        ctx.fillText("✌️ LEFT: 'V' SIGN", leftX - 40, leftY + 34);
        ctx.fillText("[ZOOM IN 🔍+]", leftX - 35, leftY - 28);
      } else {
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 3;
        [-14, 0, 14].forEach((dx) => {
          ctx.beginPath();
          ctx.moveTo(leftX + dx * 0.7, leftY + 16);
          ctx.lineTo(leftX + dx, leftY - 24);
          ctx.stroke();
        });

        ctx.fillStyle = "#d8b4fe";
        ctx.font = "bold 9px monospace";
        ctx.fillText("🖖 LEFT: 'W' SIGN", leftX - 40, leftY + 34);
        ctx.fillText("[ZOOM OUT 🔍-]", leftX - 35, leftY - 28);
      }

      // Right Hand: Toggles between 'V' (Isolate) and Pinch (Investigate)
      const rightX = canvas.width * 0.75;
      const rightY = canvas.height * 0.55;
      const isRightV = Math.sin(simTick * 0.8) > 0;

      if (isRightV) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rightX - 8, rightY + 16);
        ctx.lineTo(rightX - 12, rightY - 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightX + 8, rightY + 16);
        ctx.lineTo(rightX + 12, rightY - 24);
        ctx.stroke();

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 10px monospace";
        ctx.fillText("✌️ RIGHT: 'V' SIGN", rightX - 45, rightY + 36);
        ctx.fillText("[ISOLATE TRIGGER]", rightX - 40, rightY - 30);
      } else {
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(rightX, rightY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "bold 9px monospace";
        ctx.fillText("👉 RIGHT: PINCH", rightX - 42, rightY + 22);
        ctx.fillText("[INVESTIGATE DOSSIER]", rightX - 45, rightY - 14);
      }

      ctx.fillStyle = "#38bdf8";
      ctx.font = "10px monospace";
      ctx.fillText(
        "VIRTUAL SENSOR · 👈 LEFT: V(ZOOM IN)/W(ZOOM OUT) · 👉 RIGHT: V(ISOLATE)/PINCH",
        8,
        18,
      );

      virtualAnimRef.current = requestAnimationFrame(renderVirtual);
    };

    virtualAnimRef.current = requestAnimationFrame(renderVirtual);
    return () => {
      if (virtualAnimRef.current) cancelAnimationFrame(virtualAnimRef.current);
    };
  }, [virtualCam, cameraActive]);

  // Main Live Detection Loop
  // RULES:
  // 1. LEFT HAND:
  //    - 'V' sign -> Zoom In
  //    - 'W' sign -> Zoom Out
  //    - Horizontal movement -> 360° Orbit Pan
  // 2. RIGHT HAND:
  //    - 'V' sign -> Isolate
  //    - Pinch -> Investigate
  //    - Pointing -> Aim Crosshair
  useEffect(() => {
    if (!cameraActive) return;

    let lastVideoTime = -1;
    let lastInferenceTime = 0;

    const detect = (timestamp: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2 && timestamp - lastInferenceTime >= 30) {
        lastInferenceTime = timestamp;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const currentTime = video.currentTime;
          const now = performance.now();

          if (currentTime !== lastVideoTime && handLandmarkerRef.current) {
            lastVideoTime = currentTime;

            try {
              const handTimestamp = Math.max(lastHandTimeRef.current + 1, Math.round(now));
              lastHandTimeRef.current = handTimestamp;

              const handResults = handLandmarkerRef.current.detectForVideo(video, handTimestamp);
              let detectedLeftHand = false;
              let detectedRightHand = false;

              let currentLeftTag: string | undefined;
              let currentRightTag: string | undefined;

              if (handResults.landmarks && handResults.landmarks.length > 0) {
                handResults.landmarks.forEach((landmarks, handIdx) => {
                  if (!landmarks || landmarks.length < 21) return;

                  // Wrist and palm scale check
                  const wrist = landmarks[0]!;
                  const middleMcp = landmarks[9]!;
                  const palmScale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);

                  if (palmScale < 0.05 || palmScale > 0.65) return;

                  const handednessObj = handResults.handedness?.[handIdx]?.[0];
                  const reportedCategory = handednessObj?.categoryName;
                  const mirrorWristX = 1 - wrist.x;

                  // Mirrored left/right classification (user's Left Hand is on the left side of mirrored screen)
                  const isLeftHand =
                    reportedCategory === "Left" ||
                    (reportedCategory !== "Right" && mirrorWristX < 0.48);

                  const thumb = landmarks[4]!;
                  const index = landmarks[8]!;
                  const middle = landmarks[12]!;
                  const ring = landmarks[16]!;
                  const pinky = landmarks[20]!;

                  // Measure normalized distance between thumb and fingers
                  const rawThumbIndexDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
                  const rawThumbMiddleDist = Math.hypot(thumb.x - middle.x, thumb.y - middle.y);
                  const normThumbIndexDist = rawThumbIndexDist / palmScale;
                  const normThumbMiddleDist = rawThumbMiddleDist / palmScale;

                  // Draw Hand Skeleton
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = isLeftHand ? "#c084fc" : "#00e5ff";
                  ctx.fillStyle = isLeftHand ? "#d8b4fe" : "#38bdf8";

                  landmarks.forEach((pt) => {
                    const x = (1 - pt.x) * canvas.width;
                    const y = pt.y * canvas.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                  });

                  // FINGER EXTENSION / FOLD TESTS (Scale-Invariant)
                  const distWristToIndexTip = Math.hypot(index.x - wrist.x, index.y - wrist.y);
                  const distWristToIndexPip = Math.hypot(
                    landmarks[6]!.x - wrist.x,
                    landmarks[6]!.y - wrist.y,
                  );
                  const indexExtended = distWristToIndexTip > distWristToIndexPip * 1.2;

                  const distWristToMiddleTip = Math.hypot(middle.x - wrist.x, middle.y - wrist.y);
                  const distWristToMiddlePip = Math.hypot(
                    landmarks[10]!.x - wrist.x,
                    landmarks[10]!.y - wrist.y,
                  );
                  const middleExtended = distWristToMiddleTip > distWristToMiddlePip * 1.2;

                  const distWristToRingTip = Math.hypot(ring.x - wrist.x, ring.y - wrist.y);
                  const distWristToRingPip = Math.hypot(
                    landmarks[14]!.x - wrist.x,
                    landmarks[14]!.y - wrist.y,
                  );
                  const ringExtended = distWristToRingTip > distWristToRingPip * 1.2;
                  const ringFolded = distWristToRingTip < distWristToRingPip * 1.2;

                  const distWristToPinkyTip = Math.hypot(pinky.x - wrist.x, pinky.y - wrist.y);
                  const distWristToPinkyPip = Math.hypot(
                    landmarks[18]!.x - wrist.x,
                    landmarks[18]!.y - wrist.y,
                  );
                  const pinkyFolded = distWristToPinkyTip < distWristToPinkyPip * 1.2;
                  const pinkyExtended = distWristToPinkyTip > distWristToPinkyPip * 1.15;

                  // Thumb extension vs fold test (Scale-Invariant)
                  const thumbDistToPalm = Math.hypot(
                    thumb.x - landmarks[9]!.x,
                    thumb.y - landmarks[9]!.y,
                  );
                  const thumbDistToIndexMcp = Math.hypot(
                    thumb.x - landmarks[5]!.x,
                    thumb.y - landmarks[5]!.y,
                  );
                  const isThumbExtended =
                    thumbDistToPalm > palmScale * 0.58 && thumbDistToIndexMcp > palmScale * 0.52;
                  const isThumbTucked = !isThumbExtended;

                  // V-Sign condition: Index & Middle extended, Ring & Pinky folded
                  const isVSign = indexExtended && middleExtended && ringFolded && pinkyFolded;

                  // W-Sign condition: Index & Middle & Ring extended, Pinky folded
                  const isWSign = indexExtended && middleExtended && ringExtended && pinkyFolded;

                  // Strict 4-Fingers condition: Index, Middle, Ring, Pinky extended, AND THUMB IS TUCKED IN (Not 5 fingers!)
                  const isFourFingers =
                    indexExtended &&
                    middleExtended &&
                    ringExtended &&
                    pinkyExtended &&
                    isThumbTucked;

                  // 5-Fingers condition: All 5 fingers extended (Open hand)
                  const isFiveFingers =
                    indexExtended &&
                    middleExtended &&
                    ringExtended &&
                    pinkyExtended &&
                    isThumbExtended;

                  const isInvestigating = useGame.getState().investigationModalOpen;

                  // =========================================================================
                  // 1. LEFT HAND:
                  // RULE A: 'V' SIGN -> ZOOM IN
                  // RULE B: 'W' SIGN -> ZOOM OUT
                  // RULE C: Horizontal Pan -> 360° Orbit
                  // NOTE: Background camera is completely locked while investigating box is active
                  // =========================================================================
                  if (isLeftHand) {
                    detectedLeftHand = true;
                    leftTrackFramesRef.current++;

                    const mirrorIndexX = (1 - index.x) * canvas.width;
                    const indexY = index.y * canvas.height;

                    // 5-FINGER OPEN PALM -> ACTIVATE EMERGENCY ZERO-TRUST FIREWALL SHIELD
                    if (isFiveFingers) {
                      leftVCountRef.current = 0;
                      leftWCountRef.current = 0;

                      ctx.strokeStyle = "#00e5ff";
                      ctx.lineWidth = 3;
                      ctx.strokeRect(mirrorIndexX - 45, indexY - 25, 95, 30);

                      ctx.fillStyle = "#00e5ff";
                      ctx.font = "bold 11px monospace";
                      ctx.fillText("🖐️ PALM [FIREWALL]", mirrorIndexX - 40, indexY - 6);

                      currentLeftTag = "5 FINGERS (FIREWALL)";
                      setLeftHandStatus("🖐️ 5 FINGERS: FIREWALL SHIELD ACTIVATING");

                      if (now - lastActionTimeRef.current.firewall > 1200) {
                        lastActionTimeRef.current.firewall = now;
                        const ok = firewall();
                        if (ok) {
                          showGesture(
                            "🛡️ 5-FINGER PALM: EMERGENCY FIREWALL SHIELD ACTIVE (THREATS FROZEN!)",
                          );
                        }
                      }
                      return;
                    }

                    if (isInvestigating) {
                      setLeftHandStatus("Investigating · Background Camera Paused");
                      currentLeftTag = "PAUSED";
                      return; // Completely pause background 3D camera while in investigation box!
                    }

                    if (leftTrackFramesRef.current < MIN_TRACK_FRAMES) {
                      setLeftHandStatus("Stabilizing...");
                      return;
                    }

                    // A. LEFT 'V' SIGN -> ZOOM IN
                    if (isVSign) {
                      leftVCountRef.current++;
                      leftWCountRef.current = 0;

                      // Highlight V-sign on left hand
                      ctx.strokeStyle = "#22c55e";
                      ctx.lineWidth = 3;
                      const mirrorMiddleX = (1 - middle.x) * canvas.width;
                      const middleY = middle.y * canvas.height;
                      ctx.beginPath();
                      ctx.moveTo(mirrorIndexX, indexY);
                      ctx.lineTo(mirrorMiddleX, middleY);
                      ctx.stroke();

                      ctx.fillStyle = "#22c55e";
                      ctx.font = "bold 11px monospace";
                      ctx.fillText("✌️ 'V' [ZOOM IN]", mirrorIndexX - 35, indexY - 18);

                      currentLeftTag = "V (ZOOM IN)";
                      setLeftHandStatus("✌️ 'V' ZOOMING IN");

                      // Smoothly zoom in every frame while held
                      adjustZoom(-0.4);
                      showGesture("👈 LEFT HAND: 'V' SIGN · ZOOMING IN 🔍+");
                    }
                    // B. LEFT 'W' SIGN -> ZOOM OUT
                    else if (isWSign) {
                      leftWCountRef.current++;
                      leftVCountRef.current = 0;

                      // Highlight W-sign on left hand
                      ctx.strokeStyle = "#c084fc";
                      ctx.lineWidth = 3;
                      const mirrorMiddleX = (1 - middle.x) * canvas.width;
                      const middleY = middle.y * canvas.height;
                      const mirrorRingX = (1 - ring.x) * canvas.width;
                      const ringY = ring.y * canvas.height;

                      ctx.beginPath();
                      ctx.moveTo(mirrorIndexX, indexY);
                      ctx.lineTo(mirrorMiddleX, middleY);
                      ctx.lineTo(mirrorRingX, ringY);
                      ctx.stroke();

                      ctx.fillStyle = "#c084fc";
                      ctx.font = "bold 11px monospace";
                      ctx.fillText("🖖 'W' [ZOOM OUT]", mirrorIndexX - 35, indexY - 18);

                      currentLeftTag = "W (ZOOM OUT)";
                      setLeftHandStatus("🖖 'W' ZOOMING OUT");

                      // Smoothly zoom out every frame while held
                      adjustZoom(0.4);
                      showGesture("👈 LEFT HAND: 'W' SIGN · ZOOMING OUT 🔍-");
                    } else {
                      leftVCountRef.current = 0;
                      leftWCountRef.current = 0;
                      setLeftHandStatus("Left Hand Active (Show V to Zoom In, W to Zoom Out)");
                    }

                    // C. 360° ORBIT (Left hand horizontal movement)
                    const curX = mirrorWristX;
                    const prevPos = prevLeftHandPosRef.current;
                    if (prevPos !== null) {
                      const deltaX = curX - prevPos.x;
                      if (Math.abs(deltaX) > 0.012) {
                        adjustOrbit(deltaX * 3.5, 0);
                      }
                    }
                    prevLeftHandPosRef.current = { x: curX, y: wrist.y };
                  }

                  // =========================================================================
                  // 2. RIGHT HAND:
                  // RULE A: 'V' SIGN -> ISOLATE
                  // RULE B: PINCH -> INVESTIGATE
                  // RULE C: POINT -> AIM CROSSHAIR
                  // =========================================================================
                  if (!isLeftHand) {
                    detectedRightHand = true;
                    rightTrackFramesRef.current++;

                    const mirrorIndexX = (1 - index.x) * canvas.width;
                    const indexY = index.y * canvas.height;

                    if (rightTrackFramesRef.current < MIN_TRACK_FRAMES) {
                      setRightHandStatus("Stabilizing...");
                      return;
                    }

                    // WHILE IN INVESTIGATION: Camera & background controls are locked; gestures operate EXCLUSIVELY on the box!
                    if (isInvestigating) {
                      // Hide background 3D pointer
                      if (useGame.getState().pointingCrosshair?.active) {
                        useGame.getState().setPointingCrosshair(null);
                      }

                      // 1. Right 'V' Sign -> Isolate the host in the box
                      if (isVSign) {
                        rightVCountRef.current++;
                        ctx.strokeStyle = "#22c55e";
                        ctx.lineWidth = 3;
                        const mirrorMiddleX = (1 - middle.x) * canvas.width;
                        const middleY = middle.y * canvas.height;

                        ctx.beginPath();
                        ctx.moveTo(mirrorIndexX, indexY);
                        ctx.lineTo(mirrorMiddleX, middleY);
                        ctx.stroke();

                        ctx.fillStyle = "#22c55e";
                        ctx.font = "bold 11px monospace";
                        ctx.fillText("✌️ 'V' [ISOLATE]", mirrorIndexX - 35, indexY - 20);

                        currentRightTag = "V (ISOLATE)";
                        setRightHandStatus("✌️ 'V' SIGN: ISOLATING HOST");

                        if (
                          rightVCountRef.current >= 2 &&
                          now - lastActionTimeRef.current.isolate > 1100
                        ) {
                          lastActionTimeRef.current.isolate = now;
                          const target = useGame.getState().activeInvestigationNodeId;
                          const ok = isolate(target !== null ? target : undefined);
                          if (ok) {
                            showGesture("✌️ RIGHT HAND: ISOLATED HOST IN BOX!");
                            sfx.blinkIsolate();
                          }
                        }
                      }
                      // 2. Strict 4-Fingers (Thumb Tucked, 4 Fingers Extended) -> Dismiss box
                      else if (isFourFingers && !isFiveFingers && !isVSign) {
                        rightVCountRef.current = 0;
                        ctx.strokeStyle = "#38bdf8";
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(mirrorIndexX - 45, indexY - 25, 95, 30);

                        ctx.fillStyle = "#38bdf8";
                        ctx.font = "bold 11px monospace";
                        ctx.fillText("🖐️ 4 FINGERS [DISMISS]", mirrorIndexX - 40, indexY - 6);

                        currentRightTag = "4 FINGERS (DISMISS)";
                        setRightHandStatus("🖐️ 4 FINGERS: DISMISSING BOX");

                        if (now - lastActionTimeRef.current.dismiss > 600) {
                          lastActionTimeRef.current.dismiss = now;
                          useGame.getState().closeInvestigationModal();
                          showGesture("🖐️ 4 RIGHT FINGERS: DISMISSED INVESTIGATION BOX");
                          sfx.select();
                        }
                      }
                      // If 5 fingers are shown (open palm with thumb out), trigger Emergency Firewall!
                      else if (isFiveFingers) {
                        rightVCountRef.current = 0;
                        ctx.strokeStyle = "#00e5ff";
                        ctx.lineWidth = 3;
                        ctx.strokeRect(mirrorIndexX - 45, indexY - 25, 95, 30);

                        ctx.fillStyle = "#00e5ff";
                        ctx.font = "bold 11px monospace";
                        ctx.fillText("🖐️ PALM [FIREWALL]", mirrorIndexX - 40, indexY - 6);

                        currentRightTag = "5 FINGERS (FIREWALL)";
                        setRightHandStatus("🖐️ 5 FINGERS: FIREWALL SHIELD ACTIVATING");

                        if (now - lastActionTimeRef.current.firewall > 1200) {
                          lastActionTimeRef.current.firewall = now;
                          const ok = firewall();
                          if (ok) {
                            showGesture(
                              "🛡️ 5-FINGER PALM: EMERGENCY FIREWALL SHIELD ACTIVE (THREATS FROZEN!)",
                            );
                          }
                        }
                      } else {
                        rightVCountRef.current = 0;
                        setRightHandStatus(
                          "Investigating: Show 'V' to Isolate · 4 Fingers (Thumb In) to Dismiss",
                        );
                      }
                      return;
                    }

                    // A. RIGHT 'V' SIGN -> ISOLATE
                    if (isVSign) {
                      rightVCountRef.current++;
                      rightPinchHoldFramesRef.current = 0;

                      ctx.strokeStyle = "#22c55e";
                      ctx.lineWidth = 3;
                      const mirrorMiddleX = (1 - middle.x) * canvas.width;
                      const middleY = middle.y * canvas.height;

                      ctx.beginPath();
                      ctx.moveTo(mirrorIndexX, indexY);
                      ctx.lineTo(mirrorMiddleX, middleY);
                      ctx.stroke();

                      ctx.fillStyle = "#22c55e";
                      ctx.font = "bold 11px monospace";
                      ctx.fillText("✌️ 'V' [ISOLATE]", mirrorIndexX - 35, indexY - 20);

                      currentRightTag = "V (ISOLATE)";
                      setRightHandStatus("✌️ 'V' SIGN: ISOLATING HOST");

                      // Trigger isolate with cooldown
                      if (
                        rightVCountRef.current >= 2 &&
                        now - lastActionTimeRef.current.isolate > 1100
                      ) {
                        lastActionTimeRef.current.isolate = now;
                        const currentSelected = useGame.getState().selected;
                        const ok = isolate(currentSelected !== null ? currentSelected : undefined);
                        if (ok) {
                          showGesture("✌️ RIGHT HAND: 'V' SIGN · ISOLATED COMPROMISED HOST!");
                          sfx.blinkIsolate();
                        } else {
                          showGesture("Host already clean or safe.");
                        }
                      }
                    } else {
                      rightVCountRef.current = 0;
                    }

                    // CLEAR GESTURE DISCRIMINATION:
                    // 1. POINTING: Index extended forward, other fingers folded, thumb away from index tip
                    const isPointing =
                      !isVSign && indexExtended && !middleExtended && rawThumbIndexDist > 0.055;

                    // 2. PINCHING: Thumb tip and index tip touch together closely, NOT pointing outward
                    const isPinched =
                      !isVSign &&
                      !isPointing &&
                      rawThumbIndexDist < 0.052 &&
                      normThumbIndexDist < 0.32;

                    // B. POINT TO AIM & SELECT DEVICES (Silky Smooth Circular Reticle)
                    if (isPointing) {
                      rightPinchHoldFramesRef.current = 0; // Strict reset: Never pinch while pointing

                      setRightHandStatus("👉 Pointing: Aiming Reticle");
                      ctx.font = "bold 10px monospace";
                      ctx.fillStyle = "#00e5ff";
                      ctx.fillText("👉 POINTING", mirrorIndexX - 25, indexY - 14);

                      // Clean circle reticle on video
                      ctx.strokeStyle = "#00e5ff";
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.arc(mirrorIndexX, indexY, 12, 0, Math.PI * 2);
                      ctx.stroke();

                      const targetX = (1 - index.x) * window.innerWidth;
                      const targetY = index.y * window.innerHeight;

                      // Silky smooth dampening filter (eliminates webcam hand tremor)
                      const smoothFactor = 0.22;
                      smoothCrosshair.current.x +=
                        (targetX - smoothCrosshair.current.x) * smoothFactor;
                      smoothCrosshair.current.y +=
                        (targetY - smoothCrosshair.current.y) * smoothFactor;

                      const curX = smoothCrosshair.current.x;
                      const curY = smoothCrosshair.current.y;

                      const nodeScreenCoords = useGame.getState().nodeScreenCoords;
                      const missionProgress = useGame.getState().missionProgress;
                      const activeIds = getActiveNodeIds(missionProgress);
                      const currentSelected = useGame.getState().selected;

                      let bestNodeId =
                        currentSelected !== null && activeIds.includes(currentSelected)
                          ? currentSelected
                          : (activeIds[0] ?? 0);
                      let bestDist = 999999;

                      // Dynamic exact screen projection from Three.js camera
                      for (const id of activeIds) {
                        const screenPos = nodeScreenCoords[id];
                        if (screenPos) {
                          const d = Math.hypot(curX - screenPos.x, curY - screenPos.y);
                          if (d < bestDist) {
                            bestDist = d;
                            bestNodeId = id;
                          }
                        }
                      }

                      // Fallback if projection not yet initialized on first tick
                      if (bestDist === 999999) {
                        const normX = curX / window.innerWidth;
                        const normY = curY / window.innerHeight;
                        const screenAnchors: Record<number, { x: number; y: number }> = {
                          0: { x: 0.24, y: 0.42 },
                          1: { x: 0.24, y: 0.58 },
                          2: { x: 0.24, y: 0.72 },
                          3: { x: 0.24, y: 0.86 },
                          4: { x: 0.5, y: 0.32 },
                          5: { x: 0.6, y: 0.32 },
                          6: { x: 0.4, y: 0.32 },
                          8: { x: 0.45, y: 0.62 },
                          9: { x: 0.72, y: 0.62 },
                          10: { x: 0.45, y: 0.8 },
                          11: { x: 0.72, y: 0.8 },
                        };
                        for (const id of activeIds) {
                          const anchor = screenAnchors[id] || { x: 0.5, y: 0.5 };
                          const d = Math.hypot(normX - anchor.x, normY - anchor.y);
                          if (d < bestDist) {
                            bestDist = d;
                            bestNodeId = id;
                          }
                        }
                      }

                      const pointedNode = NETWORK.nodes[bestNodeId];
                      if (pointedNode) {
                        useGame.getState().select(pointedNode.id);
                        useGame.getState().setPointingCrosshair({
                          x: curX,
                          y: curY,
                          active: true,
                          label: pointedNode.label,
                        });
                      }
                      currentRightTag = "POINTING";
                    }

                    // C. RIGHT PINCH -> SCAN / INVESTIGATE (Only when thumb & index deliberately touch)
                    else if (isPinched) {
                      rightPinchHoldFramesRef.current++;

                      // Draw solid golden pinch reticle on video
                      ctx.strokeStyle = "#f59e0b";
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.arc(mirrorIndexX, indexY, 11, 0, Math.PI * 2);
                      ctx.stroke();
                      ctx.fillStyle = "#f59e0b";
                      ctx.beginPath();
                      ctx.arc(mirrorIndexX, indexY, 4, 0, Math.PI * 2);
                      ctx.fill();

                      ctx.font = "bold 11px monospace";
                      ctx.fillStyle = "#f59e0b";
                      ctx.fillText("PINCH [SCAN]", mirrorIndexX - 35, indexY - 16);

                      currentRightTag = "PINCH (SCAN)";
                      setRightHandStatus("👉 PINCH: SCANNING COMPONENT");

                      // Trigger investigate ONLY after holding pinch for at least 3 frames
                      if (
                        rightPinchHoldFramesRef.current >= 3 &&
                        now - lastActionTimeRef.current.investigate > 800
                      ) {
                        lastActionTimeRef.current.investigate = now;
                        let target = useGame.getState().selected;
                        if (target === null && useGame.getState().pointingCrosshair?.active) {
                          const found = NETWORK.nodes.findIndex(
                            (n) => n.label === useGame.getState().pointingCrosshair?.label,
                          );
                          if (found >= 0) target = found;
                        }

                        if (target !== null) {
                          const ok = investigate(target);
                          if (ok) {
                            showGesture(`👉 PINCH SCAN: ${NETWORK.nodes[target]?.label ?? "HOST"}`);
                            sfx.gesture();
                          }
                        } else {
                          showGesture("👉 Point at a device to target, then pinch to scan.");
                        }
                      }
                    }

                    // D. 4 RIGHT FINGERS -> DISMISS / CLOSE INVESTIGATING BOX (Thumb must be tucked!)
                    else if (isFourFingers && !isFiveFingers && !isVSign && !isWSign) {
                      rightPinchHoldFramesRef.current = 0;
                      rightVCountRef.current = 0;

                      ctx.strokeStyle = "#38bdf8";
                      ctx.lineWidth = 2.5;
                      ctx.strokeRect(mirrorIndexX - 45, indexY - 25, 95, 30);

                      ctx.fillStyle = "#38bdf8";
                      ctx.font = "bold 11px monospace";
                      ctx.fillText("🖐️ 4 FINGERS [DISMISS]", mirrorIndexX - 40, indexY - 6);

                      currentRightTag = "4 FINGERS (DISMISS)";
                      setRightHandStatus("🖐️ 4 FINGERS: DISMISSING BOX");

                      if (now - lastActionTimeRef.current.dismiss > 600) {
                        lastActionTimeRef.current.dismiss = now;
                        if (useGame.getState().investigationModalOpen) {
                          useGame.getState().closeInvestigationModal();
                          showGesture("🖐️ 4 RIGHT FINGERS: DISMISSED INVESTIGATION BOX");
                          sfx.select();
                        }
                      }
                    }

                    // E. RIGHT 5 FINGERS (OPEN PALM) -> ACTIVATE EMERGENCY ZERO-TRUST FIREWALL SHIELD
                    else if (isFiveFingers) {
                      rightPinchHoldFramesRef.current = 0;
                      rightVCountRef.current = 0;

                      ctx.strokeStyle = "#00e5ff";
                      ctx.lineWidth = 3;
                      ctx.strokeRect(mirrorIndexX - 45, indexY - 25, 95, 30);

                      ctx.fillStyle = "#00e5ff";
                      ctx.font = "bold 11px monospace";
                      ctx.fillText("🖐️ PALM [FIREWALL]", mirrorIndexX - 40, indexY - 6);

                      currentRightTag = "5 FINGERS (FIREWALL)";
                      setRightHandStatus("🖐️ 5 FINGERS: FIREWALL SHIELD ACTIVATING");

                      if (now - lastActionTimeRef.current.firewall > 1200) {
                        lastActionTimeRef.current.firewall = now;
                        const ok = firewall();
                        if (ok) {
                          showGesture(
                            "🛡️ 5-FINGER PALM: EMERGENCY FIREWALL SHIELD ACTIVE (THREATS FROZEN!)",
                          );
                        }
                      }
                    } else {
                      rightPinchHoldFramesRef.current = 0;
                    }
                  }
                });

                setActiveGestureTags({ left: currentLeftTag, right: currentRightTag });

                if (!detectedLeftHand) {
                  leftTrackFramesRef.current = 0;
                  prevLeftHandPosRef.current = null;
                  leftVCountRef.current = 0;
                  leftWCountRef.current = 0;
                  setLeftHandStatus("Left Hand Idle");
                }

                if (!detectedRightHand) {
                  rightTrackFramesRef.current = 0;
                  rightVCountRef.current = 0;
                  rightPinchHoldFramesRef.current = 0;
                  setRightHandStatus("Right Hand Idle");
                  if (useGame.getState().pointingCrosshair?.active) {
                    useGame.getState().setPointingCrosshair(null);
                  }
                }
              } else {
                leftTrackFramesRef.current = 0;
                rightTrackFramesRef.current = 0;
                prevLeftHandPosRef.current = null;
                setActiveGestureTags({});
                setLeftHandStatus("Searching for Hands...");
                setRightHandStatus("Searching for Hands...");
                if (useGame.getState().pointingCrosshair?.active) {
                  useGame.getState().setPointingCrosshair(null);
                }
              }
            } catch {
              // Ignore transient detection frame issues
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive, adjustOrbit, adjustZoom, investigate, isolate, firewall, showGesture]);

  return (
    <div
      style={{ left: `${boxPos.x}px`, top: `${boxPos.y}px` }}
      className="fixed z-30 flex flex-col font-mono text-xs select-none touch-none"
    >
      <div className="panel pointer-events-auto overflow-hidden rounded-md border border-cyan-500/50 bg-card/95 shadow-2xl w-[290px] sm:w-[330px]">
        {/* Draggable Top Header Bar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex items-center justify-between border-b border-border/70 bg-secondary/90 px-3 py-1.5 text-[11px] cursor-grab active:cursor-grabbing hover:bg-secondary transition-colors"
          title="Drag this camera sensor window anywhere on screen"
        >
          <div className="flex items-center gap-1.5 font-bold uppercase text-primary">
            <GripHorizontal className="size-3.5 text-muted-foreground" />
            {cameraActive ? (
              <CheckCircle2 className="size-3.5 text-success animate-pulse" />
            ) : virtualCam ? (
              <MonitorPlay className="size-3.5 text-accent" />
            ) : (
              <Camera className="size-3.5 text-primary" />
            )}
            <span>
              {cameraActive
                ? "LIVE AI VISION"
                : virtualCam
                  ? "VIRTUAL AI SENSOR"
                  : "CAMERA GESTURES"}
            </span>
          </div>

          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMinimized(!minimized)}
              className="rounded p-1 text-muted-foreground hover:text-foreground"
              title={minimized ? "Expand" : "Minimize"}
            >
              {minimized ? <Maximize2 className="size-3" /> : <Minimize2 className="size-3" />}
            </button>
            <Button
              variant={cameraActive ? "destructive" : "default"}
              size="sm"
              className="h-6 px-2 text-[10px] gap-1 shadow-sm font-bold uppercase"
              onClick={toggleCamera}
            >
              {cameraActive ? (
                <>
                  <CameraOff className="size-3" />
                  <span>Stop Cam</span>
                </>
              ) : (
                <>
                  <Camera className="size-3" />
                  <span>Start Cam</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Live Detected Gesture Feedback */}
        <div className="border-b border-border/40 bg-black/70 px-3 py-1.5 text-[10px] font-bold text-accent truncate flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="size-3.5 text-warning animate-pulse shrink-0" />
            <span className="truncate">{currentGestureBadge}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {activeGestureTags.left && (
              <span className="bg-purple-500/25 text-purple-300 border border-purple-500/50 px-1 py-0.2 rounded text-[9px] font-mono">
                {activeGestureTags.left}
              </span>
            )}
            {activeGestureTags.right && (
              <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 px-1 py-0.2 rounded text-[9px] font-mono">
                {activeGestureTags.right}
              </span>
            )}
          </div>
        </div>

        {/* Real-time Hand Recognition Status */}
        <div className="border-b border-border/30 bg-black/50 px-3 py-1 text-[9.5px] text-muted-foreground flex items-center justify-between">
          <span className="font-medium truncate text-slate-300">{rightHandStatus}</span>
          <span className="text-[9px] text-cyan-400 font-semibold shrink-0">
            {cameraActive ? "AI TRACKING" : "IDLE"}
          </span>
        </div>

        {/* Video & Landmark Canvas PIP */}
        <div className={cn("p-2 space-y-2", minimized && "hidden")}>
          {cameraError && (
            <div className="rounded border border-warning/40 bg-warning/10 p-2 text-[10px] text-warning flex items-start gap-1.5 leading-tight">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div>{cameraError}</div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 h-5 text-[9px] px-2 border-warning/60 text-warning hover:bg-warning/20"
                  onClick={startCameraStream}
                >
                  Retry Webcam
                </Button>
              </div>
            </div>
          )}

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "absolute inset-0 h-full w-full object-cover -scale-x-100",
                !cameraActive && "hidden",
              )}
            />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

            {cameraActive && (
              <div className="absolute bottom-1 left-1 rounded bg-black/85 px-1.5 py-0.5 text-[8.5px] text-muted-foreground flex gap-1.5">
                <span className="text-[#c084fc] font-bold">● Left: V(In)/W(Out)</span>
                <span className="text-[#22c55e] font-bold">● Right: V(Isolate)</span>
                <span className="text-[#f59e0b] font-bold">● Pinch(Scan)</span>
              </div>
            )}

            {!cameraActive && !virtualCam && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center text-muted-foreground bg-black/95">
                <Camera className="size-7 text-primary mb-1 animate-pulse" />
                <p className="text-[11px] font-bold text-foreground">
                  Turn on Webcam for AI Gestures
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  👈 Left hand: 'V' zooms in · 'W' zooms out · 👉 Right hand: 'V' isolates · Pinch
                  investigates
                </p>
                <div className="mt-2.5 flex gap-1.5">
                  <Button
                    size="sm"
                    className="h-6 text-[10px] gap-1 bg-primary text-primary-foreground font-bold"
                    onClick={startCameraStream}
                  >
                    <Camera className="size-3" />
                    <span>Allow & Start Cam</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] gap-1 border-primary/50 text-foreground"
                    onClick={() => {
                      setVirtualCam(true);
                      showGesture("Virtual AI Sensor Enabled");
                    }}
                  >
                    <MonitorPlay className="size-3 text-accent" />
                    <span>Test Sensor</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Touch Buttons */}
          <div className="space-y-1.5 pt-0.5">
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                className="flex items-center justify-center gap-1.5 rounded border border-purple-500/50 bg-secondary/80 py-1.5 hover:bg-purple-500/20 hover:border-purple-400 transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  adjustZoom(-3.0);
                  showGesture("👈 LEFT HAND: 'V' SIGN [ZOOM IN]");
                }}
                title="Left Hand shows 'V' sign to zoom in"
              >
                <ZoomIn className="size-3.5 text-purple-400" />
                <span>👈 Left: 'V' Zoom In</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-purple-500/50 bg-secondary/80 py-1.5 hover:bg-purple-500/20 hover:border-purple-400 transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  adjustZoom(3.0);
                  showGesture("👈 LEFT HAND: 'W' SIGN [ZOOM OUT]");
                }}
                title="Left Hand shows 'W' sign to zoom out"
              >
                <ZoomOut className="size-3.5 text-purple-400" />
                <span>👈 Left: 'W' Zoom Out</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-cyan-500/50 bg-secondary/80 py-1.5 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  const selected = useGame.getState().selected;
                  const ok = investigate(selected !== null ? selected : undefined);
                  if (ok) {
                    showGesture("👉 RIGHT HAND PINCH [OPENING THREAT DOSSIER]");
                    sfx.gesture();
                  } else {
                    showGesture("Host already investigated or clean.");
                  }
                }}
                title="Right Hand pinches thumb and index to scan malware dossier"
              >
                <Zap className="size-3.5 text-cyan-400" />
                <span>👉 Right: Pinch Scan</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-emerald-500/60 bg-secondary/80 py-1.5 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  const selected = useGame.getState().selected;
                  isolate(selected !== null ? selected : undefined);
                  showGesture("✌️ RIGHT HAND: 'V' (ISOLATE) · THREAT QUARANTINED!");
                  sfx.blinkIsolate();
                }}
                title="Show 'V' sign with right hand to isolate and quarantine infected host"
              >
                <ShieldCheck className="size-3.5 text-emerald-400" />
                <span>✌️ Right: 'V' Isolate</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
