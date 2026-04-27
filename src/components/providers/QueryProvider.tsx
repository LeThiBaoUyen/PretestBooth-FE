"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import {
  initializeTokenManager,
  getTokenManager,
} from "@/lib/auth/tokenManager";

const queryClient = new QueryClient();

// Initialize token manager with query client
initializeTokenManager(queryClient);

function RefreshTokenProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const tokenManager = getTokenManager();

    // Initialize: Try to restore access token from refresh token
    const initializeAuth = async () => {
      const accessToken = tokenManager.getAccessToken();

      // If access token is missing, try restoring session from HttpOnly refresh cookie.
      if (!accessToken) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            },
          );

          if (response.ok) {
            const jsonResponse = await response.json();
            // Backend wraps responses in { statusCode, message, data }
            const data = jsonResponse.data || jsonResponse;
            tokenManager.saveAccessToken(data.accessToken);

            // Invalidate user query to trigger a refetch
            queryClient.invalidateQueries({ queryKey: ["user"] });
          } else {
            tokenManager.clearTokens();
          }
        } catch (error) {
          tokenManager.clearTokens();
        }
      }
    };

    initializeAuth();

    // Refresh token every 14 minutes (before access token expires at 15 minutes)
    const REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes

    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (response.ok) {
          const jsonResponse = await response.json();
          // Backend wraps responses in { statusCode, message, data }
          const data = jsonResponse.data || jsonResponse;
          tokenManager.saveAccessToken(data.accessToken);
        } else if (response.status === 401 || response.status === 403) {
          // Refresh token is invalid/expired, clear access token state.
          tokenManager.clearTokens();
          queryClient.invalidateQueries({ queryKey: ["user"] });
        }
      } catch (error) {
        // Silent error - will retry on next interval
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, []);

  return <>{children}</>;
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RefreshTokenProvider>{children}</RefreshTokenProvider>
    </QueryClientProvider>
  );
}
