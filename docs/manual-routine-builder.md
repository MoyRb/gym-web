# Manual Routine Builder — Arquitectura

## Principio

Los usuarios que ya saben lo que hacen crean su rutina directamente.
Usa el **mismo motor** que las rutinas AI y template — sin código paralelo.

---

## Ruta

`/dashboard/rutina/nueva`

Parámetro opcional: `?from={planId}` pre-carga un plan existente para edición.

---

## API

`POST /api/workout/plans/manual`

Llama al RPC `create_workout_plan` con `source = 'manual'`.

El RPC es atómico:
1. Archiva el plan activo anterior
2. Crea el nuevo plan como `status = 'active'`, `is_active = true`

No se deja al usuario en un estado inconsistente.

### Request body

```ts
{
  name: string             // required
  goal: string             // ganar_masa_muscular | bajar_grasa | ...
  experience: string       // principiante | intermedio | avanzado
  days: Array<{
    name: string
    exercises: Array<{
      exercise_id: string  // UUID from public.exercises
      sets: number         // >= 1
      reps_min: number | null
      reps_max: number | null
      duration_seconds: number | null
      rest_seconds: number // >= 0
      rir: number | null
      notes: string | null
    }>
  }>
}
```

### Validación server-side

1. Nombre obligatorio
2. Goal y experience deben ser valores válidos del schema
3. Al menos 1 día, máximo 7
4. Cada día con nombre y al menos 1 ejercicio
5. series >= 1, rest_seconds >= 0
6. **exercise_id validado contra `public.exercises`** — previene IDs inválidos

### Security

- `userId` viene de la sesión autenticada, nunca del body
- Writes via service_role (RPC SECURITY DEFINER)
- Autenticación requerida (401 sin sesión)

---

## Tablas reutilizadas

| Tabla | Uso |
|---|---|
| `workout_plans` | Plan principal (`source = 'manual'`) |
| `workout_plan_days` | Días del plan |
| `workout_plan_exercises` | Ejercicios por día |
| `exercises` | Catálogo (solo lectura, validación) |

No se crean tablas nuevas.

---

## Estrategia de edición / versionado

"Editar" crea una nueva versión del plan:
1. Plan anterior → `status = 'archived'`, `is_active = false`
2. Nuevo plan → `status = 'active'`, `is_active = true`, `version += 1`

Las sesiones históricas son seguras porque:
- `workout_session_exercises` es un snapshot de ejercicios al momento de la sesión
- `workout_sessions.workout_plan_day_id` es `ON DELETE SET NULL` — el plan puede archivarse sin romper el historial
- `exercise_id` en `workout_session_exercises` apunta a `public.exercises` directamente

El usuario ve su historial con los datos correctos de cuando entrenó.

---

## Ejercicios

El selector usa `public.exercises` directamente desde el cliente Supabase autenticado.
Búsqueda por nombre (ilike), filtro por body_part.

Se muestran ejercicios activos (`is_active = true`).
No se crean ejercicios personalizados en V1.

---

## Cuota

Las rutinas manuales **no consumen cuota de IA**.
Un usuario Free puede crear y editar tantas rutinas manuales como quiera.

---

## Analytics

- `manual_plan_started` — al cargar la página (pendiente)
- `manual_plan_created` — al guardar exitosamente (implementado en API route)
- `manual_plan_updated` — al editar (implementado como `manual_plan_created` en V1)
- `manual_plan_activated` — equivalente a `manual_plan_created` (RPC activa automáticamente)

---

## Próxima mejora

- Duplicar rutina (crear copia con nuevo nombre)
- Ejercicios personalizados
- Drag-and-drop ordering (actualmente ↑↓ buttons)
- Vista previa antes de guardar
