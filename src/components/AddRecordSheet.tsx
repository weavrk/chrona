import { useState, useEffect } from 'react';
import { X, Laugh, Smile, Meh, Frown, Annoyed, Angry, CheckCircle2, Plus } from 'lucide-react';
import { useDesignSystem } from '../contexts/DesignSystemContext';
import { useAuth } from '../contexts/AuthContext';
import { CustomSelect } from './CustomSelect';
import { SearchableInput } from './SearchableInput';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface AddRecordSheetProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onAdd: (record: RecordData) => void;
  labels: ChipLabel[];
}

export interface RecordData {
  type: string;
  startDate: Date;
  endDate: Date;
  details?: {
    intensity?: string;
    hadBreakout?: boolean;
    severity?: string;
    repeatForward?: boolean;
    includePlacebo?: boolean;
    headache?: boolean;
    mood?: string;
    notes?: string;
    workoutType?: string;
    duration?: number;
    durationUnit?: string;
    treatments?: Array<{
      drugName?: string;
      dose?: number;
      doseUnit?: string;
      frequency?: number;
      frequencyUnit?: string;
    }>;
  };
}

interface HRRecordItem {
  startDate: string;
  endDate: string;
  drugName: string;
  dose: string;
  doseUnit: string;
  frequency: string;
  frequencyUnit: string;
  includePlacebo: boolean;
  repeatForward: boolean;
  headache: boolean;
}

const PERIOD_INTENSITY = ['Heavy', 'Medium', 'Lite', 'Spotting'];
const HSV_INTENSITY = ['Bad', 'Medium', 'Mild'];
const DOSE_UNITS = ['g', 'Mg', 'ml'];
const FREQUENCY_UNITS = ['daily', 'weekly'];
const MOODS = [
  { id: 'light', icon: Laugh, label: 'Energized' },
  { id: 'smile', icon: Smile, label: 'Happy' },
  { id: 'meh', icon: Meh, label: 'Neutral' },
  { id: 'frown', icon: Frown, label: 'Sad' },
  { id: 'annoyed', icon: Annoyed, label: 'Annoyed' },
  { id: 'angry', icon: Angry, label: 'Angry' },
];

export function AddRecordSheet({ isOpen, selectedDate, onClose, onAdd, labels }: AddRecordSheetProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('period');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [intensity, setIntensity] = useState<string>('');
  const [hadBreakout, setHadBreakout] = useState(false);
  const [severity, setSeverity] = useState<string>('');
  const [repeatForward, setRepeatForward] = useState(false);
  const [mood, setMood] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  // HR specific state
  const [hrRecords, setHrRecords] = useState<HRRecordItem[]>([{
    startDate: '',
    endDate: '',
    drugName: '',
    dose: '',
    doseUnit: 'Mg',
    frequency: '',
    frequencyUnit: 'daily',
    includePlacebo: false,
    repeatForward: false,
    headache: false,
  }]);
  const [hrDrugNames, setHrDrugNames] = useState<string[]>([]);
  const [_hrNewDrugName, setHrNewDrugName] = useState<string>('');

  // HS specific state
  const [hsDrugName, setHsDrugName] = useState<string>('');
  const [hsDose, setHsDose] = useState<string>('');
  const [hsDoseUnit, setHsDoseUnit] = useState<string>('Mg');
  const [hsFrequency, setHsFrequency] = useState<string>('');
  const [hsFrequencyUnit, setHsFrequencyUnit] = useState<string>('daily');
  const [hsDrugNames, setHsDrugNames] = useState<string[]>([]);
  const [_hsNewDrugName, setHsNewDrugName] = useState<string>('');

  // Workout specific state
  const [workoutType, setWorkoutType] = useState<string>('');
  const [workoutTypes, setWorkoutTypes] = useState<string[]>([]);
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
      // Set HR records initial date
      if (hrRecords.length > 0 && !hrRecords[0].startDate) {
        setHrRecords([{
          ...hrRecords[0],
          startDate: dateStr,
          endDate: dateStr,
        }]);
      }
    }
  }, [selectedDate]);

  const loadDrugNames = async (type: 'hr' | 'hs'): Promise<string[]> => {
    if (!user) return [];
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/drug-names-${type}-${user.username}.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error(`Failed to load ${type} drug names:`, error);
    }
    return [];
  };

  const loadWorkoutTypes = async (): Promise<string[]> => {
    if (!user) return [];
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/workout-type-wo-${user.username}.json?t=${Date.now()}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        }
      }
      return [];
    } catch (error) {
      // File doesn't exist yet or network error - return empty array silently
      return [];
    }
  };

  // Load workout types when workout is selected
  useEffect(() => {
    if (selectedType === 'workout' && user) {
      loadWorkoutTypes().then(setWorkoutTypes);
    }
  }, [selectedType, user]);

  // Load drug names
  useEffect(() => {
    if (user && isOpen) {
      loadDrugNames('hr').then(setHrDrugNames);
      loadDrugNames('hs').then(setHsDrugNames);
    }
  }, [user, isOpen]);

  const saveDrugName = async (type: 'hr' | 'hs', drugName: string) => {
    if (!drugName.trim() || !user) return;
    
    const currentDrugs = type === 'hr' ? hrDrugNames : hsDrugNames;
    if (currentDrugs.includes(drugName.trim())) return;

    const updatedDrugs = [...currentDrugs, drugName.trim()];
    
    try {
      const response = await fetch(`/api/save_drug_names.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, type, drugNames: updatedDrugs }),
      });

      if (response.ok) {
        if (type === 'hr') {
          setHrDrugNames(updatedDrugs);
          setHrNewDrugName('');
        } else {
          setHsDrugNames(updatedDrugs);
          setHsNewDrugName('');
        }
      }
    } catch (error) {
      console.error(`Failed to save ${type} drug name:`, error);
    }
  };

  const saveWorkoutType = async (workoutTypeName: string) => {
    if (!workoutTypeName.trim() || !user) return;
    
    if (workoutTypes.includes(workoutTypeName.trim())) return;

    const updatedTypes = [...workoutTypes, workoutTypeName.trim()];
    
    try {
      const response = await fetch(`/api/save_workout_types.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, workoutTypes: updatedTypes }),
      });

      if (response.ok) {
        setWorkoutTypes(updatedTypes);
      }
    } catch (error) {
      console.error('Failed to save workout type:', error);
    }
  };

  const handleAdd = () => {
    if (!selectedDate || isAdding) return;

    const record: RecordData = {
      type: selectedType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      details: {},
    };

    if (selectedType === 'period') {
      record.details!.intensity = intensity;
    } else if (selectedType === 'hormone-replacement-therapy') {
      record.details!.treatments = hrRecords
        .filter(r => r.startDate && r.endDate && r.drugName)
        .map(r => ({
          drugName: r.drugName,
          dose: r.dose ? parseFloat(r.dose) : undefined,
          doseUnit: r.doseUnit,
          frequency: r.frequency ? parseFloat(r.frequency) : undefined,
          frequencyUnit: r.frequencyUnit,
        }));
      record.details!.repeatForward = hrRecords.some(r => r.repeatForward);
      record.details!.includePlacebo = hrRecords.some(r => r.includePlacebo);
      record.details!.headache = hrRecords.some(r => r.headache);
    } else if (selectedType === 'hsv') {
      record.details!.hadBreakout = hadBreakout;
      if (hadBreakout) {
        record.details!.severity = severity;
      }
      if (hsDrugName) {
        record.details!.treatments = [{
          drugName: hsDrugName,
          dose: hsDose ? parseFloat(hsDose) : undefined,
          doseUnit: hsDoseUnit,
          frequency: hsFrequency ? parseFloat(hsFrequency) : undefined,
          frequencyUnit: hsFrequencyUnit,
        }];
      }
      record.details!.repeatForward = repeatForward;
    } else if (selectedType === 'mental-health') {
      record.details!.mood = mood;
      record.details!.notes = notes;
    } else if (selectedType === 'workout') {
      record.details!.workoutType = workoutType;
      record.details!.duration = duration ? parseFloat(duration) : undefined;
      record.details!.durationUnit = 'minutes';
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
    setHadBreakout(false);
    setSeverity('');
    setRepeatForward(false);
    setMood('');
    setNotes('');
    setHrRecords([{
      startDate: '',
      endDate: '',
      drugName: '',
      dose: '',
      doseUnit: 'Mg',
      frequency: '',
      frequencyUnit: 'daily',
      includePlacebo: false,
      repeatForward: false,
      headache: false,
    }]);
    setHsDrugName('');
    setHsDose('');
    setHsFrequency('');
    setWorkoutType('');
    setDuration('');
    setIsAdding(false);
    onClose();
  };

  const addHrRecord = () => {
    const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
    setHrRecords([...hrRecords, {
      startDate: dateStr,
      endDate: dateStr,
      drugName: '',
      dose: '',
      doseUnit: 'Mg',
      frequency: '',
      frequencyUnit: 'daily',
      includePlacebo: false,
      repeatForward: false,
      headache: false,
    }]);
  };

  const updateHrRecord = (index: number, field: keyof HRRecordItem, value: any) => {
    setHrRecords(hrRecords.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const { tokens } = useDesignSystem();
  
  const getLabelColor = (colorName: string): string => {
    return (tokens as any)[colorName] || '#B3B3B3';
  };

  // Filter labels to only include default record types for the selector
  // Maintain order: period, hormone-replacement-therapy, hsv, mental-health, workout
  const DEFAULT_RECORD_TYPE_IDS = ['period', 'hormone-replacement-therapy', 'hsv', 'mental-health', 'workout'];
  const RECORD_TYPES = DEFAULT_RECORD_TYPE_IDS
    .map(id => labels.find(label => label.id === id))
    .filter((label): label is ChipLabel => label !== undefined)
    .map(label => ({
      id: label.id,
      label: label.label,
      color: getLabelColor(label.color),
      defaultColor: label.color
    }));

  if (!isOpen || !selectedDate) return null;

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={handleClose} />
      <div className="bottom-sheet">
        <div className="ds-header">
          <h2>Add Record</h2>
          <button className="ds-header-close" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        {/* Record Type Nav Tabs */}
        <div className="ds-nav-tab-bar-container">
          <div className="ds-nav-tab-bar">
              {RECORD_TYPES.map((type) => (
                <button
                  key={type.id}
                className={`ds-nav-tab ${selectedType === type.id ? 'active' : ''}`}
                  style={
                    selectedType === type.id
                    ? { '--active-bg': type.color } as React.CSSProperties
                    : undefined
                  }
                  onClick={() => {
                    setSelectedType(type.id);
                    setIntensity('');
                    setMood('');
                  setSeverity('');
                  setHadBreakout(false);
                  }}
                >
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

        <div className="bottom-sheet-content">
          {/* Period */}
          {selectedType === 'period' && (
            <>
          <div className="form-date-selector">
            <label className="form-section-headers">Date Range</label>
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
            <div className="form-chips-single">
              <label className="form-section-headers">Intensity</label>
              <div className="chip-bar-single-select">
                {PERIOD_INTENSITY.map((level) => (
                  <button
                    key={level}
                      className={`ds-chip-single-select-md ${intensity === level ? 'active' : ''}`}
                    onClick={() => setIntensity(intensity === level ? '' : level)}
                    style={intensity === level ? { backgroundColor: 'var(--brick)', borderColor: 'var(--brick)' } : undefined}
                  >
                    <span>{level}</span>
                  </button>
                ))}
              </div>
            </div>
            </>
          )}

          {/* Hormone Replacement Therapy */}
          {selectedType === 'hormone-replacement-therapy' && (
            <>
              {hrRecords.map((record, index) => (
                <div key={index} className="record-item" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="form-date-selector">
                    <label className="form-section-headers">Date Range</label>
                    <div className="date-range-container">
                      <div className="date-input-group">
                        <label className="date-label">Start</label>
                        <input
                          type="date"
                          value={record.startDate}
                          onChange={(e) => updateHrRecord(index, 'startDate', e.target.value)}
                          className="date-input"
                        />
                      </div>
                      <div className="date-input-group">
                        <label className="date-label">End</label>
                        <input
                          type="date"
                          value={record.endDate}
                          onChange={(e) => updateHrRecord(index, 'endDate', e.target.value)}
                          className="date-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="form-section-headers">Treatment</label>
                    
                    <div className="form-text-input">
                      <label className="form-label">Drug Name</label>
                      <SearchableInput
                        value={record.drugName}
                        options={hrDrugNames}
                        onChange={(value) => updateHrRecord(index, 'drugName', value)}
                        onBlur={() => {
                          if (record.drugName.trim() && !hrDrugNames.includes(record.drugName.trim())) {
                            saveDrugName('hr', record.drugName.trim());
                          }
                        }}
                        placeholder="Enter drug name"
                        color="var(--ocean)"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                      <div className="form-text-input" style={{ flex: 1 }}>
                        <label className="form-label">Dose</label>
                        <input
                          type="number"
                          value={record.dose}
                          onChange={(e) => updateHrRecord(index, 'dose', e.target.value)}
                          className="form-input"
                          placeholder="0"
                        />
                      </div>
                      <div className="form-input-dropdown" style={{ flex: 1 }}>
                        <label className="form-label">Unit</label>
                        <CustomSelect
                          value={record.doseUnit}
                          options={DOSE_UNITS}
                          onChange={(value) => updateHrRecord(index, 'doseUnit', value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                      <div className="form-text-input" style={{ flex: 1 }}>
                        <label className="form-label">Frequency</label>
                        <input
                          type="number"
                          value={record.frequency}
                          onChange={(e) => updateHrRecord(index, 'frequency', e.target.value)}
                          className="form-input"
                          placeholder="0"
                        />
                      </div>
                      <div className="form-input-dropdown" style={{ flex: 1 }}>
                        <label className="form-label">Unit</label>
                        <CustomSelect
                          value={record.frequencyUnit}
                          options={FREQUENCY_UNITS}
                          onChange={(value) => updateHrRecord(index, 'frequencyUnit', value)}
                        />
                      </div>
                    </div>

                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={record.includePlacebo}
                          onChange={(e) => updateHrRecord(index, 'includePlacebo', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span>Include Placebo Week</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={record.repeatForward}
                          onChange={(e) => updateHrRecord(index, 'repeatForward', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span>Repeat Forward</span>
                      </label>
                    </div>
                  </div>

                  <div className="form-section">
                    <label className="form-section-headers">Symptoms</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={record.headache}
                          onChange={(e) => updateHrRecord(index, 'headache', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span>Headache</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="ds-button-secondary"
                onClick={addHrRecord}
                style={{ 
                  width: '100%',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--gray-800)'
                }}
              >
                <Plus size={16} style={{ marginRight: 'var(--spacing-sm)' }} />
                Add Record
              </button>
            </>
          )}

          {/* HSV */}
          {selectedType === 'hsv' && (
            <>
              <div className="form-date-selector">
                <label className="form-section-headers">Date Range</label>
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

            <div className="form-section">
                <label className="form-section-headers">Breakout</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hadBreakout}
                      onChange={(e) => {
                        setHadBreakout(e.target.checked);
                        if (!e.target.checked) setSeverity('');
                      }}
                      className="checkbox-input"
                    />
                    <span>Had Breakout</span>
                  </label>

                  <div className="form-chips-single">
                    <div className="chip-bar-single-select">
                      {HSV_INTENSITY.map((level) => (
                        <button
                          key={level}
                          className={`ds-chip-single-select-md ${severity === level ? 'active' : ''}`}
                          onClick={() => {
                            if (hadBreakout) {
                              setSeverity(severity === level ? '' : level);
                            }
                          }}
                          disabled={!hadBreakout}
                          style={
                            !hadBreakout
                              ? { opacity: 0.5, cursor: 'not-allowed' }
                              : severity === level
                              ? { backgroundColor: 'var(--sand)', borderColor: 'var(--sand)' }
                              : undefined
                          }
                        >
                          <span>{level}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            <div className="form-section">
                <label className="form-section-headers">Treatment</label>
                
                <div className="form-text-input">
                  <label className="form-label">Drug Name</label>
                  <SearchableInput
                    value={hsDrugName}
                    options={hsDrugNames}
                    onChange={setHsDrugName}
                    onBlur={() => {
                      if (hsDrugName.trim() && !hsDrugNames.includes(hsDrugName.trim())) {
                        saveDrugName('hs', hsDrugName.trim());
                      }
                    }}
                    placeholder="Enter drug name"
                    color="var(--sand)"
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  <div className="form-text-input" style={{ flex: 1 }}>
                    <label className="form-label">Dose</label>
                    <input
                      type="number"
                      value={hsDose}
                      onChange={(e) => setHsDose(e.target.value)}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-input-dropdown" style={{ flex: 1 }}>
                    <label className="form-label">Unit</label>
                    <CustomSelect
                      value={hsDoseUnit}
                      options={DOSE_UNITS}
                      onChange={(value) => setHsDoseUnit(value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  <div className="form-text-input" style={{ flex: 1 }}>
                    <label className="form-label">Frequency</label>
                    <input
                      type="number"
                      value={hsFrequency}
                      onChange={(e) => setHsFrequency(e.target.value)}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-input-dropdown" style={{ flex: 1 }}>
                    <label className="form-label">Unit</label>
                    <CustomSelect
                      value={hsFrequencyUnit}
                      options={FREQUENCY_UNITS}
                      onChange={(value) => setHsFrequencyUnit(value)}
                    />
                  </div>
                </div>

              <div className="checkbox-group">
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
            </>
          )}

          {/* Mental Health */}
          {selectedType === 'mental-health' && (
            <>
              <div className="form-date-selector">
                <label className="form-section-headers">Date Range</label>
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

            <div className="form-chips-single">
              <label className="form-section-headers">Mood</label>
              <div className="mood-chips">
                {MOODS.map((moodItem) => (
                  <button
                    key={moodItem.id}
                    className={`mood-chip ${mood === moodItem.id ? 'active' : ''}`}
                    onClick={() => setMood(mood === moodItem.id ? '' : moodItem.id)}
                    title={moodItem.label}
                  >
                    <moodItem.icon size={24} />
                  </button>
                ))}
              </div>
            </div>

              <div className="form-textarea" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <label className="form-label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                  placeholder="Enter notes..."
                  style={{ 
                    flex: 1,
                    minHeight: '200px',
                    resize: 'none'
                  }}
                />
              </div>
            </>
          )}

          {/* Workout */}
          {selectedType === 'workout' && (
            <>
              <div className="form-date-selector">
                <label className="form-section-headers">Date Range</label>
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

              <div className="form-section">
                <div className="form-text-input">
                  <label className="form-label">Type</label>
                  <SearchableInput
                    value={workoutType}
                    options={workoutTypes}
                    onChange={setWorkoutType}
                    onBlur={() => {
                      if (workoutType.trim() && !workoutTypes.includes(workoutType.trim())) {
                        saveWorkoutType(workoutType.trim());
                      }
                    }}
                    placeholder="Enter workout type"
                    color={(() => {
                      const workoutLabel = labels.find(l => l.id === 'workout');
                      return workoutLabel ? getLabelColor(workoutLabel.color) : '#B3B3B3';
                    })()}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                  <div className="form-text-input" style={{ flex: 1 }}>
                    <label className="form-label">Duration</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="form-input"
                      placeholder="0"
                    />
                  </div>
                  <div className="form-input-dropdown" style={{ flex: 1 }}>
                    <label className="form-label">Unit</label>
                    <CustomSelect
                      value="minutes"
                      options={['minutes']}
                      onChange={() => {}}
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </>
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
