# Phase 4 Completion Report: Database Migrations

## Summary

Phase 4 successfully removed all discussion-related database tables, foreign keys, and references while preserving the integrity of other application features.

## Changes Made

### 1. Fixed Historical Migrations

Updated old migrations to remove references to the deleted `channels` app:

#### notifications/migrations/0004_add_comment_event.py
- Removed `import channels.models`
- Changed `channels.models.Base36IntegerField()` to `models.CharField(max_length=10)` for `post_id` and `comment_id` fields

#### notifications/migrations/0005_moderator_post_notifications.py
- Removed `import channels.models`
- Changed `channels.models.Base36IntegerField()` to `models.CharField(max_length=10)` for `post_id` field

#### notifications/migrations/0006_moderator_post_notifiacation_channel.py
- Removed dependency on `("channels", "0026_channel_moderator_notifications")`
- Changed FK to channels from `models.ForeignKey(to="channels.Channel")` to `models.IntegerField()` to avoid lazy reference issues

#### moira_lists/migrations/0001_initial.py
- Removed dependency on `("channels", "0024_channel_membership_config")`

### 2. Created New Migration: 0007_remove_discussion_models.py

This migration performs the following database operations:

1. **Dropped Foreign Key Constraint**
   - Removed FK constraint `notifications_notifi_channel_id_a9e02816_fk_channels_` that referenced `channels_channel` table

2. **Dropped Unique Constraints**
   - Removed constraint `unique_with_channel` 
   - Removed index `unique_without_channel`

3. **Removed channel_id Column**
   - Dropped `channel_id` column from `notifications_notificationsettings` table using CASCADE

4. **Added New Unique Constraint**
   - Created constraint `unique_user_notification_type` on `(user_id, notification_type)` without channel dependency

5. **Deleted Discussion Models**
   - Deleted `CommentEvent` model/table
   - Deleted `PostEvent` model/table

### 3. Updated Models

#### notifications/models.py
- Updated `NotificationSettings.Meta.constraints`:
  - Removed `unique_with_channel` constraint
  - Removed `unique_without_channel` conditional constraint
  - Added simpler `unique_user_notification_type` constraint on `["user", "notification_type"]`

## Database State

### Before Phase 4
```
notifications_notificationsettings:
  - Had channel_id column (FK to channels_channel)
  - Had unique_with_channel constraint
  - Had unique_without_channel conditional constraint
  - Had FK constraint to channels_channel

Other tables:
  - notifications_commentevent (existed)
  - notifications_postevent (existed)
```

### After Phase 4
```
notifications_notificationsettings:
  - No channel_id column
  - Simple unique constraint on (user_id, notification_type)
  - No FK constraint to channels

Deleted tables:
  - notifications_commentevent (deleted)
  - notifications_postevent (deleted)
```

## Verification

### Django System Check
```bash
docker-compose exec web python manage.py check
# Result: System check identified no issues (0 silenced).
```

### Migration Status
```bash
docker-compose exec web python manage.py showmigrations notifications
# All migrations marked as [X] applied, including 0007_remove_discussion_models
```

### Database Verification
```bash
docker-compose exec db psql -U postgres -d postgres -c "\dt notifications_*"
# Result: Only 2 tables remain:
#   - notifications_emailnotification
#   - notifications_notificationsettings
```

## Files Modified

1. `moira_lists/migrations/0001_initial.py` - Removed channels dependency
2. `notifications/migrations/0004_add_comment_event.py` - Replaced channels.models references
3. `notifications/migrations/0005_moderator_post_notifications.py` - Replaced channels.models references
4. `notifications/migrations/0006_moderator_post_notifiacation_channel.py` - Changed FK to IntegerField
5. `notifications/models.py` - Updated constraints
6. `notifications/migrations/0007_remove_discussion_models.py` - **NEW** cleanup migration

## Key Technical Decisions

1. **Used RunSQL for column removal**: Since the database column was named `channel_id` but Django expected `channel`, direct SQL was more reliable than Django's RemoveField operation.

2. **Cascade deletion**: Used CASCADE when dropping the channel_id column to automatically clean up related constraints and indexes.

3. **Fixed historical migrations**: Rather than deleting old migrations (which could break existing deployments), updated them to replace channels-specific field types with standard Django fields.

4. **IntegerField instead of removing FK**: In migration 0006, changed the FK to an IntegerField to maintain migration history without requiring the channels app to be installed.

## Impact Assessment

### Removed
- ✅ Foreign key constraints to channels app
- ✅ channel_id column from NotificationSettings
- ✅ CommentEvent and PostEvent models/tables
- ✅ All discussion-related notification tracking

### Preserved
- ✅ EmailNotification model and functionality
- ✅ NotificationSettings model (without channel field)
- ✅ User notification preferences
- ✅ All non-discussion notification types
- ✅ Migration history integrity

## Next Steps

According to the AI Agent Guide, Phase 5 is next:
- Remove remaining references in code
- Clean up search index
- Update documentation
- Comprehensive testing

## Notes

- The database is now free of all channels/discussions foreign keys
- No orphaned data remains from discussion features
- All migrations can be run from scratch on a new database
- System check passes with no errors

## Commit

Committed as: `feat: Phase 4 - Remove discussion database references and models`
