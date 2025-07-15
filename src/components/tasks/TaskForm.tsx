
              >
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700 flex-1">{formatDateDisplay(form.dueDate)}</span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
              
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2 w-56">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    <h3 className="text-xs font-medium text-gray-900">
                      {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                    </h3>
                    
                    <button
                      type="button"
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <div key={index} className="text-xs font-medium text-gray-500 text-center py-1">
                        {day}
                      </div>
                    ))}
                    
                    {calendarDays.map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleDateSelect(day.date)}
                        className={`
                          text-xs p-1 rounded-full text-center transition-colors
                          ${!day.isCurrentMonth 
                            ? 'text-gray-300 hover:bg-gray-50' 
                            : day.isSelected
                            ? 'bg-blue-600 text-white'
                            : day.isToday
                            ? 'bg-blue-100 text-blue-600 font-medium hover:bg-blue-200'
                            : 'text-gray-700 hover:bg-gray-100'
                          }
                        `}
                      >
                        {day.date}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time and All Day */}
            <div className="flex flex-col gap-1 relative">
              {formType === 'event' ? (
                <div className="flex items-center gap-1 w-full">
                  <select
                    name="startTime"
                    value={form.startTime}
                    onChange={(e) => {
                      const newStartTime = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        startTime: newStartTime,
                        endTime: calculateEndTime(newStartTime)
                      }));
                    }}
                    disabled={form.isAllDay}
                    className="w-24 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                  >
                    {timeOptions.map(time => (
                      <option key={time.value} value={time.value}>{time.label}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 px-1">–</span>
                  <select
                    name="endTime"
                    value={form.endTime}
                    onChange={handleChange}
                    disabled={form.isAllDay}
                    className="w-36 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                  >
                    {generateEndTimeOptions(form.startTime).map(time => (
                      <option key={time.value} value={time.value}>{time.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  disabled={form.isAllDay}
                  className="w-24 text-sm border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 appearance-none"
                >
                  {timeOptions.map(time => (
                    <option key={time.value} value={time.value}>{time.label}</option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isAllDay"
                  checked={form.isAllDay}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                All Day
              </label>
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              <div className="grid grid-cols-2 gap-2">
                {roles.map((role, index) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={form.selectedRoleIds.includes(role.id)}
                      onChange={() => handleMultiSelect('selectedRoleIds', role.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Domains */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Domains</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              <div className="grid grid-cols-2 gap-2">
                {domains.map(domain => (
                  <label key={domain.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      checked={form.selectedDomainIds.includes(domain.id)}
                      onChange={() => handleMultiSelect('selectedDomainIds', domain.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-xs">{domain.name}</span>

                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Key Relationships */}
          {form.selectedRoleIds.length > 0 && (
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Key Relationships</label>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              <div className="grid grid-cols-2 gap-2">
                {keyRelationships
                  .filter(relationship => form.selectedRoleIds.includes(relationship.role_id))
                  .map(relationship => (
                    <label key={relationship.id} className="flex items-center gap-2 text-sm py-1">
                      <input
                        type="checkbox"
                        checked={form.selectedKeyRelationshipIds.includes(relationship.id)}
                        onChange={() => handleMultiSelect('selectedKeyRelationshipIds', relationship.id)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs">{relationship.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : `Create ${formType === 'event' ? 'Event' : 'Task'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;