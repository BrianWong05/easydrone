# Database Migration for Best Teams Cache

## Run this SQL to create the cache table:

```sql
-- Connect to your MySQL database and run:
CREATE TABLE IF NOT EXISTS best_teams_cache (
  cache_id INT AUTO_INCREMENT PRIMARY KEY,
  stats_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);
```

## Or run the migration file:
```bash
# If you have MySQL CLI access:
mysql -u dronesoccer -pdronesoccer123 -h localhost drone_soccer < database/best_teams_cache_migration.sql
```

This table will store the calculated best teams statistics for public display.