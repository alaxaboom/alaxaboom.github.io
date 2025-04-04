import React, { useState } from 'react';
import '../css/PasswordPrompt.css';

const PasswordPrompt = ({ onPasswordCorrect }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === process.env.REACT_APP_MAIN_PASSWORD) {
      onPasswordCorrect();
    } else {
      setError('Неверный пароль');
      setPassword('');
    }
  };

  return (
    <div className="password-prompt">
      <h2>Введите пароль для доступа</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          required
          autoFocus
        />
        <button type="submit">Войти</button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default PasswordPrompt;