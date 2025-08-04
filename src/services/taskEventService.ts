// services/taskEventService.ts
import { supabase } from "../supabaseClient";
import { generateJoinRows } from '../utils/relationshipHelpers';

/**
 * Save (insert or update) a task/event/deposit idea and ALL related joins
 */
export async function upsertTaskEventAndJoins({
  form,
  user,
  mode
}: {
  form: any,
  user: any,
  mode: "create" | "edit"
}) {
  // 1. Build mainRecord with new goal columns as needed
  // 2. Insert/update main record in tasks or deposit ideas table
  // 3. Insert universal join rows for notes, domains, etc.
  // 4. Handle errors, return results
  
  let recordId = form.id || null;

  // Decide table and prepare main record
  let tableName = form.schedulingType === "depositIdea" ? "0007-ap-deposit-ideas" : "0007-ap-tasks";
  let mainRecord: any;
if (form.schedulingType === "depositIdea") {
  mainRecord = {
    user_id: user.id,
    title: form.title,
    is_active: true,
    // No time fields
  };
} else if (form.schedulingType === "event") {
  mainRecord = {
    user_id: user.id,
    title: form.title,
    due_date: form.dueDate || null,
    start_time: form.dueDate && form.startTime
      ? new Date(`${form.dueDate}T${form.startTime}:00`).toISOString()
      : null,
    end_time: form.dueDate && form.endTime
      ? new Date(`${form.dueDate}T${form.endTime}:00`).toISOString()
      : null,
    is_all_day: form.isAllDay,
    is_urgent: form.urgent || false,
    is_important: form.important || false,
    is_authentic_deposit: form.authenticDeposit || false,
    is_twelve_week_goal: form.twelveWeekGoalChecked || false,
    status: 'pending',
    type: "event", // for clarity, if you want to distinguish in DB
  };
} else { // "task"
  mainRecord = {
    user_id: user.id,
    title: form.title,
    due_date: form.dueDate || null,
    start_time: form.dueDate && form.startTime
      ? new Date(`${form.dueDate}T${form.startTime}:00`).toISOString()
      : null,
    // Do NOT include end_time for tasks!
    is_all_day: form.isAllDay,
    is_urgent: form.urgent || false,
    is_important: form.important || false,
    is_authentic_deposit: form.authenticDeposit || false,
    is_twelve_week_goal: form.twelveWeekGoalChecked || false,
    status: 'pending',
    type: "task",
  };
}

  // Insert or update main record
  if (mode === "create") {
    const { data, error } = await supabase.from(tableName).insert([mainRecord]).select().single();
    if (error || !data) throw new Error(`Failed to create record: ${error?.message}`);
    recordId = data.id;
  } else {
    const { error } = await supabase.from(tableName).update(mainRecord).eq('id', form.id);
    if (error) throw error;
  }
  if (!recordId) throw new Error("No record ID after upsert.");

  // --- NOTES LOGIC ---
  if (form.notes?.trim()) {
    const { data: noteData } = await supabase.from("0007-ap-notes").insert([{ user_id: user.id, content: form.notes.trim() }]).select().single();
    if (noteData) {
      let joinTable = form.schedulingType === "depositIdea" ? "0007-ap-note-deposit-ideas" : "0007-ap-task-notes";
      let joinKey = form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id";
      await supabase.from(joinTable).delete().eq("user_id", user.id).eq(joinKey, recordId);
      await supabase.from(joinTable).insert([{ [joinKey]: recordId, note_id: noteData.id, user_id: user.id }]);
    }
  }

  // --- JOINS: ROLE, DOMAIN, KEY RELATIONSHIP ---
  // Remove old joins for everything
  const joinTables = [
    { table: form.schedulingType === "depositIdea" ? "0007-ap-roles-deposit-ideas" : "0007-ap-task-roles", key: form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id", ids: form.selectedRoleIds, join: "role_id" },
    { table: form.schedulingType === "depositIdea" ? "0007-ap-deposit-idea-domains" : "0007-ap-task-domains", key: form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id", ids: form.selectedDomainIds, join: "domain_id" },
    { table: form.schedulingType === "depositIdea" ? "0007-ap-deposit-idea-key-relationships" : "0007-ap-task-key-relationships", key: form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id", ids: form.selectedKeyRelationshipIds, join: "key_relationship_id" },
  ];
  for (const jt of joinTables) {
    await supabase.from(jt.table).delete().eq("user_id", user.id).eq(jt.key, recordId);
    if (jt.ids?.length > 0) {
      const rows = jt.ids.map((id: string) => ({ [jt.key]: recordId, [jt.join]: id, user_id: user.id }));
      await supabase.from(jt.table).insert(rows);
    }
  }

  // --- ADVANCED JOINS: ROLES-DOMAINS, KEY RELATIONSHIPS-DOMAINS ---
  if (form.selectedRoleIds?.length > 0 && form.selectedDomainIds?.length > 0) {
    const advTable = "0007-ap-roles-domains";
    await supabase.from(advTable).delete().eq("user_id", user.id).eq(form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id", recordId);
    const advRows = [];
    form.selectedRoleIds.forEach((roleId: string) => {
      form.selectedDomainIds.forEach((domainId: string) => {
        advRows.push({
          user_id: user.id,
          role_id: roleId,
          domain_id: domainId,
          [form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id"]: recordId,
        });
      });
    });
    if (advRows.length) await supabase.from(advTable).insert(advRows);
  }
  if (form.selectedKeyRelationshipIds?.length > 0 && form.selectedDomainIds?.length > 0) {
    const krDomTable = "0007-ap-key-relationships-domains";
    await supabase.from(krDomTable).delete().eq("user_id", user.id).eq(form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id", recordId);
    const krDomRows = [];
    form.selectedKeyRelationshipIds.forEach((krId: string) => {
      form.selectedDomainIds.forEach((domainId: string) => {
        krDomRows.push({
          user_id: user.id,
          key_relationship_id: krId,
          domain_id: domainId,
          [form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id"]: recordId,
        });
      });
    });
    if (krDomRows.length) await supabase.from(krDomTable).insert(krDomRows);
  }

  // --- 12 WEEK GOAL/RELATED JOINS ---
  if (form.twelveWeekGoalChecked && form.twelveWeekGoalId) {
    // Link task/deposit to goal, and link all joins
    const links = [
      { table: "0007-ap-goal-roles", ids: form.selectedRoleIds, join: "role_id" },
      { table: "0007-ap-goal-domains", ids: form.selectedDomainIds, join: "domain_id" },
      { table: "0007-ap-goal-key-relationships", ids: form.selectedKeyRelationshipIds, join: "key_relationship_id" },
    ];
    for (const l of links) {
      if (l.ids?.length > 0) {
        await supabase.from(l.table).insert(l.ids.map((id: string) => ({
          goal_id: form.twelveWeekGoalId,
          [l.join]: id,
          user_id: user.id,
          [form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id"]: recordId,
        })));
      }
    }
    // Link main to goal
    const joinTable = form.schedulingType === "depositIdea" ? "0007-ap-deposit-idea-12wkgoals" : "0007-ap-task-12wkgoals";
    await supabase.from(joinTable).delete().eq(form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id", recordId).eq("user_id", user.id);
    await supabase.from(joinTable).insert([{ goal_id: form.twelveWeekGoalId, [form.schedulingType === "depositIdea" ? "deposit_idea_id" : "task_id"]: recordId, user_id: user.id }]);
  }
}
