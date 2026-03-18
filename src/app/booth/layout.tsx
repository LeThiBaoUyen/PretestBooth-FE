"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/auth";
import { boothSessionManager } from "@/lib/auth/boothSession";

export default function BoothLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const validateBoothSession = async () => {
      const token = boothSessionManager.getToken();
      const meta = boothSessionManager.getMeta();

      if (!token || !meta) {
        boothSessionManager.clear();
        router.replace("/booth-auth");
        return;
      }

      try {
        await apiClient.getBoothSessionStatus(token);
        if (!mounted) return;
        setReady(true);
      } catch {
        boothSessionManager.clear();
        if (!mounted) return;
        router.replace("/booth-auth");
      }
    };

    setReady(false);
    validateBoothSession();

    return () => {
      mounted = false;
    };
  }, [router, pathname]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <span className="text-slate-300">Đang xác minh kiosk booth...</span>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
