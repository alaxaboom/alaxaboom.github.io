import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabase';

const CategoryManager = ({ onCategoryUpdate }) => {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FFFFFF');

  // Мемоизируем fetchCategories
  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*');

    if (error) {
      console.error('Ошибка загрузки категорий:', error.message);
      return;
    }

    setCategories(data);
    onCategoryUpdate(data);
  }, [onCategoryUpdate]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Пожалуйста, введите название категории');
      return;
    }

    try {
      const order = categories.length;

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName, color: newCategoryColor, order }])
        .select();

      if (error) {
        throw error;
      }

      setCategories([...categories, data[0]]);
      setNewCategoryName('');
      setNewCategoryColor('#FFFFFF');
      fetchCategories();
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