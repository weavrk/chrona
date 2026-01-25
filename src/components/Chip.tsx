import React, { useEffect, useState } from 'react';

interface ChipProps {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, color, active, onClick }: ChipProps) {
  const [colorValue, setColorValue] = useState<string>('');

  useEffect(() => {
    // Get the computed CSS variable value
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${color}`)
      .trim();
    setColorValue(value || color);
  }, [color]);
  
  const style: React.CSSProperties = active ? {
    backgroundColor: colorValue,
    borderColor: colorValue,
    color: 'var(--color-primary)',
  } : {
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

