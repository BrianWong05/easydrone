-- Migration: Allow athletes to participate in multiple tournaments
-- Each athlete can join multiple tournaments but only one team per tournament
USE drone_soccer;

-- Step 1: Create a new global athletes table (master athlete records)
CREATE TABLE IF NOT EXISTS global_athletes (
    athlete_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    avatar_url VARCHAR(500) NULL COMMENT 'Global athlete avatar URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_global_athletes_name (name)
) COMMENT = 'Global athletes table - master records for athletes across all tournaments';

-- Step 2: Create tournament_athletes table (athlete participation in specific tournaments)
CREATE TABLE IF NOT EXISTS tournament_athletes (
    participation_id INT AUTO_INCREMENT PRIMARY KEY,
    athlete_id INT NOT NULL COMMENT 'Reference to global athlete',
    tournament_id INT NOT NULL COMMENT 'Tournament the athlete is participating in',
    team_id INT NULL COMMENT 'Team the athlete belongs to in this tournament',
    jersey_number INT NOT NULL COMMENT 'Jersey number in this tournament',
    position ENUM('attacker', 'defender', 'substitute') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Active status in this tournament',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (athlete_id) REFERENCES global_athletes(athlete_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    
    -- Constraints
    UNIQUE KEY unique_athlete_tournament (athlete_id, tournament_id) COMMENT 'One participation per athlete per tournament',
    UNIQUE KEY unique_tournament_team_jersey (tournament_id, team_id, jersey_number) COMMENT 'Unique jersey number per team per tournament',
    
    -- Indexes
    INDEX idx_tournament_athletes_athlete_id (athlete_id),
    INDEX idx_tournament_athletes_tournament_id (tournament_id),
    INDEX idx_tournament_athletes_team_id (team_id)
) COMMENT = 'Tournament athlete participations - tracks athlete participation in specific tournaments';

-- Step 3: Migrate existing data from athletes table to new structure
INSERT INTO global_athletes (athlete_id, name, age, avatar_url, created_at, updated_at)
SELECT 
    a.athlete_id,
    a.name,
    a.age,
    a.avatar_url,
    a.created_at,
    a.updated_at
FROM athletes a
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    age = VALUES(age),
    avatar_url = COALESCE(VALUES(avatar_url), global_athletes.avatar_url),
    updated_at = VALUES(updated_at);

-- Step 4: Migrate tournament participations
INSERT INTO tournament_athletes (athlete_id, tournament_id, team_id, jersey_number, position, is_active, joined_at, updated_at)
SELECT 
    a.athlete_id,
    a.tournament_id,
    a.team_id,
    a.jersey_number,
    a.position,
    a.is_active,
    a.created_at,
    a.updated_at
FROM athletes a
ON DUPLICATE KEY UPDATE
    team_id = VALUES(team_id),
    jersey_number = VALUES(jersey_number),
    position = VALUES(position),
    is_active = VALUES(is_active),
    updated_at = VALUES(updated_at);

-- Step 5: Update match_events table to reference tournament_athletes
-- First, add a new column for tournament_athletes reference
ALTER TABLE match_events 
ADD COLUMN participation_id INT NULL COMMENT 'Reference to tournament_athletes participation' AFTER athlete_id;

-- Update the participation_id based on athlete_id, tournament_id from matches
UPDATE match_events me
JOIN matches m ON me.match_id = m.match_id
JOIN teams t1 ON m.team1_id = t1.team_id
JOIN tournament_athletes ta ON me.athlete_id = ta.athlete_id AND t1.tournament_id = ta.tournament_id
SET me.participation_id = ta.participation_id;

-- For events where we couldn't match team1, try team2
UPDATE match_events me
JOIN matches m ON me.match_id = m.match_id
JOIN teams t2 ON m.team2_id = t2.team_id
JOIN tournament_athletes ta ON me.athlete_id = ta.athlete_id AND t2.tournament_id = ta.tournament_id
SET me.participation_id = ta.participation_id
WHERE me.participation_id IS NULL;

-- Add foreign key constraint for participation_id
ALTER TABLE match_events 
ADD CONSTRAINT fk_match_events_participation 
FOREIGN KEY (participation_id) REFERENCES tournament_athletes(participation_id) ON DELETE CASCADE;

-- Step 6: Rename existing athletes table and create a view for backward compatibility
-- First, rename the old athletes table to athletes_old for backup
RENAME TABLE athletes TO athletes_old;

-- Create a view with the original athletes name for backward compatibility
CREATE VIEW athletes AS
SELECT 
    ta.participation_id as athlete_id,
    ga.name,
    ta.jersey_number,
    ta.position,
    ga.age,
    ta.is_active,
    ga.avatar_url,
    ta.tournament_id,
    ta.team_id,
    t.team_name,
    t.team_color,
    tg.group_name,
    tour.tournament_name,
    ta.joined_at as created_at,
    ta.updated_at
FROM tournament_athletes ta
JOIN global_athletes ga ON ta.athlete_id = ga.athlete_id
JOIN tournaments tour ON ta.tournament_id = tour.tournament_id
LEFT JOIN teams t ON ta.team_id = t.team_id
LEFT JOIN team_groups tg ON t.group_id = tg.group_id;

-- Step 7: Show migration results
SELECT 'Migration Summary:' as status;
SELECT COUNT(*) as global_athletes_count FROM global_athletes;
SELECT COUNT(*) as tournament_participations_count FROM tournament_athletes;
SELECT COUNT(*) as updated_match_events FROM match_events WHERE participation_id IS NOT NULL;

SELECT 'Sample data from new structure:' as info;
SELECT 
    ga.name as athlete_name,
    COUNT(ta.tournament_id) as tournaments_count,
    GROUP_CONCAT(DISTINCT tour.tournament_name SEPARATOR ', ') as tournaments
FROM global_athletes ga
LEFT JOIN tournament_athletes ta ON ga.athlete_id = ta.athlete_id
LEFT JOIN tournaments tour ON ta.tournament_id = tour.tournament_id
GROUP BY ga.athlete_id, ga.name
LIMIT 5;

SELECT 'Migration completed successfully!' as migration_status;