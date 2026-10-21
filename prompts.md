# Prompts por fase

## Constitución	

Proponme la constitución de este proyecto: N principios cortos y verificables sobre stack, calidad, tests y límites. Máx. 15 líneas. Espera mi aprobación.

## Spec (entrevista)

Vamos a especificar la feature [ID] correspondiente a [§0 del @README.md], respetando @CONSTITUTION.md y @AGENTS.md.

NO escribas código. Hazme preguntas de una en una sobre casos límite, errores y alcance que hoy estén ambiguos en el @README.md. Cuando termine de responderte, genera specs/[ID]/spec.md con:
1. Objetivo y contexto.
2. Requisitos Funcionales numerados (RF-01, RF-02…) en formato EARS (Cuando… el sistema deberá… / Si… entonces el sistema deberá…).
3. Casos límite y manejo de errores.
4. Fuera de alcance explícito.
5. Criterios de finalización (Definition of Done) verificables.
Solo el QUÉ y el POR QUÉ, nada de implementación.

## Clarificación

Revisa la spec como un QA profesional: ambigüedades, contradicciones, casos límite ausentes, conflictos con la constitución. Solo detecta, no resuelvas.

## Plan

A partir de specs/[ID]/spec.md y @CONSTITUTION.md, genera specs/[ID]/plan.md con el diseño técnico:
- Modelos de datos.
- Decisiones justificadas (con la alternativa descartada).
- Archivos exactos a crear/modificar (respetando la estructura de @AGENTS.md).
- Tipos de dominio en TypeScript strict y esquemas Zod (si aplica).
- Contratos de funciones puras / Server Actions / tablas de Supabase afectadas.
- Claves i18n nuevas para es/strings.json.
- Estrategia de tests en Vitest.
- Indica qué requisito funcional cubre cada parte.
*NO implementes el código de producción todavía.*

## Tareas

Convierte specs/[ID]/spec.md y specs/[ID]/plan.md en specs/[ID]/tasks.md: una lista ordenada de tareas pequeñas y atómicas (T-01, T-02…). Cada tarea debe indicar qué RF cubre y cómo se verifica con un comando o test. Empieza siempre por los tests del motor/dominio cuando aplique. Cada tarea debe tener un 'Hecho cuando:' verificable. Con checkboxes.

## Implementación

Implementa las tareas T-01 a T-03 de specs/[ID]/tasks.md siguiendo estrictamente spec.md, plan.md, @CONSTITUTION.md y @AGENTS.md (recuerda cargar la skill mobile-native si tocas UI). No des por terminada la tarea hasta pasar la puerta de calidad (tsc --noEmit, npm run lint, npm test, npm run build) y marca las tareas completadas en tasks.md.

## Validación

Recorre la spec RF (Requisito Funcional) por RF: qué test cubre cada uno y su resultado. Veredicto final: ¿spec cumplida?

## Cambio

Nuevo requisito: NO toques código: actualiza primero la spec y muéstrame el diff.