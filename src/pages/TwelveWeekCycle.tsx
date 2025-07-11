I notice there are some duplicate closing sections and mismatched brackets in the code. Here's the corrected version with proper closures:

The main issues were:

1. Duplicate closing sections of the component (there were two closing sections with modals)
2. Extra closing brackets and tags that didn't match opening ones
3. A misplaced button closing tag

The fix is to remove the duplicate closing sections and ensure all brackets and tags are properly matched. The component should end with just one set of closing modals and the final export statement.

Here's the proper ending for the file (replacing everything after the tasks section):

```jsx
                                  </div>
                                );
                              }
                              
                              const categorizedTasks = categorizeTasksByPriority(weekTasks);
                              
                              return (
                                <div className="space-y-3">
                                  {/* Urgent & Important */}
                                  <PriorityQuadrant
                                    title="Urgent & Important"
                                    tasks={categorizedTasks.urgentImportant}
                                    bgColor="bg-red-500"
                                    borderColor="border-l-red-500"
                                    textColor="text-white"
                                    icon={<AlertTriangle className="h-3 w-3" />}
                                  />

                                  {/* Not Urgent & Important */}
                                  <PriorityQuadrant
                                    title="Not Urgent & Important"
                                    tasks={categorizedTasks.notUrgentImportant}
                                    bgColor="bg-green-500"
                                    borderColor="border-l-green-500"
                                    textColor="text-white"
                                    icon={<CheckCircle className="h-3 w-3" />}
                                  />

                                  {/* Urgent & Not Important */}
                                  <PriorityQuadrant
                                    title="Urgent & Not Important"
                                    tasks={categorizedTasks.urgentNotImportant}
                                    bgColor="bg-orange-500"
                                    borderColor="border-l-orange-500"
                                    textColor="text-white"
                                    icon={<Clock className="h-3 w-3" />}
                                  />

                                  {/* Not Urgent & Not Important */}
                                  <PriorityQuadrant
                                    title="Not Urgent & Not Important"
                                    tasks={categorizedTasks.notUrgentNotImportant}
                                    bgColor="bg-gray-500"
                                    borderColor="border-l-gray-500"
                                    textColor="text-white"
                                    icon={<X className="h-3 w-3" />}
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showGoalForm && (
        <TwelveWeekGoalForm
          onClose={() => setShowGoalForm(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}

      {editingGoal && (
        <TwelveWeekGoalEditForm
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onGoalUpdated={handleGoalUpdated}
          onGoalDeleted={handleGoalDeleted}
        />
      )}

      {showWeeklyGoalForm && (
        <WeeklyGoalForm
          onClose={() => setShowWeeklyGoalForm(null)}
          onGoalCreated={handleWeeklyGoalCreated}
          twelveWeekGoalId={showWeeklyGoalForm.goalId}
          weekNumber={showWeeklyGoalForm.weekNumber}
          prefilledDomains={showWeeklyGoalForm.domains}
          prefilledRoles={showWeeklyGoalForm.roles}
        />
      )}

      {editingWeeklyGoal && (
        <WeeklyGoalEditForm
          weeklyGoal={editingWeeklyGoal}
          onClose={() => setEditingWeeklyGoal(null)}
          onGoalUpdated={handleWeeklyGoalUpdated}
          onGoalDeleted={handleWeeklyGoalDeleted}
        />
      )}
    </div>
  );
};

export default TwelveWeekCycle;
```