import React, { useState, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import DraggableImage from './DraggableImage';
import '../css/TierList.css';

const UnrankedElementsSection = ({ elements, links, onDrop, onMove, onSaveOrder }) => {
  const [currentElements, setCurrentElements] = useState(elements);
  const currentElementsRef = useRef(elements);
  const saveOrderTimeoutRef = useRef(null);

  useEffect(() => {
    setCurrentElements(elements);
    currentElementsRef.current = elements;
  }, [elements]);

  const [, drop] = useDrop({
    accept: 'image',
    drop: (item) => {
      if (item.category_id === null) {
        // Drop внутри той же категории - сохраняем порядок через небольшую задержку
        if (saveOrderTimeoutRef.current) {
          clearTimeout(saveOrderTimeoutRef.current);
        }
        saveOrderTimeoutRef.current = setTimeout(() => {
          const elementsToSave = currentElementsRef.current;
          console.log('Drop в unranked, сохраняем порядок:', elementsToSave.map((it, idx) => ({ id: it.id, order: idx })));
          if (onSaveOrder && elementsToSave.length > 0) {
            onSaveOrder(null, elementsToSave);
          }
        }, 100);
      } else {
        // Drop из другой категории
        onDrop(item, null);
      }
    },
  });

  const moveItem = (fromIndex, toIndex) => {
    const updatedItems = [...currentElements];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    setCurrentElements(updatedItems);
    currentElementsRef.current = updatedItems; // Обновляем ref синхронно
    onMove(null, updatedItems);
  };

  return (
    <div className="unranked-elements">
      <h2>Unranked Elements</h2>
      <div ref={drop} className="unranked-items-container">
        {currentElements.map((element, index) => (
          <DraggableImage
            key={element.id}
            id={element.id}
            imageUrl={element.image_url}
            text={element.text}
            url={element.url}
            index={index}
            moveItem={moveItem}
            category_id={null}
          />
        ))}
      </div>
    </div>
  );
};

export default UnrankedElementsSection;

