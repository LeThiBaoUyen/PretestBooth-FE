"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { ShieldAlert, Video, AlertTriangle } from "lucide-react";
import { proctoringApi } from "@/lib/api/proctoring";
import type { ProctoringEventType } from "@/lib/api/proctoring";

interface ProctoringOverlayProps {
  sessionId: string;
  isActive?: boolean;
}

const PROCTORING_NOTICE_KEY = "proctoring_violation_notice";

export default function ProctoringOverlay({ sessionId, isActive = true }: ProctoringOverlayProps) {
  const webcamRef = useRef<Webcam>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  const redirectWithViolationNotice = useCallback((path: string, title: string, description: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        PROCTORING_NOTICE_KEY,
        JSON.stringify({
          title,
          description,
          createdAt: new Date().toISOString(),
        }),
      );
      window.location.assign(path);
    }
  }, []);

  // Request camera early
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

  const report = useCallback(async (eventType: ProctoringEventType, message: string) => {
    if (!isActive) return;
    try {
      // In a real app we might capture a screenshot here
      // const imageSrc = webcamRef.current?.getScreenshot();
      
      const res = await proctoringApi.reportEvent({
        sessionId,
        eventType,
      });

      // Show temporary warning
      setWarnings(prev => [message, ...prev].slice(0, 3));
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);

      // Handle immediate termination for EXAM
      if (res.actionTaken === "EXAM_TERMINATED_TAB_SWITCH") {
        redirectWithViolationNotice(
          "/dashboard",
          "Bạn đã vi phạm quy chế thi",
          "Phiên thi đã bị kết thúc vì bạn chuyển tab/rời khỏi màn hình thi.",
        );
        return;
      }

      // Handle termination for PRACTICE  
      if (res.actionTaken === "PRACTICE_TERMINATED_TAB_SWITCH") {
        redirectWithViolationNotice(
          "/practice",
          "Bạn đã vi phạm quy định phiên luyện tập",
          "Phiên luyện tập đã kết thúc vì bạn rời khỏi màn hình làm bài.",
        );
        return;
      }

      // Legacy handling for EXAM_CANCELLED (from other violations)
      if (res.actionTaken === "EXAM_CANCELLED") {
        redirectWithViolationNotice(
          "/dashboard",
          "Bạn đã vi phạm quy chế thi",
          "Bài thi đã bị hủy do mức độ vi phạm vượt ngưỡng cho phép.",
        );
      }
    } catch (err) {
      console.error("Proctoring report failed:", err);
    }
  }, [sessionId, isActive, redirectWithViolationNotice]);

  // Monitor visibility and focus
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        report("TAB_SWITCH", "Cảnh báo: Bạn đã chuyển tab hoặc thoát khỏi màn hình thi!");
      }
    };

    const handleBlur = () => {
      report("WINDOW_BLUR", "Cảnh báo: Cửa sổ thi đã mất tiêu điểm!");
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      report("COPY_PASTE", "Cảnh báo: Hành động Copy/Paste không được phép!");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
    };
  }, [isActive, report]);

  if (!isActive) return null;

  return (
    <>
      {/* Floating Camera UI */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
        {showWarning && (
          <div className="bg-red-500 text-white p-4 rounded-xl shadow-2xl mb-4 max-w-sm border border-red-600 animate-bounce pointer-events-auto">
            <div className="flex items-center font-bold mb-1">
              <ShieldAlert className="w-5 h-5 mr-2" />
              CẢNH BÁO GIÁM THỊ
            </div>
            <p className="text-sm">{warnings[0]}</p>
          </div>
        )}

        <div className="bg-black rounded-lg overflow-hidden shadow-2xl relative w-48 aspect-video border-2 border-slate-800 pointer-events-auto">
          {hasPermission === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-red-500 p-2 text-center text-xs">
              <AlertTriangle className="w-6 h-6 mb-1" />
              Yêu cầu cấp quyền Camera để thi
            </div>
          ) : (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="object-cover w-full h-full"
              />
              <div className="absolute top-2 left-2 flex items-center bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white mr-1"></span> REC
              </div>
              <div className="absolute bottom-1 right-2 text-white/50">
                <Video className="w-4 h-4" />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
