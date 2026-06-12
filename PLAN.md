# GitHub Trending Agent — Plan completo del proyecto

## Visión general

Agente de exploración que detecta repositorios de GitHub en crecimiento explosivo de estrellas, los analiza con IA y entrega oportunidades concretas de valor. El usuario mantiene control total en cada paso: elige qué repos explorar, qué categorías analizar, con qué proveedor de IA y qué modo de acción ejecutar.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Tailwind CSS |
| IA de análisis | **Selector dual configurable por el usuario**: OpenAI API o Google Gemini API — el usuario elige cuál usar desde la UI y puede cambiar en cualquier momento |
| Base de datos | Supabase (tablas + Edge Functions) |
| Emails | Resend (integrado via Supabase Edge Functions) |
| Datos de repos | GitHub REST API v3 |
| Acciones en repos | GitHub REST API v3 (fork, commit, PR, issue) |
| Autenticación | Token personal de GitHub ingresado por el usuario en la UI |

---

## Arquitectura general

```
Frontend React
    ├── GitHub API → detección de repos trending
    ├── IA (OpenAI o Gemini, elegido por el usuario) → análisis de oportunidades
    ├── Supabase → historial, contribuciones, notificaciones
    └── GitHub API → fork, rama, commit, push, PR, issue
```

---

## Selector de proveedor de IA

El usuario decide, desde la UI, si el análisis lo hace **OpenAI** o **Google Gemini**. Ambos proveedores reciben exactamente el mismo prompt (ver sección "Prompt de análisis") y deben devolver el mismo JSON de 5 categorías — la app no necesita lógica distinta según cuál respondió.

### Componente `AIProviderSelector.jsx`
- Dos campos de texto: clave de OpenAI y clave de Gemini (ambos opcionales, el usuario llena los que tenga).
- Un toggle/selector: **"Usar: OpenAI ↔ Gemini"**.
- Si solo hay una clave configurada, esa queda seleccionada por defecto.
- Todo se guarda en `localStorage` — **mismo patrón que el GitHub Token**, nunca en Supabase ni en `.env`.
- El usuario puede cambiar de proveedor en cualquier momento sin perder ninguna configuración; ambas claves quedan guardadas en paralelo.

### Proveedor: OpenAI
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Auth: header `Authorization: Bearer {clave}`
- Salida JSON: `response_format: { type: "json_object" }`
- Modelo recomendado: el modelo más económico que soporte JSON mode (familia "mini"/"nano" de GPT). **El nombre exacto cambia con frecuencia** — verificar en `openai.com/api/pricing` al momento de implementar. `gpt-4o-mini` es un fallback seguro si el modelo recomendado no está disponible.
- Respuesta a parsear: `data.choices[0].message.content` (string JSON)

### Proveedor: Google Gemini
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={clave}`
- Salida JSON: `generationConfig: { responseMimeType: "application/json" }`
- Modelo recomendado: `gemini-2.5-flash` (nivel gratuito disponible, ventana de contexto de 1M tokens — ideal para README + issues + estructura de archivos completos). Si se necesita aún más margen gratuito, `gemini-2.5-flash-lite`. Verificar disponibilidad actual en `ai.google.dev/pricing`.
- Respuesta a parsear: `data.candidates[0].content.parts[0].text` (string JSON)

### Servicio unificado `src/services/ai/index.js`
```
analizarRepo(repoData)
  → lee proveedor activo + clave correspondiente desde localStorage
  → construye el prompt compartido (prompts.js)
  → llama a openai.js o gemini.js según corresponda
  → parsea la respuesta JSON
  → devuelve el objeto de 5 categorías, sin importar cuál proveedor respondió
```

---

## Base de datos — Supabase

### Tabla: `repos_vistos`
```sql
create table repos_vistos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,           -- ej: "vercel/next.js"
  fecha_vista timestamp default now(),
  estrellas_al_verlo integer not null,
  umbral_reaparicion integer default 3000
);
```

### Tabla: `contribuciones`
```sql
create table contribuciones (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  rama text,
  tipo_cambio text,               -- 'features' | 'docs' | 'mercado' | 'codigo' | 'issue'
  modo text not null,             -- 'A' | 'B' | 'C'
  url_pr text,
  url_issue text,
  estado text default 'abierto',  -- 'abierto' | 'aceptado' | 'rechazado' | 'cancelado'
  categorias jsonb,               -- array de categorías aplicadas
  fecha_creacion timestamp default now(),
  fecha_actualizacion timestamp default now()
);
```

### Tabla: `notificaciones`
```sql
create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,             -- 'pr_aceptado' | 'pr_rechazado' | 'issue_respondido'
  mensaje text not null,
  repo text not null,
  url text,
  leida boolean default false,
  email_enviado boolean default false,
  fecha timestamp default now()
);
```

---

## Flujo completo de uso — 7 pasos

### Paso 1 — Abrir la herramienta
- La app carga desde Supabase el historial de repos ya vistos y las contribuciones activas.
- Si algún PR/issue fue respondido desde la última visita, se muestra badge de notificación con contador.
- El usuario ingresa su GitHub Token personal en un input visible en la UI (se guarda en localStorage, no en Supabase).
- El usuario configura su proveedor de IA preferido (OpenAI y/o Gemini) y la clave correspondiente, guardada con el mismo patrón de localStorage.

### Paso 2 — Ver 15 repos trending
**Lógica de selección:**
1. GitHub API devuelve 50–60 repos ordenados por estrellas recientes.
2. Se consultan en Supabase los repos ya vistos en los últimos 7 días.
3. Se filtran los repos ya vistos — **excepción**: si un repo ya visto ganó más de **3000 estrellas** desde la fecha en que se vio, vuelve a aparecer con badge de alerta "🔥 en llamas".
4. Se muestran los 15 mejores del lote restante, ordenados por velocidad de crecimiento.

**Cómo calcular trending sin endpoint oficial:**
```
GET https://api.github.com/search/repositories
  ?q=created:>{fecha_hace_30_dias}+stars:>100
  &sort=stars
  &order=desc
  &per_page=60
```
Se compara `stargazers_count` actual vs `estrellas_al_verlo` en Supabase para detectar repos con crecimiento mayor a 3000 estrellas.

### Paso 3 — Filtrar y ordenar
Controles disponibles en la UI:
- Filtro por lenguaje (selector múltiple)
- Filtro por estrellas mínimas ganadas (slider, default: 100)
- Filtro por keyword o tópico (input de texto)
- Orden: por velocidad de crecimiento (default) / total de estrellas / fecha de creación

### Paso 4 — Elegir un repo
- El usuario hace clic en una tarjeta de repo.
- En este momento el repo se registra en Supabase tabla `repos_vistos` con las estrellas actuales.
- Se abre el panel de detalle del repo.

### Paso 5 — La IA analiza
La IA (OpenAI o Gemini, según lo que el usuario haya configurado) recibe como contexto:
- Nombre y descripción del repo
- Contenido del README (via GitHub API)
- Lista de issues abiertos (primeros 20)
- Lenguaje principal
- Topics/tags del repo
- Estructura de archivos del nivel raíz
- Número de estrellas actuales y velocidad de crecimiento

La IA genera un análisis estructurado para las 5 categorías simultáneamente. El formato de salida es idéntico sin importar qué proveedor esté activo.

### Paso 6 — Ver y seleccionar categorías de oportunidad

Las 5 categorías aparecen como **checkboxes** (selección múltiple). El usuario puede marcar de 1 a 4 categorías para actuar sobre ellas.

#### Categoría 1: Features faltantes
- La IA identifica qué features piden los usuarios en los issues abiertos.
- Detecta patrones de solicitudes repetidas.
- Propone la feature más solicitada y viable.
- En Modo C: genera el código de la feature en el archivo correspondiente.

#### Categoría 2: Docs / README
- La IA evalúa si el README explica bien el valor del proyecto.
- Detecta secciones faltantes: instalación, ejemplos, badges, contribución, licencia, FAQ.
- Puede también proponer crear `CONTRIBUTING.md` o `CODE_OF_CONDUCT.md` si no existen.
- En Modo C: reescribe o complementa los archivos de documentación.

#### Categoría 3: Gap de mercado
- La IA analiza qué competidores existen para ese tipo de herramienta.
- Detecta el ángulo único del repo que no está siendo explotado.
- Propone la oportunidad de negocio, modelo de monetización o expansión.
- En Modo C: crea `ROADMAP.md` con la propuesta estructurada.

#### Categoría 4: Código / SOLID
- La IA identifica violaciones de principios SOLID o patrones de diseño aplicables.
- Señala el archivo específico con deuda técnica.
- Propone el refactor aplicando el principio correcto (SRP, OCP, LSP, ISP, DIP).
- En Modo C: refactoriza ese archivo con comentarios explicando el cambio.

#### Categoría 5: Score de oportunidad (solo lectura — no genera acción propia)
- Siempre se calcula automáticamente.
- Muestra un puntaje 1–10 por categoría basado en: impacto estimado vs esfuerzo requerido.
- Recomienda el orden de ataque sugerido.
- Al hacer clic en "Atacar esta oportunidad" desde el score, redirige a la categoría recomendada con el modo elegido.

### Paso 7 — Elegir modo de acción y ejecutar

Después de seleccionar las categorías, el usuario elige **un modo global** que aplica a todas las categorías seleccionadas.

---

## Modos de acción

### Modo A — Solo texto (sin tocar GitHub)
- La IA genera el borrador completo para cada categoría seleccionada: texto del cambio, descripción detallada, qué mejoraría y por qué.
- El usuario lee el borrador y decide si actúa manualmente.
- La app no realiza ninguna acción en GitHub.
- Resultado: texto copiable en la UI.

### Modo B — Propuesta al dueño (issue en GitHub)
- La IA redacta el análisis de la oportunidad detectada.
- La app abre un **issue real** en el repo original con el análisis estructurado.
- El dueño del repo decide si implementa la mejora sugerida.
- Requiere aprobación explícita del usuario antes de publicar el issue.
- Supabase registra el issue en tabla `contribuciones`.
- Cuando el dueño responde o cierra el issue → notificación en app + email.

### Modo C — Agente completo (fork + rama + commit + PR)

#### Flujo de ejecución con múltiples categorías:

**Fase 1 — Resumen consolidado (antes de actuar)**
- La IA genera un resumen de todo lo que va a hacer:
  - Qué archivo va a modificar en cada categoría
  - Qué tipo de cambio aplicará
  - Orden sugerido de ejecución (de menor a mayor riesgo: Docs → Features → Código)
- El usuario elige:
  - **PR único**: todos los cambios en una sola rama
  - **PRs separados**: una rama por cada categoría
- El usuario puede **cancelar todo** en este punto sin que se haya tocado nada.

**Fase 2 — Ejecución categoría por categoría**

Para cada categoría seleccionada, en el orden acordado:

1. **Fork** del repo en la cuenta del usuario (`POST /repos/{owner}/{repo}/forks`)
2. **Crear rama** con nombre descriptivo:
   - Docs: `docs/mejora-readme`
   - Features: `feat/nombre-feature`
   - Mercado: `docs/roadmap-propuesta`
   - Código: `refactor/nombre-principio-solid`
3. **La IA genera el contenido** del archivo modificado
4. **Mostrar diff completo** al usuario — pausa obligatoria

**Opciones disponibles en cada aprobación:**

| Opción | Acción |
|--------|--------|
| ✅ Aprobar y continuar | Hace el commit, pasa a la siguiente categoría |
| ✏️ Aprobar con edición | El usuario edita el diff, aplica su versión y continúa |
| ⏭️ Saltar esta categoría | Omite esta categoría, pasa a la siguiente sin hacer nada |
| ❌ Cancelar todo | Detiene toda la ejecución — pregunta si hacer rollback de lo ya ejecutado |

> **El botón "Cancelar todo" está visible en todo momento durante la ejecución.**

5. **Commit** del archivo (`PUT /repos/{owner}/{repo}/contents/{path}`)
6. **Validación previa al push**: si el cambio modifica imports que afectan otros archivos, el agente lo detecta y avisa antes de continuar.
7. **Push + apertura del PR** en el repo original con título y descripción generados por la IA.
8. **Supabase** registra la contribución en tabla `contribuciones`.

**Fase 3 — Monitoreo y notificación**
- La app hace polling del estado del PR al abrirse cada vez que el usuario abre la app.
- Cuando el dueño acepta o rechaza → Supabase actualiza el estado + dispara Edge Function.
- Edge Function envía email via Resend: "Tu PR en {repo} fue aceptado/rechazado".
- Badge de notificación en la app con el detalle.

#### Restricciones del Modo C:
- **Un archivo por categoría**. Si el cambio requiere tocar más de 3 archivos, el agente avisa y sugiere cambiar a Modo A.
- Funciona bien para: README, docs, un archivo de utilidades, una función nueva, un refactor aislado.
- Limitado para: refactors grandes, features que requieren instalar dependencias nuevas, cambios que necesitan tests para validar.

---

## Lógica de notificaciones

### En la app
- Badge con contador en el ícono de notificaciones (visible desde cualquier vista)
- Panel de notificaciones con lista de: repo, tipo de evento, fecha, enlace al PR/issue
- Marcar como leída individual o todas

### Por email (Supabase Edge Function + Resend)
- Trigger: cuando cambia `estado` en tabla `contribuciones` a `aceptado` o `rechazado`
- Trigger: cuando se detecta respuesta en un issue (Modo B)
- Email contiene: nombre del repo, tipo de cambio, estado, enlace directo al PR/issue

---

## Estructura de archivos del proyecto

```
github-trending-agent/
├── src/
│   ├── components/
│   │   ├── RepoCard.jsx              # Tarjeta de repo en la lista
│   │   ├── RepoDetail.jsx            # Panel de detalle del repo
│   │   ├── CategorySelector.jsx      # Checkboxes de las 5 categorías
│   │   ├── ModeSelector.jsx          # Selector de Modo A / B / C
│   │   ├── AnalysisPanel.jsx         # Resultado del análisis de la IA
│   │   ├── DiffViewer.jsx            # Visualizador de diff antes del commit
│   │   ├── ExecutionQueue.jsx        # Cola de ejecución multi-categoría
│   │   ├── NotificationBadge.jsx     # Badge con contador
│   │   ├── NotificationPanel.jsx     # Panel de notificaciones
│   │   ├── TokenInput.jsx            # Input para el GitHub Token
│   │   └── AIProviderSelector.jsx    # Selector OpenAI/Gemini + claves
│   ├── services/
│   │   ├── github.js                 # Todas las llamadas a GitHub API
│   │   ├── ai/
│   │   │   ├── index.js              # Servicio unificado: elige proveedor activo
│   │   │   ├── openai.js             # Llamada a OpenAI API
│   │   │   ├── gemini.js             # Llamada a Gemini API
│   │   │   └── prompts.js            # Prompt compartido de análisis (5 categorías)
│   │   ├── supabase.js               # Cliente y queries de Supabase
│   │   └── notifications.js          # Lógica de polling y notificaciones
│   ├── hooks/
│   │   ├── useTrendingRepos.js       # Hook para cargar repos trending
│   │   ├── useRepoAnalysis.js        # Hook para análisis con la IA configurada
│   │   └── useContributions.js       # Hook para gestionar contribuciones
│   ├── utils/
│   │   ├── diff.js                   # Utilidades para generar y mostrar diffs
│   │   └── storage.js                # Manejo de localStorage (tokens, claves IA, preferencias)
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── functions/
│       └── notify-pr-status/         # Edge Function para emails con Resend
│           └── index.ts
├── .env.example
├── PLAN.md                           # Este archivo
└── README.md
```

---

## Variables de entorno necesarias

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
RESEND_API_KEY=re_...               # Solo en Supabase Edge Functions
```

El GitHub Token **no va en .env** — el usuario lo ingresa en la UI y se guarda en `localStorage`.

Las claves de **OpenAI** y/o **Gemini** tampoco van en `.env` — siguen el mismo patrón: el usuario las ingresa en `AIProviderSelector` y quedan en `localStorage`. Esto permite cambiar de proveedor sin reconstruir la app.

---

## Consideraciones de UX importantes

1. **El token de GitHub siempre visible** en la UI con opción de ocultarlo/mostrarlo. Sin token la app funciona en modo limitado (60 req/h).

2. **El selector de proveedor de IA** vive junto al `TokenInput`, en la misma zona de configuración inicial. Muestra claramente cuál proveedor está activo (ej: badge "Usando: Gemini").

3. **Estados de carga claros** en cada paso: "Buscando repos...", "Analizando con [proveedor]...", "Creando fork...", "Abriendo PR...".

4. **El botón Cancelar todo** debe ser rojo, siempre visible y con confirmación de doble clic durante la ejecución del Modo C.

5. **Rollback**: al cancelar en Modo C con commits ya hechos, preguntar: "¿Deseas cerrar los PRs ya abiertos?" con botones Sí / No / Solo algunos.

6. **Repos "en llamas"** (reaparecen por crecimiento +3000): mostrar con badge especial y la diferencia de estrellas desde la última vez ("↑ +4,521 desde que lo viste").

7. **Score visual**: mostrar como barras de progreso por categoría, no como número solo.

8. **Diff viewer**: usar colores verde/rojo para líneas añadidas/eliminadas, con opción de edición inline antes de aprobar.

---

## Orden de implementación sugerido

1. Setup del proyecto (Vite + React + Tailwind + Supabase client)
2. Crear las 3 tablas en Supabase con el SQL de este plan
3. Componentes `TokenInput` y `AIProviderSelector`, persistencia conjunta en localStorage
4. Servicio `github.js` con la lógica de búsqueda de repos trending
5. Componente `RepoCard` y lista de 15 repos con filtros
6. Servicios `services/ai/` (index, openai, gemini, prompts) con el análisis de las 5 categorías
7. Componente `AnalysisPanel` con checkboxes de categorías (Paso 6)
8. Modo A: generación de borrador en texto
9. Modo B: apertura de issue via GitHub API
10. Modo C: flujo completo fork → rama → diff → aprobación → commit → PR
11. Sistema de notificaciones: polling + badge + panel
12. Supabase Edge Function para emails con Resend
13. Polish de UI: estados de carga, errores, confirmaciones

---

## Prompt de análisis (usar en `src/services/ai/prompts.js`)

Este prompt es **compartido entre ambos proveedores**. `openai.js` lo envía dentro de `messages` con `response_format: json_object`; `gemini.js` lo envía dentro de `contents` con `responseMimeType: application/json`. El texto del prompt es idéntico en ambos casos.

```
Eres un experto en desarrollo de software, arquitectura de sistemas y estrategia de producto open source.

Analiza el siguiente repositorio de GitHub y genera un análisis estructurado en JSON con exactamente estas 5 categorías:

REPOSITORIO:
- Nombre: {nombre}
- Descripción: {descripcion}
- Lenguaje principal: {lenguaje}
- Estrellas totales: {estrellas}
- Topics: {topics}
- README: {readme}
- Issues abiertos (primeros 20): {issues}
- Estructura de archivos: {archivos}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:

{
  "features_faltantes": {
    "resumen": "2-3 líneas explicando qué features piden los usuarios",
    "feature_principal": "nombre de la feature más solicitada",
    "archivo_sugerido": "ruta del archivo donde implementarla",
    "codigo_propuesto": "código completo de la implementación",
    "score": 0-10
  },
  "docs_readme": {
    "resumen": "2-3 líneas sobre qué le falta a la documentación",
    "secciones_faltantes": ["lista", "de", "secciones"],
    "archivo_sugerido": "README.md o CONTRIBUTING.md",
    "contenido_propuesto": "contenido completo del archivo mejorado",
    "score": 0-10
  },
  "gap_mercado": {
    "resumen": "2-3 líneas sobre la oportunidad de mercado detectada",
    "competidores": ["lista de competidores"],
    "angulo_unico": "qué tiene este repo que no explotan",
    "propuesta": "contenido completo del ROADMAP.md propuesto",
    "score": 0-10
  },
  "codigo_solid": {
    "resumen": "2-3 líneas sobre la deuda técnica detectada",
    "principio_violado": "SRP | OCP | LSP | ISP | DIP",
    "archivo_afectado": "ruta del archivo con el problema",
    "codigo_refactorizado": "código completo del archivo refactorizado",
    "explicacion_cambios": "explicación de qué se cambió y por qué",
    "score": 0-10
  },
  "score_oportunidad": {
    "puntaje_global": 0-10,
    "categoria_recomendada": "features_faltantes | docs_readme | gap_mercado | codigo_solid",
    "justificacion": "por qué esta categoría primero",
    "orden_sugerido": ["cat1", "cat2", "cat3", "cat4"]
  }
}
```

---

## Notas finales para Claude Code

- Implementar en el orden listado en "Orden de implementación sugerido"
- No omitir ningún componente de la lista de estructura de archivos
- **Dual-provider de IA**: `openai.js` y `gemini.js` deben exponer la misma firma de función (recibir el prompt armado, devolver el JSON parseado) para que `ai/index.js` pueda intercambiarlos sin lógica condicional adicional en el resto de la app
- Si el usuario solo configuró una de las dos claves de IA, la app debe funcionar normalmente con esa única opción — no asumir que ambas existen
- Validar el JSON devuelto por la IA antes de usarlo (ambos proveedores pueden fallar el formato ocasionalmente) — si falla el parseo, reintentar una vez antes de mostrar error
- El Modo C requiere manejo de errores robusto en cada paso del flujo (fork, rama, commit, PR)
- Supabase debe inicializarse antes que cualquier componente que lo use
- El polling de PRs debe usar un intervalo de 5 minutos para no abusar de la API de GitHub
- Todos los textos de la UI en español
- Usar Tailwind para todos los estilos, sin CSS custom salvo excepciones necesarias