import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { syncDarkMode } from './store/togglesSlice';
import { fetchProducts } from './store/productsSlice';


import { getBaseUrl } from './utils/baseUrl';


import Landing from './pages/Landing';
import Discrepancy from './pages/Discrepancy';
import Rectangles from './pages/Rectangles';

import TopBar from './components/TopBar';

import NewProject from './pages/NewProject';

import Projects from './pages/Projects';
import Project from './pages/Project';
import Users from './pages/Users';

import Database from './pages/Database';

import Analytics from './pages/Analytics';

import RequireAuth from './components/RequireAuth';

import './styles/index.css';

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
    dispatch(fetchProducts());
    const favicon = document.querySelector("link[rel~='icon']");
    if (favicon) {
      favicon.href = getBaseUrl('static/favicon/favicon-96x96.png');
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
      <Routes>
        <Route path="/copelands" element={<Landing />} />
        <Route path="/copelands/discrepancy" element={<Discrepancy />} />
        <Route path="/copelands/rectangles" element={<Rectangles />} />
        <Route element={<RequireAuth />}>
          <Route element={<TopBar />}>
            <Route path="/copelands/projects" element={<Projects />} />
            <Route path="/copelands/newproject" element={<NewProject />} />
            <Route path="/copelands/users" element={<Users />} />
            <Route path="/copelands/projects/:id" element={<Project />} />
            <Route path="/copelands/database" element={<Database />} />
            <Route path="/copelands/analytics" element={<Analytics />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
