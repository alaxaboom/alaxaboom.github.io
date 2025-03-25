import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Main from './Main';
import TierList from './TierList';
import CreateElement from './CreateElement';
import LinkManager from './LinkManager';
import AltMain from './AltMain';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/altMain" element={<AltMain />} />
          <Route path="/tierlist" element={<ProtectedRoute><TierList /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateElement /></ProtectedRoute>} />
          <Route path="/links" element={<ProtectedRoute><LinkManager /></ProtectedRoute>} />
        </Routes>
      </Router>
    </DndProvider>
  );
};

export default App;