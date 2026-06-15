import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function EmojiBlast() {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleBlast = (e) => {
      const container = containerRef.current;
      if (!container) return;

      const { emotion } = e.detail || { emotion: 'joy' };
      
      const emojiMap = {
        joy: ['😊', '✨', '🎉', '💖', '🌟'],
        love: ['❤️', '💖', '🥰', '💕', '🌸'],
        trust: ['🤝', '💚', '✨', '🌸'],
        surprise: ['😲', '⚡', '✨', '🌌'],
        optimism: ['🌟', '🌈', '🚀', '✨'],
        sadness: ['😢', '🌧️', '💧', '🤍'],
        fear: ['😨', '🍃', '🤍', '🧘'],
        anger: ['🔥', '💥', '🌋', '⚡'],
        disgust: ['🤢', '🍃', '💧'],
        anticipation: ['🤔', '🎯', '🔮', '✨'],
        pessimism: ['😞', '🌧️', '🤍'],
        neutral: ['😐', '✨', '🧘']
      };

      const list = emojiMap[emotion] || ['✨', '💖', '🌟'];
      
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;

      // Spawn 24 emoji particles
      for (let i = 0; i < 24; i++) {
        const el = document.createElement('div');
        el.innerText = list[Math.floor(Math.random() * list.length)];
        el.style.position = 'absolute';
        el.style.left = `${startX}px`;
        el.style.top = `${startY}px`;
        el.style.fontSize = `${20 + Math.random() * 24}px`;
        el.style.userSelect = 'none';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '9999';
        container.appendChild(el);

        // Radial physics direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = 120 + Math.random() * 200;
        const targetX = Math.cos(angle) * velocity;
        const targetY = Math.sin(angle) * velocity;

        // Animate using GSAP
        gsap.to(el, {
          x: targetX,
          y: targetY - 80, // slight vertical shift (simulating arc)
          rotation: -180 + Math.random() * 360,
          opacity: 0,
          scale: 0.1,
          duration: 1.0 + Math.random() * 0.6,
          ease: 'power2.out',
          onComplete: () => {
            if (container.contains(el)) {
              container.removeChild(el);
            }
          }
        });
      }
    };

    window.addEventListener('trigger-emoji-blast', handleBlast);
    return () => window.removeEventListener('trigger-emoji-blast', handleBlast);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    />
  );
}
