# Email Verification Flow - Updated Implementation

## ✅ How It Works Now

This implementation uses **Supabase's native `signUp()` method**, which automatically sends confirmation emails without needing external email services.

---

## 🔄 Registration & Verification Flow

### **Step 1: User Registers** (`/signup`)

```
User fills form → POST /api/registro → supabase.auth.signUp()
```

**What happens:**
1. User fills registration form with nombre, email, password
2. API calls `supabase.auth.signUp()` with:
   - Email and password
   - User metadata: `{ nombre, rol: "CLIENTE" }`
   - Email redirect: `/auth/callback`
3. **Supabase automatically sends confirmation email** 📧
4. User sees success message: "Revisa tu correo para confirmar tu cuenta"

**Important:** Profile is NOT created yet in `usuarios` table.

---

### **Step 2: User Receives Email**

Supabase sends an email with a confirmation link:
```
https://yourapp.com/auth/callback?code=CONFIRMATION_CODE
```

**Email template** can be customized in Supabase Dashboard:
- Go to Authentication → Email Templates
- Customize "Confirm signup" template

---

### **Step 3: User Clicks Confirmation Link**

```
Click link → /auth/callback → Exchange code for session → Create profile
```

**What happens:**
1. User clicks link in email
2. Redirected to `/auth/callback?code=XXX`
3. Callback exchanges code for session
4. **Checks if profile exists in `usuarios` table**
5. If not exists, **creates profile** with:
   - `nombre` from user_metadata
   - `rol: "CLIENTE"` from user_metadata
   - `estado: "ACTIVO"`
   - Links via `auth_user_id`
6. Redirects to `/dashboard`

---

### **Step 4: User Can Login**

After email confirmation, user can login with their credentials.

If they try to login **before** confirming email:
- Supabase returns error: "Email not confirmed"
- Login page shows: "Por favor confirma tu correo electrónico..."

---

## 📁 Files Modified

### **1. `app/api/registro/route.ts`** - Registration API

**Key Changes:**
```typescript
// Uses regular Supabase client (not admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// signUp automatically sends confirmation email
const { data, error } = await supabase.auth.signUp({
  email: correo,
  password: password,
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    data: {
      nombre: nombre,
      rol: "CLIENTE",
    },
  },
});
```

**Why this works:**
- `signUp()` triggers Supabase's built-in email system
- No need for external email services
- Email templates managed in Supabase dashboard

---

### **2. `app/auth/callback/route.ts`** - Email Confirmation Handler

**Key Changes:**
```typescript
// After exchanging code for session
const { data: { user } } = await supabase.auth.getUser();

// Check if profile exists
const { data: perfil } = await supabase
  .from("usuarios")
  .select("id_usuario")
  .eq("auth_user_id", user.id)
  .maybeSingle();

// Create profile if it doesn't exist
if (!perfil) {
  await supabase.from("usuarios").insert({
    nombre: user.user_metadata?.nombre || "Usuario",
    correo: user.email!,
    rol: user.user_metadata?.rol || "CLIENTE",
    admin_nivel: null,
    estado: "ACTIVO",
    auth_user_id: user.id,
  });
}
```

**Why this approach:**
- Profile created AFTER email confirmation
- Uses metadata saved during signup
- Prevents duplicate profiles
- Automatic and seamless

---

### **3. `app/signup/page.tsx`** - Signup Success Message

**Updated to:**
```
"Hemos enviado un correo de confirmación a {email}.
Por favor revisa tu bandeja de entrada..."
```

---

### **4. `app/auth/page.tsx`** - Login Error Handling

**Added:**
```typescript
if (signInError.message.includes("Email not confirmed")) {
  setError("Por favor confirma tu correo electrónico antes de iniciar sesión...");
}
```

---

## 🔧 Supabase Configuration Required

### **Enable Email Confirmations**

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Click on **Email**
4. Ensure **"Confirm email"** is ENABLED ✅

### **Set Redirect URLs**

1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

### **Customize Email Template (Optional)**

1. Go to **Authentication** → **Email Templates**
2. Select **"Confirm signup"**
3. Customize:
   - Subject line
   - Email body
   - Button text
   - Styling

**Default template works fine, but you can brand it:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

---

## 🧪 Testing the Flow

### **Test Case 1: Successful Registration**

1. Go to `/signup`
2. Fill form:
   - Nombre: "Test User"
   - Email: "test@example.com"
   - Password: "TestPass123"
3. Click "Crear cuenta"
4. ✅ See success message
5. ✅ Check email inbox
6. ✅ Click confirmation link
7. ✅ Redirected to `/dashboard`
8. ✅ Profile created in `usuarios` table

### **Test Case 2: Login Before Confirmation**

1. Register new account
2. Try to login immediately (without confirming email)
3. ✅ Should see: "Por favor confirma tu correo electrónico..."

### **Test Case 3: Confirmation Link Handling**

1. Register new account
2. Receive confirmation email
3. Click link
4. ✅ Redirected to callback
5. ✅ Profile auto-created
6. ✅ Can now login successfully

---

## 🐛 Troubleshooting

### **"No email received"**

**Check:**
1. Spam/junk folder
2. Email confirmations are enabled in Supabase
3. Supabase email quota (free tier limited)
4. Check Supabase logs for email sending errors

**Solution:**
- Enable email confirmations in dashboard
- Configure custom SMTP for production (optional)
- Use a real email address (not disposable)

### **"Email not confirmed" error persists**

**Check:**
1. User clicked the confirmation link
2. Link didn't expire (valid for 24 hours by default)
3. Check `auth.users` table - `email_confirmed_at` should be set

**Solution:**
- Resend confirmation email:
  ```typescript
  await supabase.auth.resend({
    type: 'signup',
    email: 'user@example.com'
  })
  ```

### **Profile not created after confirmation**

**Check:**
1. Callback route is working
2. User has `auth_user_id` in auth.users
3. No database constraint errors

**Solution:**
- Check server logs
- Verify `usuarios` table schema
- Ensure callback route has proper permissions

---

## 🔐 Security Features

### **Built-in Protection**

✅ **Email verification required** - Users cannot login without confirming email
✅ **One-time links** - Confirmation links can only be used once
✅ **Time-limited** - Links expire after 24 hours (configurable)
✅ **No duplicate accounts** - Email uniqueness enforced by Supabase

### **Rate Limiting**

Supabase automatically rate limits:
- Signup attempts
- Email sending
- Login attempts

---

## 📊 Email Quota (Free Tier)

**Supabase Free Tier:**
- **4 emails per hour** per project
- Suitable for development and testing
- For production, configure custom SMTP

**To increase quota:**
1. Upgrade to Pro plan ($25/month)
2. Or configure custom SMTP (SendGrid, Resend, etc.)

---

## 🚀 Production Recommendations

### **For Small Projects (< 100 users/day):**
✅ Use Supabase's built-in email system
- Simple setup
- No extra services needed
- Free tier is sufficient

### **For Growing Projects (100-1000 users/day):**
🎯 Configure custom SMTP in Supabase
- Go to Project Settings → Auth → SMTP Settings
- Use SendGrid, Resend, or Mailgun
- Better deliverability
- Higher sending limits

### **For Large Projects (1000+ users/day):**
🎯 Custom email service + API
- Build custom email sending logic
- Use dedicated email service
- Advanced tracking and analytics

---

## 📚 Related Documentation

- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Email Templates:** https://supabase.com/docs/guides/auth/auth-email-templates
- **SMTP Configuration:** https://supabase.com/docs/guides/auth/auth-smtp

---

## ✅ Summary

**Current Implementation:**
- ✅ Uses Supabase's native `signUp()` method
- ✅ Emails sent automatically by Supabase
- ✅ No external email service needed
- ✅ Profile created after email confirmation
- ✅ Secure and production-ready

**Advantages:**
- Simple and clean
- No extra dependencies
- Works out of the box
- Supabase handles everything

**Perfect for:**
- Development
- Small to medium projects
- Projects on free tier
- Quick MVP launches
