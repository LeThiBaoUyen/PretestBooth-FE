# Token Management Implementation

## Overview
This document describes the token management system that has been implemented in the PretestBooth-FE application. The system handles:
- **Access Token**: Stored in TanStack Query cache (memory) - 15 minute lifespan
- **Refresh Token**: Stored in HTTP-only cookies (secure, persistent)
- **Automatic Token Refresh**: Handles 401 responses and refreshes access token automatically

## Architecture

### 1. Token Manager (`src/client/lib/auth/tokenManager.ts`)
Central utility for managing tokens:

```typescript
// Save/Get access token in TanStack Query
tokenManager.saveAccessToken(token)
tokenManager.getAccessToken()

// Save/Get refresh token in cookies
tokenManager.saveRefreshToken(token)
tokenManager.getRefreshToken()

// Clear both tokens
tokenManager.clearTokens()

// Check authentication status
tokenManager.isAuthenticated()
```

### 2. Query Provider Updates (`src/client/app/QueryProvider.tsx`)
- Initializes `TokenManager` when the app starts
- Ensures token manager is available throughout the application

### 3. HTTP Client (`src/client/lib/api/httpClient.ts`)
Handles automatic token refresh logic:

**Features:**
- Automatically attaches access token to all requests in Authorization header
- On 401 response, automatically calls `/api/auth/refresh` endpoint
- Refreshes access token and retries the original request
- Handles concurrent refresh requests (only one refresh happens at a time)
- Queues requests waiting for token refresh to complete
- Redirects to login on refresh failure

**Usage:**
```typescript
import { httpClient } from "@/client/lib/api/httpClient";

// GET request
const data = await httpClient.get<User>("/api/user");

// POST request
const result = await httpClient.post<LoginResponse>("/api/auth/login", { email, password });

// PUT/PATCH/DELETE
await httpClient.put("/api/resource", data);
```

### 4. Auth Hook (`src/client/lib/hooks/useAuth.ts`)
React hook for auth operations:

```typescript
const {
  user,              // Current user
  accessToken,       // Current access token
  isAuthenticated,   // Auth status
  
  // Mutations
  loginMutation,
  registerMutation,
  logoutMutation,
  refreshTokenMutation,
  
  // Methods
  login,             // Login and save tokens
  logout,            // Logout and clear tokens
  refreshToken       // Refresh access token
} = useAuth();
```

### 5. Updated Login Page
Changes in `src/client/app/login/page.tsx`:
- Imports `getTokenManager`
- On successful login:
  - Saves access token to TanStack Query via `tokenManager.saveAccessToken()`
  - Saves refresh token to cookies via `tokenManager.saveRefreshToken()`
  - Stores user info in query cache

## Token Refresh Flow

### Automatic Refresh on 401
1. API request returns 401 Unauthorized
2. HTTP client detects 401 response
3. Calls `/api/auth/refresh` with refresh token
4. Backend returns new access token and refresh token
5. HTTP client saves new tokens
6. Retries original request with new access token
7. Returns response to original caller

### Flow Diagram
```
Request → 401 Response → Refresh Token Call → New Tokens Saved → Retry Request → Success
```

## Cookies vs Memory Storage

### Access Token (Memory/TanStack Query)
- **Why**: Shorter lifespan (15 min), frequently accessed
- **Pros**: Fast access, automatic cache invalidation
- **Cons**: Lost on page refresh (requires re-login if no valid refresh token)

### Refresh Token (Cookies)
- **Why**: Longer lifespan (7 days), should survive page refresh
- **Pros**: Survives page refresh, can set httpOnly flag for security
- **Cons**: Slower access, larger overhead
- **Cookie Settings**:
  - `httpOnly`: true (prevents XSS attacks)
  - `SameSite`: Strict (prevents CSRF attacks)
  - `max-age`: 7 days (604800 seconds)
  - `path`: / (available site-wide)

## Backend Integration

### Required Backend Endpoints
1. `POST /api/auth/login` - Returns `{ accessToken, refreshToken, user }`
2. `POST /api/auth/refresh` - Accepts `{ refreshToken }`, returns `{ accessToken, refreshToken }`
3. Protected endpoints should check Authorization header: `Bearer <accessToken>`

### Token Lifespans
- **Access Token**: 15 minutes (as per requirements)
- **Refresh Token**: 7 days

## Usage Examples

### Login
```typescript
const result = await login("user@example.com", "password");
// Tokens automatically saved
```

### Making Authenticated Requests
```typescript
// Using httpClient (automatic token refresh)
const user = await httpClient.get<User>("/api/user");

// Or using useAuth hook
const { accessToken } = useAuth();
// Manual request with token
const response = await fetch("/api/endpoint", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

### Logout
```typescript
const { logout } = useAuth();
await logout();
// Both tokens cleared
```

### Manual Token Refresh
```typescript
const { refreshToken } = useAuth();
const newTokens = await refreshToken();
```

## Security Considerations

1. ✅ **Access token in memory only** - No persistent storage on disk
2. ✅ **Refresh token in secure cookies** - httpOnly flag prevents XSS
3. ✅ **SameSite=Strict** - Prevents CSRF attacks
4. ✅ **Automatic refresh** - Seamless user experience
5. ✅ **Concurrent request handling** - Only one refresh happens at a time
6. ⚠️ **HTTPS Required** - Should always be used in production

## Future Improvements

1. Add token expiration check before requests (predict refresh)
2. Implement refresh token rotation
3. Add token refresh event listeners
4. Implement refresh retry logic with exponential backoff
5. Add logging/debugging utilities for token management
6. Create middleware for automatic logout after extended inactivity

## Files Created/Modified

### New Files
- `src/client/lib/auth/tokenManager.ts` - Token management utility
- `src/client/lib/api/httpClient.ts` - HTTP client with auto refresh
- `src/client/lib/hooks/useAuth.ts` - Auth hook

### Modified Files
- `src/client/app/QueryProvider.tsx` - Initialize token manager
- `src/client/app/login/page.tsx` - Save tokens on login

### Deprecated Files
- `src/client/lib/auth/storage.ts` - No longer used (uses TanStack Query instead)
- `src/client/lib/auth/AuthContext.tsx` - No longer used (uses TanStack Query instead)
