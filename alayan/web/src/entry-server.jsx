// Renderizado en el servidor (SSR): el HTML sale ya con todo el contenido, para Google y para que
// la página se vea al instante. Lo usa server.js (compilado en dist-ssr/ con `npm run build`).
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import { resolvePage, headFor, sitemapPages } from './routes.js';

export { sitemapPages };

export function render(urlString, data, baseUrl) {
  const u = new URL(urlString, 'http://localhost');
  const html = renderToString(<App content={data} url={{ pathname: u.pathname, search: u.search }} />);
  const page = resolvePage(u.pathname, u.search, data.pricing);
  return { html, head: page ? headFor(page, data, baseUrl) : null, status: page?.kind === 'notfound' ? 404 : 200, lang: page?.lang };
}
