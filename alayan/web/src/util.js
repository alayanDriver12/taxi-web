// Sustituye {clave} por su valor: "© {year}" → "© 2026"
export const fill = (tpl, vars) => String(tpl ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

// El idioma viaja en la URL (?lang=en) entre páginas
export const withLang = (href, lang) => (lang === 'EN' ? `${href}?lang=en` : href);
