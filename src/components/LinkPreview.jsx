import React, { useState, useEffect, useRef } from 'react';
import styles from '../css/LinkPreview.module.css';
import { fetchLinkPreview } from '../utils/linkPreviewService';

const LinkPreview = ({ url }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const previewData = await fetchLinkPreview(url);
        setPreviewData(previewData);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setPreviewData({
          text: url,
          description: '',
          image: '',
          url
        });
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
        setImageLoaded((prev) => {
          if (!prev) return false;
          return prev;
        });
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