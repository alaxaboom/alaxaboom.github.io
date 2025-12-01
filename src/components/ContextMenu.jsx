import React, { useEffect, useRef } from 'react';
import '../css/ContextMenu.css';

const ContextMenu = ({ x, y, onClose, onOpenLink, url }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleOpenLink = () => {
    if (url) {
      onOpenLink(url);
    }
    onClose();
  };

  if (!url) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="context-menu-item" onClick={handleOpenLink}>
        Перейти по ссылке
      </div>
    </div>
  );
};

export default ContextMenu;

