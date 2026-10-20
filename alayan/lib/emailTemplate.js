// Plantilla HTML de los emails, con el estilo de la web (negro, dorado y blanco roto).
// HTML «de email»: tablas y estilos en línea, sin fuentes externas ni CSS moderno, para que se vea
// igual en Gmail, Outlook, Apple Mail y el móvil. Los textos vienen del panel (Avisos al cliente).

const GOLD = '#C5A46A', GOLD_DARK = '#9a7b45', INK = '#141210', MUTED = '#6b6257', BG = '#f4f1ec', LINE = '#ece4d6';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Botón «a prueba de Outlook» (tabla con fondo)
function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px"><tr>
<td align="center" bgcolor="${GOLD}" style="border-radius:999px;background:${GOLD}">
<a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:14px;font-weight:bold;letter-spacing:1.5px;color:#000000;text-decoration:none;border-radius:999px;text-transform:uppercase">${esc(label)}</a>
</td></tr></table>`;
}

// Tarjeta con el resumen de la reserva: rows = [[etiqueta, valor], …], total = [etiqueta, valor] opcional
function summaryCard(rows, total) {
  const tr = rows.filter(r => r[1]).map(([k, v], i) => `<tr>
<td style="padding:11px 18px;${i ? `border-top:1px solid ${LINE};` : ''}font-family:${SANS};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${GOLD_DARK};width:34%;vertical-align:top">${esc(k)}</td>
<td style="padding:11px 18px;${i ? `border-top:1px solid ${LINE};` : ''}font-family:${SANS};font-size:15px;line-height:1.45;color:${INK};vertical-align:top">${esc(v)}</td></tr>`).join('');
  const tot = total && total[1] ? `<tr><td colspan="2" style="background:#0a0a0a;padding:16px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="font-family:${SANS};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#bdb3a3">${esc(total[0])}</td>
<td align="right" style="font-family:${SERIF};font-size:28px;color:${GOLD};white-space:nowrap">${esc(total[1])}</td></tr></table></td></tr>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid ${LINE};border-radius:14px;border-collapse:separate;overflow:hidden;background:#fbf8f2">${tr}${tot}</table>`;
}

// Convierte el texto del panel en HTML: párrafos, saludo destacado y los huecos {summary}/{link} como bloques
function bodyHtml(text, blocks) {
  const out = [];
  let para = [];
  const flush = () => { if (para.length) { out.push(para); para = []; } };
  for (const raw of String(text).split(String.fromCharCode(10))) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (blocks[line]) { flush(); out.push(blocks[line]); continue; }
    para.push(line);
  }
  flush();
  return out.map((p, i) => {
    if (typeof p === 'string') return p;
    const html = p.map(l => esc(l)).join('<br>');
    // El primer párrafo («Hola, Ana:») va como saludo
    if (i === 0 && p.length === 1 && p[0].length < 60) return `<p style="margin:0 0 14px;font-family:${SERIF};font-size:26px;line-height:1.2;color:${INK}">${html}</p>`;
    return `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.65;color:#2b2723">${html}</p>`;
  }).join('');
}

// Documento completo
function renderEmail({ lang = 'ES', preheader = '', logoUrl, brand, tagline, content, footer }) {
  const f = footer || {};
  const contact = [
    f.waUrl ? `<a href="${esc(f.waUrl)}" target="_blank" style="display:inline-block;margin:0 4px 8px;padding:9px 18px;border:1px solid #3a342c;border-radius:999px;font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:1px;color:${GOLD};text-decoration:none">WHATSAPP</a>` : '',
    f.phone ? `<a href="tel:${esc(f.phone.replace(/[^+0-9]/g, ''))}" style="display:inline-block;margin:0 4px 8px;padding:9px 18px;border:1px solid #3a342c;border-radius:999px;font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:1px;color:#e9e2d6;text-decoration:none">${esc(f.phone)}</a>` : ''
  ].join('');
  const links = (f.links || []).map(l => `<a href="${esc(l.href)}" target="_blank" style="color:#8f8676;text-decoration:underline">${esc(l.label)}</a>`).join(' &nbsp;·&nbsp; ');

  return `<!DOCTYPE html>
<html lang="${lang === 'EN' ? 'en' : 'es'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(brand)}</title></head>
<body style="margin:0;padding:0;background:${BG};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border-collapse:separate">

<tr><td style="background:#0a0a0a;padding:26px 30px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${logoUrl ? `<td style="padding-right:14px"><img src="${esc(logoUrl)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border-radius:12px;background:#ffffff;object-fit:contain"></td>` : ''}
<td><div style="font-family:${SERIF};font-size:22px;letter-spacing:3px;color:#ffffff">${esc(brand)}</div>
<div style="margin-top:4px;font-family:${SANS};font-size:10px;letter-spacing:3px;color:${GOLD}">${esc(tagline)}</div></td>
</tr></table></td></tr>
<tr><td style="height:3px;background:${GOLD};line-height:3px;font-size:0">&nbsp;</td></tr>

<tr><td style="padding:34px 30px 18px">${content}</td></tr>

${f.help ? `<tr><td style="padding:0 30px 30px"><p style="margin:0;padding-top:18px;border-top:1px solid ${LINE};font-family:${SANS};font-size:13px;line-height:1.6;color:${MUTED}">${esc(f.help)}</p>
${f.signature ? `<p style="margin:10px 0 0;font-family:${SERIF};font-size:16px;font-style:italic;color:${INK}">${esc(f.signature)}</p>` : ''}</td></tr>` : ''}

${contact || f.legal || links ? `<tr><td align="center" style="background:#141210;padding:26px 30px">
${contact ? `<div style="margin-bottom:10px">${contact}</div>` : ''}
${f.legal ? `<div style="font-family:${SANS};font-size:11px;line-height:1.6;color:#8f8676">${esc(f.legal)}</div>` : ''}
${links ? `<div style="margin-top:8px;font-family:${SANS};font-size:11px;color:#8f8676">${links}</div>` : ''}
</td></tr>` : ''}
</table>
</td></tr></table>
</body></html>`;
}

// Envoltorio sencillo para textos sin estructura (avisos internos a Alayan)
function renderPlain({ text, logoUrl, brand, tagline, footer }) {
  const html = String(text).split(String.fromCharCode(10)).map(l => esc(l)
    .replace(/(https?:[/][/][^\s<]+)/g, `<a href="$1" style="color:${GOLD_DARK}">$1</a>`)).join('<br>');
  return renderEmail({ logoUrl, brand, tagline, footer, content: `<div style="font-family:${SANS};font-size:15px;line-height:1.6;color:#2b2723">${html}</div>` });
}

module.exports = { renderEmail, renderPlain, bodyHtml, summaryCard, button, esc };
