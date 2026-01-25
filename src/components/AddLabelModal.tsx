import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
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
  const { tokens } = useDesignSystem();
  const [labelName, setLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

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
    }
  }, [isOpen]);

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
        <div className="ds-header">
          <h2>Add Label</h2>
          <button className="ds-header-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body modal-body-add-label">
          {/* form-text-input */}
          <div className="form-text-input">
            <label className="form-label">Label Name</label>
            <input
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className="form-input"
              placeholder="Enter label name"
            />
          </div>

          {/* form-label-color-picker */}
          <div className="form-label-color-picker">
            <label className="form-label">Label Color</label>
            
            <div className="color-picker-grid">
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
                    className={`color-circle-small ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
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
