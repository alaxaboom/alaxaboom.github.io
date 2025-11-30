import React, { useState, useEffect, useCallback } from 'react';
import { fetchCategories, createCategory } from '../api/categoryService';

const CategoryManager = ({ onCategoryUpdate }) => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FFFFFF');

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
      onCategoryUpdate(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error.message);
    }
  }, [onCategoryUpdate]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Пожалуйста, введите название категории');
      return;
    }

    try {
      const order = categories.length;

      const newCategory = await createCategory({
        method: 'create',
        name: newCategoryName,
        color: newCategoryColor,
        order
      });

      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setNewCategoryColor('#FFFFFF');
      loadCategories();
    } catch (error) {
      console.error('Ошибка добавления категории:', error.message);
    }
  };

  return (
    <div>
      <h2>Управление категориями</h2>
      <div>
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Название категории"
        />
        <input
          type="color"
          value={newCategoryColor}
          onChange={(e) => setNewCategoryColor(e.target.value)}
        />
        <button onClick={addCategory}>Добавить категорию</button>
      </div>
    </div>
  );
};

export default CategoryManager;