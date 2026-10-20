import React from 'react';
import { createRoot } from 'react-dom/client';
// Fuentes servidas desde nuestro servidor (no desde Google): sin enviar la IP del visitante a terceros
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import Guide from './Guide.jsx';
import './guia.css';

// El servidor incrusta el WhatsApp del panel; en `npm run dev:web` se pide a la API
async function loadContact() {
  if (window.__GUIA__) return window.__GUIA__;
  try { return (await (await fetch('/api/content')).json()).contact; } catch { return {}; }
}

loadContact().then(({ whatsapp = '', reviewUrl = '' }) => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Guide whatsapp={whatsapp} reviewUrl={reviewUrl} />
    </React.StrictMode>
  );
});
