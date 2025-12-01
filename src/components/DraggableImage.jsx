import React, { useRef, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import ContextMenu from './ContextMenu';
import '../css/DraggableImage.css';

const DraggableImage = ({ id, imageUrl, text, index, moveItem, category_id, url }) => {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const [{ isDragging }, drag, preview] = useDrag({
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

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const [, drop] = useDrop({
    accept: 'image',
    hover: (item, monitor) => {
      if (!ref.current || !moveItem) return;
      
      // Проверяем, что элемент из той же категории
      if (item.category_id !== category_id) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (url) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleOpenLink = (linkUrl) => {
    if (linkUrl) {
      window.open(linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div 
        ref={ref}
        className={`draggable-image-container ${isDragging ? 'dragging' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={handleContextMenu}
        style={{ opacity: isDragging ? 0 : 1 }}
      >
      <div className="image-wrapper">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Tier item" 
            className="draggable-image" 
            draggable="false"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="draggable-image-placeholder">
            No Image
          </div>
        )}
        {(isHovered || isDraggingState) && text && (
          <div className="image-text-overlay">
            {text}
          </div>
        )}
      </div>
    </div>
    {contextMenu && (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        url={url}
        onClose={() => setContextMenu(null)}
        onOpenLink={handleOpenLink}
      />
    )}
    </>
  );
};

export default DraggableImage;