import React from "react";

export default function TaskFilter({
  filter,
  setFilter,
  roles,
  domains,
}: {
  filter: any;
  setFilter: (x: any) => void;
  roles: any[];
  domains: string[];
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        className="border rounded px-2 py-1"
        placeholder="Search tasks"
        value={filter.text || ""}
        onChange={e => setFilter({ ...filter, text: e.target.value })}
      />
      <select
        value={filter.role || ""}
        onChange={e => setFilter({ ...filter, role: e.target.value })}
        className="border rounded px-2 py-1"
      >
        <option value="">All Roles</option>
        {roles.map(role => (
          <option key={role.id} value={role.id}>{role.label}</option>
        ))}
      </select>
      <select
        value={filter.domain || ""}
        onChange={e => setFilter({ ...filter, domain: e.target.value })}
        className="border rounded px-2 py-1"
      >
        <option value="">All Domains</option>
        {domains.map(domain => (
          <option key={domain} value={domain}>{domain}</option>
        ))}
      </select>
    </div>
  );
}
