"use client";

import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { AlertTriangle, Camera, RefreshCcw } from "lucide-react";

interface FaceCameraCaptureProps {
  image: string | null;
  onImageChange: (image: string | null) => void;
  disabled?: boolean;
  captureLabel?: string;
}

export default function FaceCameraCapture({
  image,
  onImageChange,
  disabled = false,
  captureLabel = "Chụp khuôn mặt",
}: FaceCameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

  const capture = () => {
    const screenshot = webcamRef.current?.getScreenshot() || null;
    if (screenshot) {
      onImageChange(screenshot);
    }
  };

  if (hasPermission === false) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          Không thể truy cập camera
        </div>
        <p className="mt-1 text-sm">Vui lòng cấp quyền camera để tiếp tục xác thực khuôn mặt.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
        {image ? (
          <img src={image} alt="Ảnh khuôn mặt đã chụp" className="h-64 w-full object-cover" />
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.75}
            videoConstraints={{ facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }}
            className="h-64 w-full object-cover"
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {image ? (
          <button
            type="button"
            onClick={() => onImageChange(null)}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            Chụp lại
          </button>
        ) : (
          <button
            type="button"
            onClick={capture}
            disabled={disabled || hasPermission !== true}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <Camera className="h-4 w-4" />
            {captureLabel}
          </button>
        )}
      </div>
    </div>
  );
}
