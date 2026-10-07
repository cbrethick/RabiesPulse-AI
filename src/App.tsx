import { useEffect } from 'react';
import { go, useApp, useRoute } from './lib/app';
import { Login, Register } from './pages/Auth';
import Home from './pages/Home';
import Bite from './pages/Bite';
import Care from './pages/Care';
import Place from './pages/Place';
import Learn from './pages/Learn';
import Report from './pages/Report';
import MyReports from './pages/MyReports';
import Settings from './pages/Settings';
import About from './pages/About';
import Ask from './pages/Ask';
import { syncReports } from './lib/reports';

const PUBLIC = new Set(['/login', '/register']);

export default function App() {
  const { user } = useApp();
  const { path } = useRoute();

  // guard: logged-out users only see login/register; logged-in users skip them
  useEffect(() => {
    if (!user && !PUBLIC.has(path)) go('/login');
    if (user && PUBLIC.has(path)) go('/');
  }, [user, path]);

  // unsent reports go to the officer dashboard when the app opens or the network returns
  useEffect(() => {
    if (!user) return;
    const run = () => void syncReports(user);
    run();
    window.addEventListener('online', run);
    return () => window.removeEventListener('online', run);
  }, [user]);

  if (!user) return path === '/register' ? <Register /> : <Login />;

  switch (path) {
    case '/bite':
      return <Bite />;
    case '/care':
      return <Care />;
    case '/place':
      return <Place />;
    case '/learn':
      return <Learn />;
    case '/report':
      return <Report />;
    case '/reports':
      return <MyReports />;
    case '/settings':
      return <Settings />;
    case '/about':
      return <About />;
    case '/ask':
      return <Ask />;
    default:
      return <Home />;
  }
}
