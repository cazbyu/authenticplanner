import React from 'react';
import RoleBank from '../components/roles/RoleBank';

const RoleBankPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Role Bank</h1>
        <p className="text-gray-600 mt-1">
          Manage your life roles and authentic deposits
        </p>
      </div>
      <RoleBank />
    </div>
  );
};

export default RoleBankPage;