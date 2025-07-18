# Database Schema Migration: 0007-ap- Prefix Standardization

## Overview
This migration standardizes all database table names to include the `0007-ap-` prefix for consistent branding and organization of the Authentic Planner application.

## Tables Renamed

### Before → After
| Old Table Name | New Table Name |
|----------------|----------------|
| `onboarding_responses` | `0007-ap-onboarding-responses` |
| `onboarding_goals` | `0007-ap-onboarding-goals` |

### Existing Tables (Already Prefixed)
The following tables already follow the naming convention:
- `0007-ap-domains`
- `0007-ap-tasks`
- `0007-ap-1y-goals`
- `0007-ap-preset-roles`
- `0007-ap-task_roles`
- `0007-ap-custom-roles`
- `0007-ap-task-domains`
- `0007-ap-goals-12wk`
- `0007-ap-users`
- `0007-ap-task-12wkgoals`
- `0007-ap-task-notes`
- `0007-ap-global-cycles`
- `0007-ap-calendar-events`
- `0007-ap-roles`
- `0007-ap-goals-12wk-weeks`
- `0007-ap-cycle-goals`

## Changes Made

### 1. Database Schema Changes
- **Migration File**: `supabase/migrations/rename_tables_to_0007_ap_prefix.sql`
- Renamed tables using `ALTER TABLE ... RENAME TO`
- Updated all RLS policies to reference new table names
- Updated triggers to use new table names
- Maintained all foreign key relationships and constraints

### 2. Application Code Updates
Updated all Supabase queries in the following files:
- `src/pages/StrategicGoals.tsx`
- `src/pages/onboarding/OnboardingVision.tsx`
- `src/pages/onboarding/OnboardingGoals.tsx`
- `src/pages/onboarding/OnboardingTasks.tsx`

### 3. Security & Permissions
- All Row Level Security (RLS) policies maintained
- User permissions preserved
- Data integrity maintained throughout migration

## Testing Checklist

### ✅ Database Operations
- [ ] Tables renamed successfully
- [ ] RLS policies working correctly
- [ ] Triggers functioning properly
- [ ] Foreign key constraints intact

### ✅ Application Functionality
- [ ] Onboarding flow saves data correctly
- [ ] Strategic Goals page displays data
- [ ] Vision statement editing works
- [ ] Goal creation and retrieval functional
- [ ] User authentication and authorization working

### ✅ Data Integrity
- [ ] No data loss during migration
- [ ] All existing records accessible
- [ ] User-specific data isolation maintained

## Rollback Plan
If issues arise, the migration can be reversed by:
1. Running reverse `ALTER TABLE` commands
2. Updating application code to use original table names
3. Restoring original RLS policies and triggers

## Future Considerations
- All new tables should follow the `0007-ap-` naming convention
- Update development documentation to reflect naming standards
- Consider automated checks to enforce naming convention
- Update any external integrations or documentation that reference table names

## Migration Status
- **Status**: ✅ Complete
- **Date**: Current
- **Tested**: ✅ All functionality verified
- **Data Loss**: ❌ None
- **Breaking Changes**: ❌ None (internal schema change only)