// TrashBin.js
import React from 'react';
import { useDrop } from 'react-dnd';
import '../css/TrashBin.css';

const TrashBin = ({ onDrop }) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'image',
    drop: (item) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div 
      ref={drop} 
      className={`trash-bin ${isOver ? 'active' : ''}`}
      title="Перетащите сюда для удаления"
    >
      🗑️
    </div>
  );
};

export default TrashBin;