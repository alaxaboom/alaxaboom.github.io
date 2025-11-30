import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TierListCategory from './components/TierListCategory';
import UnrankedElementsSection from './components/UnrankedElementsSection';
import CategoryManager from './components/CategoryManager';
import EditCategoryModal from './components/EditCategoryModal';
import TrashBin from './components/TrashBin';
import CustomDragLayer from './components/CustomDragLayer';
import { fetchCategories, updateCategory, deleteCategory } from './api/categoryService';
import { fetchTierListItems, updateTierListItem, deleteTierListItem, createTierListItem } from './api/tierListItemService';
import { fetchLinks } from './api/linkService';
import { fetchLinkPreview } from './utils/linkPreviewService';
import './css/TierList.css';

const TierList = () => {
  const [unrankedElements, setUnrankedElements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tierList, setTierList] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [links, setLinks] = useState([]);
  const categoriesInitialized = useRef(false);
  const lastCategoriesLength = useRef(0);

  const fetchAllElements = useCallback(async (categoriesToUse) => {
    try {
      const linksData = await fetchLinks();
      setLinks(linksData);

      const eligibleLinks = linksData.filter(link => link.category !== 'not_passed');
      
      let items = await fetchTierListItems();
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
        items = await fetchTierListItems();
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
              imageUrl = previewData.image || '';
              if (previewData.text && previewData.text !== link.url) {
                text = previewData.text;
              }
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

      // Логируем загруженные элементы с их order
      console.log('Загруженные элементы из БД:', itemsWithLinkData.map(item => ({ 
        id: item.id, 
        category_id: item.category_id, 
        order: item.order 
      })));

      const categorizedElements = {};
      categoriesToUse.forEach(category => {
        const categoryItems = itemsWithLinkData
          .filter(item => item.category_id === category.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        console.log(`Элементы категории ${category.id} после сортировки:`, 
          categoryItems.map(item => ({ id: item.id, order: item.order })));
        
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
    if (categories.length > 0 && categories.length !== lastCategoriesLength.current) {
      lastCategoriesLength.current = categories.length;
      if (!categoriesInitialized.current) {
        initializeTierList(categories);
        categoriesInitialized.current = true;
      }
      fetchAllElements(categories);
    }
  }, [categories, fetchAllElements]);

  const initializeTierList = (categories) => {
    const initialTierList = {};
    categories.forEach(category => {
      initialTierList[category.id] = [];
    });
    setTierList(initialTierList);
  };


  const handleDrop = async (item, categoryId) => {
    try {
      // Обновляем category_id в базе данных
      await updateTierListItem({
        id: item.id,
        patch: { category_id: categoryId }
      });

      const updatedItem = { ...item, category_id: categoryId };

      if (categoryId === null) {
        // Перемещаем в неопределенные элементы
        setTierList(prev => {
          const updated = {...prev};
          if (item.category_id) {
            updated[item.category_id] = updated[item.category_id].filter(el => el.id !== item.id);
            // Сохраняем порядок старой категории
            saveOrderToDatabase(item.category_id, updated[item.category_id]);
          }
          return updated;
        });

        setUnrankedElements(prev => {
          const updated = [...prev.filter(el => el.id !== item.id), updatedItem];
          // Сохраняем порядок в базу данных
          saveOrderToDatabase(null, updated);
          return updated;
        });
      } else {
        // Обычное перемещение между категориями
        setTierList(prev => {
          const updated = {...prev};
          
          // Удаляем из старой категории
          if (item.category_id) {
            updated[item.category_id] = updated[item.category_id].filter(el => el.id !== item.id);
            // Сохраняем порядок старой категории
            saveOrderToDatabase(item.category_id, updated[item.category_id]);
          }
          
          // Добавляем в новую категорию
          updated[categoryId] = [...(updated[categoryId] || []), updatedItem];
          // Сохраняем порядок новой категории
          saveOrderToDatabase(categoryId, updated[categoryId]);
          
          return updated;
        });

        // Удаляем из неопределенных элементов, если был там
        setUnrankedElements(prev => {
          const updated = prev.filter(el => el.id !== item.id);
          // Сохраняем порядок неопределенных элементов
          if (updated.length > 0) {
            saveOrderToDatabase(null, updated);
          }
          return updated;
        });
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

  // Отдельная функция для сохранения порядка в базу данных
  const saveOrderToDatabase = async (categoryId, items) => {
    if (!items || items.length === 0) {
      console.warn('saveOrderToDatabase: пустой список элементов');
      return;
    }
    
    console.log(`Сохранение порядка для категории ${categoryId}:`, items.map((item, idx) => ({ id: item.id, order: idx })));
    
    try {
      // Обновляем порядок последовательно, чтобы избежать race conditions
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        try {
          const result = await updateTierListItem({
            id: item.id,
            patch: { order: Number(index) } // Убеждаемся, что order - число
          });
          console.log(`Успешно обновлен порядок элемента ${item.id} на ${index}`);
          
          // Небольшая задержка между обновлениями для стабильности
          if (index < items.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          // Если ошибка "not found", это не критично - элемент мог быть удален
          if (error.message && error.message.includes('not found')) {
            console.warn(`Элемент ${item.id} не найден в базе данных:`, error.message);
          } else {
            // Для других ошибок логируем
            console.error(`Ошибка обновления порядка для элемента ${item.id}:`, error);
          }
        }
      }
      
      console.log(`Порядок для категории ${categoryId} успешно сохранен`);
    } catch (error) {
      console.error('Ошибка обновления порядка:', error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteTierListItem(itemId);

      setTierList(prev => {
        const updated = {...prev};
        for (const categoryId in updated) {
          updated[categoryId] = updated[categoryId].filter(item => item.id !== itemId);
        }
        return updated;
      });

      setUnrankedElements(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Ошибка удаления элемента:', error.message);
    }
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

      await Promise.all([
        updateCategory({
          id: newCategories[index].id,
          patch: { order: index }
        }),
        updateCategory({
          id: newCategories[index - 1].id,
          patch: { order: index - 1 }
        })
      ]);

      setCategories(newCategories);
    }
  };

  const handleMoveDown = async (categoryId) => {
    const index = categories.findIndex(cat => cat.id === categoryId);
    if (index < categories.length - 1) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];

      await Promise.all([
        updateCategory({
          id: newCategories[index].id,
          patch: { order: index }
        }),
        updateCategory({
          id: newCategories[index + 1].id,
          patch: { order: index + 1 }
        })
      ]);

      setCategories(newCategories);
    }
  };

  const handleSaveCategory = async (updatedCategory) => {
    try {
      await updateCategory({
        id: updatedCategory.id,
        patch: { name: updatedCategory.name, color: updatedCategory.color, order: updatedCategory.order }
      });

      const updatedCategories = categories.map(cat => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      ).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setCategories(updatedCategories);
      setEditingCategory(null);
    } catch (error) {
      console.error('Ошибка обновления категории:', error.message);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="tier-list-container">
        <h1>Тирлист</h1>
        <div className="header-section">
          <CategoryManager onCategoryUpdate={setCategories} />
          <TrashBin onDrop={handleDeleteItem} />
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
        />
      )}
    </DndProvider>
  );
};

export default TierList;