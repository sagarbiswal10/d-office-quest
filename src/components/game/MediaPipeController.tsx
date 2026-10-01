import "@/lib/client-error-filter";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Eye,
  GripHorizontal,
  Hand,
  Maximize2,
  Minimize2,
  MonitorPlay,
  RotateCw,
  Sparkles,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { HandLandmarker, FaceLandmarker } from "@mediapipe/tasks-vision";
import { NETWORK } from "@/game/data";
import { useGame } from "@/game/store";
import { sfx } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MediaPipeController() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActiveState] = useState(false);
  const [virtualCam, setVirtualCam] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);

  // Real-time HUD gesture badge
  const [currentGestureBadge, setCurrentGestureBadge] = useState<string>(
    "👈 Left: 360° Rotate & Zoom · 👉 Right: Point & Pinch · 👁️ Eye Blink: Isolate",
  );
  const [eyeStatus, setEyeStatus] = useState<string>("Face: Searching...");
  const [blinkActive, setBlinkActive] = useState<boolean>(false);
  const [highSensitivity, setHighSensitivity] = useState<boolean>(true);

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
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const virtualAnimRef = useRef<number | null>(null);

  // Tracking memories
  const prevLeftHandRef = useRef<{ x: number; y: number } | null>(null);
  const lastActionTimeRef = useRef<{
    isolate: number;
    investigate: number;
    zoom: number;
  }>({
    isolate: 0,
    investigate: 0,
    zoom: 0,
  });

  // Adaptive baseline for EAR and pixel luminance blink engine
  const baselineEARRef = useRef<number>(0.28);
  const lastFaceTimeRef = useRef<number>(0);
  const lastHandTimeRef = useRef<number>(0);

  // Lightweight optical eye detector memory (runs on canvas pixels as fallback)
  const prevEyeLumaRef = useRef<number[]>([]);
  const prevFrameImageDataRef = useRef<ImageData | null>(null);

  // GSAP-style smoothed crosshair coordinates
  const smoothCrosshair = useRef<{ x: number; y: number }>({
    x: typeof window !== "undefined" ? window.innerWidth * 0.5 : 500,
    y: typeof window !== "undefined" ? window.innerHeight * 0.5 : 300,
  });

  const investigate = useGame((s) => s.investigate);
  const isolate = useGame((s) => s.isolate);
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

  // Initialize MediaPipe Vision Models with resilient fallback
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        const {
          FilesetResolver,
          HandLandmarker: HandLandmarkerClass,
          FaceLandmarker: FaceLandmarkerClass,
        } = await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
        );

        if (!isMounted) return;

        // 1. Hand Landmarker (2 hands: Left for Orbit & Zoom, Right for Aim & Pinch)
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
          });
        }

        // 2. Face Landmarker with CPU fallback for maximum browser compatibility
        let faceLm: FaceLandmarker | null = null;
        try {
          faceLm = await FaceLandmarkerClass.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } catch {
          try {
            faceLm = await FaceLandmarkerClass.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "CPU",
              },
              outputFaceBlendshapes: true,
              runningMode: "VIDEO",
              numFaces: 1,
            });
          } catch {
            console.info("FaceLandmarker using direct canvas optical fallback");
          }
        }

        if (!isMounted) return;
        handLandmarkerRef.current = handLm;
        faceLandmarkerRef.current = faceLm;
      } catch (err: unknown) {
        console.warn("Vision model setup status:", err);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
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
            showGesture("AI Vision Ready · 👈 Left: 360° Rotate & Zoom · 👉 Right: Point & Pinch");
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
    showGesture("Camera Inactive");
  }, [showGesture]);

  const toggleCamera = () => {
    if (cameraActive) {
      stopCameraStream();
    } else {
      startCameraStream();
    }
  };

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

      // Simulated Face Tracking
      const faceCx = canvas.width * 0.5 + Math.sin(simTick * 0.6) * 8;
      const faceCy = canvas.height * 0.38 + Math.cos(simTick * 0.5) * 5;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(faceCx, faceCy, 34, 44, 0, 0, Math.PI * 2);
      ctx.stroke();

      const isSimBlink = Math.sin(simTick * 2.2) > 0.85;
      ctx.fillStyle = isSimBlink ? "#22c55e" : "#00e5ff";
      if (isSimBlink) {
        ctx.fillRect(faceCx - 18, faceCy - 4, 12, 3);
        ctx.fillRect(faceCx + 6, faceCy - 4, 12, 3);
      } else {
        ctx.beginPath();
        ctx.arc(faceCx - 12, faceCy - 4, 4, 0, Math.PI * 2);
        ctx.arc(faceCx + 12, faceCy - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Left Hand (Orbit & Zoom)
      const leftX = canvas.width * 0.22;
      const leftY = canvas.height * 0.7 + Math.sin(simTick * 0.8) * 8;
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.arc(leftX, leftY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "9px monospace";
      ctx.fillText("👈 LEFT: ROTATE/ZOOM", leftX - 40, leftY + 18);

      // Right Hand (Point & Pinch)
      const rightX = canvas.width * 0.78;
      const rightY = canvas.height * 0.7 + Math.cos(simTick * 0.8) * 8;
      ctx.fillStyle = "#00e5ff";
      ctx.beginPath();
      ctx.arc(rightX, rightY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("👉 RIGHT: PINCH/AIM", rightX - 40, rightY + 18);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "10px monospace";
      ctx.fillText("VIRTUAL SENSOR · LEFT: CAMERA · RIGHT: INTERACT", 10, 18);

      virtualAnimRef.current = requestAnimationFrame(renderVirtual);
    };

    virtualAnimRef.current = requestAnimationFrame(renderVirtual);
    return () => {
      if (virtualAnimRef.current) cancelAnimationFrame(virtualAnimRef.current);
    };
  }, [virtualCam, cameraActive]);

  // Main Live Detection Loop
  // 1. LEFT HAND: Move left/right for 360° Orbit · Move up/down for Zoom In/Out!
  // 2. RIGHT HAND: Point to aim crosshair · Pinch to investigate / scan dossier!
  // 3. DUAL-ENGINE EYE BLINK: MediaPipe FaceLandmarker + Direct Optical Delta Fallback!
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

          if (currentTime !== lastVideoTime) {
            lastVideoTime = currentTime;

            // ========================================================
            // 1. HAND DETECTION
            // LEFT HAND -> 360° ROTATE & ZOOM IN / OUT
            // RIGHT HAND -> POINT TO AIM & PINCH TO SCAN
            // ========================================================
            if (handLandmarkerRef.current) {
              try {
                const handTimestamp = Math.max(lastHandTimeRef.current + 1, Math.round(now));
                lastHandTimeRef.current = handTimestamp;

                const handResults = handLandmarkerRef.current.detectForVideo(video, handTimestamp);
                if (handResults.landmarks && handResults.landmarks.length > 0) {
                  let leftHandPresent = false;
                  let rightHandPresent = false;

                  handResults.landmarks.forEach((landmarks, handIdx) => {
                    if (!landmarks || landmarks.length < 21) return;

                    const handednessObj = handResults.handedness?.[handIdx]?.[0];
                    const reportedCategory = handednessObj?.categoryName;
                    const wrist = landmarks[0]!;
                    const mirrorWristX = 1 - wrist.x;

                    // Mirrored left/right classification
                    const isLeftHand =
                      reportedCategory === "Left" ||
                      (reportedCategory !== "Right" && mirrorWristX < 0.48);

                    // Draw skeleton
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = isLeftHand ? "#c084fc" : "#00e5ff";
                    ctx.fillStyle = isLeftHand ? "#d8b4fe" : "#38bdf8";

                    landmarks.forEach((pt) => {
                      const x = (1 - pt.x) * canvas.width;
                      const y = pt.y * canvas.height;
                      ctx.beginPath();
                      ctx.arc(x, y, 3, 0, Math.PI * 2);
                      ctx.fill();
                    });

                    const thumb = landmarks[4]!;
                    const index = landmarks[8]!;
                    const middle = landmarks[12]!;
                    const ring = landmarks[16]!;
                    const pinky = landmarks[20]!;

                    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);

                    // ----------------------------------------------------
                    // ROLE A: LEFT HAND -> 360° ROTATE & ZOOM IN / OUT
                    // ----------------------------------------------------
                    if (isLeftHand) {
                      leftHandPresent = true;
                      const curX = mirrorWristX;
                      const curY = wrist.y;
                      const prev = prevLeftHandRef.current;

                      ctx.font = "bold 10px monospace";
                      ctx.fillStyle = "#c084fc";
                      ctx.fillText(
                        "👈 LEFT [360° ROTATE / ZOOM]",
                        curX * canvas.width - 40,
                        curY * canvas.height - 15,
                      );

                      if (prev !== null) {
                        const deltaX = curX - prev.x; // horizontal movement
                        const deltaY = curY - prev.y; // vertical movement

                        // 1. 360° Orbit Rotation (Move Left Hand Left / Right)
                        if (Math.abs(deltaX) > 0.005) {
                          adjustOrbit(deltaX * 3.2, 0);
                          showGesture(
                            `👈 Left Hand: ${deltaX > 0 ? "Rotate Right ⏩" : "Rotate Left ⏪"}`,
                          );
                        }

                        // 2. Zoom In & Zoom Out (Move Left Hand Up / Down)
                        // deltaY < 0 is moving hand UP -> Zoom In (- distance)
                        // deltaY > 0 is moving hand DOWN -> Zoom Out (+ distance)
                        if (Math.abs(deltaY) > 0.012 && now - lastActionTimeRef.current.zoom > 90) {
                          lastActionTimeRef.current.zoom = now;
                          const zoomStep = deltaY < 0 ? -1.6 : 1.6;
                          adjustZoom(zoomStep);
                          showGesture(`👈 Left Hand: ${deltaY < 0 ? "🔍 ZOOM IN" : "🔍 ZOOM OUT"}`);
                        }
                      }
                      prevLeftHandRef.current = { x: curX, y: curY };
                    }

                    // ----------------------------------------------------
                    // ROLE B: RIGHT HAND -> POINT TO AIM & PINCH TO SCAN
                    // ----------------------------------------------------
                    if (!isLeftHand) {
                      rightHandPresent = true;
                      const mirrorIndexX = (1 - index.x) * canvas.width;
                      const indexY = index.y * canvas.height;

                      ctx.font = "bold 10px monospace";
                      ctx.fillStyle = "#00e5ff";
                      ctx.fillText("👉 RIGHT [POINT & PINCH]", mirrorIndexX - 35, indexY - 14);

                      // 1. PINCH with Right Hand (Thumb + Index distance < 0.08)
                      const isRightPinch = pinchDist < 0.08;
                      if (isRightPinch && now - lastActionTimeRef.current.investigate > 750) {
                        lastActionTimeRef.current.investigate = now;
                        const currentSelected = useGame.getState().selected;
                        const ok = investigate(
                          currentSelected !== null ? currentSelected : undefined,
                        );
                        if (ok) {
                          showGesture("👉 RIGHT PINCH [OPENING THREAT DOSSIER]");
                          sfx.gesture();
                        }
                      }

                      // 2. POINT with Right Hand (aims smooth crosshair & selects device)
                      const indexExtended = Math.hypot(index.x - wrist.x, index.y - wrist.y) > 0.2;
                      const middleFolded =
                        Math.hypot(middle.x - wrist.x, middle.y - wrist.y) <
                        Math.hypot(landmarks[9]!.x - wrist.x, landmarks[9]!.y - wrist.y) * 1.25;

                      if (indexExtended && middleFolded) {
                        const targetX = (1 - index.x) * window.innerWidth;
                        const targetY = index.y * window.innerHeight;

                        // Smooth interpolation
                        smoothCrosshair.current.x += (targetX - smoothCrosshair.current.x) * 0.45;
                        smoothCrosshair.current.y += (targetY - smoothCrosshair.current.y) * 0.45;

                        const normX = 1 - index.x;
                        const normY = index.y;

                        let targetId = 8;
                        if (normX < 0.36) {
                          const row = Math.min(3, Math.max(0, Math.floor(normY * 4)));
                          targetId = row;
                        } else if (normX > 0.64) {
                          const row = Math.min(3, Math.max(0, Math.floor(normY * 4)));
                          targetId = 4 + row;
                        } else {
                          const col = normX < 0.5 ? 0 : 1;
                          const row = Math.min(3, Math.max(0, Math.floor(normY * 4)));
                          targetId = 8 + row * 2 + col;
                        }

                        const pointedNode = NETWORK.nodes[targetId];
                        if (pointedNode) {
                          useGame.getState().select(pointedNode.id);
                          useGame.getState().setPointingCrosshair({
                            x: smoothCrosshair.current.x,
                            y: smoothCrosshair.current.y,
                            active: true,
                            label: pointedNode.label,
                          });
                        }
                      }
                    }
                  });

                  if (!leftHandPresent) prevLeftHandRef.current = null;
                  if (!rightHandPresent) {
                    if (useGame.getState().pointingCrosshair?.active) {
                      useGame.getState().setPointingCrosshair(null);
                    }
                  }
                } else {
                  prevLeftHandRef.current = null;
                  if (useGame.getState().pointingCrosshair?.active) {
                    useGame.getState().setPointingCrosshair(null);
                  }
                }
              } catch {
                // Ignore transient frame errors
              }
            }

            // ========================================================
            // 3. DUAL-ENGINE EYE BLINK RECOGNITION (NEVER FAILS)
            // ========================================================
            let blinkDetected = false;

            // Engine A: MediaPipe FaceLandmarker (Blendshapes & Geometric EAR)
            if (faceLandmarkerRef.current) {
              try {
                const faceTimestamp = Math.max(lastFaceTimeRef.current + 1, Math.round(now + 1));
                lastFaceTimeRef.current = faceTimestamp;

                const faceResults = faceLandmarkerRef.current.detectForVideo(video, faceTimestamp);

                if (faceResults.landmarks && faceResults.landmarks.length > 0) {
                  const face = faceResults.landmarks[0];
                  if (face && face.length >= 468) {
                    // Draw Face Contour
                    ctx.fillStyle = "#00e5ff";
                    ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
                    ctx.lineWidth = 1;

                    [33, 133, 159, 145, 263, 362, 386, 374, 1, 4, 168].forEach((idx) => {
                      const pt = face[idx];
                      if (pt) {
                        const x = (1 - pt.x) * canvas.width;
                        const y = pt.y * canvas.height;
                        ctx.beginPath();
                        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                      }
                    });

                    // Geometric EAR
                    const leftH = Math.hypot(
                      face[159]!.x - face[145]!.x,
                      face[159]!.y - face[145]!.y,
                    );
                    const leftW =
                      Math.hypot(face[133]!.x - face[33]!.x, face[133]!.y - face[33]!.y) || 1;
                    const rightH = Math.hypot(
                      face[386]!.x - face[374]!.x,
                      face[386]!.y - face[374]!.y,
                    );
                    const rightW =
                      Math.hypot(face[263]!.x - face[362]!.x, face[263]!.y - face[362]!.y) || 1;

                    const earLeft = leftH / leftW;
                    const earRight = rightH / rightW;
                    const avgEAR = (earLeft + earRight) / 2;

                    if (avgEAR > 0.16) {
                      baselineEARRef.current = baselineEARRef.current * 0.92 + avgEAR * 0.08;
                    }

                    // Blendshape blink scores
                    let blendLeft = 0;
                    let blendRight = 0;
                    if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
                      const categories = faceResults.faceBlendshapes[0]?.categories || [];
                      blendLeft =
                        categories.find((c) => c.categoryName === "eyeBlinkLeft")?.score || 0;
                      blendRight =
                        categories.find((c) => c.categoryName === "eyeBlinkRight")?.score || 0;
                    }

                    const threshold = highSensitivity ? 0.12 : 0.2;
                    const isBlendBlink = blendLeft > threshold || blendRight > threshold;
                    const isEarDrop =
                      avgEAR < baselineEARRef.current * (highSensitivity ? 0.8 : 0.72);
                    const isAbsBlink = earLeft < 0.22 || earRight < 0.22;

                    if (isBlendBlink || isEarDrop || isAbsBlink) {
                      blinkDetected = true;
                    }

                    setEyeStatus(
                      blinkDetected
                        ? "👁️ BLINK DETECTED! [QUARANTINE]"
                        : `👁️ Face Locked · Eyes (${Math.round((avgEAR / (baselineEARRef.current || 0.28)) * 100)}%)`,
                    );
                    setBlinkActive(blinkDetected);

                    // Draw eye circles
                    ctx.strokeStyle = blinkDetected ? "#22c55e" : "#00e5ff";
                    ctx.lineWidth = blinkDetected ? 3 : 1.5;
                    [159, 386].forEach((idx) => {
                      const pt = face[idx];
                      if (pt) {
                        const ex = (1 - pt.x) * canvas.width;
                        const ey = pt.y * canvas.height;
                        ctx.beginPath();
                        ctx.arc(ex, ey, blinkDetected ? 9 : 5, 0, Math.PI * 2);
                        ctx.stroke();
                      }
                    });
                  }
                }
              } catch {
                // Fall through to Engine B
              }
            }

            // Engine B: Direct Optical Luminance & Motion Blink Fallback
            // (Analyzes the eye bounding zone directly on video canvas)
            if (!faceLandmarkerRef.current || !blinkDetected) {
              try {
                // Focus on eye zone: upper-center of video
                const eyeBoxX = Math.round(canvas.width * 0.35);
                const eyeBoxY = Math.round(canvas.height * 0.28);
                const eyeBoxW = Math.round(canvas.width * 0.3);
                const eyeBoxH = Math.round(canvas.height * 0.18);

                ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
                ctx.strokeRect(eyeBoxX, eyeBoxY, eyeBoxW, eyeBoxH);

                const imgData = ctx.getImageData(eyeBoxX, eyeBoxY, eyeBoxW, eyeBoxH);
                let totalDark = 0;
                for (let i = 0; i < imgData.data.length; i += 8) {
                  const r = imgData.data[i]!;
                  const g = imgData.data[i + 1]!;
                  const b = imgData.data[i + 2]!;
                  const brightness = (r + g + b) / 3;
                  if (brightness < 60) totalDark++;
                }

                const prevHistory = prevEyeLumaRef.current;
                prevHistory.push(totalDark);
                if (prevHistory.length > 10) prevHistory.shift();

                const baselineDark =
                  prevHistory.reduce((acc, v) => acc + v, 0) / (prevHistory.length || 1);

                // When eyes close, pupils disappear and dark pixel count drops sharply
                if (
                  baselineDark > 15 &&
                  totalDark < baselineDark * (highSensitivity ? 0.65 : 0.5)
                ) {
                  blinkDetected = true;
                  setEyeStatus("👁️ OPTICAL BLINK! [QUARANTINE]");
                  setBlinkActive(true);
                }
              } catch {
                // Canvas security or pixel fallback safe
              }
            }

            // Execute Quarantine Action on Blink
            if (blinkDetected && now - lastActionTimeRef.current.isolate > 650) {
              lastActionTimeRef.current.isolate = now;
              const currentSelected = useGame.getState().selected;
              const ok = isolate(currentSelected !== null ? currentSelected : undefined);
              if (ok) {
                showGesture("👁️ EYE BLINK RECOGNIZED · THREAT QUARANTINED!");
                sfx.blinkIsolate();
              }
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
  }, [cameraActive, adjustOrbit, adjustZoom, investigate, isolate, showGesture, highSensitivity]);

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
          {blinkActive && (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-1 py-0.2 rounded text-[9px] font-mono animate-pulse">
              BLINK!
            </span>
          )}
        </div>

        {/* Real-time Eye Recognition Status Meter with Sensitivity Toggle */}
        <div className="border-b border-border/30 bg-black/50 px-3 py-1 text-[9.5px] text-muted-foreground flex items-center justify-between">
          <span
            className={cn(
              "font-medium",
              blinkActive ? "text-emerald-400 font-bold" : "text-slate-300",
            )}
          >
            {eyeStatus}
          </span>
          <button
            onClick={() => setHighSensitivity(!highSensitivity)}
            className="text-[9px] text-cyan-400 font-semibold hover:underline"
            title="Toggle eye sensitivity"
          >
            Sens: {highSensitivity ? "HIGH" : "STD"}
          </button>
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
              <div className="absolute bottom-1 left-1 rounded bg-black/85 px-1.5 py-0.5 text-[8.5px] text-muted-foreground flex gap-2">
                <span className="text-[#c084fc] font-bold">● Left: 360°/Zoom</span>
                <span className="text-[#00e5ff] font-bold">● Right: Point/Pinch</span>
                <span className="text-[#22c55e] font-bold">● Eye Blink</span>
              </div>
            )}

            {!cameraActive && !virtualCam && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center text-muted-foreground bg-black/95">
                <Camera className="size-7 text-primary mb-1 animate-pulse" />
                <p className="text-[11px] font-bold text-foreground">
                  Turn on Webcam for AI Gestures
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  👈 Left hand: 360° rotate & zoom · 👉 Right hand: point & pinch · 👁️ Eye blink:
                  isolate
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
                  adjustOrbit(0.25, 0);
                  showGesture("👈 LEFT HAND: Rotate 360° [45° Pan]");
                }}
                title="Left Hand moves left/right for 360° room rotation"
              >
                <RotateCw className="size-3.5 text-purple-400" />
                <span>👈 Left: 360° Rotate</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-purple-500/50 bg-secondary/80 py-1.5 hover:bg-purple-500/20 hover:border-purple-400 transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  adjustZoom(-2.5);
                  showGesture("👈 LEFT HAND: Zoom In (Move Up)");
                }}
                title="Left Hand moves up to zoom in, down to zoom out"
              >
                <ZoomIn className="size-3.5 text-purple-400" />
                <span>👈 Left: Zoom In/Out</span>
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
                    showGesture("Aim at an infected host first, then Pinch!");
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
                  showGesture("👁️ EYE BLINK RECOGNIZED · THREAT QUARANTINED!");
                  sfx.blinkIsolate();
                }}
                title="Blink eye or wink to isolate and quarantine infected host"
              >
                <Eye className="size-3.5 text-emerald-400" />
                <span>👁️ Blink: Quarantine</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
