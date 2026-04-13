"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type ParentRule = {
  pattern: RegExp;
  getParentPath: (match: RegExpMatchArray) => string;
};

const PARENT_RULES: ParentRule[] = [
  {
    pattern: /^\/dashboard\/exams\/([^/]+)\/edit$/,
    getParentPath: (match) => `/dashboard/exams/${match[1]}`,
  },
  {
    pattern: /^\/dashboard\/exams\/([^/]+)$/,
    getParentPath: () => "/dashboard/exams",
  },
  {
    pattern: /^\/dashboard\/booths\/schedule$/,
    getParentPath: () => "/dashboard/booths",
  },
  {
    pattern: /^\/admin\/booths\/schedule$/,
    getParentPath: () => "/admin/booths",
  },
  {
    pattern: /^\/admin\/booths\/monitoring$/,
    getParentPath: () => "/admin/booths",
  },
  {
    pattern: /^\/admin\/student\/cohort\/([^/]+)\/class\/([^/]+)$/,
    getParentPath: (match) => `/admin/student/cohort/${match[1]}`,
  },
  {
    pattern: /^\/admin\/student\/cohort\/([^/]+)$/,
    getParentPath: () => "/admin/student",
  },
  {
    pattern: /^\/exams\/([^/]+)\/edit$/,
    getParentPath: (match) => `/exams/${match[1]}`,
  },
  {
    pattern: /^\/exams\/([^/]+)$/,
    getParentPath: () => "/exams",
  },
  {
    pattern: /^\/exams\/prepare$/,
    getParentPath: () => "/exams",
  },
  {
    pattern: /^\/question-bank\/review$/,
    getParentPath: () => "/question-bank",
  },
  {
    pattern: /^\/question-bank\/problems$/,
    getParentPath: () => "/question-bank",
  },
  {
    pattern: /^\/question-bank\/problems\/([^/]+)\/edit$/,
    getParentPath: (match) => `/question-bank/problems/${match[1]}`,
  },
  {
    pattern: /^\/question-bank\/problems\/([^/]+)$/,
    getParentPath: () => "/question-bank/problems",
  },
  {
    pattern: /^\/question-bank\/problems\/create$/,
    getParentPath: () => "/question-bank/problems",
  },
  {
    pattern: /^\/question-bank\/questions\/([^/]+)\/edit$/,
    getParentPath: (match) => `/question-bank/questions/${match[1]}`,
  },
  {
    pattern: /^\/question-bank\/questions$/,
    getParentPath: () => "/question-bank",
  },
  {
    pattern: /^\/question-bank\/questions\/([^/]+)$/,
    getParentPath: () => "/question-bank/questions",
  },
  {
    pattern: /^\/question-bank\/questions\/create$/,
    getParentPath: () => "/question-bank/questions",
  },
  {
    pattern: /^\/problems\/([^/]+)$/,
    getParentPath: () => "/problems",
  },
  {
    pattern: /^\/submissions\/exam\/([^/]+)$/,
    getParentPath: () => "/submissions",
  },
  {
    pattern: /^\/submissions\/tests\/([^/]+)\/([^/]+)$/,
    getParentPath: () => "/submissions",
  },
  {
    pattern: /^\/submissions\/([^/]+)$/,
    getParentPath: () => "/submissions",
  },
];

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

function resolveParentPath(pathname: string): string | null {
  const normalizedPath = normalizePath(pathname);

  for (const rule of PARENT_RULES) {
    const match = normalizedPath.match(rule.pattern);
    if (match) {
      return rule.getParentPath(match);
    }
  }

  return null;
}

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const parentPath = useMemo(() => resolveParentPath(pathname), [pathname]);

  if (!parentPath) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.push(parentPath)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-navy-300 hover:text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        aria-label="Quay về trang cha"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay về
      </button>
    </div>
  );
}
