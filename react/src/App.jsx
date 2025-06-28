import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Landing from './pages/Landing';
import Discrepancy from './pages/Discrepancy';


import PrivateRoute from './components/PrivateRoute';

import Home from './pages/Home';

import TopBar from './components/TopBar';

import NewProject from './pages/NewProject';
import CoverNew from './components/projects/covers/CoverNew';
import CoverEdit from './components/projects/covers/CoverEdit';

import SailNew from './components/projects/shadesails/SailNew';
import SailEdit from './components/projects/shadesails/SailEdit';

import Projects from './pages/Projects';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/copelands/react" element={<Landing />} />
        <Route path="/copelands/reactdiscrepancy" element={<Discrepancy />} />
        <Route element={<TopBar />}>
          <Route path="/copelands/reacthome" element={<Home />} />
          <Route path="/copelands/reactnew" element={<NewProject />}>
            <Route index element={<p>Select a project type to begin.</p>} />
            <Route path="/copelands/reactnew/cover" element={<CoverNew />} />
            <Route path="/copelands/reactnew/shadesail" element={<SailNew />} />
          </Route>
          <Route path="/copelands/reactprojects" element={<Projects />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;