import React, { useState, useEffect, useRef } from 'react';
import styles from '../css/LinkPreview.module.css';
import { fetchLinkPreview } from '../utils/linkPreviewService';

const LinkPreview = ({ url }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible && !previewData) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isVisible, previewData]);

  useEffect(() => {
    if (!isVisible || previewData) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await fetchLinkPreview(url);
        setPreviewData(data);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setPreviewData({
          text: url,
          description: '',
          image: '',
          url
        });
        setError('Не удалось загрузить предпросмотр ссылки.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isVisible, url, previewData]);

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

  return (
    <div ref={containerRef} className={styles.preview}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        {previewData && (
          <>
            {previewData.image && (
              <div className={styles.imageContainer}>
                {imageLoaded ? (
                  <img
                    ref={imageRef}
                    src={previewData.image}
                    alt="Preview"
                    loading="lazy"
                    className={styles.image}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    Image not loaded
                  </div>
                )}
              </div>
            )}
            <h3 className={styles.text}>{previewData.text}</h3>
            <p className={styles.description}>{previewData.description}</p>
          </>
        )}
        {!previewData && !loading && !error && (
          <h3 className={styles.text}>{url}</h3>
        )}
      </a>
    </div>
  );
};

export default LinkPreview;