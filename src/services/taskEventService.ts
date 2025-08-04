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
  let tableName = form.schedulingType === "depositIdea" ? "0007-ap-deposit-ideas" : "0007-ap-tasks";

  // -------- Main Record --------
  let mainRecord: any;
  if (form.schedulingType === "depositIdea") {
    mainRecord = {
      user_id: user.id,
      title: form.title,
      is_active: true,
      // Add more deposit idea fields as needed
    };
  } else {
    mainRecord = {
      user_id: user.id,
      title: form.title,
      due_date: form.dueDate || null,
      start_time: form.dueDate && form.startTime
        ? new Date(`${form.dueDate}T${form.startTime}:00`).toISOString()
        : null,
      end_time: form.schedulingType === "event" && form.dueDate && form.endTime
        ? new Date(`${form.dueDate}T${form.endTime}:00`).toISOString()
        : null,
      is_all_day: form.isAllDay,
      is_urgent: form.urgent || false,
      is_important: form.important || false,
      is_authentic_deposit: form.authenticDeposit || false,
      is_twelve_week_goal: form.twelveWeekGoalChecked || false,
      status: "pending",
      type: form.schedulingType, // "task" or "event"
      goal_12wk_id: form.twelveWeekGoalChecked ? form.twelveWeekGoalId : null,
      goal_1y_id: form.oneYearGoalId || null,
      // Add more task/event fields as needed
    };
  }

  // -------- Upsert Main Record --------
  if (mode === "create") {
    const { data, error } = await supabase.from(tableName).insert([mainRecord]).select().single();
    if (error || !data) throw new Error(`Failed to create record: ${error?.message}`);
    recordId = data.id;
  } else {
    const { error } = await supabase.from(tableName).update(mainRecord).eq('id', form.id);
    if (error) throw error;
  }
  if (!recordId) throw new Error("No record ID after upsert.");

  // -------- Universal Notes Join --------
  if (form.notes?.trim()) {
    const { data: noteData } = await supabase
      .from("0007-ap-notes")
      .insert([{ user_id: user.id, content: form.notes.trim() }])
      .select()
      .single();
    if (noteData) {
      // Clean up old joins for this parent (optional, usually not needed for universal join, but safe)
      await supabase.from("0007-ap-universal-notes-join")
        .delete()
        .eq("user_id", user.id)
        .eq("parent_type", form.schedulingType)
        .eq("parent_id", recordId);

      await supabase.from("0007-ap-universal-notes-join")
        .insert([{
          user_id: user.id,
          note_id: noteData.id,
          parent_type: form.schedulingType,
          parent_id: recordId,
        }]);
    }
  }

  // -------- Universal Roles Join --------
  if (form.selectedRoleIds?.length > 0) {
    // Remove old joins for this parent
    await supabase.from("0007-ap-universal-roles-join")
      .delete()
      .eq("user_id", user.id)
      .eq("parent_type", form.schedulingType)
      .eq("parent_id", recordId);

    const roleRows = form.selectedRoleIds.map((roleId: string) => ({
      user_id: user.id,
      role_id: roleId,
      parent_type: form.schedulingType,
      parent_id: recordId,
    }));
    await supabase.from("0007-ap-universal-roles-join").insert(roleRows);
  }

  // -------- Universal Domains Join --------
  if (form.selectedDomainIds?.length > 0) {
    await supabase.from("0007-ap-universal-domains-join")
      .delete()
      .eq("user_id", user.id)
      .eq("parent_type", form.schedulingType)
      .eq("parent_id", recordId);

    const domainRows = form.selectedDomainIds.map((domainId: string) => ({
      user_id: user.id,
      domain_id: domainId,
      parent_type: form.schedulingType,
      parent_id: recordId,
    }));
    await supabase.from("0007-ap-universal-domains-join").insert(domainRows);
  }

  // -------- Universal Key Relationships Join --------
  if (form.selectedKeyRelationshipIds?.length > 0) {
    await supabase.from("0007-ap-universal-key-relationships-join")
      .delete()
      .eq("user_id", user.id)
      .eq("parent_type", form.schedulingType)
      .eq("parent_id", recordId);

    const krRows = form.selectedKeyRelationshipIds.map((krId: string) => ({
      user_id: user.id,
      key_relationship_id: krId,
      parent_type: form.schedulingType,
      parent_id: recordId,
    }));
    await supabase.from("0007-ap-universal-key-relationships-join").insert(krRows);
  }

  // -------- Universal Goals Join (if you want to associate this parent with extra goals) --------
  // Example: for advanced scenarios, link parent to extra goals (other than the direct goal_id)
  if (form.extraGoalIds?.length > 0) {
    await supabase.from("0007-ap-universal-goals-join")
      .delete()
      .eq("user_id", user.id)
      .eq("parent_type", form.schedulingType)
      .eq("parent_id", recordId);

    const goalRows = form.extraGoalIds.map((goalId: string) => ({
      user_id: user.id,
      goal_id: goalId,
      parent_type: form.schedulingType,
      parent_id: recordId,
    }));
    await supabase.from("0007-ap-universal-goals-join").insert(goalRows);
  }

  // You can add more universal join logic for other entities here as needed!
}
