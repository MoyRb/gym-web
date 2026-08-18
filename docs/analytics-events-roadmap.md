# Product Analytics Events — Roadmap

**Status:** Planificado — NO implementado todavía.
**CORTE:** ADMIN 2 (próxima iteración)

---

## Contexto

Durante CORTE ADMIN 1 identificamos que ciertas métricas no pueden obtenerse
de las tablas transaccionales existentes.

Las tablas actuales (`workout_sessions`, `workout_sets`, `exercises`, etc.) son
suficientes para métricas de volumen y agregados. Sin embargo, no capturan
eventos de navegación, comportamiento dentro de la sesión, ni señales de
intención del usuario.

Esta es la lista de eventos a instrumentar en CORTE ADMIN 2.

---

## Métricas NO obtenibles actualmente

| Métrica | Razón |
|---|---|
| Ejercicio reemplazado | No hay tabla de sustituciones |
| Ejercicio saltado | La sesión solo registra ejercicios que se inician |
| Tiempo por ejercicio | `workout_session_exercises` no tiene timestamps |
| GIF visto | Solo registrado si el usuario navega al detalle |
| Tasa de abandono mid-workout | No distinguible de sesión in_progress cancelada |
| Token usage / costo por generación AI | No persistido en `ai_generation_sessions` |
| Ejercicio visto en catálogo | Solo conteos de `exercise_media`, no de navegación |
| Fuente de inicio de sesión (plan vs manual) | No está en `workout_sessions` |

---

## Eventos futuros recomendados

### `workout_started`
- **Objetivo:** Confirmar inicio intencional de sesión (vs creación automática).
- **Metadata:** `{ session_id, plan_id, day_number, exercise_count }`
- **PII:** No
- **Utilidad B2B:** Frecuencia de uso por franjas horarias, days of week demand

---

### `workout_completed`
- **Objetivo:** Distinguir finalización exitosa de abandono.
- **Metadata:** `{ session_id, duration_seconds, total_sets, completed_sets, completion_rate }`
- **PII:** No
- **Utilidad B2B:** Completion rate real (actual vs la estimación actual por status)

---

### `exercise_started`
- **Objetivo:** Saber cuándo inicia el usuario cada ejercicio (timestamp).
- **Metadata:** `{ session_exercise_id, exercise_id, sort_order }`
- **PII:** No
- **Utilidad B2B:** Tiempo real por ejercicio, drop-off por posición en sesión

---

### `exercise_completed`
- **Objetivo:** Confirmar que el usuario completó todos los sets del ejercicio.
- **Metadata:** `{ session_exercise_id, exercise_id, sets_completed, duration_seconds }`
- **PII:** No
- **Utilidad B2B:** Ejercicios más completados vs iniciados (engagement quality)

---

### `exercise_skipped`
- **Objetivo:** Detectar ejercicios que los usuarios deciden no hacer.
- **Metadata:** `{ session_exercise_id, exercise_id, reason? }`
- **PII:** No (reason es categórica, no texto libre)
- **Utilidad B2B:** Alta demanda de sustitutos, fatiga por tipo de movimiento

---

### `exercise_replaced`
- **Objetivo:** Detectar sustituciones de ejercicio dentro de una sesión.
- **Metadata:** `{ session_exercise_id, original_exercise_id, replacement_exercise_id, reason? }`
- **PII:** No
- **Utilidad B2B:** Indica falta de equipamiento o preferencia de usuario. Input para Gym Insights.

---

### `exercise_viewed`
- **Objetivo:** Medir demanda de información sobre ejercicios en el catálogo.
- **Metadata:** `{ exercise_id, source: "catalog" | "session" | "plan" }`
- **PII:** No
- **Utilidad B2B:** Popularidad de ejercicios por exploración (no solo uso en planes)

---

### `gif_viewed`
- **Objetivo:** Medir cuántos usuarios ven demostraciones GIF.
- **Metadata:** `{ exercise_id, context: "detail" | "session" }`
- **PII:** No
- **Utilidad B2B:** ROI de licencias de media; demanda de contenido visual por ejercicio

---

### `ai_generation_started`
- **Objetivo:** Punto de inicio explícito (actualmente se infiere por `ai_generation_sessions.created_at`).
- **Metadata:** `{ generation_id, goal, experience, days_per_week, total_batches }`
- **PII:** No (goal/experience son categóricas)
- **Utilidad B2B:** Demand por generación AI por perfil de usuario

---

### `ai_generation_completed`
- **Objetivo:** Confirmar finalización + capturar métricas de costo.
- **Metadata:** `{ generation_id, batches_completed, wall_time_seconds, input_tokens?, output_tokens?, cost_usd? }`
- **PII:** No
- **Utilidad B2B:** Costo por plan generado; ROI de capacidad AI

---

### `ai_generation_failed`
- **Objetivo:** Rastrear failures con causa.
- **Metadata:** `{ generation_id, batch_number, error_code, error_category }`
- **PII:** No
- **Utilidad B2B:** Reliability del servicio AI

---

## Tabla de eventos propuesta (CORTE ADMIN 2)

```sql
CREATE TABLE public.product_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  session_id  text,        -- correlation ID para agrupar eventos de una sesión
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**Índices necesarios:**
- `(event_type, created_at)` — filtrar por tipo en ventanas temporales
- `(user_id, created_at)` — funnel por usuario
- `(session_id)` — correlacionar eventos de una misma sesión

**Nota de privacidad:**
- No almacenar texto libre del usuario en `metadata`
- No almacenar IPs ni user agents
- `user_id` es nullable para eventos pre-autenticación si fuera necesario
- Los datos son para inteligencia agregada, no perfilado individual

---

## Principio B2B

El futuro producto **Alpha Trainer Gym Insights** debe construirse exclusivamente
sobre métricas agregadas. Los eventos individuales son la materia prima para
cómputos como:

- Demanda de equipamiento por tipo de usuario
- Frecuencia de entrenamiento por músculo objetivo
- Tasas de abandono por tipo de ejercicio
- ROI de generación AI vs completions reales

**Nunca se venderán:** emails, nombres, historiales individuales de entrenamiento.
**El producto es:** aggregate demand intelligence para operadores de gimnasios.

---

*Documento creado en CORTE ADMIN 1 — 2026-08-19*
*Próxima revisión: CORTE ADMIN 2 (implementación de product_events)*
