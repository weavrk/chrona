import { useState, useEffect, useRef } from 'react';

interface IOSDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export function IOSDatePicker({ value, onChange, className = '', label }: IOSDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return value ? new Date(value + 'T00:00:00') : new Date();
  });
  const pickerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatDisplayDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  };

  const formatValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // Don't call onChange here - only on confirm
  };

  const handleConfirm = () => {
    onChange(formatValue(selectedDate));
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to original value
    if (value) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    }
    setIsOpen(false);
  };

  // Generate options for month, day, year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <>
      <div className={`ios-date-input-wrapper ${className}`}>
        {label && <label className="date-label">{label}</label>}
        <div 
          className="ios-date-input" 
          onClick={() => setIsOpen(true)}
        >
          <span className="ios-date-input-value">{formatDisplayDate(selectedDate)}</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="ios-date-icon"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
      </div>

      {isOpen && (
        <>
          <div 
            ref={overlayRef}
            className="ios-date-picker-overlay"
            onClick={handleCancel}
          />
          <div ref={pickerRef} className="ios-date-picker-container">
            <div className="ios-date-picker-header">
              <button 
                className="ios-date-picker-button ios-date-picker-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <div className="ios-date-picker-title">Select Date</div>
              <button 
                className="ios-date-picker-button ios-date-picker-done"
                onClick={handleConfirm}
              >
                Done
              </button>
            </div>
            <div className="ios-date-picker-wheel-container">
              <div className="ios-date-picker-wheel">
                <div className="ios-date-picker-column">
                  <div className="ios-date-picker-label">Month</div>
                  <div className="ios-date-picker-scroll">
                    {months.map((month) => {
                      const isSelected = month === selectedDate.getMonth() + 1;
                      return (
                        <div
                          key={month}
                          className={`ios-date-picker-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setMonth(month - 1);
                            // Adjust day if it's invalid for the new month
                            const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
                            if (newDate.getDate() > daysInNewMonth) {
                              newDate.setDate(daysInNewMonth);
                            }
                            handleDateChange(newDate);
                          }}
                        >
                          {monthNames[month - 1]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="ios-date-picker-column">
                  <div className="ios-date-picker-label">Day</div>
                  <div className="ios-date-picker-scroll">
                    {days.map((day) => {
                      const isSelected = day === selectedDate.getDate();
                      return (
                        <div
                          key={day}
                          className={`ios-date-picker-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(day);
                            handleDateChange(newDate);
                          }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="ios-date-picker-column">
                  <div className="ios-date-picker-label">Year</div>
                  <div className="ios-date-picker-scroll">
                    {years.map((year) => {
                      const isSelected = year === selectedDate.getFullYear();
                      return (
                        <div
                          key={year}
                          className={`ios-date-picker-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setFullYear(year);
                            // Adjust day if it's invalid for the new year (leap year)
                            const daysInMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
                            if (newDate.getDate() > daysInMonth) {
                              newDate.setDate(daysInMonth);
                            }
                            handleDateChange(newDate);
                          }}
                        >
                          {year}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

