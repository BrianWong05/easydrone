-- Migration to add tournament_id to groups and teams tables
-- This will make groups and teams belong to specific tournaments

-- Add tournament_id to team_groups table
ALTER TABLE team_groups 
ADD COLUMN tournament_id INT NULL,
ADD FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE;

-- Add tournament_id to teams table  
ALTER TABLE teams
ADD COLUMN tournament_id INT NULL,
ADD FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE;

-- Update existing data to maintain consistency (optional - for existing data)
-- You can run this if you have existing data that needs to be preserved
-- UPDATE team_groups SET tournament_id = 1 WHERE tournament_id IS NULL;
-- UPDATE teams SET tournament_id = 1 WHERE tournament_id IS NULL;

-- Add indexes for better performance
CREATE INDEX idx_team_groups_tournament_id ON team_groups(tournament_id);
CREATE INDEX idx_teams_tournament_id ON teams(tournament_id);

-- Update group_standings to include tournament context
ALTER TABLE group_standings
ADD COLUMN tournament_id INT NULL,
ADD FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE;

CREATE INDEX idx_group_standings_tournament_id ON group_standings(tournament_id);

-- Add tournament_id to matches table
ALTER TABLE matches
ADD COLUMN tournament_id INT NULL,
ADD FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE;

CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);