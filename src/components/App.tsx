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

// Helper function to format date as YYYY-MM-DD in local timezone
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function App() {
  const { user, isLoading, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);
  const [isEditLabelsOpen, setIsEditLabelsOpen] = useState(false);
  const [chipLabels, setChipLabels] = useState<ChipLabel[]>([]);
  const [editingRecords, setEditingRecords] = useState<any[] | null>(null);
  const [editingRecordType, setEditingRecordType] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<Record<string, any[]>>({});
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
      loadAllRecords();
    }
  }, [user]);

  const loadAllRecords = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setAllRecords(data && typeof data === 'object' ? data : {});
      } else {
        setAllRecords({});
      }
    } catch (error) {
      console.error('Failed to load all records:', error);
      setAllRecords({});
    }
  };

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

      const response = await fetch(`${import.meta.env.BASE_URL}api/save_user_labels.php`, {
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
      // Always use today's date
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      setSelectedDate(date);
      setEditingRecords(null);
      setEditingRecordType(null);
    setIsSheetOpen(true);
  };

  const handleSheetDateChange = (date: Date, recordType?: string, recordData?: any[]) => {
    setSelectedDate(date);
    setEditingRecordType(recordType || null);
    setEditingRecords(recordData || null);
    setIsSheetOpen(true);
  };

  const handleAddRecord = async (record: RecordData, _recordDate: Date) => {
    if (!user) return;
    
    try {
      // Load existing records (date-indexed structure)
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
      let records: Record<string, any[]> = {};
      if (response.ok) {
        const data = await response.json();
        records = data && typeof data === 'object' ? data : {};
      }

      // Convert dates to YYYY-MM-DD format (local timezone)
      const startDateStr = formatLocalDate(record.startDate);
      const endDateStr = formatLocalDate(record.endDate);
      
      // Check if this is an edit (has ID) or new record
      // Generate ID in format: YYYYMMDD-randomstring (e.g., 20260128-abc123)
      const generateId = () => {
        const now = new Date();
        const dateStr = formatLocalDate(now).replace(/-/g, ''); // YYYYMMDD
        const random = Math.random().toString(36).substr(2, 6); // 6 char random
        return `${dateStr}-${random}`;
      };
      const recordId = (record as any).id || generateId();
      const isEdit = !!(record as any).id;
      
      // Check if this is a parent or child record
      let isParentRecord = false;
      let parentIdToUpdate: string | undefined = undefined;
      
      if (isEdit) {
        // Find the existing record to check if it's a parent
        for (const dateKey of Object.keys(records)) {
          const existingRecord = records[dateKey]?.find((r: any) => r.id === recordId);
          if (existingRecord) {
            isParentRecord = existingRecord.isParent === true;
            parentIdToUpdate = existingRecord.parentId;
            break;
          }
        }
      }
      
      // Create record object (without dates since they're in the key)
      const recordToAdd: any = {
        id: recordId,
        type: record.type,
        data: record.details || {},
      };

      // If editing, first remove the old record from all dates in its range
      if (isEdit) {
        if (isParentRecord) {
          // If editing a parent, remove parent and all non-manually-edited children
          Object.keys(records).forEach((dateKey) => {
            if (records[dateKey]) {
              records[dateKey] = records[dateKey].filter((r: any) => {
                // Remove parent
                if (r.id === recordId) return false;
                // Remove children that haven't been manually edited
                if (r.parentId === recordId && r.manuallyEdited !== true) return false;
                return true;
              });
              if (records[dateKey].length === 0) {
                delete records[dateKey];
              }
            }
          });
        } else {
          // If editing a child directly, just remove this specific record
          // (it will be marked as manuallyEdited when re-added)
          Object.keys(records).forEach((dateKey) => {
            if (records[dateKey]) {
              records[dateKey] = records[dateKey].filter((r: any) => r.id !== recordId);
              if (records[dateKey].length === 0) {
                delete records[dateKey];
              }
            }
          });
        }
      }

      // Add/update record to all dates in the range (inclusive)
      // Parse dates correctly in local timezone (not UTC)
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
      const start = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);
      
      // Determine if we should repeat forward
      const shouldRepeatForward = record.details?.repeatForward === true;
      
      // If repeat forward is enabled, use custom end date or default to 365 days
      let finalEnd = end;
      if (shouldRepeatForward) {
        if (record.details?.repeatEndDate) {
          const [endYear, endMonth, endDay] = record.details.repeatEndDate.split('-').map(Number);
          finalEnd = new Date(endYear, endMonth - 1, endDay);
        } else {
          finalEnd = new Date(end.getTime() + (365 * 24 * 60 * 60 * 1000));
        }
      }
      
      // Generate parent ID if this is a repeat forward record
      const parentId = shouldRepeatForward ? recordId : undefined;
      
      const currentDate = new Date(start);
      const includePlacebo = record.details?.includePlacebo === true;
      let dayCount = 0;
      let isFirstRecord = true;
      
      while (currentDate <= finalEnd) {
        const dateKey = formatLocalDate(currentDate);
        
        // If includePlacebo is enabled: 3 weeks on (21 days), 1 week off (7 days)
        const shouldIncludeThisDay = !includePlacebo || (dayCount % 28 < 21);
        
        if (shouldIncludeThisDay) {
          // Initialize array for this date if it doesn't exist
          if (!records[dateKey]) {
            records[dateKey] = [];
          }
          
          // Create record with parent-child relationship fields
          const recordForDate = { ...recordToAdd };
          
          if (shouldRepeatForward) {
            if (isFirstRecord) {
              // First record is the parent
              recordForDate.isParent = true;
              isFirstRecord = false;
            } else {
              // Subsequent records are children
              // Generate unique ID for each child
              const childId = `${dateKey}-${Math.random().toString(36).substr(2, 6)}`;
              recordForDate.id = childId;
              recordForDate.parentId = parentId;
              recordForDate.manuallyEdited = false;
            }
          } else if (isEdit && !isParentRecord && parentIdToUpdate) {
            // If editing a child directly (not through parent), mark as manually edited
            recordForDate.parentId = parentIdToUpdate;
            recordForDate.manuallyEdited = true;
          }
          
          // Add the record to this date's array (or update if editing)
          const existingIndex = records[dateKey].findIndex((r: any) => r.id === recordToAdd.id);
          if (existingIndex >= 0) {
            records[dateKey][existingIndex] = recordForDate;
          } else {
            records[dateKey].push(recordForDate);
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
      }

      // Save records
      const saveResponse = await fetch(`${import.meta.env.BASE_URL}api/save_records.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, records }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save records');
      }

      // Store current view mode so we stay on the same view after reload
      const currentViewMode = sessionStorage.getItem('currentViewMode') || 'list';
      sessionStorage.setItem('restoreViewMode', currentViewMode);
      
      // Close the sheet and reload the page to refresh data
      setIsSheetOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to save record:', error);
      alert('Failed to save record. Please try again.');
    }
  };

  const handleAddMultipleRecords = async (records: RecordData[], recordDate: Date) => {
    if (!user || records.length === 0) return;
    
    try {
      // Load existing records
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
      let allRecords: Record<string, any[]> = {};
      if (response.ok) {
        const data = await response.json();
        allRecords = data && typeof data === 'object' ? data : {};
      }

      // If editing (any record has an ID), first delete all existing records of this type for the selected date
      const isEdit = records.some(r => (r as any).id);
      if (isEdit && editingRecordType && selectedDate) {
        const dateStr = formatLocalDate(selectedDate);
        if (allRecords[dateStr]) {
          // Remove all records of this type (we'll add the updated ones back)
          allRecords[dateStr] = allRecords[dateStr].filter((r: any) => r.type !== editingRecordType);
          if (allRecords[dateStr].length === 0) {
            delete allRecords[dateStr];
          }
        }
      }

      // Generate ID in format: YYYYMMDD-randomstring
      const generateId = () => {
        const now = new Date();
        const dateStr = formatLocalDate(now).replace(/-/g, ''); // YYYYMMDD
        const random = Math.random().toString(36).substr(2, 6); // 6 char random
        return `${dateStr}-${random}`;
      };

      // Process each record
      for (const record of records) {
        const startDateStr = formatLocalDate(record.startDate);
        const endDateStr = formatLocalDate(record.endDate);
        
        // Use existing ID or generate new one
        const recordId = (record as any).id || generateId();
        
        const recordObject: any = {
          id: recordId,
          type: record.type,
          data: record.details || {},
        };

        // Parse dates correctly in local timezone
        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
        const start = new Date(startYear, startMonth - 1, startDay);
        const end = new Date(endYear, endMonth - 1, endDay);
        
        // Determine if we should repeat forward
        const shouldRepeatForward = record.details?.repeatForward === true;
        
        // If repeat forward is enabled, use custom end date or default to 365 days
        let finalEnd = end;
        if (shouldRepeatForward) {
          if (record.details?.repeatEndDate) {
            const [endYear, endMonth, endDay] = record.details.repeatEndDate.split('-').map(Number);
            finalEnd = new Date(endYear, endMonth - 1, endDay);
          } else {
            finalEnd = new Date(end.getTime() + (365 * 24 * 60 * 60 * 1000));
          }
        }
        
        // Generate parent ID if this is a repeat forward record
        const parentId = shouldRepeatForward ? recordId : undefined;
        
        const currentDate = new Date(start);
        const includePlacebo = record.details?.includePlacebo === true;
        let dayCount = 0;
        let isFirstRecord = true;

        while (currentDate <= finalEnd) {
          const dateKey = formatLocalDate(currentDate);
          
          // If includePlacebo is enabled: 3 weeks on (21 days), 1 week off (7 days)
          const shouldIncludeThisDay = !includePlacebo || (dayCount % 28 < 21);
          
          if (shouldIncludeThisDay) {
            if (!allRecords[dateKey]) {
              allRecords[dateKey] = [];
            }
            
            // Create record with parent-child relationship fields
            const recordForDate = { ...recordObject };
            
            if (shouldRepeatForward) {
              if (isFirstRecord) {
                // First record is the parent
                recordForDate.isParent = true;
                isFirstRecord = false;
              } else {
                // Subsequent records are children
                const childId = `${dateKey}-${Math.random().toString(36).substr(2, 6)}`;
                recordForDate.id = childId;
                recordForDate.parentId = parentId;
                recordForDate.manuallyEdited = false;
              }
            }
            
            const existingIndex = allRecords[dateKey].findIndex((r: any) => r.id === recordObject.id);
            if (existingIndex >= 0) {
              allRecords[dateKey][existingIndex] = recordForDate;
            } else {
              allRecords[dateKey].push(recordForDate);
            }
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
          dayCount++;
        }
      }

      // Save all records
      const saveResponse = await fetch(`${import.meta.env.BASE_URL}api/save_records.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, records: allRecords }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to save records');
      }

      // Store the record date and current view mode in sessionStorage
      const recordDateStr = recordDate.toISOString().split('T')[0];
      sessionStorage.setItem('scrollToDate', recordDateStr);
      const currentViewMode = sessionStorage.getItem('currentViewMode') || 'list';
      sessionStorage.setItem('scrollToViewMode', currentViewMode);
      sessionStorage.setItem('restoreViewMode', currentViewMode);
      
      setIsSheetOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to save records:', error);
      alert('Failed to save records. Please try again.');
    }
  };

  const handleDeleteRecord = async (recordType: string, startDate: Date, endDate: Date, recordId?: string, deleteFutureEvents?: boolean) => {
    if (!user) return;
    
    try {
      // Load existing records (date-indexed structure)
      const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
      let records: Record<string, any[]> = {};
      if (response.ok) {
        const data = await response.json();
        records = data && typeof data === 'object' ? data : {};
      }

      // Convert dates to YYYY-MM-DD format
      const startDateStr = formatLocalDate(startDate);
      const endDateStr = formatLocalDate(endDate);
      
      // Find the record to determine parent/child relationship
      let targetRecord: any = null;
      if (recordId && records[startDateStr]) {
        targetRecord = records[startDateStr].find((r: any) => r.id === recordId);
      }
      
      const recordIdOrParent = targetRecord?.isParent ? targetRecord.id : targetRecord?.parentId;
      
      // Remove records - if recordId is provided, delete that specific record, otherwise delete all of that type
      // Parse dates correctly in local timezone (not UTC)
      const [delStartYear, delStartMonth, delStartDay] = startDateStr.split('-').map(Number);
      const [delEndYear, delEndMonth, delEndDay] = endDateStr.split('-').map(Number);
      const start = new Date(delStartYear, delStartMonth - 1, delStartDay);
      const end = new Date(delEndYear, delEndMonth - 1, delEndDay);
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dateKey = formatLocalDate(currentDate);
        
        if (records[dateKey]) {
          if (recordId) {
            // Delete specific record by ID
            records[dateKey] = records[dateKey].filter((record: any) => record.id !== recordId);
          } else {
            // Delete all records of the specified type
            records[dateKey] = records[dateKey].filter((record: any) => record.type !== recordType);
          }
          
          // If no records left for this date, remove the date key
          if (records[dateKey].length === 0) {
            delete records[dateKey];
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // If deleteFutureEvents is true, also delete all future children
      if (deleteFutureEvents && recordIdOrParent) {
        Object.keys(records).forEach((dateKey) => {
          if (dateKey > startDateStr && records[dateKey]) {
            records[dateKey] = records[dateKey].filter((r: any) => {
              // Remove records with matching parent ID or matching record ID
              return r.id !== recordIdOrParent && r.parentId !== recordIdOrParent;
            });
            if (records[dateKey].length === 0) {
              delete records[dateKey];
            }
          }
        });
      }

      // Save records
      const saveResponse = await fetch(`${import.meta.env.BASE_URL}api/save_records.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, records }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete records');
      }

      // Store current view mode so we stay on the same view after reload
      const currentViewMode = sessionStorage.getItem('currentViewMode') || 'list';
      sessionStorage.setItem('restoreViewMode', currentViewMode);
      
      // Close the sheet and reload the page to refresh data
      setIsSheetOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Failed to delete record. Please try again.');
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
        editingRecords={editingRecords}
        editingRecordType={editingRecordType}
        allRecords={allRecords}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingRecords(null);
          setEditingRecordType(null);
        }}
        onAdd={handleAddRecord}
        onAddMultiple={handleAddMultipleRecords}
        onDelete={handleDeleteRecord}
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

