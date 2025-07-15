@@ .. @@
 const RoleBankPage: React.FC = () => {
   return (
    <div className="h-full overflow-hidden">
-      <div className="mb-6">
-        <h1 className="text-2xl font-bold text-gray-900 text-center">Role Bank</h1>
-        <p className="text-gray-600 mt-1 text-center">
-          Manage your life roles and authentic deposits
-        </p>
-      <RoleBank />
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Role Bank</h1>
        <p className="text-gray-600 mt-1 text-center">
          Manage your life roles and authentic deposits
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <RoleBank />
      </div>
+      <RoleBank />
     </div>
   );
 };