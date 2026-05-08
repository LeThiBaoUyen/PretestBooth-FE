import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/auth";
import { getTokenManager } from "../auth/tokenManager";

/**
 * Hook for managing authentication state and operations
 */
export function useAuth() {
  const tokenManager = getTokenManager();
  const queryClient = useQueryClient();

  /**
   * Get current user from cache or API
   */
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      let accessToken = tokenManager.getAccessToken();

      // On hard refresh, access token might be empty while refresh cookie is still valid.
      // Try restoring a new access token first before deciding the user is unauthenticated.
      if (!accessToken) {
        try {
          const refreshed = await apiClient.refreshToken();
          accessToken = refreshed.accessToken;
          tokenManager.saveAccessToken(accessToken);
        } catch {
          return null;
        }
      }

      try {
        const userData = await apiClient.getMe(accessToken);
        return userData;
      } catch {
        return null;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  /**
   * Get access token from cache
   */
  const { data: accessToken } = useQuery({
    queryKey: ["accessToken"],
    queryFn: () => tokenManager.getAccessToken(),
  });

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(() => {
    return tokenManager.isAuthenticated();
  }, []);

  /**
   * Login mutation
   */
  const loginMutation = useMutation({
    mutationFn: apiClient.login.bind(apiClient),
  });

  /**
   * Register mutation
   */
  const registerMutation = useMutation({
    mutationFn: apiClient.register.bind(apiClient),
  });

  /**
   * Logout mutation
   */
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = tokenManager.getAccessToken();
      if (token) {
        await apiClient.logout(token);
      }
    },
  });

  /**
   * Refresh token mutation
   */
  const refreshTokenMutation = useMutation({
    mutationFn: async () => apiClient.refreshToken(),
  });

  /**
   * Handle logout
   */
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      // Clear tokens
      tokenManager.clearTokens();
      // Clear user from cache
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    }
  }, [logoutMutation, tokenManager, queryClient]);

  /**
   * Handle login with token saving
   */
  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password });

      // Save tokens
      tokenManager.saveAccessToken(result.accessToken);

      return result;
    },
    [loginMutation, tokenManager],
  );

  /**
   * Handle token refresh
   */
  const refreshToken = useCallback(async () => {
    const result = await refreshTokenMutation.mutateAsync();

    // Save new tokens
    tokenManager.saveAccessToken(result.accessToken);

    return result;
  }, [refreshTokenMutation, tokenManager]);

  return {
    // State
    user,
    userLoading,
    accessToken,
    isAuthenticated: isAuthenticated(),

    // Mutations
    loginMutation,
    registerMutation,
    logoutMutation,
    refreshTokenMutation,

    // Methods
    login,
    logout,
    refreshToken,
  };
}
