// Supabase Edge Function: notify-pr-status
// Envía un email vía Resend cuando una contribución cambia de estado
// (PR/issue aceptado o rechazado).
//
// Despliegue:   supabase functions deploy notify-pr-status
// Secreto:      supabase secrets set RESEND_API_KEY=re_xxx
//
// Se invoca desde el frontend con supabase.functions.invoke('notify-pr-status', {
//   body: { email, repo, tipo_cambio, estado, url }
// })
// (Alternativa: configurar un Database Webhook en UPDATE de `contribuciones`).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
// Remitente: usa onboarding@resend.dev hasta que verifiques tu propio dominio.
const FROM = Deno.env.get('NOTIFY_FROM') ?? 'GitHub Trending Agent <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function asunto(estado: string, repo: string) {
  if (estado === 'aceptado') return `🎉 Tu contribución en ${repo} fue aceptada`
  if (estado === 'rechazado') return `Tu contribución en ${repo} fue cerrada`
  return `Actualización de tu contribución en ${repo}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, repo, tipo_cambio, estado, url } = await req.json()

    if (!email) {
      return json({ error: 'Falta el email del destinatario' }, 400)
    }
    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY no configurada en la función' }, 500)
    }

    const html = `
      <div style="font-family: system-ui, sans-serif; line-height: 1.6;">
        <h2 style="margin:0 0 8px;">Actualización de tu contribución</h2>
        <p><strong>Repo:</strong> ${repo}</p>
        <p><strong>Tipo de cambio:</strong> ${tipo_cambio ?? 'N/D'}</p>
        <p><strong>Estado:</strong> ${estado}</p>
        ${url ? `<p><a href="${url}">Ver en GitHub →</a></p>` : ''}
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
        <p style="color:#888;font-size:12px;">Enviado por GitHub Trending Agent.</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: asunto(estado, repo),
        html,
      }),
    })

    if (!res.ok) {
      const detalle = await res.text()
      return json({ error: 'Resend falló', detalle }, 502)
    }

    const data = await res.json()
    return json({ ok: true, id: data.id }, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
