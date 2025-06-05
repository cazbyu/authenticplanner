import React from 'react';
import { WellnessDomain, DOMAIN_LABELS } from '../types';

interface DomainTagProps {
  domain: WellnessDomain;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
}

const DomainTag: React.FC<DomainTagProps> = ({ 
  domain, 
  size = 'md', 
  onClick,
  selected = false
}) => {
  const isClickable = !!onClick;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  return (
    <span
      className={`
        inline-flex items-center rounded-full
        ${selected ? `bg-${domain} text-white` : `bg-${domain}/10 text-${domain}`}
        ${sizeClasses[size]}
        font-medium
        ${isClickable ? 'cursor-pointer hover:bg-opacity-90' : ''}
      `}
      onClick={onClick}
    >
      {DOMAIN_LABELS[domain]}
    </span>
  );
};

export default DomainTag;