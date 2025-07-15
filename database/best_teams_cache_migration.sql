-- Ensure we're using the correct database
USE drone_soccer;

-- Create best_teams_cache table for storing calculated stats for public display
CREATE TABLE IF NOT EXISTS best_teams_cache (
  cache_id INT AUTO_INCREMENT PRIMARY KEY,
  stats_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);

-- Add some sample data or leave empty for first calculation
-- The table will be populated when admin calculates stats