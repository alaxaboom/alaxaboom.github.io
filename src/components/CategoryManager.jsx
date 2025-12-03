import React, { useState, useEffect, useCallback } from 'react';
import { fetchCategories, createCategory } from '../api/categoryService';
import '../css/CategoryManager.css';

const PREDEFINED_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AED6F1'
];

const CategoryManager = ({ onCategoryUpdate }) => {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories(false);
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
        color: selectedColor,
        order
      });

      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setSelectedColor(PREDEFINED_COLORS[0]);
      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.error('Ошибка добавления категории:', error.message);
    }
  };

  return (
    <>
      <button className="add-category-button" onClick={() => setShowModal(true)}>
        <span className="plus-icon">+</span>
      </button>
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Добавить категорию</h3>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название категории"
              className="category-name-input"
            />
            <div className="color-picker">
              <p>Выберите цвет:</p>
              <div className="color-options">
                {PREDEFINED_COLORS.map((color, index) => (
                  <button
                    key={index}
                    className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={addCategory} className="save-button">Сохранить</button>
              <button onClick={() => setShowModal(false)} className="cancel-button">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryManager;