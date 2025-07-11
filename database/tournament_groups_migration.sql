-- Add tournament support to team_groups table
USE drone_soccer;

-- Add new columns to team_groups table
ALTER TABLE team_groups 
ADD COLUMN tournament_id INT NULL AFTER group_name,
ADD COLUMN display_name VARCHAR(10) NULL AFTER tournament_id,
ADD COLUMN description TEXT NULL AFTER display_name;

-- Add foreign key constraint for tournament_id
ALTER TABLE team_groups 
ADD CONSTRAINT fk_team_groups_tournament 
FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE;

-- Drop the old unique constraint on group_name
ALTER TABLE team_groups DROP INDEX group_name;

-- Add new composite unique constraint (tournament_id + group_name)
-- This allows same group names in different tournaments
ALTER TABLE team_groups 
ADD CONSTRAINT unique_tournament_group_name 
UNIQUE (tournament_id, group_name);

-- Update existing groups to have NULL tournament_id (global groups)
-- These will be treated as legacy groups not associated with any tournament

-- Show the updated table structure
DESCRIBE team_groups;