import { CalendarView } from './CalendarView';
import { DesignSystemPanel } from './DesignSystemPanel';

export function App() {
  return (
    <div className="chrona-app">
      <header className="chrona-header">
        <div className="chrona-wordmark">Chrona</div>
      </header>
      
      <main className="chrona-main">
        <CalendarView />
      </main>
      
      <DesignSystemPanel />
    </div>
  );
}

