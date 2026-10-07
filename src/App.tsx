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
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import About from './pages/About';
import Ask from './pages/Ask';

const PUBLIC = new Set(['/login', '/register']);

export default function App() {
  const { user } = useApp();
  const { path } = useRoute();

  // guard: logged-out users only see login/register; logged-in users skip them
  useEffect(() => {
    if (!user && !PUBLIC.has(path)) go('/login');
    if (user && PUBLIC.has(path)) go('/');
  }, [user, path]);

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
    case '/dashboard':
      return <Dashboard />;
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
