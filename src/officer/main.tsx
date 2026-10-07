import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '../lib/app';
import Officer from './Officer';
import '../styles.css';

// The officer dashboard is its own app: no citizen login, English only.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider initialUser={null}>
      <Officer />
    </AppProvider>
  </StrictMode>,
);
