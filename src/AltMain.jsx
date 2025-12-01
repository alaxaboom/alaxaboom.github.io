import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordPrompt from './components/PasswordPrompt';
import './css/main.css';

const AltMain = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    const authStatus = sessionStorage.getItem('isAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
    
    if (authStatus) {
      navigate('/altMain');
    }
  }, [navigate]);

  const handlePasswordCorrect = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
    navigate('/altMain');
  };

  if (!isAuthenticated) {
    return <PasswordPrompt onPasswordCorrect={handlePasswordCorrect} />;
  }

  return (
    <div className="main-container">
      <h1>Секретная страница</h1>
      <div className="button-group">
        <button onClick={() => navigate('/tierlist')} className="main-button">
          Перейти к тирлисту
        </button>
        <button onClick={() => navigate('/links')} className="main-button">
          Управление ссылками
        </button>
      </div>
    </div>
  );
};

export default AltMain;