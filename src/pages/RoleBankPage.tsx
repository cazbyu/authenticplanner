import React from 'react';
import RoleBank from '../components/roles/RoleBank';

const RoleBankPage: React.FC = () => {
  // Instead of using state here, we rely on RoleBank's own internal state
  // So we only want to show the header if RoleBank is in its main state
  // The trick: Place the header INSIDE RoleBank's main view, not here.
  // Therefore: REMOVE the header block from this page entirely!

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden">
        <RoleBank />
      </div>
    </div>
  );
};

export default RoleBankPage;
