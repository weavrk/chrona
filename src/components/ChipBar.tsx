import { useState, useEffect, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { Chip } from './Chip';
import { AddLabelModal } from './AddLabelModal';
import { EditLabelsModal } from './EditLabelsModal';
import chipLabelsData from '../data/chip-labels.json';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

export function ChipBar() {
  const [chipLabels, setChipLabels] = useState<ChipLabel[]>(chipLabelsData);
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);
  const [isEditLabelsOpen, setIsEditLabelsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load labels from JSON file
  const loadLabels = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/chip-labels.json?t=${Date.now()}`);
      if (response.ok) {
        const loadedLabels = await response.json();
        setChipLabels(loadedLabels);
      }
    } catch (error) {
      console.error('Failed to load chip labels:', error);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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

  const saveLabels = async (labels: ChipLabel[]) => {
    try {
      const response = await fetch('/api/save_chip_labels.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ labels }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save chip labels:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();
      console.log('Chip labels saved successfully:', result);
      
      // Reload labels from file to ensure consistency
      setTimeout(() => {
        loadLabels();
      }, 100);
    } catch (error) {
      console.error('Error saving chip labels:', error);
      alert('Failed to save labels. Please try again.');
    }
  };

  const handleAddLabel = async (label: string, color: string) => {
    const newLabel: ChipLabel = {
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label: label,
      color: color,
    };
    const updatedLabels = [...chipLabels, newLabel];
    setChipLabels(updatedLabels);
    await saveLabels(updatedLabels);
  };

  return (
    <>
      <div className="chip-bar-container">
        <div className="chip-bar">
          {chipLabels.map((chip) => (
            <Chip
              key={chip.id}
              label={chip.label}
              color={chip.color}
              active={activeChips.has(chip.id)}
              onClick={() => toggleChip(chip.id)}
            />
          ))}
          <div className="chip-bar-menu-wrapper">
            <button
              ref={buttonRef}
              className="chip-bar-ellipses"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <MoreVertical size={20} />
            </button>
            {isMenuOpen && (
              <div ref={menuRef} className="chip-bar-menu">
                <button
                  className="chip-bar-menu-item"
                  onClick={() => {
                    setIsAddLabelOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Add Label
                </button>
                <button
                  className="chip-bar-menu-item"
                  onClick={() => {
                    setIsEditLabelsOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  Edit Label
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddLabelModal
        isOpen={isAddLabelOpen}
        existingLabels={chipLabels}
        onClose={() => setIsAddLabelOpen(false)}
        onSave={handleAddLabel}
      />

      <EditLabelsModal
        isOpen={isEditLabelsOpen}
        labels={chipLabels}
        onClose={() => setIsEditLabelsOpen(false)}
        onSave={async (updatedLabels) => {
          setChipLabels(updatedLabels);
          await saveLabels(updatedLabels);
        }}
      />
    </>
  );
}

