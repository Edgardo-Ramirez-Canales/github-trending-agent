# SPEC 01 — Rediseño del análisis IA de repositorios

> **Estado:** Aprovado · **Depende de:** — · **Fecha:** 2026-06-18
> **Objetivo:** Reemplazar el análisis IA de 5 categorías por un set de 11 categorías ancladas en código real, con dos modos de contexto (A selectivo / B profundo), destino flexible por categoría (PR, artefacto local o diagnóstico) y salida en el idioma del repo.

---

## Sección 1 — Por qué existe este spec

El análisis actual le da a la IA solo metadata, README y **nombres** de archivos raíz. No ve código. Por eso las categorías `gap_mercado` y `codigo_solid` **alucinan**: proponen refactors y competidores sin base real, y son justo el tipo de PR que un repo grande nunca acepta.

Este spec cambia el enfoque: la IA lee **código real** del default branch (selectivo), y las categorías se reorientan a **aportes de alta probabilidad de merge** (docs, tests, good-first-issues) más **artefactos locales** para entender el repo. El objetivo del usuario es darle a cada repo "pequeñas ayudas que lo conviertan en uno mejor" y que generen PRs aceptables.

---

## Sección 2 — Alcance

**Dentro:**

- **Set completo de 11 categorías:**

  *Diagnóstico (solo lectura, reemplaza `score_oportunidad`):*
  - `salud_repo` — score de madurez + descripción funcional del repo.

  *PR-able (fork→PR), `destino: pr`:*
  - `mejora_docs` — typos, links rotos, secciones faltantes.
  - `test_faltante` — test para función pública sin cobertura.
  - `good_first_issue` — resuelve issue con label `good-first-issue`/`help-wanted`/`up-for-grabs`.
  - `features_faltantes` — feature con implementación anclada en código real.
  - `fix_pequeno` — edge case / deprecación / mensaje de error, con repro.
  - `a11y` — accesibilidad (alt, aria-label, contraste); aplica solo a repos con UI.
  - `dependencia_obsoleta` — bump de deps viejas/deprecadas.

  *Artefacto local (`destino: artefacto`, solo descarga):*
  - `diagrama_arquitectura` — `.html` autónomo con grafo de módulos + resumen funcional.
  - `skill_plantilla` — `SKILL.md`/scaffold que captura los patrones del repo.
  - `onboarding` — markdown "por dónde empezar": arquitectura, módulos clave, flujo principal.

- **Dos modos de contexto:**
  - **Modo A (default):** una pasada. Heurística baja 5-15 archivos (entrypoints + config + mencionados; topes 30 KB/archivo, 150 KB total).
  - **Modo B (botón "Análisis profundo", manual):** dos pasadas. Reejecuta **todas** las categorías; la IA elige primero qué archivos leer, luego analiza.
- **Destino flexible por categoría:** campo `destino` con valores `pr` | `artefacto` | `lectura`.
- **Regla de idioma:** output a GitHub en el idioma del repo (detectado del README) con toggle manual EN↔ES; explicación en la app siempre en español.
- **Diagrama HTML:** estilo de la imagen de referencia (nodos con glow, aristas con peso = nº de imports entre módulos), solo descarga al disco.
- **Cambio de convención** en `contribuciones.tipo_cambio` (texto libre, sin DDL): claves nuevas.
- **UI:** categorías que no aplican se muestran **atenuadas con motivo** (no se ocultan).
- **Eliminación** de las categorías `gap_mercado` y `codigo_solid`.

**Fuera de alcance (para specs futuros):**

- Modo C real (RAG / embeddings con pgvector) y "repo entero a Gemini 1M".
- Persistencia de artefactos en Supabase — en v1 solo se descargan.
- Migración de análisis viejos al nuevo formato (no existen: nunca se persistieron).
- Despliegue de la Edge Function de email.

---

## Sección 3 — Modelo de datos

### 3.1 — Salida JSON de la IA (idiomas marcados)

Campos comunes a toda categoría accionable. `resumen` y demás textos explicativos van en **español** (UI); el contenido que aterriza en GitHub va en el **idioma del repo**.

```js
// Campos comunes
{
  aplica: true,                 // false → card atenuada
  motivo_no_aplica: '',         // ES, ej: "sin issues good-first"
  resumen: '',                  // ES (UI)
  score: 0,                     // 0-10
}
```

Por categoría (solo campos propios además de los comunes):

```js
salud_repo: {                   // diagnóstico, no usa 'aplica'
  descripcion_funcional: '',    // ES — para qué sirve el repo
  puntaje_global: 0,            // 0-10
  factores: {                   // booleanos + ratio
    tiene_tests, tiene_ci, tiene_licencia, readme_completo,
    actividad_reciente, tiene_contributing, ratio_issues,
  },
  justificacion: '',            // ES
}

mejora_docs:         { secciones_faltantes: [], archivo_sugerido, contenido_propuesto }
test_faltante:       { funcion_objetivo, archivo_afectado, archivo_sugerido, codigo_propuesto }
good_first_issue:    { issue_numero, issue_titulo, archivo_afectado, archivo_sugerido, codigo_propuesto }
features_faltantes:  { feature_principal, archivo_sugerido, codigo_propuesto }
fix_pequeno:         { tipo, repro /*ES*/, archivo_afectado, codigo_refactorizado, explicacion_cambios /*ES*/ }
a11y:                { problema, archivo_afectado, codigo_propuesto }
dependencia_obsoleta:{ dependencias:[{nombre,version_actual,version_sugerida}], archivo_sugerido, contenido_propuesto }

// Artefactos (la IA devuelve datos; el cliente arma el archivo)
diagrama_arquitectura: { resumen_funcional /*ES*/, nodos:[{id,label,grupo}], aristas:[{origen,destino,peso}] }
skill_plantilla:       { nombre_skill, contenido_skill /*idioma repo*/ }
onboarding:            { contenido /*idioma repo*/ }
```

> `codigo_propuesto`/`contenido_*`/`codigo_refactorizado` → idioma del repo (comentarios incluidos). `resumen`/`repro`/`explicacion_cambios`/`descripcion_funcional`/`resumen_funcional`/`justificacion`/`motivo_no_aplica` → español.

### 3.2 — Metadata de categoría (`categorias.js`)

```js
// CATEGORIAS = fuente de verdad; cada entrada:
{
  clave: 'mejora_docs',
  label: 'Docs',
  grupo: 'pr',              // 'diagnostico' | 'pr' | 'artefacto'
  destino: 'pr',            // 'lectura' | 'pr' | 'artefacto'
  requiereModoB: false,     // true en good_first_issue y features_faltantes
  soloFrontend: false,      // true en a11y → atenuar si repo no tiene UI
  tipoCambio: 'docs',       // valor que va a contribuciones.tipo_cambio
  artefacto: null,          // null | { extension:'html', mime:'text/html' }
  chip, barra, anillo,      // clases Tailwind
}
```

### 3.3 — Contexto que se baja del repo (entrada al prompt)

```js
// Modo A (1 pasada)
{
  meta: { nombre, descripcion, lenguaje, estrellas, velocidad, topics },
  readme,                        // recortado
  idiomaRepo: 'en' | 'es',       // detectado del README, override manual
  issues: [{ numero, titulo, cuerpo, etiquetas, reacciones }],
  arbol: [/* paths del default branch, recursivo */],
  archivos: [{ path, contenido, recortado: bool }],  // 5-15 elegidos por heurística
}
// Modo B (2 pasadas): pasada 1 devuelve { archivos_solicitados: [paths] };
// el cliente baja esos y arma el mismo objeto para la pasada 2.
```

### 3.4 — Cambio en `contribuciones` (sin DDL)

`tipo_cambio` deja de aceptar `'mercado'|'codigo'` y pasa a las claves nuevas (`docs`, `test`, `good_first_issue`, `features`, `fix`, `a11y`, `deps`, `diagrama`, `skill`, `onboarding`). Es texto libre → solo se actualiza la convención en código y el comentario del `schema.sql`. **`repos_vistos` no cambia** (nunca almacenó el análisis).

---

## Sección 4 — Plan de implementación

Cada paso deja la app ejecutable. Orden: datos → lógica IA → metadata → UI → artefactos → limpieza.

1. **`github.js` — nuevas lecturas.** Agregar `getArbolRecursivo(owner, repo)` (`git/trees/{sha}?recursive=1` sobre el default branch), `getContenidoArchivos(owner, repo, paths[])` (baja N archivos en paralelo, respeta topes 30 KB) y `getIssuesPorLabel(owner, repo, labels[])`. Prueba manual: llamar desde consola, ver árbol y contenidos.
2. **`utils/idiomaRepo.js` — detección de idioma.** Función `detectarIdioma(readme)` → `'en' | 'es'` por heurística simple (stopwords). Prueba: pasar dos README, verificar salida.
3. **`utils/selectorArchivos.js` — heurística de selección.** Función pura `elegirArchivos(arbol, readme, issues)` → 5-15 paths priorizando entrypoints + config + mencionados. Prueba: árbol de ejemplo → lista esperada.
4. **`services/ai/prompts.js` — reescritura.** Tres constructores: `promptModoA(contexto)`, `promptModoB_pasada1(contexto)` (devuelve `archivos_solicitados`), `promptModoB_pasada2(contexto)`. Incluyen instrucción de idioma (output en `idiomaRepo`, explicaciones en español) y el JSON de las 11 categorías. Actualizar `CATEGORIAS_REQUERIDAS`. Prueba: imprimir prompt, validar estructura.
5. **`utils/categorias.js` — nueva fuente de verdad.** Reemplazar `CATEGORIAS_ACCION` por `CATEGORIAS` con los campos de 3.2. Actualizar `getArchivoSugerido`, `getContenidoGenerado`, `getNombreRama` para las claves nuevas. Prueba: import, verificar 11 entradas.
6. **`services/ai/index.js` — despacho con modos.** `analizarRepo(contexto, { modo })`: modo A = una llamada; modo B = pasada 1 (pide archivos) → baja con `getContenidoArchivos` → pasada 2. Mantiene retry de JSON inválido. Prueba: análisis A y B sobre un repo real.
7. **`hooks/useRepoAnalysis.js` — orquestación.** Reúne contexto (árbol recursivo + archivos elegidos + idioma), expone `idiomaRepo`, `setIdiomaRepo` (toggle manual) y `analizar(repo, { modo })`. Botón "Análisis profundo" llama con `modo: 'B'`. Prueba: clic en tarjeta corre A; botón corre B.
8. **`components/SaludRepo.jsx` — bloque diagnóstico.** Reemplaza el bloque `score_oportunidad` en `AnalysisPanel`. Muestra `descripcion_funcional`, `puntaje_global` y los `factores` (chips ✓/✗). Prueba: render con datos mock.
9. **`components/CategorySelector.jsx` — render por grupos + estados.** Itera `CATEGORIAS` agrupadas (pr / artefacto). Card atenuada si `aplica === false` (muestra `motivo_no_aplica`). Toggle de idioma EN↔ES y botón "Análisis profundo" en la cabecera del panel. Prueba: categorías sin datos salen en gris.
10. **`components/CategorySelector.jsx` — bloques `Detalle` nuevos.** Un bloque por categoría con sus campos propios (3.1). Prueba: expandir cada card, ver campos correctos.
11. **`utils/artefactos.js` — generadores de descarga.** `generarDiagramaHTML(nodos, aristas, resumen)` → string HTML autónomo (canvas/SVG con estilo glow de la imagen, aristas con peso). `generarSkillMD(datos)` y `generarOnboardingMD(datos)`. Función `descargar(nombre, contenido, mime)`. Prueba: descargar el `.html`, abrir en navegador, ver el grafo.
12. **Enrutado por `destino` en la acción.** En `AnalysisPanel`/ModeRunner: `destino: 'pr'` → flujo fork→PR existente; `'artefacto'` → genera y descarga; `'lectura'` → no acciona. Prueba: cada categoría dispara el destino correcto.
13. **Limpieza y convención.** Eliminar referencias a `gap_mercado` y `codigo_solid` (prompts, categorias, UI). Actualizar comentario de `tipo_cambio` en `schema.sql` con las claves nuevas. Prueba: `npm run build` sin errores, grep sin restos de claves viejas.

---

## Sección 5 — Criterios de aceptación

**Contexto y datos**
- [ ] Al hacer clic en una tarjeta, la IA recibe el árbol recursivo del default branch y el contenido de 5-15 archivos reales (verificable en el payload del prompt).
- [ ] Ningún archivo enviado supera 30 KB y la suma no supera 150 KB.
- [ ] `detectarIdioma` devuelve `'en'` para un README en inglés y `'es'` para uno en español.

**Categorías y salida**
- [ ] El análisis devuelve las 11 categorías con la estructura JSON de la Sección 3.1.
- [ ] `gap_mercado` y `codigo_solid` no aparecen en ningún prompt, render ni archivo (grep sin coincidencias).
- [ ] Los textos `resumen`, `justificacion`, `explicacion_cambios`, `descripcion_funcional` y `motivo_no_aplica` salen en español.
- [ ] El contenido que aterriza en GitHub (`codigo_propuesto`, `contenido_propuesto`, `codigo_refactorizado`) sale en el idioma detectado del repo.

**Modos A / B**
- [ ] El clic en la tarjeta ejecuta el modo A (una sola llamada a la IA).
- [ ] El botón "Análisis profundo" ejecuta el modo B con exactamente dos pasadas (la primera devuelve `archivos_solicitados`).
- [ ] El modo B nunca se dispara automáticamente; solo por clic del usuario.

**Idioma manual**
- [ ] Existe un toggle EN↔ES que, al cambiarlo, regenera el output en el idioma elegido sin recargar la página.

**UI**
- [ ] El bloque `salud_repo` reemplaza al de score y muestra descripción funcional, puntaje y los factores como ✓/✗.
- [ ] Una categoría con `aplica: false` se muestra atenuada y exhibe su `motivo_no_aplica`.
- [ ] `a11y` aparece atenuada en un repo sin UI; `good_first_issue` aparece atenuada en un repo sin issues con esos labels.
- [ ] Cada categoría expandida muestra solo sus campos propios.

**Destinos**
- [ ] Una categoría `destino: 'pr'` dispara el flujo fork→PR existente.
- [ ] `diagrama_arquitectura` descarga un `.html` autónomo que, abierto en el navegador, muestra el grafo con estilo glow y aristas con peso numérico.
- [ ] `skill_plantilla` descarga un `SKILL.md` y `onboarding` descarga un `.md`.
- [ ] `salud_repo` (destino `lectura`) no ofrece ninguna acción de PR ni descarga.

**Persistencia y build**
- [ ] El comentario de `tipo_cambio` en `schema.sql` lista las claves nuevas; `repos_vistos` no cambia.
- [ ] `npm run build` termina sin errores.

---

## Sección 6 — Decisiones tomadas y descartadas

**Contexto de código**
- **Sí:** modo A selectivo (heurística baja 5-15 archivos reales). Da la "esencia" del repo a la IA sin reventar tokens, funciona con todos los proveedores y con la clave del usuario.
- **Sí:** modo B de dos pasadas como botón manual "Análisis profundo", que reejecuta **todas** las categorías. La IA elige qué leer → análisis más fiel cuando el usuario lo pide.
- **No:** volcar el repo entero a Gemini 1M. Rompe el diseño multi-proveedor, caro y lento.
- **No:** RAG / embeddings con pgvector. Potente pero es semanas de infra; va a otro spec.

**Set de categorías**
- **Sí:** 11 categorías (set completo) en v1. El usuario las quiere todas disponibles desde el inicio.
- **Sí:** orientar las PR-ables a aportes de alta probabilidad de merge (docs, tests, good-first-issues).
- **Sí:** `good_first_issue` como categoría estrella — el mantenedor ya invitó PRs ahí, máxima tasa de aceptación.
- **No:** `gap_mercado` y `codigo_solid`. Alucinan y son justo el tipo de PR que los repos grandes rechazan.
- **No:** categorías "CI/GitHub Actions" y "performance". No solicitadas → bajo merge.

**Destino flexible**
- **Sí:** campo `destino` por categoría (`pr` | `artefacto` | `lectura`).
- **Sí:** artefactos (diagrama, skill, onboarding) solo se descargan al disco en v1. Persistirlos en Supabase va a otro spec.

**Idioma**
- **Sí:** output a GitHub en el idioma del repo, detectado del README, con toggle manual EN↔ES.
- **Sí:** explicaciones de la app siempre en español (es para el usuario).

**Datos / persistencia**
- **Sí:** descubrimiento de que el análisis nunca se persistía → no hay migración. Se regenera en cada clic como ya ocurría.
- **Sí:** `tipo_cambio` en `contribuciones` adopta claves nuevas. Al ser texto libre no requiere DDL, solo convención en código.
- **No:** cambiar `repos_vistos`. No almacena análisis, no se toca.

**Diagrama**
- **Sí:** la IA devuelve nodos/aristas/resumen y el **cliente** arma el HTML. Mantiene la salida de la IA pequeña y el template versionado en código.
- **Sí:** peso de arista = nº de imports entre módulos. Encaja con el estilo visual de la imagen y aporta información de acoplamiento real.
- **No:** formato `.excalidraw` vía MCP. Más pesado y con dependencia externa; HTML autónomo es suficiente.

**UI**
- **Sí:** categorías no aplicables se muestran atenuadas con motivo, no se ocultan.

---

## Sección 7 — Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La IA devuelve `codigo_propuesto` que no compila o no encaja con el código real (aun viendo archivos). | Es propuesta, no merge automático: el usuario revisa y edita inline antes del PR (flujo Modo C existente). El destino `pr` nunca commitea sin aprobación. |
| Detección de idioma falla (README bilingüe o sin texto). | Default a inglés + toggle manual EN↔ES siempre disponible para corregir. |
| Modo B (dos pasadas) duplica el costo de tokens de la clave del usuario. | Es manual y explícito ("Análisis profundo"); el modo A por defecto es de una sola pasada. |
| `git/trees?recursive=1` truncado en repos enormes (GitHub marca `truncated: true`). | La heurística trabaja con lo disponible; si está truncado, se prioriza la raíz y `src/`. El análisis sigue funcionando, con menos cobertura. |
| Rate limit de GitHub al bajar árbol + 5-15 archivos por análisis. | Con token del usuario son 5000 req/h; el análisis usa ~10-17 req. Se mantiene el manejo de 403 existente. |
| 11 categorías hacen el prompt largo y suben el costo aun en modo A. | Las categorías de artefacto (diagrama/skill/onboarding) pueden generarse en una llamada aparte si el prompt único se vuelve caro — diferible a optimización, no bloquea v1. |

---

## Lo que **no** entra en este spec

- Modo C real (RAG / embeddings con pgvector).
- "Repo entero a Gemini 1M".
- Persistencia de artefactos (diagrama, skill, onboarding) en Supabase.
- Migración de análisis viejos (no existen: nunca se persistieron).
- Despliegue de la Edge Function de email.

Cada uno, si aterriza, va en su propio spec.
