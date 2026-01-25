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

export function ChipBar({ labels }: ChipBarProps) {
  const { user } = useAuth();
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set());
  const [activeRecordTypes, setActiveRecordTypes] = useState<Set<string>>(new Set());

  const RECORD_TYPES = [
    { id: 'period', label: 'PE', color: 'brick', defaultColor: 'brick' },
    { id: 'hormone-replacement-therapy', label: 'HR', color: 'ocean', defaultColor: 'ocean' },
    { id: 'hsv', label: 'HS', color: 'sand', defaultColor: 'sand' },
    { id: 'mental-health', label: 'ID', color: 'steel', defaultColor: 'steel' },
  ];

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
        {RECORD_TYPES.map((recordType) => (
          <Chip
            key={recordType.id}
            label={recordType.label}
            color={recordType.color}
            active={activeRecordTypes.has(recordType.id)}
            onClick={() => toggleRecordType(recordType.id)}
          />
        ))}
        {labels.map((chip) => (
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

