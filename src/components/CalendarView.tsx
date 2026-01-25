import { useState, useRef, useEffect } from 'react';
import { ChipBar } from './ChipBar';
import { RecordData } from './AddRecordSheet';

interface CalendarViewProps {
  isSheetOpen: boolean;
  selectedDate: Date | null;
  onSheetClose: () => void;
  onSheetDateChange: (date: Date) => void;
  onAddRecord: (record: RecordData) => void;
}

interface CalendarMonth {
  year: number;
  month: number;
  monthName: string;
  days: (number | null)[];
  startDay: number;
}

function generateCalendarMonths(startDate: Date, monthCount: number): CalendarMonth[] {
  const months: CalendarMonth[] = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < monthCount; i++) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
    
    // Get first day of month (0 = Sunday, 6 = Saturday)
    const firstDay = new Date(year, month, 1).getDay();
    
    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Build days array with leading nulls for spacing
    const days: (number | null)[] = [];
    
    // Add leading nulls
    for (let j = 0; j < firstDay; j++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    months.push({
      year,
      month,
      monthName,
      days,
      startDay: firstDay,
    });
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return months;
}

export function CalendarView({ onSheetDateChange }: CalendarViewProps) {
  const [showTodayButton, setShowTodayButton] = useState(true); // Always show for now
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // Start from current month, generate 12 months
  const today = new Date();
  const months = generateCalendarMonths(today, 12);
  
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Helper to check if a day is today
  const isToday = (year: number, month: number, day: number | null): boolean => {
    if (day === null) return false;
    const now = new Date();
    return (
      now.getFullYear() === year &&
      now.getMonth() === month &&
      now.getDate() === day
    );
  };
  
  const handleDayClick = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    onSheetDateChange(date);
  };

  const handleScrollToToday = () => {
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (scrollContainer && calendarRef.current) {
      // Find the current month element (first month in the array)
      const currentMonthElement = calendarRef.current.querySelector(
        `[data-month-key="${today.getFullYear()}-${today.getMonth()}"]`
      ) as HTMLElement;
      
      if (currentMonthElement) {
        // Scroll to the month header, accounting for sticky header
        const headerHeight = 124; // Height of chrona-header + chip-bar
        const elementTop = currentMonthElement.offsetTop - headerHeight;
        
        scrollContainer.scrollTo({
          top: elementTop,
          behavior: 'smooth',
        });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Find the scrollable parent (chrona-main)
      const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
      if (scrollContainer) {
        // Show button if scrolled down more than 200px
        const scrollTop = scrollContainer.scrollTop;
        setShowTodayButton(scrollTop > 200);
      }
    };

    // Wait for DOM to be ready, then check initial scroll position
    const checkScroll = () => {
      const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
      if (scrollContainer) {
        handleScroll(); // Check initial state
        scrollContainer.addEventListener('scroll', handleScroll);
        return () => {
          scrollContainer.removeEventListener('scroll', handleScroll);
        };
      }
    };

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(checkScroll, 100);
    return () => {
      clearTimeout(timeoutId);
      const scrollContainer = document.querySelector('.chrona-main');
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  return (
    <>
      <ChipBar />
      <div className="calendar-view-months" ref={calendarRef}>
        {months.map((monthData) => (
          <div 
            key={`${monthData.year}-${monthData.month}`} 
            className="calendar-month"
            data-month-key={`${monthData.year}-${monthData.month}`}
          >
            <div className="calendar-month-header">
              <span className="calendar-month-name">{monthData.monthName}</span>
              {monthData.month === 0 && (
                <span className="calendar-year">{monthData.year}</span>
              )}
            </div>
            
            <div className="calendar-month-content">
              <div className="calendar-weekdays">
                {weekDays.map((day, i) => (
                  <div key={i} className="calendar-weekday">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="calendar-days">
                {monthData.days.map((day, i) => {
                  const isTodayDay = isToday(monthData.year, monthData.month, day);
                  return (
                    <div
                      key={i}
                      className={`calendar-day ${day === null ? 'calendar-day-empty' : ''} ${isTodayDay ? 'calendar-day-today' : ''}`}
                      onClick={() => {
                        if (day !== null) {
                          handleDayClick(monthData.year, monthData.month, day);
                        }
                      }}
                    >
                      {day !== null ? day : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button 
        className="calendar-today-fab"
        onClick={handleScrollToToday}
        aria-label="Scroll to today"
        style={{ display: showTodayButton ? 'block' : 'none' }}
      >
        Today
      </button>
    </>
  );
}

