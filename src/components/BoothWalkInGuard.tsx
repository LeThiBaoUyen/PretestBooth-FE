"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/auth";
import { boothSessionManager } from "@/lib/auth/boothSession";
import { getTokenManager } from "@/lib/auth/tokenManager";

const FORCE_LOGOUT_REASON = "walkin-force-logout";

function clearWalkInRuntimeMeta() {
  const boothToken = boothSessionManager.getToken();
  const boothMeta = boothSessionManager.getMeta();

  if (!boothToken || !boothMeta) {
    return;
  }

  boothSessionManager.save(boothToken, {
    ...boothMeta,
    boothBookingType: null,
    boothAccessMode: null,
    nextExamStartTime: null,
    warnAt: null,
    forceLogoutAt: null,
    noShowGraceUntil: null,
  });
}

export default function BoothWalkInGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const warnedForForceAtRef = useRef<string | null>(null);
  const forcedForForceAtRef = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const forceLogout = async (forceAtIso: string) => {
      if (stopped || forcedForForceAtRef.current === forceAtIso) {
        return;
      }

      forcedForForceAtRef.current = forceAtIso;

      const tokenManager = getTokenManager();
      const accessToken = tokenManager.getAccessToken();

      if (accessToken) {
        try {
          await apiClient.logout(accessToken);
        } catch {
          // Continue local cleanup even if network logout fails.
        }
      }

      tokenManager.clearTokens();
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      clearWalkInRuntimeMeta();

      window.alert(
        "Đã đến thời điểm thu hồi booth cho ca EXAM kế tiếp. Hệ thống sẽ đăng xuất phiên hiện tại.",
      );

      if (pathname !== "/login") {
        router.replace(`/login?reason=${FORCE_LOGOUT_REASON}`);
      } else {
        router.refresh();
      }
    };

    const tick = () => {
      const boothToken = boothSessionManager.getToken();
      const boothMeta = boothSessionManager.getMeta();

      if (!boothToken || !boothMeta || boothMeta.boothAccessMode !== "WALK_IN") {
        warnedForForceAtRef.current = null;
        forcedForForceAtRef.current = null;
        return;
      }

      const forceAtIso = boothMeta.forceLogoutAt;
      if (!forceAtIso) {
        return;
      }

      const forceAtMs = Date.parse(forceAtIso);
      if (Number.isNaN(forceAtMs)) {
        return;
      }

      const nowMs = Date.now();
      const warnAtMs = boothMeta.warnAt ? Date.parse(boothMeta.warnAt) : Number.NaN;

      if (
        !Number.isNaN(warnAtMs) &&
        nowMs >= warnAtMs &&
        nowMs < forceAtMs &&
        warnedForForceAtRef.current !== forceAtIso
      ) {
        warnedForForceAtRef.current = forceAtIso;
        window.alert(
          "Booth sắp được thu hồi để ưu tiên ca EXAM. Vui lòng lưu tiến độ và chuẩn bị đăng xuất.",
        );
      }

      if (nowMs >= forceAtMs) {
        void forceLogout(forceAtIso);
      }
    };

    tick();

    const intervalId = window.setInterval(tick, 5000);
    const onFocus = () => tick();

    window.addEventListener("focus", onFocus);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname, queryClient, router]);

  return null;
}
