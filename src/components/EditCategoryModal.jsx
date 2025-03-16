import React, { useState } from 'react';
import '../css/EditCategoryModal.css';

const EditCategoryModal = ({ category, onClose, onSave }) => {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);

  const handleSave = () => {
    onSave({ ...category, name, color });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Редактировать категорию</h2>
        <div className="form-group">
          <label>Название:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Цвет:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button onClick={handleSave}>Сохранить</button>
          <button onClick={onClose}>Отмена</button>
        </div>
      </div>
    </div>
  );
};

export default EditCategoryModal;