import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TierListCategory from './components/TierListCategory';
import UnrankedElementsSection from './components/UnrankedElementsSection';
import CategoryManager from './components/CategoryManager';
import EditCategoryModal from './components/EditCategoryModal';
import CustomDragLayer from './components/CustomDragLayer';
import NavigationMenu from './components/NavigationMenu';
import LoadingSpinner from './components/LoadingSpinner';
import { fetchCategories, updateCategory, deleteCategory } from './api/categoryService';
import { clearCache } from './utils/cacheService';
import { fetchTierListItems, updateTierListItem, createTierListItem, updateOrderBatch, deleteTierListItem } from './api/tierListItemService';
import { fetchLinks } from './api/linkService';
import { fetchLinkPreview } from './utils/linkPreviewService';
import './css/TierList.css';

// Компонент для отслеживания drag состояния и прокрутки
const DragScrollHandler = () => {
  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  useEffect(() => {
    let scrollInterval = null;

    const handleDragOver = (e) => {
      if (!isDragging) return;

      const threshold = 100;
      const scrollSpeed = 15;
      const { clientY, clientX } = e;
      const { innerHeight, innerWidth } = window;

      // Очищаем предыдущий интервал
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }

      // Прокрутка вниз
      if (innerHeight - clientY < threshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(0, scrollSpeed);
        }, 16);
      }
      // Прокрутка вверх
      else if (clientY < threshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(0, -scrollSpeed);
        }, 16);
      }
      // Прокрутка вправо
      else if (innerWidth - clientX < threshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(scrollSpeed, 0);
        }, 16);
      }
      // Прокрутка влево
      else if (clientX < threshold) {
        scrollInterval = setInterval(() => {
          window.scrollBy(-scrollSpeed, 0);
        }, 16);
      }
    };

    // Разрешаем прокрутку колесиком во время drag
    const handleWheel = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        window.scrollBy({
          top: e.deltaY,
          left: e.deltaX,
          behavior: 'auto'
        });
      }
    };

    if (isDragging) {
      document.addEventListener('dragover', handleDragOver);
      document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    }

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('wheel', handleWheel, { capture: true });
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
  }, [isDragging]);

  return null;
};

const TierList = () => {
  const [unrankedElements, setUnrankedElements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tierList, setTierList] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const categoriesInitialized = useRef(false);
  const lastCategoriesLength = useRef(-1);
  const saveOrderTimeoutRef = useRef({});

  const fetchAllElements = useCallback(async (categoriesToUse) => {
    if (categoriesToUse.length === 0) {
      return;
    }
    try {
      const linksData = await fetchLinks(true);
      setLinks(linksData);

      const eligibleLinks = linksData.filter(link => link.category !== 'not_passed');
      
      let items = await fetchTierListItems(true);
      const existingLinkIds = new Set(items.map(item => String(item.link_id).trim()));
      const linksToCreate = eligibleLinks.filter(link => {
        const linkId = String(link.id).trim();
        return !existingLinkIds.has(linkId);
      });

      // Создаем элементы для новых ссылок
      if (linksToCreate.length > 0) {
        const unrankedCount = items.filter(item => !item.category_id).length;
        
        for (let i = 0; i < linksToCreate.length; i++) {
          const link = linksToCreate[i];
          try {
            const result = await createTierListItem({
              method: 'create',
              link_id: link.id,
              category_id: null,
              order: unrankedCount + i
            });
            if (result && result.id) {
              items.push({
                id: result.id,
                link_id: result.link_id,
                category_id: result.category_id,
                order: result.order
              });
              existingLinkIds.add(String(link.id).trim());
            }
            if (i < linksToCreate.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error(`Ошибка создания tierListItem для link_id ${link.id}:`, error);
          }
        }
        
        // Перезагружаем элементы после создания
        items = await fetchTierListItems(false);
      }

      // Удаляем элементы из тир-листа, если их категория стала "not_passed"
      const itemsToDelete = items.filter(item => {
        const link = linksData.find(l => String(l.id) === String(item.link_id));
        return link && link.category === 'not_passed';
      });

      if (itemsToDelete.length > 0) {
        for (const item of itemsToDelete) {
          try {
            await deleteTierListItem(item.id);
          } catch (error) {
            console.error(`Ошибка удаления tierListItem для link_id ${item.link_id}:`, error);
          }
        }
        // Перезагружаем элементы после удаления
        items = await fetchTierListItems(false);
      }

      // Объединяем данные из tierListItems с данными из links
      const itemsWithLinkData = items.map((item) => {
        const link = linksData.find(l => String(l.id) === String(item.link_id));
        if (!link) return null;
        
        // Получаем image и text из localStorage или из ссылки
        let imageUrl = '';
        let text = link.text || link.url || '';
        
        if (link.url) {
          try {
            const cachedData = localStorage.getItem(`preview-${link.url.trim()}`);
            if (cachedData) {
              const previewData = JSON.parse(cachedData);
              if (previewData.image) {
                imageUrl = previewData.image;
                if (previewData.text && previewData.text !== link.url) {
                  text = previewData.text;
                }
              }
            }
            
            if (!imageUrl) {
              fetchLinkPreview(link.url.trim()).then(previewData => {
                if (previewData && previewData.image) {
                  setTierList(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(catId => {
                      updated[catId] = updated[catId].map(el => 
                        el.url === link.url ? { ...el, image_url: previewData.image, text: previewData.text || el.text } : el
                      );
                    });
                    return updated;
                  });
                  setUnrankedElements(prev => prev.map(el => 
                    el.url === link.url ? { ...el, image_url: previewData.image, text: previewData.text || el.text } : el
                  ));
                }
              }).catch(() => {});
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
        
        return {
          ...item,
          image_url: imageUrl,
          text: text,
          url: link.url || ''
        };
      }).filter(Boolean);

      const categorizedElements = {};
      categoriesToUse.forEach(category => {
        const categoryItems = itemsWithLinkData
          .filter(item => item.category_id === category.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        categorizedElements[category.id] = categoryItems;
      });

      setTierList(categorizedElements);
      
      const unrankedItems = itemsWithLinkData
        .filter(item => !item.category_id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setUnrankedElements(unrankedItems);
    } catch (error) {
      console.error('Ошибка загрузки элементов:', error.message);
    }
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const categoriesData = await fetchCategories(true);
        const sortedCategories = Array.isArray(categoriesData) 
          ? categoriesData.sort((a, b) => (a.order || 0) - (b.order || 0))
          : categoriesData;
        setCategories(sortedCategories);
        
        if (categoriesData.length > 0) {
          lastCategoriesLength.current = categoriesData.length;
          if (!categoriesInitialized.current) {
            initializeTierList(categoriesData);
            categoriesInitialized.current = true;
          }
          await fetchAllElements(categoriesData);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [fetchAllElements]);


  const initializeTierList = (categories) => {
    const initialTierList = {};
    categories.forEach(category => {
      initialTierList[category.id] = [];
    });
    setTierList(initialTierList);
  };


  const handleDrop = async (item, categoryId) => {
    // Создаем обновленный элемент с сохранением всех данных (включая картинку)
    const updatedItem = { 
      ...item, 
      category_id: categoryId,
      // Убеждаемся, что все данные сохраняются
      image_url: item.image_url || item.imageUrl,
      text: item.text,
      url: item.url
    };

    // Сохраняем текущее состояние для сохранения порядка
    let oldCategoryItems = [];
    let newCategoryItems = [];

    // Сначала обновляем визуальное состояние сразу для быстрого отклика
    if (categoryId === null) {
      // Перемещаем в неопределенные элементы
      setTierList(prev => {
        const updated = {...prev};
        if (item.category_id) {
          oldCategoryItems = updated[item.category_id]?.filter(el => el.id !== item.id) || [];
          updated[item.category_id] = oldCategoryItems;
        }
        return updated;
      });

      setUnrankedElements(prev => {
        newCategoryItems = [...prev.filter(el => el.id !== item.id), updatedItem];
        return newCategoryItems;
      });
    } else {
      // Обычное перемещение между категориями
      setTierList(prev => {
        const updated = {...prev};
        
        // Удаляем из старой категории
        if (item.category_id) {
          oldCategoryItems = updated[item.category_id]?.filter(el => el.id !== item.id) || [];
          updated[item.category_id] = oldCategoryItems;
        }
        
        // Добавляем в новую категорию в конец
        newCategoryItems = [...(updated[categoryId] || []), updatedItem];
        updated[categoryId] = newCategoryItems;
        
        return updated;
      });

      // Удаляем из неопределенных элементов, если был там
      setUnrankedElements(prev => prev.filter(el => el.id !== item.id));
    }

    // Теперь сохраняем в БД асинхронно (не блокируем визуальное обновление)
    try {
      // Обновляем category_id в базе данных
      await updateTierListItem({
        id: item.id,
        patch: { category_id: categoryId }
      });

      // Сохраняем порядок для обеих категорий
      if (categoryId === null) {
        // Сохраняем порядок неопределенных элементов
        if (newCategoryItems.length > 0) {
          saveOrderToDatabase(null, newCategoryItems);
        }
      } else {
        // Сохраняем порядок новой категории
        if (newCategoryItems.length > 0) {
          saveOrderToDatabase(categoryId, newCategoryItems);
        }
      }

      // Сохраняем порядок старой категории, если элемент был в категории
      if (item.category_id && oldCategoryItems.length > 0) {
        saveOrderToDatabase(item.category_id, oldCategoryItems);
      }
    } catch (error) {
      console.error('Ошибка при перемещении элемента:', error.message);
    }
  };

  const onMove = (categoryId, updatedItems) => {
    // Обновляем визуальное состояние сразу
    if (categoryId === null) {
      setUnrankedElements(updatedItems);
    } else {
      setTierList(prev => ({
        ...prev,
        [categoryId]: updatedItems
      }));
    }
  };

  // Отдельная функция для сохранения порядка в базу данных с debounce
  const saveOrderToDatabase = async (categoryId, items) => {
    if (!items || items.length === 0) {
      console.warn('saveOrderToDatabase: пустой список элементов');
      return;
    }
    
    const categoryKey = categoryId !== null ? String(categoryId) : 'null';
    
    // Очищаем предыдущий таймаут для этой категории
    if (saveOrderTimeoutRef.current[categoryKey]) {
      clearTimeout(saveOrderTimeoutRef.current[categoryKey]);
    }
    
    // Создаем объект с парами id: order
    const orders = {};
    items.forEach((item, index) => {
      orders[item.id] = Number(index);
    });
    
    // Устанавливаем новый таймаут с debounce (300ms)
    saveOrderTimeoutRef.current[categoryKey] = setTimeout(async () => {
      try {
        console.log(`Сохранение порядка для категории ${categoryId}:`, orders);
        await updateOrderBatch(categoryId, orders);
        console.log(`Порядок для категории ${categoryId} успешно сохранен`);
        delete saveOrderTimeoutRef.current[categoryKey];
      } catch (error) {
        console.error('Ошибка обновления порядка:', error);
        delete saveOrderTimeoutRef.current[categoryKey];
      }
    }, 300);
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // Перемещаем все элементы категории в неопределенные
      const itemsToMove = tierList[categoryId] || [];
      
      await Promise.all([
        deleteCategory(categoryId),
        ...itemsToMove.map(item => 
          updateTierListItem({
            id: item.id,
            patch: { category_id: null, order: 0 }
          })
        )
      ]);

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      setUnrankedElements(prev => [...prev, ...itemsToMove.map(item => ({ ...item, category_id: null, order: 0 }))]);
      setTierList(prev => {
        const updated = {...prev};
        delete updated[categoryId];
        return updated;
      });
    } catch (error) {
      console.error('Ошибка удаления категории:', error.message);
    }
  };

  const handleMoveUp = async (categoryId) => {
    const index = categories.findIndex(cat => cat.id === categoryId);
    if (index > 0) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];

      // Обновляем order для всех категорий, начиная с новой позиции
      const updatePromises = newCategories.map((cat, idx) => 
        updateCategory({
          id: cat.id,
          patch: { order: idx }
        })
      );

      await Promise.all(updatePromises);
      clearCache('categories');

      setCategories(newCategories);
    }
  };

  const handleMoveDown = async (categoryId) => {
    const index = categories.findIndex(cat => cat.id === categoryId);
    if (index < categories.length - 1) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];

      // Обновляем order для всех категорий, начиная с новой позиции
      const updatePromises = newCategories.map((cat, idx) => 
        updateCategory({
          id: cat.id,
          patch: { order: idx }
        })
      );

      await Promise.all(updatePromises);
      clearCache('categories');

      setCategories(newCategories);
    }
  };

  const handleSaveCategory = async (updatedCategory) => {
    try {
      await updateCategory({
        id: updatedCategory.id,
        patch: { name: updatedCategory.name, color: updatedCategory.color, order: updatedCategory.order }
      });
      clearCache('categories');

      const updatedCategories = categories.map(cat => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      ).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setCategories(updatedCategories);
      setEditingCategory(null);
    } catch (error) {
      console.error('Ошибка обновления категории:', error.message);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <DragScrollHandler />
      <NavigationMenu />
      <div className="tier-list-container">
        <div className="header-section">
          <div className="left-controls">
            <CategoryManager onCategoryUpdate={setCategories} />
          </div>
        </div>
        
        <div className="tier-list">
          {categories.map((category) => (
            <TierListCategory
              key={category.id}
              category={category}
              items={tierList[category.id] || []}
              onDrop={handleDrop}
              onMove={onMove}
              onSaveOrder={saveOrderToDatabase}
              onDelete={handleDeleteCategory}
              onEdit={setEditingCategory}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
        
        <UnrankedElementsSection
          elements={unrankedElements}
          links={links}
          onDrop={handleDrop}
          onMove={onMove}
          onSaveOrder={saveOrderToDatabase}
        />
      </div>

      <CustomDragLayer />

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          categories={categories}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveCategory}
          onDelete={handleDeleteCategory}
        />
      )}
    </DndProvider>
  );
};

export default TierList;