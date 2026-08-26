# Stripe Setup — Alpha Trainer

## Product

**Product:** Alpha Trainer Pro
**Price:** $99 MXN / mes (recurrente mensual)
**Modo:** Sandbox (test) → Live para producción

---

## Variables de entorno requeridas

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_1U8nmIRP1LyISUOVIpEqGsV5
STRIPE_WEBHOOK_SECRET=whsec_...   ← configurar después de crear el webhook
```

**Reglas de seguridad:**
- `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` son **server-only**. Nunca usar prefijo `NEXT_PUBLIC_`.
- Nunca loggear, imprimir ni exponer estos valores en respuestas API, HTML o bundle del cliente.

---

## Endpoints implementados

| Endpoint | Método | Función |
|---|---|---|
| `/api/billing/checkout` | POST | Crea Stripe Checkout Session |
| `/api/billing/portal` | POST | Crea Stripe Customer Portal Session |
| `/api/stripe/webhook` | POST | Recibe eventos Stripe |

---

## Configurar webhook en Stripe Dashboard

### Sandbox
1. Ir a **Developers → Webhooks → Add endpoint**
2. URL: `https://alphatrainer.net/api/stripe/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copiar el **Signing secret** (`whsec_...`) y guardarlo como `STRIPE_WEBHOOK_SECRET`

### Para desarrollo local con Stripe CLI

```bash
# 1. Autenticarse en Stripe
stripe login

# 2. Escuchar y reenviar al servidor local
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

El CLI imprimirá:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

Copiar el `whsec_...` y guardarlo en `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**No hacer commit de `.env.local`.**

---

## Customer Portal

El Customer Portal de Stripe debe estar configurado en:
**Stripe Dashboard → Settings → Billing → Customer portal**

Activar al menos:
- Cancelar suscripción
- Ver historial de pagos / invoices
- Actualizar método de pago

---

## Tarjeta de prueba (sandbox)

```
Número:   4242 4242 4242 4242
Fecha:    Cualquier fecha futura
CVC:      Cualquier 3 dígitos (ej. 123)
ZIP:      Cualquier código postal (ej. 12345)
```

Para simular pago fallido: `4000 0000 0000 9995`
Para simular 3D Secure: `4000 0025 0000 3155`

---

## Billing Tables (base de datos)

Creadas en: `supabase/migrations/20260826000000_billing_tables.sql`

| Tabla | Descripción |
|---|---|
| `billing_customers` | Mapeo `user_id` → `stripe_customer_id` (1:1) |
| `billing_subscriptions` | Estado de suscripción mirroreado de Stripe |
| `billing_webhook_events` | Log de idempotencia (event IDs procesados) |

**RLS:** Solo `service_role` puede escribir en estas tablas. Los browsers no tienen acceso.

---

## Flujo de entitlements

```
Stripe Webhook
  → /api/stripe/webhook (verifica firma HMAC)
  → syncStripeSubscription(subscriptionId)
      → Fetch authoritative state from Stripe API
      → Upsert billing_subscriptions
      → Proyectar entitlement → user_access
          (plan='pro', source='stripe', valid_until=current_period_end)

getUserEntitlements(userId)
  → Lee user_access (no row = free)
  → Si source='stripe' y sub cancelada → elimina fila → free
  → Si source='founder_grant'/'manual_test' → preserva siempre
```

**Precedencia:**
1. `founder_grant` / `manual_test` (grants manuales) — máxima prioridad
2. Stripe Pro activo (`source='stripe'`, status active/trialing/past_due)
3. Free (sin fila)

---

## Eliminación de cuenta

Antes de `auth.admin.deleteUser()`, el endpoint `/api/account/delete` llama a `cancelStripeSubscriptionsForUser(userId)`.

Si la cancelación de Stripe falla → **la cuenta NO se elimina** y se retorna error al usuario.

Esto evita suscripciones huérfanas activas tras borrar la cuenta.

---

## Migration a producción (Live mode)

1. Crear producto/precio en Live mode con mismo valor ($99 MXN/mes)
2. Actualizar `STRIPE_SECRET_KEY` con `sk_live_...` en Vercel
3. Actualizar `STRIPE_PRO_MONTHLY_PRICE_ID` con el price ID de Live
4. Configurar webhook en Live mode (nuevo `whsec_...`)
5. Actualizar `STRIPE_WEBHOOK_SECRET` en Vercel
6. Configurar Customer Portal en Live mode
7. Aplicar la migration `20260826000000_billing_tables.sql` en la DB de producción si no está aplicada

---

## Vercel environment variables

En Vercel Dashboard → Project → Settings → Environment Variables:

```
STRIPE_SECRET_KEY         → Production, Preview, Development
STRIPE_PRO_MONTHLY_PRICE_ID → Production, Preview, Development
STRIPE_WEBHOOK_SECRET     → Production, Preview (NO development — usar Stripe CLI localmente)
```
