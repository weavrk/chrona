import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  createAccount: (username: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hardcoded credentials for now (stored in lowercase for case-insensitive matching)
const USERS: Record<string, string> = {
  'kw': 'p'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('chrona_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('chrona_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    const usernameLower = username.toLowerCase();
    if (USERS[usernameLower] === password) {
      const userData = { username: usernameLower };
      setUser(userData);
      localStorage.setItem('chrona_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('chrona_user');
  };

  const createAccount = async (username: string, password: string): Promise<boolean> => {
    const usernameLower = username.toLowerCase();
    if (USERS[usernameLower]) {
      return false; // Username already exists
    }
    USERS[usernameLower] = password;
    const userData = { username: usernameLower };
    setUser(userData);
    localStorage.setItem('chrona_user', JSON.stringify(userData));
    
    // Create initial label list with only Mental Health
    // Load from global labels file to get current values
    let initialLabels = [
      {
        id: 'mental-health',
        name: 'Mental Health',
        abbreviation: 'ID',
        defaultColor: 'steel'
      }
    ];
    
    try {
      // Load global labels to get the mental-health label
      const globalLabelsResponse = await fetch(`${import.meta.env.BASE_URL}data/label-list-global.json?t=${Date.now()}`);
      if (globalLabelsResponse.ok) {
        const globalLabels = await globalLabelsResponse.json();
        const mentalHealthLabel = globalLabels.find((label: any) => label.id === 'mental-health');
        if (mentalHealthLabel) {
          initialLabels = [mentalHealthLabel];
        }
      }
    } catch (error) {
      console.error('Failed to load global labels, using fallback values:', error);
      // Continue with hardcoded fallback values
    }
    
    // Save initial labels to user's JSON file
    try {
      await fetch('/api/save_user_labels.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameLower, labels: initialLabels }),
      });
    } catch (error) {
      console.error('Failed to create initial labels for new user:', error);
      // Don't fail account creation if label save fails
    }
    
    // Create initial drug name files (empty arrays)
    try {
      // Create HR drug names file
      await fetch('/api/save_drug_names.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameLower, type: 'hr', drugNames: [] }),
      });
      
      // Create HS drug names file
      await fetch('/api/save_drug_names.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameLower, type: 'hs', drugNames: [] }),
      });
    } catch (error) {
      console.error('Failed to create initial drug name files for new user:', error);
      // Don't fail account creation if drug name file creation fails
    }
    
    // Create initial workout types file (empty array)
    try {
      await fetch('/api/save_workout_types.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameLower, workoutTypes: [] }),
      });
    } catch (error) {
      console.error('Failed to create initial workout types file for new user:', error);
      // Don't fail account creation if workout types file creation fails
    }
    
    // Create initial records file (empty object for date-indexed structure)
    try {
      await fetch('/api/save_records.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameLower, records: {} }),
      });
    } catch (error) {
      console.error('Failed to create initial records file for new user:', error);
      // Don't fail account creation if records file creation fails
    }
    
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, createAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

