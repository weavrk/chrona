import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

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
  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    return value ? new Date(value + 'T00:00:00') : new Date();
  });
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setDisplayMonth(date);
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
        setIsYearDropdownOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsYearDropdownOpen(false);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatDisplayDate = (date: Date): string => {
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthAbbr[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const formatValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    onChange(formatValue(selectedDate));
    setIsOpen(false);
  };

  const handleReset = () => {
    const today = new Date();
    setSelectedDate(today);
    setDisplayMonth(today);
  };

  const handleCancel = () => {
    // Reset to original value
    if (value) {
      const date = new Date(value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
        setDisplayMonth(date);
      }
    }
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    const newMonth = new Date(displayMonth);
    newMonth.setMonth(displayMonth.getMonth() - 1);
    setDisplayMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(displayMonth);
    newMonth.setMonth(displayMonth.getMonth() + 1);
    setDisplayMonth(newMonth);
  };

  const handleYearChange = (newYear: number) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(newYear);
    setDisplayMonth(newDate);
    setIsYearDropdownOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);

  // Generate calendar grid
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const calendarDays: (number | null)[] = [];
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const isSelectedDate = (day: number | null): boolean => {
    if (day === null) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const handleDayClick = (day: number | null) => {
    if (day === null) return;
    const newDate = new Date(year, month, day);
    handleDateSelect(newDate);
  };

  return (
    <>
      <div className={`ios-date-input-wrapper ${className}`}>
        {label && <label className="date-label">{label}</label>}
        <button 
          className="ios-date-input-button" 
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <span className="ios-date-input-value">
            {value ? formatDisplayDate(selectedDate) : 'Select date'}
          </span>
        </button>
      </div>

      {isOpen && (
        <>
          <div 
            ref={overlayRef}
            className="ios-date-picker-overlay"
            onClick={handleCancel}
          />
          <div ref={pickerRef} className="ios-date-picker-modal">
            <div className="ios-date-picker-calendar">
              {/* Month Navigation */}
              <div className="ios-date-picker-month-header">
                <div className="ios-date-picker-month-year-container">
                  <div className="ios-date-picker-month-year">
                    {monthNames[month]}
                  </div>
                  <div className="ios-date-picker-year-dropdown-wrapper">
                    <button
                      className="ios-date-picker-year-button"
                      onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                      type="button"
                    >
                      {year}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </button>
                    {isYearDropdownOpen && (
                      <div className="ios-date-picker-year-dropdown">
                        {years.map((y) => (
                          <button
                            key={y}
                            className={`ios-date-picker-year-option ${y === year ? 'selected' : ''}`}
                            onClick={() => handleYearChange(y)}
                            type="button"
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ios-date-picker-nav-buttons">
                  <button 
                    className="ios-date-picker-nav-button"
                    onClick={goToPreviousMonth}
                    type="button"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    className="ios-date-picker-nav-button"
                    onClick={goToNextMonth}
                    type="button"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Day Names */}
              <div className="ios-date-picker-day-names">
                {dayNames.map((dayName) => (
                  <div key={dayName} className="ios-date-picker-day-name">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="ios-date-picker-grid">
                {calendarDays.map((day, index) => (
                  <button
                    key={index}
                    className={`ios-date-picker-day ${day === null ? 'empty' : ''} ${isSelectedDate(day) ? 'selected' : ''}`}
                    onClick={() => handleDayClick(day)}
                    disabled={day === null}
                    type="button"
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="ios-date-picker-actions">
                <button 
                  className="ios-date-picker-reset"
                  onClick={handleReset}
                  type="button"
                >
                  Reset
                </button>
                <button 
                  className="ios-date-picker-confirm"
                  onClick={handleConfirm}
                  type="button"
                >
                  <Check size={20} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
