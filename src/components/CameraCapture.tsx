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
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const attachStreamToVideo = (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video
      .play()
      .then(() => setVideoReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : "Video play failed"));
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVideoReady(false);
  };

  const openStream = async (deviceId?: string | null) => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser.");
      return;
    }

    setError(null);
    setVideoReady(false);

    // Discover cameras once
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === "videoinput");
      if (videos.length > 0) {
        setVideoDevices(videos);
        if (!deviceId && !selectedDeviceId) {
          deviceId = videos[0].deviceId;
          setSelectedDeviceId(deviceId);
        }
      }
    } catch {
      // ignore; we'll still try getUserMedia
    }

    const preferDeviceId = deviceId ?? selectedDeviceId ?? undefined;
    const primaryConstraints: MediaStreamConstraints =
      preferDeviceId != null
        ? { video: { deviceId: { exact: preferDeviceId } } }
        : { video: { facingMode: "user" } };

    const fallbacks: MediaStreamConstraints[] = [{ video: true }];

    let lastError: unknown = null;
    let stream: MediaStream | null = null;

    const tryConstraints = async (constraints: MediaStreamConstraints) => {
      try {
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        return s;
      } catch (e) {
        lastError = e;
        return null;
      }
    };

    stream = await tryConstraints(primaryConstraints);
    if (!stream) {
      for (const fb of fallbacks) {
        stream = await tryConstraints(fb);
        if (stream) break;
      }
    }

    if (!stream) {
      const msg =
        lastError instanceof Error
          ? lastError.message
          : "Unable to access camera. Check permissions and that a camera is connected.";
      setError(msg);
      return;
    }

    streamRef.current = stream;
    if (!showCamera) {
      setShowCamera(true);
    }
    // When switching cameras while overlay is open, attach immediately
    if (videoRef.current) {
      attachStreamToVideo(stream);
    }
  };

  const startCamera = async () => {
    await openStream(selectedDeviceId);
  };

  useEffect(() => {
    if (!showCamera || !streamRef.current || !videoRef.current) return;
    const stream = streamRef.current;
    attachStreamToVideo(stream);
    const fallback = setTimeout(() => setVideoReady(true), 1500);
    return () => {
      const v = videoRef.current;
      if (v) v.srcObject = null;
      clearTimeout(fallback);
    };
  }, [showCamera]);

  const handleVideoLoadedData = () => {
    setVideoReady(true);
  };

  const stopCamera = () => {
    stopStream();
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Capture student photo</p>
            {videoDevices.length > 1 && (
              <select
                className="text-xs border rounded px-1 py-0.5 bg-background"
                value={selectedDeviceId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSelectedDeviceId(id);
                  stopStream();
                  openStream(id);
                }}
              >
                {videoDevices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>
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
