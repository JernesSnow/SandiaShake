# SandiaShake - Comprehensive Technical Documentation

**Version:** 0.1.0
**Last Updated:** December 6, 2025
**Status:** Early Development (Prototype Phase)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Application Architecture](#application-architecture)
5. [Routing & Pages](#routing--pages)
6. [Component Architecture](#component-architecture)
7. [TypeScript Usage](#typescript-usage)
8. [Design System & Styling](#design-system--styling)
9. [Configuration Files](#configuration-files)
10. [Current Development Status](#current-development-status)
11. [Future Implementation Roadmap](#future-implementation-roadmap)
12. [Recommendations for Auth & Database](#recommendations-for-auth--database)

---

## Project Overview

**SandiaShake** is a comprehensive CRM and operational management platform designed specifically for **Sandía con Chile**, a digital marketing and creative agency specializing in audiovisual content and marketing services for third-party clients.

### Purpose
Similar to Milanote but tailored for audiovisual project management, SandiaShake aims to provide:
- **Client Management**: Track clients, their plans, deliverables, and payment status
- **Task Management**: Kanban-style workflow for managing creative deliverables
- **Collaborator Management**: Track team members, assignments, and performance
- **Course Management**: Manage digital products/courses
- **Financial Tracking**: Monitor payments, invoices, and financial health
- **Performance Analytics**: Reports and metrics for business optimization

### Target Users
- **Admins**: Agency owners and managers (full access)
- **Collaborators**: Creative team members (limited access based on assignments)
- **Future**: Potential client portal for client self-service

---

## Tech Stack

### Core Framework & Runtime
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.7 | React framework with App Router, SSR, SSG capabilities |
| **React** | 19.2.0 | UI library (latest stable release) |
| **Node.js** | 20+ | Runtime environment |
| **TypeScript** | 5.x | Type-safe JavaScript with strict mode |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.x | Utility-first CSS framework (latest version) |
| **PostCSS** | @tailwindcss/postcss v4 | CSS processing with Tailwind v4 integration |
| **react-feather** | 2.0.10 | Feather icon set for React |
| **clsx** | 2.1.1 | Conditional className utility |

### Features & Interactions
| Technology | Version | Purpose |
|------------|---------|---------|
| **@hello-pangea/dnd** | 18.0.1 | Drag-and-drop for Kanban board (fork of react-beautiful-dnd) |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | 9.x | Code linting with Next.js best practices |
| **eslint-config-next** | 16.0.7 | Next.js-specific ESLint rules |
| **TypeScript** | 5.x | Type checking and compilation |

### Notable Absences (To Be Implemented)
- **No Database**: No ORM (Prisma, Drizzle) or database client
- **No Authentication**: No auth provider (NextAuth, Clerk, Supabase)
- **No State Management**: No Redux, Zustand, Jotai (using local state only)
- **No Data Fetching**: No React Query, SWR, or similar
- **No Testing**: No Jest, Vitest, Playwright, or Cypress
- **No Form Management**: No React Hook Form, Formik, or Zod validation
- **No API Client**: No Axios or fetch wrappers

---

## Directory Structure

```
/SandiaShake/
├── app/                              # Next.js App Router (file-based routing)
│   ├── auth/                         # Authentication
│   │   └── page.tsx                  # Login page (/auth)
│   ├── clientes/                     # Client management
│   │   └── page.tsx                  # Client list & CRUD (/clientes)
│   ├── colaboradores/                # Team member management
│   │   └── page.tsx                  # Collaborators CRUD (/colaboradores)
│   ├── configuracion/                # System settings
│   │   └── page.tsx                  # Configuration panel (/configuracion)
│   ├── cursos/                       # Course/product management
│   │   └── page.tsx                  # Course listing (/cursos)
│   ├── dashboard/                    # Main dashboard
│   │   └── page.tsx                  # Analytics & metrics (/dashboard)
│   ├── finanzas/                     # Financial management
│   │   └── page.jsx                  # Finance tracking (/finanzas) [JSX not TSX]
│   ├── tareas/                       # Task management
│   │   └── page.tsx                  # Kanban board (/tareas)
│   ├── layout.tsx                    # Root layout wrapper
│   ├── page.tsx                      # Home page (redirects to /auth)
│   └── globals.css                   # Global styles & Tailwind imports
│
├── components/                       # Reusable React components
│   ├── kanban/                       # Kanban-specific components
│   │   ├── KanbanBoard.tsx          # Main Kanban board component (780 LOC)
│   │   ├── TaskCard.tsx             # Standalone task card (not used in board)
│   │   ├── data.ts                  # TypeScript types & sample data
│   │   └── kanbanStyles.ts          # Style object & constants
│   ├── SectionCard.tsx              # Reusable card wrapper component
│   ├── Shell.tsx                    # Main app shell/layout wrapper
│   └── Sidebar.tsx                  # Navigation sidebar
│
├── public/                           # Static assets (served at /)
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── .git/                             # Git repository
├── .next/                            # Next.js build output (gitignored)
├── node_modules/                     # Dependencies (gitignored)
│
├── .gitignore                        # Git ignore rules
├── eslint.config.mjs                 # ESLint flat config
├── next.config.ts                    # Next.js configuration
├── next-env.d.ts                     # Next.js TypeScript definitions
├── package.json                      # Project dependencies & scripts
├── package-lock.json                 # Locked dependency versions
├── postcss.config.mjs                # PostCSS configuration
├── README.md                         # Project README
└── tsconfig.json                     # TypeScript compiler configuration
```

### Directory Organization Patterns

**Current Approach:**
- Flat component structure (all in `/components`)
- No domain-specific folders besides `/kanban`
- No utility or helper directories

**Missing Directories (Recommended for Future):**
```
├── lib/                    # Shared utilities & helper functions
├── hooks/                  # Custom React hooks
├── types/                  # Shared TypeScript type definitions
├── services/               # API clients & external service integrations
├── utils/                  # Pure utility functions
├── constants/              # App-wide constants & enums
└── app/api/                # API routes (when backend is implemented)
```

---

## Application Architecture

### App Router Structure (Next.js 15+)

SandiaShake uses the modern **App Router** architecture (not the legacy Pages Router), which provides:

- **File-based routing**: Each folder in `/app` becomes a route
- **Server Components by default**: Better performance and SEO
- **Layouts**: Shared UI across routes
- **Loading & Error States**: Built-in support for async UIs
- **React Server Components**: Zero JavaScript shipped for static content

### Component Model

```
┌─────────────────────────────────────────┐
│         app/layout.tsx (Root)           │
│  - HTML structure                       │
│  - Global metadata                      │
│  - Spanish language (lang="es")         │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│      Most Pages (Server Components)     │
│  - /dashboard, /tareas, /clientes, etc. │
│  - Fetch data on server                 │
│  - No useState, useEffect               │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│         components/Shell.tsx            │
│  - Client Component ("use client")      │
│  - Wraps Sidebar + main content         │
└─────────────────────────────────────────┘
         ┌─────────┴─────────┐
         ▼                   ▼
   ┌──────────┐      ┌──────────────┐
   │ Sidebar  │      │ Page Content │
   │ (Client) │      │  (Server)    │
   └──────────┘      └──────────────┘
```

### Current State Management Strategy

**No Global State Library**
- All state is **local React state** using `useState`
- Kanban board: ~780 lines with complex local state
- Auth: Uses `localStorage` for session persistence (temporary)

**Why No Redux/Zustand?**
- Project is in early prototype phase
- Most pages are placeholders
- Once database is added, server state will replace local state
- Recommendation: Add React Query or SWR for server state when API is built

---

## Routing & Pages

### Route Map

| Route | File | Type | Status | Description |
|-------|------|------|--------|-------------|
| `/` | `app/page.tsx` | Server | Redirect | Redirects to `/auth` |
| `/auth` | `app/auth/page.tsx` | Client | Complete | Login page with dev credentials |
| `/dashboard` | `app/dashboard/page.tsx` | Server | Placeholder | Main analytics dashboard |
| `/tareas` | `app/tareas/page.tsx` | Server | Functional | Kanban board for tasks |
| `/clientes` | `app/clientes/page.tsx` | Server | Placeholder | Client management |
| `/colaboradores` | `app/colaboradores/page.tsx` | Server | Placeholder | Team member CRUD |
| `/cursos` | `app/cursos/page.tsx` | Server | Placeholder | Course/product management |
| `/finanzas` | `app/finanzas/page.jsx` | Server | Placeholder | Financial tracking |
| `/configuracion` | `app/configuracion/page.tsx` | Server | Placeholder | System settings |

### Detailed Page Breakdown

#### 1. `/auth` - Authentication Page
**File:** `app/auth/page.tsx` (Client Component)

**Features:**
- Email and password inputs
- Show/hide password toggle (Eye/EyeOff icons)
- "Mantenerme conectado" (Keep me logged in) checkbox
- Temporary dev login: `admin@sandia.com` / `admin123`
- Stores role in `localStorage` on successful login
- Redirects to `/dashboard` after login
- Clean dark theme with brand red accent

**Current Authentication Flow:**
```javascript
// Hardcoded validation (temporary)
if (email === "admin@sandia.com" && password === "admin123") {
  localStorage.setItem("userRole", "admin");
  router.push("/dashboard");
}
```

**TODO:**
- Replace with real authentication provider
- Add role-based access control
- Implement session management
- Add "Forgot Password" flow
- Add registration for collaborators

---

#### 2. `/dashboard` - Main Dashboard
**File:** `app/dashboard/page.tsx` (Server Component)

**Planned Sections:**
1. **SQL Views Metrics**: Total views for all clients
2. **Tasks/Deliverables**: Summary of pending/completed work
3. **Mental Health**: Collaborator wellness tracking
4. **Performance Reports**: Best/worst performing content
5. **Chilli Points**: Gamification system status
6. **Monthly Reports**: Downloadable analytics

**Current Status:** Placeholder cards using `SectionCard` component

**Future Data Sources:**
- Database queries for metrics
- Aggregated client data
- Real-time task counts from tasks table
- Performance analytics from social media APIs

---

#### 3. `/tareas` - Task Management (Kanban Board)
**File:** `app/tareas/page.tsx` (Server Component with Client KanbanBoard)

**This is the ONLY fully functional page in the app.**

**Features:**
- Full drag-and-drop Kanban board
- 5 status columns:
  - Pendiente (Pending)
  - En progreso (In Progress)
  - En revisión (In Review)
  - Aprobada (Approved)
  - Archivada (Archived)
- Client search filter
- Priority filter (Alta/Media/Baja)
- Create/Edit/Delete tasks via modal
- Task properties:
  - Title
  - Client
  - Assignee
  - Due date
  - Month
  - Deliverable type (Arte, Reel, Copy, Video, Carrusel, Otro)
  - Priority (Alta, Media, Baja)
  - Google Drive URL
  - Description
- Responsive grid layout
- Dark theme with brand colors

**Technology:**
- `@hello-pangea/dnd` for drag-and-drop
- Local state management with `useState`
- Sample data from `components/kanban/data.ts`

**Future Enhancements:**
- Connect to database API
- Real-time updates with WebSockets
- File upload integration
- Task comments and history
- Notifications for due dates
- Time tracking

---

#### 4. `/clientes` - Client Management
**File:** `app/clientes/page.tsx` (Server Component)

**Planned Features:**
- Client listing with search/filters
- Client detail view
- Assigned collaborators per client
- Active plan status
- Remaining deliverables counter
- Payment status indicator
- Contact information
- Project history

**Current Status:** Placeholder

**Future Data Model:**
```typescript
type Client = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  plan: "Básico" | "Pro" | "Premium";
  fechaInicio: string;
  estado: "Activo" | "Moroso" | "Pausado" | "Cancelado";
  colaboradoresAsignados: string[];
  entregablesPendientes: number;
  ultimoPago: string;
};
```

---

#### 5. `/colaboradores` - Team Management
**File:** `app/colaboradores/page.tsx` (Server Component)

**Planned Sections:**
1. **Admin Management**: CRUD for admin users
2. **Collaborator Management**: CRUD with client assignment
3. **Chilli Points System**: Rewards and gamification
4. **Mental Health Tracking**: Wellness monitoring per collaborator

**Current Status:** Placeholder

**Future Features:**
- Role-based permissions
- Performance metrics
- Workload distribution
- Availability calendar
- Skills and specializations

---

#### 6. `/cursos` - Course/Product Management
**File:** `app/cursos/page.tsx` (Server Component)

**Purpose:** Manage digital products and courses offered by the agency

**Planned Features:**
- Course listing
- Course creation wizard
- Content management
- Pricing and access control
- Student enrollment tracking
- Revenue reporting

**Current Status:** Basic placeholder

---

#### 7. `/finanzas` - Financial Management
**File:** `app/finanzas/page.jsx` (Server Component - **Note: JSX not TSX**)

**Planned Sections:**
1. **Financial Summary**: Revenue, expenses, profit
2. **Invoices & Payments**: Invoice generation and tracking
3. **Delinquent Clients**: Overdue payments and blocks
4. **Payment Rules**: Automated payment workflows
5. **Notifications**: Payment reminders

**Current Status:** Placeholder

**TODO:** Convert to TypeScript (.tsx)

---

#### 8. `/configuracion` - Settings
**File:** `app/configuracion/page.tsx` (Server Component)

**Planned Sections:**
1. **User Profile**: Personal information and preferences
2. **Notification Preferences**: Email, push, in-app notifications
3. **Integrations**:
   - Google Drive API
   - Payment gateway (Stripe/PayPal)
   - Social media APIs
   - Email service (SendGrid/Mailgun)
4. **System Parameters**: Global settings

**Current Status:** Placeholder

---

## Component Architecture

### Core Components

#### 1. **Shell** (`components/Shell.tsx`)
**Type:** Client Component
**Lines:** ~40
**Purpose:** Main application wrapper

**Features:**
- Dark theme background (#262425, #333132)
- Flexbox layout (row on desktop, column on mobile)
- Contains Sidebar + children (main content)
- Responsive design

**Usage:**
```tsx
<Shell>
  {/* Page content goes here */}
</Shell>
```

**Styling:**
- Background: `bg-[#262425]`
- Main content: `bg-[#333132]`
- Full viewport height
- Overflow handling

---

#### 2. **Sidebar** (`components/Sidebar.tsx`)
**Type:** Client Component
**Lines:** ~150
**Purpose:** Main navigation menu

**Features:**
- 7 navigation links (Dashboard, Tasks, Clients, Collaborators, Courses, Finance, Settings)
- Active route highlighting with red accent (#ee2346)
- Brand header with "Admin" badge
- System status indicator (green #6cbe45)
- Dark gradient background
- Feather icons
- Hidden on mobile (`hidden md:flex`)

**Navigation Items:**
```typescript
const menuItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/tareas", icon: CheckSquare, label: "Tareas" },
  { href: "/clientes", icon: Users, label: "Clientes" },
  { href: "/colaboradores", icon: Users, label: "Colaboradores" },
  { href: "/cursos", icon: BookOpen, label: "Cursos" },
  { href: "/finanzas", icon: DollarSign, label: "Finanzas" },
  { href: "/configuracion", icon: Settings, label: "Configuración" },
];
```

**Active State Detection:**
```tsx
const isActive = pathname === item.href;
```

---

#### 3. **SectionCard** (`components/SectionCard.tsx`)
**Type:** Server Component
**Lines:** ~20
**Purpose:** Reusable white card wrapper

**Props:**
```typescript
type SectionCardProps = {
  title: string;
  children?: React.ReactNode;
};
```

**Styling:**
- White background
- Rounded corners (`rounded-lg`)
- Shadow (`shadow-md`)
- Padding (`p-6`)
- Bottom border on title

**Usage:**
```tsx
<SectionCard title="Financial Summary">
  {/* Card content */}
</SectionCard>
```

---

### Kanban Components

#### 1. **KanbanBoard** (`components/kanban/KanbanBoard.tsx`)
**Type:** Client Component
**Lines:** 780 (largest component in the project)
**Purpose:** Complete drag-and-drop Kanban board

**State Management:**
```typescript
const [state, setState] = useState<KanbanState>(initialKanbanState);
const [searchClient, setSearchClient] = useState("");
const [filterPriority, setFilterPriority] = useState<string>("Todas");
const [modalOpen, setModalOpen] = useState(false);
const [editingTask, setEditingTask] = useState<Task | null>(null);
```

**Key Features:**
1. **Drag-and-Drop:**
   - Uses `@hello-pangea/dnd`
   - `onDragEnd` handler updates task status
   - Reorders tasks within columns
   - Moves tasks between columns

2. **Filtering:**
   - Client search (case-insensitive)
   - Priority filter dropdown (All, Alta, Media, Baja)
   - Real-time filtering

3. **CRUD Operations:**
   - Create new task
   - Edit existing task
   - Delete task
   - All via modal dialog

4. **Task Modal Fields:**
   - Title (required)
   - Client (required)
   - Assigned to (required)
   - Due date (date picker)
   - Month (text input)
   - Deliverable type (select: Arte, Reel, Copy, Video, Carrusel, Otro)
   - Priority (select: Alta, Media, Baja)
   - Google Drive URL
   - Description (textarea)

5. **Responsive Grid:**
   - 1 column on mobile
   - 2 columns on md
   - 3 columns on lg
   - 5 columns on xl
   - Each column scrollable

**Data Flow:**
```
initialKanbanState (data.ts)
        ↓
  useState(state)
        ↓
  User interaction (drag, edit, create, delete)
        ↓
  setState(newState)
        ↓
  Re-render with updated data
```

**Future Enhancements:**
- Replace local state with database API
- Add optimistic updates
- Add task comments
- Add file attachments
- Add time tracking
- Add task dependencies
- Add notifications

---

#### 2. **TaskCard** (`components/kanban/TaskCard.tsx`)
**Type:** Client Component
**Lines:** ~80
**Purpose:** Standalone task card component

**Note:** This component is NOT used in the main KanbanBoard. The board renders tasks inline instead of using this component.

**Features:**
- Light theme design (white background)
- Shows: title, client, assignee, due date, priority
- Priority color coding
- Rounded corners and shadow

**Future Use:**
- Could be extracted and used in board
- Could be used in other views (list view, calendar view)

---

#### 3. **data.ts** (`components/kanban/data.ts`)
**Type:** TypeScript type definitions and sample data
**Lines:** 127

**Type Definitions:**

```typescript
// Status ID union type (ensures type safety)
export type StatusId =
  | "pendiente"
  | "en_progreso"
  | "en_revision"
  | "aprobada"
  | "archivada";

// Task object structure
export type Task = {
  id: string;
  titulo: string;
  cliente: string;
  asignadoA: string;
  statusId: StatusId;
  fechaEntrega?: string;        // Optional: "YYYY-MM-DD"
  mes?: string;                 // Optional: "Febrero 2025"
  tipoEntregable?: "Arte" | "Reel" | "Copy" | "Video" | "Carrusel" | "Otro";
  prioridad?: "Alta" | "Media" | "Baja";
  googleDriveUrl?: string;
  descripcion?: string;
};

// Column structure
export type Column = {
  id: StatusId;
  titulo: string;
  taskIds: string[];           // Array of task IDs in this column
};

// Overall Kanban state
export type KanbanState = {
  tasks: Record<string, Task>;              // Object with task IDs as keys
  columns: Record<StatusId, Column>;         // Object with status IDs as keys
  columnOrder: StatusId[];                   // Array defining column order
};
```

**Sample Data:**
- 5 example tasks (t1-t5)
- Each task in a different status
- Realistic client names and assignees
- Various deliverable types and priorities

**Future:**
- Types will move to `/types` directory
- Sample data will be replaced with API calls
- May add more complex types (subtasks, comments, attachments)

---

#### 4. **kanbanStyles.ts** (`components/kanban/kanbanStyles.ts`)
**Type:** Style constants
**Lines:** ~50

**Purpose:** Centralized styling for Kanban board

**Contents:**
- Brand color tokens
- Dark mode theme colors
- Tailwind utility classes for all Kanban elements
- Modular style definitions

**Example:**
```typescript
export const kanbanStyles = {
  colors: {
    primary: "#ee2346",
    success: "#6cbe45",
    dark: "#262425",
    // ... more colors
  },
  column: "bg-[#3d3b3c] rounded-xl p-4 ...",
  card: "bg-[#4a4748] rounded-lg p-3 ...",
  // ... more styles
};
```

---

## TypeScript Usage

### Configuration Overview

**File:** `tsconfig.json`

**Key Settings:**
```json
{
  "compilerOptions": {
    "target": "ES2017",              // Modern JavaScript features
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,                 // Allow .js files (e.g., finanzas/page.jsx)
    "skipLibCheck": true,            // Skip type checking of .d.ts files
    "strict": true,                  // ✅ STRICT MODE ENABLED
    "noEmit": true,                  // Next.js handles transpilation
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",   // Next.js 13+ bundler resolution
    "resolveJsonModule": true,
    "isolatedModules": true,         // Required for Next.js
    "jsx": "react-jsx",              // Modern JSX transform
    "incremental": true,             // Faster rebuilds
    "paths": {
      "@/*": ["./*"]                 // Path alias: @/components/...
    }
  }
}
```

### Strict Mode Implications

**Strict mode is enabled**, which includes:
- `strictNullChecks`: Must check for null/undefined
- `strictFunctionTypes`: Stricter function type checking
- `strictBindCallApply`: Type check bind/call/apply
- `strictPropertyInitialization`: Class properties must be initialized
- `noImplicitThis`: `this` must have explicit type
- `alwaysStrict`: Emit "use strict" in output
- `noImplicitAny`: Variables must have explicit types (no implicit `any`)

**Impact on Development:**
- More type annotations required
- Better type safety and fewer runtime errors
- IntelliSense works better in VS Code
- Catches more bugs at compile time

---

### TypeScript Patterns in the Codebase

#### 1. **React Component Typing**

**Server Components:**
```typescript
export default function DashboardPage() {
  return <div>...</div>;
}
```
- No props type needed if no props
- Return type inferred (JSX.Element)

**Client Components with Props:**
```typescript
type SectionCardProps = {
  title: string;
  children?: React.ReactNode;
};

export default function SectionCard({ title, children }: SectionCardProps) {
  return <div>...</div>;
}
```

**Props Destructuring:**
```typescript
// ✅ Good: Inline type
function MyComponent({ name }: { name: string }) { ... }

// ✅ Better: Separate type for reusability
type MyComponentProps = { name: string };
function MyComponent({ name }: MyComponentProps) { ... }
```

---

#### 2. **Type Definitions for Data Models**

**Union Types for Fixed Values:**
```typescript
// StatusId can ONLY be one of these 5 values
export type StatusId =
  | "pendiente"
  | "en_progreso"
  | "en_revision"
  | "aprobada"
  | "archivada";

// Priority can ONLY be one of these 3 values
prioridad?: "Alta" | "Media" | "Baja";
```

**Benefits:**
- Autocomplete in VS Code
- Compile-time checking
- Prevents typos ("En Progreso" vs "en_progreso")

**Object Types:**
```typescript
export type Task = {
  id: string;                    // Required
  titulo: string;                // Required
  statusId: StatusId;            // Required (union type)
  fechaEntrega?: string;         // Optional
  prioridad?: "Alta" | "Media" | "Baja";  // Optional (union type)
};
```

**Record Types:**
```typescript
// Object with StatusId keys and Column values
columns: Record<StatusId, Column>

// Equivalent to:
columns: {
  pendiente: Column;
  en_progreso: Column;
  en_revision: Column;
  aprobada: Column;
  archivada: Column;
}
```

---

#### 3. **State Typing with React Hooks**

**useState with Explicit Types:**
```typescript
const [state, setState] = useState<KanbanState>(initialKanbanState);
```
- TypeScript infers type from `initialKanbanState`, but explicit type is safer
- Ensures `setState` only accepts `KanbanState` objects

**useState with Union Types:**
```typescript
const [filterPriority, setFilterPriority] = useState<string>("Todas");
```
- Could be stricter:
```typescript
type PriorityFilter = "Todas" | "Alta" | "Media" | "Baja";
const [filterPriority, setFilterPriority] = useState<PriorityFilter>("Todas");
```

**Event Handler Typing:**
```typescript
const handleDragEnd = (result: DropResult) => {
  // result is typed by @hello-pangea/dnd
};

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setEmail(e.target.value);
};
```

---

#### 4. **Next.js Specific Types**

**Metadata (for SEO):**
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SandíaShake CRM",
  description: "CRM y plataforma operativa para Sandía con Chile",
};
```

**Next Config:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Page Props (for dynamic routes):**
```typescript
// Future use for dynamic routes like /clientes/[id]
type PageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function ClientPage({ params, searchParams }: PageProps) {
  // ...
}
```

---

#### 5. **Type Safety Best Practices Used**

**✅ Do:**
- Define types for all data models
- Use union types for fixed values
- Type all function parameters
- Use `Record<>` for key-value objects
- Type event handlers explicitly

**❌ Don't:**
- Use `any` (defeats the purpose of TypeScript)
- Leave types implicit where they're not obvious
- Use `@ts-ignore` to suppress errors (fix the root cause)

---

#### 6. **Future TypeScript Improvements**

**1. Create `/types` directory:**
```typescript
// types/models.ts
export type Client = { ... };
export type Collaborator = { ... };
export type Course = { ... };
export type Invoice = { ... };

// types/api.ts
export type ApiResponse<T> = {
  data: T;
  error?: string;
};
```

**2. Add Zod for runtime validation:**
```typescript
import { z } from "zod";

const TaskSchema = z.object({
  id: z.string(),
  titulo: z.string().min(1),
  cliente: z.string().min(1),
  statusId: z.enum(["pendiente", "en_progreso", "en_revision", "aprobada", "archivada"]),
  prioridad: z.enum(["Alta", "Media", "Baja"]).optional(),
});

type Task = z.infer<typeof TaskSchema>;
```

**3. Type-safe API routes:**
```typescript
// app/api/tasks/route.ts
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const tasks: Task[] = await db.task.findMany();
  return Response.json(tasks);
}
```

**4. Generic types for reusability:**
```typescript
type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

const [tasksState, setTasksState] = useState<ApiState<Task[]>>({
  data: null,
  loading: true,
  error: null,
});
```

---

## Design System & Styling

### Brand Colors

| Color Name | Hex Code | Usage | RGB |
|------------|----------|-------|-----|
| **Sandía Red** (Primary) | `#ee2346` | Buttons, active states, accents | rgb(238, 35, 70) |
| **Success Green** | `#6cbe45` | Success states, online indicators | rgb(108, 190, 69) |
| **Dark Background 1** | `#262425` | Main background | rgb(38, 36, 37) |
| **Dark Background 2** | `#333132` | Content area background | rgb(51, 49, 50) |
| **Dark Background 3** | `#3d3b3c` | Card/column background | rgb(61, 59, 60) |
| **Dark Background 4** | `#4a4748` | Elevated elements (task cards) | rgb(74, 71, 72) |
| **Light Text** | `#fffef9` | Primary text color | rgb(255, 254, 249) |

### Typography

**Font Family:**
- Primary: `Arial, Helvetica, sans-serif`
- Fallback: System sans-serif

**Text Sizes (Tailwind):**
- `text-xs`: 0.75rem (12px) - Small labels
- `text-sm`: 0.875rem (14px) - Body text, secondary info
- `text-base`: 1rem (16px) - Default body text
- `text-lg`: 1.125rem (18px) - Subheadings
- `text-xl`: 1.25rem (20px) - Headings
- `text-2xl`: 1.5rem (24px) - Page titles

**Font Weights:**
- `font-normal`: 400 - Body text
- `font-medium`: 500 - Emphasis
- `font-semibold`: 600 - Headings
- `font-bold`: 700 - Strong emphasis

### Spacing System (Tailwind Default)

| Class | Size | Pixels (1rem = 16px) |
|-------|------|----------------------|
| `p-1` | 0.25rem | 4px |
| `p-2` | 0.5rem | 8px |
| `p-3` | 0.75rem | 12px |
| `p-4` | 1rem | 16px |
| `p-6` | 1.5rem | 24px |
| `p-8` | 2rem | 32px |

### Border Radius

| Class | Size | Usage |
|-------|------|-------|
| `rounded-md` | 0.375rem (6px) | Small elements |
| `rounded-lg` | 0.5rem (8px) | Cards, buttons |
| `rounded-xl` | 0.75rem (12px) | Columns, containers |
| `rounded-full` | 50% | Circles, pills |

### Shadows

| Class | CSS | Usage |
|-------|-----|-------|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | Cards |
| `shadow-xl` | 0 20px 25px rgba(0,0,0,0.15) | Modals |

### Dark Theme Strategy

**Primary Approach:**
- Dark backgrounds by default
- Light text on dark backgrounds
- Subtle borders and shadows for depth
- Brand red for interactive elements
- Green for success/positive states

**Color Contrast:**
- Text on dark background: `#fffef9` on `#262425` = 14.5:1 (AAA)
- Red accent on dark: `#ee2346` on `#262425` = 4.2:1 (AA)

### Responsive Breakpoints (Tailwind Default)

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

**Usage Examples:**
```tsx
// Hidden on mobile, visible on md+
className="hidden md:flex"

// 1 column on mobile, 3 on lg, 5 on xl
className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5"
```

### Component Styling Patterns

**1. Cards:**
```tsx
<div className="bg-white rounded-lg shadow-md p-6 mb-6">
  {/* Card content */}
</div>
```

**2. Buttons (Primary):**
```tsx
<button className="bg-[#ee2346] text-white px-6 py-2 rounded-lg hover:bg-[#d91f3c]">
  Click Me
</button>
```

**3. Inputs:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#ee2346]"
/>
```

**4. Sidebar Active State:**
```tsx
<Link
  href="/dashboard"
  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
    isActive
      ? "bg-[#ee2346] text-white"
      : "text-gray-300 hover:bg-[#3d3b3c]"
  }`}
>
  Dashboard
</Link>
```

---

## Configuration Files

### 1. `package.json`

**Scripts:**
```json
{
  "dev": "next dev",          // Development server (localhost:3000)
  "build": "next build",      // Production build
  "start": "next start",      // Start production server
  "lint": "eslint"            // Run ESLint
}
```

**Dependencies Explained:**
- `@hello-pangea/dnd`: Maintained fork of react-beautiful-dnd (drag-and-drop)
- `clsx`: Tiny utility for constructing className strings conditionally
- `next`: Framework (version 16 is bleeding edge, may have bugs)
- `react` & `react-dom`: UI library (version 19 is latest)
- `react-feather`: Beautiful icon set (2.0.10)

**Dev Dependencies:**
- `@tailwindcss/postcss`: Tailwind v4 PostCSS plugin
- `@types/*`: TypeScript type definitions for Node, React, React-DOM
- `eslint` & `eslint-config-next`: Linting with Next.js best practices
- `tailwindcss`: Utility-first CSS framework (v4)
- `typescript`: Type-safe JavaScript

---

### 2. `tsconfig.json`

**Notable Configurations:**

**Path Alias:**
```json
"paths": {
  "@/*": ["./*"]
}
```
Allows imports like:
```typescript
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
```
Instead of:
```typescript
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
```

**Strict Mode:**
```json
"strict": true
```
Enables all strict type-checking options for maximum type safety.

**Incremental Compilation:**
```json
"incremental": true
```
Faster rebuilds by caching previous compilations.

---

### 3. `next.config.ts`

**Current Configuration:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

**Future Additions:**

```typescript
const nextConfig: NextConfig = {
  // Image optimization domains
  images: {
    domains: ["drive.google.com", "lh3.googleusercontent.com"],
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Redirects (optional)
  async redirects() {
    return [
      {
        source: "/",
        destination: "/auth",
        permanent: false,
      },
    ];
  },

  // API rewrites (for proxying external APIs)
  async rewrites() {
    return [
      {
        source: "/api/external/:path*",
        destination: "https://external-api.com/:path*",
      },
    ];
  },
};
```

---

### 4. `eslint.config.mjs`

**Current Setup:**
- Modern **flat config** format (ESLint 9+)
- Next.js core web vitals rules
- TypeScript support
- Ignores build directories

**Future: Custom Rules**
```javascript
export default [
  {
    rules: {
      "react/no-unescaped-entities": "off",  // Allow apostrophes in JSX
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
```

---

### 5. `postcss.config.mjs`

**Current:**
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

**Purpose:** Integrates Tailwind CSS v4 into the build process via PostCSS.

---

### 6. `globals.css`

**Structure:**
```css
@import 'tailwindcss';

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    /* ... more CSS variables for theming */
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: 0 0% 3.9%;
      --foreground: 0 0% 98%;
    }
  }
}

body {
  color: var(--foreground);
  background: var(--background);
}
```

**Purpose:**
- Import Tailwind CSS
- Define CSS custom properties for theming
- Support light/dark mode based on system preference
- Global body styles

---

## Current Development Status

### Project Timeline

| Date | Event | Commit |
|------|-------|--------|
| Recent | Initial structure created | 216887b |
| Previous | Next.js project initialized | 3adffdb |

### Feature Completion Matrix

| Feature | UI | Logic | Database | API | Status |
|---------|----|----|----------|-----|--------|
| **Authentication** | ✅ 100% | ⚠️ 20% (hardcoded) | ❌ 0% | ❌ 0% | Prototype |
| **Dashboard** | ⚠️ 30% (placeholders) | ❌ 0% | ❌ 0% | ❌ 0% | Placeholder |
| **Tasks (Kanban)** | ✅ 100% | ✅ 100% (local state) | ❌ 0% | ❌ 0% | UI Complete |
| **Clients** | ⚠️ 10% (basic layout) | ❌ 0% | ❌ 0% | ❌ 0% | Placeholder |
| **Collaborators** | ⚠️ 10% (basic layout) | ❌ 0% | ❌ 0% | ❌ 0% | Placeholder |
| **Courses** | ⚠️ 10% (basic layout) | ❌ 0% | ❌ 0% | ❌ 0% | Placeholder |
| **Finance** | ⚠️ 10% (basic layout) | ❌ 0% | ❌ 0% | ❌ 0% | Placeholder |
| **Settings** | ⚠️ 10% (basic layout) | ❌ 0% | ❌ 0% | ❌ 0% | Placeholder |

### Codebase Metrics

| Metric | Count | Notes |
|--------|-------|-------|
| **Total Pages** | 9 | 8 .tsx, 1 .jsx |
| **Components** | 6 | 4 main, 2 kanban-specific |
| **TypeScript Files** | 22+ | Includes configs |
| **Largest Component** | 780 lines | KanbanBoard.tsx |
| **Config Files** | 6 | package.json, tsconfig, next.config, eslint, postcss, globals.css |
| **Git Commits** | 2 | Very early stage |

### What Works Today

✅ **Fully Functional:**
1. Login page (with dev credentials)
2. Navigation between all pages
3. Kanban board with full drag-and-drop
4. Task CRUD in Kanban board
5. Client search and priority filtering
6. Dark theme design system
7. Responsive layouts

### What Doesn't Work Yet

❌ **Not Implemented:**
1. Real authentication (no sessions, no JWT, no OAuth)
2. Database (no persistence)
3. API routes (no backend)
4. Client management features
5. Collaborator management features
6. Course management features
7. Financial tracking features
8. Settings/configuration features
9. File uploads to Google Drive
10. Email notifications
11. Payment gateway integration
12. Real-time updates
13. Role-based access control
14. Analytics and reporting
15. Search functionality (except Kanban client search)

---

## Future Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)

#### 1.1 Database Setup
- [ ] Choose database (PostgreSQL recommended)
- [ ] Set up database provider (Vercel Postgres, Supabase, Railway, etc.)
- [ ] Install Prisma ORM
- [ ] Design database schema
- [ ] Create migrations
- [ ] Seed database with test data

#### 1.2 Authentication
- [ ] Choose auth provider (NextAuth.js, Clerk, or Supabase Auth)
- [ ] Implement login/logout
- [ ] Add session management
- [ ] Implement role-based access control (Admin, Collaborator)
- [ ] Add password reset flow
- [ ] Add registration for collaborators (invite-only)

#### 1.3 API Layer
- [ ] Create API routes in `/app/api`
- [ ] Set up error handling
- [ ] Add request validation (Zod)
- [ ] Implement CRUD endpoints for all entities
- [ ] Add authentication middleware

---

### Phase 2: Core Features (Weeks 3-5)

#### 2.1 Client Management
- [ ] Client listing with pagination
- [ ] Client creation form
- [ ] Client detail view
- [ ] Client editing
- [ ] Client deletion (soft delete)
- [ ] Assign collaborators to clients
- [ ] Track deliverables per client

#### 2.2 Task Management (Connect to DB)
- [ ] Connect Kanban board to API
- [ ] Replace local state with server state
- [ ] Add React Query or SWR for data fetching
- [ ] Implement optimistic updates
- [ ] Add task comments
- [ ] Add file attachment URLs
- [ ] Add task history/audit log

#### 2.3 Collaborator Management
- [ ] Collaborator listing
- [ ] Collaborator creation (invite system)
- [ ] Assign collaborators to clients
- [ ] Track workload and availability
- [ ] Mental health tracking

---

### Phase 3: Advanced Features (Weeks 6-8)

#### 3.1 Financial Management
- [ ] Invoice generation
- [ ] Payment tracking
- [ ] Delinquent client detection
- [ ] Payment gateway integration (Stripe or PayPal)
- [ ] Financial reports
- [ ] Automated payment reminders

#### 3.2 Dashboard & Analytics
- [ ] Real-time metrics
- [ ] SQL views integration (if using social media APIs)
- [ ] Performance reports
- [ ] Monthly report generation (PDF export)
- [ ] Chilli Points system implementation

#### 3.3 Courses/Products
- [ ] Course listing
- [ ] Course creation
- [ ] Content management
- [ ] Student enrollment
- [ ] Revenue tracking

---

### Phase 4: Integrations (Weeks 9-10)

#### 4.1 Google Drive Integration
- [ ] Set up Google OAuth
- [ ] Implement file picker
- [ ] Upload files to Drive
- [ ] Link files to tasks
- [ ] Permission management

#### 4.2 Email Notifications
- [ ] Choose email service (SendGrid, Resend, Mailgun)
- [ ] Set up transactional emails
- [ ] Task assignment notifications
- [ ] Due date reminders
- [ ] Payment reminders
- [ ] Weekly reports

#### 4.3 Social Media APIs (Optional)
- [ ] Instagram API integration
- [ ] Facebook API integration
- [ ] Analytics data import
- [ ] Performance tracking

---

### Phase 5: Polish & Launch (Weeks 11-12)

#### 5.1 UX Improvements
- [ ] Loading states for all async operations
- [ ] Error handling and user feedback
- [ ] Form validation (client & server)
- [ ] Toast notifications
- [ ] Keyboard shortcuts
- [ ] Mobile optimization

#### 5.2 Testing
- [ ] Unit tests for utilities
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Load testing

#### 5.3 DevOps
- [ ] Set up CI/CD pipeline
- [ ] Environment variables management
- [ ] Monitoring and error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Backup strategy

---

## Recommendations for Auth & Database

### Authentication Implementation

#### Option 1: NextAuth.js (Recommended for Custom Auth)

**Pros:**
- Most popular auth solution for Next.js
- Flexible and customizable
- Supports credentials, OAuth, email magic links
- Built-in session management
- TypeScript support
- Free and open-source

**Cons:**
- Requires more setup than managed solutions
- You manage the database tables
- Need to handle edge cases yourself

**Implementation Steps:**

1. **Install NextAuth:**
```bash
npm install next-auth
npm install @auth/prisma-adapter  # If using Prisma
```

2. **Create Auth Route:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
```

3. **Add Session Provider:**
```typescript
// app/providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

4. **Protect Routes:**
```typescript
// app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth");
  }

  return <div>Dashboard</div>;
}
```

5. **Add Middleware for Route Protection:**
```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      const pathname = req.nextUrl.pathname;

      if (pathname === "/auth") {
        return true;
      }

      if (!token) {
        return false;
      }

      // Admin-only routes
      if (pathname.startsWith("/colaboradores") || pathname.startsWith("/finanzas")) {
        return token.role === "admin";
      }

      return true;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/tareas/:path*", "/clientes/:path*", /* ... */],
};
```

---

#### Option 2: Clerk (Recommended for Fast Setup)

**Pros:**
- Fastest setup (15 minutes)
- Beautiful pre-built UI components
- Built-in user management dashboard
- Social login out of the box
- Email verification included
- Free tier: 10,000 monthly active users
- Excellent TypeScript support

**Cons:**
- Paid after free tier ($25/month for Pro)
- Less customizable than NextAuth
- Vendor lock-in

**Implementation Steps:**

1. **Install Clerk:**
```bash
npm install @clerk/nextjs
```

2. **Add Environment Variables:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

3. **Wrap App with ClerkProvider:**
```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

4. **Add Middleware:**
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/tareas(.*)",
  "/clientes(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

5. **Use in Components:**
```typescript
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <div>Welcome {user.firstName}!</div>;
}
```

**Recommendation:** Start with Clerk for rapid prototyping, migrate to NextAuth later if needed.

---

#### Option 3: Supabase Auth

**Pros:**
- Includes database (PostgreSQL) + auth in one
- Real-time subscriptions included
- Row-level security (RLS)
- Social login support
- Email magic links
- Free tier is generous

**Cons:**
- Vendor lock-in
- Learning curve for Supabase-specific patterns
- Need to understand RLS policies

**Use if:** You also choose Supabase for your database.

---

### Database Implementation

#### Option 1: Prisma + Vercel Postgres (Recommended)

**Why Prisma?**
- Best TypeScript support
- Type-safe database queries
- Excellent migrations
- Visual Studio Code extension
- Great documentation
- Works with any PostgreSQL database

**Why Vercel Postgres?**
- Seamless integration with Next.js on Vercel
- Free tier: 256 MB storage, 1 GB data transfer
- Pooling included
- Low latency

**Implementation Steps:**

1. **Install Prisma:**
```bash
npm install prisma @prisma/client
npx prisma init
```

2. **Define Schema:**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL") // Vercel Postgres requires this
}

enum UserRole {
  ADMIN
  COLLABORATOR
}

model User {
  id             String   @id @default(cuid())
  email          String   @unique
  hashedPassword String?
  name           String?
  role           UserRole @default(COLLABORATOR)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  assignedTasks  Task[]   @relation("AssignedTasks")
  createdTasks   Task[]   @relation("CreatedTasks")
}

model Client {
  id                String   @id @default(cuid())
  nombre            String
  email             String   @unique
  telefono          String?
  plan              Plan
  fechaInicio       DateTime
  estado            ClientStatus @default(ACTIVO)
  ultimoPago        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  tasks             Task[]
  collaborators     ClientCollaborator[]
  invoices          Invoice[]
}

model ClientCollaborator {
  id             String   @id @default(cuid())
  clientId       String
  userId         String
  assignedAt     DateTime @default(now())

  client         Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([clientId, userId])
}

enum StatusId {
  PENDIENTE
  EN_PROGRESO
  EN_REVISION
  APROBADA
  ARCHIVADA
}

enum Prioridad {
  ALTA
  MEDIA
  BAJA
}

enum TipoEntregable {
  ARTE
  REEL
  COPY
  VIDEO
  CARRUSEL
  OTRO
}

model Task {
  id              String          @id @default(cuid())
  titulo          String
  descripcion     String?
  statusId        StatusId        @default(PENDIENTE)
  prioridad       Prioridad?
  tipoEntregable  TipoEntregable?
  fechaEntrega    DateTime?
  mes             String?
  googleDriveUrl  String?

  clientId        String
  asignadoAId     String
  creadoPorId     String

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  client          Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  asignadoA       User            @relation("AssignedTasks", fields: [asignadoAId], references: [id])
  creadoPor       User            @relation("CreatedTasks", fields: [creadoPorId], references: [id])

  @@index([clientId])
  @@index([asignadoAId])
  @@index([statusId])
}

enum Plan {
  BASICO
  PRO
  PREMIUM
}

enum ClientStatus {
  ACTIVO
  MOROSO
  PAUSADO
  CANCELADO
}

model Invoice {
  id          String   @id @default(cuid())
  clientId    String
  monto       Float
  moneda      String   @default("MXN")
  estado      InvoiceStatus @default(PENDIENTE)
  fechaEmision DateTime @default(now())
  fechaVencimiento DateTime
  fechaPago   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([estado])
}

enum InvoiceStatus {
  PENDIENTE
  PAGADA
  VENCIDA
  CANCELADA
}

model Course {
  id          String   @id @default(cuid())
  titulo      String
  descripcion String?
  precio      Float
  imagen      String?
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

3. **Run Migration:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. **Create Prisma Client:**
```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

5. **Use in API Routes:**
```typescript
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const tasks = await prisma.task.findMany({
    include: {
      client: true,
      asignadoA: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const task = await prisma.task.create({
    data: {
      titulo: body.titulo,
      clientId: body.clientId,
      asignadoAId: body.asignadoAId,
      creadoPorId: body.creadoPorId,
      statusId: body.statusId,
      prioridad: body.prioridad,
      tipoEntregable: body.tipoEntregable,
      fechaEntrega: body.fechaEntrega ? new Date(body.fechaEntrega) : null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
```

6. **Use in Server Components:**
```typescript
// app/tareas/page.tsx
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default async function TareasPage() {
  const tasks = await prisma.task.findMany({
    include: {
      client: true,
      asignadoA: true,
    },
  });

  return <KanbanBoard initialTasks={tasks} />;
}
```

---

#### Option 2: Drizzle ORM + Vercel Postgres

**Pros:**
- Lighter than Prisma
- SQL-like syntax (easier if you know SQL)
- Better performance
- Smaller bundle size

**Cons:**
- Less mature ecosystem
- Fewer resources/tutorials
- Manual type generation

**Use if:** You prefer SQL-like queries and want better performance.

---

#### Option 3: Supabase (Database + Auth + Storage)

**Pros:**
- All-in-one solution (database, auth, storage, real-time)
- PostgreSQL with REST API auto-generated
- Row-level security (RLS)
- Real-time subscriptions
- Free tier: 500 MB database, 1 GB storage

**Cons:**
- Vendor lock-in
- Learning curve for Supabase-specific patterns
- RLS can be complex

**Implementation:**

1. **Install Supabase:**
```bash
npm install @supabase/supabase-js
```

2. **Create Client:**
```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

3. **Use in Components:**
```typescript
const { data: tasks } = await supabase
  .from("tasks")
  .select("*, client(*), assignee(*)")
  .eq("status", "pendiente");
```

**Use if:** You want an all-in-one backend solution and don't mind vendor lock-in.

---

### Final Recommendations

#### For SandiaShake Specifically:

**Authentication:**
- **Short-term (Prototype):** Clerk (fastest setup, great UX)
- **Long-term (Production):** NextAuth.js with credentials + Google OAuth

**Database:**
- **Recommended:** Prisma + Vercel Postgres
  - Best TypeScript experience
  - Excellent for complex relational data (clients → tasks → collaborators)
  - Vercel Postgres is free and fast
  - Easy to migrate to other PostgreSQL providers later

**Alternative (All-in-One):**
- Supabase (Database + Auth + Storage)
  - Good if you want Google Drive alternative (Supabase Storage)
  - Real-time updates for Kanban board
  - Single vendor for everything

#### Architecture Recommendation:

```
┌─────────────────────────────────────┐
│         Next.js App (Vercel)        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Authentication (Clerk)    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Prisma ORM (Type-safe)     │   │
│  └─────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Vercel Postgres (Database)        │
└─────────────────────────────────────┘

External Integrations:
┌─────────────────────────────────────┐
│   Google Drive API (File Storage)   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│   Resend (Transactional Emails)     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│   Stripe (Payments)                 │
└─────────────────────────────────────┘
```

---

## Additional Recommendations

### 1. State Management

**Current:** Local state with `useState`

**Recommendation:** Add **React Query** (TanStack Query)

```bash
npm install @tanstack/react-query
```

**Why?**
- Perfect for server state (API data)
- Automatic caching and refetching
- Optimistic updates for Kanban board
- Loading and error states built-in
- Works great with Next.js

**Example:**
```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function KanbanBoard() {
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      return res.json();
    },
  });

  // Update task
  const updateTask = useMutation({
    mutationFn: async (task: Task) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(task),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  // ...
}
```

---

### 2. Form Handling

**Current:** Manual state management for forms

**Recommendation:** Add **React Hook Form** + **Zod**

```bash
npm install react-hook-form zod @hookform/resolvers
```

**Why?**
- Less boilerplate
- Built-in validation
- Better performance (fewer re-renders)
- Type-safe with Zod schemas

**Example:**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const taskSchema = z.object({
  titulo: z.string().min(1, "Título requerido"),
  clientId: z.string().min(1, "Cliente requerido"),
  asignadoAId: z.string().min(1, "Asignado requerido"),
  prioridad: z.enum(["Alta", "Media", "Baja"]).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function TaskForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const onSubmit = (data: TaskFormData) => {
    // data is fully typed and validated
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("titulo")} />
      {errors.titulo && <span>{errors.titulo.message}</span>}
      {/* ... */}
    </form>
  );
}
```

---

### 3. File Structure Refactor

**Current:**
```
/components/
  - Shell.tsx
  - Sidebar.tsx
  - SectionCard.tsx
  - kanban/...
```

**Recommended:**
```
/components/
  /layout/
    - Shell.tsx
    - Sidebar.tsx
  /ui/
    - SectionCard.tsx
    - Button.tsx
    - Input.tsx
    - Modal.tsx
  /kanban/
    - KanbanBoard.tsx
    - TaskCard.tsx
    - ...
  /clients/
    - ClientCard.tsx
    - ClientForm.tsx
  /collaborators/
    - CollaboratorCard.tsx
    - CollaboratorForm.tsx

/lib/
  - prisma.ts
  - auth.ts
  - utils.ts

/types/
  - models.ts
  - api.ts

/hooks/
  - useUser.ts
  - useTasks.ts
  - useClients.ts

/services/
  - tasks.ts
  - clients.ts
  - collaborators.ts
```

---

### 4. Environment Variables

**Create `.env.local`:**
```env
# Database
DATABASE_URL="postgres://..."
DIRECT_DATABASE_URL="postgres://..."

# Auth (if using NextAuth)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Auth (if using Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Google Drive
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email (Resend)
RESEND_API_KEY="re_..."

# Payments (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

### 5. Error Handling

**Add Error Boundaries:**
```typescript
// app/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Algo salió mal</h2>
      <button onClick={() => reset()}>Intentar de nuevo</button>
    </div>
  );
}
```

**Add Loading States:**
```typescript
// app/tareas/loading.tsx
export default function Loading() {
  return <div>Cargando tareas...</div>;
}
```

---

### 6. Deployment Checklist

- [ ] Set up Vercel project
- [ ] Add environment variables in Vercel dashboard
- [ ] Set up Vercel Postgres database
- [ ] Run database migrations in production
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics (Vercel Analytics or PostHog)
- [ ] Configure custom domain
- [ ] Set up SSL (automatic with Vercel)
- [ ] Enable caching where appropriate
- [ ] Test production build locally (`npm run build && npm start`)

---

## Conclusion

SandiaShake is a well-architected Next.js application with a solid foundation. The project uses modern technologies (Next.js 16, React 19, TypeScript, Tailwind v4) and follows best practices for structure and styling.

**Current State:**
- Strong UI foundation with dark theme design system
- Fully functional Kanban board (780 LOC, production-ready UI)
- Clean routing structure with 9 pages
- Type-safe TypeScript configuration
- Modern tooling (ESLint, Tailwind v4)

**Next Steps:**
1. Implement authentication (Clerk for speed or NextAuth for customization)
2. Set up database (Prisma + Vercel Postgres recommended)
3. Create API routes for CRUD operations
4. Connect Kanban board to database
5. Build out client and collaborator management features
6. Add Google Drive and payment gateway integrations
7. Implement reporting and analytics

**Estimated Timeline:**
- **MVP with Database + Auth + Core Features:** 4-6 weeks
- **Full Feature Set with Integrations:** 8-12 weeks
- **Production-Ready with Testing:** 12-16 weeks

This project has excellent potential to become a powerful CRM for audiovisual project management with the right backend infrastructure and feature implementation.

---

**Document Version:** 1.0
**Author:** Technical Documentation
**Date:** December 6, 2025
