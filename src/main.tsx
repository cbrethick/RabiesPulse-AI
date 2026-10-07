import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './lib/app';
import { currentUser } from './lib/auth';
import './styles.css';

const started = performance.now();

/** Let the opening animation finish (≈1.6 s, shorter with reduced motion), then fade into the app. */
function hideSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = Math.max(0, (reduced ? 300 : 1600) - (performance.now() - started));
  setTimeout(() => {
    el.classList.add('leave');
    setTimeout(() => el.remove(), 500);
  }, wait);
}

// Restore the session before first paint so a refresh keeps the user logged in.
currentUser().then((user) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProvider initialUser={user}>
        <App />
      </AppProvider>
    </StrictMode>,
  );
  hideSplash();
});
