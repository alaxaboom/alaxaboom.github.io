import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TierListCategory from './components/TierListCategory';
import DraggableImage from './components/DraggableImage';
import CategoryManager from './components/CategoryManager';
import EditCategoryModal from './components/EditCategoryModal';
import TrashBin from './components/TrashBin';
import supabase from './supabase';
import './css/TierList.css';

const TierList = () => {
  const [unrankedElements, setUnrankedElements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tierList, setTierList] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setCategories(data);
      initializeTierList(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error.message);
    }
  }, []);

  const fetchAllElements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tierListItems')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;

      const categorizedElements = {};
      categories.forEach(category => {
        categorizedElements[category.id] = data.filter(item => item.category_id === category.id);
      });

      setTierList(categorizedElements);
      setUnrankedElements(data.filter(item => !item.category_id));
    } catch (error) {
      console.error('Ошибка загрузки элементов:', error.message);
    }
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchAllElements();
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
      // Если категория null - перемещаем в неопределенные элементы
      if (categoryId === null) {
        await supabase
          .from('tierListItems')
          .update({ category_id: null })
          .eq('id', item.id);

        setTierList(prev => {
          const updated = {...prev};
          if (item.category_id) {
            updated[item.category_id] = updated[item.category_id].filter(el => el.id !== item.id);
          }
          return updated;
        });

        setUnrankedElements(prev => [...prev, item]);
        return;
      }

      // Обычное перемещение между категориями
      await supabase
        .from('tierListItems')
        .update({ category_id: categoryId })
        .eq('id', item.id);

      setTierList(prev => {
        const updated = {...prev};
        
        // Удаляем из старой категории
        if (item.category_id) {
          updated[item.category_id] = updated[item.category_id].filter(el => el.id !== item.id);
        }
        
        // Добавляем в новую категорию
        updated[categoryId] = [...(updated[categoryId] || []), item];
        
        return updated;
      });

      // Удаляем из неопределенных элементов, если был там
      setUnrankedElements(prev => prev.filter(el => el.id !== item.id));
    } catch (error) {
      console.error('Ошибка при перемещении элемента:', error.message);
    }
  };

  const onMove = (categoryId, updatedItems) => {
    setTierList(prev => ({
      ...prev,
      [categoryId]: updatedItems
    }));

    updatedItems.forEach(async (item, index) => {
      await supabase
        .from('tierListItems')
        .update({ order: index })
        .eq('id', item.id);
    });
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await supabase
        .from('tierListItems')
        .delete()
        .eq('id', itemId);

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
        supabase
          .from('categories')
          .delete()
          .eq('id', categoryId),
        ...itemsToMove.map(item => 
          supabase
            .from('tierListItems')
            .update({ category_id: null })
            .eq('id', item.id)
        )
      ]);

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      setUnrankedElements(prev => [...prev, ...itemsToMove]);
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
        supabase
          .from('categories')
          .update({ order: index })
          .eq('id', newCategories[index].id),
        supabase
          .from('categories')
          .update({ order: index - 1 })
          .eq('id', newCategories[index - 1].id)
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
        supabase
          .from('categories')
          .update({ order: index })
          .eq('id', newCategories[index].id),
        supabase
          .from('categories')
          .update({ order: index + 1 })
          .eq('id', newCategories[index + 1].id)
      ]);

      setCategories(newCategories);
    }
  };

  const handleSaveCategory = async (updatedCategory) => {
    try {
      await supabase
        .from('categories')
        .update({ name: updatedCategory.name, color: updatedCategory.color })
        .eq('id', updatedCategory.id);

      setCategories(prev =>
        prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat)
      );
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
              onDelete={handleDeleteCategory}
              onEdit={setEditingCategory}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>
        
        <div className="unranked-elements">
          <h2>Неопределенные элементы</h2>
          <div className="unranked-items-container">
            {unrankedElements.map((element) => (
              <DraggableImage
                key={element.id}
                id={element.id}
                imageUrl={element.image_url}
                text={element.text}
                category_id={null}
              />
            ))}
          </div>
        </div>
      </div>

      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={handleSaveCategory}
        />
      )}
    </DndProvider>
  );
};

export default TierList;