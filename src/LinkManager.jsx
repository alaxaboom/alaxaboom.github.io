import React, { useState, useEffect } from 'react';
import supabase from './supabase';
import LinkPreview from './components/LinkPreview';
import './css/LinkManager.css';

const LinkManager = () => {
    const [url, setUrl] = useState('');
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('passed'); // Состояние по умолчанию

    // Загрузка ссылок при монтировании компонента
    useEffect(() => {
        fetchLinks();
    }, []);

    // Функция для загрузки ссылок из базы данных
    const fetchLinks = async () => {
        try {
            const { data, error } = await supabase
                .from('Links')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setLinks(data);
        } catch (error) {
            console.error('Ошибка загрузки ссылок:', error.message);
        }
    };

    // Функция для сохранения ссылки в базу данных
    const handleSaveLink = async () => {
        if (!url.trim()) {
            setError('Пожалуйста, введите ссылку');
            return;
        }

        // Проверка на дубликаты
        const isDuplicate = links.some((link) => link.url === url);
        if (isDuplicate) {
            setError('Эта ссылка уже добавлена');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase
                .from('Links')
                .insert([{ url, category }])
                .select();

            if (error) throw error;

            setLinks((prevLinks) => [data[0], ...prevLinks]); // Добавляем новую ссылку в состояние
            setUrl(''); // Очищаем поле ввода
        } catch (error) {
            console.error('Ошибка сохранения ссылки:', error.message);
            setError('Не удалось сохранить ссылку');
        } finally {
            setLoading(false);
        }
    };

    // Функция для удаления ссылки
    const handleDeleteLink = async (id) => {
        try {
            const { error } = await supabase
                .from('Links')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setLinks((prevLinks) => prevLinks.filter((link) => link.id !== id)); // Удаляем ссылку из состояния
        } catch (error) {
            console.error('Ошибка удаления ссылки:', error.message);
        }
    };

    // Функция для изменения категории
    const handleCategoryChange = async (id, newCategory) => {
        try {
            const { error } = await supabase
                .from('Links')
                .update({ category: newCategory })
                .eq('id', id);

            if (error) throw error;

            // Обновляем состояние
            setLinks((prevLinks) =>
                prevLinks.map((link) =>
                    link.id === id ? { ...link, category: newCategory } : link
                )
            );
        } catch (error) {
            console.error('Ошибка изменения категории:', error.message);
        }
    };

    // Фильтрация ссылок по категории
    const filteredLinks = links.filter((link) => link.category === category);

    return (
        <div className="link-manager-container">
            <h1>Управление ссылками</h1>
            <div className="link-form">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Введите ссылку"
                    disabled={loading}
                />
                <button onClick={handleSaveLink} disabled={loading}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
            </div>
            <div className="radio-buttons">
                <label className="radio-button passed">
                    <input
                        type="radio"
                        name="category"
                        value="passed"
                        checked={category === 'passed'}
                        onChange={() => setCategory('passed')}
                    />
                    Прошел
                </label>
                <label className="radio-button not_passed">
                    <input
                        type="radio"
                        name="category"
                        value="not_passed"
                        checked={category === 'not_passed'}
                        onChange={() => setCategory('not_passed')}
                    />
                    Не прошел
                </label>
                <label className="radio-button in_progress">
                    <input
                        type="radio"
                        name="category"
                        value="in_progress"
                        checked={category === 'in_progress'}
                        onChange={() => setCategory('in_progress')}
                    />
                    В процессе
                </label>
                <label className="radio-button passed_but_more">
                    <input
                        type="radio"
                        name="category"
                        value="passed_but_more"
                        checked={category === 'passed_but_more'}
                        onChange={() => setCategory('passed_but_more')}
                    />
                    Прошел, но еще много впереди
                </label>
            </div>
            {error && <p className="error-message">{error}</p>}
            <div className="link-list">
                {filteredLinks.map((link) => (
                    <div key={link.id} className="link-item">
                        <select
                            value={link.category}
                            onChange={(e) => handleCategoryChange(link.id, e.target.value)}
                            className="category-select"
                        >
                            <option value="passed">Прошел</option>
                            <option value="not_passed">Не прошел</option>
                            <option value="in_progress">В процессе</option>
                            <option value="passed_but_more">Прошел, но еще много впереди</option>
                        </select>
                        <LinkPreview url={link.url} />
                        <button
                            className="delete-button"
                            onClick={() => handleDeleteLink(link.id)}
                        >
                            Удалить
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LinkManager;