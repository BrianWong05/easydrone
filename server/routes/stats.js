const express = require('express');
const { query } = require('../config/database');

const router = express.Router();

// 獲取小組積分榜統計
router.get('/groups', async (req, res) => {
  try {
    console.log('開始獲取小組積分榜...');
    
    const standings = await query(`
      SELECT gs.*, t.team_name, g.group_name
      FROM group_standings gs
      JOIN teams t ON gs.team_id = t.team_id
      JOIN team_groups g ON gs.group_id = g.group_id
      ORDER BY g.group_name, gs.points DESC, (gs.goals_for - gs.goals_against) DESC
    `);
    
    console.log('📈 獲取到的原始積分榜數據:', standings);
    console.log('📈 積分榜記錄數量:', standings.length);
    
    // 按小組分類顯示
    const groupedStandings = {};
    standings.forEach(team => {
      if (!groupedStandings[team.group_name]) {
        groupedStandings[team.group_name] = [];
      }
      groupedStandings[team.group_name].push(team);
      console.log(`📈 ${team.group_name}組 - ${team.team_name}: ${team.points}分 (${team.played}場)`);
    });
    
    console.log('📈 按小組分類的積分榜:', groupedStandings);

    res.json({
      success: true,
      data: {
        standings
      }
    });

  } catch (error) {
    console.error('獲取小組積分榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取小組積分榜失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取系統總覽統計
router.get('/overview', async (req, res) => {
  try {
    // 獲取基本統計數據
    const [
      groupCount,
      teamCount,
      athleteCount,
      matchCount,
      activeMatchCount,
      completedMatchCount
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM team_groups'),
      query('SELECT COUNT(*) as count FROM teams'),
      query('SELECT COUNT(*) as count FROM athletes WHERE is_active = 1'),
      query('SELECT COUNT(*) as count FROM matches'),
      query('SELECT COUNT(*) as count FROM matches WHERE match_status IN ("active", "overtime")'),
      query('SELECT COUNT(*) as count FROM matches WHERE match_status = "completed"')
    ]);

    // 獲取最近的比賽
    const recentMatches = await query(`
      SELECT m.*, 
             t1.team_name as team1_name, t1.team_color as team1_color,
             t2.team_name as team2_name, t2.team_color as team2_color,
             g.group_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.team_id
      JOIN teams t2 ON m.team2_id = t2.team_id
      LEFT JOIN team_groups g ON m.group_id = g.group_id
      ORDER BY m.created_at DESC
      LIMIT 5
    `);

    // 獲取比賽類型統計
    const matchTypeStats = await query(`
      SELECT 
        match_type,
        COUNT(*) as count,
        COUNT(CASE WHEN match_status = 'completed' THEN 1 END) as completed
      FROM matches 
      GROUP BY match_type
    `);

    res.json({
      success: true,
      data: {
        overview: {
          groups: groupCount[0].count,
          teams: teamCount[0].count,
          athletes: athleteCount[0].count,
          total_matches: matchCount[0].count,
          active_matches: activeMatchCount[0].count,
          completed_matches: completedMatchCount[0].count
        },
        recent_matches: recentMatches,
        match_type_stats: matchTypeStats
      }
    });

  } catch (error) {
    console.error('獲取系統統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取系統統計失敗'
    });
  }
});

// 手動初始化/更新小組積分榜
router.post('/group-standings/initialize', async (req, res) => {
  try {
    console.log('🔄 Initializing group standings...');
    
    // Get all teams with groups
    const teams = await query(`
      SELECT t.team_id, t.team_name, t.group_id, g.group_name 
      FROM teams t 
      JOIN team_groups g ON t.group_id = g.group_id 
      WHERE t.group_id IS NOT NULL
    `);
    
    console.log('👥 Found teams with groups:', teams.length);
    
    // Insert standings for teams that don't have them
    for (const team of teams) {
      const existing = await query(
        'SELECT * FROM group_standings WHERE group_id = ? AND team_id = ?',
        [team.group_id, team.team_id]
      );
      
      if (existing.length === 0) {
        await query(`
          INSERT INTO group_standings (group_id, team_id, tournament_id, played, won, drawn, lost, goals_for, goals_against, points)
          VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0)
        `, [team.group_id, team.team_id, team.tournament_id]);
        console.log(`✅ Created standing for ${team.team_name}`);
      }
    }
    
    res.json({
      success: true,
      message: `已初始化 ${teams.length} 支隊伍的積分榜`,
      data: { teams_processed: teams.length }
    });
    
  } catch (error) {
    console.error('初始化積分榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '初始化積分榜失敗'
    });
  }
});

// 計算所有小組的排名
router.post('/calculate-all-group-standings', async (req, res) => {
  try {
    console.log('🔄 Calculating standings for all groups...');
    
    // Get all groups
    const groups = await query('SELECT * FROM team_groups ORDER BY group_name');
    console.log('📊 Found groups:', groups.length);
    
    let totalTeamsProcessed = 0;
    let totalMatchesProcessed = 0;
    
    for (const group of groups) {
      console.log(`\n🏆 Processing Group ${group.group_name}...`);
      
      // Get teams in this group
      const teams = await query(`
        SELECT team_id, team_name, team_color 
        FROM teams 
        WHERE group_id = ?
      `, [group.group_id]);
      
      console.log(`👥 Teams in Group ${group.group_name}:`, teams.length);
      
      // Initialize/reset standings for this group
      for (const team of teams) {
        // Check if standing exists
        const existing = await query(
          'SELECT * FROM group_standings WHERE group_id = ? AND team_id = ?',
          [group.group_id, team.team_id]
        );
        
        if (existing.length === 0) {
          // Insert new standing
          await query(`
            INSERT INTO group_standings (group_id, team_id, tournament_id, played, won, drawn, lost, goals_for, goals_against, points)
            VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0)
          `, [group.group_id, team.team_id, group.tournament_id]);
        } else {
          // Reset existing standing
          await query(`
            UPDATE group_standings 
            SET played = 0, won = 0, drawn = 0, lost = 0, goals_for = 0, goals_against = 0, points = 0
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, team.team_id]);
        }
      }
      
      // Get completed matches for this group
      const matches = await query(`
        SELECT m.*, t1.team_name as team1_name, t2.team_name as team2_name
        FROM matches m
        JOIN teams t1 ON m.team1_id = t1.team_id
        JOIN teams t2 ON m.team2_id = t2.team_id
        WHERE m.group_id = ? AND m.match_status = 'completed'
      `, [group.group_id]);
      
      console.log(`🏅 Completed matches in Group ${group.group_name}:`, matches.length);
      totalMatchesProcessed += matches.length;
      
      // Process each match
      for (const match of matches) {
        const team1Score = match.team1_score || 0;
        const team2Score = match.team2_score || 0;
        
        // Update team1 stats
        await query(`
          UPDATE group_standings 
          SET played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ?
          WHERE group_id = ? AND team_id = ?
        `, [team1Score, team2Score, group.group_id, match.team1_id]);
        
        // Update team2 stats
        await query(`
          UPDATE group_standings 
          SET played = played + 1, goals_for = goals_for + ?, goals_against = goals_against + ?
          WHERE group_id = ? AND team_id = ?
        `, [team2Score, team1Score, group.group_id, match.team2_id]);
        
        // Update win/draw/loss and points
        if (team1Score > team2Score) {
          // Team1 wins
          await query(`
            UPDATE group_standings 
            SET won = won + 1, points = points + 3
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, match.team1_id]);
          
          await query(`
            UPDATE group_standings 
            SET lost = lost + 1
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, match.team2_id]);
          
        } else if (team2Score > team1Score) {
          // Team2 wins
          await query(`
            UPDATE group_standings 
            SET won = won + 1, points = points + 3
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, match.team2_id]);
          
          await query(`
            UPDATE group_standings 
            SET lost = lost + 1
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, match.team1_id]);
          
        } else {
          // Draw
          await query(`
            UPDATE group_standings 
            SET drawn = drawn + 1, points = points + 1
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, match.team1_id]);
          
          await query(`
            UPDATE group_standings 
            SET drawn = drawn + 1, points = points + 1
            WHERE group_id = ? AND team_id = ?
          `, [group.group_id, match.team2_id]);
        }
        
        console.log(`📊 Processed: ${match.team1_name} ${team1Score}-${team2Score} ${match.team2_name}`);
      }
      
      totalTeamsProcessed += teams.length;
    }
    
    // Get final standings for all groups
    const allStandings = await query(`
      SELECT gs.*, t.team_name, t.team_color, g.group_name,
             (gs.goals_for - gs.goals_against) as goal_difference
      FROM group_standings gs
      JOIN teams t ON gs.team_id = t.team_id
      JOIN team_groups g ON gs.group_id = g.group_id
      ORDER BY g.group_name, gs.points DESC, goal_difference DESC, gs.goals_for DESC
    `);
    
    // Group by group_name for response
    const groupedStandings = {};
    allStandings.forEach(standing => {
      if (!groupedStandings[standing.group_name]) {
        groupedStandings[standing.group_name] = {
          group_id: standing.group_id,
          group_name: standing.group_name,
          teams: []
        };
      }
      groupedStandings[standing.group_name].teams.push(standing);
    });
    
    console.log(`\n✅ Calculation complete!`);
    console.log(`📊 Groups processed: ${groups.length}`);
    console.log(`👥 Teams processed: ${totalTeamsProcessed}`);
    console.log(`🏅 Matches processed: ${totalMatchesProcessed}`);
    
    res.json({
      success: true,
      message: `已計算 ${groups.length} 個小組的積分榜`,
      data: {
        groups_processed: groups.length,
        teams_processed: totalTeamsProcessed,
        matches_processed: totalMatchesProcessed,
        standings: Object.values(groupedStandings)
      }
    });
    
  } catch (error) {
    console.error('計算所有小組積分榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '計算所有小組積分榜失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取所有隊伍的總排名榜
router.get('/overall-leaderboard', async (req, res) => {
  try {
    console.log('🏆 Getting overall leaderboard for all teams...');
    
    // Get all teams with their match statistics
    const allTeamsStats = await query(`
      SELECT 
        t.team_id,
        t.team_name,
        t.team_color,
        g.group_name,
        g.group_id,
        COUNT(DISTINCT m.match_id) as played,
        SUM(CASE 
          WHEN (m.team1_id = t.team_id AND m.team1_score > m.team2_score) OR 
               (m.team2_id = t.team_id AND m.team2_score > m.team1_score) 
          THEN 1 ELSE 0 END) as won,
        SUM(CASE 
          WHEN m.team1_score = m.team2_score AND m.match_status = 'completed'
          THEN 1 ELSE 0 END) as drawn,
        SUM(CASE 
          WHEN (m.team1_id = t.team_id AND m.team1_score < m.team2_score) OR 
               (m.team2_id = t.team_id AND m.team2_score < m.team1_score) 
          THEN 1 ELSE 0 END) as lost,
        SUM(CASE 
          WHEN m.team1_id = t.team_id THEN COALESCE(m.team1_score, 0)
          WHEN m.team2_id = t.team_id THEN COALESCE(m.team2_score, 0)
          ELSE 0 END) as goals_for,
        SUM(CASE 
          WHEN m.team1_id = t.team_id THEN COALESCE(m.team2_score, 0)
          WHEN m.team2_id = t.team_id THEN COALESCE(m.team1_score, 0)
          ELSE 0 END) as goals_against,
        SUM(CASE 
          WHEN (m.team1_id = t.team_id AND m.team1_score > m.team2_score) OR 
               (m.team2_id = t.team_id AND m.team2_score > m.team1_score) 
          THEN 3
          WHEN m.team1_score = m.team2_score AND m.match_status = 'completed'
          THEN 1
          ELSE 0 END) as points
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      LEFT JOIN matches m ON (t.team_id = m.team1_id OR t.team_id = m.team2_id) 
                         AND m.match_status = 'completed'
      GROUP BY t.team_id, t.team_name, t.team_color, g.group_name, g.group_id
    `);
    
    // First, group teams by their groups and sort within each group
    const teamsByGroup = {};
    allTeamsStats.forEach(team => {
      const groupKey = team.group_id || 'no_group';
      if (!teamsByGroup[groupKey]) {
        teamsByGroup[groupKey] = [];
      }
      teamsByGroup[groupKey].push({
        ...team,
        goal_difference: team.goals_for - team.goals_against,
        win_rate: team.played > 0 ? ((team.won / team.played) * 100).toFixed(1) : 0,
        points_per_game: team.played > 0 ? (team.points / team.played).toFixed(2) : 0
      });
    });
    
    // Sort teams within each group by football rules
    Object.keys(teamsByGroup).forEach(groupKey => {
      teamsByGroup[groupKey].sort((a, b) => {
        // Sort by points (descending)
        if (b.points !== a.points) return b.points - a.points;
        // Then by goal difference (descending)
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        // Then by goals for (descending)
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        // Finally by team name (ascending)
        return a.team_name.localeCompare(b.team_name);
      });
      
      // Add group position to each team
      teamsByGroup[groupKey].forEach((team, index) => {
        team.group_position = index + 1;
      });
    });
    
    // Now create the overall leaderboard by position across groups
    // First all 1st places, then all 2nd places, etc.
    const leaderboard = [];
    const maxGroupSize = Math.max(...Object.values(teamsByGroup).map(group => group.length));
    
    for (let position = 1; position <= maxGroupSize; position++) {
      // Get all teams at this position from each group
      const teamsAtPosition = [];
      Object.keys(teamsByGroup).forEach(groupKey => {
        const teamAtPosition = teamsByGroup[groupKey].find(team => team.group_position === position);
        if (teamAtPosition) {
          teamsAtPosition.push(teamAtPosition);
        }
      });
      
      // Sort teams at the same position by their performance
      teamsAtPosition.sort((a, b) => {
        // Sort by points (descending)
        if (b.points !== a.points) return b.points - a.points;
        // Then by goal difference (descending)
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        // Then by goals for (descending)
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        // Finally by group name then team name
        const groupCompare = (a.group_name || '').localeCompare(b.group_name || '');
        if (groupCompare !== 0) return groupCompare;
        return a.team_name.localeCompare(b.team_name);
      });
      
      leaderboard.push(...teamsAtPosition);
    }
    
    // Add overall rank
    leaderboard.forEach((team, index) => {
      team.rank = index + 1;
    });
    
    console.log('🏆 Leaderboard sorted by group positions:');
    leaderboard.forEach(team => {
      console.log(`${team.rank}. ${team.team_name} (Group ${team.group_name} - Position ${team.group_position}) - ${team.points} points`);
    });
    
    // Get summary statistics
    const totalTeams = leaderboard.length;
    const totalMatches = leaderboard.reduce((sum, team) => sum + team.played, 0) / 2; // Divide by 2 since each match involves 2 teams
    const totalGoals = leaderboard.reduce((sum, team) => sum + team.goals_for, 0);
    const teamsWithMatches = leaderboard.filter(team => team.played > 0).length;
    
    // Get top performers
    const topScorer = leaderboard.reduce((max, team) => 
      team.goals_for > max.goals_for ? team : max, leaderboard[0] || {});
    
    const bestDefense = leaderboard.reduce((min, team) => 
      team.played > 0 && team.goals_against < min.goals_against ? team : min, 
      leaderboard.find(t => t.played > 0) || {});
    
    const bestGoalDiff = leaderboard.reduce((max, team) => 
      team.goal_difference > max.goal_difference ? team : max, leaderboard[0] || {});
    
    console.log(`🏆 Overall leaderboard calculated for ${totalTeams} teams`);
    console.log(`📊 Total matches processed: ${totalMatches}`);
    console.log(`⚽ Total goals scored: ${totalGoals}`);
    
    res.json({
      success: true,
      data: {
        leaderboard,
        summary: {
          total_teams: totalTeams,
          total_matches: totalMatches,
          total_goals: totalGoals,
          teams_with_matches: teamsWithMatches,
          average_goals_per_match: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0
        },
        top_performers: {
          top_scorer: topScorer,
          best_defense: bestDefense,
          best_goal_difference: bestGoalDiff
        }
      }
    });
    
  } catch (error) {
    console.error('獲取總排名榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取總排名榜失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取小組積分榜
router.get('/group-standings', async (req, res) => {
  try {
    const { group_id } = req.query;

    let sql = `
      SELECT 
        gs.*,
        t.team_name,
        t.team_color,
        g.group_name,
        (gs.goals_for - gs.goals_against) as goal_difference
      FROM group_standings gs
      JOIN teams t ON gs.team_id = t.team_id
      JOIN team_groups g ON gs.group_id = g.group_id
    `;
    const params = [];

    if (group_id) {
      sql += ' WHERE gs.group_id = ?';
      params.push(group_id);
    }

    sql += ' ORDER BY g.group_name, gs.points DESC, goal_difference DESC, gs.goals_for DESC';

    const standings = await query(sql, params);

    // 按小組分組
    const groupedStandings = {};
    standings.forEach(standing => {
      const groupName = standing.group_name;
      if (!groupedStandings[groupName]) {
        groupedStandings[groupName] = {
          group_id: standing.group_id,
          group_name: groupName,
          teams: []
        };
      }
      groupedStandings[groupName].teams.push(standing);
    });

    res.json({
      success: true,
      data: {
        standings: Object.values(groupedStandings)
      }
    });

  } catch (error) {
    console.error('獲取小組積分榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取小組積分榜失敗'
    });
  }
});

// 獲取隊伍統計
router.get('/teams', async (req, res) => {
  try {
    const { team_id } = req.query;

    let sql = `
      SELECT 
        t.team_id,
        t.team_name,
        t.team_color,
        g.group_name,
        COUNT(DISTINCT a.athlete_id) as athlete_count,
        COUNT(DISTINCT CASE WHEN a.position = 'attacker' THEN a.athlete_id END) as attackers,
        COUNT(DISTINCT CASE WHEN a.position = 'defender' THEN a.athlete_id END) as defenders,
        COUNT(DISTINCT CASE WHEN a.position = 'substitute' THEN a.athlete_id END) as substitutes,
        COUNT(DISTINCT m.match_id) as total_matches,
        COUNT(DISTINCT CASE WHEN m.match_status = 'completed' THEN m.match_id END) as played_matches,
        COUNT(DISTINCT CASE WHEN m.winner_id = t.team_id THEN m.match_id END) as wins,
        SUM(CASE WHEN m.team1_id = t.team_id THEN m.team1_score ELSE m.team2_score END) as goals_for,
        SUM(CASE WHEN m.team1_id = t.team_id THEN m.team2_score ELSE m.team1_score END) as goals_against
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      LEFT JOIN athletes a ON t.team_id = a.team_id AND a.is_active = 1
      LEFT JOIN matches m ON (t.team_id = m.team1_id OR t.team_id = m.team2_id) AND m.match_status = 'completed'
    `;
    const params = [];

    if (team_id) {
      sql += ' WHERE t.team_id = ?';
      params.push(team_id);
    }

    sql += ' GROUP BY t.team_id ORDER BY t.team_name';

    const teamStats = await query(sql, params);

    res.json({
      success: true,
      data: {
        teams: teamStats
      }
    });

  } catch (error) {
    console.error('獲取隊伍統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取隊伍統計失敗'
    });
  }
});

// 獲取運動員統計
router.get('/athletes', async (req, res) => {
  try {
    const { team_id, position } = req.query;

    let sql = `
      SELECT 
        a.athlete_id,
        a.name,
        a.jersey_number,
        a.position,
        t.team_name,
        t.team_color,
        g.group_name,
        COUNT(CASE WHEN me.event_type = 'goal' THEN 1 END) as goals,
        COUNT(CASE WHEN me.event_type = 'foul' THEN 1 END) as fouls,
        COUNT(CASE WHEN me.event_type = 'penalty' THEN 1 END) as penalties,
        COUNT(DISTINCT me.match_id) as matches_participated
      FROM athletes a
      JOIN teams t ON a.team_id = t.team_id
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      LEFT JOIN match_events me ON a.athlete_id = me.athlete_id
      WHERE a.is_active = 1
    `;
    const params = [];

    if (team_id) {
      sql += ' AND a.team_id = ?';
      params.push(team_id);
    }

    if (position) {
      sql += ' AND a.position = ?';
      params.push(position);
    }

    sql += ' GROUP BY a.athlete_id ORDER BY goals DESC, a.name';

    const athleteStats = await query(sql, params);

    res.json({
      success: true,
      data: {
        athletes: athleteStats
      }
    });

  } catch (error) {
    console.error('獲取運動員統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取運動員統計失敗'
    });
  }
});

// 獲取比賽統計
router.get('/matches', async (req, res) => {
  try {
    const { date_from, date_to, match_type, group_id } = req.query;

    let sql = `
      SELECT 
        DATE(m.match_date) as match_day,
        COUNT(*) as total_matches,
        COUNT(CASE WHEN m.match_status = 'completed' THEN 1 END) as completed_matches,
        COUNT(CASE WHEN m.match_status = 'active' THEN 1 END) as active_matches,
        COUNT(CASE WHEN m.match_status = 'pending' THEN 1 END) as pending_matches,
        AVG(m.team1_score + m.team2_score) as avg_total_goals,
        SUM(m.team1_score + m.team2_score) as total_goals
      FROM matches m
      WHERE 1=1
    `;
    const params = [];

    if (date_from) {
      sql += ' AND m.match_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND m.match_date <= ?';
      params.push(date_to);
    }

    if (match_type) {
      sql += ' AND m.match_type = ?';
      params.push(match_type);
    }

    if (group_id) {
      sql += ' AND m.group_id = ?';
      params.push(group_id);
    }

    sql += ' GROUP BY DATE(m.match_date) ORDER BY match_day DESC';

    const matchStats = await query(sql, params);

    // 獲取總體統計
    let totalSql = `
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN match_status = 'completed' THEN 1 END) as completed_matches,
        AVG(team1_score + team2_score) as avg_goals_per_match,
        MAX(team1_score + team2_score) as highest_scoring_match,
        COUNT(CASE WHEN team1_score = team2_score AND match_status = 'completed' THEN 1 END) as draws
      FROM matches m
      WHERE 1=1
    `;
    const totalParams = [];

    if (date_from) {
      totalSql += ' AND m.match_date >= ?';
      totalParams.push(date_from);
    }

    if (date_to) {
      totalSql += ' AND m.match_date <= ?';
      totalParams.push(date_to);
    }

    if (match_type) {
      totalSql += ' AND m.match_type = ?';
      totalParams.push(match_type);
    }

    if (group_id) {
      totalSql += ' AND m.group_id = ?';
      totalParams.push(group_id);
    }

    const [totalStats] = await query(totalSql, totalParams);

    res.json({
      success: true,
      data: {
        daily_stats: matchStats,
        total_stats: totalStats
      }
    });

  } catch (error) {
    console.error('獲取比賽統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取比賽統計失敗'
    });
  }
});

// 獲取淘汰賽統計
router.get('/knockout', async (req, res) => {
  try {
    const knockoutMatches = await query(`
      SELECT 
        m.tournament_stage,
        COUNT(*) as total_matches,
        COUNT(CASE WHEN m.match_status = 'completed' THEN 1 END) as completed_matches,
        AVG(m.team1_score + m.team2_score) as avg_goals
      FROM matches m
      WHERE m.match_type = 'knockout'
      GROUP BY m.tournament_stage
      ORDER BY 
        CASE m.tournament_stage
          WHEN 'round_of_16' THEN 1
          WHEN 'quarter_final' THEN 2
          WHEN 'semi_final' THEN 3
          WHEN 'third_place' THEN 4
          WHEN 'final' THEN 5
          ELSE 6
        END
    `);

    // 獲取淘汰賽結構
    const brackets = await query(`
      SELECT 
        kb.round_number,
        COUNT(*) as matches_in_round,
        COUNT(CASE WHEN m.match_status = 'completed' THEN 1 END) as completed_in_round
      FROM knockout_brackets kb
      JOIN matches m ON kb.match_id = m.match_id
      GROUP BY kb.round_number
      ORDER BY kb.round_number
    `);

    res.json({
      success: true,
      data: {
        stage_stats: knockoutMatches,
        round_stats: brackets
      }
    });

  } catch (error) {
    console.error('獲取淘汰賽統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取淘汰賽統計失敗'
    });
  }
});

// 獲取進球排行榜
router.get('/top-scorers', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topScorers = await query(`
      SELECT 
        a.athlete_id,
        a.name,
        a.jersey_number,
        a.position,
        t.team_name,
        t.team_color,
        COUNT(me.event_id) as goals
      FROM athletes a
      JOIN teams t ON a.team_id = t.team_id
      JOIN match_events me ON a.athlete_id = me.athlete_id
      WHERE me.event_type = 'goal'
      GROUP BY a.athlete_id
      ORDER BY goals DESC, a.name
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: {
        top_scorers: topScorers
      }
    });

  } catch (error) {
    console.error('獲取進球排行榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取進球排行榜失敗'
    });
  }
});

// 獲取犯規統計
router.get('/fouls', async (req, res) => {
  try {
    // 隊伍犯規統計
    const teamFouls = await query(`
      SELECT 
        t.team_id,
        t.team_name,
        t.team_color,
        SUM(m.team1_fouls + m.team2_fouls) as total_fouls,
        COUNT(CASE WHEN m.match_status = 'completed' THEN 1 END) as matches_played,
        ROUND(SUM(m.team1_fouls + m.team2_fouls) / COUNT(CASE WHEN m.match_status = 'completed' THEN 1 END), 2) as avg_fouls_per_match
      FROM teams t
      LEFT JOIN matches m ON t.team_id = m.team1_id OR t.team_id = m.team2_id
      WHERE m.match_status = 'completed'
      GROUP BY t.team_id
      HAVING matches_played > 0
      ORDER BY avg_fouls_per_match DESC
    `);

    // 運動員犯規統計
    const athleteFouls = await query(`
      SELECT 
        a.athlete_id,
        a.name,
        a.jersey_number,
        t.team_name,
        COUNT(me.event_id) as fouls
      FROM athletes a
      JOIN teams t ON a.team_id = t.team_id
      JOIN match_events me ON a.athlete_id = me.athlete_id
      WHERE me.event_type = 'foul'
      GROUP BY a.athlete_id
      ORDER BY fouls DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        team_fouls: teamFouls,
        athlete_fouls: athleteFouls
      }
    });

  } catch (error) {
    console.error('獲取犯規統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取犯規統計失敗'
    });
  }
});

module.exports = router;