import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
// Fuentes servidas desde nuestro servidor (no desde Google): sin enviar la IP del visitante a terceros
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import App from './App.jsx';
import './index.css';

// En producción el servidor incrusta el contenido en el HTML; en `npm run dev:web` se pide a la API
async function loadContent() {
  if (window.__ALAYAN_CONTENT__) return window.__ALAYAN_CONTENT__;
  const r = await fetch('/api/content');
  return r.json();
}

loadContent().then(content => {
  const root = document.getElementById('root');
  const app = (
    <React.StrictMode>
      <App content={content} url={{ pathname: location.pathname, search: location.search }} />
    </React.StrictMode>
  );
  // Si el servidor ya mandó la página pintada (SSR), React la «activa»; si no, la pinta desde cero
  if (root.firstElementChild) hydrateRoot(root, app);
  else createRoot(root).render(app);
});
