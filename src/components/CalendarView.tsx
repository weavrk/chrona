import { useState, useRef, useEffect, useCallback } from 'react';
import { ChipBar } from './ChipBar';
import { RecordData } from './AddRecordSheet';
import { useAuth } from '../contexts/AuthContext';
import { useDesignSystem } from '../contexts/DesignSystemContext';

interface ChipLabel {
  id: string;
  label: string;
  color: string;
}

interface CalendarViewProps {
  isSheetOpen: boolean;
  selectedDate: Date | null;
  onSheetClose: () => void;
  onSheetDateChange: (date: Date, recordType?: string, recordData?: any[]) => void;
  onAddRecord: (record: RecordData, recordDate: Date) => void;
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

// Helper function to convert to title case
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export function CalendarView({ isSheetOpen: _isSheetOpen, selectedDate: _selectedDate, onSheetClose: _onSheetClose, onSheetDateChange, onAddRecord: _onAddRecord, chipLabels }: CalendarViewProps) {
  const { user } = useAuth();
  const { tokens } = useDesignSystem();
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'summary'>('calendar');
  const [records, setRecords] = useState<Record<string, any[]>>({});
  const [showTodayButton, setShowTodayButton] = useState(false);
  const [observersReady, setObserversReady] = useState(false);
  const [_visibleMonth, setVisibleMonth] = useState<{ year: number; month: number } | null>(null);
  const [_visibleDate, setVisibleDate] = useState<{ year: number; month: number; day: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const listViewRef = useRef<HTMLDivElement>(null);
  const firstMonthRef = useRef<HTMLDivElement>(null);
  const lastMonthRef = useRef<HTMLDivElement>(null);
  const isLoadingPastRef = useRef(false);
  const isLoadingFutureRef = useRef(false);
  const hasInitiallyScrolledRef = useRef(false);
  const scrollOriginRef = useRef<number>(0);
  
  // Separate scroll positions for each view (pre-calculated on load)
  const calendarScrollRef = useRef<number | null>(null); // null means not calculated yet
  const listScrollRef = useRef<number | null>(null); // null means not calculated yet
  const summaryScrollRef = useRef<number>(0); // Always 0 (top)
  
  // Swipe gesture handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  
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
    date.setHours(0, 0, 0, 0);
    
    // Pass all records for this date (AddRecordSheet will handle them)
    const dateKey = `${year}-${month}-${day}`;
    const dayRecords = records[dateKey] || [];
    
    // Pass the date and all records (no specific type)
    onSheetDateChange(date, undefined, dayRecords);
  };

  const handleScrollToToday = () => {
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return;
    
    const todayDate = new Date();
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth(); // 0-11
    const todayDay = todayDate.getDate();
    
    // Get actual header and chip bar heights from DOM
    const header = document.querySelector('.chrona-header') as HTMLElement;
    const chipBar = document.querySelector('.chip-bar-container') as HTMLElement;
    const headerHeight = header ? header.offsetHeight : 68;
    const chipBarHeight = chipBar ? chipBar.offsetHeight : 62;
    const targetTop = headerHeight + chipBarHeight;
    
    if (viewMode === 'calendar' && calendarRef.current) {
      // Calendar view: find the current month element
      const currentMonthElement = calendarRef.current.querySelector(
        `[data-month-key="${todayYear}-${todayMonth}"]`
      ) as HTMLElement;
      
      if (currentMonthElement) {
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
    } else if (viewMode === 'list' && listViewRef.current) {
      // List view: find today's date item
      const todayItem = listViewRef.current.querySelector(
        `[data-date-key="${todayYear}-${todayMonth}-${todayDay}"]`
      ) as HTMLElement;
      
      if (todayItem) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = todayItem.getBoundingClientRect();
        const currentScroll = scrollContainer.scrollTop;
        
        // Calculate the scroll position needed
        const elementTopRelativeToContainer = elementRect.top - containerRect.top + currentScroll;
        const scrollPosition = Math.max(0, elementTopRelativeToContainer - targetTop);
        
        scrollContainer.scrollTo({
          top: scrollPosition,
          behavior: 'smooth',
        });
        
        // Update origin
        scrollOriginRef.current = scrollPosition;
      }
    }
  };

  // Load more months in the past
  const loadPastMonths = useCallback(() => {
    if (isLoadingPastRef.current || viewMode !== 'calendar') return;
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
  }, [viewMode]);

  // Load more months in the future
  const loadFutureMonths = useCallback(() => {
    if (isLoadingFutureRef.current || viewMode !== 'calendar') return;
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
  }, [viewMode]);

  // Prevent browser scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Calculate calendar scroll position to current day
  const calculateCalendarScrollToToday = useCallback((): number | null => {
    if (!calendarRef.current) return null;
    
      const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return null;
      
      // Find the current month element using today's date
      const todayDate = new Date();
      const todayYear = todayDate.getFullYear();
      const todayMonth = todayDate.getMonth(); // 0-11
      
      const currentMonthElement = calendarRef.current.querySelector(
        `[data-month-key="${todayYear}-${todayMonth}"]`
      ) as HTMLElement;
      
      if (currentMonthElement) {
      // Get the month header element for more accurate positioning
      const monthHeader = currentMonthElement.querySelector('.calendar-month-header') as HTMLElement;
      const targetElement = monthHeader || currentMonthElement;
      
      // Get actual header and chip bar heights from DOM
      const header = document.querySelector('.chrona-header') as HTMLElement;
      const chipBar = document.querySelector('.chip-bar-container') as HTMLElement;
      const headerHeight = header ? header.offsetHeight : 68;
      const chipBarHeight = chipBar ? chipBar.offsetHeight : 62;
      const targetTop = headerHeight + chipBarHeight;
      
      // Get position relative to the scroll container
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();
      const currentScroll = scrollContainer.scrollTop;
      
      // Calculate the scroll position needed
      const elementTopRelativeToContainer = elementRect.top - containerRect.top + currentScroll;
      return Math.max(0, elementTopRelativeToContainer - targetTop);
    }
    return null;
  }, []);
        
  // Calculate list view scroll position to today (for pre-positioning)
  const calculateListViewScrollToToday = useCallback((): number | null => {
    if (!listViewRef.current) return null;
    
    const todayDate = new Date();
    const todayYear = todayDate.getFullYear();
    const todayMonth = todayDate.getMonth();
    const todayDay = todayDate.getDate();
    
    // Find today's date in list view
    const todayKey = `${todayYear}-${todayMonth}-${todayDay}`;
    const todayElement = listViewRef.current.querySelector(
      `[data-date-key="${todayKey}"]`
    ) as HTMLElement;
    
    if (todayElement) {
      // Get header height only (no chip bar in list view)
      const header = document.querySelector('.chrona-header') as HTMLElement;
      const headerHeight = header ? header.offsetHeight : 68;
      
      // Get the today element's position relative to the list container
      let elementTop = 0;
      let currentElement: HTMLElement | null = todayElement;
      
      // Walk up the DOM tree to calculate position relative to listViewRef.current
      while (currentElement && currentElement !== listViewRef.current) {
        elementTop += currentElement.offsetTop;
        currentElement = currentElement.offsetParent as HTMLElement;
      }
      
      // Add listViewRef.current's offsetTop to get position relative to scrollContainer
      elementTop += listViewRef.current.offsetTop;
      
      // Position today at the very top (just below header) - add small padding
      return Math.max(0, elementTop - headerHeight - 8);
    }
    return null;
  }, []);

  // Pre-calculate all scroll positions on initial load and when views are rendered
  useEffect(() => {
    const calculateAllScrollPositions = () => {
      const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
      if (!scrollContainer) {
        setTimeout(calculateAllScrollPositions, 50);
        return;
      }

      // Calculate calendar scroll position
      if (calendarRef.current && calendarScrollRef.current === null) {
        const calendarPos = calculateCalendarScrollToToday();
        if (calendarPos !== null) {
          calendarScrollRef.current = calendarPos;
          scrollOriginRef.current = calendarPos;
        }
      }

      // Calculate list view scroll position
      if (listViewRef.current && listScrollRef.current === null) {
        const listPos = calculateListViewScrollToToday();
        if (listPos !== null) {
          listScrollRef.current = listPos;
        }
      }

      // Summary is always 0
      summaryScrollRef.current = 0;

      // If calendar view is active on initial load, scroll to calculated position
      if (viewMode === 'calendar' && calendarScrollRef.current !== null && !hasInitiallyScrolledRef.current) {
        scrollContainer.scrollTop = calendarScrollRef.current;
        hasInitiallyScrolledRef.current = true;
          
          // Trigger observers setup after a delay
          setTimeout(() => {
            setObserversReady(true);
          }, 1000);
      }
    };

    // Wait for DOM to render
    const timeoutId = setTimeout(calculateAllScrollPositions, 300);
    return () => clearTimeout(timeoutId);
  }, [calculateCalendarScrollToToday, calculateListViewScrollToToday, viewMode]);

  // Track visible month header based on scroll position
  useEffect(() => {
    if (viewMode !== 'calendar' || !calendarRef.current) return;
    
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return;
    
    const updateVisibleMonth = () => {
      const monthHeaders = calendarRef.current?.querySelectorAll('.calendar-month-header');
      if (!monthHeaders || monthHeaders.length === 0) return;
      
      const containerRect = scrollContainer.getBoundingClientRect();
      const header = document.querySelector('.chrona-header') as HTMLElement;
      const chipBar = document.querySelector('.chip-bar-container') as HTMLElement;
      const headerHeight = header ? header.offsetHeight : 68;
      const chipBarHeight = chipBar ? chipBar.offsetHeight : 62;
      const targetTop = containerRect.top + headerHeight + chipBarHeight;
      
      let topVisibleMonth: { year: number; month: number } | null = null;
      let minDistance = Infinity;
      
      monthHeaders.forEach((header) => {
        const rect = header.getBoundingClientRect();
        const distanceFromTop = Math.abs(rect.top - targetTop);
        
        // Check if header is at or above the target position
        if (rect.top <= targetTop + 50 && distanceFromTop < minDistance) {
          const monthElement = header.closest('.calendar-month') as HTMLElement;
          if (monthElement) {
            const monthKey = monthElement.getAttribute('data-month-key');
            if (monthKey) {
              const [year, month] = monthKey.split('-').map(Number);
              topVisibleMonth = { year, month };
              minDistance = distanceFromTop;
            }
          }
        }
      });
      
      if (topVisibleMonth) {
        setVisibleMonth(topVisibleMonth);
      }
    };
    
    // Update on scroll
    scrollContainer.addEventListener('scroll', updateVisibleMonth);
    // Initial update
    updateVisibleMonth();
    
    return () => {
      scrollContainer.removeEventListener('scroll', updateVisibleMonth);
    };
  }, [viewMode, months.length, observersReady]);

  // Intersection observers for lazy loading
  useEffect(() => {
    // Wait for observersReady flag and only run for calendar view
    if (!observersReady || viewMode !== 'calendar') {
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
  }, [observersReady, months.length, loadPastMonths, loadFutureMonths, viewMode]);


  // Function to sync calendar view to a specific date

  // Scroll handler for Today button visibility and scroll position tracking
  useEffect(() => {
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      
      // Update scroll position for the active view (but don't override pre-calculated positions)
      // Only update if user is actively scrolling, not during view switches
      if (viewMode === 'calendar' && calendarScrollRef.current !== null) {
        calendarScrollRef.current = scrollTop;
      } else if (viewMode === 'list' && listScrollRef.current !== null) {
        listScrollRef.current = scrollTop;
      }
      // Summary always stays at 0
      
      // For list view, always show button if scrolled down
      if (viewMode === 'list') {
        if (scrollTop > 200) {
          setShowTodayButton(true);
        } else {
          setShowTodayButton(false);
        }
        return;
      }
      
      // For summary view, don't show button
      if (viewMode === 'summary') {
        setShowTodayButton(false);
        return;
      }
      
      // For calendar view, show button if scrolled away from today
      if (hasInitiallyScrolledRef.current && scrollOriginRef.current > 0) {
      const scrollOrigin = scrollOriginRef.current;
      const distanceFromOrigin = Math.abs(scrollTop - scrollOrigin);
      
      if (distanceFromOrigin > 100) {
        setShowTodayButton(true);
      } else {
        setShowTodayButton(false);
        }
      } else {
        // If not yet initialized, show button if scrolled significantly
        if (scrollTop > 200) {
          setShowTodayButton(true);
        } else {
          setShowTodayButton(false);
        }
      }
    };

    // Initial check
    handleScroll();
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [viewMode]);

  // Handle view mode changes with separate scroll management
  const prevViewMode = useRef<'calendar' | 'list' | 'summary'>(viewMode);
  useEffect(() => {
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return;

    // When entering a view, scroll to today
    if (viewMode === 'calendar' && prevViewMode.current !== 'calendar') {
      const scrollPos = calculateCalendarScrollToToday();
      if (scrollPos !== null) {
        calendarScrollRef.current = scrollPos;
        scrollOriginRef.current = scrollPos;
        scrollContainer.scrollTop = scrollPos;
      }
    } else if (viewMode === 'list' && prevViewMode.current !== 'list') {
      // Wait a bit for list to render, then scroll
      setTimeout(() => {
        const scrollPos = calculateListViewScrollToToday();
        if (scrollPos !== null) {
          listScrollRef.current = scrollPos;
          scrollContainer.scrollTop = scrollPos;
          console.log('List view scroll to today:', scrollPos);
        }
      }, 100);
    } else if (viewMode === 'summary' && prevViewMode.current !== 'summary') {
      scrollContainer.scrollTop = 0;
    }

    prevViewMode.current = viewMode;
  }, [viewMode, calculateCalendarScrollToToday, calculateListViewScrollToToday]);


  // Track visible date and month in list view
  useEffect(() => {
    if (viewMode !== 'list' || !listViewRef.current) return;
    
    const scrollContainer = document.querySelector('.chrona-main') as HTMLElement;
    if (!scrollContainer) return;
    
    const updateVisibleDate = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const header = document.querySelector('.chrona-header') as HTMLElement;
      const chipBar = document.querySelector('.chip-bar-container') as HTMLElement;
      const headerHeight = header ? header.offsetHeight : 68;
      const chipBarHeight = chipBar ? chipBar.offsetHeight : 62;
      const targetTop = containerRect.top + headerHeight + chipBarHeight;
      
      // Track the first visible date item
      const listItems = listViewRef.current?.querySelectorAll('.list-view-item');
      let topVisibleDate: { year: number; month: number; day: number } | null = null;
      let minItemDistance = Infinity;
      
      if (listItems) {
        listItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const distanceFromTop = Math.abs(rect.top - targetTop);
          
          // Check if item is at or above the target position
          if (rect.top <= targetTop + 100 && distanceFromTop < minItemDistance) {
            const dateKey = item.getAttribute('data-date-key');
            if (dateKey) {
              const [year, month, day] = dateKey.split('-').map(Number);
              topVisibleDate = { year, month, day };
              minItemDistance = distanceFromTop;
            }
          }
        });
      }
      
      if (topVisibleDate) {
        setVisibleDate(topVisibleDate);
      }
    };
    
    // Update on scroll
    scrollContainer.addEventListener('scroll', updateVisibleDate);
    // Initial update - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      updateVisibleDate();
    }, 100);
    
    return () => {
      scrollContainer.removeEventListener('scroll', updateVisibleDate);
    };
  }, [viewMode]);

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

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Minimum distance for a swipe
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0 && viewMode === 'calendar') {
        // Swipe left: switch to list view
        listScrollRef.current = null; // Reset to force recalculation to today
        setViewMode('list');
      } else if (distance < 0 && viewMode === 'calendar') {
        // Swipe right: switch to summary view
        setViewMode('summary');
      } else if (distance < 0 && viewMode === 'list') {
        // Swipe right: switch to calendar view
        calendarScrollRef.current = null; // Reset to force recalculation to today
        setViewMode('calendar');
      } else if (distance > 0 && viewMode === 'summary') {
        // Swipe left: switch to calendar view
        calendarScrollRef.current = null; // Reset to force recalculation to today
        setViewMode('calendar');
      }
    }
    
    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // SummaryView component
  const SummaryView = () => {
    const [summaryRecords, setSummaryRecords] = useState<Record<string, any[]>>({});
    const [summaryData, setSummaryData] = useState<any>(null);

    // Load records for summary calculation
    useEffect(() => {
      if (!user) return;
      
      const loadRecords = async () => {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            setSummaryRecords(data && typeof data === 'object' ? data : {});
          } else {
            // If file doesn't exist, set empty records
            setSummaryRecords({});
          }
        } catch (error) {
          console.error('Failed to load records for summary:', error);
          setSummaryRecords({});
        }
      };
      
      loadRecords();
    }, [user]);

    // Calculate summary data from records
    useEffect(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (!summaryRecords || Object.keys(summaryRecords).length === 0) {
        // Set empty summary data structure
        setSummaryData({
          period: {
            lastPeriodEndDate: null,
            lastPeriodStartDate: null,
            cycleDuration: null,
            nextPredictedPeriodStart: null,
            averageCycleLength: null,
            totalPeriods: 0
          },
          'hormone-replacement-therapy': {
            currentTreatments: [],
            lastTreatmentDate: null,
            totalTreatments: 0
          },
          hsv: {
            lastBreakoutDate: null,
            totalBreakouts: 0,
            lastTreatmentDate: null
          },
          'mental-health': {
            totalRecords: 0,
            lastRecordDate: null,
            mostCommonMood: null
          },
          workout: {
            totalWorkouts: 0,
            lastWorkoutDate: null,
            totalDuration: 0,
            mostCommonType: null
          }
        });
        return;
      }

      // Calculate period summary
      const periodDates: Date[] = [];
      Object.keys(summaryRecords).forEach(dateKey => {
        const dayRecords = summaryRecords[dateKey] || [];
        dayRecords.forEach((record: any) => {
          if (record.type === 'period') {
            const date = new Date(dateKey);
            periodDates.push(date);
          }
        });
      });
      periodDates.sort((a, b) => b.getTime() - a.getTime());

      let periodSummary: any = {
        lastPeriodEndDate: null,
        lastPeriodStartDate: null,
        cycleDuration: null,
        nextPredictedPeriodStart: null,
        averageCycleLength: null,
        totalPeriods: periodDates.length
      };

      if (periodDates.length > 0) {
        // Sort dates ascending for period detection
        const sortedDates = [...periodDates].sort((a, b) => a.getTime() - b.getTime());
        
        // Find periods (consecutive dates)
        const periods: Array<{ start: Date; end: Date }> = [];
        let currentPeriod: { start: Date; end: Date } | null = null;

        sortedDates.forEach((date, index) => {
          if (!currentPeriod) {
            currentPeriod = { start: date, end: date };
          } else {
            const prevDate = sortedDates[index - 1];
            const daysDiff = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 1) {
              // Consecutive day, extend period
              currentPeriod.end = date;
            } else {
              // New period
              periods.push(currentPeriod);
              currentPeriod = { start: date, end: date };
            }
          }
        });
        if (currentPeriod) {
          periods.push(currentPeriod);
        }
        
        // Sort periods by date descending (most recent first)
        periods.sort((a, b) => b.start.getTime() - a.start.getTime());

        if (periods.length > 0) {
          const lastPeriod = periods[0];
          periodSummary.lastPeriodStartDate = lastPeriod.start;
          periodSummary.lastPeriodEndDate = lastPeriod.end;
          const duration = Math.floor((lastPeriod.end.getTime() - lastPeriod.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          periodSummary.cycleDuration = duration;

          // Calculate average cycle length
          if (periods.length > 1) {
            const cycleLengths: number[] = [];
            for (let i = 1; i < periods.length; i++) {
              const cycleLength = Math.floor((periods[i - 1].start.getTime() - periods[i].start.getTime()) / (1000 * 60 * 60 * 24));
              cycleLengths.push(cycleLength);
            }
            if (cycleLengths.length > 0) {
              const avgCycle = Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length);
              periodSummary.averageCycleLength = avgCycle;
              // Predict next period (average cycle length from last period start)
              const nextPredicted = new Date(lastPeriod.start);
              nextPredicted.setDate(nextPredicted.getDate() + avgCycle);
              periodSummary.nextPredictedPeriodStart = nextPredicted;
            }
          }
        }
      }

      // Calculate other summaries
      const workoutRecords: Array<{ date: Date; type: string; duration: number }> = [];
      const mentalHealthRecords: Array<{ date: Date; mood: string }> = [];
      const hsvBreakouts: Date[] = [];
      const hrTreatments: Date[] = [];

      Object.keys(summaryRecords).forEach(dateKey => {
        const date = new Date(dateKey);
        const dayRecords = summaryRecords[dateKey] || [];
        dayRecords.forEach((record: any) => {
          if (record.type === 'workout' && record.data?.workoutType) {
            workoutRecords.push({
              date,
              type: record.data.workoutType,
              duration: record.data.duration || 0
            });
          } else if (record.type === 'mental-health' && record.data?.mood) {
            mentalHealthRecords.push({
              date,
              mood: record.data.mood
            });
          } else if (record.type === 'hsv' && record.data?.hadBreakout) {
            hsvBreakouts.push(date);
          } else if (record.type === 'hormone-replacement-therapy') {
            hrTreatments.push(date);
          }
        });
      });

      workoutRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
      mentalHealthRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
      hsvBreakouts.sort((a, b) => b.getTime() - a.getTime());
      hrTreatments.sort((a, b) => b.getTime() - a.getTime());

      const workoutSummary = {
        totalWorkouts: workoutRecords.length,
        lastWorkoutDate: workoutRecords.length > 0 ? workoutRecords[0].date : null,
        totalDuration: workoutRecords.reduce((sum, w) => sum + (w.duration || 0), 0),
        mostCommonType: workoutRecords.length > 0
          ? workoutRecords.reduce((acc, w) => {
              acc[w.type] = (acc[w.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          : null
      };

      const mentalHealthSummary = {
        totalRecords: mentalHealthRecords.length,
        lastRecordDate: mentalHealthRecords.length > 0 ? mentalHealthRecords[0].date : null,
        mostCommonMood: mentalHealthRecords.length > 0
          ? Object.entries(
              mentalHealthRecords.reduce((acc, m) => {
                acc[m.mood] = (acc[m.mood] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).sort((a, b) => b[1] - a[1])[0]?.[0] || null
          : null
      };

      const hsvSummary = {
        lastBreakoutDate: hsvBreakouts.length > 0 ? hsvBreakouts[0] : null,
        totalBreakouts: hsvBreakouts.length,
        lastTreatmentDate: null // Would need to check treatment records
      };

      const hrSummary = {
        currentTreatments: [],
        lastTreatmentDate: hrTreatments.length > 0 ? hrTreatments[0] : null,
        totalTreatments: hrTreatments.length
      };

      setSummaryData({
        period: periodSummary,
        'hormone-replacement-therapy': hrSummary,
        hsv: hsvSummary,
        'mental-health': mentalHealthSummary,
        workout: workoutSummary
      });
    }, [summaryRecords]);

    // Build summary display data
    const buildSummaryDisplay = () => {
      if (!summaryData) {
        // Return empty structure for each label type
        return chipLabels.map(label => ({
          id: label.id,
          label: label.label,
          data: [{ label: 'No records yet', value: 'Start adding records to see your summary' }]
        }));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const formatDate = (date: Date | null): string => {
        if (!date) return 'N/A';
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      };

      const daysAgo = (date: Date | null): number => {
        if (!date) return -1;
        const diff = today.getTime() - date.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
      };

      const formatDaysAgo = (days: number): string => {
        if (days < 0) return '';
        if (days === 0) return ' (today)';
        if (days === 1) return ' (1 day ago)';
        return ` (${days} days ago)`;
      };

      const formatDaysInFuture = (days: number): string => {
        if (days < 0) return '';
        if (days === 0) return ' (today)';
        if (days === 1) return ' (in 1 day)';
        return ` (in ${days} days)`;
      };

      const summaries: Array<{ id: string; label: string; data: Array<{ label: string; value: string }> }> = [];

      // Period summary
      if (chipLabels.find(l => l.id === 'period')) {
        const period = summaryData.period;
        const periodData: Array<{ label: string; value: string }> = [];
        
        if (period && period.lastPeriodEndDate) {
          const endDate = new Date(period.lastPeriodEndDate);
          const days = daysAgo(endDate);
          periodData.push({
            label: 'Last Period End Date',
            value: `${formatDate(endDate)}${formatDaysAgo(days)}`
          });
        } else {
          periodData.push({ label: 'Last Period End Date', value: 'No records' });
        }

        if (period && period.cycleDuration !== null && period.cycleDuration !== undefined) {
          periodData.push({
            label: 'Cycle Duration',
            value: `${period.cycleDuration} days`
          });
        }

        if (period && period.nextPredictedPeriodStart) {
          const predDate = new Date(period.nextPredictedPeriodStart);
          const days = daysAgo(predDate);
          periodData.push({
            label: 'Next Predicted Period Start',
            value: `${formatDate(predDate)}${formatDaysInFuture(-days)}`
          });
        }

        summaries.push({ id: 'period', label: 'Period', data: periodData.length > 0 ? periodData : [{ label: 'No records yet', value: 'Start adding period records' }] });
      }

      // Hormone Replacement Therapy
      if (chipLabels.find(l => l.id === 'hormone-replacement-therapy')) {
        const hr = summaryData['hormone-replacement-therapy'];
        const hrData: Array<{ label: string; value: string }> = [];
        
        if (hr && hr.lastTreatmentDate) {
          const date = new Date(hr.lastTreatmentDate);
          const days = daysAgo(date);
          hrData.push({
            label: 'Last Treatment Date',
            value: `${formatDate(date)}${formatDaysAgo(days)}`
          });
        }
        hrData.push({ label: 'Total Treatments', value: (hr && hr.totalTreatments) ? hr.totalTreatments.toString() : '0' });
        
        summaries.push({ id: 'hormone-replacement-therapy', label: 'Hormone Replacement Therapy', data: hrData.length > 0 ? hrData : [{ label: 'No records yet', value: 'Start adding HRT records' }] });
      }

      // HSV
      if (chipLabels.find(l => l.id === 'hsv')) {
        const hsv = summaryData.hsv;
        const hsvData: Array<{ label: string; value: string }> = [];
        
        if (hsv && hsv.lastBreakoutDate) {
          const date = new Date(hsv.lastBreakoutDate);
          const days = daysAgo(date);
          hsvData.push({
            label: 'Last Breakout Date',
            value: `${formatDate(date)}${formatDaysAgo(days)}`
          });
        }
        hsvData.push({ label: 'Total Breakouts', value: (hsv && hsv.totalBreakouts) ? hsv.totalBreakouts.toString() : '0' });
        
        summaries.push({ id: 'hsv', label: 'HSV', data: hsvData.length > 0 ? hsvData : [{ label: 'No records yet', value: 'Start adding HSV records' }] });
      }

      // Mental Health
      if (chipLabels.find(l => l.id === 'mental-health')) {
        const mh = summaryData['mental-health'];
        const mhData: Array<{ label: string; value: string }> = [];
        
        mhData.push({ label: 'Total Records', value: (mh && mh.totalRecords) ? mh.totalRecords.toString() : '0' });
        
        if (mh && mh.lastRecordDate) {
          const date = new Date(mh.lastRecordDate);
          const days = daysAgo(date);
          mhData.push({
            label: 'Last Record Date',
            value: `${formatDate(date)}${formatDaysAgo(days)}`
          });
        }
        
        if (mh && mh.mostCommonMood) {
          const moodLabels: Record<string, string> = {
            'light': 'Energized',
            'smile': 'Happy',
            'meh': 'Neutral',
            'frown': 'Sad',
            'annoyed': 'Annoyed',
            'angry': 'Angry'
          };
          mhData.push({
            label: 'Most Common Mood',
            value: moodLabels[mh.mostCommonMood] || mh.mostCommonMood
          });
        }
        
        summaries.push({ id: 'mental-health', label: 'Mental Health', data: mhData.length > 0 ? mhData : [{ label: 'No records yet', value: 'Start adding mental health records' }] });
      }

      // Workout
      if (chipLabels.find(l => l.id === 'workout')) {
        const wo = summaryData.workout;
        const woData: Array<{ label: string; value: string }> = [];
        
        woData.push({ label: 'Total Workouts', value: (wo && wo.totalWorkouts) ? wo.totalWorkouts.toString() : '0' });
        
        if (wo && wo.lastWorkoutDate) {
          const date = new Date(wo.lastWorkoutDate);
          const days = daysAgo(date);
          woData.push({
            label: 'Last Workout Date',
            value: `${formatDate(date)}${formatDaysAgo(days)}`
          });
        }
        
        if (wo && wo.mostCommonType && typeof wo.mostCommonType === 'object') {
          const mostCommon = Object.entries(wo.mostCommonType as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
          if (mostCommon) {
            woData.push({
              label: 'Most Common Type',
              value: mostCommon[0]
            });
          }
        }
        
        summaries.push({ id: 'workout', label: 'Workout', data: woData.length > 0 ? woData : [{ label: 'No records yet', value: 'Start adding workout records' }] });
      }

      return summaries;
    };

    const summaryDisplay = buildSummaryDisplay();
    
    // Helper to get label color
    const getLabelColorForSummary = (labelId: string): string => {
      const label = chipLabels.find(l => l.id === labelId);
      if (label) {
        return (tokens as any)[label.color] || '#B3B3B3';
      }
      // Fallback to default colors
      const defaultColors: Record<string, string> = {
        'period': (tokens as any)['brick'] || '#B3B3B3',
        'hormone-replacement-therapy': (tokens as any)['ocean'] || '#B3B3B3',
        'hsv': (tokens as any)['sand'] || '#B3B3B3',
        'mental-health': (tokens as any)['steel'] || '#B3B3B3',
        'workout': (tokens as any)['marigold'] || '#B3B3B3',
      };
      return defaultColors[labelId] || '#B3B3B3';
    };
    
    return (
      <div className="summary-view">
        <div className="summary-view-header">
          <h1>Record Summary</h1>
        </div>
        <div className="summary-view-content">
          {summaryDisplay.length > 0 ? (
            summaryDisplay.map((type) => {
              const label = chipLabels.find(l => l.id === type.id);
              const labelColor = getLabelColorForSummary(type.id);
              return (
              <div key={type.id} className="summary-section">
                <div className="summary-section-header-container">
                  <h2 className="summary-section-header">{type.label}</h2>
                  <button 
                    className="ds-chip-single-select"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: labelColor,
                      color: labelColor
                    }}
                  >
                    <span>{label?.label || type.label}</span>
                  </button>
                </div>
                <div className="summary-section-content">
                  {type.data.length > 0 ? (
                    type.data.map((item, index) => (
                      <div key={index} className="summary-data-item">
                        <span className="summary-data-label">{item.label}</span>
                        <span className="summary-data-value">{item.value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="summary-data-item">
                      <span className="summary-data-label">No data available</span>
                    </div>
                  )}
                </div>
              </div>
            );
            })
          ) : (
            <div className="summary-section">
              <p>No records found. Start adding records to see your summary.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Restore view mode after page reload
  useEffect(() => {
    const restoreViewMode = sessionStorage.getItem('restoreViewMode');
    if (restoreViewMode && (restoreViewMode === 'calendar' || restoreViewMode === 'list' || restoreViewMode === 'summary')) {
      if (restoreViewMode !== viewMode) {
        setViewMode(restoreViewMode);
      }
      sessionStorage.removeItem('restoreViewMode');
    }
  }, []);

  // Store current view mode in sessionStorage
  useEffect(() => {
    sessionStorage.setItem('currentViewMode', viewMode);
  }, [viewMode]);

  // Load records (load regardless of viewMode)
  useEffect(() => {
    if (!user) return;
    
    const loadRecords = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/${user.username}/records-list-${user.username}.json?t=${Date.now()}`);
        if (response.ok) {
          const data = await response.json();
          setRecords(data && typeof data === 'object' ? data : {});
        }
      } catch (error) {
        console.error('Failed to load records:', error);
      }
    };
    
    loadRecords();
  }, [user]);

  // No custom scroll after save - just let the natural scroll-to-today happen

  // Helper to get label color
  const getLabelColor = (labelId: string): string => {
    const label = chipLabels.find(l => l.id === labelId);
    if (label) {
      return (tokens as any)[label.color] || '#B3B3B3';
    }
    // Fallback to default colors from global labels
    const defaultColors: Record<string, string> = {
      'period': (tokens as any)['brick'] || '#B3B3B3',
      'hormone-replacement-therapy': (tokens as any)['ocean'] || '#B3B3B3',
      'hsv': (tokens as any)['sand'] || '#B3B3B3',
      'mental-health': (tokens as any)['steel'] || '#B3B3B3',
      'workout': (tokens as any)['marigold'] || '#B3B3B3',
    };
    return defaultColors[labelId] || '#B3B3B3';
  };

  // Helper to format record title
  const getRecordType = (record: any): string => {
    switch (record.type) {
      case 'period':
        return 'Period';
      case 'hormone-replacement-therapy':
        return 'Hormone Replacement Therapy';
      case 'hsv':
        return 'HSV';
      case 'mental-health':
        return 'Mental Health';
      case 'workout':
        return 'Workout';
      default:
        return record.type || 'Record';
    }
  };

  // Helper to format record details as a single line separated by |
  const getRecordDetails = (record: any): string | null => {
    const details: string[] = [];
    
    switch (record.type) {
      case 'period':
        if (record.data?.intensity) {
          details.push(record.data.intensity);
        }
        break;
      case 'hormone-replacement-therapy':
        if (record.data?.treatments && record.data.treatments.length > 0) {
          record.data.treatments.forEach((treatment: any) => {
            const treatmentParts: string[] = [];
            if (treatment.drugName) treatmentParts.push(treatment.drugName);
            if (treatment.dose) treatmentParts.push(`${treatment.dose}${treatment.doseUnit || ''}`);
            if (treatment.frequency) treatmentParts.push(`${treatment.frequency} ${treatment.frequencyUnit || ''}`);
            if (treatmentParts.length > 0) {
              details.push(treatmentParts.join(' '));
            }
          });
        }
        break;
      case 'hsv':
        if (record.data?.hadBreakout && record.data?.severity) {
          details.push(record.data.severity);
        }
        if (record.data?.treatments?.[0]) {
          const t = record.data.treatments[0];
          const treatmentParts: string[] = [];
          if (t.drugName) treatmentParts.push(t.drugName);
          if (t.dose) treatmentParts.push(`${t.dose}${t.doseUnit || ''}`);
          if (t.frequency) treatmentParts.push(`${t.frequency} ${t.frequencyUnit || ''}`);
          if (treatmentParts.length > 0) {
            details.push(treatmentParts.join(' '));
          }
        }
        break;
      case 'mental-health':
        if (record.data?.mood) {
          const moods: Record<string, string> = {
            'light': 'Energized',
            'smile': 'Happy',
            'meh': 'Neutral',
            'frown': 'Sad',
            'annoyed': 'Annoyed',
            'angry': 'Angry',
          };
          details.push(moods[record.data.mood] || record.data.mood);
        }
        if (record.data?.notes) {
          details.push(record.data.notes);
        }
        break;
      case 'workout':
        if (record.data?.workoutType) {
          details.push(record.data.workoutType);
        }
        if (record.data?.duration) {
          details.push(`${record.data.duration} ${record.data.durationUnit || 'minutes'}`);
        }
        break;
    }
    
    return details.length > 0 ? details.join(' | ') : null;
  };

  // Simple ListView component
  const ListView = () => {
    // Generate list of all dates from loaded months
    const allDates: Array<{
      date: Date;
      dayName: string;
      dayNumber: number;
      monthName: string;
      year: number;
      month: number;
    }> = [];

    months.forEach((monthData) => {
      const daysInMonth = new Date(monthData.year, monthData.month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(monthData.year, monthData.month, day);
        allDates.push({
          date,
          dayName: toTitleCase(date.toLocaleDateString('en-US', { weekday: 'long' })),
          dayNumber: day,
          monthName: toTitleCase(monthData.monthName),
          year: monthData.year,
          month: monthData.month
        });
      }
    });

    // Group dates by month for headers
    const datesByMonth = new Map<string, typeof allDates>();
    allDates.forEach((item) => {
      const key = `${item.year}-${item.month}`;
      if (!datesByMonth.has(key)) {
        datesByMonth.set(key, []);
      }
      datesByMonth.get(key)!.push(item);
    });

    return (
      <div className="list-view" ref={listViewRef}>
        <div className="list-view-content">
          {Array.from(datesByMonth.entries()).map(([monthKey, monthDates]) => {
            const firstDate = monthDates[0];
            return (
              <div key={monthKey} className="list-view-month-group">
                <div className="list-view-month-header" data-month-key={monthKey}>
                  <h2>{firstDate.monthName} {firstDate.year}</h2>
                </div>
                {monthDates.map((item) => {
                  const isToday = item.date.toDateString() === new Date().toDateString();
                  const dateKey = item.date.toISOString().split('T')[0];
                  const dayRecords = records[dateKey] || [];
                  const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][item.month];
                  
                  return (
                    <div 
                      key={`${item.year}-${item.month}-${item.dayNumber}`}
                      data-date-key={`${item.year}-${item.month}-${item.dayNumber}`}
                      data-month-key={`${item.year}-${item.month}`}
                      className={`list-view-item ${isToday ? 'list-view-item-today' : ''}`}
                    >
                      <div className="list-view-item-content">
                        <div className="list-view-item-date-header">
                          {item.dayName} {monthAbbr} {item.dayNumber}
                        </div>
                        {dayRecords.length > 0 ? (
                          <div className="list-view-records">
                            {(() => {
                              // Group records by type
                              const recordsByType = new Map<string, any[]>();
                              dayRecords.forEach((record: any) => {
                                const type = record.type;
                                if (!recordsByType.has(type)) {
                                  recordsByType.set(type, []);
                                }
                                recordsByType.get(type)!.push(record);
                              });

                              // Render grouped records
                              return Array.from(recordsByType.entries())
                                .map(([type, typeRecords]) => {
                                  const color = getLabelColor(type);
                                  const recordType = getRecordType(typeRecords[0]);
                                  
                                  // Filter out records with no details
                                  const recordsWithDetails = typeRecords
                                    .map((record: any) => ({
                                      record,
                                      details: getRecordDetails(record)
                                    }))
                                    .filter(({ details }) => details !== null);
                                  
                                  // Don't render if no records have details
                                  if (recordsWithDetails.length === 0) {
                                    return null;
                                  }
                                  
                                  return (
                                    <div 
                                      key={type}
                                      className="list-view-record-group"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSheetDateChange(item.date, type, typeRecords);
                                      }}
                                    >
                                      <div 
                                        className="list-view-record-bar" 
                                        style={{ backgroundColor: color }}
                                      />
                                      <div className="list-view-record-content">
                                        <div className="list-view-record-type">{recordType}</div>
                                        <div className="list-view-record-details-list">
                                          {recordsWithDetails.map(({ record, details }) => (
                                            <div key={record.id} className="list-view-record-details">
                                              {details}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                                .filter(Boolean); // Remove null entries
                            })()}
                          </div>
                        ) : (
                          <div 
                            className="list-view-empty"
                            onClick={() => onSheetDateChange(item.date)}
                          >
                            No records
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <>
      {viewMode !== 'summary' && viewMode !== 'list' && <ChipBar labels={chipLabels} />}
      <div 
        className={`view-switcher-container view-mode-${viewMode}`}
        ref={swipeContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`view-container calendar-view ${viewMode === 'calendar' ? 'active' : ''}`}>
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
      </div>
      
        <div className={`view-container list-view ${viewMode === 'list' ? 'active' : ''}`}>
          <ListView />
        </div>
        
        <div className={`view-container summary-view ${viewMode === 'summary' ? 'active' : ''}`}>
          <SummaryView />
        </div>
      </div>
      
      <div className="fab-container">
        {viewMode === 'list' && (
          <>
            <button 
              className="calendar-view-switcher-fab"
              onClick={() => setViewMode('calendar')}
              aria-label="Switch to calendar view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
      <button 
        className="calendar-today-fab"
        onClick={handleScrollToToday}
        aria-label="Scroll to today"
              style={{ display: showTodayButton ? 'flex' : 'none' }}
      >
        Go to Today
      </button>
          </>
        )}
        {viewMode === 'calendar' && (
          <>
            <button 
              className="calendar-view-switcher-fab"
              onClick={() => setViewMode('summary')}
              aria-label="Switch to summary view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <button 
              className="calendar-today-fab"
              onClick={handleScrollToToday}
              aria-label="Scroll to today"
              style={{ display: showTodayButton ? 'flex' : 'none' }}
            >
              Go to Today
            </button>
            <button 
              className="calendar-view-switcher-fab"
              onClick={() => setViewMode('list')}
              aria-label="Switch to list view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </>
        )}
        {viewMode === 'summary' && (
          <>
            <button 
              className="calendar-view-switcher-fab"
              onClick={() => setViewMode('calendar')}
              aria-label="Switch to calendar view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </>
  );
}

