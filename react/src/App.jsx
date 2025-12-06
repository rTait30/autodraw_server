import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { getBaseUrl } from './utils/baseUrl';

import Landing from './pages/Landing';
import Discrepancy from './pages/Discrepancy';
import Rectangles from './pages/Rectangles';

import Home from './pages/Home';

import TopBar from './components/TopBar';

import NewProject from './pages/NewProject';

import Projects from './pages/Projects';
import Project from './pages/Project';

import Database from './pages/Database';

import Analytics from './pages/Analytics';

import './styles/index.css';

function App() {
  const darkMode = useSelector((state) => state.toggles.darkMode);

  useEffect(() => {
    const favicon = document.querySelector("link[rel~='icon']");
    if (favicon) {
      favicon.href = getBaseUrl('static/favicon/favicon-96x96.png');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <Router>
      <Routes>
        <Route path="/copelands" element={<Landing />} />
        <Route path="/copelands/discrepancy" element={<Discrepancy />} />
        <Route path="/copelands/rectangles" element={<Rectangles />} />
        <Route element={<TopBar />}>
          <Route path="/copelands/home" element={<Home />} />
          <Route path="/copelands/newproject" element={<NewProject />} />
          <Route path="/copelands/projects" element={<Projects />} />
          <Route path="/copelands/projects/:id" element={<Project />} />
          <Route path="/copelands/database" element={<Database />} />
          <Route path="/copelands/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
