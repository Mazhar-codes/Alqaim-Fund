"use client";

import { useRef, useState } from "react";

/** Wraps a card so it tilts in 3D toward the cursor on hover — pure CSS transforms, no libraries. */
export default function TiltCard({ children, className = "", max = 8 }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) scale3d(1.02, 1.02, 1.02)`,
    });
  }

  function handleMouseLeave() {
    setStyle({ transform: "perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)" });
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
