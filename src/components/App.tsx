import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { DesignSystemPanel } from './DesignSystemPanel';
import { AddRecordSheet, RecordData } from './AddRecordSheet';

export function App() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleAddRecordClick = () => {
    const today = new Date();
    setSelectedDate(today);
    setIsSheetOpen(true);
  };

  const handleSheetDateChange = (date: Date) => {
    setSelectedDate(date);
    setIsSheetOpen(true);
  };

  const handleAddRecord = (record: RecordData) => {
    console.log('Adding record:', record);
    // TODO: Implement record storage
  };

  return (
    <div className="chrona-app">
      <header className="chrona-header">
        <div className="chrona-wordmark">Chrona</div>
        <button 
          className="chrona-header-add-button"
          onClick={handleAddRecordClick}
          aria-label="Add record"
        >
          <Plus size={20} style={{ color: 'var(--color-primary)' }} />
        </button>
      </header>
      
      <main className="chrona-main">
        <CalendarView 
          isSheetOpen={isSheetOpen}
          selectedDate={selectedDate}
          onSheetClose={() => setIsSheetOpen(false)}
          onSheetDateChange={handleSheetDateChange}
          onAddRecord={handleAddRecord}
        />
      </main>
      
      <DesignSystemPanel />
      
      <AddRecordSheet
        isOpen={isSheetOpen}
        selectedDate={selectedDate}
        onClose={() => setIsSheetOpen(false)}
        onAdd={handleAddRecord}
      />
    </div>
  );
}

