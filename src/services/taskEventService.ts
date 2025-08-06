import { supabase } from "../supabaseClient";

/**
 * Save (insert or update) a task/event/deposit idea and ALL related universal joins
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
  let recordId = form.id || null;
  let tableName =
    form.schedulingType === "depositIdea"
      ? "0007-ap-deposit-ideas"
      : form.schedulingType === "event"
      ? "0007-ap-tasks" // Use your correct table if you split events/tasks, else always "0007-ap-tasks"
      : "0007-ap-tasks";

  // Set the standardized parent_type for all joins:
  const joinParentType =
    form.schedulingType === "task"
      ? "task"
      : form.schedulingType === "event"
      ? "event"
      : "depositIdea";

  // -------- Main Record --------
  let mainRecord: any;
  if (form.schedulingType === "depositIdea") {
    mainRecord = {
      user_id: user.id,
      title: form.title,
      is_active: true,
      // ...other fields as needed
    };
  } else if (form.schedulingType === "event") {
    mainRecord = {
      user_id: user.id,
      title: form.title,
      due_date: form.dueDate || null,
      start_time:
        form.dueDate && form.startTime
          ? new Date(`${form.dueDate}T${form.startTime}:00`).toISOString()
          : null,
      end_time:
        form.dueDate && form.endTime
          ? new Date(`${form.dueDate}T${form.endTime}:00`).toISOString()
          : null,
      is_all_day: form.isAllDay,
      is_urgent: form.urgent || false,
      is_important: form.important || false,
      is_authentic_deposit: form.authenticDeposit || false,
      is_twelve_week_goal: form.twelveWeekGoalChecked || false,
      status: "pending",
      type: "event",
      goal_12wk_id: form.twelveWeekGoalChecked ? form.twelveWeekGoalId : null,
      goal_1y_id: form.oneYearGoalId || null,
      // ...other fields as needed
    };
  } else {
    // TASK: EXPLICITLY NULL OUT END TIME
    mainRecord = {
      user_id: user.id,
      title: form.title,
      due_date: form.dueDate || null,
      start_time:
        form.dueDate && form.startTime
          ? new Date(`${form.dueDate}T${form.startTime}:00`).toISOString()
          : null,
      end_time: null, // <---- THIS FORCES END TIME TO BE NULL FOR TASKS!
      is_all_day: form.isAllDay,
      is_urgent: form.urgent || false,
      is_important: form.important || false,
      is_authentic_deposit: form.authenticDeposit || false,
      is_twelve_week_goal: form.twelveWeekGoalChecked || false,
      status: "pending",
      type: "task",
      goal_12wk_id: form.twelveWeekGoalChecked ? form.twelveWeekGoalId : null,
      goal_1y_id: form.oneYearGoalId || null,
      // ...other fields as needed
    };
  }

  // -------- Upsert Main Record --------
  if (mode === "create") {
    const { data, error } = await supabase
      .from(tableName)
      .insert([mainRecord])
      .select()
      .single();
    if (error || !data)
      throw new Error(`Failed to create record: ${error?.message}`);
    recordId = data.id;
  } else {
    const { error } = await supabase
      .from(tableName)
      .update(mainRecord)
      .eq("id", form.id);
    if (error) throw error;
  }
  if (!recordId) throw new Error("No record ID after upsert.");

  // --- UNIVERSAL GOAL JOIN: Always link task/event/depositIdea to goal in universal join table if a goal is present ---
console.log(
  "JOIN BLOCK DEBUG",
  {
    twelveWeekGoalChecked: form.twelveWeekGoalChecked,
    twelveWeekGoalId: form.twelveWeekGoalId,
    form,
    recordId
  }
);

    
  if (form.twelveWeekGoalChecked && form.twelveWeekGoalId) {
    // Remove any previous links for this record to avoid duplicates
    await supabase
      .from("0007-ap-universal-goals-join")
      .delete()
      .eq("user_id", user.id)
      .eq("parent_type",joinParentType)
      .eq("parent_id", recordId);

    // Insert the new universal join row
    await supabase.from("0007-ap-universal-goals-join").insert([
      {
        user_id: user.id,
        goal_id: form.twelveWeekGoalId,
        parent_type: "task",
        parent_id: recordId
      }
    ]);
  }

  // -------- Universal Notes Join --------
  // Always clean up old joins, then insert a note only if field is non-empty
  await supabase
    .from("0007-ap-universal-notes-join")
    .delete()
    .eq("user_id", user.id)
    .eq("parent_type", joinParentType)
    .eq("parent_id", recordId);

  if (form.notes?.trim()) {
    const { data: noteData } = await supabase
      .from("0007-ap-notes")
      .insert([{ user_id: user.id, content: form.notes.trim() }])
      .select()
      .single();
    if (noteData) {
      await supabase.from("0007-ap-universal-notes-join").insert([
        {
          user_id: user.id,
          note_id: noteData.id,
          parent_type: joinParentType,
          parent_id: recordId
        }
      ]);
    }
  }

  // -------- Universal Roles Join --------
  // Always clean up old joins, then insert if there are selected roles
  await supabase
    .from("0007-ap-universal-roles-join")
    .delete()
    .eq("user_id", user.id)
    .eq("parent_type", joinParentType)
    .eq("parent_id", recordId);

  if (form.selectedRoleIds?.length > 0) {
    const roleRows = form.selectedRoleIds.map((roleId: string) => ({
      user_id: user.id,
      role_id: roleId,
      parent_type: joinParentType,
      parent_id: recordId
    }));
    await supabase.from("0007-ap-universal-roles-join").insert(roleRows);
  }

  // -------- Universal Domains Join --------
  await supabase
    .from("0007-ap-universal-domains-join")
    .delete()
    .eq("user_id", user.id)
    .eq("parent_type", joinParentType)
    .eq("parent_id", recordId);

  if (form.selectedDomainIds?.length > 0) {
    const domainRows = form.selectedDomainIds.map((domainId: string) => ({
      user_id: user.id,
      domain_id: domainId,
      parent_type: joinParentType,
      parent_id: recordId
    }));
    await supabase.from("0007-ap-universal-domains-join").insert(domainRows);
  }

  // -------- Universal Key Relationships Join --------
  await supabase
    .from("0007-ap-universal-key-relationships-join")
    .delete()
    .eq("user_id", user.id)
    .eq("parent_type", joinParentType)
    .eq("parent_id", recordId);

  if (form.selectedKeyRelationshipIds?.length > 0) {
    const krRows = form.selectedKeyRelationshipIds.map((krId: string) => ({
      user_id: user.id,
      key_relationship_id: krId,
      parent_type: joinParentType,
      parent_id: recordId
    }));
    await supabase
      .from("0007-ap-universal-key-relationships-join")
      .insert(krRows);
  }

  // -------- Universal Extra Goals Join --------
  if (form.extraGoalIds?.length > 0) {
  // Only run this if extra goals exist!
  await supabase
    .from("0007-ap-universal-goals-join")
    .delete()
    .eq("user_id", user.id)
    .eq("parent_type", joinParentType)
    .eq("parent_id", recordId);

  const goalRows = form.extraGoalIds.map((goalId) => ({
    user_id: user.id,
    goal_id: goalId,
    parent_type: joinParentType,
    parent_id: recordId
  }));
  await supabase.from("0007-ap-universal-goals-join").insert(goalRows);
}


  // You can add more universal join logic for other entities here as needed!
}
