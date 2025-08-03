// src/utils/relationshipHelpers.js

export const relationshipConfig = [
  // Notes relationships
  {
    type: "note-task",
    table: "0007-ap-task-notes",
    parentField: "note_id",
    childField: "task_id",
  },
  {
    type: "note-deposit-idea",
    table: "0007-ap-note-deposit-ideas",
    parentField: "note_id",
    childField: "deposit_idea_id",
  },
  {
    type: "note-goal",
    table: "0007-ap-goals-notes",
    parentField: "note_id",
    childField: "goal_id",
  },
  {
    type: "note-role",
    table: "0007-ap-note-roles",
    parentField: "note_id",
    childField: "role_id",
  },
  {
    type: "note-domain",
    table: "0007-ap-note-domains",
    parentField: "note_id",
    childField: "domain_id",
  },
  {
    type: "note-key-relationship",
    table: "0007-ap-note-key-relationships",
    parentField: "note_id",
    childField: "key_relationship_id",
  },

  // Core join relationships
  {
    type: "role-domain",
    table: "0007-ap-roles-domains",
    parentField: "role_id",
    childField: "domain_id",
  },
  {
    type: "key-relationship-domain",
    table: "0007-ap-key-relationships-domains",
    parentField: "key_relationship_id",
    childField: "domain_id",
  },

  // Goal-related joins
  {
    type: "goal-role",
    table: "0007-ap-goal-roles",
    parentField: "goal_id",
    childField: "role_id",
  },
  {
    type: "goal-domain",
    table: "0007-ap-goal-domains",
    parentField: "goal_id",
    childField: "domain_id",
  },
  {
    type: "goal-key-relationship",
    table: "0007-ap-goal-key-relationships",
    parentField: "goal_id",
    childField: "key_relationship_id",
  },
  {
    type: "task-12wkgoal",
    table: "0007-ap-task-12wkgoals",
    parentField: "task_id",
    childField: "goal_id",
  },
  {
    type: "goal-deposit-idea",
    table: "0007-ap-goal-deposit-ideas",
    parentField: "goal_id",
    childField: "deposit_idea_id",
  },
  // Add more as needed...
];
