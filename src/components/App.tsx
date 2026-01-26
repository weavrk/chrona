import { useState, useEffect, useRef } from 'react';
import { Plus, MoreVertical } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { DesignSystemPanel } from './DesignSystemPanel';
import { AddRecordSheet, RecordData } from './AddRecordSheet';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from './LoginScreen';
import { CreateAccountScreen } from './CreateAccountScreen';
import { AddLabelModal } from './AddLabelModal';
import { EditLabelsModal } from './EditLabelsModal';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

export function App() {
  const { user, isLoading, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);
  const [isEditLabelsOpen, setIsEditLabelsOpen] = useState(false);
  const [chipLabels, setChipLabels] = useState<ChipLabel[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Load user-specific labels
  const loadLabels = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/label-list-user-${user.username}.json?t=${Date.now()}`);
      if (response.ok) {
        const loadedLabels = await response.json();
        // Map from global structure (name, abbreviation, defaultColor) to component structure (label, color)
        const mappedLabels = (Array.isArray(loadedLabels) ? loadedLabels : []).map((label: any) => ({
          id: label.id,
          label: label.abbreviation || label.label || '',
          color: label.defaultColor || label.color || ''
        }));
        setChipLabels(mappedLabels);
      } else {
        setChipLabels([]);
      }
    } catch (error) {
      console.error('Failed to load user labels:', error);
      setChipLabels([]);
    }
  };

  useEffect(() => {
    if (user) {
      loadLabels();
    }
  }, [user]);

  // Load global labels to get name and abbreviation for mapping
  const loadGlobalLabels = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/label-list-global.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (error) {
      console.error('Failed to load global labels:', error);
    }
    return [];
  };

  const saveLabels = async (labels: ChipLabel[]) => {
    if (!user) return;
    try {
      // Load global labels to get name and abbreviation
      const globalLabels = await loadGlobalLabels();
      
      // Convert component structure (label, color) back to global structure (name, abbreviation, defaultColor)
      const labelsToSave = labels.map((label) => {
        const globalLabel = globalLabels.find((gl: any) => gl.id === label.id);
        if (globalLabel) {
          // Default record type - use global name and abbreviation
          return {
            id: label.id,
            name: globalLabel.name,
            abbreviation: globalLabel.abbreviation,
            defaultColor: label.color // Use the color as defaultColor
          };
        } else {
          // User-defined label - need to get name from label string
          // The label.label is the abbreviation, we need to find the name
          // For now, use the label as both name and abbreviation if we can't find it
          return {
            id: label.id,
            name: label.label, // This will be updated when we have the full label structure
            abbreviation: label.label,
            defaultColor: label.color
          };
        }
      });

      const response = await fetch('/api/save_user_labels.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, labels: labelsToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save labels');
      }

      setTimeout(() => {
        loadLabels();
      }, 100);
    } catch (error) {
      console.error('Error saving user labels:', error);
      alert('Failed to save labels. Please try again.');
    }
  };

  const handleAddLabel = async (labelName: string, abbreviation: string, color: string) => {
    if (!user) return;
    // Load global labels to get the full structure
    const globalLabels = await loadGlobalLabels();
    const globalLabel = globalLabels.find((gl: any) => gl.name === labelName);
    
    const newLabel: ChipLabel = {
      id: globalLabel ? globalLabel.id : labelName.toLowerCase().replace(/\s+/g, '-'),
      label: abbreviation,
      color: color,
    };
    const updatedLabels = [...chipLabels, newLabel];
    setChipLabels(updatedLabels);
    await saveLabels(updatedLabels);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="chrona-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--gray-800)' }}>Loading...</div>
      </div>
    );
  }

  // Show login screen if not authenticated (only after we've checked localStorage)
  if (!user) {
    return showCreateAccount ? (
      <CreateAccountScreen onSwitchToLogin={() => setShowCreateAccount(false)} />
    ) : (
      <LoginScreen onShowCreateAccount={() => setShowCreateAccount(true)} />
    );
  }

  const handleAddRecordClick = () => {
    const today = new Date();
    setSelectedDate(today);
    setIsSheetOpen(true);
  };

  const handleSheetDateChange = (date: Date) => {
    setSelectedDate(date);
    setIsSheetOpen(true);
  };

  const handleAddRecord = async (record: RecordData) => {
    if (!user) return;
    
    try {
      // Load existing records (date-indexed structure)
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
      let records: Record<string, any[]> = {};
      if (response.ok) {
        const data = await response.json();
        records = data && typeof data === 'object' ? data : {};
      }

      // Generate unique ID for the new record
      const recordId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Convert dates to YYYY-MM-DD format
      const startDateStr = record.startDate.toISOString().split('T')[0];
      const endDateStr = record.endDate.toISOString().split('T')[0];
      
      // Create record object (without dates since they're in the key)
      const recordToAdd = {
        id: recordId,
        type: record.type,
        data: record.details || {},
      };

      // Add record to all dates in the range (inclusive)
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        // Initialize array for this date if it doesn't exist
        if (!records[dateKey]) {
          records[dateKey] = [];
        }
        
        // Add the record to this date's array
        records[dateKey].push(recordToAdd);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Save records
      await fetch('/api/save_records.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, records }),
      });
    } catch (error) {
      console.error('Failed to save record:', error);
      alert('Failed to save record. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <div className="chrona-app">
      <header className="chrona-header">
        <div className="chrona-wordmark">Chrona</div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
        <button 
          className="chrona-header-add-button"
          onClick={handleAddRecordClick}
          aria-label="Add record"
        >
          <Plus size={20} style={{ color: 'var(--color-primary)' }} />
        </button>
          <div className="chip-bar-menu-wrapper">
            <button
              ref={userMenuButtonRef}
              className="chip-bar-ellipses"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label="User menu"
            >
              <MoreVertical size={20} />
            </button>
            {isUserMenuOpen && (
              <div ref={userMenuRef} className="chip-bar-menu">
                <button
                  className="chip-bar-menu-item"
                  onClick={() => {
                    setIsAddLabelOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                >
                  Add Label
                </button>
                <button
                  className="chip-bar-menu-item"
                  onClick={() => {
                    setIsEditLabelsOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                >
                  Edit Label
                </button>
                <div className="chip-bar-menu-divider"></div>
                <button
                  className="chip-bar-menu-item"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="chrona-main">
        <CalendarView 
          isSheetOpen={isSheetOpen}
          selectedDate={selectedDate}
          onSheetClose={() => setIsSheetOpen(false)}
          onSheetDateChange={handleSheetDateChange}
          onAddRecord={handleAddRecord}
          chipLabels={chipLabels}
        />
      </main>
      
      <DesignSystemPanel />
      
      <AddRecordSheet
        isOpen={isSheetOpen}
        selectedDate={selectedDate}
        onClose={() => setIsSheetOpen(false)}
        onAdd={handleAddRecord}
        labels={chipLabels}
      />

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
    </div>
  );
}

