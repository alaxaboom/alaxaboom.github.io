import React, { useState, useEffect } from 'react';
import { fetchLinks, createLink, updateLink, deleteLink } from './api/linkService';
import { fetchTierListItems, deleteTierListItem } from './api/tierListItemService';
import { fetchLinkPreview } from './utils/linkPreviewService';
import LinkPreview from './components/LinkPreview';
import NavigationMenu from './components/NavigationMenu';
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
    const loadLinks = async () => {
      setLoading(true);
      const fetchWithRetry = async (retries = 5, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const data = await fetchLinks();
            if (!Array.isArray(data)) {
              throw new Error('Invalid data format');
            }
            return data;
          } catch (error) {
            if (i === retries - 1) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      };

      try {
        const data = await fetchWithRetry();
        setLinks(data);
      } catch (error) {
        console.error('Ошибка загрузки ссылок:', error.message);
        setError('Не удалось загрузить ссылки');
      } finally {
        setLoading(false);
      }
    };

    loadLinks();
  }, []);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

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
      const insertWithRetry = async (retries = 5, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const payload = await createLink({
              method: 'create',
              id: generateId(),
              url,
              text: url,
              category,
              createdAt: new Date().toISOString()
            });
            if (!payload) {
              throw new Error('Empty response');
            }
            return payload;
          } catch (error) {
            if (i === retries - 1) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      };

      const newLink = await insertWithRetry();
      
      setLinks(prev => [newLink, ...prev]);
      setUrl('');
      setLoading(false);

      fetchLinkPreview(url).then(previewData => {
        if (previewData.text && previewData.text !== url) {
          updateLink({
            id: newLink.id,
            patch: { text: previewData.text }
          }).then(() => {
            setLinks(prev => prev.map(link => 
              link.id === newLink.id ? { ...link, text: previewData.text } : link
            ));
          }).catch(error => {
            console.log('Не удалось обновить метаданные:', error);
          });
        }
      }).catch(error => {
        console.log('Не удалось получить метаданные:', error);
      });
    } catch (error) {
      console.error('Ошибка сохранения ссылки:', error.message);
      setError('Не удалось сохранить ссылку');
      setLoading(false);
    }
  };

  const handleDeleteLink = async (id) => {
    const deleteWithRetry = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          await deleteLink(id);
          return;
        } catch (error) {
          if (i === retries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    };

    try {
      await deleteWithRetry();
      setLinks(prev => prev.filter(link => link.id !== id));
    } catch (error) {
      console.error('Ошибка удаления ссылки:', error.message);
    }
  };

  const handleCategoryChange = async (id, newCategory) => {
    console.log('Changing category for id:', id, 'to:', newCategory);
    const link = links.find(l => l.id === id);
    console.log('Found link:', link);
    
    if (!link) {
      console.error('Link not found with id:', id);
      return;
    }

    const updateWithRetry = async (retries = 5, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          await updateLink({
            id,
            patch: { category: newCategory }
          });
          return;
        } catch (error) {
          console.error(`Update attempt ${i + 1} failed:`, error.message);
          if (i === retries - 1) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    };

    try {
      await updateWithRetry();
      setLinks(prev => prev.map(link => 
        link.id === id ? { ...link, category: newCategory } : link
      ));
    } catch (error) {
      console.error('Ошибка изменения категории:', error.message);
      setError(`Не удалось изменить категорию: ${error.message}`);
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (link.text && link.text.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch && link.category === category;
  });

  return (
    <>
      <NavigationMenu />
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
    </>
  );
};

export default LinkManager;