import React from 'react';
import { createRoot } from 'react-dom/client';
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
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App content={content} />
    </React.StrictMode>
  );
});
