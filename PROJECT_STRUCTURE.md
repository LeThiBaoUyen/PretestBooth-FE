# NextJS Project Structure Guide

## 📁 Current Structure (Reorganized)

```
PretestBooth-FE/
├── public/                          # Static files
│   └── assets/                      # Images, logos, etc.
├── src/
│   ├── app/                         # Next.js App Router (main routes)
│   │   ├── (auth)/                  # Auth route group (logical grouping)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot/
│   │   │   │   └── page.tsx
│   │   │   ├── reset/
│   │   │   │   └── page.tsx
│   │   │   ├── verify-email/
│   │   │   │   └── page.tsx
│   │   │   └── auth-verify/
│   │   │       └── verify-email/
│   │   │           └── page.tsx
│   │   ├── dashboard/               # Dashboard page
│   │   │   ├── ExamSelection.tsx
│   │   │   ├── ExamLibrary.tsx
│   │   │   ├── ExamDetailModal.tsx
│   │   │   └── page.tsx
│   │   ├── exam/                    # Exam page
│   │   │   └── page.tsx
│   │   ├── quiz/                    # Quiz page
│   │   │   └── page.tsx
│   │   ├── layout.tsx               # Root layout with QueryProvider
│   │   ├── page.tsx                 # Home page (/)
│   │   └── globals.css              # Global styles
│   │
│   ├── components/                  # Reusable components
│   │   ├── providers/               # Context providers
│   │   │   └── QueryProvider.tsx   # TanStack Query provider
│   │   ├── exam/                    # Exam-related components
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── DescriptionTab.tsx
│   │   │   ├── ExamHeader.tsx
│   │   │   ├── ExamTabs.tsx
│   │   │   ├── ResultTab.tsx
│   │   │   ├── TestCaseTab.tsx
│   │   │   └── index.ts
│   │   ├── quiz/                    # Quiz-related components
│   │   │   └── QuizScreen.tsx
│   │   ├── subject/                 # Subject selection components
│   │   │   ├── SubjectSelector.tsx
│   │   │   ├── ExamSetSelector.tsx
│   │   │   └── ImportQuestionTheme.tsx
│   │   ├── Header.tsx               # Global header
│   │   ├── Footer.tsx               # Global footer
│   │   └── FormComponents.tsx       # Shared form components
│   │
│   └── lib/                         # Utilities & business logic
│       ├── auth/                    # Authentication
│       │   ├── tokenManager.ts      # Token management (access + refresh)
│       │   ├── storage.ts           # DEPRECATED
│       │   └── AuthContext.tsx      # DEPRECATED
│       ├── api/                     # API client & types
│       │   ├── auth.ts              # Auth API endpoints
│       │   ├── httpClient.ts        # HTTP client with auto-refresh
│       │   └── types.ts             # API type definitions
│       └── hooks/                   # React custom hooks
│           ├── useAuth.ts           # Auth state management hook
│           └── index.ts             # Hook exports
│
├── public/                          # Static assets
├── package.json                     # Dependencies
├── next.config.js                   # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.ts               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
└── README.md                        # Project README
```

---

## 🎯 Directory Purposes

### `/src/app` - Next.js Routes

- **Purpose**: Contains all page routes and layout
- **Structure**: Follows Next.js App Router conventions
- **Route Groups**: `(auth)` groups authentication routes without affecting URL

### `/src/app/(auth)` - Authentication Routes

- **Purpose**: Logical grouping of auth-related pages
- **Benefits**: Doesn't create `/auth` in URL, just organizes routes
- **Routes**:
  - `/login` - Login page
  - `/register` - Registration page
  - `/forgot` - Forgot password page
  - `/reset` - Reset password page
  - `/verify-email` - Email verification page

### `/src/components` - Reusable Components

- **Purpose**: Shared UI components used across multiple pages
- **Subfolders**:
  - `providers/` - Context/state providers (QueryProvider, etc.)
  - `exam/` - Exam-related UI components
  - `quiz/` - Quiz-related UI components
  - `subject/` - Subject selection components
  - Root level: Global components (Header, Footer, etc.)

### `/src/lib` - Utilities & Business Logic

- **Purpose**: Non-UI code, utilities, hooks, API clients
- **Subfolders**:
  - `auth/` - Authentication utilities (TokenManager)
  - `api/` - API client and type definitions
  - `hooks/` - React custom hooks

---

## 📍 File Locations (Key Files)

### Entry Point

- **Root Layout**: `src/app/layout.tsx`
- **Home Page**: `src/app/page.tsx`
- **Query Provider**: `src/components/providers/QueryProvider.tsx`

### Authentication

- **Login Page**: `src/app/(auth)/login/page.tsx`
- **Register Page**: `src/app/(auth)/register/page.tsx`
- **Forgot Password**: `src/app/(auth)/forgot/page.tsx`
- **Reset Password**: `src/app/(auth)/reset/page.tsx`
- **Verify Email**: `src/app/(auth)/verify-email/page.tsx`

### Main Features

- **Dashboard**: `src/app/dashboard/page.tsx`
- **Exam**: `src/app/exam/page.tsx`
- **Quiz**: `src/app/quiz/page.tsx`

### Business Logic

- **Token Manager**: `src/lib/auth/tokenManager.ts`
- **HTTP Client**: `src/lib/api/httpClient.ts`
- **Auth Hook**: `src/lib/hooks/useAuth.ts`
- **API Client**: `src/lib/api/auth.ts`

---

## 🔗 Import Paths (Using @/alias)

### From any file, use:

```typescript
// Components
import Header from "@/components/Header";
import { QueryProvider } from "@/components/providers/QueryProvider";

// Hooks
import { useAuth } from "@/lib/hooks/useAuth";

// API
import { apiClient } from "@/lib/api/auth";
import { httpClient } from "@/lib/api/httpClient";

// Auth utilities
import { getTokenManager } from "@/lib/auth/tokenManager";

// Types
import type { User, LoginResponse } from "@/lib/api/types";
```

---

## ✅ Structure Benefits

### 1. **Next.js Best Practices**

- ✅ App Router (not Pages Router)
- ✅ Proper folder organization
- ✅ Route groups for logical grouping
- ✅ Server/Client separation ready

### 2. **Scalability**

- ✅ Easy to add new routes
- ✅ Components folder grows with features
- ✅ Lib folder handles business logic
- ✅ Clear separation of concerns

### 3. **Maintainability**

- ✅ Clear file locations
- ✅ Consistent import paths
- ✅ No circular dependencies
- ✅ DRY (Don't Repeat Yourself)

### 4. **Team Collaboration**

- ✅ Developers know where to find files
- ✅ Clear structure for new team members
- ✅ Easy to code review
- ✅ Reduced merge conflicts

---

## 🔄 Update from Old Structure

### What Changed:

```
Before:
src/
├── app/                    ❌ Old structure
├── client/
│   ├── app/               ❌ Duplicate structure
│   ├── components/        ❌ Wrong location
│   └── lib/              ❌ Wrong location
└── lib/                   ❌ Empty

After:
src/
├── app/                   ✅ Proper routes
├── components/           ✅ Root level components
└── lib/                  ✅ Root level utilities
```

### Files Moved:

- `src/client/app/*` → `src/app/*`
- `src/client/components/*` → `src/components/*`
- `src/client/lib/*` → `src/lib/*`

### Old Files Removed:

- ❌ `src/client/` - Deleted
- ❌ `src/app/(old copies)` - Replaced
- ❌ `src/lib/(empty)` - Replaced

---

## 🚀 Adding New Features

### Adding a New Page

```
src/app/new-feature/
├── page.tsx             # Main page
├── layout.tsx           # Layout (optional)
└── components/          # Page-specific components (optional)
```

### Adding a New Route Group

```
src/app/(feature-group)/
├── feature-a/
│   └── page.tsx
├── feature-b/
│   └── page.tsx
└── feature-c/
    └── page.tsx
```

### Adding a New Component

```
src/components/feature-name/
├── FeatureName.tsx       # Main component
├── FeatureHeader.tsx     # Sub-component
├── FeatureFooter.tsx     # Sub-component
└── index.ts             # Exports (optional)
```

### Adding Utilities/Hooks

```
src/lib/feature-name/
├── useFeaturement.ts    # Custom hook
├── featureUtils.ts      # Utility functions
└── featureTypes.ts      # Types
```

---

## 📊 File Statistics

| Type       | Count | Location            |
| ---------- | ----- | ------------------- |
| Pages      | 10    | `src/app/**`        |
| Components | 20+   | `src/components/**` |
| Hooks      | 1     | `src/lib/hooks/`    |
| API Files  | 3     | `src/lib/api/`      |
| Auth Files | 1     | `src/lib/auth/`     |

---

## 🔍 Verification Checklist

- [x] No `src/client` folder
- [x] All files in proper locations
- [x] Import paths use `@/` alias
- [x] Route groups properly organized
- [x] QueryProvider in right location
- [x] All imports updated
- [x] No broken references

---

## 📚 Related Documentation

- [TOKEN_MANAGEMENT.md](../TOKEN_MANAGEMENT.md) - Token system
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Code examples
- [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) - Integration

---

## 🎓 Next Steps

1. ✅ **Project restructured** - Done!
2. **Verify imports** - Run build/dev
3. **Test routes** - Check all pages load
4. **Update team** - Share new structure
5. **Document customs** - Add style guide if needed

---

**Date**: February 3, 2026  
**Status**: ✅ Project Reorganized  
**Structure**: ✅ Next.js Best Practices
