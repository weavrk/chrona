import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DesignTokens {
  // Primitive Colors - Gray Scale (100-900, where 900 is white)
  'gray-100': string;
  'gray-200': string;
  'gray-300': string;
  'gray-400': string;
  'gray-500': string;
  'gray-600': string;
  'gray-700': string;
  'gray-800': string;
  // Palette Colors
  'steel': string;
  'sea-glass': string;
  'sage': string;
  'sand': string;
  'marigold': string;
  'coral': string;
  'brick': string;
  'ocean': string;
  'iris': string;
  'moss': string;
  
  // Semantic Colors (reference primitive names)
  'brand-primary': string;
  'primary': string;
  'secondary': string;
  'tertiary': string;
  'accent': string;
  'accent-2': string;
  'accent-3': string;
  'accent-4': string;
  'button-primary': string;
  'background-body': string;
  'background-shells': string;
  'background-components': string;
  'background-footer': string;
  'background-white': string;
}

interface DesignSystemContextType {
  tokens: DesignTokens;
  updateTokens: (tokens: Partial<DesignTokens>) => void;
  renameToken: (oldKey: string, newKey: string) => void;
  applyTokens: () => Promise<void>;
  exportTokens: () => void;
}

const defaultTokens: DesignTokens = {
  // Primitive Colors - Gray Scale (100-900, where 900 is white)
  'gray-100': '#141414',
  'gray-200': '#1f1f1f',
  'gray-300': '#2a2a2a',
  'gray-400': '#333333',
  'gray-500': '#4d4d4d',
  'gray-600': '#808080',
  'gray-700': '#b3b3b3',
  'gray-800': '#f2f2f2',
  // Palette Colors
  'steel': '#577E89',
  'sea-glass': '#5B95A5',
  'sage': '#6F9F9C',
  'sand': '#DEC484',
  'marigold': '#E1A36F',
  'coral': '#F7AD97',
  'brick': '#C75B5B',
  'ocean': '#5B95B5',
  'iris': '#6B6FAE',
  'moss': '#3F6B57',
  
  // Semantic Colors (reference primitive names)
  'brand-primary': 'coral',
  'primary': 'gray-100',
  'secondary': 'gray-500',
  'tertiary': 'gray-300',
    'accent': 'sea-glass',
  'accent-2': 'sage',
  'accent-3': 'sand',
  'accent-4': 'coral',
  'button-primary': 'gray-300',
  'background-body': 'gray-100',
  'background-shells': 'gray-200',
  'background-components': 'gray-300',
  'background-footer': 'gray-200',
  'background-white': 'gray-800',
};

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

// Get a random brand color from palette primitives (excluding grays)
function getRandomBrandColor(): string {
  const paletteColors = [
    'steel',
    'sea-glass',
    'sage',
    'sand',
    'marigold',
    'coral',
    'brick',
    'ocean',
    'iris',
    'moss',
  ];
  const randomIndex = Math.floor(Math.random() * paletteColors.length);
  return paletteColors[randomIndex];
}

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<DesignTokens>(defaultTokens);
  const [pendingTokens, setPendingTokens] = useState<DesignTokens>(defaultTokens);

  // Load tokens: JSON file is the source of truth, defaults only as fallback
  useEffect(() => {
    const loadTokens = async () => {
      try {
        // Try to load from the JSON file (source of truth)
        // Use BASE_URL so it works correctly under /hrefs/chrona/ in production
        const response = await fetch(`${import.meta.env.BASE_URL}design-tokens.json`);
        let loadedTokens: DesignTokens;
        
        if (response.ok) {
          const fileTokens = await response.json();
          // JSON file is complete source of truth - use it directly
          loadedTokens = fileTokens as DesignTokens;
        } else {
          // Only use defaults if JSON file doesn't exist
          console.warn('Design tokens JSON file not found, using defaults');
          loadedTokens = defaultTokens;
        }
        
        // Randomly pick a brand color from CMYK primitives (excluding grays)
        const randomBrandColor = getRandomBrandColor();
        loadedTokens['brand-primary'] = randomBrandColor;
        
        setTokens(loadedTokens);
        setPendingTokens(loadedTokens);
        applyTokensToDOM(loadedTokens);
      } catch (e) {
        console.error('Failed to load design tokens:', e);
        // Fallback to defaults only on error
        applyTokensToDOM(defaultTokens);
        setTokens(defaultTokens);
        setPendingTokens(defaultTokens);
      }
    };
    
    loadTokens();
  }, []);

  const getPrimitiveValue = (primitiveName: string, tokens: DesignTokens): string => {
    // Check if it's a direct hex value or a primitive reference
    if (primitiveName.startsWith('#')) {
      return primitiveName;
    }
    // Get the primitive color value
    return (tokens as any)[primitiveName] || primitiveName;
  };

  const applyTokensToDOM = (tokensToApply: DesignTokens) => {
    const root = document.documentElement;
    
    // List of semantic color keys (these reference primitives, not hex values)
    const semanticKeys = [
      'brand-primary', 'primary', 'secondary', 'tertiary', 'accent',
      'accent-2', 'accent-3', 'accent-4', 'button-primary', 'background-body',
      'background-shells', 'background-components', 'background-footer', 'background-white'
    ];
    
    // Dynamically set CSS variables for all primitive colors
    const allKeys = Object.keys(tokensToApply) as Array<keyof DesignTokens>;
    allKeys.forEach(key => {
      // Skip semantic colors - they're handled separately
      if (semanticKeys.includes(key as string)) {
        return;
      }
      
      const value = tokensToApply[key];
      if (typeof value === 'string') {
        if (value.startsWith('#')) {
          // It's a hex color - set CSS variable with the key name
          root.style.setProperty(`--${key}`, value);
        } else {
          // It's a reference to another color (shouldn't happen for primitives, but handle it)
          const resolvedValue = getPrimitiveValue(value, tokensToApply);
          root.style.setProperty(`--${key}`, resolvedValue);
        }
      }
    });
    
    // Semantic Colors (resolve primitive references) - dynamic mapping
    // Generate CSS variable names from semantic color keys
    allKeys.forEach(key => {
      if (semanticKeys.includes(key as string)) {
        const value = tokensToApply[key];
        if (typeof value === 'string') {
          const resolvedValue = getPrimitiveValue(value, tokensToApply);
          // Generate CSS variable name: "accent" -> "--color-accent", "button-primary" -> "--button-primary"
          let cssVarName = `--color-${key as string}`;
          // Special case for button-primary
          if (key === 'button-primary') {
            cssVarName = '--button-primary';
          }
          root.style.setProperty(cssVarName, resolvedValue);
        }
      }
    });
    
    // Legacy mappings for existing CSS (backward compatibility)
    // These use the semantic color keys if they exist in tokens
    const getSemanticValue = (key: string): string => {
      if (key in tokensToApply) {
        return getPrimitiveValue(tokensToApply[key as keyof DesignTokens], tokensToApply);
      }
      // Fallback if key was renamed (would need manual CSS update)
      return '#000000';
    };
    
    // Legacy CSS variables - try to use original semantic color names
    // If colors were renamed, these may need manual CSS updates
    if ('accent' in tokensToApply) {
      root.style.setProperty('--accent', getSemanticValue('accent'));
    }
    if ('accent-2' in tokensToApply) {
      root.style.setProperty('--accent-hover', getSemanticValue('accent-2'));
      root.style.setProperty('--accent-secondary', getSemanticValue('accent-2'));
    }
    if ('primary' in tokensToApply) {
      root.style.setProperty('--text-primary', getSemanticValue('primary'));
    }
    if ('secondary' in tokensToApply) {
      root.style.setProperty('--text-secondary', getSemanticValue('secondary'));
    }
    if ('accent-3' in tokensToApply) {
      root.style.setProperty('--accent-tertiary', getSemanticValue('accent-3'));
    }
  };

  const updateTokens = (newTokens: Partial<DesignTokens> | DesignTokens) => {
    const updated = { ...pendingTokens, ...newTokens } as DesignTokens;
    setPendingTokens(updated);
    // Apply changes immediately for real-time preview
    applyTokensToDOM(updated);
  };

  const renameToken = (oldKey: string, newKey: string) => {
    if (oldKey === newKey || !(oldKey in pendingTokens)) {
      return;
    }

    const updated = { ...pendingTokens } as any;
    const value = updated[oldKey];
    
    // Delete old key and add new key
    delete updated[oldKey];
    updated[newKey] = value;
    
    // Update all semantic colors that reference the old key
    const allKeys = Object.keys(updated) as Array<keyof DesignTokens>;
    allKeys.forEach(key => {
      const tokenValue = updated[key];
      // If this token references the old key, update it to reference the new key
      if (typeof tokenValue === 'string' && tokenValue === oldKey && !tokenValue.startsWith('#')) {
        updated[key] = newKey;
      }
    });
    
    setPendingTokens(updated as DesignTokens);
    // Apply changes immediately for real-time preview
    applyTokensToDOM(updated as DesignTokens);
  };

  const applyTokens = async () => {
    // Clean up deprecated keys before applying
    const cleanedTokens = { ...pendingTokens } as any;
    const keysToRemove = ['background-primary', 'background-secondary', 'background-tertiary', 'ocean-1', 'gray-900'];
    keysToRemove.forEach(key => {
      if (key in cleanedTokens) {
        delete cleanedTokens[key];
      }
    });
    
    setTokens(cleanedTokens as DesignTokens);
    setPendingTokens(cleanedTokens as DesignTokens);
    applyTokensToDOM(cleanedTokens as DesignTokens);
    
    // Save to JSON file (source of truth)
    try {
      const response = await fetch('/api/save_design_tokens.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens: cleanedTokens }),
      });
      
      if (response.ok) {
        // Clear localStorage so it always loads from JSON file
        localStorage.removeItem('designTokens');
      } else {
        console.error('Failed to save design tokens to file:', await response.text());
        // Fallback to localStorage if file save fails
        localStorage.setItem('designTokens', JSON.stringify(cleanedTokens));
      }
    } catch (error) {
      console.error('Error saving design tokens:', error);
      // Fallback to localStorage if API call fails
      localStorage.setItem('designTokens', JSON.stringify(cleanedTokens));
    }
  };

  const exportTokens = () => {
    // Create a downloadable JSON file for the user to update public/design-tokens.json
    const jsonString = JSON.stringify(pendingTokens, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-tokens.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DesignSystemContext.Provider value={{ tokens, updateTokens, renameToken, applyTokens, exportTokens }}>
      {children}
    </DesignSystemContext.Provider>
  );
}

export function useDesignSystem() {
  const context = useContext(DesignSystemContext);
  if (context === undefined) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
}

