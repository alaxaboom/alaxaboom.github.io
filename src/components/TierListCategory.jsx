import React, { useState, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import DraggableImage from './DraggableImage';
import '../css/TierListCategory.css';

const TierListCategory = ({
  category,
  items,
  onDrop,
  onMove,
  onSaveOrder,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
}) => {
  const [currentItems, setCurrentItems] = useState(items);
  const currentItemsRef = useRef(items);
  const saveOrderTimeoutRef = useRef(null);

  useEffect(() => {
    setCurrentItems(items);
    currentItemsRef.current = items;
  }, [items]);

  const [, drop] = useDrop({
    accept: 'image',
    drop: (item, monitor) => {
      console.log('Drop в категории:', category.id, 'item:', item);
      if (item.category_id === category.id) {
        // Drop внутри той же категории - сохраняем порядок через небольшую задержку
        // чтобы убедиться, что все обновления состояния завершены
        if (saveOrderTimeoutRef.current) {
          clearTimeout(saveOrderTimeoutRef.current);
        }
        saveOrderTimeoutRef.current = setTimeout(() => {
          const itemsToSave = currentItemsRef.current;
          console.log('Drop внутри категории, сохраняем порядок:', itemsToSave.map((it, idx) => ({ id: it.id, order: idx })));
          if (onSaveOrder && itemsToSave.length > 0) {
            onSaveOrder(category.id, itemsToSave);
          }
        }, 100);
      } else {
        // Drop из другой категории
        console.log('Drop из другой категории');
        onDrop(item, category.id);
      }
    },
  });

  const moveItem = (fromIndex, toIndex) => {
    const updatedItems = [...currentItems];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    setCurrentItems(updatedItems);
    currentItemsRef.current = updatedItems; // Обновляем ref синхронно
    onMove(category.id, updatedItems);
  };

  return (
    <div ref={drop} className="tier-category" style={{ backgroundColor: category.color }}>
      <div className="category-header">
        <h2 className="category-text">{category.name}</h2>
        <div className="category-actions">
          <button className="edit-button" onClick={() => onEdit(category)}>✏️</button>
          <button className="delete-button" onClick={() => onDelete(category.id)}>🗑️</button>
          <button className="move-button" onClick={() => onMoveUp(category.id)}>⬆️</button>
          <button className="move-button" onClick={() => onMoveDown(category.id)}>⬇️</button>
        </div>
      </div>
      <div className="tier-items">
        {currentItems.map((item, index) => (
          <DraggableImage
            key={item.id}
            id={item.id}
            imageUrl={item.image_url}
            text={item.text}
            index={index}
            moveItem={moveItem}
            category_id={item.category_id}
          />
        ))}
      </div>
    </div>
  );
};

export default TierListCategory;