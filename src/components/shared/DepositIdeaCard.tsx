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
  showEditButton?: boolean;
  showActivateButton?: boolean;
  className?: string;
}

const DepositIdeaCard: React.FC<DepositIdeaCardProps> = ({
  idea,
  roles,
  domains,
  onEdit,
  onActivate,
  showEditButton = true,
  showActivateButton = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const handleCardClick = () => {
    if (onEdit) {
      setIsSelected(true);
      setTimeout(() => setIsSelected(false), 200); // Brief selection effect
      onEdit(idea);
    }
  };

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

  return (
    <div 
      className={`
        bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all duration-200 cursor-pointer
        ${isHovered ? 'shadow-md border-blue-300 bg-blue-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-100' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="mb-3">
        <div className="flex items-start justify-between mb-2">
          <p className="text-gray-900 font-medium flex-1">{idea.title}</p>
          {showEditButton && onEdit && (
            <button
              onClick={handleEdit}
              className={`
                p-1 rounded-full transition-all duration-200 ml-2
                ${isHovered ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}
              `}
              title="Edit deposit idea"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {idea.notes && (
          <p className="text-sm text-gray-600 mb-2">{idea.notes}</p>
        )}
        
        {/* Show associated roles and domains */}
        <div className="flex flex-wrap gap-1 mb-3">
          {idea.deposit_idea_roles?.map(({ role_id }) => (
            roles[role_id] && (
              <span key={role_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                <Users className="h-3 w-3 mr-1" />
                {roles[role_id].label}
              </span>
            )
          ))}
          {idea.deposit_idea_domains?.map(({ domain_id }) => (
            domains[domain_id] && (
              <span key={domain_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                {domains[domain_id].name}
              </span>
            )
          ))}
        </div>

        {idea.key_relationship && (
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="text-sm text-gray-600">
              For: {idea.key_relationship.name}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {showActivateButton && onActivate && (
          <button
            onClick={handleActivate}
            className={`
              flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2
              ${isHovered ? 'bg-green-700' : ''}
            `}
          >
            <Target className="h-4 w-4" />
            Activate
          </button>
        )}
        
        {showEditButton && onEdit && (
          <button
            onClick={handleEdit}
            className={`
              ${showActivateButton && onActivate ? 'flex-1' : 'w-full'} bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2
              ${isHovered ? 'bg-blue-700' : ''}
            `}
          >
            <Edit className="h-4 w-4" />
            Update
          </button>
        )}
      </div>
    </div>
  );
};

export default DepositIdeaCard;