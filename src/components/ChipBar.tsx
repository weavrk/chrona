import { useState } from 'react';
import { Chip } from './Chip';
import { useAuth } from '../contexts/AuthContext';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface ChipBarProps {
  labels: ChipLabel[];
}

// Default record type IDs that should always appear first
const DEFAULT_RECORD_TYPE_IDS = ['period', 'hormone-replacement-therapy', 'hsv', 'mental-health', 'workout'];

export function ChipBar({ labels }: ChipBarProps) {
  const { user } = useAuth();
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set());
  const [activeRecordTypes, setActiveRecordTypes] = useState<Set<string>>(new Set());

  // Separate default record types from user-defined labels
  // Maintain order: period, hormone-replacement-therapy, hsv, mental-health
  // Labels come in component format (label, color) from App.tsx mapping
  const recordTypes = DEFAULT_RECORD_TYPE_IDS
    .map(id => labels.find(label => label.id === id))
    .filter((label): label is ChipLabel => label !== undefined);
  const userLabels = labels.filter(label => !DEFAULT_RECORD_TYPE_IDS.includes(label.id));

  const toggleChip = (chipId: string) => {
    setActiveChips(prev => {
      const next = new Set(prev);
      if (next.has(chipId)) {
        next.delete(chipId);
      } else {
        next.add(chipId);
      }
      return next;
    });
  };

  const toggleRecordType = (recordTypeId: string) => {
    setActiveRecordTypes(prev => {
      const next = new Set(prev);
      if (next.has(recordTypeId)) {
        next.delete(recordTypeId);
      } else {
        next.add(recordTypeId);
      }
      return next;
    });
  };

  if (!user) return null;

  return (
      <div className="chip-bar-container">
        <div className="chip-bar">
        {recordTypes.map((recordType) => (
          <Chip
            key={recordType.id}
            label={recordType.label}
            color={recordType.color}
            active={activeRecordTypes.has(recordType.id)}
            onClick={() => toggleRecordType(recordType.id)}
          />
        ))}
        {userLabels.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              color={chip.color}
              active={activeChips.has(chip.id)}
              onClick={() => toggleChip(chip.id)}
            />
          ))}
      </div>
    </div>
  );
}

