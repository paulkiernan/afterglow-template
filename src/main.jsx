import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fraunces/latin-400.css';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/karla/latin-400.css';
import '@fontsource/karla/latin-500.css';
import '@fontsource/karla/latin-600.css';
import '@fontsource/stick-no-bills/latin-500.css';
import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
