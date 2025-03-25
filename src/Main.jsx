import React from 'react';
import { useNavigate } from 'react-router-dom';
import './css/main.css';

const Main = () => {
  const navigate = useNavigate();

  return (
    <div className="main-container">
      <h1>Добро пожаловать на мой сайт</h1>
      <button 
        className="secret-button"
        onClick={() => navigate('/altMain')}
      >
        Секрет
      </button>
    </div>
  );
};

export default Main;