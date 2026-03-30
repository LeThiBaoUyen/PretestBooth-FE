"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  const hiddenRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/verify-email",
    "/booth-auth",
    "/booth/check-in",
  ];

  if (hiddenRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return null;
  }

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-navy-300 hover:text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        aria-label="Quay về trang trước"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay về
      </button>
    </div>
  );
}
