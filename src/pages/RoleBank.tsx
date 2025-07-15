import React from 'react';
import RoleBank from '../components/roles/RoleBank';

const RoleBankPage: React.FC = () => {
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden">
        <RoleBank />
      </div>
    </div>
  );
};

export default RoleBankPage;
