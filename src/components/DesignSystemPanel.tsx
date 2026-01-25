import React, { useState, useEffect } from 'react';
import { useDesignSystem } from '../contexts/DesignSystemContext';
import '../styles/design-system.css';

export function DesignSystemPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { tokens, updateTokens, renameToken, applyTokens } = useDesignSystem();
  const [localTokens, setLocalTokens] = useState(tokens);
  
  // Sync localTokens when tokens change (e.g., when new colors are added from label modals)
  useEffect(() => {
    setLocalTokens(tokens);
  }, [tokens]);
  const [showDestructiveConfirm, setShowDestructiveConfirm] = useState(false);
  const [applyButtonState, setApplyButtonState] = useState<'idle' | 'success'>('idle');
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState<string>('');
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const [pendingRenames, setPendingRenames] = useState<Array<{ oldName: string, newName: string }>>([]);
  
  // Semantic colors order - load from localStorage or use default
  const [semanticColorsOrder, setSemanticColorsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('semanticColorsOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Remove deprecated keys from order
        const keysToRemove = ['background-primary', 'background-secondary', 'background-tertiary', 'untitled', 'untitled-1'];
        const filtered = parsed.filter((key: string) => !keysToRemove.includes(key));
        // Only return if there are items, otherwise return null to use default
        return filtered.length > 0 ? filtered : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleCopyToClipboard = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };


  const handleColorChange = (key: string, value: string) => {
    const updated = { ...localTokens, [key]: value } as typeof tokens;
    setLocalTokens(updated);
    updateTokens(updated);
  };

  const handlePasswordSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (password === 'p') {
      setPasswordConfirmed(true);
      setPassword('');
      // Auto-apply after confirmation
      setTimeout(() => {
        handleApply();
      }, 500);
    } else {
      setPassword('');
      alert('Incorrect password');
    }
  };

  const handleApplyClick = () => {
    if (!passwordConfirmed) {
      setShowPasswordInput(true);
    } else {
      handleApply();
    }
  };

  const handleApply = async () => {
    // Clean up deprecated keys from semantic colors order
    const deprecatedKeys = ['background-primary', 'background-secondary', 'background-tertiary', 'untitled', 'untitled-1', 'gray-900'];
    const cleanedOrder = semanticColorsOrder 
      ? semanticColorsOrder.filter(key => !deprecatedKeys.includes(key))
      : null;
    
    // Save semantic colors order
    if (cleanedOrder && cleanedOrder.length > 0) {
      localStorage.setItem('semanticColorsOrder', JSON.stringify(cleanedOrder));
      setSemanticColorsOrder(cleanedOrder);
    } else if (semanticColorsOrder) {
      // Clear if all were deprecated
      localStorage.removeItem('semanticColorsOrder');
      setSemanticColorsOrder(null as any);
    }
    
    // Apply tokens (this updates localStorage and DOM)
    applyTokens();
    
    // Clean up deprecated keys from tokens before saving
    const cleanedTokens = { ...localTokens } as any;
    deprecatedKeys.forEach(key => {
      if (key in cleanedTokens) {
        delete cleanedTokens[key];
      }
    });
    
    // Save to file and commit to git
    try {
      const response = await fetch('/api/save_design_tokens.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tokens: cleanedTokens,
          renames: pendingRenames
        }),
      });
      
      // Clear pending renames after successful save
      if (response.ok) {
        setPendingRenames([]);
      }
      
      if (response.ok) {
        await response.json();
        // Show success state on button
        setApplyButtonState('success');
        // Reset password state
        setShowPasswordInput(false);
        setPasswordConfirmed(false);
        // Reset button after 2 seconds
        setTimeout(() => setApplyButtonState('idle'), 2000);
      } else {
        console.error('Failed to save design tokens:', await response.text());
        // Still show success for user, but log error
        setApplyButtonState('success');
        setShowPasswordInput(false);
        setPasswordConfirmed(false);
        setTimeout(() => setApplyButtonState('idle'), 2000);
      }
    } catch (error) {
      console.error('Error saving design tokens:', error);
      // Still show success for user, but log error
      setApplyButtonState('success');
      setShowPasswordInput(false);
      setPasswordConfirmed(false);
      setTimeout(() => setApplyButtonState('idle'), 2000);
    }
  };

  // Get all primitive color names dynamically from tokens
  // Primitives are colors that have hex values or match primitive patterns (gray-*, cyan-*, etc.)
  const getPrimitiveNames = (): string[] => {
    return Object.keys(localTokens).filter(key => {
      const value = localTokens[key as keyof typeof localTokens];
      // If the value is a hex color, it's a primitive
      if (typeof value === 'string' && value.startsWith('#')) {
        return true;
      }
      // If the key matches primitive patterns, it's a primitive
      if (key.startsWith('gray-') || key.startsWith('cyan-') || 
          key.startsWith('magenta-') || key.startsWith('yellow-')) {
        return true;
      }
      // Otherwise, it's a semantic color (references another color)
      return false;
    });
  };

  // Get the actual color value for display
  const getColorValue = (primitiveName: string): string => {
    if (primitiveName.startsWith('#')) {
      return primitiveName;
    }
    return (tokens as any)[primitiveName] || '#000000';
  };

  // Alias for getColorValue (used in palette colors section)
  const getPrimitiveValue = getColorValue;

  // Use exact code names (no formatting)
  const getDisplayName = (name: string): string => {
    return name;
  };


  const primitiveNames = getPrimitiveNames();
  // Dynamically categorize primitives
  const grayScale = primitiveNames.filter(name => name.startsWith('gray-'));
  
  // Order CMYK colors: cyan, green, yellow, magenta
  const colorOrder = ['cyan', 'green', 'yellow', 'magenta'];
  const cmykColors = primitiveNames
    .filter(name => colorOrder.some(color => name.startsWith(color + '-')))
    .sort((a, b) => {
      const aPrefix = colorOrder.find(color => a.startsWith(color + '-'));
      const bPrefix = colorOrder.find(color => b.startsWith(color + '-'));
      const aIndex = colorOrder.indexOf(aPrefix || '');
      const bIndex = colorOrder.indexOf(bPrefix || '');
      if (aIndex !== bIndex) return aIndex - bIndex;
      // Within same color, sort by -dark, -light
      return a.includes('dark') ? -1 : 1;
    });
  
  // Palette colors (after grays) - these are used for labels: steel, teal, sage, sand, marigold, coral, brick
  const paletteColors = primitiveNames
    .filter(name => 
      !name.startsWith('gray-') && 
      !name.startsWith('label-') && 
      !colorOrder.some(color => name.startsWith(color + '-'))
    )
    .sort();
  
  // Default semantic colors order
  const defaultSemanticColors = [
    'brand-primary',
    'primary',
    'secondary',
    'tertiary',
    'accent',
    'accent-2',
    'accent-3',
    'accent-4',
    'button-primary'
  ];
  
  // Use saved order or default
  const orderedSemanticColors = semanticColorsOrder || defaultSemanticColors;
  
  // Identify all semantic colors dynamically (all keys that aren't primitives)
  // Also filter out deprecated keys
  const deprecatedKeys = ['background-primary', 'background-secondary', 'background-tertiary', 'untitled', 'untitled-1', 'gray-900'];
  const allSemanticColorKeys = Object.keys(localTokens).filter(key => {
    // Skip deprecated keys
    if (deprecatedKeys.includes(key)) {
      return false;
    }
    // A key is a semantic color if it's not a primitive
    return !primitiveNames.includes(key);
  });
  
  // Filter to only include keys that exist in tokens and are in the order
  const semanticColors = orderedSemanticColors
    .filter(key => key in localTokens && allSemanticColorKeys.includes(key))
    .map(key => ({ key, label: key }));
  
  // Add any semantic color keys that aren't in the order (newly created or renamed)
  allSemanticColorKeys.forEach(key => {
    if (!orderedSemanticColors.includes(key)) {
      semanticColors.push({ key, label: key });
    }
  });

  const handleStartEdit = (key: string) => {
    setEditingName(key);
    setEditingValue(key);
  };

  const handleFinishEdit = (oldKey: string) => {
    if (editingValue && editingValue !== oldKey && editingValue.trim() !== '') {
      const newKey = editingValue.trim();
      // Check if new key already exists
      if (newKey in localTokens && newKey !== oldKey) {
        alert(`Color name "${newKey}" already exists`);
        setEditingName(null);
        return;
      }
      
      // Update local tokens first to reflect the rename
      const updated = { ...localTokens };
      const value = updated[oldKey as keyof typeof updated];
      delete updated[oldKey as keyof typeof updated];
      (updated as any)[newKey] = value;
      
      // Update all semantic colors that reference the old key
      Object.keys(updated).forEach(key => {
        const tokenValue = updated[key as keyof typeof updated];
        if (typeof tokenValue === 'string' && tokenValue === oldKey && !tokenValue.startsWith('#')) {
          (updated as any)[key] = newKey;
        }
      });
      
      // Update local tokens
      setLocalTokens(updated);
      
      // Track rename for find/replace
      setPendingRenames(prev => [...prev, { oldName: oldKey, newName: newKey }]);
      
      // Use the renameToken function which handles all references
      // This updates pendingTokens, applies to DOM, and updates all semantic color references
      renameToken(oldKey, newKey);
      
      // Also update tokens in context to keep them in sync
      updateTokens(updated);
      
      // Update order array
      const newOrder = orderedSemanticColors.map(k => k === oldKey ? newKey : k);
      setSemanticColorsOrder(newOrder);
    }
    setEditingName(null);
    setEditingValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, oldKey: string) => {
    if (e.key === 'Enter') {
      handleFinishEdit(oldKey);
    } else if (e.key === 'Escape') {
      setEditingName(null);
      setEditingValue('');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...orderedSemanticColors];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, removed);
    
    setSemanticColorsOrder(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddNew = () => {
    // Generate a unique key (avoid deprecated names)
    let newKey = 'new-color';
    let counter = 1;
    while (newKey in localTokens || orderedSemanticColors.includes(newKey)) {
      newKey = `new-color-${counter}`;
      counter++;
    }
    
    // Add to tokens with default value 'primary' (which maps to gray-900/white)
    const updated = { ...localTokens, [newKey]: 'primary' } as typeof tokens;
    setLocalTokens(updated);
    updateTokens(updated);
    
    // Add to order
    const newOrder = [...orderedSemanticColors, newKey];
    setSemanticColorsOrder(newOrder);
    
    // Start editing the name immediately
    setEditingName(newKey);
    setEditingValue(newKey);
  };

  const handleAddNewPrimitive = () => {
    // Generate a unique key
    let newKey = 'untitled';
    let counter = 1;
    while (newKey in localTokens) {
      newKey = `untitled-${counter}`;
      counter++;
    }
    
    // Add to tokens with default hex color (gray-400 as default)
    const updated = { ...localTokens, [newKey]: '#6B6B6B' } as typeof tokens;
    setLocalTokens(updated);
    updateTokens(updated);
    
    // Start editing the name immediately
    setEditingName(newKey);
    setEditingValue(newKey);
  };

  return (
    <>
      <button
        className="design-system-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open Design System"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="design-system-overlay" onClick={() => setIsOpen(false)} />
          <div className="design-system-panel">
            <div className="design-system-header">
              <h2 className="page-header">Design System</h2>
              <button
                className="design-system-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="design-system-content">
              <div className="design-system-scrollable">
                <section className="design-system-section">
                  <h3 className="section-header">Primitive Colors</h3>
                  
                  <div className="color-grid">
                    {/* Gray Scale */}
                    {grayScale.map((grayName) => {
                      const isEditing = editingName === grayName;
                      return (
                        <div key={grayName} className="color-swatch-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleFinishEdit(grayName)}
                              onKeyDown={(e) => handleKeyDown(e, grayName)}
                              autoFocus
                              style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--color-accent)',
                                borderRadius: 'var(--border-radius)',
                                padding: '4px 8px',
                                color: 'var(--gray-800)',
                                fontFamily: 'inherit',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                outline: 'none',
                                flex: 1,
                                maxWidth: '120px'
                              }}
                            />
                          ) : (
                            <>
                              <span 
                                className="color-name" 
                                style={{ cursor: 'text' }}
                                onClick={() => handleStartEdit(grayName)}
                                title="Click to rename"
                              >
                                {getDisplayName(grayName)}
                              </span>
                              <button
                                onClick={() => handleCopyToClipboard(grayName)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: copiedName === grayName ? 'var(--color-accent)' : 'var(--gray-700)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.2s'
                                }}
                                title="Copy to clipboard"
                              >
                                {copiedName === grayName ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                        <input
                          type="color"
                          value={(localTokens as any)[grayName]}
                          onChange={(e) => handleColorChange(grayName, e.target.value)}
                          className="color-swatch"
                        />
                        <div className="color-info">
                          <input
                            type="text"
                            value={(localTokens as any)[grayName]}
                            onChange={(e) => handleColorChange(grayName, e.target.value)}
                            className="color-hex"
                          />
                        </div>
                        </div>
                      );
                    })}

                    {/* Palette Colors (used for labels) */}
                    {paletteColors.map((paletteName) => {
                      const isEditing = editingName === paletteName;
                      return (
                        <div key={paletteName} className="color-swatch-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleFinishEdit(paletteName)}
                              onKeyDown={(e) => handleKeyDown(e, paletteName)}
                              autoFocus
                              style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--color-accent)',
                                borderRadius: 'var(--border-radius)',
                                padding: '4px 8px',
                                color: 'var(--gray-800)',
                                fontFamily: 'inherit',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                outline: 'none',
                                flex: 1,
                                maxWidth: '120px'
                              }}
                            />
                          ) : (
                            <>
                              <span 
                                className="color-name" 
                                style={{ cursor: 'text' }}
                                onClick={() => handleStartEdit(paletteName)}
                                title="Click to rename"
                              >
                                {getDisplayName(paletteName)}
                              </span>
                              <button
                                onClick={() => handleCopyToClipboard(paletteName)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: copiedName === paletteName ? 'var(--color-accent)' : 'var(--gray-700)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.2s'
                                }}
                                title="Copy to clipboard"
                              >
                                {copiedName === paletteName ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                        <input
                          type="color"
                          className="color-swatch"
                          value={getPrimitiveValue(paletteName)}
                          onChange={(e) => {
                            const updated = { ...localTokens } as any;
                            updated[paletteName] = e.target.value;
                            setLocalTokens(updated);
                            updateTokens(updated);
                          }}
                        />
                        <div className="color-info">
                          <input
                            type="text"
                            className="color-hex"
                            value={getPrimitiveValue(paletteName)}
                            onChange={(e) => {
                              const hex = e.target.value;
                              if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                                const updated = { ...localTokens } as any;
                                updated[paletteName] = hex;
                                setLocalTokens(updated);
                                updateTokens(updated);
                              }
                            }}
                          />
                        </div>
                        </div>
                      );
                    })}

                    {/* CMYK Colors */}
                    {cmykColors.map((cmykName) => {
                      const isEditing = editingName === cmykName;
                      return (
                        <div key={cmykName} className="color-swatch-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleFinishEdit(cmykName)}
                              onKeyDown={(e) => handleKeyDown(e, cmykName)}
                              autoFocus
                              style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--color-accent)',
                                borderRadius: 'var(--border-radius)',
                                padding: '4px 8px',
                                color: 'var(--gray-800)',
                                fontFamily: 'inherit',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                outline: 'none',
                                flex: 1,
                                maxWidth: '120px'
                              }}
                            />
                          ) : (
                            <>
                              <span 
                                className="color-name" 
                                style={{ cursor: 'text' }}
                                onClick={() => handleStartEdit(cmykName)}
                                title="Click to rename"
                              >
                                {getDisplayName(cmykName)}
                              </span>
                              <button
                                onClick={() => handleCopyToClipboard(cmykName)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: copiedName === cmykName ? 'var(--color-accent)' : 'var(--gray-700)',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.2s'
                                }}
                                title="Copy to clipboard"
                              >
                                {copiedName === cmykName ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5"/>
                                  </svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                        <input
                          type="color"
                          value={(localTokens as any)[cmykName]}
                          onChange={(e) => handleColorChange(cmykName, e.target.value)}
                          className="color-swatch"
                        />
                        <div className="color-info">
                          <input
                            type="text"
                            value={(localTokens as any)[cmykName]}
                            onChange={(e) => handleColorChange(cmykName, e.target.value)}
                            className="color-hex"
                          />
                        </div>
                        </div>
                      );
                    })}
                    {/* Add New Primitive Color */}
                    <div
                      className="color-swatch-card"
                      onClick={handleAddNewPrimitive}
                      style={{
                        cursor: 'pointer',
                        border: '2px solid var(--color-secondary)',
                        background: 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '120px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-secondary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-secondary)' }}>
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      <span style={{ fontFamily: 'var(--font-family)', fontSize: '0.875rem', color: 'var(--color-secondary)' }}>Add</span>
                    </div>
                  </div>
                </section>

                <section className="design-system-section">
                  <h3 className="section-header">Semantic Colors</h3>
                  
                  <div className="semantic-colors-list">
                    {semanticColors.map(({ key, label }, index) => {
                      const currentValue = (localTokens as any)[key];
                      const displayColor = getColorValue(currentValue);
                      const isEditing = editingName === key;
                      const isDragging = draggedIndex === index;
                      const isDragOver = dragOverIndex === index;
                      
                      return (
                        <div
                          key={key}
                          onDragOver={(e) => {
                            if (draggedIndex !== null) {
                              handleDragOver(e, index);
                            }
                          }}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => {
                            if (draggedIndex !== null) {
                              handleDrop(e, index);
                            }
                          }}
                        >
                        <div
                          key={key}
                          className="semantic-color-item"
                          style={{
                            opacity: isDragging ? 0.5 : 1,
                            borderTop: isDragOver ? '2px solid var(--color-accent)' : 'none',
                            padding: '8px',
                            gap: '16px'
                          }}
                        >
                          <div className="semantic-color-preview" style={{ backgroundColor: displayColor }}></div>
                          <div className="semantic-color-info" style={{ flex: 1, padding: 0, width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleFinishEdit(key)}
                                  onKeyDown={(e) => handleKeyDown(e, key)}
                                  autoFocus
                                  style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--color-accent)',
                                    borderRadius: 'var(--border-radius)',
                                    padding: '4px 8px',
                                    color: 'var(--gray-800)',
                                    fontFamily: 'inherit',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    outline: 'none',
                                    width: '100%',
                                    maxWidth: '200px'
                                  }}
                                />
                              ) : (
                                <>
                                  <span
                                    className="semantic-color-label"
                                    onClick={() => handleStartEdit(key)}
                                    style={{ cursor: 'text' }}
                                  >
                                    {label}
                                  </span>
                                  <button
                                    onClick={() => handleCopyToClipboard(key)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: copiedName === key ? 'var(--color-accent)' : 'var(--gray-700)',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'color 0.2s'
                                    }}
                                    title="Copy to clipboard"
                                  >
                                    {copiedName === key ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17l-5-5"/>
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                      </svg>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                            <select
                              value={currentValue}
                              onChange={(e) => handleColorChange(key, e.target.value)}
                              className="semantic-color-select"
                            >
                              {primitiveNames.map((primitiveName) => (
                                <option key={primitiveName} value={primitiveName}>
                                  {getDisplayName(primitiveName)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStart(e, index);
                            }}
                            onDragEnd={handleDragEnd}
                            style={{
                              color: 'var(--color-secondary)',
                              cursor: isDragging ? 'grabbing' : 'grab',
                              padding: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'color 0.2s',
                              userSelect: 'none'
                            }}
                            title="Drag to reorder"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="9" cy="5" r="1"/>
                              <circle cx="9" cy="12" r="1"/>
                              <circle cx="9" cy="19" r="1"/>
                              <circle cx="15" cy="5" r="1"/>
                              <circle cx="15" cy="12" r="1"/>
                              <circle cx="15" cy="19" r="1"/>
                            </svg>
                          </div>
                        </div>
                        </div>
                      );
                    })}
                    <div
                      className="semantic-color-item"
                      onClick={handleAddNew}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const index = semanticColors.length;
                        handleDragOver(e, index);
                      }}
                      onDrop={(e) => {
                        const index = semanticColors.length;
                        handleDrop(e, index);
                      }}
                      style={{
                        cursor: 'pointer',
                        border: '2px solid var(--color-secondary)',
                        background: 'transparent',
                        padding: 0,
                        gap: '16px',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-secondary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ width: '48px', height: '48px', flexShrink: 0 }}></div>
                      <div className="semantic-color-info" style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-secondary)', padding: 0, width: '100%' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        <span style={{ fontFamily: 'var(--font-family)', fontSize: '0.875rem' }}>Add</span>
                      </div>
                      <div style={{ width: '32px', flexShrink: 0 }}></div>
                    </div>
                  </div>
                </section>

                <section className="design-system-section">
                  <h3 className="section-header">Button Components</h3>
                  
                  <div className="button-components-demo">
                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-button-primary</h4>
                      <button className="ds-button-primary">
                        Save
                      </button>
                      <p className="button-demo-description">Full-width button with neumorphic styling. Used for primary actions like saving profiles.</p>
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-button-secondary</h4>
                      <button className="ds-button-secondary">
                        Cancel
                      </button>
                      <p className="button-demo-description">Customizable button with same attributes as primary. Colors can be customized in the future.</p>
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-button-destructive</h4>
                      {!showDestructiveConfirm ? (
                        <button 
                          className="ds-button-destructive"
                          onClick={() => setShowDestructiveConfirm(true)}
                        >
                          Delete Profile
                        </button>
                      ) : (
                        <div className="ds-destructive-confirm">
                          <span className="ds-destructive-confirm-text">Are you sure?</span>
                          <div className="ds-destructive-confirm-buttons">
                            <button 
                              className="ds-button-confirm-destructive"
                              onClick={() => {
                                setShowDestructiveConfirm(false);
                              }}
                            >
                              Yes
                            </button>
                            <button 
                              className="ds-button-cancel-destructive"
                              onClick={() => setShowDestructiveConfirm(false)}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="button-demo-description">Button with built-in "Are you sure?" confirmation. Used for destructive actions like deleting profiles.</p>
                    </div>
                  </div>
                </section>

                <section className="design-system-section">
                  <h3 className="section-header">Chip Components</h3>
                  
                  <div className="button-components-demo">
                    <div className="button-demo-item">
                      <h4 className="button-demo-label">ds-chip</h4>
                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                        <button className="ds-chip ds-chip-inactive" style={{ color: '#F06292', borderColor: '#F06292' }}>
                          <span>Period</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </button>
                        <button className="ds-chip ds-chip-active" style={{ backgroundColor: '#F06292', borderColor: '#F06292', color: 'var(--color-primary)' }}>
                          <span>Period</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <p className="button-demo-description">Toggle-able chip component with plus icon (inactive) and x icon (active). Used for filtering and category selection.</p>
                    </div>
                  </div>
                </section>
              </div>
              <div className="design-system-actions-bottom-sheet">
                {!showPasswordInput && !passwordConfirmed ? (
                  <button
                    className="create-button-full"
                    onClick={handleApplyClick}
                    disabled={applyButtonState === 'success'}
                    style={{
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    <span style={{
                      opacity: applyButtonState === 'idle' ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                      position: applyButtonState === 'success' ? 'absolute' : 'relative'
                    }}>
                      Apply Changes
                    </span>
                    <span style={{
                      opacity: applyButtonState === 'success' ? 1 : 0,
                      transition: 'opacity 0.2s ease',
                      position: applyButtonState === 'idle' ? 'absolute' : 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: 'block' }}>
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{
                            strokeDasharray: '63',
                            strokeDashoffset: applyButtonState === 'success' ? '0' : '63',
                            transition: 'stroke-dashoffset 0.4s ease-in-out'
                          }}
                        />
                        <path
                          d="M7 12l3 3 7-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            strokeDasharray: '18',
                            strokeDashoffset: applyButtonState === 'success' ? '0' : '18',
                            transition: 'stroke-dashoffset 0.4s ease-in-out 0.2s'
                          }}
                        />
                      </svg>
                    </span>
                  </button>
                ) : passwordConfirmed ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-background-components, var(--bg-card))',
                    borderRadius: 'var(--border-radius)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-accent)' }}>
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span>Password confirmed. Applying changes...</span>
                  </div>
                ) : (
                  <form
                    onSubmit={handlePasswordSubmit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-sm)',
                      width: '100%'
                    }}
                  >
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowPasswordInput(false);
                          setPassword('');
                        }
                      }}
                      placeholder="Enter password"
                      autoFocus
                      style={{
                        flex: '0 1 auto',
                        minWidth: 0,
                        maxWidth: '200px',
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--bg-card)',
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-family)',
                        fontSize: '1rem'
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setShowPasswordInput(false);
                        setPassword('');
                      }}
                      style={{
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--bg-card)',
                        borderRadius: 'var(--border-radius)',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-family)',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--bg-card)';
                      }}
                    >
                      Cancel
                    </button>
                <button
                      type="submit"
                  className="create-button-full"
                      style={{
                        width: 'auto',
                        minWidth: '100px',
                        padding: 'var(--spacing-md) var(--spacing-lg)'
                      }}
                >
                      Enter
                </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
