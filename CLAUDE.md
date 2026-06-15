# GitHub Trending Agent

## Stack
- **Frontend**: React 18 + Vite 5 + Tailwind CSS v4
- **IA**: Multi-proveedor configurable vía registry — OpenAI, Gemini, Claude (Anthropic), DeepSeek, MiniMax (elige usuario en UI). Ollama pendiente (fase 2)
- **DB**: Supabase (3 tablas + RLS por usuario)
- **Auth**: GitHub OAuth (Supabase Auth)
- **Email**: Resend via Supabase Edge Function
- **API externa**: GitHub REST API v3

## Comandos
```bash
npm run dev      # Desarrollo en localhost:5173
npm run build    # Build producción
npm run preview  # Preview del build
```

## Rama activa
`desarrollo` — integrar cambios aquí. Mergear a `qa` para pruebas, luego a `preproduccion`, luego a `main`.

## Arquitectura clave
```
src/
├── components/       # 13 componentes UI (RepoCard, RepoDetail, AnalysisPanel,
│                     # DiffViewer, ExecutionQueue, ModeRunner, etc.)
│   services/
│   ├── github.js     # GitHub REST API (lectura + fork/commit/PR/issue)
│   ├── ai/           # registry (fuente de verdad), index (despacho), prompts.js,
│   │                 # openai.js, gemini.js, claude.js, deepseek.js, minimax.js, _json.js
│   ├── supabase.js   # Cliente + queries (repos_vistos, contribuciones, notificaciones)
│   ├── auth.js       # GitHub OAuth + captura de provider_token
│   └── notifications.js  # Polling de PR/issue + Edge Function email
├── hooks/            # useAuth, useTrendingRepos, useRepoAnalysis, useContributions
├── utils/            # storage.js (localStorage), diff.js, categorias.js
├── App.jsx → AppAutenticado → TrendingSection
└── main.jsx
supabase/
├── schema.sql        # DDL + RLS de las 3 tablas
└── functions/notify-pr-status/  # Edge Function (Resend)
```

## Convenios importantes
1. **Secretos del usuario**: GitHub Token y claves de IA (una por proveedor: `gta_aikey_<id>`) viven SOLO en localStorage (utils/storage.js), nunca en .env ni Supabase
2. **Multi-proveedor de IA vía registry**: `services/ai/registry.js` es la ÚNICA fuente de verdad (id, nombre, placeholder, modelos, fn `analizar`). Todos los servicios exponen la misma firma `(prompt, apiKey, modelo) => JSON`. El switch lo hace `services/ai/index.js` derivándolo del registry — agregar un proveedor = 1 entrada en el registry + 1 archivo de servicio, sin tocar UI, storage ni index
3. **Prompt compartido** (prompts.js): idéntico para todos los proveedores, devuelve JSON con 5 categorías. Proveedores sin JSON-mode (Claude, MiniMax) pasan por `_json.js` (extractor tolerante)
4. **Tailwind v4**: sin CSS custom, usar clases utilitarias. Vite plugin `@tailwindcss/vite`
5. **UI en español**: todos los textos, botones, labels y mensajes
6. **ES Modules**: `type: "module"` en package.json, imports con extensión `.js`
7. **Estados de carga**: cada paso muestra su estado ("Buscando repos…", "Analizando con OpenAI…", "Creando fork…")
8. **Error handling**: retry 1 vez si IA devuelve JSON inválido, manejo de 404s en GitHub API, límite de rate (60 req/h sin token, 5000 con token)

## Modos de acción (del PLAN.md)
- **Modo A**: solo texto, no toca GitHub
- **Modo B**: abre issue en el repo original (requiere aprobación)
- **Modo C**: fork → rama → diff → commit → PR, con aprobación por categoría, edición inline, Cancelar todo (rojo, doble confirmación) y rollback

## Orden de implementación pendiente
El proyecto está implementado al ~90%. Lo que falta según PLAN.md:
1. Polish UI: estados de carga, errores, confirmaciones
2. Edge Function desplegada en Supabase
3. Tests (no definidos en PLAN.md aún)

## Variables de entorno
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
RESEND_API_KEY=       # solo en Edge Function
```
