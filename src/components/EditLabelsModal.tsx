import { useState, useEffect } from 'react';
import { X as XIcon, Trash2, CheckCircle2 } from 'lucide-react';
import { useDesignSystem } from '../contexts/DesignSystemContext';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface EditLabelsModalProps {
  isOpen: boolean;
  labels: ChipLabel[];
  onClose: () => void;
  onSave: (labels: ChipLabel[]) => void;
}

export function EditLabelsModal({ isOpen, labels, onClose, onSave }: EditLabelsModalProps) {
  const { tokens } = useDesignSystem();
  const [editedLabels, setEditedLabels] = useState<ChipLabel[]>(labels);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  useEffect(() => {
    if (isOpen) {
      setEditedLabels(labels);
      setDeletingId(null);
      setIsSaving(false);
    }
  }, [isOpen, labels]);

  const handleLabelChange = (id: string, field: 'label' | 'color', value: string) => {
    setEditedLabels(prev =>
      prev.map(label =>
        label.id === id ? { ...label, [field]: value } : label
      )
    );
  };

  const handleDeleteClick = (id: string) => {
    if (deletingId === id) {
      // Confirm delete
      setEditedLabels(prev => prev.filter(label => label.id !== id));
      setDeletingId(null);
    } else {
      // Show confirm
      setDeletingId(id);
    }
  };

  const handleCancelDelete = () => {
    setDeletingId(null);
  };

  const handleSave = () => {
    setIsSaving(true);
    onSave(editedLabels);
    
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  const handleClose = () => {
    // Reset to original labels without saving
    setEditedLabels(labels);
    setDeletingId(null);
    onClose();
  };

  // Get colors already used by other labels
  const getUsedColors = (currentId: string) => {
    return new Set(
      editedLabels
        .filter(label => label.id !== currentId)
        .map(label => label.color)
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} />
      <div className="modal-content">
        <div className="ds-header">
          <h2>Edit Labels</h2>
          <button className="ds-header-close" onClick={handleClose}>
            <XIcon size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="edit-labels-list">
            {editedLabels.map((label) => {
              const usedColors = getUsedColors(label.id);
              const isDeleting = deletingId === label.id;
              
              return (
                <div key={label.id} className="edit-label-row">
                  {/* form-edit-label-header */}
                  <div className="form-edit-label-header">
                    <input
                      type="text"
                      value={label.label}
                      onChange={(e) => handleLabelChange(label.id, 'label', e.target.value)}
                      className="edit-label-input"
                      placeholder="Label name"
                    />
                    
                    <div className="edit-label-actions">
                    {isDeleting ? (
                      <div className="delete-confirm">
                        <button
                          className="delete-confirm-button confirm"
                          onClick={() => handleDeleteClick(label.id)}
                        >
                          Confirm
                        </button>
                        <button
                          className="delete-confirm-button cancel"
                          onClick={handleCancelDelete}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteClick(label.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  </div>
                  
                  {/* form-label-color-picker */}
                  <div className="form-label-color-picker">
                    <label className="form-label">Color</label>
                    
                    <div className="color-picker-grid">
                    {PRIMITIVE_COLORS.sort((a, b) => {
                      const aUsed = usedColors.has(a.name);
                      const bUsed = usedColors.has(b.name);
                      if (aUsed === bUsed) return 0;
                      return aUsed ? 1 : -1;
                    }).map((color) => {
                      const isUsed = usedColors.has(color.name);
                      const isSelected = label.color === color.name;
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
                              handleLabelChange(label.id, 'color', color.name);
                            }
                          }}
                          disabled={isUsed}
                          title={isUsed ? 'Already used by another label' : color.name}
                        >
                          {isUsed && <XIcon size={10} style={{ color: color.value }} />}
                        </button>
                      );
                    })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="ds-button-primary"
            onClick={handleSave}
            disabled={isSaving}
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
