import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Home from './pages/Home'; // or just add a placeholder
import Projects from './pages/Projects';

function App() {
  return (
    <Router>
      <nav>
        <Link to="/copelands/react"> Home</Link>
        <Link to="/copelands/reactprojects">Projects</Link>
      </nav>
      <Routes>
        <Route path="/copelands/react" element={<Home />} />
        <Route path="/copelands/reactprojects" element={<Projects />} />
      </Routes>
    </Router>
  );
}

export default App;