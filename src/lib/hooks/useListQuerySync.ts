"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { rememberListQuery } from "@/lib/navigation/listQueryPersistence";

// Sync a list page's filter state to the URL and remember it in sessionStorage.
// Guard against running when the current route is a child/detail route to avoid
// forcibly navigating back to the list (causing the "tự động quay về" bug).
export function useListQuerySync(listPath: string, queryString: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPath = usePathname();

  useEffect(() => {
    rememberListQuery(listPath, queryString);

    // Only canonicalize the URL when we're currently on the exact list path.
    // If we're on a child/detail route (e.g. `/question-bank/questions/123`),
    // do not call router.replace to avoid navigating back to the list.
    if (!currentPath || currentPath !== listPath) return;

    const currentQuery = searchParams.toString();
    if (currentQuery === queryString) {
      return;
    }

    const nextUrl = queryString ? `${listPath}?${queryString}` : listPath;
    router.replace(nextUrl, { scroll: false });
  }, [listPath, queryString, router, searchParams, currentPath]);
}