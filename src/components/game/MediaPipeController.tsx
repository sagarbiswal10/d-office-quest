import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Eye,
  Hand,
  Maximize2,
  Minimize2,
  MonitorPlay,
  RotateCw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { HandLandmarker, FaceLandmarker } from "@mediapipe/tasks-vision";
import { NETWORK } from "@/game/data";
import { useGame } from "@/game/store";
import { sfx } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GestureState {
  type: "pinch" | "l-shape" | "open" | "blink" | null;
  time: number;
}

export function MediaPipeController() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraActive, setCameraActiveState] = useState(false);
  const [virtualCam, setVirtualCam] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [currentGestureBadge, setCurrentGestureBadge] = useState<string>(
    "AI Vision Ready · Initializing Camera Feed",
  );

  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const virtualAnimRef = useRef<number | null>(null);

  // Gesture transition memories
  const lastHandPoseRef = useRef<GestureState>({ type: null, time: 0 });
  const lastActionTimeRef = useRef<{
    isolate: number;
    investigate: number;
    zoom: number;
  }>({
    isolate: 0,
    investigate: 0,
    zoom: 0,
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

  // Initialize MediaPipe Vision Models
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

        const [handLm, faceLm] = await Promise.all([
          HandLandmarkerClass.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
          }).catch(() =>
            HandLandmarkerClass.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "CPU",
              },
              runningMode: "VIDEO",
              numHands: 1,
            }),
          ),

          FaceLandmarkerClass.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          }).catch(() =>
            FaceLandmarkerClass.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "CPU",
              },
              outputFaceBlendshapes: true,
              runningMode: "VIDEO",
              numFaces: 1,
            }),
          ),
        ]);

        if (!isMounted) return;
        handLandmarkerRef.current = handLm;
        faceLandmarkerRef.current = faceLm;
      } catch (err: unknown) {
        console.warn("MediaPipe model loading warning:", err);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
    };
  }, []);

  // Start Webcam Stream (Live Face View)
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    setMinimized(false);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera API is not supported in this browser window. Switched to Virtual AI Cam.",
      );
      setVirtualCam(true);
      showGesture("Virtual AI Cam active");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        await videoRef.current.play().catch(() => {});
      }

      setCameraActiveState(true);
      setVirtualCam(false);
      useGame.getState().setCameraActive(true);
      showGesture("Live Webcam Active · Face & Hand Tracking");
    } catch (err: unknown) {
      const errName = (err as Error)?.name || "Error";
      let msg = "Camera could not be started.";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        msg =
          "Camera permission was denied. Click the camera icon in your browser URL bar to allow access.";
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        msg = "No webcam hardware detected on this device.";
      } else if (errName === "NotReadableError") {
        msg = "Webcam is currently occupied by another application.";
      }
      setCameraError(msg);
      setVirtualCam(true);
      showGesture("Webcam permission needed · Virtual AI Cam active");
    }
  }, [showGesture]);

  // Stop Webcam Stream
  const stopCameraStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setCameraActiveState(false);
    useGame.getState().setCameraActive(false);
    showGesture("Camera paused");
  }, [showGesture]);

  const toggleCamera = useCallback(async () => {
    if (cameraActive) {
      stopCameraStream();
    } else {
      await startCameraStream();
    }
  }, [cameraActive, startCameraStream, stopCameraStream]);

  // Attempt auto-start on mount so user sees their face right away
  useEffect(() => {
    startCameraStream().catch(() => {});
    return () => {
      stopCameraStream();
    };
  }, [startCameraStream, stopCameraStream]);

  // Virtual AI Cam Loop (Fallback when webcam is denied/unavailable)
  useEffect(() => {
    if (!virtualCam || cameraActive) return;

    let simTick = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 320;
    canvas.height = 240;

    const renderVirtual = () => {
      simTick += 0.04;
      ctx.fillStyle = "#0a1420";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyber Grid
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

      // Virtual Face Contour
      const faceCx = canvas.width * 0.5 + Math.sin(simTick * 0.8) * 12;
      const faceCy = canvas.height * 0.38 + Math.cos(simTick * 0.6) * 6;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(faceCx, faceCy, 36, 46, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Eyes
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(faceCx - 12, faceCy - 6, 3.5, 0, Math.PI * 2);
      ctx.arc(faceCx + 12, faceCy - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Hand Skeleton
      const handX = canvas.width * 0.72 + Math.sin(simTick * 1.1) * 8;
      const handY = canvas.height * 0.68 + Math.cos(simTick * 1.3) * 10;

      ctx.strokeStyle = "#00e5ff";
      ctx.fillStyle = "#ffb703";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(handX, handY + 28);
      ctx.lineTo(handX, handY);
      ctx.lineTo(handX - 14, handY - 16);
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX - 5, handY - 26);
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + 6, handY - 25);
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX + 16, handY - 20);
      ctx.stroke();

      [
        [handX, handY + 28],
        [handX, handY],
        [handX - 14, handY - 16],
        [handX - 5, handY - 26],
        [handX + 6, handY - 25],
        [handX + 16, handY - 20],
      ].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px as number, py as number, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "#38bdf8";
      ctx.font = "10px monospace";
      ctx.fillText("VIRTUAL AI SENSOR · ONLINE", 10, 20);

      virtualAnimRef.current = requestAnimationFrame(renderVirtual);
    };

    virtualAnimRef.current = requestAnimationFrame(renderVirtual);
    return () => {
      if (virtualAnimRef.current) cancelAnimationFrame(virtualAnimRef.current);
    };
  }, [virtualCam, cameraActive]);

  // Main Live Detection Loop (runs on real webcam frames)
  useEffect(() => {
    if (!cameraActive) return;

    let lastVideoTime = -1;

    const detect = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const currentTime = video.currentTime;
          const now = performance.now();

          if (currentTime !== lastVideoTime) {
            lastVideoTime = currentTime;

            // 1. Hand Detection
            if (handLandmarkerRef.current) {
              const handResults = handLandmarkerRef.current.detectForVideo(video, now);
              if (handResults.landmarks && handResults.landmarks.length > 0) {
                const landmarks = handResults.landmarks[0];
                if (landmarks && landmarks.length >= 21) {
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = "#00e5ff";
                  ctx.fillStyle = "#ffb703";

                  landmarks.forEach((pt) => {
                    const x = (1 - pt.x) * canvas.width; // mirror
                    const y = pt.y * canvas.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                  });

                  const thumb = landmarks[4];
                  const index = landmarks[8];
                  const middle = landmarks[12];
                  const ring = landmarks[16];
                  const pinky = landmarks[20];
                  const wrist = landmarks[0];

                  if (thumb && index && middle && ring && pinky && wrist) {
                    const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
                    const indexExtended = Math.hypot(index.x - wrist.x, index.y - wrist.y) > 0.22;
                    const middleFolded =
                      Math.hypot(middle.x - wrist.x, middle.y - wrist.y) <
                      Math.hypot(landmarks[9]!.x - wrist.x, landmarks[9]!.y - wrist.y) * 1.18;
                    const ringFolded =
                      Math.hypot(ring.x - wrist.x, ring.y - wrist.y) <
                      Math.hypot(landmarks[13]!.x - wrist.x, landmarks[13]!.y - wrist.y) * 1.18;
                    const pinkyFolded =
                      Math.hypot(pinky.x - wrist.x, pinky.y - wrist.y) <
                      Math.hypot(landmarks[17]!.x - wrist.x, landmarks[17]!.y - wrist.y) * 1.18;

                    const isPinch = pinchDist < 0.07;
                    const isLShape = pinchDist > 0.16 && middleFolded && ringFolded;
                    const isPointing =
                      indexExtended &&
                      middleFolded &&
                      ringFolded &&
                      pinkyFolded &&
                      pinchDist > 0.09;

                    // Pointing Detection: selects and aims at the specific component
                    if (isPointing) {
                      const normX = 1 - index.x; // mirror coordinate
                      const normY = index.y;

                      // Map normalized pointing coordinates to organized zones
                      let targetId = 8;
                      if (normX < 0.36) {
                        // Left Wing: Dedicated Datacenter Servers (0 to 3)
                        const row = Math.min(3, Math.max(0, Math.floor(normY * 4)));
                        targetId = row;
                      } else if (normX > 0.64) {
                        // Right Wing: Dedicated WiFi & NOC Bay (4 to 7)
                        const row = Math.min(3, Math.max(0, Math.floor(normY * 4)));
                        targetId = 4 + row;
                      } else {
                        // Center Floor: Workstations (8 to 15)
                        const col = normX < 0.5 ? 0 : 1;
                        const row = Math.min(3, Math.max(0, Math.floor(normY * 4)));
                        targetId = 8 + row * 2 + col;
                      }

                      const pointedNode = NETWORK.nodes[targetId];
                      if (pointedNode) {
                        useGame.getState().select(pointedNode.id);
                        useGame.getState().setPointingCrosshair({
                          x: normX * window.innerWidth,
                          y: normY * window.innerHeight,
                          active: true,
                          label: pointedNode.label,
                        });
                        showGesture(
                          `👉 POINTING AT: ${pointedNode.label} (${pointedNode.sublabel}) · PINCH TO INVESTIGATE`,
                        );
                      }
                    } else {
                      if (useGame.getState().pointingCrosshair?.active) {
                        useGame.getState().setPointingCrosshair(null);
                      }
                    }

                    // Hand 360 Pan
                    if (wrist.x < 0.28) {
                      adjustOrbit(-0.02, 0);
                      showGesture("Hand 360° Pan Left");
                    } else if (wrist.x > 0.72) {
                      adjustOrbit(0.02, 0);
                      showGesture("Hand 360° Pan Right");
                    }

                    // Zoom Transition Machine
                    const prev = lastHandPoseRef.current;
                    const elapsedSincePrev = now - prev.time;

                    if (isLShape) {
                      if (
                        prev.type === "pinch" &&
                        elapsedSincePrev < 900 &&
                        now - lastActionTimeRef.current.zoom > 700
                      ) {
                        lastActionTimeRef.current.zoom = now;
                        adjustZoom(-4);
                        showGesture("GESTURE: PINCH → L [ZOOM IN]");
                        sfx.gesture();
                      }
                      lastHandPoseRef.current = { type: "l-shape", time: now };
                    } else if (isPinch) {
                      if (
                        prev.type === "l-shape" &&
                        elapsedSincePrev < 900 &&
                        now - lastActionTimeRef.current.zoom > 700
                      ) {
                        lastActionTimeRef.current.zoom = now;
                        adjustZoom(4);
                        showGesture("GESTURE: L → PINCH [ZOOM OUT]");
                        sfx.gesture();
                      } else if (
                        now - lastActionTimeRef.current.investigate > 900 &&
                        now - prev.time > 150
                      ) {
                        lastActionTimeRef.current.investigate = now;
                        const currentSelected = useGame.getState().selected;
                        const ok = investigate(
                          currentSelected !== null ? currentSelected : undefined,
                        );
                        if (ok) {
                          showGesture("GESTURE: PINCH [OPENING INVESTIGATION DOSSIER]");
                          sfx.gesture();
                        }
                      }
                      lastHandPoseRef.current = { type: "pinch", time: now };
                    } else {
                      if (now - prev.time > 800) {
                        lastHandPoseRef.current = { type: "open", time: now };
                      }
                    }
                  }
                }
              }
            }

            // 2. Face Detection
            if (faceLandmarkerRef.current) {
              const faceResults = faceLandmarkerRef.current.detectForVideo(video, now);
              if (faceResults.landmarks && faceResults.landmarks.length > 0) {
                const face = faceResults.landmarks[0];
                if (face && face.length > 468) {
                  ctx.fillStyle = "#ef4444";
                  [33, 133, 159, 145, 263, 362, 386, 374, 1].forEach((idx) => {
                    const pt = face[idx];
                    if (pt) {
                      const x = (1 - pt.x) * canvas.width;
                      const y = pt.y * canvas.height;
                      ctx.beginPath();
                      ctx.arc(x, y, 3, 0, Math.PI * 2);
                      ctx.fill();
                    }
                  });

                  // Face 360 Pan
                  const nose = face[1];
                  if (nose) {
                    if (nose.x < 0.42) {
                      adjustOrbit(-0.022, 0);
                      showGesture("Face 360° Pan Left");
                    } else if (nose.x > 0.58) {
                      adjustOrbit(0.022, 0);
                      showGesture("Face 360° Pan Right");
                    }
                    if (nose.y < 0.42) {
                      adjustOrbit(0, -0.015);
                    } else if (nose.y > 0.6) {
                      adjustOrbit(0, 0.015);
                    }
                  }

                  // Sensitive Eye Wink / Blink Detection
                  let blinked = false;
                  if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
                    const categories = faceResults.faceBlendshapes[0]?.categories || [];
                    const blinkLeft =
                      categories.find((c) => c.categoryName === "eyeBlinkLeft")?.score || 0;
                    const blinkRight =
                      categories.find((c) => c.categoryName === "eyeBlinkRight")?.score || 0;

                    if (blinkLeft > 0.28 || blinkRight > 0.28) {
                      blinked = true;
                    }
                  } else {
                    const leftEyeHeight = Math.hypot(
                      face[159]!.x - face[145]!.x,
                      face[159]!.y - face[145]!.y,
                    );
                    const leftEyeWidth = Math.hypot(
                      face[133]!.x - face[33]!.x,
                      face[133]!.y - face[33]!.y,
                    );
                    const rightEyeHeight = Math.hypot(
                      face[386]!.x - face[374]!.x,
                      face[386]!.y - face[374]!.y,
                    );
                    const rightEyeWidth = Math.hypot(
                      face[263]!.x - face[362]!.x,
                      face[263]!.y - face[362]!.y,
                    );

                    const earLeft = leftEyeHeight / (leftEyeWidth || 1);
                    const earRight = rightEyeHeight / (rightEyeWidth || 1);

                    if (earLeft < 0.23 || earRight < 0.23) {
                      blinked = true;
                    }
                  }

                  if (blinked && now - lastActionTimeRef.current.isolate > 850) {
                    lastActionTimeRef.current.isolate = now;
                    const currentSelected = useGame.getState().selected;
                    const ok = isolate(currentSelected !== null ? currentSelected : undefined);
                    if (ok) {
                      showGesture("👁️ EYE BLINK DETECTED · QUARANTINE EXECUTED");
                      sfx.blinkIsolate();
                    }
                  }
                }
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
  }, [cameraActive, adjustOrbit, adjustZoom, investigate, isolate, showGesture]);

  return (
    <div className="fixed bottom-20 left-3 z-30 flex flex-col font-mono text-xs select-none">
      <div className="panel pointer-events-auto overflow-hidden rounded-md border border-primary/50 bg-card/95 shadow-2xl w-[280px] sm:w-[320px]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/70 bg-secondary/80 px-3 py-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold uppercase text-primary">
            {cameraActive ? (
              <CheckCircle2 className="size-3.5 text-success animate-pulse" />
            ) : virtualCam ? (
              <MonitorPlay className="size-3.5 text-accent" />
            ) : (
              <Camera className="size-3.5 text-primary" />
            )}
            <span>
              {cameraActive
                ? "LIVE WEBCAM VIEW"
                : virtualCam
                  ? "VIRTUAL AI SENSOR"
                  : "GESTURE SENSOR"}
            </span>
          </div>

          <div className="flex items-center gap-1">
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
        <div className="border-b border-border/40 bg-black/60 px-3 py-1.5 text-[10px] font-bold text-accent truncate flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-warning animate-pulse shrink-0" />
          <span className="truncate">{currentGestureBadge}</span>
        </div>

        {/* ALWAYS RENDER VIDEO AND CANVAS IN DOM (Hidden via CSS if minimized) */}
        <div className={cn("p-2 space-y-2", minimized && "hidden")}>
          {/* Camera Error / Permission Notice */}
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

          {/* Video & Landmark Canvas PIP - Video element is ALWAYS rendered in DOM */}
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

            {/* Overlays */}
            {cameraActive && (
              <div className="absolute bottom-1 left-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-muted-foreground flex gap-2">
                <span className="text-[#00e5ff] font-bold">● Hand</span>
                <span className="text-[#ef4444] font-bold">● Eye Blink</span>
              </div>
            )}

            {!cameraActive && !virtualCam && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center text-muted-foreground bg-black/90">
                <Camera className="size-7 text-primary mb-1 animate-pulse" />
                <p className="text-[11px] font-bold text-foreground">
                  Turn on Webcam to see your Face
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">
                  Track pinch gestures & eye winks in real time
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
                    className="h-6 text-[10px] gap-1 border-accent/60 text-accent hover:bg-accent/20"
                    onClick={() => {
                      setVirtualCam(true);
                      showGesture("Virtual AI Cam active");
                    }}
                  >
                    <MonitorPlay className="size-3" />
                    <span>Virtual Cam</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Gesture Action Buttons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="font-bold text-foreground">ONE-CLICK GESTURES</span>
              <span className="text-[9px] text-primary">Always Works</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                className="flex items-center justify-center gap-1.5 rounded border border-primary/50 bg-secondary/80 py-1.5 hover:bg-primary/20 hover:border-primary transition-all text-foreground font-semibold shadow-sm col-span-2"
                onClick={() => {
                  const s = useGame.getState();
                  const infected = s.nodes.findIndex((n) => n.status === "infected");
                  const nextId =
                    infected >= 0 ? infected : ((s.selected ?? 0) + 1) % NETWORK.nodes.length;
                  s.select(nextId);
                  const node = NETWORK.nodes[nextId];
                  if (node) {
                    s.setPointingCrosshair({
                      x: window.innerWidth * 0.5,
                      y: window.innerHeight * 0.45,
                      active: true,
                      label: node.label,
                    });
                    showGesture(
                      `👉 POINTING TARGET: ${node.label} (${node.sublabel}) · PINCH TO INVESTIGATE`,
                    );
                  }
                }}
                title="Point finger at a component to target it"
              >
                <Hand className="size-3.5 text-primary rotate-45" />
                <span>👉 Point Hand to Target</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-primary/50 bg-secondary/80 py-1.5 hover:bg-primary/20 hover:border-primary transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  const selected = useGame.getState().selected;
                  const ok = investigate(selected !== null ? selected : undefined);
                  if (ok) {
                    showGesture("GESTURE: PINCH [OPENING INVESTIGATION DOSSIER]");
                    sfx.gesture();
                  } else {
                    showGesture("Point to an infected host or alert first, then Pinch!");
                  }
                }}
                title="Pinch thumb and index finger to investigate threat dossier"
              >
                <Hand className="size-3.5 text-accent" />
                <span>✋ Pinch to Scan</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-destructive/50 bg-secondary/80 py-1.5 hover:bg-destructive/20 hover:border-destructive transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  const selected = useGame.getState().selected;
                  isolate(selected !== null ? selected : undefined);
                  showGesture("👁️ EYE BLINK DETECTED [QUARANTINE EXECUTED]");
                  sfx.blinkIsolate();
                }}
                title="Wink an eye to isolate and quarantine infected host"
              >
                <Eye className="size-3.5 text-destructive" />
                <span>👁️ Blink to Isolate</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-accent/50 bg-secondary/80 py-1.5 hover:bg-accent/20 hover:border-accent transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  adjustZoom(-4);
                  showGesture("GESTURE: PINCH → L [ZOOM IN]");
                }}
                title="Pinch to L gesture: Zooms in camera"
              >
                <ZoomIn className="size-3.5 text-accent" />
                <span>Pinch → L (In)</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-accent/50 bg-secondary/80 py-1.5 hover:bg-accent/20 hover:border-accent transition-all text-foreground font-semibold shadow-sm"
                onClick={() => {
                  adjustZoom(4);
                  showGesture("GESTURE: L → PINCH [ZOOM OUT]");
                }}
                title="L to Pinch gesture: Zooms out camera"
              >
                <ZoomOut className="size-3.5 text-accent" />
                <span>L → Pinch (Out)</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-border bg-secondary/60 py-1.5 hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
                onClick={() => {
                  adjustOrbit(-0.35, 0);
                  showGesture("FACE / HAND 360° PAN LEFT");
                }}
                title="Pan camera 360 degrees left"
              >
                <RotateCw className="size-3.5 -scale-x-100 text-primary" />
                <span>360° Pan Left</span>
              </button>

              <button
                className="flex items-center justify-center gap-1.5 rounded border border-border bg-secondary/60 py-1.5 hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
                onClick={() => {
                  adjustOrbit(0.35, 0);
                  showGesture("FACE / HAND 360° PAN RIGHT");
                }}
                title="Pan camera 360 degrees right"
              >
                <RotateCw className="size-3.5 text-primary" />
                <span>360° Pan Right</span>
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex justify-between items-center pt-1 text-[9px] text-muted-foreground border-t border-border/40">
              <span>
                Status:{" "}
                {cameraActive
                  ? "Showing Live Face"
                  : virtualCam
                    ? "Virtual AI Active"
                    : "Camera Ready"}
              </span>
              {!cameraActive && (
                <button
                  onClick={() => setVirtualCam(!virtualCam)}
                  className="text-primary hover:underline font-semibold"
                >
                  {virtualCam ? "Disable Virtual Cam" : "Switch to Virtual Cam"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
