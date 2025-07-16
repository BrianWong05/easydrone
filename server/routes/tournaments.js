const express = require('express');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 創建錦標賽驗證模式
const tournamentSchema = Joi.object({
  tournament_name: Joi.string().min(2).max(100).required().messages({
    'string.empty': '錦標賽名稱不能為空',
    'string.min': '錦標賽名稱至少需要2個字符',
    'string.max': '錦標賽名稱不能超過100個字符',
    'any.required': '錦標賽名稱是必填項'
  }),
  tournament_type: Joi.string().valid('group', 'knockout', 'mixed').required().messages({
    'any.only': '錦標賽類型必須是小組賽、淘汰賽或混合賽制',
    'any.required': '錦標賽類型是必填項'
  }),
  start_date: Joi.date().required().messages({
    'any.required': '開始日期是必填項'
  }),
  end_date: Joi.date().min(Joi.ref('start_date')).required().messages({
    'date.min': '結束日期不能早於開始日期',
    'any.required': '結束日期是必填項'
  })
});

// 獲取公開顯示的錦標賽 (用於客戶端)
router.get('/public', async (req, res) => {
  try {
    console.log('🌐 獲取公開錦標賽...');
    
    // 優先返回活躍的錦標賽，如果沒有活躍的則返回有統計數據的錦標賽
    const publicTournamentQuery = `
      SELECT 
        t.tournament_id,
        t.tournament_name,
        t.tournament_type,
        t.status,
        t.start_date,
        t.end_date,
        t.created_at,
        t.updated_at,
        CASE WHEN t.status = 'active' THEN 1 ELSE 0 END as is_active,
        MAX(btc.created_at) as latest_stats
      FROM tournaments t
      LEFT JOIN best_teams_cache btc ON t.tournament_id = btc.tournament_id
      WHERE t.status IN ('active', 'pending', 'completed')
      GROUP BY t.tournament_id
      ORDER BY is_active DESC, latest_stats DESC, t.created_at DESC
      LIMIT 1
    `;
    
    const result = await query(publicTournamentQuery);
    
    if (result.length === 0) {
      // 如果沒有活躍的錦標賽，返回最新的錦標賽
      const fallbackQuery = `
        SELECT 
          tournament_id,
          tournament_name,
          tournament_type,
          status,
          start_date,
          end_date,
          created_at,
          updated_at
        FROM tournaments 
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const fallbackResult = await query(fallbackQuery);
      
      if (fallbackResult.length === 0) {
        return res.json({
          success: false,
          message: '目前沒有可顯示的錦標賽'
        });
      }
      
      return res.json({
        success: true,
        data: fallbackResult[0]
      });
    }
    
    res.json({
      success: true,
      data: result[0]
    });
    
  } catch (error) {
    console.error('❌ 獲取公開錦標賽失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取公開錦標賽失敗',
      error: error.message
    });
  }
});

// 獲取所有錦標賽
router.get('/', async (req, res) => {
  try {
    console.log('🏆 開始獲取錦標賽列表...');
    const { status, type, page = 1, limit = 10 } = req.query;
    
    // 首先檢查tournaments表是否存在
    try {
      await query('SELECT 1 FROM tournaments LIMIT 1');
      console.log('✅ tournaments表存在');
    } catch (tableError) {
      console.error('❌ tournaments表不存在或無法訪問:', tableError.message);
      return res.json({
        success: true,
        data: {
          tournaments: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }

    // 簡化查詢，先不使用JOIN
    let sql = `
      SELECT t.tournament_id, t.tournament_name, t.tournament_type, t.status, 
             t.start_date, t.end_date, t.created_at, t.updated_at
      FROM tournaments t
      WHERE 1=1
    `;
    const params = [];

    // 按狀態篩選
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    // 按類型篩選
    if (type) {
      sql += ' AND t.tournament_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY t.created_at DESC';

    // 分頁
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    console.log('🔍 執行SQL:', sql);
    console.log('🔍 參數:', params);

    const tournaments = await query(sql, params);
    console.log('✅ 獲取到錦標賽數量:', tournaments.length);

    // 為每個錦標賽單獨獲取比賽統計
    for (let tournament of tournaments) {
      try {
        const matchStats = await query(`
          SELECT 
            COUNT(*) as total_matches,
            COUNT(CASE WHEN match_status = 'completed' THEN 1 END) as completed_matches
          FROM matches 
          WHERE tournament_id = ?
        `, [tournament.tournament_id]);
        
        tournament.total_matches = matchStats[0]?.total_matches || 0;
        tournament.completed_matches = matchStats[0]?.completed_matches || 0;
      } catch (matchError) {
        console.warn('⚠️ 獲取比賽統計失敗:', matchError.message);
        tournament.total_matches = 0;
        tournament.completed_matches = 0;
      }
    }

    // 獲取總數
    let countSql = 'SELECT COUNT(*) as total FROM tournaments t WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countSql += ' AND t.status = ?';
      countParams.push(status);
    }
    if (type) {
      countSql += ' AND t.tournament_type = ?';
      countParams.push(type);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    console.log('✅ 錦標賽列表獲取成功，總數:', total);

    res.json({
      success: true,
      data: {
        tournaments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ 獲取錦標賽列表錯誤:', error);
    console.error('錯誤詳情:', error.message);
    console.error('錯誤堆疊:', error.stack);
    
    res.status(500).json({
      success: false,
      message: '獲取錦標賽列表失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請聯繫系統管理員'
    });
  }
});

// 獲取錦標賽的小組列表
router.get('/:id/groups', async (req, res) => {
  try {
    const { id } = req.params;
    
    const groups = await query(`
      SELECT 
        g.group_id,
        g.group_name,
        g.max_teams,
        g.tournament_id,
        g.created_at,
        COUNT(t.team_id) as team_count
      FROM team_groups g
      LEFT JOIN teams t ON g.group_id = t.group_id
      WHERE g.tournament_id = ?
      GROUP BY g.group_id, g.group_name, g.max_teams, g.tournament_id, g.created_at
      ORDER BY g.group_name
    `, [id]);

    res.json({
      success: true,
      data: { groups }
    });

  } catch (error) {
    console.error('獲取錦標賽小組列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽小組列表失敗'
    });
  }
});

// 獲取單個錦標賽詳情
router.get('/:id', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 獲取錦標賽基本信息
    const tournaments = await query(`
      SELECT * FROM tournaments WHERE tournament_id = ?
    `, [tournamentId]);

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 獲取錦標賽比賽
    const matches = await query(`
      SELECT m.*, 
             t1.team_name as team1_name, t1.team_color as team1_color,
             t2.team_name as team2_name, t2.team_color as team2_color,
             g.group_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.team_id
      JOIN teams t2 ON m.team2_id = t2.team_id
      LEFT JOIN team_groups g ON m.group_id = g.group_id
      WHERE m.tournament_id = ?
      ORDER BY m.match_date, m.match_number
    `, [tournamentId]);

    // 獲取錦標賽小組
    const groups = await query(`
      SELECT g.*, 
             COUNT(DISTINCT t.team_id) as team_count,
             COUNT(DISTINCT m.match_id) as total_matches,
             COUNT(DISTINCT CASE WHEN m.match_status = 'completed' THEN m.match_id END) as completed_matches
      FROM team_groups g
      LEFT JOIN teams t ON g.group_id = t.group_id AND t.tournament_id = ?
      LEFT JOIN matches m ON g.group_id = m.group_id AND m.tournament_id = ?
      WHERE g.tournament_id = ?
      GROUP BY g.group_id
      ORDER BY g.group_name
    `, [tournamentId, tournamentId, tournamentId]);

    // 獲取錦標賽隊伍
    const teams = await query(`
      SELECT t.*, g.group_name,
             COUNT(a.athlete_id) as athlete_count
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      LEFT JOIN athletes a ON t.team_id = a.team_id AND a.is_active = 1
      WHERE t.tournament_id = ?
      GROUP BY t.team_id
      ORDER BY t.team_name
    `, [tournamentId]);

    // 獲取淘汰賽結構（如果適用）
    const brackets = await query(`
      SELECT kb.*, m.match_number, m.match_status,
             t1.team_name as team1_name, t2.team_name as team2_name
      FROM knockout_brackets kb
      JOIN matches m ON kb.match_id = m.match_id
      LEFT JOIN teams t1 ON m.team1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team2_id = t2.team_id
      WHERE kb.tournament_id = ?
      ORDER BY kb.round_number, kb.position_in_round
    `, [tournamentId]);

    // 獲取積分榜（如果有小組）
    const standings = groups.length > 0 ? await query(`
      SELECT gs.*, t.team_name, t.team_color, g.group_name,
             (gs.goals_for - gs.goals_against) as goal_difference
      FROM group_standings gs
      JOIN teams t ON gs.team_id = t.team_id
      JOIN team_groups g ON gs.group_id = g.group_id
      WHERE gs.tournament_id = ?
      ORDER BY g.group_name, gs.points DESC, goal_difference DESC, gs.goals_for DESC
    `, [tournamentId]) : [];

    res.json({
      success: true,
      data: {
        tournament: tournaments[0],
        matches,
        groups,
        teams,
        brackets,
        standings
      }
    });

  } catch (error) {
    console.error('獲取錦標賽詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽詳情失敗'
    });
  }
});

// 創建新錦標賽 (temporarily remove auth for development)
router.post('/', async (req, res) => {
  try {
    console.log('🔍 POST /tournaments - Received request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Request headers:', JSON.stringify(req.headers, null, 2));
    
    // 驗證輸入數據
    const { error, value } = tournamentSchema.validate(req.body);
    if (error) {
      console.log('❌ Validation error:', error.details[0].message);
      console.log('❌ Validation details:', JSON.stringify(error.details, null, 2));
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { tournament_name, tournament_type, start_date, end_date } = value;

    // 檢查錦標賽名稱是否已存在
    const existingTournaments = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_name = ?',
      [tournament_name]
    );

    if (existingTournaments.length > 0) {
      return res.status(409).json({
        success: false,
        message: '錦標賽名稱已存在'
      });
    }

    // 創建錦標賽
    const result = await query(
      'INSERT INTO tournaments (tournament_name, tournament_type, start_date, end_date) VALUES (?, ?, ?, ?)',
      [tournament_name, tournament_type, start_date, end_date]
    );

    res.status(201).json({
      success: true,
      message: '錦標賽創建成功',
      data: {
        tournament_id: result.insertId
      }
    });

  } catch (error) {
    console.error('創建錦標賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建錦標賽失敗'
    });
  }
});

// 更新錦標賽信息 (temporarily remove auth for development)
router.put('/:id', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = tournamentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { tournament_name, tournament_type, start_date, end_date } = value;

    // 檢查錦標賽是否存在
    const existingTournament = await query(
      'SELECT tournament_id, tournament_name, tournament_type, status FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );

    if (existingTournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    const tournament = existingTournament[0];

    // 檢查錦標賽狀態 - 只能編輯待開始的錦標賽
    if (tournament.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能編輯待開始狀態的錦標賽'
      });
    }

    // 檢查錦標賽名稱是否與其他錦標賽重複
    if (tournament_name !== tournament.tournament_name) {
      const duplicateName = await query(
        'SELECT tournament_id FROM tournaments WHERE tournament_name = ? AND tournament_id != ?',
        [tournament_name, tournamentId]
      );

      if (duplicateName.length > 0) {
        return res.status(409).json({
          success: false,
          message: '錦標賽名稱已存在'
        });
      }
    }

    // 如果要更改錦標賽類型，檢查是否符合變更規則
    if (tournament_type !== tournament.tournament_type) {
      const changeValidation = await validateTournamentTypeChange(
        tournamentId, 
        tournament.tournament_type, 
        tournament_type
      );
      
      if (!changeValidation.allowed) {
        return res.status(400).json({
          success: false,
          message: changeValidation.message
        });
      }
    }

    // 更新錦標賽信息
    await query(
      'UPDATE tournaments SET tournament_name = ?, tournament_type = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE tournament_id = ?',
      [tournament_name, tournament_type, start_date, end_date, tournamentId]
    );

    res.json({
      success: true,
      message: '錦標賽更新成功'
    });

  } catch (error) {
    console.error('更新錦標賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽失敗'
    });
  }
});

// 更新錦標賽狀態 (temporarily remove auth for development)
router.patch('/:id/status', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { status } = req.body;

    if (!['pending', 'active', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的狀態值'
      });
    }

    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 更新狀態
    await query(
      'UPDATE tournaments SET status = ? WHERE tournament_id = ?',
      [status, tournamentId]
    );

    res.json({
      success: true,
      message: '錦標賽狀態更新成功'
    });

  } catch (error) {
    console.error('更新錦標賽狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽狀態失敗'
    });
  }
});

// 生成淘汰賽結構 - 智能版本 (temporarily remove auth for development)
router.post('/:id/knockout/generate', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { team_count, match_date, match_time = 600, match_interval = 1800, include_third_place = true } = req.body;
    
    console.log('🎯 Knockout generation request data:', {
      team_count,
      match_date,
      match_time,
      match_interval,
      include_third_place
    });

    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id, tournament_type, tournament_name FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    const tournament = tournaments[0];

    // 驗證隊伍數量是否是2的冪
    if (!team_count || team_count < 2 || (team_count & (team_count - 1)) !== 0) {
      return res.status(400).json({
        success: false,
        message: '淘汰賽隊伍數量必須是2的冪（2, 4, 8, 16...）'
      });
    }

    let selectedTeams = [];

    // 根據錦標賽類型選擇隊伍（只選擇參與小組賽的隊伍）
    if (tournament.tournament_type === 'mixed') {
      // 混合賽制：根據總排名榜選擇前N名（只包含有小組賽記錄的隊伍）
      console.log(`🏆 混合賽制錦標賽：根據總排名榜選擇前${team_count}名隊伍（僅限小組賽參與者）`);
      
      // 只選擇分配到小組的隊伍（有group_id的隊伍）
      const groupTeams = await query(`
        SELECT DISTINCT t.team_id, t.team_name, t.group_id,
               COALESCE(gs.points, 0) as points,
               COALESCE(gs.played, 0) as played,
               ROW_NUMBER() OVER (ORDER BY COALESCE(gs.points, 0) DESC, t.team_name) as team_rank
        FROM teams t
        INNER JOIN team_groups tg ON t.group_id = tg.group_id
        LEFT JOIN group_standings gs ON t.team_id = gs.team_id AND gs.tournament_id = ?
        WHERE t.tournament_id = ? AND t.is_virtual = 0 AND t.group_id IS NOT NULL
        ORDER BY COALESCE(gs.points, 0) DESC, t.team_name
      `, [tournamentId, tournamentId]);
      
      console.log(`🏆 Found ${groupTeams.length} teams that participated in group matches`);
      
      if (groupTeams.length < team_count) {
        return res.status(400).json({
          success: false,
          message: `只有${groupTeams.length}支隊伍參與了小組賽，無法選擇${team_count}支隊伍進行淘汰賽`
        });
      }
      
      selectedTeams = groupTeams.slice(0, team_count).map(team => ({
        team_id: team.team_id,
        team_name: team.team_name,
        rank: team.team_rank,
        points: team.points
      }));
      
    } else if (tournament.tournament_type === 'knockout') {
      // 純淘汰賽：選擇參與小組賽的隊伍
      console.log(`⚡ 純淘汰賽錦標賽：選擇${team_count}支參與小組賽的隊伍`);
      
      const groupTeams = await query(`
        SELECT DISTINCT t.team_id, t.team_name, t.group_id
        FROM teams t
        INNER JOIN team_groups tg ON t.group_id = tg.group_id
        WHERE t.tournament_id = ? AND t.is_virtual = 0 AND t.group_id IS NOT NULL
        ORDER BY t.team_name
      `, [tournamentId]);
      
      if (groupTeams.length < team_count) {
        return res.status(400).json({
          success: false,
          message: `只有${groupTeams.length}支隊伍參與了小組賽，無法選擇${team_count}支隊伍進行淘汰賽`
        });
      }
      
      // 隨機打亂隊伍順序
      const shuffledTeams = [...groupTeams].sort(() => Math.random() - 0.5);
      selectedTeams = shuffledTeams.slice(0, team_count);
      
    } else {
      // 小組賽類型不支持淘汰賽生成
      return res.status(400).json({
        success: false,
        message: '小組賽類型的錦標賽不支持淘汰賽生成'
      });
    }

    console.log(`🎯 選中的隊伍:`, selectedTeams.map(t => `${t.team_name}${t.rank ? ` (排名${t.rank})` : ''}`));

    // 生成淘汰賽結構
    const knockoutResult = await generateKnockoutStructure(
      tournamentId, 
      selectedTeams, 
      match_date, 
      match_time,
      match_interval,
      tournament.tournament_type,
      include_third_place
    );

    res.status(201).json({
      success: true,
      message: `${tournament.tournament_type === 'mixed' ? '混合賽制' : '淘汰賽'}結構創建成功`,
      data: {
        tournament_type: tournament.tournament_type,
        selected_teams: selectedTeams.length,
        total_rounds: Math.log2(selectedTeams.length),
        total_matches: selectedTeams.length - 1,
        teams: selectedTeams,
        ...knockoutResult
      }
    });

  } catch (error) {
    console.error('生成淘汰賽結構錯誤:', error);
    res.status(500).json({
      success: false,
      message: '生成淘汰賽結構失敗'
    });
  }
});

// 創建淘汰賽結構 (temporarily remove auth for development)
router.post('/:id/knockout', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { teams, match_date, match_time = 10 } = req.body;

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({
        success: false,
        message: '隊伍列表不能為空'
      });
    }

    // 檢查隊伍數量是否是2的冪
    const teamCount = teams.length;
    if ((teamCount & (teamCount - 1)) !== 0) {
      return res.status(400).json({
        success: false,
        message: '淘汰賽隊伍數量必須是2的冪（2, 4, 8, 16...）'
      });
    }

    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查所有隊伍是否存在
    const teamIds = typeof teams[0] === 'object' ? teams.map(t => t.team_id) : teams; // Handle both array of objects and array of IDs
    const existingTeams = await query(
      `SELECT team_id FROM teams WHERE team_id IN (${teamIds.map(() => '?').join(',')})`,
      teamIds
    );

    if (existingTeams.length !== teamIds.length) {
      return res.status(404).json({
        success: false,
        message: '部分隊伍不存在'
      });
    }

    await transaction(async (connection) => {
      // 計算輪次數
      const rounds = Math.log2(teamCount);
      let currentRound = 1;
      let currentTeams = [...teams];
      let matchNumber = 1;

      // 創建第一輪比賽
      const firstRoundMatches = [];
      for (let i = 0; i < currentTeams.length; i += 2) {
        const team1 = currentTeams[i];
        const team2 = currentTeams[i + 1];
        
        const stage = getStageByRound(currentRound, rounds);
        const matchNumberStr = `${stage.substring(0, 2).toUpperCase()}${matchNumber.toString().padStart(2, '0')}`;

        // 創建比賽
        const team1Id = typeof team1 === 'object' ? team1.team_id : team1;
        const team2Id = typeof team2 === 'object' ? team2.team_id : team2;
        const matchResult = await connection.execute(`
          INSERT INTO matches (
            match_number, team1_id, team2_id, match_date, match_time,
            match_type, tournament_stage, tournament_id
          ) VALUES (?, ?, ?, ?, ?, 'knockout', ?, ?)
        `, [
          matchNumberStr, team1Id, team2Id, 
          match_date, match_time, stage, tournamentId
        ]);

        // 創建淘汰賽記錄
        await connection.execute(`
          INSERT INTO knockout_brackets (
            tournament_id, match_id, round_number, position_in_round
          ) VALUES (?, ?, ?, ?)
        `, [tournamentId, matchResult[0].insertId, currentRound, Math.floor(i / 2) + 1]);

        firstRoundMatches.push({
          match_id: matchResult[0].insertId,
          position: Math.floor(i / 2) + 1
        });

        matchNumber++;
      }

      // 創建後續輪次的空比賽
      for (let round = 2; round <= rounds; round++) {
        const matchesInRound = Math.pow(2, rounds - round);
        const stage = getStageByRound(round, rounds);

        // 如果是決賽輪次且有準決賽，先創建季軍賽
        if (stage === 'final' && rounds >= 2) {
          // 創建季軍賽（3rd place match）
          const thirdPlaceMatchNumber = 'TP01'; // Third Place 01
          
          console.log(`🥉 Creating 3rd place match: ${thirdPlaceMatchNumber}`);
          
          const thirdPlaceResult = await connection.execute(`
            INSERT INTO matches (
              match_number, team1_id, team2_id, match_date, match_time,
              match_type, tournament_stage, tournament_id
            ) VALUES (?, NULL, NULL, ?, ?, 'knockout', 'third_place', ?)
          `, [thirdPlaceMatchNumber, match_date, match_time, tournamentId]);

          // 季軍賽記錄在knockout_brackets表中
          await connection.execute(`
            INSERT INTO knockout_brackets (
              tournament_id, match_id, round_number, position_in_round
            ) VALUES (?, ?, ?, ?)
          `, [tournamentId, thirdPlaceResult[0].insertId, round, 0]); // position 0 表示季軍賽
        }

        for (let pos = 1; pos <= matchesInRound; pos++) {
          const matchNumberStr = `${stage.substring(0, 2).toUpperCase()}${matchNumber.toString().padStart(2, '0')}`;

          // 如果是決賽且有季軍賽，決賽應該在季軍賽之後進行
          let finalMatchTime = match_date;
          if (stage === 'final' && rounds >= 2) {
            // 決賽時間 = 季軍賽時間 + 間隔時間 (不包含比賽時長)
            const intervalTime = 1800; // 間隔時間（秒），默認30分鐘
            const finalDate = new Date(match_date);
            finalDate.setSeconds(finalDate.getSeconds() + intervalTime);
            finalMatchTime = finalDate.toISOString().slice(0, 19).replace('T', ' ');
          }

          const matchResult = await connection.execute(`
            INSERT INTO matches (
              match_number, team1_id, team2_id, match_date, match_time,
              match_type, tournament_stage, tournament_id
            ) VALUES (?, NULL, NULL, ?, ?, 'knockout', ?, ?)
          `, [matchNumberStr, finalMatchTime, match_time, stage, tournamentId]);

          await connection.execute(`
            INSERT INTO knockout_brackets (
              tournament_id, match_id, round_number, position_in_round
            ) VALUES (?, ?, ?, ?)
          `, [tournamentId, matchResult[0].insertId, round, pos]);

          matchNumber++;
        }
      }

      // 設置next_match_id關係
      for (let round = 1; round < rounds; round++) {
        const currentRoundBrackets = await connection.execute(`
          SELECT bracket_id, match_id, position_in_round 
          FROM knockout_brackets 
          WHERE tournament_id = ? AND round_number = ?
          ORDER BY position_in_round
        `, [parseInt(tournamentId), round]);

        const nextRoundBrackets = await connection.execute(`
          SELECT bracket_id, match_id, position_in_round 
          FROM knockout_brackets 
          WHERE tournament_id = ? AND round_number = ?
          ORDER BY position_in_round
        `, [parseInt(tournamentId), round + 1]);

        for (let i = 0; i < currentRoundBrackets[0].length; i += 2) {
          const nextMatchIndex = Math.floor(i / 2);
          if (nextMatchIndex < nextRoundBrackets[0].length) {
            const nextMatchId = nextRoundBrackets[0][nextMatchIndex].match_id;

            await connection.execute(`
              UPDATE knockout_brackets 
              SET next_match_id = ? 
              WHERE bracket_id IN (?, ?)
            `, [
              nextMatchId,
              currentRoundBrackets[0][i].bracket_id,
              currentRoundBrackets[0][i + 1].bracket_id
            ]);
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: `淘汰賽結構創建成功，共${teamCount}支隊伍，${Math.log2(teamCount)}輪比賽`
    });

  } catch (error) {
    console.error('創建淘汰賽結構錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建淘汰賽結構失敗'
    });
  }
});

// 推進淘汰賽 (temporarily remove auth for development)
router.post('/:id/advance', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 獲取所有已完成的淘汰賽比賽
    const completedMatches = await query(`
      SELECT kb.*, m.winner_id, m.match_status
      FROM knockout_brackets kb
      JOIN matches m ON kb.match_id = m.match_id
      WHERE kb.tournament_id = ? AND m.match_status = 'completed' AND kb.next_match_id IS NOT NULL
    `, [tournamentId]);

    if (completedMatches.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有已完成的比賽需要處理晉級'
      });
    }

    await transaction(async (connection) => {
      // 按next_match_id分組處理
      const nextMatchGroups = {};
      completedMatches.forEach(match => {
        const nextMatchId = match.next_match_id;
        if (!nextMatchGroups[nextMatchId]) {
          nextMatchGroups[nextMatchId] = [];
        }
        nextMatchGroups[nextMatchId].push(match);
      });

      let advancedCount = 0;

      for (const [nextMatchId, matches] of Object.entries(nextMatchGroups)) {
        // 檢查是否有兩場比賽都完成了
        if (matches.length === 2) {
          const winner1 = matches[0].winner_id;
          const winner2 = matches[1].winner_id;

          if (winner1 && winner2) {
            // 更新下一場比賽的隊伍
            await connection.execute(`
              UPDATE matches 
              SET team1_id = ?, team2_id = ?
              WHERE match_id = ?
            `, [winner1, winner2, nextMatchId]);

            advancedCount++;
          }
        }
      }

      if (advancedCount === 0) {
        throw new Error('沒有可以晉級的隊伍');
      }
    });

    res.json({
      success: true,
      message: `成功處理${completedMatches.length}場比賽的晉級，${advancedCount}場下輪比賽已更新`
    });

  } catch (error) {
    console.error('處理淘汰賽晉級錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '處理淘汰賽晉級失敗'
    });
  }
});

// 獲取淘汰賽結構
router.get('/:id/bracket', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    const brackets = await query(`
      SELECT 
        kb.*,
        m.match_number, m.match_status, m.team1_score, m.team2_score, m.winner_id, m.tournament_stage,
        m.match_date, m.match_time,
        t1.team_name as team1_name, t1.team_color as team1_color,
        t2.team_name as team2_name, t2.team_color as team2_color,
        w.team_name as winner_name
      FROM knockout_brackets kb
      JOIN matches m ON kb.match_id = m.match_id
      LEFT JOIN teams t1 ON m.team1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team2_id = t2.team_id
      LEFT JOIN teams w ON m.winner_id = w.team_id
      WHERE kb.tournament_id = ?
      ORDER BY kb.round_number, kb.position_in_round
    `, [tournamentId]);

    // 按輪次組織數據
    const rounds = {};
    brackets.forEach(bracket => {
      const round = bracket.round_number;
      if (!rounds[round]) {
        rounds[round] = [];
      }
      rounds[round].push(bracket);
    });

    res.json({
      success: true,
      data: {
        rounds
      }
    });

  } catch (error) {
    console.error('獲取淘汰賽結構錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取淘汰賽結構失敗'
    });
  }
});

// 輔助函數：驗證錦標賽類型變更規則
async function validateTournamentTypeChange(tournamentId, currentType, newType) {
  try {
    console.log(`🔄 Validating tournament type change: ${currentType} → ${newType}`);
    
    // 檢查相關數據
    const groupCount = await query(
      'SELECT COUNT(*) as count FROM team_groups WHERE tournament_id = ?',
      [tournamentId]
    );
    
    const teamCount = await query(
      'SELECT COUNT(*) as count FROM teams WHERE tournament_id = ?',
      [tournamentId]
    );
    
    const groupMatchCount = await query(
      'SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND match_type = "group"',
      [tournamentId]
    );
    
    const knockoutMatchCount = await query(
      'SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND match_type = "knockout"',
      [tournamentId]
    );
    
    console.log(`📊 Data counts: Groups=${groupCount[0].count}, Teams=${teamCount[0].count}, GroupMatches=${groupMatchCount[0].count}, KnockoutMatches=${knockoutMatchCount[0].count}`);
    
    // 規則1: 小組賽制 → 混合賽制 (允許，無論是否有小組比賽)
    if (currentType === 'group' && newType === 'mixed') {
      console.log('✅ 允許：小組賽制 → 混合賽制 (無限制)');
      return {
        allowed: true,
        message: '可以從小組賽制變更為混合賽制'
      };
    }
    
    // 規則2: 混合賽制 → 小組賽制 (只有在沒有淘汰賽比賽時才允許)
    if (currentType === 'mixed' && newType === 'group') {
      if (knockoutMatchCount[0].count > 0) {
        console.log('❌ 拒絕：混合賽制 → 小組賽制 (存在淘汰賽比賽)');
        return {
          allowed: false,
          message: '無法從混合賽制變更為小組賽制：存在淘汰賽比賽。請先刪除所有淘汰賽比賽。'
        };
      }
      console.log('✅ 允許：混合賽制 → 小組賽制 (無淘汰賽比賽)');
      return {
        allowed: true,
        message: '可以從混合賽制變更為小組賽制'
      };
    }
    
    // 規則3: 其他類型變更 - 使用原有的嚴格規則
    if (groupCount[0].count > 0 || teamCount[0].count > 0 || (groupMatchCount[0].count + knockoutMatchCount[0].count) > 0) {
      console.log(`❌ 拒絕：${currentType} → ${newType} (存在相關數據)`);
      return {
        allowed: false,
        message: `無法從${getTypeDisplayName(currentType)}變更為${getTypeDisplayName(newType)}：錦標賽已有相關數據（小組、隊伍或比賽）。請先清除所有相關數據。`
      };
    }
    
    console.log(`✅ 允許：${currentType} → ${newType} (無相關數據)`);
    return {
      allowed: true,
      message: `可以從${getTypeDisplayName(currentType)}變更為${getTypeDisplayName(newType)}`
    };
    
  } catch (error) {
    console.error('驗證錦標賽類型變更錯誤:', error);
    return {
      allowed: false,
      message: '驗證錦標賽類型變更時發生錯誤'
    };
  }
}

// 輔助函數：獲取錦標賽類型顯示名稱
function getTypeDisplayName(type) {
  switch (type) {
    case 'group': return '小組賽制';
    case 'knockout': return '淘汰賽制';
    case 'mixed': return '混合賽制';
    default: return type;
  }
}

// 輔助函數：根據輪次和總輪次數確定比賽階段
function getStageByRound(round, totalRounds) {
  const remainingRounds = totalRounds - round + 1;
  
  switch (remainingRounds) {
    case 1:
      return 'final';
    case 2:
      return 'semi_final';
    case 3:
      return 'quarter_final';
    case 4:
      return 'round_of_16';
    default:
      return `round_${remainingRounds}`;
  }
}

// 輔助函數：獲取總排名榜
async function getOverallLeaderboard(tournamentId) {
  try {
    console.log(`🏆 Getting overall leaderboard for tournament ${tournamentId}...`);
    
    // Get all teams with their match statistics for this tournament
    const allTeamsStats = await query(`
      SELECT 
        t.team_id,
        t.team_name,
        t.team_color,
        g.group_name,
        g.group_id,
        COALESCE(gs.played, 0) as played,
        COALESCE(gs.won, 0) as won,
        COALESCE(gs.drawn, 0) as drawn,
        COALESCE(gs.lost, 0) as lost,
        COALESCE(gs.goals_for, 0) as goals_for,
        COALESCE(gs.goals_against, 0) as goals_against,
        COALESCE(gs.points, 0) as points
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id AND g.tournament_id = ?
      LEFT JOIN group_standings gs ON t.team_id = gs.team_id AND gs.tournament_id = ?
      WHERE t.tournament_id = ? AND t.is_virtual = 0
    `, [tournamentId, tournamentId, tournamentId]);
    
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
    
    console.log(`🏆 Tournament ${tournamentId} leaderboard calculated for ${leaderboard.length} teams`);
    return leaderboard;
    
  } catch (error) {
    console.error('獲取總排名榜錯誤:', error);
    throw error;
  }
}

// 輔助函數：生成淘汰賽結構
async function generateKnockoutStructure(tournamentId, teams, matchDate, matchTime, matchInterval, tournamentType, includeThirdPlace = true) {
  try {
    const teamCount = teams.length;
    const rounds = Math.log2(teamCount);
    
    console.log(`🎯 生成${teamCount}支隊伍的淘汰賽結構，共${rounds}輪`);
    
    // 對於混合賽制，使用標準錦標賽種子排列
    let arrangedTeams = [...teams];
    if (tournamentType === 'mixed') {
      arrangedTeams = arrangeTeamsForKnockout(teams);
      console.log(`🏆 混合賽制使用標準錦標賽種子排列:`, arrangedTeams.map(t => `${t.team_name}(${t.rank})`));
    }
    
    return await transaction(async (connection) => {
      const createdMatches = [];
      
      // 創建第一輪比賽
      const firstRoundMatches = [];
      let firstRoundMatchNumber = 1;
      for (let i = 0; i < arrangedTeams.length; i += 2) {
        const team1 = arrangedTeams[i];
        const team2 = arrangedTeams[i + 1];
        
        const stage = getStageByRound(1, rounds);
        const matchNumberStr = `${stage.substring(0, 2).toUpperCase()}${firstRoundMatchNumber.toString().padStart(2, '0')}`;

        // 創建比賽
        // 計算這場比賽的時間（使用間隔）
        // matchDate already contains the full datetime from frontend
        const matchDateTime = moment(matchDate).add((firstRoundMatchNumber - 1) * matchInterval, 'seconds');
        
        const matchResult = await connection.execute(`
          INSERT INTO matches (
            match_number, team1_id, team2_id, match_date, match_time,
            match_type, tournament_stage, tournament_id
          ) VALUES (?, ?, ?, ?, ?, 'knockout', ?, ?)
        `, [
          matchNumberStr, team1.team_id, team2.team_id, 
          matchDateTime.format('YYYY-MM-DD HH:mm:ss'), parseInt(matchTime), stage, parseInt(tournamentId)
        ]);

        // 創建淘汰賽記錄
        await connection.execute(`
          INSERT INTO knockout_brackets (
            tournament_id, match_id, round_number, position_in_round
          ) VALUES (?, ?, ?, ?)
        `, [parseInt(tournamentId), matchResult[0].insertId, 1, Math.floor(i / 2) + 1]);

        firstRoundMatches.push({
          match_id: matchResult[0].insertId,
          position: Math.floor(i / 2) + 1,
          team1_name: team1.team_name,
          team2_name: team2.team_name,
          match_number: matchNumberStr
        });
        
        createdMatches.push({
          round: 1,
          match_number: matchNumberStr,
          team1: team1.team_name,
          team2: team2.team_name
        });

        firstRoundMatchNumber++;
      }

      // 先創建所有比賽，然後設置next_match_id關係
      const allMatches = [...firstRoundMatches];
      
      // 創建後續輪次的空比賽
      for (let round = 2; round <= rounds; round++) {
        const matchesInRound = Math.pow(2, rounds - round);
        const stage = getStageByRound(round, rounds);
        let roundMatchNumber = 1; // Each round starts from 1

        // 計算前一輪的比賽數量和時間
        const previousRoundMatches = Math.pow(2, rounds - (round - 1));
        // 計算從第一輪到前一輪的總比賽數量
        let totalPreviousMatches = 0;
        for (let r = 1; r < round; r++) {
          totalPreviousMatches += Math.pow(2, rounds - r);
        }
        // 前一輪最後一場比賽的開始時間 = 基礎時間 + (總前序比賽數量 - 1) * 間隔
        const previousRoundLastMatchTime = moment(matchDate).add((totalPreviousMatches - 1) * matchInterval, 'seconds');
        // 這一輪的開始時間 = 前一輪最後一場比賽開始時間 + 額外間隔
        const thisRoundStartTime = previousRoundLastMatchTime.add(matchInterval, 'seconds');

        // 如果是決賽輪次且有準決賽，需要處理季軍賽和決賽的順序
        let thirdPlaceMatchId = null;
        if (stage === 'final' && rounds >= 2 && includeThirdPlace) {
          // 記錄季軍賽的時間，但先不創建
          const thirdPlaceMatchTime = thisRoundStartTime.clone();
          console.log(`🥉 Will create 3rd place match after final at: ${thirdPlaceMatchTime.format('YYYY-MM-DD HH:mm:ss')}`);
          
          // 更新決賽的開始時間（在季軍賽之後）
          thisRoundStartTime.add(matchInterval, 'seconds');
        }

        for (let pos = 1; pos <= matchesInRound; pos++) {
          const matchNumberStr = `${stage.substring(0, 2).toUpperCase()}${roundMatchNumber.toString().padStart(2, '0')}`;

          // 這一輪每場比賽的時間 = 這一輪開始時間 + (比賽位置 - 1) * 間隔
          // 注意：如果是決賽輪且有季軍賽，thisRoundStartTime已經在上面調整過了
          let nextRoundMatchDateTime = thisRoundStartTime.clone().add((pos - 1) * matchInterval, 'seconds');
          
          const matchResult = await connection.execute(`
            INSERT INTO matches (
              match_number, team1_id, team2_id, match_date, match_time,
              match_type, tournament_stage, tournament_id
            ) VALUES (?, NULL, NULL, ?, ?, 'knockout', ?, ?)
          `, [matchNumberStr, nextRoundMatchDateTime.format('YYYY-MM-DD HH:mm:ss'), parseInt(matchTime), stage, parseInt(tournamentId)]);

          await connection.execute(`
            INSERT INTO knockout_brackets (
              tournament_id, match_id, round_number, position_in_round
            ) VALUES (?, ?, ?, ?)
          `, [parseInt(tournamentId), matchResult[0].insertId, round, pos]);
          
          allMatches.push({
            match_id: matchResult[0].insertId,
            round: round,
            position: pos,
            match_number: matchNumberStr,
            team1: 'TBD',
            team2: 'TBD'
          });

          roundMatchNumber++;
        }
        
        // 創建季軍賽（在決賽之後創建，確保正確的數據庫順序）
        if (stage === 'final' && rounds >= 2 && includeThirdPlace) {
          const thirdPlaceMatchNumber = 'TP01'; // Third Place 01
          // 季軍賽時間應該在決賽之前（時間上），但在數據庫中後創建
          const thirdPlaceMatchTime = thisRoundStartTime.clone().subtract(matchInterval, 'seconds');
          
          console.log(`🥉 Creating 3rd place match: ${thirdPlaceMatchNumber} at ${thirdPlaceMatchTime.format('YYYY-MM-DD HH:mm:ss')}`);
          
          const thirdPlaceResult = await connection.execute(`
            INSERT INTO matches (
              match_number, team1_id, team2_id, match_date, match_time,
              match_type, tournament_stage, tournament_id
            ) VALUES (?, NULL, NULL, ?, ?, 'knockout', 'third_place', ?)
          `, [thirdPlaceMatchNumber, thirdPlaceMatchTime.format('YYYY-MM-DD HH:mm:ss'), parseInt(matchTime), parseInt(tournamentId)]);

          // 季軍賽記錄在knockout_brackets表中，使用特殊的round和position
          await connection.execute(`
            INSERT INTO knockout_brackets (
              tournament_id, match_id, round_number, position_in_round
            ) VALUES (?, ?, ?, ?)
          `, [parseInt(tournamentId), thirdPlaceResult[0].insertId, round, 0]); // position 0 表示季軍賽
          
          allMatches.push({
            match_id: thirdPlaceResult[0].insertId,
            round: round,
            position: 0, // 特殊位置表示季軍賽
            match_number: thirdPlaceMatchNumber,
            team1: 'TBD',
            team2: 'TBD'
          });
        }
      }

      // 設置next_match_id關係
      for (let round = 1; round < rounds; round++) {
        const currentRoundBrackets = await connection.execute(`
          SELECT bracket_id, match_id, position_in_round 
          FROM knockout_brackets 
          WHERE tournament_id = ? AND round_number = ?
          ORDER BY position_in_round
        `, [parseInt(tournamentId), round]);

        const nextRoundBrackets = await connection.execute(`
          SELECT bracket_id, match_id, position_in_round 
          FROM knockout_brackets 
          WHERE tournament_id = ? AND round_number = ? AND position_in_round > 0
          ORDER BY position_in_round
        `, [parseInt(tournamentId), round + 1]);

        for (let i = 0; i < currentRoundBrackets[0].length; i += 2) {
          const nextMatchIndex = Math.floor(i / 2);
          if (nextMatchIndex < nextRoundBrackets[0].length) {
            const nextMatchId = nextRoundBrackets[0][nextMatchIndex].match_id;

            await connection.execute(`
              UPDATE knockout_brackets 
              SET next_match_id = ? 
              WHERE bracket_id IN (?, ?)
            `, [
              nextMatchId,
              currentRoundBrackets[0][i].bracket_id,
              currentRoundBrackets[0][i + 1].bracket_id
            ]);
          }
        }
      }
      
      return {
        first_round_matches: firstRoundMatches,
        all_matches: createdMatches
      };
    });
    
  } catch (error) {
    console.error('生成淘汰賽結構錯誤:', error);
    throw error;
  }
}

// 輔助函數：為淘汰賽排列隊伍（標準錦標賽種子排列）
function arrangeTeamsForKnockout(teams) {
  // 對於混合賽制，使用標準錦標賽種子排列
  // 8隊: 1vs8, 4vs5, 3vs6, 2vs7
  // 16隊: 1vs16, 8vs9, 4vs13, 5vs12, 6vs14, 3vs11, 7vs10, 2vs15
  const arranged = [];
  const teamCount = teams.length;
  
  console.log(`🏆 使用標準錦標賽種子排列 (${teamCount}隊)`);
  
  // 生成標準錦標賽對陣表
  const brackets = generateStandardTournamentBrackets(teamCount);
  console.log(`📋 對陣表:`, brackets.map(([seed1, seed2]) => `${seed1}vs${seed2}`).join(', '));
  
  // 根據對陣表排列隊伍
  for (const [seed1, seed2] of brackets) {
    const index1 = seed1 - 1; // 轉換為0-based索引
    const index2 = seed2 - 1;
    arranged.push(teams[index1], teams[index2]);
  }
  
  return arranged;
}

// 生成標準錦標賽對陣表
function generateStandardTournamentBrackets(teamCount) {
  // 標準錦標賽種子排列
  // 8隊: 1vs8, 4vs5, 3vs6, 2vs7
  // 16隊: 1vs16, 8vs9, 4vs13, 5vs12, 6vs14, 3vs11, 7vs10, 2vs15
  
  const brackets = [];
  
  if (teamCount === 2) {
    brackets.push([1, 2]);
  } else if (teamCount === 4) {
    brackets.push([1, 4], [2, 3]);
  } else if (teamCount === 8) {
    brackets.push([1, 8], [4, 5], [3, 6], [2, 7]);
  } else if (teamCount === 16) {
    brackets.push(
      [1, 16], [8, 9], [4, 13], [5, 12],
      [6, 14], [3, 11], [7, 10], [2, 15]
    );
  } else if (teamCount === 32) {
    brackets.push(
      [1, 32], [16, 17], [8, 25], [9, 24],
      [4, 29], [13, 20], [5, 28], [12, 21],
      [6, 27], [11, 22], [3, 30], [14, 19],
      [7, 26], [10, 23], [15, 18], [2, 31]
    );
  } else {
    // 對於其他數量，使用通用算法
    for (let i = 0; i < teamCount / 2; i++) {
      const seed1 = i + 1;
      const seed2 = teamCount - i;
      brackets.push([seed1, seed2]);
    }
  }
  
  return brackets;
}

// 獲取錦標賽的小組列表
router.get('/:id/groups', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    const groups = await query(`
      SELECT g.*, 
             COUNT(DISTINCT t.team_id) as team_count,
             COUNT(DISTINCT m.match_id) as total_matches,
             COUNT(DISTINCT CASE WHEN m.match_status = 'completed' THEN m.match_id END) as completed_matches
      FROM team_groups g
      LEFT JOIN teams t ON g.group_id = t.group_id AND t.tournament_id = ?
      LEFT JOIN matches m ON g.group_id = m.group_id AND m.tournament_id = ?
      WHERE g.tournament_id = ?
      GROUP BY g.group_id
      ORDER BY g.group_name
    `, [tournamentId, tournamentId, tournamentId]);

    res.json({
      success: true,
      data: { groups }
    });

  } catch (error) {
    console.error('獲取錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽小組失敗'
    });
  }
});

// 獲取錦標賽隊伍統計
router.get('/:id/teams/stats', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 獲取統計數據
    const stats = await query(`
      SELECT 
        COUNT(*) as total_teams,
        COUNT(CASE WHEN group_id IS NOT NULL THEN 1 END) as grouped_teams,
        COUNT(CASE WHEN group_id IS NULL THEN 1 END) as ungrouped_teams,
        COUNT(CASE WHEN is_virtual = 1 THEN 1 END) as virtual_teams
      FROM teams 
      WHERE tournament_id = ?
    `, [tournamentId]);

    res.json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('獲取錦標賽隊伍統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽隊伍統計失敗'
    });
  }
});

// 獲取錦標賽的隊伍列表
router.get('/:id/teams', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { group_id, page = 1, limit = 50, search, unassigned } = req.query;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    let whereClause = 'WHERE t.tournament_id = ?';
    let params = [tournamentId];

    // Add search functionality
    if (search && search.trim()) {
      whereClause += ' AND t.team_name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    // Add group filtering
    if (group_id) {
      whereClause += ' AND t.group_id = ?';
      params.push(group_id);
    } else if (unassigned === 'true') {
      whereClause += ' AND t.group_id IS NULL';
    }

    const offset = (page - 1) * limit;
    const teams = await query(`
      SELECT t.*, g.group_name,
             COUNT(a.athlete_id) as athlete_count
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      LEFT JOIN athletes a ON t.team_id = a.team_id AND a.is_active = 1
      ${whereClause}
      GROUP BY t.team_id
      ORDER BY t.team_name
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // 獲取總數
    const countResult = await query(`
      SELECT COUNT(*) as total FROM teams t ${whereClause}
    `, params);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        teams,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取錦標賽隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽隊伍失敗'
    });
  }
});

// 為錦標賽創建小組
router.post('/:id/groups', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { group_name, max_teams = 4 } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查小組名稱在該錦標賽中是否已存在
    const existingGroup = await query(
      'SELECT group_id FROM team_groups WHERE tournament_id = ? AND group_name = ?',
      [tournamentId, group_name]
    );

    if (existingGroup.length > 0) {
      return res.status(409).json({
        success: false,
        message: '該錦標賽中已存在相同名稱的小組'
      });
    }

    const result = await query(
      'INSERT INTO team_groups (tournament_id, group_name, max_teams) VALUES (?, ?, ?)',
      [tournamentId, group_name, max_teams]
    );

    res.status(201).json({
      success: true,
      message: '小組創建成功',
      data: { group_id: result.insertId }
    });

  } catch (error) {
    console.error('創建錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建錦標賽小組失敗'
    });
  }
});

// 為錦標賽創建隊伍
router.post('/:id/teams', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { team_name, group_id, team_color = '#FFFFFF', is_virtual = false, description } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查隊伍名稱在該錦標賽中是否已存在
    const existingTeam = await query(
      'SELECT team_id FROM teams WHERE tournament_id = ? AND team_name = ?',
      [tournamentId, team_name]
    );

    if (existingTeam.length > 0) {
      return res.status(409).json({
        success: false,
        message: '該錦標賽中已存在相同名稱的隊伍'
      });
    }

    // 如果指定了小組，檢查小組是否屬於該錦標賽
    if (group_id) {
      const group = await query(
        'SELECT group_id, max_teams FROM team_groups WHERE group_id = ? AND tournament_id = ?',
        [group_id, tournamentId]
      );

      if (group.length === 0) {
        return res.status(404).json({
          success: false,
          message: '指定的小組不存在或不屬於該錦標賽'
        });
      }

      // 檢查小組是否已滿
      const teamCount = await query(
        'SELECT COUNT(*) as count FROM teams WHERE group_id = ? AND tournament_id = ?',
        [group_id, tournamentId]
      );

      if (teamCount[0].count >= group[0].max_teams) {
        return res.status(400).json({
          success: false,
          message: '該小組已滿，無法添加更多隊伍'
        });
      }
    }

    await transaction(async (connection) => {
      // 創建隊伍 - 確保所有參數都不是 undefined
      const safeGroupId = group_id === undefined ? null : group_id;
      const safeIsVirtual = is_virtual === undefined ? false : is_virtual;
      
      console.log('🔧 準備插入隊伍數據:', {
        tournament_id: tournamentId,
        team_name,
        group_id: safeGroupId,
        team_color,
        is_virtual: safeIsVirtual,
        description: description || null
      });
      
      const result = await connection.execute(
        'INSERT INTO teams (tournament_id, team_name, group_id, team_color, is_virtual, description) VALUES (?, ?, ?, ?, ?, ?)',
        [parseInt(tournamentId), team_name, safeGroupId, team_color, safeIsVirtual ? 1 : 0, description || null]
      );

      console.log('🔧 隊伍插入結果:', {
        insertId: result.insertId,
        affectedRows: result.affectedRows,
        result: result
      });

      const teamId = result.insertId || result[0]?.insertId;
      if (!teamId) {
        throw new Error('隊伍創建失敗：未獲得有效的隊伍ID');
      }

      // 如果分配了小組，更新小組積分表
      if (group_id) {
        console.log('🔧 準備插入小組積分表數據:', {
          tournament_id: parseInt(tournamentId),
          group_id: group_id,
          team_id: teamId
        });
        
        await connection.execute(
          'INSERT INTO group_standings (tournament_id, group_id, team_id, played, won, drawn, lost, goals_for, goals_against, points) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0)',
          [parseInt(tournamentId), group_id, teamId]
        );
      }

      res.status(201).json({
        success: true,
        message: '隊伍創建成功',
        data: { team_id: teamId }
      });
    });

  } catch (error) {
    console.error('創建錦標賽隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建錦標賽隊伍失敗'
    });
  }
});

// 更新錦標賽小組
router.put('/:id/groups/:groupId', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const groupId = req.params.groupId;
    const { group_name, max_teams } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查小組是否存在且屬於該錦標賽
    const existingGroup = await query(
      'SELECT group_id, group_name, max_teams FROM team_groups WHERE group_id = ? AND tournament_id = ?',
      [groupId, tournamentId]
    );

    if (existingGroup.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在或不屬於該錦標賽'
      });
    }

    // 如果要修改小組名稱，檢查新名稱是否已存在
    if (group_name && group_name !== existingGroup[0].group_name) {
      const duplicateName = await query(
        'SELECT group_id FROM team_groups WHERE tournament_id = ? AND group_name = ? AND group_id != ?',
        [tournamentId, group_name, groupId]
      );

      if (duplicateName.length > 0) {
        return res.status(409).json({
          success: false,
          message: '該錦標賽中已存在相同名稱的小組'
        });
      }
    }

    // 如果要減少最大隊伍數，檢查當前隊伍數量
    if (max_teams && max_teams < existingGroup[0].max_teams) {
      const currentTeamCount = await query(
        'SELECT COUNT(*) as count FROM teams WHERE group_id = ? AND tournament_id = ?',
        [groupId, tournamentId]
      );

      if (currentTeamCount[0].count > max_teams) {
        return res.status(400).json({
          success: false,
          message: `無法將最大隊伍數設為 ${max_teams}，當前小組已有 ${currentTeamCount[0].count} 支隊伍`
        });
      }
    }

    // 檢查小組是否有已開始或已完成的比賽
    const activeMatches = await query(
      'SELECT COUNT(*) as count FROM matches WHERE group_id = ? AND tournament_id = ? AND match_status != "pending"',
      [groupId, tournamentId]
    );

    if (activeMatches[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '無法修改小組：存在已開始或已完成的比賽'
      });
    }

    // 更新小組信息
    const updateFields = [];
    const updateParams = [];

    if (group_name) {
      updateFields.push('group_name = ?');
      updateParams.push(group_name);
    }

    if (max_teams !== undefined) {
      updateFields.push('max_teams = ?');
      updateParams.push(max_teams);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有提供要更新的字段'
      });
    }

    updateParams.push(groupId, tournamentId);

    await query(
      `UPDATE team_groups SET ${updateFields.join(', ')} WHERE group_id = ? AND tournament_id = ?`,
      updateParams
    );

    res.json({
      success: true,
      message: '小組更新成功'
    });

  } catch (error) {
    console.error('更新錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽小組失敗'
    });
  }
});

// 刪除錦標賽小組
router.delete('/:id/groups/:groupId', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const groupId = req.params.groupId;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查小組是否存在且屬於該錦標賽
    const existingGroup = await query(
      'SELECT group_id, group_name FROM team_groups WHERE group_id = ? AND tournament_id = ?',
      [groupId, tournamentId]
    );

    if (existingGroup.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在或不屬於該錦標賽'
      });
    }

    // 檢查小組是否有隊伍
    const teamsInGroup = await query(
      'SELECT COUNT(*) as count FROM teams WHERE group_id = ? AND tournament_id = ?',
      [groupId, tournamentId]
    );

    if (teamsInGroup[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `無法刪除小組：小組中還有 ${teamsInGroup[0].count} 支隊伍，請先移除所有隊伍`
      });
    }

    // 檢查小組是否有比賽
    const matchesInGroup = await query(
      'SELECT COUNT(*) as count FROM matches WHERE group_id = ? AND tournament_id = ?',
      [groupId, tournamentId]
    );

    if (matchesInGroup[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `無法刪除小組：小組中還有 ${matchesInGroup[0].count} 場比賽，請先刪除所有比賽`
      });
    }

    await transaction(async (connection) => {
      // 刪除小組積分表記錄
      await connection.execute(
        'DELETE FROM group_standings WHERE group_id = ? AND tournament_id = ?',
        [groupId, tournamentId]
      );

      // 刪除小組
      await connection.execute(
        'DELETE FROM team_groups WHERE group_id = ? AND tournament_id = ?',
        [groupId, tournamentId]
      );
    });

    res.json({
      success: true,
      message: `小組 "${existingGroup[0].group_name}" 刪除成功`
    });

  } catch (error) {
    console.error('刪除錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除錦標賽小組失敗'
    });
  }
});

// 更新錦標賽隊伍
router.put('/:id/teams/:teamId', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Tournament team update endpoint hit:', { tournamentId: req.params.id, teamId: req.params.teamId });
    const tournamentId = req.params.id;
    const teamId = req.params.teamId;
    const { team_name, group_id, team_color, is_virtual, description } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查隊伍是否存在且屬於該錦標賽
    const existingTeam = await query(
      'SELECT team_id, team_name, group_id FROM teams WHERE team_id = ? AND tournament_id = ?',
      [teamId, tournamentId]
    );

    if (existingTeam.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在或不屬於該錦標賽'
      });
    }

    // 如果要修改隊伍名稱，檢查新名稱是否已存在
    if (team_name && team_name !== existingTeam[0].team_name) {
      const duplicateName = await query(
        'SELECT team_id FROM teams WHERE tournament_id = ? AND team_name = ? AND team_id != ?',
        [tournamentId, team_name, teamId]
      );

      if (duplicateName.length > 0) {
        return res.status(409).json({
          success: false,
          message: '該錦標賽中已存在相同名稱的隊伍'
        });
      }
    }

    // 檢查隊伍是否有已開始或已完成的比賽
    const activeMatches = await query(
      'SELECT COUNT(*) as count FROM matches WHERE (team1_id = ? OR team2_id = ?) AND tournament_id = ? AND match_status != "pending"',
      [teamId, teamId, tournamentId]
    );

    const hasActiveMatches = activeMatches[0].count > 0;

    // 如果有活躍比賽，只限制小組變更，允許修改名稱、顏色、描述等
    if (hasActiveMatches) {
      if (group_id !== undefined && group_id !== existingTeam[0].group_id) {
        return res.status(400).json({
          success: false,
          message: '無法更改隊伍小組：該隊伍已參與已開始或已完成的比賽'
        });
      }
    }

    // 如果要更改小組分配（只在沒有活躍比賽時檢查）
    if (!hasActiveMatches && group_id !== undefined && group_id !== existingTeam[0].group_id) {
      // 檢查新小組是否屬於該錦標賽
      if (group_id) {
        const targetGroup = await query(
          'SELECT group_id, max_teams FROM team_groups WHERE group_id = ? AND tournament_id = ?',
          [group_id, tournamentId]
        );

        if (targetGroup.length === 0) {
          return res.status(404).json({
            success: false,
            message: '目標小組不存在或不屬於該錦標賽'
          });
        }

        // 檢查目標小組是否已滿
        const teamCount = await query(
          'SELECT COUNT(*) as count FROM teams WHERE group_id = ? AND tournament_id = ? AND team_id != ?',
          [group_id, tournamentId, teamId]
        );

        if (teamCount[0].count >= targetGroup[0].max_teams) {
          return res.status(400).json({
            success: false,
            message: `目標小組已滿 (${teamCount[0].count}/${targetGroup[0].max_teams})，無法添加更多隊伍`
          });
        }
      }

      // 檢查原小組和目標小組的比賽狀態
      if (existingTeam[0].group_id) {
        const oldGroupMatches = await query(
          'SELECT COUNT(*) as count FROM matches WHERE group_id = ? AND tournament_id = ? AND match_status != "pending"',
          [existingTeam[0].group_id, tournamentId]
        );

        if (oldGroupMatches[0].count > 0) {
          return res.status(400).json({
            success: false,
            message: '無法更改隊伍小組：原小組存在已開始或已完成的比賽'
          });
        }
      }

      if (group_id) {
        const newGroupMatches = await query(
          'SELECT COUNT(*) as count FROM matches WHERE group_id = ? AND tournament_id = ? AND match_status != "pending"',
          [group_id, tournamentId]
        );

        if (newGroupMatches[0].count > 0) {
          return res.status(400).json({
            success: false,
            message: '無法更改隊伍小組：目標小組存在已開始或已完成的比賽'
          });
        }
      }
    }

    await transaction(async (connection) => {
      // 更新隊伍信息
      const updateFields = [];
      const updateParams = [];

      if (team_name) {
        updateFields.push('team_name = ?');
        updateParams.push(team_name);
      }

      if (group_id !== undefined) {
        updateFields.push('group_id = ?');
        updateParams.push(group_id);
      }

      if (team_color) {
        updateFields.push('team_color = ?');
        updateParams.push(team_color);
      }

      if (is_virtual !== undefined) {
        updateFields.push('is_virtual = ?');
        updateParams.push(is_virtual);
      }

      if (description !== undefined) {
        updateFields.push('description = ?');
        updateParams.push(description);
      }

      if (updateFields.length > 0) {
        updateParams.push(teamId, tournamentId);
        await connection.execute(
          `UPDATE teams SET ${updateFields.join(', ')} WHERE team_id = ? AND tournament_id = ?`,
          updateParams
        );
      }

      // 如果小組發生變化，更新積分表
      if (group_id !== undefined && group_id !== existingTeam[0].group_id) {
        // 從原小組積分表中移除
        if (existingTeam[0].group_id) {
          await connection.execute(
            'DELETE FROM group_standings WHERE team_id = ? AND group_id = ? AND tournament_id = ?',
            [teamId, existingTeam[0].group_id, tournamentId]
          );
        }

        // 添加到新小組積分表
        if (group_id) {
          await connection.execute(
            'INSERT INTO group_standings (tournament_id, group_id, team_id) VALUES (?, ?, ?)',
            [tournamentId, group_id, teamId]
          );
        }
      }
    });

    res.json({
      success: true,
      message: '隊伍更新成功'
    });

  } catch (error) {
    console.error('更新錦標賽隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽隊伍失敗'
    });
  }
});

// 刪除錦標賽隊伍
router.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const teamId = req.params.teamId;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查隊伍是否存在且屬於該錦標賽
    const existingTeam = await query(
      'SELECT team_id, team_name, group_id FROM teams WHERE team_id = ? AND tournament_id = ?',
      [teamId, tournamentId]
    );

    if (existingTeam.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在或不屬於該錦標賽'
      });
    }

    // 檢查隊伍是否有已開始或已完成的比賽
    const activeMatches = await query(
      'SELECT COUNT(*) as count FROM matches WHERE (team1_id = ? OR team2_id = ?) AND tournament_id = ? AND match_status != "pending"',
      [teamId, teamId, tournamentId]
    );

    if (activeMatches[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: '無法刪除隊伍：該隊伍已參與已開始或已完成的比賽'
      });
    }

    await transaction(async (connection) => {
      // 刪除相關的待開始比賽
      const pendingMatches = await connection.execute(
        'SELECT match_id FROM matches WHERE (team1_id = ? OR team2_id = ?) AND tournament_id = ? AND match_status = "pending"',
        [teamId, teamId, tournamentId]
      );

      if (pendingMatches[0].length > 0) {
        const matchIds = pendingMatches[0].map(m => m.match_id);
        
        // 刪除比賽事件
        for (const matchId of matchIds) {
          await connection.execute('DELETE FROM match_events WHERE match_id = ?', [matchId]);
        }

        // 刪除淘汰賽結構
        await connection.execute(
          `DELETE FROM knockout_brackets WHERE match_id IN (${matchIds.map(() => '?').join(',')})`,
          matchIds
        );

        // 刪除比賽
        await connection.execute(
          `DELETE FROM matches WHERE match_id IN (${matchIds.map(() => '?').join(',')})`,
          matchIds
        );
      }

      // 刪除小組積分表記錄
      await connection.execute(
        'DELETE FROM group_standings WHERE team_id = ? AND tournament_id = ?',
        [teamId, tournamentId]
      );

      // 刪除運動員
      await connection.execute(
        'DELETE FROM athletes WHERE team_id = ?',
        [teamId]
      );

      // 刪除隊伍
      await connection.execute(
        'DELETE FROM teams WHERE team_id = ? AND tournament_id = ?',
        [teamId, tournamentId]
      );
    });

    res.json({
      success: true,
      message: `隊伍 "${existingTeam[0].team_name}" 刪除成功`
    });

  } catch (error) {
    console.error('刪除錦標賽隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除錦標賽隊伍失敗'
    });
  }
});

// 刪除錦標賽 (temporarily remove auth for development)
router.delete('/:id', async (req, res) => {
  try {
    const tournamentId = req.params.id;

    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id, tournament_name FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    const tournament = tournaments[0];

    // 檢查錦標賽狀態 - 只能刪除待開始的錦標賽
    const tournamentStatus = await query(
      'SELECT status FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );

    if (tournamentStatus.length === 0 || tournamentStatus[0].status !== 'pending') {
      console.log(`⚠️ 錦標賽狀態檢查: ${tournamentStatus.length > 0 ? tournamentStatus[0].status : '未找到'}`);
      return res.status(400).json({
        success: false,
        message: '只能刪除待開始狀態的錦標賽。已開始或已完成的錦標賽無法刪除。'
      });
    }

    // 檢查是否有已開始或已完成的比賽
    // 注意：當前數據庫schema中matches表可能還沒有tournament_id列
    try {
      const activeMatches = await query(
        'SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND match_status != "pending"',
        [tournamentId]
      );

      if (activeMatches[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: '無法刪除錦標賽：存在已開始或已完成的比賽。只有當所有比賽都是待開始狀態時才能刪除錦標賽。'
        });
      }
    } catch (columnError) {
      console.log('⚠️ matches表還沒有tournament_id列，跳過比賽檢查');
      // 如果tournament_id列不存在，說明還沒有運行數據庫遷移，可以直接刪除
    }

    // 簡化刪除過程，先檢查是否有相關數據需要刪除
    console.log(`🗑️ 開始刪除錦標賽: ${tournament.tournament_name} (ID: ${tournamentId})`);

    // 檢查是否有相關數據 - 適配當前數據庫schema
    let relatedData = [{ match_count: 0, team_count: 0, group_count: 0 }];
    
    try {
      // 嘗試查詢tournament_id相關的數據
      relatedData = await query(`
        SELECT 
          (SELECT COUNT(*) FROM matches WHERE tournament_id = ?) as match_count,
          (SELECT COUNT(*) FROM teams WHERE tournament_id = ?) as team_count,
          (SELECT COUNT(*) FROM team_groups WHERE tournament_id = ?) as group_count
      `, [tournamentId, tournamentId, tournamentId]);
    } catch (schemaError) {
      console.log('⚠️ 數據庫schema還沒有tournament_id列，使用簡化刪除');
      // 如果schema還沒有更新，只刪除錦標賽記錄本身
      relatedData = [{ match_count: 0, team_count: 0, group_count: 0 }];
    }

    console.log('📊 相關數據統計:', relatedData[0]);

    await transaction(async (connection) => {
      // 如果數據庫支持外鍵約束，我們可以直接刪除錦標賽，讓CASCADE處理
      // 否則手動按順序刪除
      
      try {
        // 根據當前數據庫schema決定刪除策略
        if (relatedData[0].match_count > 0 || relatedData[0].team_count > 0 || relatedData[0].group_count > 0) {
          // 如果有tournament_id列，執行完整清理
          console.log('🔧 執行完整的tournament-scoped刪除');
          
          // 1. 刪除比賽相關數據
          if (relatedData[0].match_count > 0) {
            const matchIds = await connection.execute(
              'SELECT match_id FROM matches WHERE tournament_id = ?',
              [tournamentId]
            );
            
            if (matchIds[0].length > 0) {
              const ids = matchIds[0].map(m => m.match_id);
              console.log(`🔍 找到 ${ids.length} 場比賽需要清理`);
              
              for (const matchId of ids) {
                await connection.execute('DELETE FROM match_events WHERE match_id = ?', [matchId]);
              }
              console.log('✅ 已刪除比賽事件');
            }
            
            await connection.execute('DELETE FROM knockout_brackets WHERE tournament_id = ?', [tournamentId]);
            await connection.execute('DELETE FROM matches WHERE tournament_id = ?', [tournamentId]);
            console.log('✅ 已刪除比賽數據');
          }

          // 2. 刪除隊伍相關數據
          if (relatedData[0].team_count > 0) {
            const teamIds = await connection.execute(
              'SELECT team_id FROM teams WHERE tournament_id = ?',
              [tournamentId]
            );
            
            if (teamIds[0].length > 0) {
              const ids = teamIds[0].map(t => t.team_id);
              console.log(`🔍 找到 ${ids.length} 支隊伍需要清理`);
              
              for (const teamId of ids) {
                await connection.execute('DELETE FROM athletes WHERE team_id = ?', [teamId]);
              }
              console.log('✅ 已刪除運動員');
            }
            
            await connection.execute('DELETE FROM group_standings WHERE tournament_id = ?', [tournamentId]);
            await connection.execute('DELETE FROM teams WHERE tournament_id = ?', [tournamentId]);
            console.log('✅ 已刪除隊伍數據');
          }

          // 3. 刪除小組
          if (relatedData[0].group_count > 0) {
            await connection.execute('DELETE FROM team_groups WHERE tournament_id = ?', [tournamentId]);
            console.log('✅ 已刪除小組');
          }
        } else {
          console.log('🔧 執行簡化刪除（數據庫schema未更新）');
          // 如果沒有tournament_id列，只刪除錦標賽記錄
        }

        // 4. 最後刪除錦標賽
        const result = await connection.execute('DELETE FROM tournaments WHERE tournament_id = ?', [tournamentId]);
        console.log('✅ 已刪除錦標賽記錄');
        
        if (result.affectedRows === 0) {
          throw new Error('錦標賽刪除失敗：沒有記錄被刪除');
        }
        
      } catch (deleteError) {
        console.error('❌ 刪除過程中出現錯誤:', deleteError);
        throw deleteError;
      }
    });

    console.log(`🎉 錦標賽 "${tournament.tournament_name}" 刪除完成`);

    res.json({
      success: true,
      message: `錦標賽 "${tournament.tournament_name}" 刪除成功`,
      data: {
        deleted_tournament_id: tournamentId,
        tournament_name: tournament.tournament_name
      }
    });

  } catch (error) {
    console.error('刪除錦標賽錯誤:', error);
    console.error('錯誤詳情:', error.message);
    console.error('錯誤堆疊:', error.stack);
    
    res.status(500).json({
      success: false,
      message: '刪除錦標賽失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請聯繫系統管理員'
    });
  }
});

// Add tournament-specific group update endpoint
router.put('/:id/groups/:groupId', async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    
    console.log(`更新錦標賽 ${tournamentId} 的小組 ${groupId}，請求數據:`, req.body);
    
    // 驗證錦標賽是否存在
    const tournamentExists = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );
    
    if (tournamentExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }
    
    // 驗證小組是否屬於該錦標賽
    const groupExists = await query(
      'SELECT group_id FROM team_groups WHERE group_id = ? AND tournament_id = ?',
      [groupId, tournamentId]
    );
    
    if (groupExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在或不屬於該錦標賽'
      });
    }
    
    const { group_name, max_teams, description } = req.body;
    
    // 檢查小組名稱是否與其他小組重複（在同一錦標賽中）
    const duplicateGroups = await query(
      'SELECT group_id FROM team_groups WHERE group_name = ? AND tournament_id = ? AND group_id != ?',
      [group_name, tournamentId, groupId]
    );
    
    if (duplicateGroups.length > 0) {
      return res.status(409).json({
        success: false,
        message: '小組名稱在該錦標賽中已存在'
      });
    }
    
    // 檢查當前隊伍數量是否超過新的最大值
    const teamCount = await query(
      'SELECT COUNT(*) as count FROM teams WHERE group_id = ?',
      [groupId]
    );
    
    if (teamCount[0].count > max_teams) {
      return res.status(400).json({
        success: false,
        message: `無法設置最大隊伍數為${max_teams}，當前已有${teamCount[0].count}支隊伍`
      });
    }
    
    // 檢查小組比賽狀態 - 只有當所有比賽都是pending或沒有比賽時才能編輯
    const matches = await query(
      'SELECT match_id, match_status FROM matches WHERE group_id = ?',
      [groupId]
    );
    
    if (matches.length > 0) {
      const nonPendingMatches = matches.filter(match => match.match_status !== 'pending');
      if (nonPendingMatches.length > 0) {
        return res.status(400).json({
          success: false,
          message: '無法編輯小組：存在已開始或已完成的比賽。只有當所有比賽都是待開始狀態或沒有比賽時才能編輯小組。'
        });
      }
    }
    
    // 更新小組
    await query(
      'UPDATE team_groups SET group_name = ?, max_teams = ? WHERE group_id = ?',
      [group_name, max_teams, groupId]
    );
    
    res.json({
      success: true,
      message: '錦標賽小組更新成功'
    });
    
  } catch (error) {
    console.error('更新錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽小組失敗'
    });
  }
});

// Add tournament-specific group delete endpoint
router.delete('/:id/groups/:groupId', async (req, res) => {
  try {
    const { id: tournamentId, groupId } = req.params;
    
    console.log(`刪除錦標賽 ${tournamentId} 的小組 ${groupId}`);
    
    // 驗證錦標賽是否存在
    const tournamentExists = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );
    
    if (tournamentExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }
    
    // 驗證小組是否屬於該錦標賽
    const groupExists = await query(
      'SELECT group_id FROM team_groups WHERE group_id = ? AND tournament_id = ?',
      [groupId, tournamentId]
    );
    
    if (groupExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在或不屬於該錦標賽'
      });
    }
    
    // 檢查是否有隊伍在該小組
    const teams = await query(
      'SELECT team_id FROM teams WHERE group_id = ?',
      [groupId]
    );
    
    if (teams.length > 0) {
      return res.status(400).json({
        success: false,
        message: '無法刪除小組，該小組還有隊伍'
      });
    }
    
    // 檢查是否有比賽在該小組
    const matches = await query(
      'SELECT match_id FROM matches WHERE group_id = ?',
      [groupId]
    );
    
    if (matches.length > 0) {
      return res.status(400).json({
        success: false,
        message: '無法刪除小組，該小組還有比賽'
      });
    }
    
    await transaction(async (connection) => {
      // 刪除積分記錄
      await connection.execute(
        'DELETE FROM group_standings WHERE group_id = ?',
        [groupId]
      );
      
      // 刪除小組
      await connection.execute(
        'DELETE FROM team_groups WHERE group_id = ?',
        [groupId]
      );
    });
    
    res.json({
      success: true,
      message: '錦標賽小組刪除成功'
    });
    
  } catch (error) {
    console.error('刪除錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除錦標賽小組失敗'
    });
  }
});

// 獲取錦標賽的比賽列表
router.get('/:id/matches', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { status, type, group_id, team_id, date_from, date_to, page = 1, limit = 50 } = req.query;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    let sql = `
      SELECT m.*, 
             t1.team_name as team1_name, t1.team_color as team1_color,
             t2.team_name as team2_name, t2.team_color as team2_color,
             g.group_name,
             w.team_name as winner_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team2_id = t2.team_id
      LEFT JOIN team_groups g ON m.group_id = g.group_id
      LEFT JOIN teams w ON m.winner_id = w.team_id
      WHERE m.tournament_id = ?
    `;
    const params = [tournamentId];

    // 添加篩選條件
    if (status) {
      sql += ' AND m.match_status = ?';
      params.push(status);
    }

    if (type) {
      sql += ' AND m.match_type = ?';
      params.push(type);
    }

    if (group_id) {
      sql += ' AND m.group_id = ?';
      params.push(group_id);
    }

    if (team_id) {
      sql += ' AND (m.team1_id = ? OR m.team2_id = ?)';
      params.push(team_id, team_id);
    }

    if (date_from) {
      sql += ' AND m.match_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND m.match_date <= ?';
      params.push(date_to);
    }

    sql += ' ORDER BY m.match_date ASC, m.match_number ASC, m.match_id ASC';

    // 分頁
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const matches = await query(sql, params);

    // 獲取總數
    let countSql = 'SELECT COUNT(*) as total FROM matches m WHERE m.tournament_id = ?';
    const countParams = [tournamentId];

    if (status) {
      countSql += ' AND m.match_status = ?';
      countParams.push(status);
    }

    if (type) {
      countSql += ' AND m.match_type = ?';
      countParams.push(type);
    }

    if (group_id) {
      countSql += ' AND m.group_id = ?';
      countParams.push(group_id);
    }

    if (team_id) {
      countSql += ' AND (m.team1_id = ? OR m.team2_id = ?)';
      countParams.push(team_id, team_id);
    }

    if (date_from) {
      countSql += ' AND m.match_date >= ?';
      countParams.push(date_from);
    }

    if (date_to) {
      countSql += ' AND m.match_date <= ?';
      countParams.push(date_to);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        matches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取錦標賽比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽比賽失敗'
    });
  }
});

// 為錦標賽創建比賽
// 批量生成錦標賽小組比賽 (使用優化的主客場平衡算法)
router.post('/:id/matches/generate', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { 
      selected_groups = [], 
      match_date, 
      match_time = 600, 
      match_interval = 30,
      optimize_schedule = true
    } = req.body;

    // Import the optimized utility functions
    const { 
      generateGroupMatches, 
      validateGroupMatchConfig, 
      optimizeMatchSchedule,
      generateMatchStatistics,
      analyzeBackToBackMatches,
      analyzeHomeAwayBalance
    } = require('../utils/groupMatchGenerator');

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id, tournament_name FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    if (!selected_groups || selected_groups.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇至少一個小組'
      });
    }

    // 驗證配置
    const validation = validateGroupMatchConfig({
      groupId: selected_groups[0], // 使用第一個小組ID進行基本驗證
      matchDate: match_date,
      matchTime: match_time,
      matchInterval: match_interval
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: '配置驗證失敗',
        errors: validation.errors
      });
    }

    const allMatches = [];
    const groupResults = [];
    let currentTime = moment(match_date);

    // 為每個選中的小組生成比賽
    for (const groupId of selected_groups) {
      // 獲取小組信息
      const groups = await query(
        'SELECT group_id, group_name FROM team_groups WHERE group_id = ? AND tournament_id = ?',
        [groupId, tournamentId]
      );

      if (groups.length === 0) {
        console.warn(`小組 ${groupId} 不存在或不屬於錦標賽 ${tournamentId}`);
        continue;
      }

      // 獲取小組隊伍
      const teams = await query(
        'SELECT team_id, team_name FROM teams WHERE group_id = ? AND tournament_id = ? ORDER BY team_name',
        [groupId, tournamentId]
      );

      if (teams.length < 2) {
        console.warn(`小組 ${groups[0].group_name} 隊伍不足，跳過生成比賽`);
        continue;
      }

      // 檢查是否已有比賽
      const existingMatches = await query(
        'SELECT match_id FROM matches WHERE group_id = ? AND tournament_id = ?',
        [groupId, tournamentId]
      );

      if (existingMatches.length > 0) {
        console.warn(`小組 ${groups[0].group_name} 已有比賽，跳過生成`);
        continue;
      }

      // 清理小組名稱，移除錦標賽ID後綴 (例如: "A_18" → "A")
      const cleanGroupName = groups[0].group_name.includes('_') 
        ? groups[0].group_name.split('_')[0] 
        : groups[0].group_name;

      // 使用優化的比賽生成器
      let matches = generateGroupMatches(teams, {
        groupName: cleanGroupName,
        matchDate: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        matchTime: match_time,
        matchInterval: match_interval,
        matchType: 'group',
        groupId: groupId
      });

      // 如果啟用優化，則優化比賽時間表
      if (optimize_schedule) {
        matches = optimizeMatchSchedule(matches, match_interval);
      }

      // 添加錦標賽ID
      matches.forEach(match => {
        match.tournament_id = tournamentId;
        match.tournament_stage = `小組${cleanGroupName}循環賽`;
      });

      // 分析結果
      const homeAwayAnalysis = analyzeHomeAwayBalance(matches, teams);
      const backToBackAnalysis = analyzeBackToBackMatches(matches);

      groupResults.push({
        group_id: groupId,
        group_name: groups[0].group_name,
        team_count: teams.length,
        matches_generated: matches.length,
        homeAwayAnalysis,
        backToBackAnalysis
      });

      allMatches.push(...matches);

      // 更新下一個小組的開始時間
      if (matches.length > 0) {
        const lastMatchTime = moment(matches[matches.length - 1].match_date);
        currentTime = lastMatchTime.add(match_interval * 2, 'minutes'); // 小組間額外間隔
      }
    }

    if (allMatches.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有生成任何比賽，請檢查小組設置'
      });
    }

    // 批量插入比賽到數據庫
    await transaction(async (connection) => {
      for (const match of allMatches) {
        await connection.execute(`
          INSERT INTO matches (
            match_number, team1_id, team2_id, match_date, match_time,
            match_type, group_id, tournament_id, tournament_stage, match_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          match.match_number,
          match.team1_id,
          match.team2_id,
          match.match_date,
          match.match_time,
          match.match_type,
          match.group_id,
          match.tournament_id,
          match.tournament_stage,
          match.match_status
        ]);
      }
    });

    res.status(201).json({
      success: true,
      message: `錦標賽 ${tournament[0].tournament_name} 比賽生成成功`,
      data: {
        tournament_name: tournament[0].tournament_name,
        total_matches: allMatches.length,
        groups_processed: groupResults.length,
        group_results: groupResults,
        optimization_enabled: optimize_schedule
      }
    });

  } catch (error) {
    console.error('生成錦標賽比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '生成錦標賽比賽失敗'
    });
  }
});

// 創建單個錦標賽比賽
router.post('/:id/matches', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { 
      match_number, 
      team1_id, 
      team2_id, 
      match_date, 
      match_time = 600, 
      match_type = 'group', 
      tournament_stage, 
      group_id 
    } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查比賽場次是否已存在
    const existingMatch = await query(
      'SELECT match_id FROM matches WHERE match_number = ? AND tournament_id = ?',
      [match_number, tournamentId]
    );

    if (existingMatch.length > 0) {
      return res.status(409).json({
        success: false,
        message: '比賽場次已存在'
      });
    }

    // 檢查隊伍是否存在且屬於該錦標賽
    if (team1_id && team2_id) {
      const teams = await query(
        'SELECT team_id FROM teams WHERE team_id IN (?, ?) AND tournament_id = ?',
        [team1_id, team2_id, tournamentId]
      );

      if (teams.length !== 2) {
        return res.status(404).json({
          success: false,
          message: '部分隊伍不存在或不屬於該錦標賽'
        });
      }

      if (team1_id === team2_id) {
        return res.status(400).json({
          success: false,
          message: '隊伍1和隊伍2不能是同一支隊伍'
        });
      }
    }

    // 如果指定了小組，檢查小組是否屬於該錦標賽
    if (group_id) {
      const group = await query(
        'SELECT group_id FROM team_groups WHERE group_id = ? AND tournament_id = ?',
        [group_id, tournamentId]
      );

      if (group.length === 0) {
        return res.status(404).json({
          success: false,
          message: '指定的小組不存在或不屬於該錦標賽'
        });
      }
    }

    const result = await query(
      `INSERT INTO matches (
        tournament_id, match_number, team1_id, team2_id, match_date, 
        match_time, match_type, tournament_stage, group_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tournamentId, match_number, team1_id, team2_id, match_date,
        match_time, match_type, tournament_stage || null, group_id || null
      ]
    );

    res.status(201).json({
      success: true,
      message: '比賽創建成功',
      data: { match_id: result.insertId }
    });

  } catch (error) {
    console.error('創建錦標賽比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建錦標賽比賽失敗'
    });
  }
});

// 獲取錦標賽的單場比賽詳情
router.get('/:id/matches/:matchId', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const matchId = req.params.matchId;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    const matches = await query(`
      SELECT m.*, 
             t1.team_name as team1_name, t1.team_color as team1_color,
             t2.team_name as team2_name, t2.team_color as team2_color,
             g.group_name,
             w.team_name as winner_name
      FROM matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.team_id
      LEFT JOIN teams t2 ON m.team2_id = t2.team_id
      LEFT JOIN team_groups g ON m.group_id = g.group_id
      LEFT JOIN teams w ON m.winner_id = w.team_id
      WHERE m.match_id = ? AND m.tournament_id = ?
    `, [matchId, tournamentId]);

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在或不屬於該錦標賽'
      });
    }

    // 獲取比賽事件
    const events = await query(`
      SELECT me.*, t.team_name, a.name as athlete_name
      FROM match_events me
      JOIN teams t ON me.team_id = t.team_id
      LEFT JOIN athletes a ON me.athlete_id = a.athlete_id
      WHERE me.match_id = ?
      ORDER BY me.event_time
    `, [matchId]);

    res.json({
      success: true,
      data: {
        match: matches[0],
        events
      }
    });

  } catch (error) {
    console.error('獲取錦標賽比賽詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽比賽詳情失敗'
    });
  }
});

// 更新錦標賽比賽
router.put('/:id/matches/:matchId', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const matchId = req.params.matchId;
    const {
      match_number,
      team1_id,
      team2_id,
      match_date,
      match_time,
      match_type,
      tournament_stage,
      group_id
    } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查比賽是否存在且屬於該錦標賽
    const existingMatch = await query(
      'SELECT match_id, match_status FROM matches WHERE match_id = ? AND tournament_id = ?',
      [matchId, tournamentId]
    );

    if (existingMatch.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在或不屬於該錦標賽'
      });
    }

    // 檢查比賽狀態 - 只能編輯待開始或延期的比賽
    if (!['pending', 'postponed'].includes(existingMatch[0].match_status)) {
      return res.status(400).json({
        success: false,
        message: '只能編輯待開始或延期的比賽'
      });
    }

    // 檢查比賽編號是否與其他比賽衝突
    if (match_number) {
      const duplicateMatch = await query(
        'SELECT match_id FROM matches WHERE match_number = ? AND tournament_id = ? AND match_id != ?',
        [match_number, tournamentId, matchId]
      );

      if (duplicateMatch.length > 0) {
        return res.status(409).json({
          success: false,
          message: '比賽編號已存在'
        });
      }
    }

    // 檢查隊伍是否存在且屬於該錦標賽
    if (team1_id && team2_id) {
      const teams = await query(
        'SELECT team_id FROM teams WHERE team_id IN (?, ?) AND tournament_id = ?',
        [team1_id, team2_id, tournamentId]
      );

      if (teams.length !== 2) {
        return res.status(404).json({
          success: false,
          message: '部分隊伍不存在或不屬於該錦標賽'
        });
      }

      if (team1_id === team2_id) {
        return res.status(400).json({
          success: false,
          message: '隊伍1和隊伍2不能是同一支隊伍'
        });
      }
    }

    // 如果指定了小組，檢查小組是否屬於該錦標賽
    if (group_id) {
      const group = await query(
        'SELECT group_id FROM team_groups WHERE group_id = ? AND tournament_id = ?',
        [group_id, tournamentId]
      );

      if (group.length === 0) {
        return res.status(404).json({
          success: false,
          message: '指定的小組不存在或不屬於該錦標賽'
        });
      }
    }

    // 構建更新語句
    const updateFields = [];
    const updateParams = [];

    if (match_number !== undefined) {
      updateFields.push('match_number = ?');
      updateParams.push(match_number);
    }
    if (team1_id !== undefined) {
      updateFields.push('team1_id = ?');
      updateParams.push(team1_id);
    }
    if (team2_id !== undefined) {
      updateFields.push('team2_id = ?');
      updateParams.push(team2_id);
    }
    if (match_date !== undefined) {
      updateFields.push('match_date = ?');
      updateParams.push(match_date);
    }
    if (match_time !== undefined) {
      updateFields.push('match_time = ?');
      updateParams.push(match_time);
    }
    if (match_type !== undefined) {
      updateFields.push('match_type = ?');
      updateParams.push(match_type);
    }
    if (tournament_stage !== undefined) {
      updateFields.push('tournament_stage = ?');
      updateParams.push(tournament_stage);
    }
    if (group_id !== undefined) {
      updateFields.push('group_id = ?');
      updateParams.push(group_id);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有提供要更新的字段'
      });
    }

    updateParams.push(matchId, tournamentId);

    await query(
      `UPDATE matches SET ${updateFields.join(', ')} WHERE match_id = ? AND tournament_id = ?`,
      updateParams
    );

    res.json({
      success: true,
      message: '比賽更新成功'
    });

  } catch (error) {
    console.error('更新錦標賽比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽比賽失敗'
    });
  }
});

// 更新錦標賽比賽結果
router.put('/:id/matches/:matchId/result', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const matchId = req.params.matchId;
    const {
      team1_score,
      team2_score,
      team1_fouls,
      team2_fouls,
      winner_id,
      win_reason,
      referee_decision
    } = req.body;

    // 檢查錦標賽是否存在
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    // 檢查比賽是否存在且屬於該錦標賽
    const existingMatch = await query(
      'SELECT match_id, match_status, team1_id, team2_id, group_id FROM matches WHERE match_id = ? AND tournament_id = ?',
      [matchId, tournamentId]
    );

    if (existingMatch.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在或不屬於該錦標賽'
      });
    }

    const match = existingMatch[0];

    // 檢查比賽狀態 - 只能編輯已完成的比賽結果
    if (match.match_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '只能編輯已完成的比賽結果'
      });
    }

    // 驗證獲勝者ID（如果提供）
    if (winner_id && winner_id !== match.team1_id && winner_id !== match.team2_id) {
      return res.status(400).json({
        success: false,
        message: '獲勝者必須是參賽隊伍之一'
      });
    }

    await transaction(async (connection) => {
      // 更新比賽結果
      await connection.execute(`
        UPDATE matches SET 
          team1_score = ?, team2_score = ?, team1_fouls = ?, team2_fouls = ?,
          winner_id = ?, win_reason = ?, referee_decision = ?
        WHERE match_id = ? AND tournament_id = ?
      `, [
        team1_score || 0, team2_score || 0, team1_fouls || 0, team2_fouls || 0,
        winner_id, win_reason, referee_decision || false, matchId, tournamentId
      ]);

      // 如果是小組賽，更新積分榜
      if (match.group_id) {
        // 重新計算積分榜
        console.log(`🔄 Recalculating standings for group ${match.group_id}`);
        
        const groupMatches = await connection.execute(`
          SELECT 
            m.match_id, m.match_number, m.team1_id, m.team2_id,
            m.team1_score, m.team2_score, m.winner_id
          FROM matches m
          WHERE m.group_id = ? AND m.tournament_id = ? AND m.match_status = 'completed'
        `, [match.group_id, tournamentId]);

        // 獲取小組中的所有隊伍
        const groupTeams = await connection.execute(`
          SELECT team_id, team_name FROM teams WHERE group_id = ? AND tournament_id = ?
        `, [match.group_id, tournamentId]);

        console.log(`Found ${groupMatches[0].length} completed matches and ${groupTeams[0].length} teams`);

        // 重置積分榜
        await connection.execute(`
          UPDATE group_standings SET 
            played = 0, won = 0, drawn = 0, lost = 0,
            goals_for = 0, goals_against = 0, points = 0
          WHERE group_id = ? AND tournament_id = ?
        `, [match.group_id, tournamentId]);

        // 初始化每支隊伍的統計
        const teamStats = {};
        groupTeams[0].forEach(team => {
          teamStats[team.team_id] = {
            played: 0, won: 0, drawn: 0, lost: 0,
            goals_for: 0, goals_against: 0, points: 0
          };
        });

        // 重新計算每場比賽的積分
        for (const groupMatch of groupMatches[0]) {
          const team1Stats = teamStats[groupMatch.team1_id];
          const team2Stats = teamStats[groupMatch.team2_id];
          
          if (team1Stats && team2Stats) {
            team1Stats.played++;
            team2Stats.played++;
            
            const team1Score = groupMatch.team1_score || 0;
            const team2Score = groupMatch.team2_score || 0;
            
            team1Stats.goals_for += team1Score;
            team1Stats.goals_against += team2Score;
            team2Stats.goals_for += team2Score;
            team2Stats.goals_against += team1Score;
            
            console.log(`Match ${groupMatch.match_number}: Team ${groupMatch.team1_id} ${team1Score}-${team2Score} Team ${groupMatch.team2_id} (Winner ID: ${groupMatch.winner_id})`);
            
            // Use the actual winner_id from the match instead of calculating from scores
            // This ensures manual referee decisions are respected
            if (groupMatch.winner_id === groupMatch.team1_id) {
              team1Stats.won++;
              team1Stats.points += 3;
              team2Stats.lost++;
              console.log(`  → Team ${groupMatch.team1_id} wins (by winner_id)`);
            } else if (groupMatch.winner_id === groupMatch.team2_id) {
              team2Stats.won++;
              team2Stats.points += 3;
              team1Stats.lost++;
              console.log(`  → Team ${groupMatch.team2_id} wins (by winner_id)`);
            } else if (groupMatch.winner_id === null) {
              team1Stats.drawn++;
              team1Stats.points += 1;
              team2Stats.drawn++;
              team2Stats.points += 1;
              console.log(`  → Draw (winner_id is null)`);
            } else {
              // Fallback to score-based calculation if winner_id is inconsistent
              console.log(`  → Warning: winner_id ${groupMatch.winner_id} doesn't match team IDs, using score`);
              if (team1Score > team2Score) {
                team1Stats.won++;
                team1Stats.points += 3;
                team2Stats.lost++;
                console.log(`  → Team ${groupMatch.team1_id} wins by score`);
              } else if (team1Score === team2Score) {
                team1Stats.drawn++;
                team1Stats.points += 1;
                team2Stats.drawn++;
                team2Stats.points += 1;
                console.log(`  → Draw by score`);
              } else {
                team2Stats.won++;
                team2Stats.points += 3;
                team1Stats.lost++;
                console.log(`  → Team ${groupMatch.team2_id} wins by score`);
              }
            }
          }
        }

        // 更新數據庫
        for (const [teamId, stats] of Object.entries(teamStats)) {
          await connection.execute(`
            UPDATE group_standings SET 
              played = ?, won = ?, drawn = ?, lost = ?,
              goals_for = ?, goals_against = ?, points = ?
            WHERE team_id = ? AND group_id = ? AND tournament_id = ?
          `, [
            stats.played, stats.won, stats.drawn, stats.lost,
            stats.goals_for, stats.goals_against, stats.points,
            teamId, match.group_id, tournamentId
          ]);
          
          console.log(`Updated team ${teamId}: ${stats.played}P ${stats.won}W ${stats.drawn}D ${stats.lost}L ${stats.points}pts`);
        }
      }
    });

    res.json({
      success: true,
      message: '比賽結果更新成功'
    });

  } catch (error) {
    console.error('更新錦標賽比賽結果錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽比賽結果失敗'
    });
  }
});

// 獲取錦標賽的總排名榜
router.get('/:id/stats/overall-leaderboard', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    console.log(`🏆 Getting overall leaderboard for tournament ${tournamentId}...`);
    
    // Check if tournament exists
    const tournament = await query('SELECT tournament_id FROM tournaments WHERE tournament_id = ?', [tournamentId]);
    if (tournament.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }
    
    // Get all teams with their match statistics for this tournament
    const allTeamsStats = await query(`
      SELECT 
        t.team_id,
        t.team_name,
        t.team_color,
        g.group_name,
        g.group_id,
        COALESCE(gs.played, 0) as played,
        COALESCE(gs.won, 0) as won,
        COALESCE(gs.drawn, 0) as drawn,
        COALESCE(gs.lost, 0) as lost,
        COALESCE(gs.goals_for, 0) as goals_for,
        COALESCE(gs.goals_against, 0) as goals_against,
        COALESCE(gs.points, 0) as points
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id AND g.tournament_id = ?
      LEFT JOIN group_standings gs ON t.team_id = gs.team_id AND gs.tournament_id = ?
      WHERE t.tournament_id = ?
    `, [tournamentId, tournamentId, tournamentId]);
    
    // Clean team names by removing tournament suffix
    const cleanTeamName = (teamName) => {
      if (!teamName) return '';
      const suffix = `_${tournamentId}`;
      if (teamName.endsWith(suffix)) {
        return teamName.slice(0, -suffix.length);
      }
      return teamName;
    };
    
    // First, group teams by their groups and sort within each group
    const teamsByGroup = {};
    allTeamsStats.forEach(team => {
      const groupKey = team.group_id || 'no_group';
      if (!teamsByGroup[groupKey]) {
        teamsByGroup[groupKey] = [];
      }
      
      const cleanedTeamName = cleanTeamName(team.team_name);
      const goalDifference = team.goals_for - team.goals_against;
      
      // Debug logging for specific team
      if (cleanedTeamName.toLowerCase().includes('ba') || team.team_name.toLowerCase().includes('ba')) {
        console.log(`🔍 Debug team "${cleanedTeamName}":`, {
          original_name: team.team_name,
          goals_for: team.goals_for,
          goals_against: team.goals_against,
          calculated_goal_difference: goalDifference,
          group_name: team.group_name
        });
      }
      
      teamsByGroup[groupKey].push({
        ...team,
        team_name: cleanedTeamName,
        goal_difference: goalDifference,
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
    
    console.log(`🏆 Tournament ${tournamentId} leaderboard sorted by group positions:`);
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
    
    console.log(`🏆 Tournament ${tournamentId} overall leaderboard calculated for ${totalTeams} teams`);
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
    console.error('獲取錦標賽總排名榜錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽總排名榜失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 刪除錦標賽所有淘汰賽比賽
router.delete('/:id/knockout', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    
    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
      [tournamentId]
    );
    
    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }
    
    // 獲取所有淘汰賽比賽ID
    const knockoutMatches = await query(`
      SELECT m.match_id 
      FROM matches m
      JOIN knockout_brackets kb ON m.match_id = kb.match_id
      WHERE kb.tournament_id = ?
    `, [tournamentId]);
    
    if (knockoutMatches.length === 0) {
      return res.json({
        success: true,
        message: '沒有淘汰賽比賽需要刪除',
        data: { deleted_matches: 0 }
      });
    }
    
    await transaction(async (connection) => {
      // 刪除比賽事件
      await connection.execute(`
        DELETE FROM match_events 
        WHERE match_id IN (
          SELECT m.match_id 
          FROM matches m
          JOIN knockout_brackets kb ON m.match_id = kb.match_id
          WHERE kb.tournament_id = ?
        )
      `, [tournamentId]);
      
      // 刪除淘汰賽結構記錄
      await connection.execute(
        'DELETE FROM knockout_brackets WHERE tournament_id = ?',
        [tournamentId]
      );
      
      // 刪除淘汰賽比賽
      await connection.execute(`
        DELETE FROM matches 
        WHERE match_id IN (${knockoutMatches.map(() => '?').join(',')})
      `, knockoutMatches.map(m => m.match_id));
    });
    
    res.json({
      success: true,
      message: `成功刪除 ${knockoutMatches.length} 場淘汰賽比賽`,
      data: { 
        deleted_matches: knockoutMatches.length 
      }
    });
    
  } catch (error) {
    console.error('刪除淘汰賽比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除淘汰賽比賽失敗'
    });
  }
});

// 更新錦標賽狀態
router.put('/:id/status', async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { status } = req.body;

    // 驗證狀態值
    const validStatuses = ['pending', 'active', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的狀態值。允許的狀態: pending, active, completed'
      });
    }

    // 如果要設置為 active，先將其他錦標賽設為 pending
    if (status === 'active') {
      await query('UPDATE tournaments SET status = ? WHERE status = ?', ['pending', 'active']);
      console.log('🔄 已將其他活躍錦標賽設為待開始狀態');
    }

    // 更新指定錦標賽的狀態
    const result = await query(
      'UPDATE tournaments SET status = ?, updated_at = NOW() WHERE tournament_id = ?',
      [status, tournamentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '錦標賽不存在'
      });
    }

    console.log(`✅ 錦標賽 ${tournamentId} 狀態已更新為: ${status}`);

    res.json({
      success: true,
      message: `錦標賽狀態已更新為 ${status}`,
      data: {
        tournament_id: tournamentId,
        status: status
      }
    });

  } catch (error) {
    console.error('❌ 更新錦標賽狀態失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新錦標賽狀態失敗',
      error: error.message
    });
  }
});

module.exports = router;
// 自動推進所有可推進的淘汰賽比賽
router.post('/:id/knockout/auto-advance', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    
    const result = await transaction(async (connection) => {
      let totalAdvanced = 0;
      let roundsProcessed = 0;
      
      // 獲取所有輪次，從第一輪開始處理
      const [rounds] = await connection.execute(`
        SELECT DISTINCT round_number 
        FROM knockout_brackets 
        WHERE tournament_id = ? 
        ORDER BY round_number
      `, [tournamentId]);
      
      for (const roundData of rounds) {
        const round = roundData.round_number;
        
        // 獲取當前輪次所有已完成的比賽
        const [completedMatches] = await connection.execute(`
          SELECT 
            m.match_id, m.winner_id, m.match_number, m.team1_id, m.team2_id,
            kb.position_in_round, kb.round_number,
            wt.team_name as winner_name
          FROM matches m
          JOIN knockout_brackets kb ON m.match_id = kb.match_id
          LEFT JOIN teams wt ON m.winner_id = wt.team_id
          WHERE kb.tournament_id = ? 
            AND kb.round_number = ? 
            AND m.match_status = 'completed'
            AND m.winner_id IS NOT NULL
        `, [tournamentId, round]);
        
        if (completedMatches.length === 0) {
          continue; // 這一輪沒有完成的比賽，跳過
        }
        
        // 檢查下一輪是否存在
        const [nextRoundMatches] = await connection.execute(`
          SELECT 
            m.match_id, m.team1_id, m.team2_id, m.match_number,
            kb.position_in_round
          FROM matches m
          JOIN knockout_brackets kb ON m.match_id = kb.match_id
          WHERE kb.tournament_id = ? 
            AND kb.round_number = ?
          ORDER BY kb.position_in_round
        `, [tournamentId, round + 1]);
        
        if (nextRoundMatches.length === 0) {
          continue; // 沒有下一輪，可能是決賽
        }
        
        // 正常的淘汰賽推進邏輯：勝者進入下一輪
        for (const match of completedMatches) {
          // 計算下一輪的位置 (兩場比賽的勝者進入一場比賽)
          const nextPosition = Math.ceil(match.position_in_round / 2);
          const nextMatch = nextRoundMatches.find(nm => nm.position_in_round === nextPosition);
          
          if (!nextMatch) {
            continue;
          }
          
          // 確定是team1還是team2的位置
          const isFirstMatch = (match.position_in_round % 2 === 1);
          const teamField = isFirstMatch ? 'team1_id' : 'team2_id';
          
          // 檢查該位置是否已經被填入
          const currentTeamId = isFirstMatch ? nextMatch.team1_id : nextMatch.team2_id;
          if (currentTeamId !== null) {
            continue; // 已經有隊伍了，跳過
          }
          
          // 更新下一輪比賽的隊伍
          await connection.execute(`
            UPDATE matches 
            SET ${teamField} = ?
            WHERE match_id = ?
          `, [match.winner_id, nextMatch.match_id]);
          
          totalAdvanced++;
        }
        
        roundsProcessed++;
      }
      
      return {
        rounds_processed: roundsProcessed,
        teams_advanced: totalAdvanced
      };
    });
    
    res.json({
      success: true,
      message: `自動推進完成`,
      data: result
    });
    
  } catch (error) {
    console.error('Auto advance error:', error);
    res.status(500).json({
      success: false,
      message: '自動推進失敗',
      error: error.message
    });
  }
});
