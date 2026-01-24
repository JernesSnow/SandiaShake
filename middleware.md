# Next.js Middleware - What The Hell Is It?

## 🤔 What Is Middleware?

**Middleware** is code that runs **BEFORE** a request is completed. Think of it as a **bouncer at a club** - it checks every request before letting it through.

In Next.js, middleware runs on **every single request** to your app before the page loads or API route executes.

---

## 📍 Where Does It Run?

```
User Request → MIDDLEWARE → Page/API Route → Response
```

**Example:**
```
User visits /dashboard
  ↓
Middleware checks: "Is user logged in?"
  ↓ YES
Allows request to /dashboard page
  ↓
Dashboard page loads

  ↓ NO
Redirects to /auth (login page)
```

---

## 🎯 What Is It Used For?

### **Common Use Cases:**

1. **Authentication Checks** 🔐
   - Block unauthenticated users from protected pages
   - Redirect logged-in users away from login page

2. **Role-Based Access Control** 👮
   - Check if user has permission to view a page
   - Redirect CLIENTE away from admin pages

3. **Session Management** 🍪
   - Refresh auth tokens automatically
   - Set cookies properly
   - Fix that annoying "Invalid Refresh Token" error!

4. **Redirects & Rewrites** 🔄
   - Redirect old URLs to new ones
   - Rewrite URLs behind the scenes

5. **Geolocation/A-B Testing** 🌍
   - Show different content based on location
   - Split traffic for testing

---

## 🔧 How Does It Work in Next.js?

You create a file called `middleware.ts` in the **root** of your project:

```
your-project/
├── app/
├── lib/
├── middleware.ts  ← This file
├── package.json
└── ...
```

**Simple Example:**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // This runs on EVERY request
  console.log("Someone visited:", request.url);

  // Let the request continue
  return NextResponse.next();
}

// Specify which routes this applies to
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*']
};
```

---

## 🔐 Middleware for Authentication (Our Use Case)

### **What It Would Do For Us:**

```typescript
export async function middleware(request: NextRequest) {
  // 1. Check if user has valid session
  const session = await getSession(request);

  // 2. If no session and trying to access protected route
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    // Redirect to login
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // 3. If has session, refresh it (prevents token expiry errors)
  if (session) {
    // Refresh the session
    await refreshSession(request);
  }

  // 4. Let request continue
  return NextResponse.next();
}
```

---

## ✅ Benefits of Adding Middleware (For Our App)

### **1. Fixes "Invalid Refresh Token" Error** 🐛
- Middleware properly handles session refresh
- Sets cookies correctly on every request
- Eliminates console errors

### **2. Better Security** 🔒
- Protects routes at the server level (not just UI hiding)
- Users can't bypass by typing URL directly
- Automatic logout on token expiry

### **3. Automatic Session Refresh** 🔄
- Keeps users logged in seamlessly
- Refreshes tokens before they expire
- Better user experience

### **4. Role-Based Route Protection** 👮
- CLIENTE can't access /admin or /facturacion
- COLABORADOR can't access admin-only pages
- Enforced at the server level

### **5. Cleaner Code** 🧹
- Don't need to check auth on every page
- Centralized authentication logic
- Easier to maintain

---

## ❌ Downsides of Adding Middleware

### **1. Runs on Every Request** ⚡
- Adds a tiny bit of latency to every page load
- For simple apps, might be overkill

### **2. More Complex** 🧠
- Another file to understand and maintain
- Debugging can be trickier

### **3. Can Break Things If Wrong** 💥
- Infinite redirect loops if configured incorrectly
- Can accidentally block important requests

---

## 🔍 Do We Need It For SandiaShake?

### **Current State (Without Middleware):**

✅ Authentication works
✅ Users can register and login
✅ Email verification works
⚠️ Console shows "Invalid Refresh Token" error (harmless but annoying)
⚠️ Routes not protected at server level (only UI hiding)
⚠️ Users could theoretically access pages by typing URL directly

### **With Middleware:**

✅ Everything above works
✅ No console errors
✅ Routes protected at server level
✅ Automatic session refresh
✅ Better security
✅ Enforced role-based access

---

## 📊 Comparison: With vs Without

| Feature | Without Middleware | With Middleware |
|---------|-------------------|-----------------|
| Authentication works | ✅ | ✅ |
| Email verification | ✅ | ✅ |
| Console errors | ⚠️ Yes (harmless) | ✅ Clean |
| Server-side route protection | ❌ | ✅ |
| Automatic token refresh | ❌ | ✅ |
| Role-based access enforced | ❌ Only UI | ✅ Server-side |
| User types URL directly | ⚠️ Can access | ✅ Blocked |
| Code complexity | ✅ Simpler | ⚠️ More complex |
| Performance | ✅ Slightly faster | ⚠️ Tiny overhead |

---

## 🚀 Recommendation

### **You SHOULD add middleware if:**
- ✅ You want to eliminate console errors
- ✅ You want proper role-based access control (CLIENTE can't access admin pages)
- ✅ You want server-side route protection
- ✅ You're going to production soon
- ✅ Security is important (it should be!)

### **You can SKIP middleware if:**
- ✅ You're just testing/prototyping
- ✅ You don't care about console warnings
- ✅ You trust your users not to type URLs directly
- ✅ You want to keep things simple for now

---

## 📝 What Would We Implement?

If you say yes, I would create:

### **File: `middleware.ts`**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session (fixes token errors)
  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/colaboradores') ||
    request.nextUrl.pathname.startsWith('/clientes') ||
    request.nextUrl.pathname.startsWith('/tareas') ||
    request.nextUrl.pathname.startsWith('/cursos') ||
    request.nextUrl.pathname.startsWith('/facturacion') ||
    request.nextUrl.pathname.startsWith('/configuracion') ||
    request.nextUrl.pathname.startsWith('/kanban');

  // If no session and trying to access protected route
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // If has session and trying to access auth page, redirect to dashboard
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Role-based access control
  if (session && isProtectedRoute) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("rol")
      .eq("auth_user_id", session.user.id)
      .single();

    if (perfil) {
      const rol = perfil.rol;

      // CLIENTE can only access cursos and kanban
      if (rol === "CLIENTE") {
        const allowedPaths = ['/cursos', '/kanban'];
        const isAllowed = allowedPaths.some(path =>
          request.nextUrl.pathname.startsWith(path)
        );

        if (!isAllowed) {
          return NextResponse.redirect(new URL('/cursos', request.url));
        }
      }

      // COLABORADOR cannot access admin-only pages
      if (rol === "COLABORADOR") {
        const blockedPaths = ['/facturacion', '/configuracion'];
        const isBlocked = blockedPaths.some(path =>
          request.nextUrl.pathname.startsWith(path)
        );

        if (isBlocked) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**This would:**
- ✅ Fix "Invalid Refresh Token" errors
- ✅ Protect all routes at server level
- ✅ Enforce role-based access (CLIENTE → only cursos/kanban)
- ✅ Auto-refresh sessions
- ✅ Redirect logged-in users away from /auth
- ✅ Redirect logged-out users to /auth

---

## 🤷 So... Do We Add It?

**TL;DR:**
- **Middleware** = Code that runs before every request
- **Pros:** Fixes errors, better security, role-based access
- **Cons:** Slightly more complex, tiny performance overhead
- **Recommendation:** YES for production, OPTIONAL for development

---

## 📚 Learn More

- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase + Next.js Middleware](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [MDN: HTTP Middleware](https://developer.mozilla.org/en-US/docs/Glossary/Middleware)

---

**Your decision:** Do you want me to implement this middleware?

Just say **"yes"** and I'll add it, or **"no"** if you want to keep things simple for now.
