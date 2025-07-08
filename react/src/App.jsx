import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { getBaseUrl } from './utils/baseUrl';

import Landing from './pages/Landing';
import Discrepancy from './pages/Discrepancy';


import PrivateRoute from './components/PrivateRoute';

import Home from './pages/Home';

import TopBar from './components/TopBar';

import NewProject from './pages/NewProject';
import NewProjectGeneral from './pages/NewProjectGeneral';

import CoverNew from './components/projects/covers/CoverNew';

import SailNew from './components/projects/shadesails/SailNew';

import Projects from './pages/Projects';
import Project from './pages/Project';

import Database from './pages/Database';

import Analytics from './pages/Analytics';

import './styles/index.css';

function App() {
  useEffect(() => {
    const favicon = document.querySelector("link[rel~='icon']");
    if (favicon) {
      favicon.href = getBaseUrl('static/favicon/favicon-96x96.png');
    }
  }, []);
  return (
    <Router>
      <Routes>
        <Route path="/copelands" element={<Landing />} />
        <Route path="/copelands/discrepancy" element={<Discrepancy />} />
        <Route element={<TopBar />}>
          <Route path="/copelands/home" element={<Home />} />
          <Route path="/copelands/new" element={<NewProject />}>
            <Route index element={<p>Select a project type to begin.</p>} />
            <Route path="/copelands/new/cover" element={<CoverNew />} />
            <Route path="/copelands/new/shadesail" element={<SailNew />} />
          </Route>
          <Route path="/copelands/newgeneral" element={<NewProjectGeneral />} />
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
