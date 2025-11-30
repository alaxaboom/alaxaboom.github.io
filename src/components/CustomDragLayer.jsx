import React from 'react';
import { useDragLayer } from 'react-dnd';
import '../css/CustomDragLayer.css';

const CustomDragLayer = () => {
  const {
    itemType,
    isDragging,
    item,
    currentOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || itemType !== 'image') {
    return null;
  }

  if (!currentOffset) {
    return null;
  }

  const { x, y } = currentOffset;

  return (
    <div className="custom-drag-layer">
      <div
        className="custom-drag-preview"
        style={{
          position: 'fixed',
          left: x,
          top: y,
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="drag-preview-image-wrapper">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt="Dragging"
              className="drag-preview-image"
            />
          ) : (
            <div className="drag-preview-placeholder">No Image</div>
          )}
          {item.text && (
            <div className="drag-preview-text">{item.text}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomDragLayer;

