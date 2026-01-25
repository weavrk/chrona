import React, { useState } from 'react';
import { X, Laugh, Smile, Meh, Frown, Annoyed, Angry, CheckCircle2 } from 'lucide-react';

interface AddRecordSheetProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAdd: (record: RecordData) => void;
}

export interface RecordData {
  type: string;
  startDate: Date;
  endDate: Date;
  details?: {
    intensity?: string;
    includePlacebo?: boolean;
    repeatForward?: boolean;
    mood?: string;
  };
}

const RECORD_TYPES = [
  { id: 'period', label: 'PE', color: '#F06292' },
  { id: 'hsv', label: 'HS', color: '#FFD54F' },
  { id: 'pill', label: 'HR', color: '#7EC8E3' },
  { id: 'mental', label: 'ID', color: '#B3B3B3' },
];

const PERIOD_INTENSITY = ['Heavy', 'Medium', 'Lite', 'Spotting'];
const HSV_INTENSITY = ['Bad', 'Medium', 'Mild'];
const MOODS = [
  { id: 'light', icon: Laugh, label: 'Energized' },
  { id: 'smile', icon: Smile, label: 'Happy' },
  { id: 'meh', icon: Meh, label: 'Neutral' },
  { id: 'frown', icon: Frown, label: 'Sad' },
  { id: 'annoyed', icon: Annoyed, label: 'Annoyed' },
  { id: 'angry', icon: Angry, label: 'Angry' },
];

export function AddRecordSheet({ isOpen, selectedDate, onClose, onAdd }: AddRecordSheetProps) {
  const [selectedType, setSelectedType] = useState<string>('period');
  const [startDate, setStartDate] = useState<string>(
    selectedDate ? selectedDate.toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState<string>(
    selectedDate ? selectedDate.toISOString().split('T')[0] : ''
  );
  const [intensity, setIntensity] = useState<string>('');
  const [includePlacebo, setIncludePlacebo] = useState(false);
  const [repeatForward, setRepeatForward] = useState(false);
  const [mood, setMood] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  React.useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    }
  }, [selectedDate]);

  const handleAdd = () => {
    if (!selectedDate || isAdding) return;

    const record: RecordData = {
      type: selectedType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      details: {},
    };

    if (selectedType === 'period' || selectedType === 'hsv') {
      record.details!.intensity = intensity;
    } else if (selectedType === 'pill') {
      record.details!.includePlacebo = includePlacebo;
      record.details!.repeatForward = repeatForward;
    } else if (selectedType === 'mental') {
      record.details!.mood = mood;
    }

    onAdd(record);
    setIsAdding(true);
    
    setTimeout(() => {
      handleClose();
      setIsAdding(false);
    }, 500);
  };

  const handleClose = () => {
    // Reset form
    setSelectedType('period');
    setIntensity('');
    setIncludePlacebo(false);
    setRepeatForward(false);
    setMood('');
    setIsAdding(false);
    onClose();
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-header">
          <h2>Add Record</h2>
          <button className="bottom-sheet-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className="bottom-sheet-content">
          {/* Record Type Chips */}
          <div className="form-section">
            <div className="chip-bar-single-select">
              {RECORD_TYPES.map((type) => (
                <button
                  key={type.id}
                  className={`ds-chip-single-select ${selectedType === type.id ? 'active' : ''}`}
                  style={
                    selectedType === type.id
                      ? { backgroundColor: type.color, borderColor: type.color, color: 'var(--color-primary)' }
                      : { color: type.color, borderColor: type.color }
                  }
                  onClick={() => {
                    setSelectedType(type.id);
                    setIntensity('');
                    setMood('');
                  }}
                >
                  <span style={selectedType === type.id ? { color: 'var(--color-primary)' } : undefined}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="form-section">
            <label className="form-label">Date Range</label>
            <div className="date-range-container">
              <div className="date-input-group">
                <label className="date-label">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label className="date-label">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          </div>

          {/* Custom Section based on Type */}
          {selectedType === 'period' && (
            <div className="form-section">
              <label className="form-label">Intensity</label>
              <div className="chip-bar-single-select">
                {PERIOD_INTENSITY.map((level) => (
                  <button
                    key={level}
                    className={`ds-chip-single-select ${intensity === level ? 'active' : ''}`}
                    onClick={() => setIntensity(level)}
                    style={intensity === level ? { backgroundColor: '#F06292', borderColor: '#F06292', color: 'var(--color-primary)' } : undefined}
                  >
                    <span style={intensity === level ? { color: 'var(--color-primary)' } : undefined}>{level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedType === 'hsv' && (
            <div className="form-section">
              <label className="form-label">Severity</label>
              <div className="chip-bar-single-select">
                {HSV_INTENSITY.map((level) => (
                  <button
                    key={level}
                    className={`ds-chip-single-select ${intensity === level ? 'active' : ''}`}
                    onClick={() => setIntensity(level)}
                    style={intensity === level ? { backgroundColor: '#f5ed94', borderColor: '#f5ed94', color: 'var(--color-primary)' } : undefined}
                  >
                    <span style={intensity === level ? { color: 'var(--color-primary)' } : undefined}>{level}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedType === 'pill' && (
            <div className="form-section">
              <label className="form-label">Options</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includePlacebo}
                    onChange={(e) => setIncludePlacebo(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span>Include Placebo Week</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={repeatForward}
                    onChange={(e) => setRepeatForward(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span>Repeat Forward</span>
                </label>
              </div>
            </div>
          )}

          {selectedType === 'mental' && (
            <div className="form-section">
              <label className="form-label">Mood</label>
              <div className="mood-chips">
                {MOODS.map((moodItem) => (
                  <button
                    key={moodItem.id}
                    className={`mood-chip ${mood === moodItem.id ? 'active' : ''}`}
                    onClick={() => setMood(moodItem.id)}
                    title={moodItem.label}
                  >
                    <moodItem.icon size={24} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bottom-sheet-actions">
          <button className="ds-button-primary" onClick={handleAdd} disabled={isAdding}>
            {isAdding ? (
              <CheckCircle2 size={24} className="checkmark-animation" />
            ) : (
              'Add'
            )}
          </button>
        </div>
      </div>
    </>
  );
}

