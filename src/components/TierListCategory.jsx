import React from 'react';
import { useDrop } from 'react-dnd';
import DraggableImage from './DraggableImage';
import '../css/TierListCategory.css';

const TierListCategory = ({
  category,
  items,
  onDrop,
  onMove,
  onDelete,
  onEdit,
  onMoveUp,
  onMoveDown,
}) => {
  const [, drop] = useDrop({
    accept: 'image',
    drop: (item) => onDrop(item, category.id),
  });

  const moveItem = (fromIndex, toIndex) => {
    const updatedItems = [...items];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
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
        {items.map((item, index) => (
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