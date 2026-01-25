import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, ChevronDown } from 'lucide-react';
import { useDesignSystem } from '../contexts/DesignSystemContext';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface GlobalLabel {
  id: string;
  name: string;
  abbreviation: string;
}

interface AddLabelModalProps {
  isOpen: boolean;
  existingLabels: ChipLabel[];
  onClose: () => void;
  onSave: (label: string, color: string) => void;
}

export function AddLabelModal({ isOpen, existingLabels, onClose, onSave }: AddLabelModalProps) {
  const { tokens } = useDesignSystem();
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');
  const [globalLabels, setGlobalLabels] = useState<GlobalLabel[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load global labels
  useEffect(() => {
    if (isOpen) {
      loadGlobalLabels();
    }
  }, [isOpen]);

  const loadGlobalLabels = async () => {
    try {
      const response = await fetch(`/data/label-list-global.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setGlobalLabels(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load global labels:', error);
    }
  };

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
      setSelectedLabelId('');
      setSelectedColor('');
      setIsSaving(false);
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSave = () => {
    const selectedLabel = globalLabels.find(l => l.id === selectedLabelId);
    if (!selectedLabel || !selectedColor) return;

    setIsSaving(true);
    onSave(selectedLabel.name, selectedColor);
    
    setTimeout(() => {
      setIsSaving(false);
      onClose();
      setSelectedLabelId('');
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
          {/* form-input-dropdown */}
          <div className="form-input-dropdown" ref={dropdownRef}>
            <label className="form-label">Label Name</label>
            <div className="custom-dropdown-wrapper">
              <button
                type="button"
                className="custom-dropdown-trigger"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedLabelId ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginRight: 'var(--spacing-sm)' }}>
                    <span>{globalLabels.find(l => l.id === selectedLabelId)?.name}</span>
                    <span style={{ 
                      color: (() => {
                        const selectedLabel = globalLabels.find(l => l.id === selectedLabelId);
                        const existingLabel = existingLabels.find(l => l.id === selectedLabelId);
                        if (existingLabel) {
                          return (tokens as any)[existingLabel.color] || '#B3B3B3';
                        } else if (selectedLabel && (selectedLabel as any).defaultColor) {
                          return (tokens as any)[(selectedLabel as any).defaultColor] || '#B3B3B3';
                        }
                        return '#B3B3B3';
                      })(),
                      fontSize: '14px',
                      fontWeight: 800
                    }}>
                      {globalLabels.find(l => l.id === selectedLabelId)?.abbreviation}
                    </span>
                  </div>
                ) : (
                  <span>Select a label</span>
                )}
                <ChevronDown size={16} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
              </button>
              {isDropdownOpen && (
                <div className="custom-dropdown-menu">
                  {globalLabels.map((label) => {
                    // Use the label's default color from global labels, or from user's existing labels if already added
                    const existingLabel = existingLabels.find(l => l.id === label.id);
                    let abbreviationColor = '#B3B3B3';
                    
                    if (existingLabel) {
                      // If user has this label, use their assigned color
                      abbreviationColor = (tokens as any)[existingLabel.color] || '#B3B3B3';
                    } else if ((label as any).defaultColor) {
                      // Otherwise use the default color from global labels
                      abbreviationColor = (tokens as any)[(label as any).defaultColor] || '#B3B3B3';
                    }
                    
                    return (
                      <button
                        key={label.id}
                        type="button"
                        className={`custom-dropdown-item ${selectedLabelId === label.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedLabelId(label.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <span>{label.name}</span>
                        <span style={{ color: abbreviationColor, fontSize: '14px', fontWeight: 800 }}>{label.abbreviation}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
            disabled={!selectedLabelId || !selectedColor || isSaving}
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
