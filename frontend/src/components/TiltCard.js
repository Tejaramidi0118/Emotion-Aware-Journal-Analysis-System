import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

export default function TiltCard({ children, style, className }) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);

  useGSAP(() => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // mouse position X relative to card
      const y = e.clientY - rect.top;  // mouse position Y relative to card
      
      const width = rect.width;
      const height = rect.height;
      
      // Calculate rotation offset: max tilt 8 degrees
      const rotateX = -((y - height / 2) / (height / 2)) * 8;
      const rotateY = ((x - width / 2) / (width / 2)) * 8;

      // Animate card rotation
      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        transformPerspective: 1000,
        ease: 'power2.out',
        duration: 0.3,
        overwrite: 'auto'
      });

      // Animate glare overlay reflection
      if (glare) {
        const glareX = (x / width) * 100;
        const glareY = (y / height) * 100;
        gsap.to(glare, {
          background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 80%)`,
          ease: 'power2.out',
          duration: 0.3,
          overwrite: 'auto'
        });
      }
    };

    const handleMouseLeave = () => {
      // Reset card rotation
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        ease: 'power3.out',
        duration: 0.5,
        overwrite: 'auto'
      });

      // Reset glare
      if (glare) {
        gsap.to(glare, {
          background: 'transparent',
          ease: 'power3.out',
          duration: 0.5,
          overwrite: 'auto'
        });
      }
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, { scope: cardRef });

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        ...style,
        position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Glare overlay reflection */}
      <div
        ref={glareRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'inherit',
          pointerEvents: 'none',
          zIndex: 99,
        }}
      />
      
      <div style={{ transform: 'translateZ(20px)', height: '100%', display: 'flex', flexDirection: 'column', gap: 'inherit', minHeight: 0, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
