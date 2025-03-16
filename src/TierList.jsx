import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ImageUpload from './components/ImageUpload';
import TierListCategory from './components/TierListCategory';
import DraggableImage from './components/DraggableImage';
import CategoryManager from './components/CategoryManager';
import EditCategoryModal from './components/EditCategoryModal';
import supabase from './supabase';
import './css/TierList.css';

const TierList = () => {
  const [unrankedElements, setUnrankedElements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tierList, setTierList] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchAllElements();
  }, []);
  
  useEffect(() => {
    if (categories.length > 0) {
      fetchAllElements();
    }
  }, [categories]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        throw error;
      }

      
      setCategories(data);
   
      initializeTierList(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error.message);
    }
  };

  const initializeTierList = (categories) => {
    const initialTierList = {};
    categories.forEach(category => {
      initialTierList[category.id] = [];
    });
    setTierList(initialTierList);
  };

  const fetchAllElements = async () => {
    try {
      const { data, error } = await supabase
        .from('tierListItems')
        .select('*')
        .order('order', { ascending: true });
  
      if (error) {
        throw error;
      }
  
      console.log("Элементы загружены:", data);
  
      const categorizedElements = {};
      categories.forEach(category => {
        categorizedElements[category.id] = data.filter(item => item.category_id === category.id);
      });
  
      setTierList(categorizedElements);
  
      // Элементы без категории
      const unranked = data.filter(item => !item.category_id);
      setUnrankedElements(unranked);
    } catch (error) {
      console.error('Ошибка загрузки элементов:', error.message);
    }
  };

  const handleImageUpload = (imageUrl) => {
    setUnrankedElements((prevElements) => [...prevElements, { id: Date.now(), image_url: imageUrl, text: '' }]);
  };

  const handleDrop = async (item, categoryId) => {
    try {
      // Обновляем категорию элемента в базе данных
      const { error } = await supabase
        .from('tierListItems')
        .update({ category_id: categoryId })
        .eq('id', item.id);
  
      if (error) {
        throw error;
      }
  
      // Обновляем состояние tierList
      setTierList((prevTierList) => {
        const updatedTierList = { ...prevTierList };
  
        const oldCategory = prevTierList[item.category_id];
        const movedItem = oldCategory ? oldCategory.find((el) => el.id === item.id) : null;
  
        // Если элемент не найден или перемещается в ту же категорию, возвращаем текущее состояние
        if (!movedItem || item.category_id === categoryId) {
          return prevTierList;
        }
  
        // Удаляем элемент из старой категории (если она существует)
        const updatedOldCategory = oldCategory ? oldCategory.filter((el) => el.id !== item.id) : [];
  
        // Добавляем элемент в новую категорию (если он существует)
        const updatedNewCategory = prevTierList[categoryId] ? [...prevTierList[categoryId], movedItem] : [movedItem];
  
        // Обновляем category_id элемента
        movedItem.category_id = categoryId;
  
        return {
          ...prevTierList,
          [item.category_id]: updatedOldCategory, // Обновляем старую категорию
          [categoryId]: updatedNewCategory, // Обновляем новую категорию
        };
      });
  
      // Если элемент был в unrankedElements, удаляем его оттуда
      setUnrankedElements((prevElements) =>
        prevElements.filter((el) => el.id !== item.id)
      );
    } catch (error) {
      console.error('Ошибка при перемещении элемента:', error.message);
    }
  };
  const onMove = (categoryId, updatedItems) => {
    setTierList((prevTierList) => ({
      ...prevTierList,
      [categoryId]: updatedItems,
    }));

    updatedItems.forEach(async (item, index) => {
      const { error } = await supabase
        .from('tierListItems')
        .update({ order: index })
        .eq('id', item.id);

      if (error) {
        console.error('Ошибка обновления порядка:', error.message);
      }
    });
  };

  const handleDeleteCategory = async (categoryId) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Ошибка удаления категории:', error.message);
      return;
    }

    setCategories((prevCategories) => prevCategories.filter((cat) => cat.id !== categoryId));
    fetchAllElements();
  };

  const handleMoveUp = async (categoryId) => {
    const index = categories.findIndex((cat) => cat.id === categoryId);
    if (index > 0) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index - 1]] = [newCategories[index - 1], newCategories[index]];
  
      // Обновляем порядок в базе данных
      await updateCategoryOrder(newCategories[index].id, index);
      await updateCategoryOrder(newCategories[index - 1].id, index - 1);
  
      setCategories(newCategories);
    }
  };
  
  const handleMoveDown = async (categoryId) => {
    const index = categories.findIndex((cat) => cat.id === categoryId);
    if (index < categories.length - 1) {
      const newCategories = [...categories];
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
  
      // Обновляем порядок в базе данных
      await updateCategoryOrder(newCategories[index].id, index);
      await updateCategoryOrder(newCategories[index + 1].id, index + 1);
  
      setCategories(newCategories);
    }
  };
  
  const updateCategoryOrder = async (categoryId, order) => {
    const { error } = await supabase
      .from('categories')
      .update({ order })
      .eq('id', categoryId);
  
    if (error) {
      console.error('Ошибка обновления порядка категории:', error.message);
    }
  };

  const handleSaveCategory = async (updatedCategory) => {
    const { error } = await supabase
      .from('categories')
      .update({ name: updatedCategory.name, color: updatedCategory.color })
      .eq('id', updatedCategory.id);

    if (error) {
      console.error('Ошибка обновления категории:', error.message);
      return;
    }

    setCategories((prevCategories) =>
      prevCategories.map((cat) =>
        cat.id === updatedCategory.id ? updatedCategory : cat
      )
    );
    setEditingCategory(null);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="tier-list-container">
        <h1>Создайте свой тирлист</h1>
        <CategoryManager onCategoryUpdate={setCategories} />
        <ImageUpload onImageUpload={handleImageUpload} />
        <div className="tier-list">
            {categories.map((category) => {
            const categoryItems = tierList[category.id] || []; // Элементы для текущей категории
            console.log("Категории загружены:", categories);
            return (
            <TierListCategory
                key={category.id}
                category={category}
                items={categoryItems} // Передаем элементы категории
                onDrop={handleDrop}
                onMove={onMove}
                onDelete={handleDeleteCategory}
                onEdit={setEditingCategory}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
            />
            );
            })}
        </div>
        <div className="unranked-elements">
          <h2>Неопределенные элементы</h2>
          {unrankedElements.map((element) => (
            <DraggableImage key={element.id} id={element.id} imageUrl={element.image_url} text={element.text} />
          ))}
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