# Auth Email Setup — Alpha Trainer

## Already configured externally (DO NOT modify in code)

| Setting | Value |
|---------|-------|
| SMTP provider | Resend |
| SMTP host | smtp.resend.com |
| Auth domain | auth.alphatrainer.net |
| Sender name | Alpha Trainer |
| Sender address | no-reply@auth.alphatrainer.net |

Credentials live in the **Supabase Dashboard** → Settings → Auth → SMTP.
They are NOT in the codebase and must NOT be committed.

---

## Pending manual configuration (Supabase Dashboard)

### 1. Site URL

**Authentication → URL Configuration → Site URL**

```
https://alphatrainer.net
```

### 2. Redirect URLs (allowed list)

**Authentication → URL Configuration → Redirect URLs**

Add both:
```
http://localhost:3000/**
https://alphatrainer.net/**
```

### 3. Enable Email Confirmation

**Authentication → Providers → Email**

- Enable email confirmations: **ON**

### 4. Email Templates

Go to **Authentication → Email Templates** and copy the HTML from the files below.

#### Confirm signup template

File: `docs/auth-emails/confirm-signup.html`

- **Subject:** `Verifica tu cuenta de Alpha Trainer`
- **Body:** Copy full HTML content from the file above.

The confirmation link in the template uses:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

This points to the `/auth/confirm` route handler which calls `verifyOtp()` and sets the session.

#### Password recovery template

File: `docs/auth-emails/recovery.html`

- **Subject:** `Restablece tu contraseña de Alpha Trainer`
- **Body:** Copy full HTML content from the file above.

The recovery link uses:
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

After verification, the user is redirected to `/reset-password`.

---

## Flow overview

```
New user signup
  → POST /api/auth/register (validation + signUp via SSR client)
  → /verify-email (shows pending email, resend button)
  → Email arrives → user clicks link
  → GET /auth/confirm?token_hash=...&type=email
  → verifyOtp() → session set
  → redirect /dashboard/perfil

Password recovery
  → /forgot-password (enters email)
  → resetPasswordForEmail() sends email
  → Email arrives → user clicks link
  → GET /auth/confirm?token_hash=...&type=recovery
  → verifyOtp() → temporary session set
  → redirect /reset-password
  → updateUser({ password }) → done

Legacy login (existing users)
  → /login → toggle "cuenta anterior"
  → username → fitnessclub.local internal email → signInWithPassword
  → session set → /dashboard
```

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Used only for server-side reads (username check) |

No Resend API key is needed in the Next.js application.
No SMTP credentials should ever be committed to the repository.

---

## Legacy email migration

Users with `@fitnessclub.local` emails can still log in via the legacy toggle.
Migration to real emails is **not yet implemented** — requires review of Secure Email Change flow.

A future "Agregar correo" CTA will be added to the Security section of the profile page when ready.
