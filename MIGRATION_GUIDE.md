# Migration Guide: Token Management Update

## Summary of Changes

This guide explains how to integrate the new token management system into existing pages and components.

## What Changed

### Old Way (Deprecated)
```typescript
// Old: Using localStorage directly
authStorage.setAccessToken(token);
authStorage.setRefreshToken(refreshToken);

const token = authStorage.getAccessToken();
```

### New Way (Recommended)
```typescript
// New: Using TokenManager + TanStack Query
import { getTokenManager } from "@/client/lib/auth/tokenManager";

const tokenManager = getTokenManager();
tokenManager.saveAccessToken(token);
tokenManager.saveRefreshToken(refreshToken);

const token = tokenManager.getAccessToken();
```

## Integration Steps for Pages

### 1. Login Page (Already Updated ✅)
```typescript
import { getTokenManager } from "@/client/lib/auth/tokenManager";

const tokenManager = getTokenManager();

const loginMutation = useMutation({
  mutationFn: (data) => apiClient.login(data),
  onSuccess: (response) => {
    // Save access token to TanStack Query cache
    tokenManager.saveAccessToken(response.accessToken);
    
    // Save refresh token to cookies
    tokenManager.saveRefreshToken(response.refreshToken);
    
    // Store user info
    queryClient.setQueryData(["user"], response.user);
    
    // Navigate
    router.push("/dashboard");
  },
});
```

### 2. Register Page
```typescript
// No token saving needed on register page
// User will login afterward
```

### 3. Dashboard/Protected Pages
```typescript
import { useAuth } from "@/client/lib/hooks/useAuth";

export function Dashboard() {
  const { accessToken, isAuthenticated } = useAuth();

  // Check if authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Use httpClient for requests (auto refresh)
  const { data } = useQuery({
    queryKey: ["exams"],
    queryFn: () => httpClient.get("/api/exams"),
  });
}
```

### 4. Logout
```typescript
import { getTokenManager } from "@/client/lib/auth/tokenManager";

const handleLogout = async () => {
  const tokenManager = getTokenManager();
  const token = tokenManager.getAccessToken();
  
  // Call logout API
  if (token) {
    await apiClient.logout(token);
  }
  
  // Clear tokens
  tokenManager.clearTokens();
  
  // Navigate to login
  router.push("/login");
};
```

### 5. Protected API Calls
```typescript
import { httpClient } from "@/client/lib/api/httpClient";

// Option 1: Using httpClient (recommended)
const data = await httpClient.post("/api/resource", body);

// Option 2: Using manual token
import { getTokenManager } from "@/client/lib/auth/tokenManager";

const tokenManager = getTokenManager();
const token = tokenManager.getAccessToken();

const response = await fetch("/api/resource", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(data),
});
```

## Available Utilities

### TokenManager
```typescript
import { getTokenManager } from "@/client/lib/auth/tokenManager";

const tokenManager = getTokenManager();

// Access Token (TanStack Query cache)
tokenManager.saveAccessToken(token);
tokenManager.getAccessToken();

// Refresh Token (Cookies)
tokenManager.saveRefreshToken(token);
tokenManager.getRefreshToken();

// Utilities
tokenManager.clearTokens();
tokenManager.isAuthenticated();
tokenManager.hasAccessToken();
tokenManager.hasRefreshToken();
```

### useAuth Hook
```typescript
import { useAuth } from "@/client/lib/hooks/useAuth";

const {
  user,                      // User data from cache
  userLoading,              // Loading state
  accessToken,              // Current access token
  isAuthenticated,          // Is user authenticated
  
  loginMutation,            // useMutation for login
  registerMutation,         // useMutation for register
  logoutMutation,          // useMutation for logout
  refreshTokenMutation,    // useMutation for refresh
  
  login,                   // login(email, password) - saves tokens
  logout,                  // logout() - clears tokens
  refreshToken,           // refreshToken() - gets new token
} = useAuth();
```

### httpClient
```typescript
import { httpClient } from "@/client/lib/api/httpClient";

// GET
await httpClient.get<T>(endpoint);

// POST
await httpClient.post<T>(endpoint, body);

// PUT
await httpClient.put<T>(endpoint, body);

// PATCH
await httpClient.patch<T>(endpoint, body);

// DELETE
await httpClient.delete<T>(endpoint);
```

## Key Features

✅ **Automatic Token Refresh**
- On 401 response, automatically refreshes token
- Retries original request
- Handles concurrent requests correctly

✅ **Secure Cookies**
- Refresh token stored in secure HTTP-only cookies
- Survives page refresh
- Protected against XSS attacks

✅ **In-Memory Access Token**
- Access token in TanStack Query cache
- Fast access
- Cleaned up on logout

✅ **Easy Integration**
- Simple API for token management
- React hooks for auth state
- Automatic interceptor for API calls

## Testing Token Refresh

### Manual Test Steps
1. Login to the application
2. Wait or set a breakpoint when the access token is about to expire (15 min)
3. Make an API request
4. Observe that a refresh token request is made automatically
5. Original request should succeed with new token

### Verify in Browser
```javascript
// In browser console
document.cookie // Check for refreshToken cookie
// Look for localStorage → accessToken key in DevTools
```

## Troubleshooting

### Issue: Token not persisting after refresh
**Solution**: Check if cookies are enabled in browser. The refresh token is stored in cookies.

### Issue: 401 errors keep happening
**Solution**: Check that `/api/auth/refresh` endpoint is working correctly and returning new tokens.

### Issue: "TokenManager not initialized" error
**Solution**: Ensure QueryProvider wraps the entire app in `layout.tsx`

### Issue: Refresh token call is failing
**Solution**: 
1. Check that backend refresh endpoint exists at `/api/auth/refresh`
2. Verify refresh token is being sent in request body
3. Check CORS settings

## Example: Complete Login Flow

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/client/lib/api/auth";
import { getTokenManager } from "@/client/lib/auth/tokenManager";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tokenManager = getTokenManager();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => apiClient.login({ email, password }),
    onSuccess: (response) => {
      // 1. Save access token to TanStack Query
      tokenManager.saveAccessToken(response.accessToken);
      
      // 2. Save refresh token to cookies
      tokenManager.saveRefreshToken(response.refreshToken);
      
      // 3. Save user info
      queryClient.setQueryData(["user"], response.user);
      
      // 4. Navigate
      router.push("/dashboard");
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        loginMutation.mutate();
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button disabled={loginMutation.isPending}>
        {loginMutation.isPending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
```

## Next Steps

1. ✅ Update login page (DONE)
2. Update register page - save tokens after registration (optional)
3. Update dashboard page - use useAuth hook for protection
4. Update logout button - call logout from useAuth
5. Update all API calls - use httpClient instead of fetch
6. Add protected route component using isAuthenticated
7. Test token refresh by making requests near token expiration

## Backend Requirements

Ensure your backend implements:

1. `/api/auth/login` - Returns `{ accessToken, refreshToken, user }`
2. `/api/auth/refresh` - Accepts `{ refreshToken }`, returns `{ accessToken, refreshToken }`
3. Protected endpoints check `Authorization: Bearer <token>` header
4. Return 401 on invalid/expired access token
