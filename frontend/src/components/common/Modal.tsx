import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mono-deepblack/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full ${maxWidths[maxWidth]} bg-mono-white border border-mono-border rounded-lg shadow-glass overflow-hidden transition-all`}
        role="dialog"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-mono-border bg-mono-offwhite">
          <h3 className="font-heading font-semibold text-lg text-mono-deepblack">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-mono-dark hover:text-mono-black hover:bg-mono-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
