import { useState, useEffect, useRef } from 'react';
import { X, Laugh, Smile, Meh, Frown, Annoyed, Angry, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useDesignSystem } from '../contexts/DesignSystemContext';
import { useAuth } from '../contexts/AuthContext';
import { CustomSelect } from './CustomSelect';
import { SearchableInput } from './SearchableInput';
import { IOSDatePicker } from './IOSDatePicker';
import '../styles/ios-date-picker.css';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface AddRecordSheetProps {
  isOpen: boolean;
  selectedDate: Date | null;
  editingRecords?: any[] | null;
  editingRecordType?: string | null;
  allRecords?: Record<string, any[]>;
  onClose: () => void;
  onAdd: (record: RecordData, recordDate: Date) => void;
  onAddMultiple?: (records: RecordData[], recordDate: Date) => void;
  onDelete?: (recordType: string, startDate: Date, endDate: Date, recordId?: string, deleteFutureEvents?: boolean) => void;
  labels: ChipLabel[];
}

export interface RecordData {
  type: string;
  startDate: Date;
  endDate: Date;
  isParent?: boolean;
  parentId?: string;
  manuallyEdited?: boolean;
  details?: {
    intensity?: string;
    hadBreakout?: boolean;
    severity?: string;
    locations?: string[];
    warningSign?: boolean;
    repeatForward?: boolean;
    repeatEndDate?: string;
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
  id?: string;
  startDate: string;
  endDate: string;
  drugName: string;
  dose: string;
  doseUnit: string;
  frequency: string;
  frequencyUnit: string;
  includePlacebo: boolean;
  repeatForward: boolean;
  repeatEndDate?: string;
  headache: boolean;
}

interface WorkoutRecordItem {
  id?: string;
  startDate: string;
  endDate: string;
  workoutType: string;
  duration: string;
}

const PERIOD_INTENSITY = ['Heavy', 'Medium', 'Lite', 'Spotting'];
const HSV_INTENSITY = ['Bad', 'Medium', 'Mild'];
const HSV_LOCATIONS = ['Upper Lip', 'Lower Lip', 'Cheek', 'Nose'];
const DOSE_UNITS = ['pill', 'g', 'Mg', 'ml'];
const FREQUENCY_UNITS = ['daily', 'weekly'];
const MOODS = [
  { id: 'light', icon: Laugh, label: 'Energized' },
  { id: 'smile', icon: Smile, label: 'Happy' },
  { id: 'meh', icon: Meh, label: 'Neutral' },
  { id: 'frown', icon: Frown, label: 'Sad' },
  { id: 'annoyed', icon: Annoyed, label: 'Annoyed' },
  { id: 'angry', icon: Angry, label: 'Angry' },
];

export function AddRecordSheet({ isOpen, selectedDate, editingRecords, editingRecordType, allRecords, onClose, onAdd, onAddMultiple, onDelete, labels }: AddRecordSheetProps) {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('period');
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [hasFutureEvents, setHasFutureEvents] = useState(false);
  
  // Get the color for the current record type
  const getCurrentColor = () => {
    const currentLabel = labels.find(label => label.id === selectedType);
    return currentLabel?.color || 'gray-600';
  };
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [intensity, setIntensity] = useState<string>('');
  const [hadBreakout, setHadBreakout] = useState(false);
  const [severity, setSeverity] = useState<string>('');
  const [warningSign, setWarningSign] = useState(false);
  const [repeatForward, setRepeatForward] = useState(false);
  const [repeatEndDate, setRepeatEndDate] = useState<string>('');
  const [mood, setMood] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // HR specific state
  const [hrRecords, setHrRecords] = useState<HRRecordItem[]>([{
    startDate: '',
    endDate: '',
    drugName: '',
    dose: '',
    doseUnit: 'pill',
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
  const [hsDoseUnit, setHsDoseUnit] = useState<string>('pill');
  const [hsFrequency, setHsFrequency] = useState<string>('');
  const [hsFrequencyUnit, setHsFrequencyUnit] = useState<string>('daily');
  const [hsLocations, setHsLocations] = useState<string[]>([]);
  const [hsDrugNames, setHsDrugNames] = useState<string[]>([]);
  const [_hsNewDrugName, setHsNewDrugName] = useState<string>('');

  // Workout specific state
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecordItem[]>([{
    startDate: '',
    endDate: '',
    workoutType: '',
    duration: '',
  }]);
  const [workoutTypes, setWorkoutTypes] = useState<string[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize dates when sheet opens - use a previous ref to track the last selectedDate we initialized with
  const lastInitializedDate = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && selectedDate && !editingRecords) {
      const dateToUse = new Date(selectedDate);
      dateToUse.setHours(0, 0, 0, 0);
      const dateStr = formatLocalDate(dateToUse);
      
      // Only initialize if this is a different date than last time, or if we haven't initialized yet
      if (lastInitializedDate.current !== dateStr) {
        
      setStartDate(dateStr);
      setEndDate(dateStr);
        
        // Set HR records initial date
        setHrRecords([{
          startDate: dateStr,
          endDate: dateStr,
          drugName: '',
          dose: '',
          doseUnit: 'pill',
          frequency: '',
          frequencyUnit: 'daily',
          includePlacebo: false,
          repeatForward: false,
          headache: false,
        }]);
        
        // Set workout records initial date
        setWorkoutRecords([{
          startDate: dateStr,
          endDate: dateStr,
          workoutType: '',
          duration: '',
        }]);
        
        lastInitializedDate.current = dateStr;
      }
    } else if (!isOpen) {
      // Reset when sheet closes
      lastInitializedDate.current = null;
    }
  }, [isOpen, selectedDate, editingRecords]);

  // Check if a record exists for the selected date and type
  useEffect(() => {
    const checkExistingRecord = async () => {
      if (!user || !selectedDate || !isOpen) {
        setHasExistingRecord(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
        if (response.ok) {
          const records: Record<string, any[]> = await response.json();
          const dateStr = formatLocalDate(selectedDate);
          const dateRecords = records[dateStr] || [];
          
          // Check if any record matches the selected type
          const hasRecord = dateRecords.some((record: any) => record.type === selectedType);
          setHasExistingRecord(hasRecord);
        } else {
          setHasExistingRecord(false);
        }
      } catch (error) {
        console.error('Failed to check existing record:', error);
        setHasExistingRecord(false);
      }
    };

    checkExistingRecord();
  }, [user, selectedDate, selectedType, isOpen]);

  // Prepopulate form when editingRecords is provided (ALL records for the date)
  useEffect(() => {
    if (isOpen && selectedDate && editingRecords && editingRecords.length > 0) {
      const dateStr = formatLocalDate(selectedDate);
      
      // Group records by type
      const recordsByType = new Map<string, any[]>();
      editingRecords.forEach((record: any) => {
        const type = record.type;
        if (!recordsByType.has(type)) {
          recordsByType.set(type, []);
        }
        recordsByType.get(type)!.push(record);
      });
      
      // Populate Period records (single record only)
      const periodRecords = recordsByType.get('period') || [];
      if (periodRecords.length > 0) {
        const firstRecord = periodRecords[0];
        setIntensity(firstRecord?.data?.intensity || '');
      } else {
        setIntensity('');
      }
      
      // Populate HR records (multiple allowed)
      const hrRecordsData = recordsByType.get('hormone-replacement-therapy') || [];
      if (hrRecordsData.length > 0) {
        const hrItems: HRRecordItem[] = hrRecordsData.map((rec: any) => ({
          id: rec.id,
          startDate: dateStr,
          endDate: dateStr,
          drugName: rec.data?.treatments?.[0]?.drugName || '',
          dose: rec.data?.treatments?.[0]?.dose?.toString() || '',
          doseUnit: rec.data?.treatments?.[0]?.doseUnit || 'pill',
          frequency: rec.data?.treatments?.[0]?.frequency?.toString() || '',
          frequencyUnit: rec.data?.treatments?.[0]?.frequencyUnit || 'daily',
          includePlacebo: rec.data?.includePlacebo || false,
          repeatForward: rec.data?.repeatForward || false,
          repeatEndDate: rec.data?.repeatEndDate || '',
          headache: rec.data?.headache || false,
        }));
        setHrRecords(hrItems);
      } else {
        setHrRecords([{
          startDate: dateStr,
          endDate: dateStr,
          drugName: '',
          dose: '',
          doseUnit: 'pill',
          frequency: '',
          frequencyUnit: 'daily',
          includePlacebo: false,
          repeatForward: false,
          repeatEndDate: '',
          headache: false,
        }]);
      }
      
      // Populate HSV records (single record only)
      const hsvRecords = recordsByType.get('hsv') || [];
      if (hsvRecords.length > 0) {
        const firstRecord = hsvRecords[0];
        setHadBreakout(firstRecord?.data?.hadBreakout || false);
        setSeverity(firstRecord?.data?.severity || '');
        setHsLocations(firstRecord?.data?.locations || []);
        setWarningSign(firstRecord?.data?.warningSign || false);
        setHsDrugName(firstRecord?.data?.treatments?.[0]?.drugName || '');
        setHsDose(firstRecord?.data?.treatments?.[0]?.dose?.toString() || '');
        setHsDoseUnit(firstRecord?.data?.treatments?.[0]?.doseUnit || 'pill');
        setHsFrequency(firstRecord?.data?.treatments?.[0]?.frequency?.toString() || '');
        setHsFrequencyUnit(firstRecord?.data?.treatments?.[0]?.frequencyUnit || 'daily');
        setRepeatForward(firstRecord?.data?.repeatForward || false);
        setRepeatEndDate(firstRecord?.data?.repeatEndDate || '');
      } else {
        setHadBreakout(false);
        setSeverity('');
        setHsLocations([]);
        setWarningSign(false);
        setHsDrugName('');
        setHsDose('');
        setHsFrequency('');
        setRepeatForward(false);
        setRepeatEndDate('');
      }
      
      // Populate Mental Health records (single record only)
      const mentalHealthRecords = recordsByType.get('mental-health') || [];
      if (mentalHealthRecords.length > 0) {
        const firstRecord = mentalHealthRecords[0];
        setMood(firstRecord?.data?.mood || '');
        setNotes(firstRecord?.data?.notes || '');
      } else {
        setMood('');
        setNotes('');
      }
      
      // Populate Workout records (multiple allowed)
      const workoutRecordsData = recordsByType.get('workout') || [];
      if (workoutRecordsData.length > 0) {
        const woItems: WorkoutRecordItem[] = workoutRecordsData.map((rec: any) => ({
          id: rec.id,
          startDate: dateStr,
          endDate: dateStr,
          workoutType: rec.data?.workoutType || '',
          duration: rec.data?.duration?.toString() || '',
        }));
        setWorkoutRecords(woItems);
      } else {
        setWorkoutRecords([{
          startDate: dateStr,
          endDate: dateStr,
          workoutType: '',
          duration: '',
        }]);
      }
      
      setHasExistingRecord(true);
      
      // If editingRecordType is provided, switch to that tab
      if (editingRecordType) {
        setSelectedType(editingRecordType);
      }
    } else if (isOpen && (!editingRecords || editingRecords.length === 0)) {
      // Reset form for new record if no editing data
      const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
      setIntensity('');
      setHadBreakout(false);
      setSeverity('');
      setRepeatForward(false);
      setRepeatEndDate('');
      setMood('');
      setNotes('');
      setHrRecords([{
        startDate: dateStr,
        endDate: dateStr,
        drugName: '',
        dose: '',
        doseUnit: 'pill',
        frequency: '',
        frequencyUnit: 'daily',
        includePlacebo: false,
        repeatForward: false,
        headache: false,
      }]);
      setHsDrugName('');
      setHsDose('');
      setHsFrequency('');
      setWorkoutRecords([{
        startDate: dateStr,
        endDate: dateStr,
        workoutType: '',
        duration: '',
      }]);
      setHasExistingRecord(false);
    }
  }, [editingRecords, editingRecordType, isOpen, selectedDate]);

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
    if (!workoutTypeName.trim() || !user) {
      console.warn('Cannot save workout type: missing workoutTypeName or user');
      return;
    }
    
    if (workoutTypes.includes(workoutTypeName.trim())) {
      console.log('Workout type already exists:', workoutTypeName.trim());
      return;
    }

    const updatedTypes = [...workoutTypes, workoutTypeName.trim()];
    
    try {
      const response = await fetch(`/api/save_workout_types.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, workoutTypes: updatedTypes }),
      });

      if (response.ok) {
        console.log('Workout type saved successfully:', workoutTypeName.trim(), 'for user:', user.username);
        setWorkoutTypes(updatedTypes);
      } else {
        const error = await response.json();
        console.error('Failed to save workout type:', error);
      }
    } catch (error) {
      console.error('Failed to save workout type:', error);
    }
  };

  const handleAdd = () => {
    if (isAdding) return;

    // For HR and workout, we need to save multiple records
    // For other types, save a single record
    if (selectedType === 'hormone-replacement-therapy') {
      // Collect all HR records to save
      const recordsToSave: RecordData[] = hrRecords
        .filter(r => r.startDate && r.endDate && r.drugName)
        .map((hrRecord) => {
          // Parse dates correctly in local timezone (not UTC)
          const [startYear, startMonth, startDay] = hrRecord.startDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = hrRecord.endDate.split('-').map(Number);

    const record: RecordData = {
      type: selectedType,
            startDate: new Date(startYear, startMonth - 1, startDay),
            endDate: new Date(endYear, endMonth - 1, endDay),
            details: {
              treatments: [{
                drugName: hrRecord.drugName,
                dose: hrRecord.dose ? parseFloat(hrRecord.dose) : undefined,
                doseUnit: hrRecord.doseUnit,
                frequency: hrRecord.frequency ? parseFloat(hrRecord.frequency) : undefined,
                frequencyUnit: hrRecord.frequencyUnit,
              }],
              repeatForward: hrRecord.repeatForward,
              repeatEndDate: hrRecord.repeatEndDate,
              includePlacebo: hrRecord.includePlacebo,
              headache: hrRecord.headache,
            },
          };
          // Pass the record ID if editing
          if (hrRecord.id) {
            (record as any).id = hrRecord.id;
          }
          return record;
        });
      
      if (onAddMultiple && recordsToSave.length > 0) {
        const recordDate = new Date(recordsToSave[0].startDate);
        onAddMultiple(recordsToSave, recordDate);
      } else if (recordsToSave.length > 0) {
        // Fallback to single add if onAddMultiple not available
        recordsToSave.forEach((record) => {
          const recordDate = new Date(record.startDate);
          onAdd(record, recordDate);
        });
      }
    } else if (selectedType === 'workout') {
      // Collect all workout records to save
      const recordsToSave: RecordData[] = workoutRecords
        .filter(r => r.startDate && r.endDate && r.workoutType)
        .map((woRecord) => {
          // Parse dates correctly in local timezone (not UTC)
          const [startYear, startMonth, startDay] = woRecord.startDate.split('-').map(Number);
          const [endYear, endMonth, endDay] = woRecord.endDate.split('-').map(Number);
          
          const record: RecordData = {
            type: selectedType,
            startDate: new Date(startYear, startMonth - 1, startDay),
            endDate: new Date(endYear, endMonth - 1, endDay),
            details: {
              workoutType: woRecord.workoutType,
              duration: woRecord.duration ? parseFloat(woRecord.duration) : undefined,
              durationUnit: 'minutes',
            },
          };
          // Pass the record ID if editing
          if (woRecord.id) {
            (record as any).id = woRecord.id;
          }
          return record;
        });
      
      if (onAddMultiple && recordsToSave.length > 0) {
        const recordDate = new Date(recordsToSave[0].startDate);
        onAddMultiple(recordsToSave, recordDate);
      } else if (recordsToSave.length > 0) {
        // Fallback to single add if onAddMultiple not available
        recordsToSave.forEach((record) => {
          const recordDate = new Date(record.startDate);
          onAdd(record, recordDate);
        });
      }
    } else {
      // Single record types
      // Parse dates correctly in local timezone (not UTC)
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      
      const record: RecordData = {
        type: selectedType,
        startDate: new Date(startYear, startMonth - 1, startDay),
        endDate: new Date(endYear, endMonth - 1, endDay),
      details: {},
    };

      if (selectedType === 'period') {
      record.details!.intensity = intensity;
      } else if (selectedType === 'hsv') {
        record.details!.hadBreakout = hadBreakout;
        if (hadBreakout) {
          record.details!.severity = severity;
          record.details!.locations = hsLocations;
        }
        record.details!.warningSign = warningSign;
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
      if (repeatEndDate) {
        record.details!.repeatEndDate = repeatEndDate;
      }
      } else if (selectedType === 'mental-health') {
      record.details!.mood = mood;
        record.details!.notes = notes;
      }

      // Pass the record ID if editing
      if (editingRecords && editingRecords[0]?.id) {
        (record as any).id = editingRecords[0].id;
      }

      const [recordYear, recordMonth, recordDay] = startDate.split('-').map(Number);
      const recordDate = new Date(recordYear, recordMonth - 1, recordDay);
      onAdd(record, recordDate);
    }

    setIsAdding(true);
    // Don't call handleClose here - onAdd/onAddMultiple will handle closing and reloading
  };

  const checkForFutureEvents = (specificRecordId?: string) => {
    console.log('=== CHECK FOR FUTURE EVENTS ===');
    console.log('allRecords:', allRecords);
    console.log('editingRecords:', editingRecords);
    console.log('selectedDate:', selectedDate);
    console.log('specificRecordId:', specificRecordId);
    
    if (!allRecords || !selectedDate) {
      console.log('Missing allRecords or selectedDate');
      return false;
    }

    const currentDateStr = formatLocalDate(selectedDate);
    let recordIdToCheck: string | undefined;
    
    // If a specific record ID is provided (for inline delete), use that
    if (specificRecordId) {
      // Find the record to check if it's a parent or has a parent
      for (const dateKey of Object.keys(allRecords)) {
        const foundRecord = allRecords[dateKey].find((r: any) => r.id === specificRecordId);
        if (foundRecord) {
          recordIdToCheck = foundRecord.isParent ? foundRecord.id : foundRecord.parentId;
          console.log('Found record for specificRecordId:', foundRecord);
          console.log('recordIdToCheck:', recordIdToCheck);
          break;
        }
      }
    } else if (editingRecords && editingRecords.length > 0) {
      // Use the first editing record
      const currentRecord = editingRecords[0];
      recordIdToCheck = currentRecord.isParent ? currentRecord.id : currentRecord.parentId;
      console.log('Using editingRecords[0]:', currentRecord);
      console.log('recordIdToCheck:', recordIdToCheck);
    }
    
    // Fallback for legacy records without explicit parent fields:
    // if we still don't have a recordIdToCheck, use the record's own id
    if (!recordIdToCheck) {
      if (specificRecordId) {
        recordIdToCheck = specificRecordId;
        console.log('Fallback recordIdToCheck from specificRecordId:', recordIdToCheck);
      } else if (editingRecords && editingRecords.length > 0 && editingRecords[0].id) {
        recordIdToCheck = editingRecords[0].id;
        console.log('Fallback recordIdToCheck from editingRecords[0].id:', recordIdToCheck);
      }
    }
    
    if (!recordIdToCheck) {
      console.log('No recordIdToCheck found');
      return false;
    }
    
    // Check if there are future records with the same parent/record ID
    for (const dateKey of Object.keys(allRecords)) {
      if (dateKey > currentDateStr) {
        const futureRecords = allRecords[dateKey].filter((r: any) => 
          r.id === recordIdToCheck || r.parentId === recordIdToCheck
        );
        if (futureRecords.length > 0) {
          console.log('Found future records on', dateKey, ':', futureRecords);
          return true;
        }
      }
    }
    
    console.log('No future events found');
    return false;
  };

  const handleDelete = () => {
    if (!selectedDate || !onDelete || isDeleting) return;

    console.log('=== HANDLE DELETE ===');
    console.log('selectedType:', selectedType);
    console.log('editingRecords:', editingRecords);
    
    // Check if there are future events
    const futureEventsExist = checkForFutureEvents();
    
    if (futureEventsExist && !showDeletePrompt) {
      console.log('Future events exist, showing prompt');
      setHasFutureEvents(true);
      setShowDeletePrompt(true);
      return;
    }
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const recordId = editingRecords && editingRecords.length > 0 ? editingRecords[0].id : undefined;
    
    // If we got here after showing the prompt, delete future events
    const shouldDeleteFuture = showDeletePrompt && hasFutureEvents;
    
    console.log('Calling onDelete with:', { selectedType, startDateObj, endDateObj, recordId, deleteFuture: shouldDeleteFuture });
    
    setIsDeleting(true);
    setShowDeletePrompt(false);
    setHasFutureEvents(false);
    onDelete(selectedType, startDateObj, endDateObj, recordId, shouldDeleteFuture);
    // Don't close here - let the delete function handle reload
  };
  
  const handleInlineRecordDelete = (recordId: string, recordType: string, recordStartDate: string, recordEndDate: string) => {
    console.log('=== HANDLE INLINE RECORD DELETE ===');
    console.log('recordId:', recordId);
    console.log('recordType:', recordType);
    console.log('showDeletePrompt:', showDeletePrompt);
    
    if (!onDelete) return;
    
    // Check if there are future events for this specific record
    const futureEventsExist = checkForFutureEvents(recordId);
    
    if (futureEventsExist && !showDeletePrompt) {
      console.log('Future events exist for inline delete, showing prompt');
      setHasFutureEvents(true);
      setShowDeletePrompt(true);
      // Store the record details for the prompt
      (window as any).__pendingDelete = { recordId, recordType, recordStartDate, recordEndDate };
      return;
    }
    
    // If we got here after the prompt, this means user answered the prompt
    // The prompt handlers will take care of calling onDelete
    // This path should only be reached if there are no future events
    if (!futureEventsExist) {
      const startDateObj = new Date(recordStartDate);
      const endDateObj = new Date(recordEndDate);
      
      console.log('No future events, calling onDelete directly:', { recordType, startDateObj, endDateObj, recordId });
      
      setIsDeleting(true);
      setConfirmingDeleteId(null);
      onDelete(recordType, startDateObj, endDateObj, recordId, false);
      // Don't close here - let the delete function handle reload
    }
  };

  const handleClose = () => {
    // Reset form
    setSelectedType('period');
    setIntensity('');
    setHadBreakout(false);
    setSeverity('');
    setRepeatForward(false);
    setRepeatEndDate('');
    setMood('');
    setNotes('');
    setHrRecords([{
      startDate: '',
      endDate: '',
      drugName: '',
      dose: '',
      doseUnit: 'pill',
      frequency: '',
      frequencyUnit: 'daily',
      includePlacebo: false,
      repeatForward: false,
      headache: false,
    }]);
    setHsDrugName('');
    setHsDose('');
    setHsFrequency('');
    setIsAdding(false);
    setHasExistingRecord(false);
    setIsDeleting(false);
    onClose();
  };

  const addHrRecord = () => {
    const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
    setHrRecords([...hrRecords, {
      startDate: dateStr,
      endDate: dateStr,
      drugName: '',
      dose: '',
      doseUnit: 'pill',
      frequency: '',
      frequencyUnit: 'daily',
      includePlacebo: false,
      repeatForward: false,
      repeatEndDate: '',
      headache: false,
    }]);
  };

  const addWorkoutRecord = () => {
    const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
    setWorkoutRecords([...workoutRecords, {
      startDate: dateStr,
      endDate: dateStr,
      workoutType: '',
      duration: '',
    }]);
  };

  const updateWorkoutRecord = (index: number, field: keyof WorkoutRecordItem, value: any) => {
    const updated = [...workoutRecords];
    updated[index] = { ...updated[index], [field]: value };
    setWorkoutRecords(updated);
  };

  const deleteWorkoutRecord = (index: number) => {
    if (workoutRecords.length > 1) {
      setWorkoutRecords(workoutRecords.filter((_, i) => i !== index));
    }
  };

  const updateHrRecord = (index: number, field: keyof HRRecordItem, value: any) => {
    setHrRecords(hrRecords.map((r, i) => {
      if (i === index) {
        const updated = { ...r, [field]: value };
        // If startDate is changed, set endDate to equal startDate
        if (field === 'startDate') {
          updated.endDate = value;
        }
        return updated;
      }
      return r;
    }));
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
          <div className="form-date-selector" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-section-headers" style={{ marginBottom: 0 }}>Date Range</label>
            </div>
            <div className="date-range-container">
              <div className="date-input-group">
                            <IOSDatePicker
                  value={startDate}
                              onChange={(newStartDate) => {
                                setStartDate(newStartDate);
                                setEndDate(newStartDate);
                              }}
                              label="Start"
                              className="date-input-group"
                />
              </div>
              <div className="date-input-group">
                            <IOSDatePicker
                  value={endDate}
                              onChange={setEndDate}
                              label="End"
                              className="date-input-group"
                />
              </div>
            </div>
          </div>
            <div className="form-chips-single period-intensity">
              <label className="form-section-headers">Intensity</label>
              <div className="chip-bar-single-select">
                {PERIOD_INTENSITY.map((level) => (
                  <button
                    key={level}
                      className={`ds-chip-single-select-md ${intensity === level ? 'active' : ''}`}
                    onClick={() => setIntensity(intensity === level ? '' : level)}
                    style={intensity === level ? { backgroundColor: `var(--${getCurrentColor()})`, borderColor: `var(--${getCurrentColor()})` } : undefined}
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
                <div key={record.id || index} className="record-item" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="form-date-selector" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-section-headers" style={{ marginBottom: 0 }}>Date Range</label>
                      {hrRecords.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {confirmingDeleteId === (record.id || `hr-${index}`) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (record.id && onDelete) {
                                    handleInlineRecordDelete(record.id, 'hormone-replacement-therapy', record.startDate, record.endDate);
                                  } else {
                                    setHrRecords(hrRecords.filter((_, i) => i !== index));
                                    setConfirmingDeleteId(null);
                                  }
                                }}
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '4px 8px', 
                                  background: 'var(--color-destructive, #dc2626)', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '4px 8px', 
                                  background: 'transparent', 
                                  color: 'var(--gray-700)', 
                                  border: '1px solid var(--gray-300)', 
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(record.id || `hr-${index}`)}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={16} style={{ color: 'var(--color-destructive, #dc2626)' }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="date-range-container">
                      <div className="date-input-group">
                        <IOSDatePicker
                          value={record.startDate}
                          onChange={(newStartDate) => {
                            updateHrRecord(index, 'startDate', newStartDate);
                            updateHrRecord(index, 'endDate', newStartDate);
                          }}
                          label="Start"
                          className="date-input-group"
                        />
                      </div>
                      <div className="date-input-group">
                        <IOSDatePicker
                          value={record.endDate}
                          onChange={(newEndDate) => updateHrRecord(index, 'endDate', newEndDate)}
                          label="End"
                          className="date-input-group"
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

                    <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' }}>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={record.repeatForward}
                            onChange={(e) => updateHrRecord(index, 'repeatForward', e.target.checked)}
                            className="checkbox-input"
                          />
                          <span>Repeat Forward</span>
                        </label>
                        {record.repeatForward && (
                          <div style={{ width: '50%' }}>
                            <IOSDatePicker
                              value={record.repeatEndDate || ''}
                              onChange={(date) => updateHrRecord(index, 'repeatEndDate', date)}
                              label="End"
                              className="date-input-group"
                            />
                          </div>
                        )}
                      </div>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={record.includePlacebo}
                          onChange={(e) => updateHrRecord(index, 'includePlacebo', e.target.checked)}
                          className="checkbox-input"
                        />
                        <span>Include Placebo Week</span>
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
              <div className="form-date-selector" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-section-headers" style={{ marginBottom: 0 }}>Date Range</label>
                </div>
                <div className="date-range-container">
              <div className="date-input-group">
                <IOSDatePicker
                  value={startDate}
                  onChange={(newStartDate) => {
                    setStartDate(newStartDate);
                    setEndDate(newStartDate);
                  }}
                  label="Start"
                  className="date-input-group"
                />
              </div>
              <div className="date-input-group">
                <IOSDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  label="End"
                  className="date-input-group"
                />
              </div>
                </div>
              </div>

            <div className="form-section">
                <label className="form-section-headers">Breakout</label>
                
                <div className="hsv-breakout-container">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hadBreakout}
                      onChange={(e) => {
                        setHadBreakout(e.target.checked);
                        if (!e.target.checked) {
                          setSeverity('');
                          setHsLocations([]);
                        }
                      }}
                      className="checkbox-input"
                    />
                    <span>Had Breakout</span>
                  </label>

            <div className="form-chips-single">
                    <label className="form-section-subheader">Severity</label>
              <div className="chip-bar-single-select">
                {HSV_INTENSITY.map((level) => (
                        <button
                          key={level}
                          className={`ds-chip-single-select-md ${severity === level ? 'active' : ''}`}
                          onClick={() => {
                            // Auto-enable "Had Breakout" if not already checked
                            if (!hadBreakout) {
                              setHadBreakout(true);
                            }
                            setSeverity(severity === level ? '' : level);
                          }}
                          style={
                            severity === level
                              ? { backgroundColor: `var(--${getCurrentColor()})`, borderColor: `var(--${getCurrentColor()})` }
                              : undefined
                          }
                        >
                    <span>{level}</span>
                  </button>
                ))}
              </div>
            </div>

                  <div className="form-chips-single">
                    <label className="form-section-subheader">Location</label>
                    <div className="chip-bar-single-select">
                      {HSV_LOCATIONS.map((location) => (
                        <button
                          key={location}
                          className={`ds-chip-md ${hsLocations.includes(location) ? 'active' : ''}`}
                          onClick={() => {
                            // Auto-enable "Had Breakout" if not already checked
                            if (!hadBreakout) {
                              setHadBreakout(true);
                            }
                            setHsLocations(prev => 
                              prev.includes(location)
                                ? prev.filter(l => l !== location)
                                : [...prev, location]
                            );
                          }}
                          style={
                            hsLocations.includes(location)
                              ? { backgroundColor: `var(--${getCurrentColor()})`, borderColor: `var(--${getCurrentColor()})` }
                              : undefined
                          }
                        >
                          <span>{location}</span>
                          {hsLocations.includes(location) ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={warningSign}
                      onChange={(e) => setWarningSign(e.target.checked)}
                      className="checkbox-input"
                    />
                    <span>Warning Sign</span>
                  </label>
                </div>
              </div>

              {/* Close hsv-breakout-container */}
              

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

              <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'center' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={repeatForward}
                      onChange={(e) => setRepeatForward(e.target.checked)}
                      className="checkbox-input"
                    />
                    <span>Repeat Forward</span>
                  </label>
                  {repeatForward && (
                    <div style={{ width: '50%' }}>
                      <IOSDatePicker
                        value={repeatEndDate}
                        onChange={setRepeatEndDate}
                        label="End"
                        className="date-input-group"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
          )}

          {/* Mental Health */}
          {selectedType === 'mental-health' && (
            <>
              <div className="form-date-selector" style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-section-headers" style={{ marginBottom: 0 }}>Date Range</label>
                </div>
                <div className="date-range-container">
              <div className="date-input-group">
                <IOSDatePicker
                  value={startDate}
                  onChange={(newStartDate) => {
                    setStartDate(newStartDate);
                    setEndDate(newStartDate);
                  }}
                  label="Start"
                  className="date-input-group"
                />
              </div>
              <div className="date-input-group">
                <IOSDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  label="End"
                  className="date-input-group"
                />
              </div>
                </div>
              </div>

            <div className="form-chips-single mental-health-mood">
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
                    minHeight: '120px',
                    resize: 'none'
                  }}
                />
              </div>
            </>
          )}

          {/* Workout */}
          {selectedType === 'workout' && (
            <>
              {workoutRecords.map((record, index) => (
                <div key={record.id || index} className="record-item" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="form-date-selector" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-section-headers" style={{ marginBottom: 0 }}>Date Range</label>
                      {workoutRecords.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {confirmingDeleteId === (record.id || `wo-${index}`) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (record.id && onDelete) {
                                    handleInlineRecordDelete(record.id, 'workout', record.startDate, record.endDate);
                                  } else {
                                    deleteWorkoutRecord(index);
                                    setConfirmingDeleteId(null);
                                  }
                                }}
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '4px 8px', 
                                  background: 'var(--color-destructive, #dc2626)', 
                                  color: 'white', 
                                  border: 'none', 
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDeleteId(null)}
                                style={{ 
                                  fontSize: '12px', 
                                  padding: '4px 8px', 
                                  background: 'transparent', 
                                  color: 'var(--gray-700)', 
                                  border: '1px solid var(--gray-300)', 
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(record.id || `wo-${index}`)}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={16} style={{ color: 'var(--color-destructive, #dc2626)' }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="date-range-container">
                      <div className="date-input-group">
                        <IOSDatePicker
                          value={record.startDate}
                          onChange={(newStartDate) => {
                            updateWorkoutRecord(index, 'startDate', newStartDate);
                            updateWorkoutRecord(index, 'endDate', newStartDate);
                          }}
                          label="Start"
                          className="date-input-group"
                        />
                      </div>
                      <div className="date-input-group">
                        <IOSDatePicker
                          value={record.endDate}
                          onChange={(newEndDate) => updateWorkoutRecord(index, 'endDate', newEndDate)}
                          label="End"
                          className="date-input-group"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <div className="form-text-input">
                      <label className="form-label">Type</label>
                      <SearchableInput
                        id={`workout-type-input-${index}`}
                        value={record.workoutType}
                        options={workoutTypes}
                        onChange={(value) => updateWorkoutRecord(index, 'workoutType', value)}
                        onBlur={() => {
                          const inputElement = document.getElementById(`workout-type-input-${index}`) as HTMLInputElement;
                          const currentValue = inputElement?.value?.trim() || record.workoutType.trim();
                          if (currentValue && !workoutTypes.includes(currentValue)) {
                            saveWorkoutType(currentValue);
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
                          value={record.duration}
                          onChange={(e) => updateWorkoutRecord(index, 'duration', e.target.value)}
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
                </div>
              ))}
              <button
                className="ds-button-secondary"
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--gray-800)' }}
                onClick={addWorkoutRecord}
              >
                <Plus size={16} style={{ marginRight: 'var(--spacing-sm)' }} />
                Add Record
              </button>
            </>
          )}
        </div>

        <div className="bottom-sheet-actions">
          <button className="ds-button-primary" onClick={handleAdd} disabled={isAdding || isDeleting}>
            {isAdding ? (
              <CheckCircle2 size={24} className="checkmark-animation" />
            ) : (
              'Save Record'
            )}
          </button>
          {hasExistingRecord && onDelete && (
            <>
              {showDeletePrompt ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <p style={{ fontSize: '14px', color: 'var(--gray-700)', margin: 0, textAlign: 'center' }}>
                    Update all Future Events?
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="ds-button-destructive" 
                      onClick={() => {
                        console.log('User clicked YES to delete future events');
                        // Check if this is an inline delete
                        const pendingDelete = (window as any).__pendingDelete;
                        if (pendingDelete && onDelete) {
                          const startDateObj = new Date(pendingDelete.recordStartDate);
                          const endDateObj = new Date(pendingDelete.recordEndDate);
                          console.log('Processing pending inline delete with future events');
                          setIsDeleting(true);
                          setConfirmingDeleteId(null);
                          setShowDeletePrompt(false);
                          setHasFutureEvents(false);
                          (window as any).__pendingDelete = null;
                          onDelete(pendingDelete.recordType, startDateObj, endDateObj, pendingDelete.recordId, true);
                          // Don't close here - let the delete function handle reload
                        } else {
                          // Bottom delete button - explicitly pass deleteFutureEvents=true
                          const startDateObj = new Date(startDate);
                          const endDateObj = new Date(endDate);
                          const recordId = editingRecords && editingRecords.length > 0 ? editingRecords[0].id : undefined;
                          console.log('Bottom delete YES - calling onDelete with deleteFutureEvents=true:', { selectedType, startDateObj, endDateObj, recordId });
                          setIsDeleting(true);
                          setShowDeletePrompt(false);
                          setHasFutureEvents(false);
                          if (onDelete) {
                            onDelete(selectedType, startDateObj, endDateObj, recordId, true);
                          }
                          // Don't close here - let the delete function handle reload
                        }
                      }} 
                      disabled={isDeleting}
                      style={{ flex: 1 }}
                    >
                      Yes
                    </button>
                    <button 
                      className="ds-button-secondary" 
                      onClick={() => {
                        console.log('User clicked NO to delete only this event');
                        // Check if this is an inline delete
                        const pendingDelete = (window as any).__pendingDelete;
                        if (pendingDelete && onDelete) {
                          const startDateObj = new Date(pendingDelete.recordStartDate);
                          const endDateObj = new Date(pendingDelete.recordEndDate);
                          console.log('Processing pending inline delete without future events');
                          setIsDeleting(true);
                          setConfirmingDeleteId(null);
                          setShowDeletePrompt(false);
                          setHasFutureEvents(false);
                          (window as any).__pendingDelete = null;
                          onDelete(pendingDelete.recordType, startDateObj, endDateObj, pendingDelete.recordId, false);
                          // Don't close here - let the delete function handle reload
                        } else {
                          // Bottom delete button - explicitly pass deleteFutureEvents=false
                          const startDateObj = new Date(startDate);
                          const endDateObj = new Date(endDate);
                          const recordId = editingRecords && editingRecords.length > 0 ? editingRecords[0].id : undefined;
                          console.log('Bottom delete NO - calling onDelete with deleteFutureEvents=false:', { selectedType, startDateObj, endDateObj, recordId });
                          setIsDeleting(true);
                          setShowDeletePrompt(false);
                          setHasFutureEvents(false);
                          if (onDelete) {
                            onDelete(selectedType, startDateObj, endDateObj, recordId, false);
                          }
                          // Don't close here - let the delete function handle reload
                        }
                      }} 
                      disabled={isDeleting}
                      style={{ flex: 1 }}
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  className="ds-button-destructive" 
                  onClick={handleDelete} 
                  disabled={isAdding || isDeleting}
                  style={{ paddingBottom: 0 }}
                >
                  {isDeleting ? (
                    <CheckCircle2 size={24} className="checkmark-animation" />
                  ) : (
                    'Delete Record'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
