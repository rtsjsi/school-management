"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

export function CameraCaptureButton({
  onCapture,
  disabled,
}: {
  onCapture: (file: File) => void;
  disabled?: boolean;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError(null);
    setVideoReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera access denied");
    }
  };

  useEffect(() => {
    if (!showCamera || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch((e) => setError(e instanceof Error ? e.message : "Video play failed"));
    const fallback = setTimeout(() => setVideoReady(true), 1500);
    return () => {
      video.srcObject = null;
      clearTimeout(fallback);
    };
  }, [showCamera]);

  const handleVideoLoadedData = () => {
    setVideoReady(true);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
    setVideoReady(false);
    setError(null);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.srcObject) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `student-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
        stopCamera();
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  };

  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-background rounded-lg p-4 max-w-md w-full space-y-4">
          <p className="text-sm font-medium">Capture student photo</p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-md bg-black aspect-video object-cover"
            onLoadedData={handleVideoLoadedData}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!videoReady && !error && (
            <p className="text-xs text-muted-foreground">Starting camera…</p>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={capture} disabled={!videoReady}>
              Take photo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1"
      onClick={startCamera}
      disabled={disabled}
    >
      <Camera className="h-3 w-3" />
      Capture
    </Button>
  );
}
