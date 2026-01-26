import { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

interface SearchableInputProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  color?: string;
  id?: string;
}

export function SearchableInput({ value, options, onChange, onBlur, placeholder, color, id }: SearchableInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onBlur) {
          onBlur();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(newValue.length > 0 && filteredOptions.length > 0);
  };

  const handleInputFocus = () => {
    if (filteredOptions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSelectOption = (option: string) => {
    setSearchTerm(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="custom-dropdown-wrapper" ref={wrapperRef}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={() => {
          // Delay closing to allow option click
          setTimeout(() => {
            setIsOpen(false);
            // Call onBlur callback after dropdown closes
            if (onBlur) {
              onBlur();
            }
          }, 200);
        }}
        className="form-input"
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="custom-dropdown-menu" style={{ zIndex: 10000 }}>
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`custom-dropdown-item ${value === option ? 'selected' : ''}`}
              onClick={() => handleSelectOption(option)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
              style={color ? { 
                color: value === option ? color : undefined,
                borderColor: value === option ? color : undefined
              } : undefined}
            >
              <span>{option}</span>
              {value === option && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

