import React, { useState } from 'react';
import '../css/EditCategoryModal.css';

const PREDEFINED_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AED6F1'
];

const EditCategoryModal = ({ category, onClose, onSave, onDelete, categories }) => {
  const [name, setName] = useState(category.name);
  const [selectedColor, setSelectedColor] = useState(category.color);

  const handleSave = () => {
    onSave({ ...category, name, color: selectedColor });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      onDelete(category.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Редактировать категорию</h2>
        <div className="form-group">
          <label>Название:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="category-name-input"
          />
        </div>
        <div className="form-group">
          <label>Цвет:</label>
          <div className="color-picker">
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
        </div>
        <div className="modal-actions">
          <button onClick={handleSave} className="save-button">Сохранить</button>
          <button onClick={handleDelete} className="delete-button">Удалить</button>
          <button onClick={onClose} className="cancel-button">Отмена</button>
        </div>
      </div>
    </div>
  );
};

export default EditCategoryModal;