import { useState, useEffect } from 'react';
import { X, CheckCircle2, Plus } from 'lucide-react';
import { useDesignSystem } from '../contexts/DesignSystemContext';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface AddLabelModalProps {
  isOpen: boolean;
  existingLabels: ChipLabel[];
  onClose: () => void;
  onSave: (label: string, color: string) => void;
}

export function AddLabelModal({ isOpen, existingLabels, onClose, onSave }: AddLabelModalProps) {
  const { tokens, updateTokens } = useDesignSystem();
  const [labelName, setLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorValue, setNewColorValue] = useState('#000000');

  // Get palette colors from design tokens (exclude grays and semantic colors)
  const getPaletteColors = () => {
    const paletteKeys = Object.keys(tokens).filter(key => {
      if (key.startsWith('gray-')) return false;
      if (key.startsWith('cyan-') || key.startsWith('green-') || key.startsWith('yellow-') || key.startsWith('magenta-')) return false;
      if (['brand-primary', 'primary', 'secondary', 'tertiary', 'accent', 'accent-2', 'accent-3', 'accent-4', 'button-primary', 'background-body', 'background-shells', 'background-components', 'background-footer', 'background-white'].includes(key)) return false;
      const value = (tokens as any)[key];
      return typeof value === 'string' && value.startsWith('#');
    });
    
    return paletteKeys.map(key => ({
      name: key,
      value: (tokens as any)[key] as string
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  const PRIMITIVE_COLORS = getPaletteColors();

  // Get colors already used by existing labels
  const usedColors = new Set(existingLabels.map(label => label.color));

  useEffect(() => {
    if (isOpen) {
      setLabelName('');
      setSelectedColor('');
      setIsSaving(false);
      setShowAddColor(false);
      setNewColorName('');
      setNewColorValue('#000000');
    }
  }, [isOpen]);

  const handleAddNewColor = () => {
    if (!newColorName.trim() || !newColorValue) return;
    
    const colorKey = newColorName.trim().toLowerCase().replace(/\s+/g, '-');
    updateTokens({ [colorKey]: newColorValue } as any);
    setSelectedColor(colorKey);
    setShowAddColor(false);
    setNewColorName('');
    setNewColorValue('#000000');
  };

  const handleSave = () => {
    if (!labelName.trim() || !selectedColor) return;

    setIsSaving(true);
    onSave(labelName.trim(), selectedColor);
    
    setTimeout(() => {
      setIsSaving(false);
      onClose();
      setLabelName('');
      setSelectedColor('');
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add Label</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body modal-body-add-label">
          <div className="form-group form-group-text">
            <label className="form-label">Label Name</label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className="form-input"
              placeholder="Enter label name"
              style={{ color: 'var(--gray-800)' }}
            />
          </div>

          <div className="form-group form-group-color">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label">Label Color</label>
              <button
                onClick={() => setShowAddColor(!showAddColor)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-secondary)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: 'var(--color-secondary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={14} />
                Add Color
              </button>
            </div>
            
            {showAddColor && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--color-background-components)', 
                borderRadius: '8px', 
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="Color name (e.g., 'ocean')"
                  style={{
                    padding: '8px',
                    background: 'var(--color-background-body)',
                    border: '1px solid var(--color-background-components)',
                    borderRadius: '4px',
                    color: 'var(--color-primary)',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={newColorValue}
                    onChange={(e) => setNewColorValue(e.target.value)}
                    style={{ width: '40px', height: '40px', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={newColorValue}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{6}$/i.test(e.target.value)) {
                        setNewColorValue(e.target.value);
                      }
                    }}
                    placeholder="#000000"
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'var(--color-background-body)',
                      border: '1px solid var(--color-background-components)',
                      borderRadius: '4px',
                      color: 'var(--color-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                  <button
                    onClick={handleAddNewColor}
                    disabled={!newColorName.trim() || !newColorValue}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--color-accent)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--color-background-white)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      opacity: (!newColorName.trim() || !newColorValue) ? 0.5 : 1
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="color-picker">
              {PRIMITIVE_COLORS.sort((a, b) => {
                const aUsed = usedColors.has(a.name);
                const bUsed = usedColors.has(b.name);
                if (aUsed === bUsed) return 0;
                return aUsed ? 1 : -1;
              }).map((color) => {
                const isUsed = usedColors.has(color.name);
                const isSelected = selectedColor === color.name;
                return (
                  <button
                    key={color.name}
                    className={`color-circle ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
                    style={
                      isUsed
                        ? {
                            backgroundColor: 'transparent',
                            borderColor: color.value,
                            borderWidth: '2px',
                            borderStyle: 'solid',
                          }
                        : {
                            backgroundColor: color.value,
                          }
                    }
                    onClick={() => {
                      if (!isUsed) {
                        setSelectedColor(color.name);
                      }
                    }}
                    disabled={isUsed}
                    title={isUsed ? 'Already used by another label' : color.name}
                  >
                    {isUsed && <X size={12} style={{ color: color.value }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="ds-button-primary"
            onClick={handleSave}
            disabled={!labelName.trim() || !selectedColor || isSaving}
          >
            {isSaving ? (
              <CheckCircle2 size={24} className="checkmark-animation" />
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
