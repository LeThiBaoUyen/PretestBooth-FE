# Token Management - Quick Reference

## Imports
```typescript
// Token Manager
import { getTokenManager } from "@/client/lib/auth/tokenManager";

// Auth Hook
import { useAuth } from "@/client/lib/hooks/useAuth";

// HTTP Client (auto refresh)
import { httpClient } from "@/client/lib/api/httpClient";

// API Client (manual tokens)
import { apiClient } from "@/client/lib/api/auth";
```

## Quick Examples

### Save Tokens (on Login)
```typescript
const tokenManager = getTokenManager();
tokenManager.saveAccessToken(response.accessToken);
tokenManager.saveRefreshToken(response.refreshToken);
```

### Get Tokens
```typescript
const tokenManager = getTokenManager();
const accessToken = tokenManager.getAccessToken();
const refreshToken = tokenManager.getRefreshToken();
```

### Check Authentication
```typescript
const { isAuthenticated } = useAuth();
if (!isAuthenticated) {
  router.push("/login");
}
```

### Make API Call (Auto Refresh)
```typescript
const data = await httpClient.get("/api/user");
// If 401: auto refreshes token and retries
```

### Logout
```typescript
const tokenManager = getTokenManager();
tokenManager.clearTokens();
router.push("/login");
```

### Refresh Token Manually
```typescript
const { refreshToken } = useAuth();
await refreshToken();
```

## Token Storage Locations

| Token | Storage | Lifespan | Use Case |
|-------|---------|----------|----------|
| **Access** | TanStack Query Cache (Memory) | 15 min | Every API request |
| **Refresh** | HTTP-only Cookie | 7 days | Refresh access token |

## Common Patterns

### Protected Route Component
```typescript
import { useAuth } from "@/client/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

export function ProtectedPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return <Dashboard />;
}
```

### API Request in Query
```typescript
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/client/lib/api/httpClient";

function useExams() {
  return useQuery({
    queryKey: ["exams"],
    queryFn: () => httpClient.get("/api/exams"),
  });
}
```

### API Request in Mutation
```typescript
import { useMutation } from "@tanstack/react-query";
import { httpClient } from "@/client/lib/api/httpClient";

function useSubmitAnswer() {
  return useMutation({
    mutationFn: (answerId) =>
      httpClient.post("/api/answers", { answerId }),
  });
}
```

### Manual Logout
```typescript
async function handleLogout() {
  const tokenManager = getTokenManager();
  const token = tokenManager.getAccessToken();

  if (token) {
    await apiClient.logout(token);
  }

  tokenManager.clearTokens();
  router.push("/login");
}
```

## Token Refresh Flow

```
User Request
    ↓
httpClient.fetch()
    ↓
Attach Access Token → Authorization: Bearer <token>
    ↓
Send Request
    ↓
401 Response?
    ├─ NO → Return Response
    └─ YES → POST /api/auth/refresh
               ↓
           Get New Tokens
               ↓
           Save New Tokens
               ↓
           Retry Original Request
               ↓
           Return Response
```

## Important Notes

⚠️ **Always use httpClient for API calls** - It handles token refresh automatically

⚠️ **Don't store access token in localStorage** - Use TanStack Query cache only

✅ **Refresh token is automatically stored in cookies** - No manual storage needed

✅ **Tokens are cleared on logout** - No need to manually delete

## Debugging

### Check Current Tokens
```typescript
const tokenManager = getTokenManager();
console.log("Access Token:", tokenManager.getAccessToken());
console.log("Refresh Token:", tokenManager.getRefreshToken());
console.log("Is Authenticated:", tokenManager.isAuthenticated());
```

### Check Cookie in Browser
```javascript
// In console
document.cookie // Look for refreshToken
```

### Check TanStack Query Cache
```typescript
// In React DevTools
// React Query tab → Queries → accessToken
```

## Error Handling

### 401 Unauthorized
- httpClient automatically refreshes token and retries
- If refresh fails, user is redirected to /login

### Invalid Refresh Token
- User is redirected to /login
- Both tokens are cleared

### Network Error During Refresh
- Original error is thrown
- User should handle or show error message

## Best Practices

1. ✅ Use `httpClient` for all API calls
2. ✅ Use `useAuth` hook to check authentication
3. ✅ Call `tokenManager.clearTokens()` on logout
4. ✅ Don't manually store tokens in localStorage
5. ✅ Always wrap app with `QueryProvider`
6. ❌ Don't use `apiClient` directly for protected routes
7. ❌ Don't check token manually on each request

## Performance

- ✅ Token access is O(1) from cache
- ✅ Token refresh is automatic on demand
- ✅ Concurrent requests queue properly
- ✅ No localStorage overhead
- ✅ No unnecessary re-renders

## Security

- ✅ Access token in memory only
- ✅ Refresh token in HTTP-only cookie
- ✅ SameSite=Strict CSRF protection
- ✅ Automatic logout on refresh failure
- ✅ Concurrent refresh prevents race conditions
