import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

const CategoryManager = ({ onCategoryUpdate }) => {
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#FFFFFF');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('*');

        if (error) {
            console.error('Ошибка загрузки категорий:', error.message);
            return;
        }

        setCategories(data);
        onCategoryUpdate(data); // Обновляем категории в родительском компоненте
    };

    const addCategory = async () => {
        if (!newCategoryName.trim()) {
          alert('Пожалуйста, введите название категории');
          return;
        }
      
        try {
          // Определяем порядок новой категории
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
          fetchCategories(); // Обновляем список категорий
        } catch (error) {
          console.error('Ошибка добавления категории:', error.message);
        }
      };

    const deleteCategory = async (id) => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Ошибка удаления категории:', error.message);
            return;
        }

        setCategories(categories.filter(category => category.id !== id));
        fetchCategories();
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