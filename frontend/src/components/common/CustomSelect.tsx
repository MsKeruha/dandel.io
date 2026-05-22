import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  icon?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={containerRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="trigger-content">
          {icon && <Icon name={icon} size={14} color="var(--dandel-green)" />}
          <span>{selectedOption?.label}</span>
        </div>
        <Icon name="chevron-down" size={14} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="custom-select-options glass-card">
          {options.map((option) => (
            <div 
              key={option.value} 
              className={`custom-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .custom-select-container {
          position: relative;
          width: 100%;
        }
        
        .custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          border: 1px solid rgba(26, 46, 32, 0.1);
          border-radius: var(--radius-md);
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .custom-select-trigger:hover {
          border-color: var(--dandel-mint);
        }
        
        .custom-select-trigger.open {
          border-color: var(--dandel-green);
          box-shadow: 0 0 0 3px rgba(63, 143, 82, 0.1);
        }
        
        .trigger-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: var(--dandel-meadow-dark);
        }
        
        .chevron {
          transition: transform var(--transition-normal);
          color: var(--dandel-meadow-light);
        }
        
        .chevron.rotated {
          transform: rotate(180deg);
        }
        
        .custom-select-options {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          width: 100%;
          background: white;
          z-index: 100;
          padding: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
          animation: selectIn 0.2s ease forwards;
        }
        
        .custom-option {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--dandel-meadow-light);
        }
        
        .custom-option:hover {
          background-color: var(--dandel-puff);
          color: var(--dandel-green);
        }
        
        .custom-option.selected {
          background-color: var(--dandel-green-light);
          color: var(--dandel-green);
          font-weight: bold;
        }
        
        @keyframes selectIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CustomSelect;
