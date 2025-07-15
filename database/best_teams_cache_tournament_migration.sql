-- Migration: Add tournament_id to best_teams_cache table
-- This migration adds tournament support to the best teams cache system
-- Run this on existing databases that already have the best_teams_cache table

USE drone_soccer;

-- Check if tournament_id column already exists
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'drone_soccer' 
    AND TABLE_NAME = 'best_teams_cache' 
    AND COLUMN_NAME = 'tournament_id'
);

-- Add tournament_id column if it doesn't exist
SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE best_teams_cache ADD COLUMN tournament_id INT AFTER cache_id',
    'SELECT "tournament_id column already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for tournament_id if it doesn't exist
SET @index_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'drone_soccer' 
    AND TABLE_NAME = 'best_teams_cache' 
    AND INDEX_NAME = 'idx_tournament_id'
);

SET @sql = IF(@index_exists = 0, 
    'ALTER TABLE best_teams_cache ADD INDEX idx_tournament_id (tournament_id)',
    'SELECT "idx_tournament_id index already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint if it doesn't exist
-- Note: We need to check if the constraint exists first
SET @fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'drone_soccer' 
    AND TABLE_NAME = 'best_teams_cache' 
    AND REFERENCED_TABLE_NAME = 'tournaments'
    AND REFERENCED_COLUMN_NAME = 'tournament_id'
);

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE best_teams_cache ADD CONSTRAINT fk_best_teams_cache_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE',
    'SELECT "Foreign key constraint already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Optional: Update existing records to have a default tournament_id
-- This sets all existing cache entries to the first active tournament
-- Uncomment the following lines if you want to assign existing data to a tournament

/*
UPDATE best_teams_cache 
SET tournament_id = (
    SELECT tournament_id 
    FROM tournaments 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
) 
WHERE tournament_id IS NULL;
*/

-- Display final table structure
DESCRIBE best_teams_cache;

-- Show migration completion message
SELECT 'Migration completed successfully! tournament_id column, index, and foreign key have been added to best_teams_cache table.' as migration_status;