# Architecture & Components Visual Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App (Next.js)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           QueryProvider (Initialize TokenManager)       │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                    │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │              React Components                           │  │
│  │  ┌──────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │  Login Page      │  │  Protected Pages (Dashboard)│ │  │
│  │  │  - Form submit   │  │  - useAuth() hook           │ │  │
│  │  │  - Save tokens   │  │  - Check isAuthenticated    │ │  │
│  │  └────────┬─────────┘  │  - Display user data        │ │  │
│  │           │            └─────────┬──────────────────┘ │  │
│  │           │                      │                    │  │
│  │  ┌────────▼──────────────────────▼──────────────────┐ │  │
│  │  │         useAuth() Hook                          │ │  │
│  │  │  - login(email, password)                       │ │  │
│  │  │  - logout()                                     │ │  │
│  │  │  - refreshToken()                              │ │  │
│  │  │  - State: isAuthenticated, accessToken, user   │ │  │
│  │  └────────┬──────────────────────────────────────┘ │  │
│  │           │                                         │  │
│  │  ┌────────▼──────────────────────────────────────┐ │  │
│  │  │       API Calls (Component Level)            │ │  │
│  │  │  - httpClient.get()                          │ │  │
│  │  │  - httpClient.post()                         │ │  │
│  │  │  - httpClient.put()                          │ │  │
│  │  └────────┬──────────────────────────────────────┘ │  │
│  └───────────┼──────────────────────────────────────────┘  │
└──────────────┼─────────────────────────────────────────────┘
               │
               ▼ All API calls go through here
      ┌────────────────────┐
      │   HTTP Client      │
      │ (httpClient.ts)    │
      └────────┬───────────┘
               │
   ┌───────────┼──────────────────┐
   │           │                  │
   ▼           ▼                  ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐
│ Token Manager    │  │  API Request     │  │  Error Check │
│ - Get token from │  │  - Attach token  │  │  - 401?      │
│   cache/cookie   │  │  - Set headers   │  │  - Yes:      │
└──────────────────┘  │  - Send request  │  │    Refresh   │
                      └──────────────────┘  └──────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │         Backend API Server             │
         │  - /api/auth/login                    │
         │  - /api/auth/refresh                  │
         │  - /api/* (protected endpoints)       │
         └────────────────────────────────────────┘
                    ▲              ▲
                    │              │
        ┌───────────┘              └───────────┐
        │                                      │
        │ Login Response                       │ Refresh Response
        │ - accessToken                        │ - accessToken
        │ - refreshToken                       │ - refreshToken
        │ - user                               │
        │                                      │
        ▼                                      ▼
   ┌──────────────────────────────────────────────────────┐
   │         Token Storage                               │
   │  ┌────────────────────────────────────────────────┐ │
   │  │ Access Token (TanStack Query Cache)          │ │
   │  │ - Duration: 15 minutes                        │ │
   │  │ - Access: O(1) lookup                         │ │
   │  │ - Security: Memory only (XSS safe)           │ │
   │  └────────────────────────────────────────────────┘ │
   │  ┌────────────────────────────────────────────────┐ │
   │  │ Refresh Token (HTTP-only Cookie)             │ │
   │  │ - Duration: 7 days                            │ │
   │  │ - Security: HTTP-only, SameSite=Strict       │ │
   │  │ - Persistence: Survives page refresh         │ │
   │  └────────────────────────────────────────────────┘ │
   └──────────────────────────────────────────────────────┘
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Flow                           │
└─────────────────────────────────────────────────────────────────┘

         ┌──────────────┐
         │  User Login  │
         └──────┬───────┘
                │
                ▼
         ┌──────────────────────┐
         │  Login Page          │
         │  - User submits form  │
         └──────┬───────────────┘
                │
                ▼
         ┌──────────────────────┐
         │  apiClient.login()   │
         │  (auth.ts)           │
         └──────┬───────────────┘
                │
                ▼
         ┌──────────────────────┐
         │  POST /api/login     │
         │  (Backend)           │
         └──────┬───────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼ Success               ▼ Error
    
    ┌──────────────────────────────────────┐
    │  Response                            │
    │  {                                   │
    │    accessToken: "...",              │
    │    refreshToken: "...",             │
    │    user: {...}                      │
    │  }                                   │
    └──────────────┬───────────────────────┘
                   │
    ┌──────────────┴──────────────┬───────────────────┐
    │                             │                   │
    ▼                             ▼                   ▼
    
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────┐
│ Save Access Token    │  │ Save Refresh Token   │  │ Save     │
│ tokenManager.save    │  │ tokenManager.save    │  │ User     │
│ AccessToken()        │  │ RefreshToken()       │  │ in Query │
│                      │  │                      │  │ Cache    │
│ ↓ Storage Location   │  │ ↓ Storage Location   │  │          │
│ TanStack Query Cache │  │ HTTP-only Cookie     │  └──────────┘
│ (Memory)             │  │ (Persistent)         │
│ Duration: 15 min     │  │ Duration: 7 days     │
└──────────────────────┘  └──────────────────────┘
    │                             │
    └─────────────────┬───────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │ Navigate to Dashboard │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ User Authenticated   │
            │ Session Active       │
            │ Ready for API calls  │
            └──────────────────────┘
```

## Token Refresh Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                    Token Refresh Process                           │
└────────────────────────────────────────────────────────────────────┘

    Component makes API call
            │
            ▼
    ┌───────────────────────────┐
    │  httpClient.get()         │
    │  httpClient.post()        │
    │  etc.                     │
    └────────────┬──────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Get Access Token                │
    │  tokenManager.getAccessToken()   │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Attach Authorization Header     │
    │  Authorization: Bearer <token>   │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Send Request to Backend         │
    └────────────┬─────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼ 200 OK          ▼ 401 Unauthorized
        
    ┌──────────────┐  ┌────────────────────────────────┐
    │ Return Data  │  │ Is refresh already in progress?│
    │ to Component │  └────────────┬───────────────────┘
    │              │               │
    │ Done ✓       │     ┌─────────┴────────┐
    └──────────────┘     │ No               │ Yes (Queue)
                         │                  │
                    ┌────▼──────────────────▼───┐
                    │ Lock refresh (prevent     │
                    │ multiple simultaneous     │
                    │ refresh requests)         │
                    └────┬─────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │ POST /api/auth/refresh    │
                    │ Body: { refreshToken }    │
                    └────┬─────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │ Get Refresh Token         │
                    │ from Cookie               │
                    │ tokenManager.get          │
                    │ RefreshToken()            │
                    └────┬─────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │ Backend validates token   │
                    └────┬──────────┬──────────┘
                         │          │
                         │ Valid    │ Invalid
                         ▼          ▼
                    ┌──────────┐  ┌─────────────────────┐
                    │New Tokens│  │ Clear tokens        │
                    │returned  │  │ Redirect to /login  │
                    │          │  │ (automatic)         │
                    └────┬─────┘  └─────────────────────┘
                         │
                    ┌────▼──────────────────────────────┐
                    │ Save New Tokens                   │
                    │ - Access → TanStack Query cache   │
                    │ - Refresh → Cookie               │
                    └────┬──────────────────────────────┘
                         │
                    ┌────▼──────────────────────────────┐
                    │ Unlock refresh                    │
                    └────┬──────────────────────────────┘
                         │
                    ┌────▼──────────────────────────────┐
                    │ Notify queued requests            │
                    │ (Process queue)                   │
                    └────┬──────────────────────────────┘
                         │
                    ┌────▼──────────────────────────────┐
                    │ Retry Original Request            │
                    │ with New Token                    │
                    └────┬──────────────────────────────┘
                         │
                    ┌────▼──────────────────────────────┐
                    │ Return Response                   │
                    │ to Component                      │
                    │                                  │
                    │ Done ✓                           │
                    └───────────────────────────────────┘
```

## Data Structure Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              Token Storage Locations                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              TanStack Query Cache (Memory)                  │
│                                                             │
│  queryKey: ["accessToken"]                                │
│  data: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."          │
│                                                             │
│  Properties:                                               │
│  - Lifetime: 15 minutes (or until logout)                 │
│  - Access Speed: O(1) - Very fast                         │
│  - Security: XSS safe (not in DOM)                        │
│  - Persistence: Lost on page refresh                      │
│  - Automatic Cleanup: On logout or expiration            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 HTTP-Only Cookie                            │
│                                                             │
│  Name: refreshToken                                        │
│  Value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."         │
│                                                             │
│  Properties:                                               │
│  - Lifetime: 7 days                                       │
│  - Access Speed: ~2ms (slower than cache)                 │
│  - Security:                                              │
│    • HTTP-only: Cannot be accessed via JavaScript        │
│    • SameSite=Strict: CSRF protection                    │
│    • Secure: HTTPS only (in production)                  │
│  - Persistence: Survives page refresh                    │
│  - Automatic Transmission: Sent with every request       │
│                                                             │
│  Cookie Header:                                            │
│  Set-Cookie: refreshToken=...; HttpOnly; SameSite=Strict │
│                               Path=/; Max-Age=604800       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            TanStack Query Cache (User Data)                │
│                                                             │
│  queryKey: ["user"]                                       │
│  data: {                                                   │
│    id: "uuid-123",                                        │
│    email: "user@example.com",                            │
│    role: "STUDENT",                                       │
│    isEmailVerified: true                                 │
│  }                                                         │
│                                                             │
│  Properties:                                               │
│  - Lifetime: Session (until logout)                      │
│  - Access Speed: O(1) - Very fast                        │
│  - Usage: Display user info, authorization checks      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         Request Headers (Automatic Assembly)               │
│                                                             │
│  When httpClient makes a request:                         │
│                                                             │
│  GET /api/user HTTP/1.1                                   │
│  Host: api.example.com                                    │
│  Content-Type: application/json                          │
│  Authorization: Bearer eyJhbGciOiJIUzI1NiI...           │
│  Cookie: refreshToken=eyJhbGciOiJIUzI1NiI...; ...       │
│                                                             │
│  Components:                                               │
│  - Authorization: From TanStack Query cache              │
│  - Cookie: Automatically included by browser            │
│    (HTTP-only cookies sent automatically)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Method Calling Diagram

```
┌─────────────────────────────────────────────────────────────┐
│           How to Call Token Management APIs                │
└─────────────────────────────────────────────────────────────┘

Component:
┌─────────────────────────────────────────┐
│  Option 1: Use useAuth Hook             │
│                                         │
│  const { login, logout } = useAuth();   │
│  await login("email@ex.com", "pass");  │
│  await logout();                        │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Option 2: Use TokenManager Directly    │
│                                         │
│  const tm = getTokenManager();          │
│  tm.saveAccessToken(token);             │
│  const token = tm.getAccessToken();    │
│  tm.clearTokens();                      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Option 3: Use httpClient               │
│                                         │
│  const data = await                     │
│    httpClient.get("/api/resource");    │
│  const result = await                   │
│    httpClient.post("/api/resource", ..);
└────────┬────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  All options eventually use TokenManager internally      │
│  and handle 401 refresh automatically                   │
└──────────────────────────────────────────────────────────┘
```

---

This visual guide helps understand the architecture and data flow of the token management system.
