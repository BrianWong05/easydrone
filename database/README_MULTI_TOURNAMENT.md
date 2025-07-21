# Multi-Tournament Athletes System

## Overview
This system allows athletes to participate in multiple tournaments and teams, with the constraint that each athlete can only join one team per tournament.

## Database Schema

### New Tables

#### `global_athletes`
Master table for athlete records across all tournaments.
- `athlete_id` (Primary Key)
- `name` - Athlete name
- `age` - Athlete age
- `avatar_url` - Global avatar URL
- `created_at`, `updated_at` - Timestamps

#### `tournament_athletes`
Tracks athlete participation in specific tournaments.
- `participation_id` (Primary Key)
- `athlete_id` (FK to global_athletes)
- `tournament_id` (FK to tournaments)
- `team_id` (FK to teams, nullable)
- `jersey_number` - Jersey number in this tournament
- `position` - Position in this tournament
- `is_active` - Active status in this tournament
- `joined_at`, `updated_at` - Timestamps

### Constraints

1. **Unique athlete per tournament**: `unique_athlete_tournament (athlete_id, tournament_id)`
2. **Unique jersey per team per tournament**: `unique_tournament_team_jersey (tournament_id, team_id, jersey_number)`

### Backward Compatibility

A view named `athletes` provides backward compatibility:
```sql
CREATE OR REPLACE VIEW athletes AS
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
```

## API Endpoints

### Global Athletes
- `GET /api/global-athletes` - List all global athletes
- `GET /api/global-athletes/:id` - Get athlete with all participations
- `POST /api/global-athletes` - Create new global athlete
- `PUT /api/global-athletes/:id` - Update global athlete
- `POST /api/global-athletes/:id/tournaments/:tournamentId` - Add to tournament
- `PUT /api/global-athletes/:id/tournaments/:tournamentId` - Update participation
- `DELETE /api/global-athletes/:id/tournaments/:tournamentId` - Remove from tournament

### Tournament Athletes (Backward Compatible)
- `GET /api/athletes?tournament_id=X` - List athletes in tournament
- `GET /api/athletes/:participationId` - Get athlete participation details
- `POST /api/athletes` - Create athlete or add to tournament
- `PUT /api/athletes/:participationId` - Update participation
- `DELETE /api/athletes/:participationId` - Remove from tournament

## Business Rules

1. **Multi-Tournament Participation**: Athletes can join multiple tournaments
2. **Multi-Team Membership**: Athletes can be in different teams across tournaments
3. **One Team Per Tournament**: In each tournament, an athlete can only join one team
4. **Team Composition Limits** (per tournament):
   - Maximum 1 attacker per team
   - Maximum 5 defenders per team
   - Unlimited substitutes per team
5. **Unique Jersey Numbers**: Within each team per tournament

## Migration

The system includes migration scripts to convert existing single-tournament data to the new multi-tournament structure:

1. `database/multi_tournament_athletes_migration.sql` - Full migration script
2. Existing data is preserved and migrated automatically
3. `match_events` table updated to reference `tournament_athletes`

## Usage Examples

### Create New Athlete and Add to Tournament
```javascript
POST /api/athletes
{
  "name": "John Doe",
  "age": 25,
  "tournament_id": 1,
  "team_id": 5,
  "jersey_number": 10,
  "position": "attacker"
}
```

### Add Existing Athlete to New Tournament
```javascript
POST /api/athletes
{
  "existing_athlete_id": 1,
  "tournament_id": 2,
  "team_id": 8,
  "jersey_number": 7,
  "position": "defender"
}
```

### Add Athlete to Tournament via Global API
```javascript
POST /api/global-athletes/1/tournaments/2
{
  "team_id": 8,
  "jersey_number": 7,
  "position": "defender"
}
```

## Frontend Components

- `GlobalAthleteList.js` - Manage athletes across all tournaments
- Enhanced `TournamentAthleteList.js` - Shows avatars and clickable navigation
- `TournamentAthleteCreate.js` - Supports avatar upload during creation

## Benefits

1. **Flexibility**: Athletes can participate in multiple tournaments
2. **Data Integrity**: Proper constraints prevent conflicts
3. **Scalability**: Clean separation of global vs tournament-specific data
4. **Backward Compatibility**: Existing code continues to work
5. **Enhanced UX**: Better athlete management and visualization