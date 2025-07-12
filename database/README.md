# Database Migrations

This directory contains database initialization and migration files for the Drone Soccer application.

## Files

### Core Database Files
- `init.sql` - Initial database schema creation script
- `tournament_scoped_migration.sql` - Migration to add tournament support to existing tables
- `tournament_groups_migration.sql` - Migration to add tournament support to team groups

### Recent Migrations
- `add_team_description_migration.sql` - Adds description field to teams table (2025-07-12)

## Migration History

### 2025-07-12: Add Team Description Field
**File:** `add_team_description_migration.sql`
**Purpose:** Adds a `description` field to the `teams` table to store team descriptions (隊伍描述)

**Changes:**
- Added `description TEXT NULL` column to `teams` table
- Updated table comment to reflect the new field
- Positioned after `is_virtual` column for logical grouping

**How to Apply:**
```bash
# For existing databases
docker-compose -f docker-compose-react.yml exec db mysql -u dronesoccer -pdronesoccer123 < database/add_team_description_migration.sql

# Or manually execute the SQL
docker-compose -f docker-compose-react.yml exec db mysql -u dronesoccer -pdronesoccer123 -e "
USE drone_soccer;
ALTER TABLE teams ADD COLUMN description TEXT NULL COMMENT '隊伍描述' AFTER is_virtual;
"
```

**Verification:**
```sql
DESCRIBE teams;
-- Should show the description field between is_virtual and tournament_id
```

## Best Practices

1. **Always backup before migrations:** Create database backups before applying migrations
2. **Test migrations:** Test migrations on development environment first
3. **Document changes:** Update this README when adding new migrations
4. **Version control:** Keep all migration files in version control
5. **Rollback plans:** Consider rollback procedures for each migration

## Database Schema Updates

When updating the database schema:

1. Create a new migration file with descriptive name and date
2. Update `init.sql` to include the changes for new deployments
3. Test the migration on development environment
4. Document the changes in this README
5. Apply to production with proper backup procedures

## Current Schema Version

The current schema includes:
- Tournament support (multiple tournaments)
- Team groups with tournament scoping
- Teams with description field
- Athletes, matches, and standings
- Knockout bracket support