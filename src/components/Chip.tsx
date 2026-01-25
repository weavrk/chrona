import React, { useEffect, useState } from 'react';
import { useDesignSystem } from '../contexts/DesignSystemContext';

interface ChipProps {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, color, active, onClick }: ChipProps) {
  const { tokens } = useDesignSystem();
  const [colorValue, setColorValue] = useState<string>('');

  useEffect(() => {
    // Get color from design tokens directly (more reliable than CSS variables on load)
    const tokenColor = (tokens as any)[color];
    if (tokenColor) {
      // If it's a hex color, use it directly
      if (tokenColor.startsWith('#')) {
        setColorValue(tokenColor);
      } else {
        // If it references another token, resolve it
        const resolvedColor = (tokens as any)[tokenColor];
        setColorValue(resolvedColor || tokenColor);
      }
    } else {
      // Fallback to CSS variable
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${color}`)
        .trim();
      setColorValue(value || '#B3B3B3');
    }
  }, [color, tokens]);
  
  // Inactive: transparent bg, colored border and text
  // Active: colored bg and border, dark text
  const style: React.CSSProperties = active ? {
    backgroundColor: colorValue,
    borderColor: colorValue,
  } : {
    backgroundColor: 'transparent',
    borderColor: colorValue,
    color: colorValue,
  };

  return (
    <button
      className={`ds-chip ${active ? 'ds-chip-active' : 'ds-chip-inactive'}`}
      style={style}
      onClick={onClick}
    >
      <span>{label}</span>
    </button>
  );
}

