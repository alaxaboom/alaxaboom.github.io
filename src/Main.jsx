import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PasswordPrompt from './components/PasswordPrompt'; // Импортируем компонент
import './css/main.css';

const Main = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Если пароль верный, показываем основной контент
    if (isAuthenticated) {
        return (
            <div className="main-container">
                <h1>Добро пожаловать на мой сайт</h1>
                <div className="button-group">
                    <Link to="/tierlist">
                        <button className="main-button">Перейти к тирлисту</button>
                    </Link>
                    <Link to="/create">
                        <button className="main-button">Создать новый элемент</button>
                    </Link>
                    <Link to="/links">
                        <button className="main-button">Управление ссылками</button>
                    </Link>
                </div>
            </div>
        );
    }

    // Если пароль не введен, показываем форму ввода пароля
    return (
        <PasswordPrompt onPasswordCorrect={() => setIsAuthenticated(true)} />
    );
};

export default Main;