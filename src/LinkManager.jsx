import React, { useState, useEffect } from 'react';
import supabase from './supabase';
import LinkPreview from './components/LinkPreview';
import styles from './css/LinkManager.module.css';

const LinkManager = () => {
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('passed');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    document.body.style.background = 'linear-gradient(to bottom, #808080, #000000)';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  useEffect(() => {
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
        setError('Не удалось загрузить ссылки');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, []);

  const handleSaveLink = async () => {
    if (!url.trim()) {
      setError('Пожалуйста, введите ссылку');
      return;
    }

    const isDuplicate = links.some((link) => link.url === url);
    if (isDuplicate) {
      setError('Эта ссылка уже добавлена');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Сохраняем базовую информацию без метаданных
      const { data: linkData, error: linkError } = await supabase
        .from('Links')
        .insert([{ 
          url, 
          text: url, // Временно используем URL как текст
          category,
          created_at: new Date()
        }])
        .select();

      if (linkError) throw linkError;

      // Пытаемся получить метаданные (в фоне, без блокировки интерфейса)
      try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const title = doc.querySelector('title')?.textContent || url;
          const image = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

          // Обновляем запись в Links
          await supabase
            .from('Links')
            .update({ text: title })
            .eq('id', linkData[0].id);

          // Добавляем в tierListItems если есть изображение
          if (image) {
            await supabase
              .from('tierListItems')
              .insert([{ 
                text: title, 
                image_url: image, 
                order: 0, 
                category_id: null 
              }]);
          }

          // Обновляем локальное состояние
          setLinks(prev => prev.map(link => 
            link.id === linkData[0].id ? { ...link, text: title } : link
          ));
        }
      } catch (metadataError) {
        console.log('Не удалось получить метаданные:', metadataError);
      }

      setLinks(prev => [linkData[0], ...prev]);
      setUrl('');
    } catch (error) {
      console.error('Ошибка сохранения ссылки:', error.message);
      setError('Не удалось сохранить ссылку');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (id) => {
    try {
      const { error } = await supabase
        .from('Links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setLinks(prev => prev.filter(link => link.id !== id));
    } catch (error) {
      console.error('Ошибка удаления ссылки:', error.message);
    }
  };

  const handleCategoryChange = async (id, newCategory) => {
    try {
      const { error } = await supabase
        .from('Links')
        .update({ category: newCategory })
        .eq('id', id);

      if (error) throw error;
      setLinks(prev => prev.map(link => 
        link.id === id ? { ...link, category: newCategory } : link
      ));
    } catch (error) {
      console.error('Ошибка изменения категории:', error.message);
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (link.text && link.text.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && link.category === category;
  });

  return (
    <div className={styles.container}>
      <h1>Управление ссылками</h1>
      <div className={styles.form}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Введите ссылку"
          disabled={loading}
          className={styles.input}
        />
        <button 
          onClick={handleSaveLink} 
          disabled={loading || !url}
          className={styles.button}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
      <div className={styles.search}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по названию или URL"
          className={styles.searchInput}
        />
      </div>
      <div className={styles.radioButtons}>
        <label className={`${styles.radioButton} ${category === 'passed' ? styles.passed : ''}`}>
          <input
            type="radio"
            name="category"
            value="passed"
            checked={category === 'passed'}
            onChange={() => setCategory('passed')}
          />
          Прошел
        </label>
        <label className={`${styles.radioButton} ${category === 'not_passed' ? styles.not_passed : ''}`}>
          <input
            type="radio"
            name="category"
            value="not_passed"
            checked={category === 'not_passed'}
            onChange={() => setCategory('not_passed')}
          />
          Не прошел
        </label>
        <label className={`${styles.radioButton} ${category === 'in_progress' ? styles.in_progress : ''}`}>
          <input
            type="radio"
            name="category"
            value="in_progress"
            checked={category === 'in_progress'}
            onChange={() => setCategory('in_progress')}
          />
          В процессе
        </label>
        <label className={`${styles.radioButton} ${category === 'passed_but_more' ? styles.passed_but_more : ''}`}>
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
      {error && <p className={styles.errorMessage}>{error}</p>}
      <div className={styles.linkList}>
        {filteredLinks.map((link) => (
          <div key={link.id} className={styles.linkItem}>
            <select
              value={link.category}
              onChange={(e) => handleCategoryChange(link.id, e.target.value)}
              className={styles.categorySelect}
            >
              <option value="passed">Прошел</option>
              <option value="not_passed">Не прошел</option>
              <option value="in_progress">В процессе</option>
              <option value="passed_but_more">Прошел, но еще много впереди</option>
            </select>
            <button
              className={styles.deleteButton}
              onClick={() => handleDeleteLink(link.id)}
            >
              Удалить
            </button>
            <LinkPreview url={link.url} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinkManager;