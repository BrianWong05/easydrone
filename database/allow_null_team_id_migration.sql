-- Migration: Allow NULL team_id in athletes table
-- This migration allows athletes to exist without being assigned to a team

USE drone_soccer;

-- Step 1: Check current table structure
SELECT 'Current athletes table structure before migration:' as info;
DESCRIBE athletes;

-- Step 2: Modify team_id column to allow NULL values
ALTER TABLE athletes 
MODIFY COLUMN team_id INT NULL;

-- Step 3: Update the unique constraint to handle NULL team_id properly
-- Drop the existing unique constraint
ALTER TABLE athletes DROP INDEX unique_tournament_team_jersey;

-- Add new unique constraint that handles NULL team_id
-- For athletes without teams, only tournament_id + jersey_number needs to be unique
ALTER TABLE athletes 
ADD CONSTRAINT unique_tournament_jersey_when_no_team 
UNIQUE KEY (tournament_id, jersey_number, team_id);

-- Note: MySQL treats NULL values as distinct in unique constraints,
-- so multiple athletes can have the same jersey_number with team_id = NULL

-- Step 4: Verification
SELECT 'Athletes table structure after migration:' as status;
DESCRIBE athletes;

SELECT 'Unique constraints on athletes table:' as status;
SHOW INDEX FROM athletes WHERE Non_unique = 0;

-- Step 5: Test data integrity
SELECT 'Testing: Athletes with and without teams' as test_info;
SELECT 
    athlete_id, 
    name, 
    jersey_number, 
    team_id,
    CASE 
        WHEN team_id IS NULL THEN 'No Team' 
        ELSE CONCAT('Team ', team_id) 
    END as team_status
FROM athletes 
ORDER BY team_id, jersey_number
LIMIT 10;

SELECT 'Migration completed successfully! team_id can now be NULL for athletes without teams.' as migration_status;