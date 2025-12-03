import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/main.css';

const Main = () => {
  const navigate = useNavigate();
  const text = 'Добро пожаловать на мой сайт';
  const letters = text.split('');
  const totalLetters = letters.length;
  const arcAngle = 80;
  const radius = 800;

  const physicsConfig = {
    friction: 0.999,
    minThrowSpeed: 0.1,
  };

  const getInitialPosition = (index) => {
    const normalizedIndex = index / (totalLetters - 1);
    const angle = (normalizedIndex - 0.5) * arcAngle * (Math.PI / 180);
    const x = Math.sin(angle) * radius;
    const y = (1 - Math.cos(angle)) * radius;
    const rotation = angle * (180 / Math.PI);
    return { x, y, rotation };
  };

  const [letterStates, setLetterStates] = useState(() =>
    letters.map((_, index) => {
      const pos = getInitialPosition(index);
      return {
        x: pos.x,
        y: pos.y,
        vx: 0,
        vy: 0,
        isDragging: false,
        rotation: pos.rotation,
        wasMoved: false
      };
    })
  );

  const [showModal, setShowModal] = useState(false);

  const dragState = useRef({
    letterIndex: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocities: [],
    offsetX: 0,
    offsetY: 0,
    positions: []
  });

  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragState.current.letterIndex === null) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let mouseX = e.clientX - centerX;
      let mouseY = e.clientY - centerY;

      const letterX = mouseX - dragState.current.offsetX;
      const letterY = mouseY - dragState.current.offsetY;

      const maxX = rect.width / 2;
      const maxY = rect.height / 2;
      const letterSize = 60;

      const clampedX = Math.max(-maxX + letterSize / 2, Math.min(maxX - letterSize / 2, letterX));
      const clampedY = Math.max(-maxY + letterSize / 2, Math.min(maxY - letterSize / 2, letterY));

      const now = Date.now();

      if (!dragState.current.positions) {
        dragState.current.positions = [];
      }
      dragState.current.positions.push({ x: clampedX, y: clampedY, time: now });
      if (dragState.current.positions.length > 5) {
        dragState.current.positions.shift();
      }

      dragState.current.lastX = clampedX;
      dragState.current.lastY = clampedY;
      dragState.current.lastTime = now;

      setLetterStates(prev => {
        const newStates = [...prev];
        const index = dragState.current.letterIndex;
        if (index !== null) {
          newStates[index] = {
            ...newStates[index],
            x: clampedX,
            y: clampedY,
            isDragging: true
          };
        }
        return newStates;
      });
    };

    const handleMouseUp = () => {
      if (dragState.current.letterIndex === null) return;

      let vx = 0;
      let vy = 0;
      const baseSpeed = 15;

      if (dragState.current.positions && dragState.current.positions.length >= 2) {
        const last = dragState.current.positions[dragState.current.positions.length - 1];
        const prev = dragState.current.positions[dragState.current.positions.length - 2];
        const dt = last.time - prev.time;
        
        if (dt > 0 && dt < 200) {
          const fps = 60;
          const frameTime = 1000 / fps;
          const dx = last.x - prev.x;
          const dy = last.y - prev.y;
          vx = (dx / dt) * frameTime;
          vy = (dy / dt) * frameTime;
        }
      }

      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed < 1) {
        vx = baseSpeed;
        vy = baseSpeed;
      } else {
        const directionX = vx / speed;
        const directionY = vy / speed;
        vx = directionX * (speed + baseSpeed);
        vy = directionY * (speed + baseSpeed);
      }

      setLetterStates(prev => {
        const newStates = [...prev];
        const index = dragState.current.letterIndex;
        if (index !== null) {
          newStates[index] = {
            ...newStates[index],
            vx: vx,
            vy: vy,
            isDragging: false,
            wasMoved: true
          };
        }
        return newStates;
      });

      dragState.current.letterIndex = null;
      dragState.current.velocities = [];
      dragState.current.positions = [];
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    let animationId;
    const friction = physicsConfig.friction;
    const minSpeed = physicsConfig.minThrowSpeed;
    
    const animate = () => {
      setLetterStates(prev => {
        const container = containerRef.current;
        if (!container) return prev;

        const rect = container.getBoundingClientRect();
        const maxX = rect.width / 2;
        const maxY = rect.height / 2;
        const letterSize = 60;

        return prev.map((state, index) => {
          if (state.isDragging) return state;

          let { x, y, vx, vy } = state;

          if (state.wasMoved && (Math.abs(vx) > 0 || Math.abs(vy) > 0)) {
            x += vx;
            y += vy;
            
            vx *= friction;
            vy *= friction;
            
            if (Math.abs(vx) < minSpeed) vx = 0;
            if (Math.abs(vy) < minSpeed) vy = 0;
          }

          const bounceDamping = 0.8;
          
          if (x < -maxX + letterSize / 2) {
            x = -maxX + letterSize / 2;
            vx = Math.abs(vx) * bounceDamping;
          } else if (x > maxX - letterSize / 2) {
            x = maxX - letterSize / 2;
            vx = -Math.abs(vx) * bounceDamping;
          }

          if (y < -maxY + letterSize / 2) {
            y = -maxY + letterSize / 2;
            vy = Math.abs(vy) * bounceDamping;
          } else if (y > maxY - letterSize / 2) {
            y = maxY - letterSize / 2;
            vy = -Math.abs(vy) * bounceDamping;
          }

          return { ...state, x, y, vx, vy };
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleMouseDown = (index, e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const currentState = letterStates[index];
    const offsetX = mouseX - currentState.x;
    const offsetY = mouseY - currentState.y;

    dragState.current = {
      letterIndex: index,
      startX: mouseX,
      startY: mouseY,
      lastX: currentState.x,
      lastY: currentState.y,
      lastTime: Date.now(),
      velocities: [],
      offsetX: offsetX,
      offsetY: offsetY,
      positions: [{ x: currentState.x, y: currentState.y, time: Date.now() }]
    };

    setLetterStates(prev => {
      const newStates = [...prev];
      newStates[index] = {
        ...newStates[index],
        isDragging: true,
        vx: 0,
        vy: 0
      };
      return newStates;
    });
  };

  const handleContextMenu = (index, e) => {
    if (letters[index] === 'й') {
      e.preventDefault();
      setShowModal(true);
    }
  };

  return (
    <div className="main-container">
      <div className="welcome-text" ref={containerRef}>
        {letters.map((letter, index) => {
          const state = letterStates[index];
          const isMoving = state.isDragging || state.wasMoved || Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01;
          
          return (
            <span
              key={index}
              className={`letter ${isMoving ? 'dragging' : ''} ${state.wasMoved ? 'moved' : ''}`}
              style={{ 
                '--index': index,
                '--x': `${state.x}px`,
                '--y': `${state.y}px`,
                '--rotation': `${state.rotation}deg`
              }}
              onMouseDown={(e) => handleMouseDown(index, e)}
              onContextMenu={(e) => handleContextMenu(index, e)}
            >
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          );
        })}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-button"
              onClick={() => navigate('/altMain')}
            >
              特定金鑰
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Main;