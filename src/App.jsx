import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Main from './Main';
import TierList from './TierList';
import CreateElement from './CreateElement';
import LinkManager from './LinkManager'; // Новый компонент для управления ссылками

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/tierlist" element={<TierList />} />
          <Route path="/create" element={<CreateElement />} />
          <Route path="/links" element={<LinkManager />} /> {/* Новый маршрут */}
        </Routes>
      </Router>
    </DndProvider>
  );
};

export default App;