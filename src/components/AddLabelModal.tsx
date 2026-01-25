import { useState, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

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

// Get primitive colors excluding gray series
const PRIMITIVE_COLORS = [
  { name: 'steel', value: '#577E89' },
  { name: 'teal', value: '#5B95A5' },
  { name: 'sage', value: '#6F9F9C' },
  { name: 'sand', value: '#DEC484' },
  { name: 'amber', value: '#E1A36F' },
  { name: 'coral', value: '#F7AD97' },
  { name: 'brick', value: '#C75B5B' },
];

export function AddLabelModal({ isOpen, existingLabels, onClose, onSave }: AddLabelModalProps) {
  const [labelName, setLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

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
            />
          </div>

          <div className="form-group form-group-color">
            <label className="form-label">Label Color</label>
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

