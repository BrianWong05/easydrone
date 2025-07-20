-- Safe Migration: Add tournament_id to athletes table
-- This migration safely adds tournament support without dropping existing constraints

USE drone_soccer;

-- Check current table structure
SELECT 'Current athletes table structure:' as info;
DESCRIBE athletes;

-- Step 1: Add tournament_id column to athletes table (if not exists)
SET @sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'drone_soccer' 
            AND TABLE_NAME = 'athletes' 
            AND COLUMN_NAME = 'tournament_id');

SET @sql = IF(@sql > 0, 
    'SELECT "tournament_id column already exists" as info',
    'ALTER TABLE athletes ADD COLUMN tournament_id INT NULL AFTER team_id'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add index for tournament_id (if not exists)
SET @sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = 'drone_soccer' 
            AND TABLE_NAME = 'athletes' 
            AND INDEX_NAME = 'idx_athletes_tournament_id');

SET @sql = IF(@sql > 0,
    'SELECT "Index idx_athletes_tournament_id already exists" as info',
    'ALTER TABLE athletes ADD INDEX idx_athletes_tournament_id (tournament_id)'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Update existing athletes with tournament_id from their teams
UPDATE athletes a 
JOIN teams t ON a.team_id = t.team_id 
SET a.tournament_id = t.tournament_id 
WHERE a.tournament_id IS NULL AND t.tournament_id IS NOT NULL;

-- Step 4: Add foreign key constraint (if not exists)
SET @sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'drone_soccer' 
            AND TABLE_NAME = 'athletes' 
            AND CONSTRAINT_NAME = 'fk_athletes_tournament_id');

SET @sql = IF(@sql > 0,
    'SELECT "Foreign key fk_athletes_tournament_id already exists" as info',
    'ALTER TABLE athletes ADD CONSTRAINT fk_athletes_tournament_id FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Add new unique constraint (if not exists)
SET @sql = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'drone_soccer' 
            AND TABLE_NAME = 'athletes' 
            AND CONSTRAINT_NAME = 'unique_tournament_team_jersey');

SET @sql = IF(@sql > 0,
    'SELECT "Unique constraint unique_tournament_team_jersey already exists" as info',
    'ALTER TABLE athletes ADD CONSTRAINT unique_tournament_team_jersey UNIQUE KEY (tournament_id, team_id, jersey_number)'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verification queries
SELECT 'Athletes table structure after migration:' as status;
DESCRIBE athletes;

SELECT 'Indexes on athletes table:' as status;
SHOW INDEX FROM athletes;

SELECT 'Sample athletes with tournament_id:' as status;
SELECT a.athlete_id, a.name, a.jersey_number, a.tournament_id, t.team_name, tour.tournament_name
FROM athletes a
JOIN teams t ON a.team_id = t.team_id
LEFT JOIN tournaments tour ON a.tournament_id = tour.tournament_id
LIMIT 5;

SELECT 'Migration completed successfully! tournament_id column, index, and foreign key have been added to athletes table.' as migration_status;