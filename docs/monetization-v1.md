# Monetization V1 — Alpha Trainer

## Planes

### FREE — $0 MXN/mes
- Rutinas manuales: **ilimitadas**
- Seguimiento de entrenamientos: **ilimitado**
- Series / reps / peso / descansos: sí
- Historial y progreso básico: sí
- Catálogo completo de ejercicios: sí
- GIFs de ejercicios: sí
- Share Cards: sí
- Selección Gym / Casa / Ambos: sí
- Generaciones IA: **1 por ventana de 7 días (rolling)**
- Anuncios: sí (próximamente, cuando se integre proveedor)

### PRO — $99 MXN/mes (objetivo)
- Todo Free
- Generaciones IA: **20 por ventana de 30 días (fair use)**
- Sin anuncios
- Progreso avanzado: próximamente
- Funciones premium de IA: próximamente

> **Stripe** NO está implementado. El CTA Pro en `/pricing` está deshabilitado.

---

## Default Free

`user_access` no tiene fila para la mayoría de usuarios.
**Sin fila = Free**. Esto reduce datos innecesarios y simplifica el sistema.

Solo se inserta una fila cuando se asigna un plan superior (pro, founder).
Si `valid_until` existe y ya venció, el usuario vuelve a Free automáticamente.

---

## Tabla user_access

```sql
public.user_access (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id),
  plan        text CHECK (plan IN ('free', 'pro', 'founder')),
  source      text,           -- 'stripe', 'manual_test', 'founder_grant', etc.
  valid_until timestamptz,    -- null = no expiry
  created_at  timestamptz,
  updated_at  timestamptz
)
```

**RLS:** Solo `authenticated` puede SELECT su propio row.
`INSERT/UPDATE/DELETE` solo via `service_role` (webhooks, scripts admin).

---

## Cuota de IA

### Fuente de verdad

`public.ai_generation_sessions` con `status = 'completed'`.

Se cuenta cuántas generaciones completadas tiene el usuario dentro de la ventana deslizante.

### Ventana deslizante (rolling window)

No hay reset de calendario. La ventana es relativa a cada sesión completada.

Ejemplo Free:
- Generó martes 14:35
- Próxima generación disponible: martes siguiente 14:35

Esto evita complejidad de zonas horarias y cron jobs.

### Qué consume cuota

**SÍ consume:**
- Una nueva rutina completa con IA que finaliza correctamente (`status = 'completed'`)
- Regenerar toda la rutina con IA (también es una nueva sesión)

**NO consume:**
- Intento fallido (`status = 'failed'`)
- Draft incompleto / abandonado
- Error del provider (Groq/rate limit)
- Crear rutina manual
- Editar rutina manual
- Registrar workout / completar sesión

### Enforcement

**CRÍTICO:** La cuota se comprueba en `POST /api/workout/generate-ai/start` **antes** de llamar al provider.

Respuesta cuando blocked:
```json
{
  "code": "ai_quota_exceeded",
  "next_available_at": "2026-08-27T14:35:00.000Z",
  "error": "Has alcanzado el límite de generaciones con IA para tu plan."
}
```
HTTP 429.

La UI que oculta el botón es UX, no seguridad.

---

## Entitlements

Función central: `getUserEntitlements(userId)` en `src/lib/entitlements/get-entitlements.ts`

```ts
{
  plan: "free" | "pro" | "founder",
  canCreateManualPlans: true,        // todos los planes
  canTrackWorkouts: true,            // todos los planes
  aiGenerationAllowed: boolean,      // false = quota exceeded
  aiNextAvailableAt: Date | null,    // when quota resets
  showAds: boolean,                  // free = true
  advancedAnalytics: boolean,        // pro/founder = true
}
```

Configuración centralizada en `src/lib/entitlements/config.ts`:
```ts
FREE_AI_WINDOW_DAYS: 7
FREE_AI_GENERATIONS: 1
PRO_AI_WINDOW_DAYS: 30
PRO_AI_GENERATIONS: 20
```

---

## Cómo promover un usuario a Pro (sin Stripe)

Ejecutar via Supabase SQL editor (requiere service_role):

```sql
INSERT INTO public.user_access (user_id, plan, source)
VALUES ('<user-uuid>', 'pro', 'manual_test')
ON CONFLICT (user_id) DO UPDATE
  SET plan = 'pro', source = 'manual_test', updated_at = now();
```

**Nunca** via browser o endpoint público.

---

## Seguridad

- `user_access`: authenticated NO puede escribir su propio plan. Fail closed.
- `user_roles`: fuente de verdad para admin. No se toca en este corte.
- `profiles.is_admin`: deprecated para admin, ignorado para billing.
- Ser admin NO implica automáticamente Pro.

---

## Roadmap (NO implementado en V1)

- Stripe / Mercado Pago
- Anuncios reales (Google AdSense / AdMob)
- Plan Founder
- Planes anuales
- Cupones / trials
- Invoices
- Coach plans / Gym B2B
