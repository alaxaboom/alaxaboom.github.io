import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import '../css/DraggableImage.css';

const DraggableImage = ({ id, imageUrl, text, index, moveItem,category_id }) => {
    const ref = useRef(null);

    const [, drop] = useDrop({
        accept: 'image',
        hover: (item, monitor) => {
            if (!ref.current) return;

            const dragIndex = item.index;
            const hoverIndex = index;

            // Не делать ничего, если элемент находится над собой
            if (dragIndex === hoverIndex) return;

            // Определяем прямоугольник элемента
            const hoverBoundingRect = ref.current.getBoundingClientRect();
            const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientX = clientOffset.x - hoverBoundingRect.left;

            // Перемещаем элемент только если курсор пересек половину ширины элемента
            if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
            if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

            // Вызываем moveItem для обновления порядка
            moveItem(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: 'image',
        item: { id, index,category_id },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <div ref={ref} className="tier-image-container" style={{ opacity: isDragging ? 0.5 : 1 }}>
            <img src={imageUrl} alt="Tier item" className="tier-image" />
            <div className="tooltip">{text}</div>
        </div>
    );
};

export default DraggableImage;