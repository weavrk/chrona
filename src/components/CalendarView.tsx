import { useState, useRef, useEffect, useCallback } from 'react';
import { ChipBar } from './ChipBar';
import { RecordData } from './AddRecordSheet';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface CalendarViewProps {
  isSheetOpen: boolean;
  selectedDate: Date | null;
  onSheetClose: () => void;
  onSheetDateChange: (date: Date) => void;
  onAddRecord: (record: RecordData) => void;
  chipLabels: ChipLabel[];
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

export function CalendarView({ isSheetOpen: _isSheetOpen, selectedDate: _selectedDate, onSheetClose: _onSheetClose, onSheetDateChange, onAddRecord: _onAddRecord, chipLabels }: CalendarViewProps) {
  const [showTodayButton, setShowTodayButton] = useState(false);
  const [observersReady, setObserversReady] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const firstMonthRef = useRef<HTMLDivElement>(null);
  const lastMonthRef = useRef<HTMLDivElement>(null);
  const isLoadingPastRef = useRef(false);
  const isLoadingFutureRef = useRef(false);
  const hasInitiallyScrolledRef = useRef(false);
  const scrollOriginRef = useRef<number>(0);
  
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Calculate start date: January of previous year
  const startDate = new Date(currentYear - 1, 0, 1);
  
  // Calculate month count: from January of previous year to January two years out
  // Example: If current is April 2026, load from Jan 2025 to Jan 2028
  // That's 37 months: 12 (2025) + 12 (2026) + 12 (2027) + 1 (Jan 2028)
  const calculateMonthCount = () => {
    const startYear = currentYear - 1;
    const endYear = currentYear + 2;
    return (endYear - startYear) * 12 + 1; // +1 to include January of end year
  };
  
  const initialMonthCount = calculateMonthCount();
  
  // Generate initial months: from January of previous year to January two years out
  const [months, setMonths] = useState(() => {
    return generateCalendarMonths(startDate, initialMonthCount);
  });
  
  // Track the date range of loaded months
  const [, setLoadedRange] = useState({
    start: new Date(currentYear - 1, 0, 1),
    end: new Date(currentYear + 2, 0, 1), // January two years out
  });
  
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
    if (!scrollContainer || !calendarRef.current) return;
    
    // Find the current month element using today's date
    const todayDate = new Date();
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth(); // 0-11
    
    const currentMonthElement = calendarRef.current.querySelector(
      `[data-month-key="${todayYear}-${todayMonth}"]`
    ) as HTMLElement;
    
    if (currentMonthElement) {
        // Calculate scroll position to place month header at 120px from viewport top
        const targetTop = 120; // Header (60px) + chip bar (60px)
        const monthHeaderTop = currentMonthElement.offsetTop;
        const scrollPosition = Math.max(0, monthHeaderTop - targetTop);
        
        scrollContainer.scrollTo({
          top: scrollPosition,
          behavior: 'smooth',
        });
        
        // Update origin
        scrollOriginRef.current = scrollPosition;
    } else {
      // Fallback to stored origin if element not found
      scrollContainer.scrollTo({
        top: scrollOriginRef.current,
        behavior: 'smooth',
      });
    }
  };

  // Load more months in the past
  const loadPastMonths = useCallback(() => {
    if (isLoadingPastRef.current) return;
    isLoadingPastRef.current = true;
    
    console.log('loadPastMonths called');
    
    // Save current scroll position and a reference element
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) {
      isLoadingPastRef.current = false;
      return;
    }
    
    const scrollBefore = scrollContainer.scrollTop;
    const firstVisibleMonth = calendarRef.current?.querySelector('.calendar-month') as HTMLElement;
    const offsetBefore = firstVisibleMonth?.offsetTop || 0;
    
    console.log('Before load - scrollTop:', scrollBefore, 'firstMonth offsetTop:', offsetBefore);
    
    setMonths(prev => {
      const firstMonth = prev[0];
      if (!firstMonth) {
        isLoadingPastRef.current = false;
        return prev;
      }
      
      const newStartDate = new Date(firstMonth.year, firstMonth.month, 1);
      newStartDate.setFullYear(newStartDate.getFullYear() - 1);
      
      const newMonths = generateCalendarMonths(newStartDate, 12);
      return [...newMonths, ...prev];
    });
    
    // Adjust scroll after state update
    setTimeout(() => {
      const offsetAfter = firstVisibleMonth?.offsetTop || 0;
      const addedHeight = offsetAfter - offsetBefore;
      scrollContainer.scrollTop = scrollBefore + addedHeight;
      
      console.log('After load - added height:', addedHeight, 'new scrollTop:', scrollContainer.scrollTop);
      
      setTimeout(() => {
        isLoadingPastRef.current = false;
      }, 1000);
    }, 100);
    
    setLoadedRange(prev => {
      const newStartDate = new Date(prev.start);
      newStartDate.setFullYear(newStartDate.getFullYear() - 1);
      return {
        start: newStartDate,
        end: prev.end,
      };
    });
  }, []);

  // Load more months in the future
  const loadFutureMonths = useCallback(() => {
    if (isLoadingFutureRef.current) return;
    isLoadingFutureRef.current = true;
    
    setMonths(prev => {
      const lastMonth = prev[prev.length - 1];
      if (!lastMonth) {
        isLoadingFutureRef.current = false;
        return prev;
      }
      
      const lastMonthDate = new Date(lastMonth.year, lastMonth.month, 1);
      lastMonthDate.setMonth(lastMonthDate.getMonth() + 1);
      
      // Load 12 months (one full year)
      const newMonths = generateCalendarMonths(lastMonthDate, 12);
      setTimeout(() => {
        isLoadingFutureRef.current = false;
      }, 100);
      return [...prev, ...newMonths];
    });
    
    setLoadedRange(prev => {
      // Move end date to January of the next year
      const newEndDate = new Date(prev.end);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      newEndDate.setMonth(0); // January
      return {
        start: prev.start,
        end: newEndDate,
      };
    });
  }, []);

  // Prevent browser scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Set scroll origin and scroll to current month on initial load
  useEffect(() => {
    // Only run once on initial load
    if (hasInitiallyScrolledRef.current) return;
    
    const scrollToCurrentMonth = () => {
      const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
      if (!scrollContainer || !calendarRef.current) {
        // Retry if not ready
        setTimeout(scrollToCurrentMonth, 50);
        return;
      }
      
      // Find the current month element using today's date
      const todayDate = new Date();
      const todayYear = todayDate.getFullYear();
      const todayMonth = todayDate.getMonth(); // 0-11
      
      console.log('Scrolling to:', `${todayYear}-${todayMonth}`, `(${todayDate.toLocaleDateString()})`);
      console.log('Scroll container:', scrollContainer, 'scrollHeight:', scrollContainer.scrollHeight, 'clientHeight:', scrollContainer.clientHeight);
      
      const currentMonthElement = calendarRef.current.querySelector(
        `[data-month-key="${todayYear}-${todayMonth}"]`
      ) as HTMLElement;
      
      if (currentMonthElement) {
        // Get the month header element for more accurate positioning
        const monthHeader = currentMonthElement.querySelector('.calendar-month-header') as HTMLElement;
        const targetElement = monthHeader || currentMonthElement;
        
        // Calculate scroll position to place month header at 120px from viewport top
        // Header (60px) + chip bar (60px) = 120px total
        const targetTop = 120;
        
        // Get position relative to the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const currentScroll = scrollContainer.scrollTop;
        
        // Calculate the scroll position needed
        const elementTopRelativeToContainer = elementRect.top - containerRect.top + currentScroll;
        const scrollPosition = Math.max(0, elementTopRelativeToContainer - targetTop);
        
        console.log('Found element, scrolling to:', scrollPosition, 'elementTopRelativeToContainer:', elementTopRelativeToContainer, 'targetTop:', targetTop);
        console.log('currentScroll:', currentScroll, 'elementRect.top:', elementRect.top, 'containerRect.top:', containerRect.top);
        
        // Set scroll origin (where we consider "home" position)
        scrollOriginRef.current = scrollPosition;
        
        // Scroll directly to calculated position
        scrollContainer.scrollTop = scrollPosition;
        
        hasInitiallyScrolledRef.current = true;
        
        console.log('Initial scroll complete at:', scrollContainer.scrollTop);
        
        // Trigger observers setup after a delay
        setTimeout(() => {
          setObserversReady(true);
        }, 1000);
      } else {
        console.error('Could not find current month element:', `${todayYear}-${todayMonth}`);
      }
    };

    // Wait for DOM to render
    const timeoutId = setTimeout(scrollToCurrentMonth, 300);
    return () => clearTimeout(timeoutId);
  }, []); // Run only once on mount

  // Intersection observers for lazy loading
  useEffect(() => {
    // Wait for observersReady flag
    if (!observersReady) {
      return;
    }
    
    console.log('Setting up intersection observers...');
    
    const scrollContainer = document.querySelector('.chrona-main');
    
    const firstObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingPastRef.current) {
          console.log('First month visible, loading past...');
          loadPastMonths();
        }
      },
      { root: scrollContainer, rootMargin: '500px 0px 0px 0px', threshold: 0 }
    );

    const lastObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingFutureRef.current) {
          console.log('Last month visible, loading future...');
          loadFutureMonths();
        }
      },
      { root: scrollContainer, rootMargin: '0px 0px 500px 0px', threshold: 0 }
    );

    // Setup observers immediately
    if (firstMonthRef.current) {
      console.log('Observing first month:', firstMonthRef.current.getAttribute('data-month-key'));
      firstObserver.observe(firstMonthRef.current);
    }
    if (lastMonthRef.current) {
      console.log('Observing last month:', lastMonthRef.current.getAttribute('data-month-key'));
      lastObserver.observe(lastMonthRef.current);
    }

    return () => {
      firstObserver.disconnect();
      lastObserver.disconnect();
    };
  }, [observersReady, months.length, loadPastMonths, loadFutureMonths]);

  // Scroll handler for Today button visibility (based on scroll origin)
  useEffect(() => {
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (!hasInitiallyScrolledRef.current || scrollOriginRef.current === 0) {
        return;
      }
      
      const scrollTop = scrollContainer.scrollTop;
      const scrollOrigin = scrollOriginRef.current;
      
      // Show button if scrolled away from origin (either direction)
      const distanceFromOrigin = Math.abs(scrollTop - scrollOrigin);
      
      console.log('Scroll:', scrollTop, 'Origin:', scrollOrigin, 'Distance:', distanceFromOrigin);
      
      if (distanceFromOrigin > 100) {
        setShowTodayButton(true);
      } else {
        setShowTodayButton(false);
      }
    };

    // Initial check
    handleScroll();
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle orientation change and window resize to force grid recalculation
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      // Clear any pending resize handlers
      clearTimeout(resizeTimeout);
      
      // Debounce resize to avoid excessive recalculations
      resizeTimeout = setTimeout(() => {
        // Force a reflow to recalculate grid layout
        if (calendarRef.current) {
          // Trigger a reflow by reading offsetHeight
          void calendarRef.current.offsetHeight;
          
          // Force recalculation of grid by temporarily changing display
          const dayGrids = calendarRef.current.querySelectorAll('.calendar-days');
          dayGrids.forEach((grid) => {
            const htmlGrid = grid as HTMLElement;
            // Force browser to recalculate grid
            htmlGrid.style.display = 'grid';
            // Trigger reflow
            void htmlGrid.offsetHeight;
          });
        }
      }, 50);
    };

    // Listen for both resize and orientation change
    window.addEventListener('resize', handleResize);
    
    // Handle orientation change with a longer delay to ensure it's complete
    const handleOrientationChange = () => {
      // Use a longer delay for orientation change as it takes more time
      setTimeout(() => {
        handleResize();
        // Also trigger a visual update
        if (calendarRef.current) {
          const event = new Event('resize');
          window.dispatchEvent(event);
        }
      }, 200);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);
  
  return (
    <>
      <ChipBar labels={chipLabels} />
      <div className="calendar-view-months" ref={calendarRef}>
        {months.map((monthData, index) => {
          const isFirst = index === 0;
          const isLast = index === months.length - 1;
          return (
            <div 
              key={`${monthData.year}-${monthData.month}`} 
              className="calendar-month"
              data-month-key={`${monthData.year}-${monthData.month}`}
              ref={(el) => {
                if (isFirst) {
                  // @ts-ignore - ref assignment is valid
                  firstMonthRef.current = el;
                }
                if (isLast) {
                  // @ts-ignore - ref assignment is valid
                  lastMonthRef.current = el;
                }
              }}
            >
            <div className="calendar-month-header">
              <span className="calendar-month-name">{monthData.monthName}</span>
              <span className="calendar-year">{monthData.year}</span>
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
          );
        })}
      </div>
      
      <button 
        className="calendar-today-fab"
        onClick={handleScrollToToday}
        aria-label="Scroll to today"
        style={{ display: showTodayButton ? 'block' : 'none' }}
      >
        Go to Today
      </button>
    </>
  );
}

