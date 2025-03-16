import React, { useState, useEffect } from 'react';

const LinkPreview = ({ url }) => {
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                const data = await response.json();
                const html = data.contents;

                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const title = doc.querySelector('title')?.textContent || '';
                const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

                setPreviewData({ title, description, image });
                setLoading(false);
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                setError('Не удалось загрузить предпросмотр ссылки.');
                setLoading(false);
            }
        };

        fetchData();
    }, [url]);

    if (loading) {
        return <p>Загрузка...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    if (!previewData) {
        return <p>Не удалось получить данные для предпросмотра.</p>;
    }

    return (
        <div className="link-preview">
            {previewData.image && (
                <img src={previewData.image} alt="Превью" loading="lazy" />
            )}
            <h3>{previewData.title}</h3>
            <p>{previewData.description}</p>
        </div>
    );
};

export default LinkPreview;