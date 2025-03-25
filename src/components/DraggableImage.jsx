import React, { useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import '../css/DraggableImage.css';

const DraggableImage = ({ id, imageUrl, text, index, moveItem, category_id }) => {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'image',
    item: () => {
      setIsDraggingState(true);
      return { id, index, category_id, imageUrl, text };
    },
    end: () => setIsDraggingState(false),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'image',
    hover: (item, monitor) => {
      if (!ref.current || !moveItem) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div 
      ref={ref}
      className={`draggable-image-container ${isDragging ? 'dragging' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ opacity: isDragging ? 0.8 : 1 }}
    >
      <div className="image-wrapper">
        <img 
          src={imageUrl} 
          alt="Tier item" 
          className="draggable-image" 
          draggable="false"
        />
        {(isHovered || isDraggingState) && text && (
          <div className="image-text-overlay">
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraggableImage;