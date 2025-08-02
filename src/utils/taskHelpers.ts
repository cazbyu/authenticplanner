// src/utils/taskHelpers.ts

/**
 * Converts a database task object (from any context) into the
 * initialData shape expected by TaskEventForm for editing.
 * 
 * Adjust/add fields as your schema evolves.
 */
export function formatTaskForForm(task: any) {
  if (!task) return {};

  // Handle start/end time formatting (support both timestamp and HH:MM:SS)
  const formatTime = (timeVal: string | undefined) => {
    if (!timeVal) return '';
    if (timeVal.includes('T')) {
      // ISO or timestamp string
      return new Date(timeVal).toTimeString().slice(0, 5);
    }
    // HH:MM:SS or HH:MM
    return timeVal.slice(0, 5);
  };

  return {
    id: task.id,
    title: task.title,
    dueDate: task.due_date || new Date().toISOString().split('T')[0],
    startTime: formatTime(task.start_time),
    endTime: formatTime(task.end_time),
    isAllDay: task.is_all_day || false,
    urgent: !!task.is_urgent,
    important: !!task.is_important,
    authenticDeposit: !!task.is_authentic_deposit,
    twelveWeekGoalChecked: !!task.is_twelve_week_goal,
    twelveWeekGoalId: (
      task.twelveWeekGoalId ||                  // Direct field (creation flow)
      task.task_12wkgoals?.[0]?.goal?.id ||    // Nested relation (db fetch)
      ''
    ),
    notes: task.notes || '',
    selectedRoleIds: 
      (task.selectedRoleIds) ||
      (task.task_roles?.map(tr => tr.role_id)) ||
      (task.roles?.map(r => r.id)) || [],
    selectedDomainIds: 
      (task.selectedDomainIds) ||
      (task.task_domains?.map(td => td.domain_id)) ||
      (task.domains?.map(d => d.id)) || [],
    selectedKeyRelationshipIds:
      (task.selectedKeyRelationshipIds) ||
      (task.task_key_relationships?.map(kr => kr.key_relationship_id)) || [],
    schedulingType: task.schedulingType || 'task',
    weekNumber: task.weekNumber, // Optional, mostly for 12-week context
    cycleStartDate: task.cycleStartDate, // Optional
    isFromDepositIdea: !!task.isFromDepositIdea, // For deposit idea -> task conversion
    originalDepositIdeaId: task.originalDepositIdeaId || '',
    // Add any extra custom fields as needed
  };
}
