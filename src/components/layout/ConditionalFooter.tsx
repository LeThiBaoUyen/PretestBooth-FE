"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

function shouldHideFooter(pathname: string) {
  if (pathname === "/quiz" || pathname.startsWith("/quiz/")) {
    return true;
  }

  // Hide footer only while a practice session is running: /practice/{sessionId}
  return /^\/practice\/[^/]+\/?$/.test(pathname);
}

export default function ConditionalFooter() {
  const pathname = usePathname() || "";

  if (shouldHideFooter(pathname)) {
    return null;
  }

  return <Footer />;
}
