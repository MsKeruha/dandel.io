import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import Icon from '../components/common/Icon';
import './OverlayContext.css';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
}

interface OverlayContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showPrompt: (message: string, title?: string, defaultValue?: string) => Promise<string | null>;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [resolver, setResolver] = useState<any>(null);
  const [promptValue, setPromptValue] = useState('');

  const showAlert = (message: string, title: string = 'Сповіщення') => {
    setDialog({ message, title, type: 'alert', confirmText: 'Зрозуміло' });
    return new Promise<void>((resolve) => setResolver(() => resolve));
  };

  const showConfirm = (message: string, title: string = 'Підтвердження') => {
    setDialog({ message, title, type: 'confirm', confirmText: 'Так, впевнений', cancelText: 'Скасувати' });
    return new Promise<boolean>((resolve) => setResolver(() => resolve));
  };

  const showPrompt = (message: string, title: string = 'Введення', defaultValue: string = '') => {
    setDialog({ message, title, type: 'prompt', confirmText: 'Підтвердити', cancelText: 'Скасувати', defaultValue });
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => setResolver(() => resolve));
  };

  const handleConfirm = () => {
    if (dialog?.type === 'prompt') {
      resolver(promptValue);
    } else if (dialog?.type === 'confirm') {
      resolver(true);
    } else {
      resolver();
    }
    setDialog(null);
  };

  const handleCancel = () => {
    if (dialog?.type === 'confirm') {
      resolver(false);
    } else {
      resolver(null);
    }
    setDialog(null);
  };

  return (
    <OverlayContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialog && (
        <div className="overlay-backdrop">
          <div className="themed-dialog glass-card">
            <div className="dialog-header">
              <div className={`dialog-icon-wrapper ${dialog.type}`}>
                <Icon 
                  name={dialog.type === 'alert' ? 'info' : dialog.type === 'confirm' ? 'help-circle' : 'edit-3'} 
                  size={24} 
                />
              </div>
              <h3>{dialog.title}</h3>
            </div>
            
            <p className="dialog-message">{dialog.message}</p>
            
            {dialog.type === 'prompt' && (
              <input
                type="text"
                className="dialog-prompt-input"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                autoFocus
              />
            )}
            
            <div className="dialog-actions">
              {dialog.type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  {dialog.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="btn-accent"
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (!context) throw new Error('useOverlay must be used within OverlayProvider');
  return context;
};
