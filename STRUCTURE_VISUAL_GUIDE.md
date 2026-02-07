# NextJS Project Structure - Visual Guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PretestBooth-FE                          │
│                    (Next.js 16+)                            │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
    ┌────▼────┐       ┌───▼────┐      ┌──▼──────┐
    │  src/   │       │ public │      │ Config  │
    │  app/   │       │        │      │ Files   │
    │         │       │assets/ │      │         │
    └────┬────┘       └────────┘      └─────────┘
         │
         ├─ (auth)           [Auth Routes Group]
         │  ├─ login/
         │  ├─ register/
         │  ├─ forgot/
         │  ├─ reset/
         │  └─ verify-email/
         │
         ├─ dashboard/       [Protected Route]
         ├─ exam/            [Protected Route]
         ├─ quiz/            [Protected Route]
         │
         ├─ layout.tsx       [Root Layout + Providers]
         ├─ page.tsx         [Home Page]
         └─ globals.css      [Global Styles]
```

---

## 📂 Complete Directory Tree

```
src/
│
├── 📁 app/                          Next.js Routes
│   ├── 📁 (auth)/                   Auth Routes Group (URL: /login, not /auth/login)
│   │   ├── 📁 login/
│   │   │   └── page.tsx             Route: /login
│   │   ├── 📁 register/
│   │   │   └── page.tsx             Route: /register
│   │   ├── 📁 forgot/
│   │   │   └── page.tsx             Route: /forgot
│   │   ├── 📁 reset/
│   │   │   └── page.tsx             Route: /reset
│   │   ├── 📁 verify-email/
│   │   │   └── page.tsx             Route: /verify-email
│   │   └── 📁 auth-verify/
│   │       └── 📁 verify-email/
│   │           └── page.tsx         Route: /auth/verify-email
│   │
│   ├── 📁 dashboard/
│   │   ├── ExamSelection.tsx        Component
│   │   ├── ExamLibrary.tsx          Component
│   │   ├── ExamDetailModal.tsx      Component
│   │   └── page.tsx                 Route: /dashboard
│   │
│   ├── 📁 exam/
│   │   └── page.tsx                 Route: /exam
│   │
│   ├── 📁 quiz/
│   │   └── page.tsx                 Route: /quiz
│   │
│   ├── layout.tsx                   Root Layout with Providers
│   ├── page.tsx                     Home Page (Route: /)
│   └── globals.css                  Global Styles
│
├── 📁 components/                   Reusable Components
│   ├── 📁 providers/
│   │   └── QueryProvider.tsx        TanStack Query Provider
│   │
│   ├── 📁 exam/
│   │   ├── CodeEditor.tsx
│   │   ├── DescriptionTab.tsx
│   │   ├── ExamHeader.tsx
│   │   ├── ExamTabs.tsx
│   │   ├── ResultTab.tsx
│   │   ├── TestCaseTab.tsx
│   │   └── index.ts
│   │
│   ├── 📁 quiz/
│   │   └── QuizScreen.tsx
│   │
│   ├── 📁 subject/
│   │   ├── SubjectSelector.tsx
│   │   ├── ExamSetSelector.tsx
│   │   └── ImportQuestionTheme.tsx
│   │
│   ├── Header.tsx                   Global Header Component
│   ├── Footer.tsx                   Global Footer Component
│   └── FormComponents.tsx           Shared Form Components
│
└── 📁 lib/                          Business Logic & Utilities
    ├── 📁 auth/
    │   ├── tokenManager.ts          🔑 Access/Refresh Token Management
    │   ├── storage.ts               ⚠️ DEPRECATED
    │   └── AuthContext.tsx          ⚠️ DEPRECATED
    │
    ├── 📁 api/
    │   ├── auth.ts                  🔌 Auth API Endpoints
    │   ├── httpClient.ts            🌐 HTTP Client + Auto-Refresh
    │   └── types.ts                 📝 API Type Definitions
    │
    └── 📁 hooks/
        ├── useAuth.ts               🎣 Auth State Hook
        └── index.ts                 📤 Hook Exports
```

---

## 🔄 Data Flow & Architecture

### Authentication Flow

```
┌──────────────────────────────────────────────────────────┐
│                    User Action                            │
│              (Click Login Button)                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │   Login Page              │
         │   @/app/(auth)/login      │
         └────────────┬──────────────┘
                      │
                      ▼
         ┌───────────────────────────┐
         │   API Call                │
         │   @/lib/api/auth.ts       │
         │   apiClient.login()       │
         └────────────┬──────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
           ▼                     ▼
    ┌──────────────┐    ┌──────────────────┐
    │ Access Token │    │ Refresh Token    │
    │              │    │                  │
    │ TanStack     │    │ HTTP-only Cookie │
    │ Query Cache  │    │ (7 days)         │
    │ (15 min)     │    │                  │
    └──────────────┘    └──────────────────┘
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
         ┌───────────────────────────┐
         │   Stored Successfully     │
         │   Ready for API Calls     │
         └───────────────────────────┘
```

### Protected API Call Flow

```
┌──────────────────────────────────────┐
│   Component Makes API Call           │
│   httpClient.get("/api/resource")    │
└───────────────┬──────────────────────┘
                │
                ▼
     ┌──────────────────────┐
     │ httpClient attaches  │
     │ access token         │
     │ Authorization header │
     └──────────┬───────────┘
                │
                ▼
         ┌─────────────────┐
         │  Send Request   │
         └────────┬────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
      ✅ 200 OK             ❌ 401 Unauthorized
        │                    │
        ▼                    ▼
    ┌─────────┐      ┌──────────────────┐
    │ Return  │      │ Auto-Refresh     │
    │ Data    │      │ POST /refresh    │
    └─────────┘      └────────┬─────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
              ✅ Success              ❌ Fail
                    │                     │
                    ▼                     ▼
            ┌─────────────────┐  ┌──────────────┐
            │ Save new tokens │  │ Clear tokens │
            │ Retry request   │  │ Redirect to  │
            │ Return data     │  │ /login       │
            └─────────────────┘  └──────────────┘
```

---

## 🎯 File Organization Pattern

### Route Handlers (in `src/app/`)

```
Purpose: Define URL routes and pages
Pattern: One folder = One route
├── folder-name/
│   ├── page.tsx           ← Renders the page
│   ├── layout.tsx         ← (Optional) Layout wrapper
│   └── components/        ← (Optional) Page-specific components
```

### Components (in `src/components/`)

```
Purpose: Reusable UI components
Pattern: Logical feature grouping
├── feature-name/
│   ├── FeatureName.tsx    ← Main component
│   ├── SubFeature.tsx     ← Sub-component
│   └── index.ts           ← Exports (optional)
```

### Utilities (in `src/lib/`)

```
Purpose: Shared business logic
Pattern: Feature-based utilities
├── feature-name/
│   ├── useCustomHook.ts   ← React hook
│   ├── utils.ts           ← Utility functions
│   ├── types.ts           ← TypeScript types
│   └── constants.ts       ← Constants
```

---

## 🔗 Import Path Patterns

### All imports use `@/` alias (configured in tsconfig.json)

```typescript
// Components (from anywhere)
import Header from "@/components/Header";
import { CodeEditor } from "@/components/exam";
import QueryProvider from "@/components/providers/QueryProvider";

// Hooks (from anywhere)
import { useAuth } from "@/lib/hooks/useAuth";

// API (from anywhere)
import { apiClient } from "@/lib/api/auth";
import { httpClient } from "@/lib/api/httpClient";

// Auth utilities (from anywhere)
import { getTokenManager } from "@/lib/auth/tokenManager";

// Types (from anywhere)
import type { User, LoginResponse } from "@/lib/api/types";
```

**Key Point**: No relative imports needed! All imports are absolute from `src/` root.

---

## 📍 Common File Locations

| What You Need | Location                            | Import                        |
| ------------- | ----------------------------------- | ----------------------------- |
| Header        | `src/components/Header.tsx`         | `@/components/Header`         |
| Footer        | `src/components/Footer.tsx`         | `@/components/Footer`         |
| Form          | `src/components/FormComponents.tsx` | `@/components/FormComponents` |
| Login Page    | `src/app/(auth)/login/page.tsx`     | (Route: `/login`)             |
| Dashboard     | `src/app/dashboard/page.tsx`        | (Route: `/dashboard`)         |
| useAuth hook  | `src/lib/hooks/useAuth.ts`          | `@/lib/hooks/useAuth`         |
| Token Manager | `src/lib/auth/tokenManager.ts`      | `@/lib/auth/tokenManager`     |
| API Client    | `src/lib/api/auth.ts`               | `@/lib/api/auth`              |
| HTTP Client   | `src/lib/api/httpClient.ts`         | `@/lib/api/httpClient`        |

---

## 🚀 Routing Examples

### Route Structure → URL Mapping

```
src/app/page.tsx                    →  /
src/app/(auth)/login/page.tsx       →  /login
src/app/(auth)/register/page.tsx    →  /register
src/app/(auth)/forgot/page.tsx      →  /forgot
src/app/(auth)/reset/page.tsx       →  /reset
src/app/(auth)/verify-email/page.tsx →  /verify-email
src/app/dashboard/page.tsx          →  /dashboard
src/app/exam/page.tsx               →  /exam
src/app/quiz/page.tsx               →  /quiz
```

**Note**: `(auth)` is a **route group** - it doesn't appear in URLs!

---

## 💾 Component Hierarchy Example

```
src/
├── app/
│   └── dashboard/
│       ├── ExamSelection.tsx        ← Page component
│       ├── ExamLibrary.tsx          ← Page component
│       ├── ExamDetailModal.tsx      ← Page component
│       └── page.tsx                 ← Route file
│
└── components/
    ├── exam/
    │   ├── CodeEditor.tsx           ← Reusable component
    │   ├── ExamTabs.tsx             ← Reusable component
    │   └── index.ts                 ← Export all
    │
    └── Header.tsx                   ← Global component

Usage in Dashboard:
import ExamLibrary from "@/app/dashboard/ExamLibrary";
import { CodeEditor } from "@/components/exam";
import Header from "@/components/Header";
```

---

## 🔐 Security & Performance

### Tokens

```
Access Token:
├─ Location: TanStack Query Cache (Memory)
├─ Duration: 15 minutes
└─ Usage: Every API request

Refresh Token:
├─ Location: HTTP-only Cookie
├─ Duration: 7 days
└─ Usage: Refresh access token
```

### Auto-Refresh

```
1. Request made with expired access token
2. Server returns 401
3. httpClient detects 401
4. Auto-calls /api/auth/refresh
5. Saves new tokens
6. Retries original request
7. No user interruption
```

---

## 📊 Project Statistics

| Metric         | Value                           |
| -------------- | ------------------------------- |
| Routes         | 10                              |
| Components     | 20+                             |
| Custom Hooks   | 1                               |
| API Files      | 3                               |
| Total Pages    | 8                               |
| Total Features | 4 (Auth, Dashboard, Exam, Quiz) |

---

## ✅ Quality Checklist

- [x] Follows Next.js 16+ standards
- [x] App Router (not Pages Router)
- [x] Route groups for organization
- [x] Absolute imports with `@/` alias
- [x] No circular dependencies
- [x] Clear component hierarchy
- [x] Proper separation of concerns
- [x] TypeScript configured correctly
- [x] Ready for scaling

---

## 🎓 Learn More

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed guide
- **[TOKEN_MANAGEMENT.md](./TOKEN_MANAGEMENT.md)** - Auth system
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Code snippets
- **[Next.js Docs](https://nextjs.org/docs)** - Official documentation

---

**Version**: 1.0.0  
**Date**: February 3, 2026  
**Status**: ✅ Production Ready
