import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { syncDarkMode } from './store/togglesSlice';

import { getBaseUrl } from './utils/baseUrl';

// Lazy load pages to improve TTI
const Landing = React.lazy(() => import('./pages/Landing'));
const Discrepancy = React.lazy(() => import('./pages/Discrepancy'));
const Rectangles = React.lazy(() => import('./pages/Rectangles'));
const FabricCatalog = React.lazy(() => import('./pages/FabricCatalog'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const Projects = React.lazy(() => import('./pages/Projects'));
const Project = React.lazy(() => import('./pages/Project'));
const Users = React.lazy(() => import('./pages/Users'));
const Database = React.lazy(() => import('./pages/Database'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Tools = React.lazy(() => import('./pages/Tools'));

import TopBar from './components/TopBar';
import RequireAuth from './components/RequireAuth';
import GeneralBottomBar from './components/GeneralBottomBar';

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
    <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);


function App() {
  const darkMode = useSelector((state) => state.toggles.darkMode);
  const dispatch = useDispatch();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    // Favicon setup
    const favicon = document.querySelector("link[rel~='icon']");
    if (favicon) {
      favicon.href = getBaseUrl('static/favicon/favicon-96x96.png');
    }

    // Reveal app to prevent FOUC
    const root = document.getElementById('root');
    if (root) {
      setTimeout(() => {
        root.style.opacity = '1';
      }, 100);
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't manually overridden
      if (localStorage.getItem('darkMode') === null) {
        dispatch(syncDarkMode(e.matches));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [dispatch]);


  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/copelands" element={<Landing />} />
          <Route path="/copelands/discrepancy" element={<Discrepancy />} />
          <Route path="/copelands/rectangles" element={<Rectangles />} />
          <Route path="/copelands/fabric" element={<FabricCatalog />} />
          <Route path="/copelands/legal/terms" element={<TermsOfService />} />
          <Route path="/copelands/legal/privacy" element={<PrivacyPolicy />} />
          <Route element={<RequireAuth />}>
            <Route element={<TopBar />}>
              <Route path="/copelands/projects" element={<Projects />} />
              <Route path="/copelands/users" element={<Users />} />
              <Route path="/copelands/projects/:id" element={<Project />} />
              <Route path="/copelands/database" element={<Database />} />
              <Route path="/copelands/analytics" element={<Analytics />} />
              <Route path="/copelands/tools" element={<Tools />} />
            </Route>
          </Route>
        </Routes>
        <GeneralBottomBar />
      </Suspense>
    </Router>
  );
}

export default App;
