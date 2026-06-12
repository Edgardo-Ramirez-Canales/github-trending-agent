# GitHub Trending Agent

Agente de exploración que detecta repositorios de GitHub en crecimiento explosivo
de estrellas, los analiza con IA y entrega oportunidades concretas de valor. El
usuario mantiene control total en cada paso: elige qué repos explorar, qué
categorías analizar, con qué proveedor de IA y qué modo de acción ejecutar.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + Tailwind CSS v4 |
| IA | Selector dual configurable: **OpenAI** o **Google Gemini** (elegido en la UI) |
| Base de datos | Supabase (3 tablas + RLS por usuario) |
| Auth | GitHub OAuth (Supabase Auth) |
| Emails | Resend (vía Supabase Edge Function) |
| Datos y acciones en repos | GitHub REST API v3 |

---

## Requisitos previos

- Node.js 18+ y npm
- Proyecto en [Supabase](https://supabase.com)
- (Opcional) Clave de OpenAI y/o Gemini — se ingresan en la UI
- (Opcional) Cuenta en [Resend](https://resend.com) para emails

---

## Puesta en marcha

```bash
npm install
cp .env.example .env   # rellena los valores reales
npm run dev
```

### 1. Variables de entorno (`.env`)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
RESEND_API_KEY=re_...   # solo lo usa la Edge Function, no el frontend
```

> El **GitHub Token** y las **claves de IA** NO van en `.env`: se ingresan en la
> UI y se guardan en `localStorage`. El token de GitHub se obtiene
> automáticamente del login OAuth; el input manual es un override.

### 2. Crear las tablas en Supabase

Dashboard → **SQL Editor** → pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql).
Crea las 3 tablas (`repos_vistos`, `contribuciones`, `notificaciones`) con
columna `user_id` y políticas RLS (cada usuario solo ve y edita lo suyo).

### 3. Configurar GitHub OAuth

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: la que muestra Supabase (paso 2)
2. Supabase → Authentication → Providers → **GitHub** → Enable
   - Copia el Callback URL → pégalo en la OAuth App de GitHub
   - Copia Client ID + Client Secret de GitHub → pégalos en Supabase → Save
3. Supabase → Authentication → URL Configuration → **Site URL** = `http://localhost:5173`

El login pide scope `public_repo` (fork + commit + PR en repos públicos).

### 4. (Opcional) Desplegar la Edge Function de emails

```bash
supabase functions deploy notify-pr-status
supabase secrets set RESEND_API_KEY=re_xxx
```

Sin esto, las notificaciones in-app funcionan igual; solo no se envía el email.

---

## Flujo de uso

1. **Login** con GitHub.
2. Configura tu proveedor de IA (OpenAI y/o Gemini) en el selector.
3. Explora los **15 repos trending** (filtra por lenguaje, estrellas, keyword, orden).
   - Repos ya vistos que ganaron +3000 ★ reaparecen con badge **🔥 en llamas**.
4. Haz clic en un repo → se registra como visto y la **IA lo analiza** (5 categorías).
5. Marca **1 a 4 categorías** de oportunidad.
6. Elige un **modo de acción**:
   - **Modo A** — Solo texto: genera el borrador, copiable. No toca GitHub.
   - **Modo B** — Propuesta: abre un **issue real** en el repo (con tu aprobación).
   - **Modo C** — Agente completo: fork → rama → diff → commit → **PR**, con
     aprobación por categoría, edición inline, "Cancelar todo" y rollback.
7. **Notificaciones**: la app hace polling cada 5 min del estado de tus PRs/issues
   y avisa (badge + panel + email) cuando son aceptados/rechazados.

---

## Modos de acción (detalle)

### Modo C — Agente completo

- **Fase 1**: resumen consolidado (archivo, rama y orden por riesgo) + elección
  entre **PR único** o **PRs separados**. Nada se toca hasta confirmar.
- **Fase 2**: por cada categoría → diff completo con 4 opciones:
  - ✅ Aprobar y continuar
  - ✏️ Aprobar con edición (editas el contenido antes del commit)
  - ⏭️ Saltar esta categoría
  - ❌ Cancelar todo (rojo, siempre visible, doble confirmación)
- **Rollback**: al cancelar con PRs ya abiertos, puedes cerrarlos (todos, ninguno
  o solo algunos).
- **Validación previa**: avisa si el cambio toca imports/exports que podrían
  afectar otros archivos.

---

## Estructura del proyecto

```
src/
├── components/      # UI (RepoCard, RepoDetail, CategorySelector, ModeSelector,
│                    #     AnalysisPanel, DiffViewer, ExecutionQueue, ModeRunner,
│                    #     NotificationBadge/Panel, TokenInput, AIProviderSelector,
│                    #     LoginScreen)
├── services/
│   ├── github.js    # GitHub REST API (lectura + fork/commit/PR/issue)
│   ├── ai/          # index (proveedor activo), openai, gemini, prompts
│   ├── supabase.js  # cliente + queries (repos_vistos, contribuciones, notificaciones)
│   ├── auth.js      # GitHub OAuth + captura de provider_token
│   └── notifications.js  # polling de estados + emails
├── hooks/           # useAuth, useTrendingRepos, useRepoAnalysis, useContributions
├── utils/           # storage (localStorage), diff, categorias
├── App.jsx
└── main.jsx
supabase/
├── schema.sql                        # tablas + RLS
└── functions/notify-pr-status/       # Edge Function (Resend)
```

---

## Notas de seguridad

- Los secretos del usuario (GitHub Token, claves de IA) viven solo en
  `localStorage`, nunca en Supabase ni en el servidor.
- Las tablas usan RLS: cada usuario solo accede a sus propios datos.
- `.env` y `PROMPT_CLAUDE_CODE.md` están en `.gitignore`.
