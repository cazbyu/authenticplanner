import React, { useState } from 'react';
import { Target, Edit, Heart, Users } from 'lucide-react';

interface Role {
  id: string;
  label: string;
}

interface Domain {
  id: string;
  name: string;
}

interface KeyRelationship {
  id: string;
  name: string;
}

interface DepositIdea {
  id: string;
  title: string;
  notes?: string;
  is_active: boolean;
  key_relationship_id?: string;
  key_relationship?: KeyRelationship;
  deposit_idea_roles?: Array<{ role_id: string }>;
  deposit_idea_domains?: Array<{ domain_id: string }>;
}

interface DepositIdeaCardProps {
  idea: DepositIdea;
  roles: Record<string, Role>;
  domains: Record<string, Domain>;
  onEdit?: (idea: DepositIdea) => void;
  onActivate?: (idea: DepositIdea) => void;
  onDelete?: (idea: DepositIdea) => void;
  showEditButton?: boolean;
  showActivateButton?: boolean;
  showDeleteButton?: boolean;
  className?: string;
}

const DepositIdeaCard: React.FC<DepositIdeaCardProps> = ({
  idea,
  roles,
  domains,
  onEdit,
  onActivate,
  onDelete,
  showEditButton = true,
  showActivateButton = true,
  showDeleteButton = true, // Defaulting to true to ensure the delete button is visible
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  [cite_start]// This function allows the entire card to be clickable to edit [cite: 8, 14]
  const handleCardClick = () => {
    if (onEdit) {
      setIsSelected(true);
      setTimeout(() => setIsSelected(false), 200); [cite_start]// Brief selection effect [cite: 9]
      onEdit(idea);
    }
  };

  [cite_start]// These handlers stop click propagation so clicking a button doesn't also trigger the card's onClick [cite: 10, 12, 13]
  const handleActivate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onActivate) {
      onActivate(idea);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(idea);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(idea);
    }
  };

  return (
    <div 
      className={`
        bg-white rounded-lg p-4 border transition-all duration-200 cursor-pointer
        ${isHovered ? 'shadow-md border-blue-300' : 'border-gray-200'}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
 
      {/* Title, Notes, & Tags Section */}
      <div className="mb-4">
        <p className="text-gray-900 font-medium">{idea.title}</p>
        
        {idea.notes && (
          <p className="text-sm text-gray-600 mt-1">{idea.notes}</p>
        )}
        
        [cite_start]{/* Associated roles and domains are preserved [cite: 17, 18, 19] */}
        <div className="flex flex-wrap gap-1 mt-3">
          {idea.deposit_idea_roles?.map(({ role_id }) => (
            roles[role_id] && (
              <span key={role_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Users className="h-3 w-3 mr-1.5" />
                {roles[role_id].label}
              </span>
            )
          ))}
          {idea.deposit_idea_domains?.map(({ domain_id }) => (
            domains[domain_id] && (
              <span key={domain_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {domains[domain_id].name}
              </span>
            )
          ))}
        </div>

        [cite_start]{/* Key relationship link is preserved [cite: 21] */}
        {idea.key_relationship && (
          <div className="flex items-center gap-2 mt-3">
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="text-sm text-gray-700 font-medium">
              For: {idea.key_relationship.name}
            </span>
          </div>
        )}
      </div>

      {/* --- New Button Section --- */}
      <div className="flex justify-end items-center gap-2 text-xs">
        {showActivateButton && onActivate && (
          <button
            onClick={handleActivate}
            className="bg-green-600 text-white rounded px-3 py-1 hover:bg-green-700 transition-colors"
          >
            Activate
          </button>
        )}
        {showEditButton && onEdit && (
          <button
            onClick={handleEdit}
            className="bg-blue-600 text-white rounded px-3 py-1 hover:bg-blue-700 transition-colors"
          >
            Update
          </button>
        )}
        {showDeleteButton && onDelete && (
          <button
            onClick={handleDelete}
            className="bg-red-600 text-white rounded px-3 py-1 hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default DepositIdeaCard;