# Product Analytics — Event Catalog V1

**Status:** Implementado — CORTE ADMIN 2 (2026-08-20)
**Schema:** analytics_events V2 (migration 20260820000000_analytics_events_v2.sql)

---

## Schema de analytics_events (V2)

```sql
id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid()
user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL  -- nullable
event_type          text        NOT NULL
metadata            jsonb       NOT NULL DEFAULT '{}'
created_at          timestamptz NOT NULL DEFAULT now()
-- V2 additions:
schema_version      integer     NOT NULL DEFAULT 1
occurred_at         timestamptz NOT NULL DEFAULT now()  -- time of event (tracking time)
workout_session_id  uuid        REFERENCES workout_sessions(id)  ON DELETE SET NULL
workout_plan_id     uuid        REFERENCES workout_plans(id)     ON DELETE SET NULL
exercise_id         uuid        REFERENCES exercises(id)          ON DELETE SET NULL
dedupe_key          text        -- UNIQUE partial index WHERE NOT NULL
```

---

## Eventos V1 — implementados

### `workout_started`
- **Origen:** `POST /api/workout/sessions`
- **Cuándo:** Después de crear la sesión exitosamente.
- **userId:** Del usuario autenticado en el servidor.
- **dedupeKey:** `workout_started:{sessionId}` (idempotente)
- **workoutSessionId:** UUID de la sesión creada.
- **metadata:** `{}`

---

### `workout_completed`
- **Origen:** `PATCH /api/workout/sessions/[sessionId]` (action=complete)
- **Cuándo:** Sesión marcada como completada.
- **dedupeKey:** `workout_completed:{sessionId}` (idempotente)
- **workoutSessionId:** UUID de la sesión.
- **metadata:** `{}`

---

### `workout_cancelled`
- **Origen:** `PATCH /api/workout/sessions/[sessionId]` (action=cancel)
- **Cuándo:** Sesión cancelada.
- **dedupeKey:** ninguno (cancelaciones no necesitan idempotencia estricta)
- **workoutSessionId:** UUID de la sesión.
- **metadata:** `{}`

---

### `set_completed`
- **Origen:** `PATCH /api/workout/sessions/[sessionId]/sets/[setId]` (completed=true)
- **Cuándo:** Una serie individual marcada como completada.
- **workoutSessionId:** UUID de la sesión.
- **metadata:** `{ set_id: string }`

---

### `exercise_viewed`
- **Origen:** `src/app/dashboard/exercises/[id]/page.tsx` (Server Component)
- **Cuándo:** Página de detalle de un ejercicio cargada exitosamente.
- **exerciseId:** UUID del ejercicio.
- **metadata:** `{ body_part: string, equipment: string }`
- **Privacidad:** Ningún dato PII. Señal agregada de demanda por ejercicio.

---

### `exercise_searched`
- **Origen:** `src/app/dashboard/exercises/page.tsx` (Server Component)
- **Cuándo:** Búsqueda con query `q` no vacío, sin error de BD.
- **metadata:** `{ result_count: number, has_body_part_filter: boolean, has_equipment_filter: boolean }`
- **Privacidad:** El texto de búsqueda NO se persiste (solo resultado count y filtros booleanos).

---

### `ai_generation_started`
- **Origen:** `POST /api/workout/generate-ai/start`
- **Cuándo:** Después de crear la `ai_generation_sessions` record exitosamente.
- **dedupeKey:** `ai_gen_started:{generationId}` (idempotente)
- **workoutPlanId:** UUID del plan borrador.
- **metadata:** `{ generation_id, total_batches, goal, experience }`
- **Privacidad:** Solo goal/experience (categóricas). Sin edad, peso, talla, sexo.

---

### `ai_generation_completed`
- **Origen:** `POST /api/workout/generate-ai/[generationId]/finalize`
- **Cuándo:** Después de marcar la sesión como completed.
- **dedupeKey:** `ai_gen_completed:{generationId}` (idempotente)
- **workoutPlanId:** UUID del plan finalizado.
- **metadata:** `{ generation_id }`

---

### `ai_generation_failed`
- **Origen:** `POST /api/workout/generate-ai/start` (batch 0 fallo no-retryable)
- **Cuándo:** Error no recuperable en batch 0 (excluye rate limit que sí permite retry).
- **workoutPlanId:** UUID del plan borrador (que será eliminado o quedará en draft).
- **metadata:** `{ generation_id, error: string }`

---

## Eventos legacy — mantenidos en src/utils/analytics.ts

| event_type        | Origen              | Descripción                    |
|-------------------|---------------------|--------------------------------|
| register          | Client-side         | Usuario completa registro      |
| login             | Client-side         | Usuario hace login             |
| profile_completed | Client-side         | Usuario completa su perfil     |
| routine_viewed    | Client-side         | Usuario ve una rutina template |
| pdf_downloaded    | Client-side         | Usuario descarga un PDF        |

Nota: Estos eventos se excluyen del cálculo de DAU/WAU/MAU en `admin_get_product_stats()`.

---

## Abstracción de tracking servidor

```ts
// src/lib/analytics/server.ts
import { trackServerEvent } from "@/lib/analytics/server"

await trackServerEvent({
  name: EVENTS.WORKOUT_STARTED,  // de src/lib/analytics/events.ts
  userId: user.id,               // SIEMPRE del servidor, nunca del body
  workoutSessionId: sessionId,   // opcional
  workoutPlanId: planId,         // opcional
  exerciseId: exerciseId,        // opcional
  metadata: {},                  // objeto JSON arbitrario
  dedupeKey: "key",              // opcional — habilita idempotencia
})
```

**Garantías de seguridad:**
- `userId` SIEMPRE del session server-side, nunca del request body.
- Fire-and-forget: usa `void trackServerEvent(...)`, no bloquea la respuesta.
- Errores silenciosos en producción (únicamente `console.error` en dev).
- Duplicado por `dedupe_key` ignorado silenciosamente (pg error 23505).

---

## Consultas admin (RPCs)

| RPC                          | Retorna                                      |
|------------------------------|----------------------------------------------|
| `admin_get_product_stats()`  | DAU/WAU/MAU + counts por evento y ventana    |
| `admin_get_funnel_stats()`   | 5 pasos del funnel de activación             |

Página: `/dashboard/admin/product`

---

*Creado en CORTE ADMIN 2 — 2026-08-20*
