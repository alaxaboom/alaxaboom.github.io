import React, { useState, useEffect, useRef } from 'react';
import styles from '../css/LinkPreview.module.css'; // Импорт стилей как модуля

const LinkPreview = ({ url }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem(`preview-${url}`);
        if (cachedData) {
          setPreviewData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Ошибка загрузки данных');

        const data = await response.json();
        const html = data.contents;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const text = doc.querySelector('text')?.textContent || '';
        const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

        const previewData = { text, description, image, url };
        setPreviewData(previewData);
        setLoading(false);

        localStorage.setItem(`preview-${url}`, JSON.stringify(previewData));
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить предпросмотр ссылки.');
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  useEffect(() => {
    if (previewData?.image) {
      const img = new Image();
      img.src = previewData.image;

      const timeout = setTimeout(() => {
        if (!imageLoaded) setImageLoaded(false);
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        setImageLoaded(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        setImageLoaded(false);
      };

      return () => clearTimeout(timeout);
    }
  }, [previewData]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p>{error}</p>;
  if (!previewData) return <p>Не удалось получить данные для предпросмотра.</p>;

  return (
    <div className={styles.preview}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {previewData.image && (
          <div className={styles.imageContainer}>
            {imageLoaded ? (
              <img
                ref={imageRef}
                src={previewData.image}
                alt="Превью"
                loading="lazy"
                className={styles.image}
              />
            ) : (
              <div className={styles.imagePlaceholder}>
                Изображение не загружено
              </div>
            )}
          </div>
        )}
        <h3 className={styles.text}>{previewData.text}</h3>
        <p className={styles.description}>{previewData.description}</p>
      </a>
    </div>
  );
};

export default LinkPreview;