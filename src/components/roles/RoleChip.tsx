import React from 'react';
import { Role } from '../types';

interface RoleChipProps {
  role: Role;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
}

const RoleChip: React.FC<RoleChipProps> = ({ 
  role, 
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
        ${selected ? 'bg-secondary-500 text-white' : 'bg-secondary-100 text-secondary-700'}
        ${sizeClasses[size]}
        font-medium
        ${isClickable ? 'cursor-pointer hover:bg-opacity-90' : ''}
      `}
      onClick={onClick}
    >
      {role.name}
    </span>
  );
};

export default RoleChip;