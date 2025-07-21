# Avatar Upload Database Migration

## Overview
This document describes the database changes required for the athlete avatar upload feature.

## Changes Made

### 1. Updated init.sql
- Added `avatar_url VARCHAR(500) NULL COMMENT '運動員頭像URL'` to the athletes table
- This ensures new installations will have avatar support built-in

### 2. Migration File
- Created `add_athlete_avatar_migration.sql` for existing installations
- Safe to run on existing databases (uses ALTER TABLE ADD COLUMN)

## For New Installations
No additional steps needed - the avatar_url column will be created automatically when running init.sql.

## For Existing Installations
Run the migration file:
```bash
# Using Docker
docker-compose -f docker-compose-react.yml exec db mysql -u dronesoccer -pdronesoccer123 drone_soccer < database/add_athlete_avatar_migration.sql

# Or directly with MySQL
mysql -u dronesoccer -pdronesoccer123 drone_soccer < database/add_athlete_avatar_migration.sql
```

## Verification
Check if the column exists:
```sql
DESCRIBE athletes;
-- Should show avatar_url column with varchar(500) type
```

## Column Details
- **Name**: `avatar_url`
- **Type**: `VARCHAR(500)`
- **Nullable**: `YES` (NULL allowed)
- **Default**: `NULL`
- **Comment**: `運動員頭像URL`

## Usage
The avatar_url field stores the relative path to the uploaded avatar image:
- Format: `/api/uploads/avatars/athlete_{id}_{timestamp}.{ext}`
- Example: `/api/uploads/avatars/athlete_123_1642781234567.jpg`
- Null value indicates no avatar uploaded

## File Storage
Avatar files are stored in:
- Development: `server/uploads/avatars/`
- Docker: `/app/uploads/avatars/` (inside container)
- Served via: `/api/uploads/avatars/` endpoint