// Self-check de aplicarCambio: node src/utils/categorias.test.mjs
import assert from 'node:assert'
import { aplicarCambio } from './categorias.js'

// append (docs): conserva el original y añade la sección al final.
const ap = aplicarCambio('mejora_docs', { seccion_propuesta: '## Nuevo' }, 'línea1\nlínea2')
assert.ok(ap.nuevo.startsWith('línea1\nlínea2'), 'append conserva original')
assert.ok(ap.nuevo.includes('## Nuevo'), 'append agrega sección')

// nuevo (test): devuelve el archivo completo; lanza si viene vacío.
assert.equal(aplicarCambio('test_faltante', { codigo_propuesto: 'test()' }).nuevo, 'test()')
assert.throws(() => aplicarCambio('test_faltante', {}), /archivo nuevo/)

// parche: reemplaza solo el bloque que coincide, conserva el resto.
const orig = 'const a = 1\nconst b = 2\nconst c = 3'
const r = aplicarCambio('fix_pequeno', { cambios: [{ buscar: 'const b = 2', reemplazar: 'const b = 20' }] }, orig)
assert.equal(r.nuevo, 'const a = 1\nconst b = 20\nconst c = 3', 'parche reemplaza solo el match')
assert.equal(r.advertencia, null)

// parche con '$' en el reemplazo: literal, no patrón de regex.
const rd = aplicarCambio('fix_pequeno', { cambios: [{ buscar: 'x', reemplazar: '$&$1 cost' }] }, 'x')
assert.equal(rd.nuevo, '$&$1 cost', '$ se trata como literal')

// parche parcial: aplica lo que calza y avisa.
const rp = aplicarCambio('a11y', {
  cambios: [{ buscar: 'const a = 1', reemplazar: 'const a = 9' }, { buscar: 'NO_EXISTE', reemplazar: 'z' }],
}, orig)
assert.ok(rp.nuevo.includes('const a = 9'), 'aplica el que calza')
assert.match(rp.advertencia, /1\/2|1 no coinci/, 'avisa del fallido')

// parche sin ninguna coincidencia: lanza, NO borra nada.
assert.throws(() => aplicarCambio('a11y', { cambios: [{ buscar: 'zzz', reemplazar: 'q' }] }, orig), /Ningún bloque/)

console.log('OK aplicarCambio')
