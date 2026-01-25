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
  const [pendingRenames, setPendingRenames] = useState<Array<{ oldName: string, newName: string }>>([]);
  const [expandedStyleSections, setExpandedStyleSections] = useState<Set<string>>(new Set());
  
  // Semantic colors order - load from localStorage or use default
  const [semanticColorsOrder, setSemanticColorsOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('semanticColorsOrder');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Remove deprecated keys from order
        const keysToRemove = ['background-primary', 'background-secondary', 'background-tertiary', 'ocean', 'ocean-1'];
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
      setPassword('');
      setShowPasswordInput(false);
      // Go straight to applying changes
        handleApply();
    } else {
      setPassword('');
      alert('Incorrect password');
    }
  };

  const handleApplyClick = () => {
      setShowPasswordInput(true);
  };

  const handleApply = async () => {
    // Clean up deprecated keys from semantic colors order
    const deprecatedKeys = ['background-primary', 'background-secondary', 'background-tertiary', 'ocean', 'ocean-1', 'gray-900'];
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
        // Reset button after 2 seconds
        setTimeout(() => setApplyButtonState('idle'), 2000);
      } else {
        console.error('Failed to save design tokens:', await response.text());
        // Still show success for user, but log error
        setApplyButtonState('success');
        setShowPasswordInput(false);
        setTimeout(() => setApplyButtonState('idle'), 2000);
      }
    } catch (error) {
      console.error('Error saving design tokens:', error);
      // Still show success for user, but log error
      setApplyButtonState('success');
      setShowPasswordInput(false);
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
    // Use localTokens to get the current value (includes renames)
    return (localTokens as any)[primitiveName] || '#000000';
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
  
  // Palette colors (after grays) - these are used for labels: steel, turquiose, sage, sand, marigold, coral, brick
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
  const deprecatedKeys = ['background-primary', 'background-secondary', 'background-tertiary', 'ocean', 'ocean-1', 'gray-900'];
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

  const toggleStyleSection = (sectionId: string) => {
    setExpandedStyleSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
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
    let newKey = 'ocean';
    let counter = 1;
    while (newKey in localTokens) {
      newKey = `ocean-${counter}`;
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
            <div className="ds-header">
              <h2>Design System</h2>
              <button
                className="ds-header-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
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
                      <h4 className="button-demo-label">
                        ds-button-primary
                        <button
                          onClick={() => handleCopyToClipboard('ds-button-primary')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-button-primary' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-button-primary' ? (
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
                      </h4>
                      <button className="ds-button-primary">
                        Save
                      </button>
                      <p className="button-demo-description">Full-width button with neumorphic styling. Used for primary actions like saving profiles.</p>
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        ds-button-secondary
                        <button
                          onClick={() => handleCopyToClipboard('ds-button-secondary')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-button-secondary' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-button-secondary' ? (
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
                      </h4>
                      <button className="ds-button-secondary">
                        Cancel
                      </button>
                      <p className="button-demo-description">Customizable button with same attributes as primary. Colors can be customized in the future.</p>
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        ds-button-destructive
                        <button
                          onClick={() => handleCopyToClipboard('ds-button-destructive')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-button-destructive' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-button-destructive' ? (
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
                      </h4>
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
                      <h4 className="button-demo-label">
                        ds-chip
                        <button
                          onClick={() => handleCopyToClipboard('ds-chip')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-chip' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-chip' ? (
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
                      </h4>
                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                        <button className="ds-chip ds-chip-inactive" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>
                          <span>PE</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                      </button>
                        <button className="ds-chip ds-chip-active" style={{ backgroundColor: 'var(--coral)', borderColor: 'var(--coral)', color: 'var(--color-primary)' }}>
                          <span>PE</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <p className="button-demo-description">Toggleable chip component with plus icon (inactive) and x icon (active). Used in chip-bar-container on calendar home screen for filtering records (PE/HS/HR/ID). See also: ds-chip-bar-toggleable.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('ds-chip')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('ds-chip') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('ds-chip') && (
                        <div className="style-reference-content">
                          <h5>Base Class: <code>.ds-chip</code></h5>
                          <pre>{`display: inline-flex
align-items: center
gap: 6px
padding: 4px 8px
border-radius: 20px
font-size: 12px
font-weight: 500
border: 1.5px solid
cursor: pointer
transition: all 0.2s ease
background: transparent`}</pre>
                          
                          <h5>Inactive State: <code>.ds-chip-inactive</code></h5>
                          <pre>{`background: transparent
/* Border and text colors set via inline styles */`}</pre>
                          
                          <h5>Active State: <code>.ds-chip-active</code></h5>
                          <pre>{`/* Background and border colors set via inline styles */
color: var(--color-primary)`}</pre>
                          
                          <h5>SVG Icons</h5>
                          <pre>{`width: 12px
height: 12px
flex-shrink: 0`}</pre>
                          
                          <h5>Used In:</h5>
                          <pre>{`Components: ChipBar.tsx (chip-bar-container)
Containers: .chip-bar
Location: Calendar home screen filter bar`}</pre>
                        </div>
                      )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        ds-chip-single-select
                        <button
                          onClick={() => handleCopyToClipboard('ds-chip-single-select')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-chip-single-select' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-chip-single-select' ? (
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
                      </h4>
                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                        <button className="ds-chip-single-select" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>
                          <span>PE</span>
                        </button>
                        <button className="ds-chip-single-select active" style={{ backgroundColor: 'var(--coral)', borderColor: 'var(--coral)' }}>
                          <span>PE</span>
                        </button>
                      </div>
                      <p className="button-demo-description">Single-select chip variant without icons. Used in AddRecordSheet for record type selection (PE/HS/HR/ID) and intensity/severity levels. See also: chip-bar-variant-record, form-chips-single.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('ds-chip-single-select')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('ds-chip-single-select') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('ds-chip-single-select') && (
                        <div className="style-reference-content">
                          <h5>Base Class: <code>.ds-chip-single-select</code></h5>
                          <pre>{`display: inline-flex
align-items: center
gap: 8px
padding: 4px 8px
border-radius: 20px
font-size: 12px
font-weight: 500
border: 2px solid var(--color-secondary)
background: transparent
color: var(--color-secondary)
cursor: pointer
transition: all 0.2s
white-space: nowrap`}</pre>
                          
                          <h5>Active State: <code>.ds-chip-single-select.active</code></h5>
                          <pre>{`color: var(--color-background-white)
/* Background and border colors set via inline styles */`}</pre>
                          
                          <h5>Container: <code>.chip-bar-single-select</code></h5>
                          <pre>{`display: flex
flex-wrap: nowrap
gap: var(--spacing-sm)
align-items: center`}</pre>
                          
                          <h5>Used In:</h5>
                          <pre>{`Components: AddRecordSheet.tsx
Containers: .chip-bar-variant-record, .form-chips-single
Location: Add Record sheet (record type selector, intensity, severity)`}</pre>
                        </div>
                      )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        ds-chip-bar-toggleable
                        <button
                          onClick={() => handleCopyToClipboard('ds-chip-bar-toggleable')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-chip-bar-toggleable' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-chip-bar-toggleable' ? (
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
                      </h4>
                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', padding: '8px', background: 'var(--color-background-body)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-secondary)' }}>
                        <button className="ds-chip ds-chip-inactive" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>
                          <span>PE</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </button>
                        <button className="ds-chip ds-chip-active" style={{ backgroundColor: 'var(--marigold)', borderColor: 'var(--marigold)', color: 'var(--color-primary)' }}>
                          <span>HS</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                        <button className="ds-chip ds-chip-inactive" style={{ color: 'var(--turquiose)', borderColor: 'var(--turquiose)' }}>
                          <span>HR</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </button>
                        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)', cursor: 'pointer' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                          </svg>
                        </div>
                      </div>
                      <p className="button-demo-description">Toggleable chip bar with plus/x icon toggle states and ellipses menu. Uses ds-chip components in chip-bar-container. Fixed position at top of calendar home screen for filtering records (PE/HS/HR/ID).</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('ds-chip-bar-toggleable')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('ds-chip-bar-toggleable') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('ds-chip-bar-toggleable') && (
                        <div className="style-reference-content">
                          <h5>Container: <code>.chip-bar-container</code></h5>
                          <pre>{`position: fixed
top: 60px
left: 0
right: 0
z-index: 90
background: var(--color-background-body)
padding: 16px 0
border-bottom: 1px solid var(--color-secondary)
overflow-x: auto
overflow-y: hidden
scrollbar-width: none`}</pre>
                          
                          <h5>Inner Container: <code>.chip-bar</code></h5>
                          <pre>{`display: flex
flex-wrap: nowrap
gap: var(--spacing-sm)
align-items: center
padding: 0 16px 0 0
justify-content: flex-end`}</pre>
                          
                          <h5>Chips Used: <code>.ds-chip</code></h5>
                          <pre>{`See ds-chip component for styling`}</pre>
                          
                          <h5>Used In:</h5>
                          <pre>{`Components: ChipBar.tsx
Location: Calendar home screen (fixed top bar)
Related: ds-chip component`}</pre>
                        </div>
                      )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        ds-chip-bar-record-selector
                        <button
                          onClick={() => handleCopyToClipboard('ds-chip-bar-record-selector')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-chip-bar-record-selector' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-chip-bar-record-selector' ? (
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
                      </h4>
                      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                        <button className="ds-chip-single-select" style={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}>
                          <span>PE</span>
                        </button>
                        <button className="ds-chip-single-select active" style={{ backgroundColor: 'var(--marigold)', borderColor: 'var(--marigold)' }}>
                          <span>HS</span>
                        </button>
                        <button className="ds-chip-single-select" style={{ color: 'var(--turquiose)', borderColor: 'var(--turquiose)' }}>
                          <span>HR</span>
                        </button>
                        <button className="ds-chip-single-select" style={{ color: 'var(--sage)', borderColor: 'var(--sage)' }}>
                          <span>ID</span>
                        </button>
                      </div>
                      <p className="button-demo-description">Record type selector using ds-chip-single-select components. Horizontally scrollable chip bar for choosing record types (PE/HS/HR/ID). Used in AddRecordSheet below header.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('ds-chip-bar-record-selector')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('ds-chip-bar-record-selector') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('ds-chip-bar-record-selector') && (
                        <div className="style-reference-content">
                          <h5>Container: <code>.chip-bar-variant-record</code></h5>
                          <pre>{`padding: 8px 0
border-bottom: 1px solid var(--color-secondary)
flex-shrink: 0
position: sticky
top: 65px
background-color: var(--color-background-shells)
z-index: 9
overflow-x: auto
overflow-y: hidden
scrollbar-width: none`}</pre>
                          
                          <h5>Inner Container: <code>.chip-bar-single-select</code></h5>
                          <pre>{`display: flex
flex-wrap: nowrap
gap: var(--spacing-sm)
align-items: center
padding: 0 0 0 24px
border: none`}</pre>
                          
                          <h5>Chips Used: <code>.ds-chip-single-select</code></h5>
                          <pre>{`See ds-chip-single-select component for styling`}</pre>
                          
                          <h5>Used In:</h5>
                          <pre>{`Components: AddRecordSheet.tsx
Location: Add Record bottom sheet (below header, above form)
Related: ds-chip-single-select component`}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="design-system-section">
                  <h3 className="section-header">Form Inputs</h3>
                  
                  <div className="button-components-demo">
                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        form-text-input
                        <button
                          onClick={() => handleCopyToClipboard('form-text-input')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'form-text-input' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'form-text-input' ? (
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
                      </h4>
                      <div className="component-visualization">
                        <div className="form-text-input">
                          <label className="form-label">Label Name</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Enter label name"
                            value="Sample Text"
                            readOnly
                          />
              </div>
                      </div>
                      <p className="button-demo-description">Standard text input with label. Used for collecting text data like names and descriptions.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('form-text-input')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('form-text-input') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('form-text-input') && (
                        <div className="style-reference-content">
                          <h5>Container: .form-text-input</h5>
                          <pre>{`display: flex
flex-direction: column
gap: var(--spacing-sm)
width: 100%`}</pre>
                          
                          <h5>Label: .form-label</h5>
                          <pre>{`display: block
font-size: 0.875rem
font-weight: 500
color: var(--gray-700)
margin: 0`}</pre>
                          
                          <h5>Input: .form-input</h5>
                          <pre>{`width: 100%
padding: var(--spacing-sm) var(--spacing-md)
background: var(--color-background-components)
border: 1px solid var(--color-background-components)
border-radius: var(--border-radius)
color: var(--gray-800)
font-size: 1rem
font-family: var(--font-family)
transition: border-color 0.2s
box-sizing: border-box`}</pre>
                          
                          <h5>Input:focus</h5>
                          <pre>{`outline: none
border-color: var(--color-accent)`}</pre>
                  </div>
                )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        form-date-selector
                  <button
                          onClick={() => handleCopyToClipboard('form-date-selector')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'form-date-selector' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'form-date-selector' ? (
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
                      </h4>
                      <div className="component-visualization">
                        <div className="form-date-selector">
                          <label className="form-section-headers">Date Range</label>
                          <div className="date-range-container">
                            <div className="date-input-group">
                              <label className="date-label">Start</label>
                              <input
                                type="date"
                                className="date-input"
                                value="2026-01-25"
                                readOnly
                              />
                            </div>
                            <div className="date-input-group">
                              <label className="date-label">End</label>
                              <input
                                type="date"
                                className="date-input"
                                value="2026-01-25"
                                readOnly
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="button-demo-description">Date range selector with start and end dates. Used for defining time periods.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('form-date-selector')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('form-date-selector') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('form-date-selector') && (
                        <div className="style-reference-content">
                          <h5>Container: .form-date-selector</h5>
                          <pre>{`display: flex
flex-direction: column
gap: var(--spacing-sm)
width: 100%`}</pre>
                          
                          <h5>Label: .form-label</h5>
                          <pre>{`display: block
font-size: 0.875rem
font-weight: 500
color: var(--gray-700)
margin: 0`}</pre>
                          
                          <h5>Date Range Container: .date-range-container</h5>
                          <pre>{`display: flex
gap: var(--spacing-md)
width: 100%`}</pre>
                          
                          <h5>Date Input Group: .date-input-group</h5>
                          <pre>{`display: flex
flex-direction: column
gap: 8px
width: calc(100% - 72px)
min-width: 0`}</pre>
                          
                          <h5>Date Label: .date-label</h5>
                          <pre>{`font-size: 0.875rem
font-weight: 500
color: var(--gray-700)`}</pre>
                          
                          <h5>Date Input: .date-input</h5>
                          <pre>{`width: 100%
padding: var(--spacing-sm) var(--spacing-md)
background: var(--color-background-components)
border: 1px solid var(--color-background-components)
border-radius: var(--border-radius)
color: var(--gray-800)
font-size: 1rem
font-family: var(--font-family)
cursor: pointer
transition: border-color 0.2s
box-sizing: border-box`}</pre>
                          
                          <h5>Date Input:focus</h5>
                          <pre>{`outline: none
border-color: var(--color-accent)`}</pre>
                        </div>
                      )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        form-chips-single
                        <button
                          onClick={() => handleCopyToClipboard('form-chips-single')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'form-chips-single' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'form-chips-single' ? (
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
                      </h4>
                      <div className="component-visualization">
                        <div className="form-chips-single">
                          <label className="form-section-headers">Intensity</label>
                          <div className="chip-bar-single-select">
                            <button className="ds-chip-single-select">
                              <span>Heavy</span>
                            </button>
                            <button className="ds-chip-single-select active" style={{ backgroundColor: 'var(--brick)', borderColor: 'var(--brick)' }}>
                              <span>Medium</span>
                            </button>
                            <button className="ds-chip-single-select">
                              <span>Lite</span>
                            </button>
                            <button className="ds-chip-single-select">
                              <span>Spotting</span>
                            </button>
                  </div>
                        </div>
                      </div>
                      <p className="button-demo-description">Single-select chip bar for mutually exclusive options. Used for intensity levels and categories. Includes 3 variants: standard (ds-chip-single-select), mood with icons, toggleable chip bar (calendar filter), and record type selector.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('form-chips-single')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('form-chips-single') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('form-chips-single') && (
                        <div className="style-reference-content">
                          <h5>Container: .form-chips-single</h5>
                          <pre>{`display: flex
flex-direction: column
gap: var(--spacing-sm)
width: 100%`}</pre>
                          
                          <h5>Label: .form-label</h5>
                          <pre>{`display: block
font-size: 0.875rem
font-weight: 500
color: var(--gray-700)
margin: 0`}</pre>
                          
                          <h5>Chip Bar Container: .chip-bar-single-select</h5>
                          <pre>{`display: flex
flex-wrap: wrap
gap: var(--spacing-sm)
align-items: center
padding: 8px
border-bottom: 1px solid var(--color-secondary)

/* Override for form variants */
.form-chips-single .chip-bar-single-select {
  padding: 0;
  border: none;
}`}</pre>
                          
                          <h5>Chip: .ds-chip-single-select</h5>
                          <pre>{`display: inline-flex
align-items: center
gap: 8px
padding: 4px 8px
border-radius: 20px
font-size: 12px
font-weight: 500
font-family: var(--font-family)
border: 2px solid var(--color-secondary)
background: transparent
color: var(--color-secondary)
cursor: pointer
transition: all 0.2s
white-space: nowrap`}</pre>
                          
                          <h5>Chip Active: .ds-chip-single-select.active</h5>
                          <pre>{`color: var(--color-background-white)
/* backgroundColor and borderColor set via inline styles */`}</pre>
                          
                          <h5>Mood Variant Container: .mood-chips</h5>
                          <pre>{`display: flex
flex-wrap: wrap
gap: var(--spacing-sm)
align-items: center`}</pre>
                          
                          <h5>Mood Chip: .mood-chip</h5>
                          <pre>{`display: flex
align-items: center
justify-content: center
width: 48px
height: 48px
border-radius: 50%
border: 2px solid var(--color-secondary)
background: transparent
color: var(--color-secondary)
cursor: pointer
transition: all 0.2s`}</pre>
                          
                          <h5>Mood Chip Active: .mood-chip.active</h5>
                          <pre>{`background-color: var(--color-accent)
border-color: var(--color-accent)
color: var(--color-background-white)`}</pre>
                        </div>
                      )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        form-label-color-picker
                        <button
                          onClick={() => handleCopyToClipboard('form-label-color-picker')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'form-label-color-picker' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'form-label-color-picker' ? (
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
                      </h4>
                      <div className="component-visualization">
                        <div className="form-label-color-picker">
                          <label className="form-label">Label Color</label>
                          <div className="color-picker-grid">
                            <button className="color-circle-small" style={{ backgroundColor: 'var(--brick)' }} />
                            <button className="color-circle-small selected" style={{ backgroundColor: 'var(--coral)' }} />
                            <button className="color-circle-small" style={{ backgroundColor: 'var(--marigold)' }} />
                            <button className="color-circle-small" style={{ backgroundColor: 'var(--turquiose)' }} />
                            <button className="color-circle-small" style={{ backgroundColor: 'var(--sand)' }} />
                            <button className="color-circle-small used" style={{ backgroundColor: 'transparent', borderColor: 'var(--sage)', borderWidth: '2px', borderStyle: 'solid' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18M6 6l12 12"/>
                              </svg>
                            </button>
                            <button className="color-circle-small used" style={{ backgroundColor: 'transparent', borderColor: 'var(--steel)', borderWidth: '2px', borderStyle: 'solid' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="button-demo-description">Color picker grid for selecting label colors. Shows available colors and marks used colors with X. Used in Add Label and Edit Labels modals.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('form-label-color-picker')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('form-label-color-picker') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('form-label-color-picker') && (
                        <div className="style-reference-content">
                          <h5>Container: .form-label-color-picker</h5>
                          <pre>{`display: flex
flex-direction: column
gap: var(--spacing-sm)
width: 100%`}</pre>
                          
                          <h5>Label: .form-label</h5>
                          <pre>{`display: block
font-size: 0.875rem
font-weight: 500
color: var(--gray-700)
margin: 0`}</pre>
                          
                          <h5>Color Grid: .color-picker-grid</h5>
                          <pre>{`display: grid
grid-template-columns: repeat(8, 1fr)
gap: 8px
width: 100%`}</pre>
                          
                          <h5>Color Circle: .color-circle-small</h5>
                          <pre>{`width: 100%
aspect-ratio: 1
border-radius: 50%
border: 2px solid transparent
cursor: pointer
transition: all 0.2s
padding: 0
position: relative
display: flex
align-items: center
justify-content: center`}</pre>
                          
                          <h5>Color Circle Hover: .color-circle-small:hover:not(.used):not(:disabled)</h5>
                          <pre>{`transform: scale(1.1)
border-color: var(--gray-800)`}</pre>
                          
                          <h5>Color Circle Selected: .color-circle-small.selected</h5>
                          <pre>{`border-color: var(--gray-800)
border-width: 3px
box-shadow: 0 0 0 2px var(--color-background-body)`}</pre>
                          
                          <h5>Color Circle Used: .color-circle-small.used</h5>
                          <pre>{`cursor: not-allowed
background: transparent !important
/* borderColor and borderWidth set via inline styles */`}</pre>
                        </div>
                      )}
                    </div>

                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        form-edit-label-header
                        <button
                          onClick={() => handleCopyToClipboard('form-edit-label-header')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'form-edit-label-header' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'form-edit-label-header' ? (
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
                      </h4>
                      <div className="component-visualization">
                        <div className="form-edit-label-header">
                          <input
                            type="text"
                            className="edit-label-input"
                            placeholder="Label name"
                            value="HS"
                            readOnly
                          />
                          <div className="edit-label-actions">
                            <button className="delete-button">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="button-demo-description">Editable label header with delete action. Used in Edit Labels modal for managing individual label items.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('form-edit-label-header')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('form-edit-label-header') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('form-edit-label-header') && (
                        <div className="style-reference-content">
                          <h5>Container: .form-edit-label-header</h5>
                          <pre>{`display: flex
align-items: center
gap: var(--spacing-md)
width: 100%`}</pre>
                          
                          <h5>Input: .edit-label-input</h5>
                          <pre>{`flex: 1
min-width: 0
padding: var(--spacing-sm) var(--spacing-md)
background: var(--color-background-body)
border: 1px solid var(--color-background-components)
border-radius: var(--border-radius)
color: var(--gray-800)
font-size: 1rem
font-family: var(--font-family)
transition: border-color 0.2s`}</pre>
                          
                          <h5>Input:focus</h5>
                          <pre>{`outline: none
border-color: var(--color-accent)`}</pre>
                          
                          <h5>Actions Container: .edit-label-actions</h5>
                          <pre>{`display: flex
align-items: center
flex-shrink: 0`}</pre>
                          
                          <h5>Delete Button: .delete-button</h5>
                          <pre>{`background: transparent
border: none
color: var(--gray-700)
cursor: pointer
padding: 6px
display: flex
align-items: center
justify-content: center
transition: color 0.2s`}</pre>
                          
                          <h5>Delete Button Hover: .delete-button:hover</h5>
                          <pre>{`color: var(--gray-800)`}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="design-system-section">
                  <h3 className="section-header">Headers</h3>
                  
                  <div className="button-components-demo">
                    <div className="button-demo-item">
                      <h4 className="button-demo-label">
                        ds-header
                        <button
                          onClick={() => handleCopyToClipboard('ds-header')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedName === 'ds-header' ? 'var(--color-accent)' : 'var(--gray-700)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s',
                            marginLeft: '8px'
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedName === 'ds-header' ? (
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
                      </h4>
                      <div className="ds-header" style={{ position: 'relative' }}>
                        <h2>Modal Title</h2>
                        <button className="ds-header-close">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <p className="button-demo-description">Standardized header component with title and close button. Used across all modals, bottom sheets, and panels (AddLabelModal, EditLabelsModal, AddRecordSheet, DesignSystemPanel). Includes sticky positioning and consistent spacing.</p>
                      
                      <button
                        className="style-reference-toggle"
                        onClick={() => toggleStyleSection('ds-header')}
                      >
                        <span>Style Reference</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedStyleSections.has('ds-header') ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      
                      {expandedStyleSections.has('ds-header') && (
                        <div className="style-reference-content">
                          <h5>Container: <code>.ds-header</code></h5>
                          <pre>{`display: flex
justify-content: space-between
align-items: center
padding: 16px 24px
border-bottom: 1px solid var(--color-secondary)
flex-shrink: 0
position: sticky
top: 0
background-color: var(--color-background-shells)
z-index: 10`}</pre>
                          
                          <h5>Title: <code>.ds-header h2</code></h5>
                          <pre>{`margin: 0
font-size: 1.5rem
font-weight: 600
color: var(--gray-800)`}</pre>
                          
                          <h5>Close Button: <code>.ds-header-close</code></h5>
                          <pre>{`background: transparent
border: none
color: var(--gray-700)
cursor: pointer
padding: 4px
display: flex
align-items: center
justify-content: center
transition: color 0.2s

.ds-header-close:hover {
  color: var(--gray-800)
}`}</pre>
                          
                          <h5>Icon Size</h5>
                          <pre>{`width: 24px
height: 24px`}</pre>
                          
                          <h5>Used In:</h5>
                          <pre>{`Components:
- AddLabelModal.tsx
- EditLabelsModal.tsx  
- AddRecordSheet.tsx
- DesignSystemPanel.tsx

Usage: Modal and bottom sheet headers`}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              <div className="design-system-actions-bottom-sheet">
                {!showPasswordInput ? (
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
                          stroke="var(--gray-800)"
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
                          stroke="var(--gray-800)"
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
                        color: 'var(--gray-800)',
                        fontFamily: 'var(--font-family)',
                        fontSize: '1rem'
                      }}
                    />
                    <button 
                      type="button"
                      className="ds-button-secondary"
                      onClick={() => {
                        setShowPasswordInput(false);
                        setPassword('');
                      }}
                      style={{
                        width: 'auto',
                        minWidth: '80px'
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
