const express = require('express');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 創建比賽驗證模式
const matchSchema = Joi.object({
  match_number: Joi.string().min(1).max(50).required().messages({
    'string.empty': '比賽場次不能為空',
    'any.required': '比賽場次是必填項'
  }),
  team1_id: Joi.number().integer().required().messages({
    'any.required': '隊伍1是必填項'
  }),
  team2_id: Joi.number().integer().required().messages({
    'any.required': '隊伍2是必填項'
  }),
  match_date: Joi.date().required().messages({
    'any.required': '比賽日期是必填項'
  }),
  match_time: Joi.number().integer().min(1).max(3600).default(600).messages({
    'number.min': '比賽時間至少1秒',
    'number.max': '比賽時間最多60分鐘(3600秒)',
    'number.integer': '比賽時間必須是整數秒'
  }),
  match_type: Joi.string().valid('friendly', 'group', 'knockout').default('friendly'),
  tournament_stage: Joi.string().allow(null, ''),
  group_id: Joi.number().integer().allow(null)
});

// 比賽分數更新驗證模式
const scoreUpdateSchema = Joi.object({
  team1_score: Joi.number().integer().min(0).required(),
  team2_score: Joi.number().integer().min(0).required(),
  team1_fouls: Joi.number().integer().min(0).default(0),
  team2_fouls: Joi.number().integer().min(0).default(0)
});

// 已完成比賽結果編輯驗證模式
const completedMatchEditSchema = Joi.object({
  team1_score: Joi.number().integer().min(0).required(),
  team2_score: Joi.number().integer().min(0).required(),
  team1_fouls: Joi.number().integer().min(0).required(),
  team2_fouls: Joi.number().integer().min(0).required(),
  winner_id: Joi.number().integer().allow(null),
  win_reason: Joi.string().valid('score', 'fouls', 'draw', 'referee').required(),
  referee_decision: Joi.boolean().default(false)
});

// 獲取所有比賽
router.get('/', async (req, res) => {
  try {
    console.log('⚽ 開始獲取比賽列表...');
    const { 
      status, 
      type, 
      group_id, 
      team_id, 
      date_from, 
      date_to, 
      page = 1, 
      limit = 10 
    } = req.query;
    
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
      WHERE 1=1
    `;
    const params = [];

    // 按狀態篩選
    if (status) {
      sql += ' AND m.match_status = ?';
      params.push(status);
    }

    // 按類型篩選
    if (type) {
      sql += ' AND m.match_type = ?';
      params.push(type);
    }

    // 按小組篩選
    if (group_id) {
      sql += ' AND m.group_id = ?';
      params.push(group_id);
    }

    // 按隊伍篩選
    if (team_id) {
      sql += ' AND (m.team1_id = ? OR m.team2_id = ?)';
      params.push(team_id, team_id);
    }

    // 按日期範圍篩選
    if (date_from) {
      sql += ' AND m.match_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sql += ' AND m.match_date <= ?';
      params.push(date_to);
    }

    sql += ' ORDER BY m.match_date DESC, m.match_id DESC';

    // 分頁
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const matches = await query(sql, params);
    console.log('⚽ 獲取到的原始比賽數據:', matches);
    console.log('⚽ 比賽數量:', matches.length);

    // 獲取總數
    let countSql = 'SELECT COUNT(*) as total FROM matches m WHERE 1=1';
    const countParams = [];
    
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

    const [{ total }] = await query(countSql, countParams);

    res.json({
      success: true,
      data: {
        matches,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取比賽列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取比賽列表失敗'
    });
  }
});

// 獲取單個比賽詳情
router.get('/:id', async (req, res) => {
  try {
    const matchId = req.params.id;

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
      WHERE m.match_id = ?
    `, [matchId]);

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    // 獲取比賽事件
    const events = await query(`
      SELECT me.*, t.team_name, a.name as athlete_name
      FROM match_events me
      JOIN teams t ON me.team_id = t.team_id
      LEFT JOIN athletes a ON me.athlete_id = a.athlete_id
      WHERE me.match_id = ?
      ORDER BY me.event_time, me.created_at
    `, [matchId]);

    res.json({
      success: true,
      data: {
        match: matches[0],
        events
      }
    });

  } catch (error) {
    console.error('獲取比賽詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取比賽詳情失敗'
    });
  }
});

// 更新比賽
router.put('/:id', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = matchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { 
      match_number, 
      team1_id, 
      team2_id, 
      match_date, 
      match_time, 
      match_type, 
      tournament_stage, 
      group_id 
    } = value;

    // 格式化日期為MySQL datetime格式
    const formattedDate = moment(match_date).format('YYYY-MM-DD HH:mm:ss');
    
    // 確保group_id為null而不是undefined
    const finalGroupId = group_id || null;

    // 檢查比賽是否存在
    const existingMatch = await query(
      'SELECT match_id, match_status FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (existingMatch.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    // 只允許編輯未開始的比賽
    if (existingMatch[0].match_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能編輯未開始的比賽'
      });
    }

    // 檢查隊伍不能相同
    if (team1_id === team2_id) {
      return res.status(400).json({
        success: false,
        message: '隊伍1和隊伍2不能相同'
      });
    }

    // 檢查比賽場次是否已存在（排除當前比賽）
    const duplicateMatches = await query(
      'SELECT match_id FROM matches WHERE match_number = ? AND match_id != ?',
      [match_number, matchId]
    );

    if (duplicateMatches.length > 0) {
      return res.status(409).json({
        success: false,
        message: '比賽場次已存在'
      });
    }

    // 檢查隊伍是否存在
    const teams = await query(
      'SELECT team_id FROM teams WHERE team_id IN (?, ?)',
      [team1_id, team2_id]
    );

    if (teams.length !== 2) {
      return res.status(404).json({
        success: false,
        message: '指定的隊伍不存在'
      });
    }

    // 獲取原始比賽的 group_id 以保持小組信息
    const originalMatch = await query(
      'SELECT group_id FROM matches WHERE match_id = ?',
      [matchId]
    );
    
    // 保持原始的 group_id，除非明確指定了新的 group_id
    const preservedGroupId = finalGroupId !== null ? finalGroupId : (originalMatch[0]?.group_id || null);
    
    console.log(`🔄 Preserving group_id: original=${originalMatch[0]?.group_id}, new=${finalGroupId}, preserved=${preservedGroupId}`);

    // 更新比賽
    await query(`
      UPDATE matches SET 
        match_number = ?, team1_id = ?, team2_id = ?, match_date = ?, match_time = ?,
        match_type = ?, tournament_stage = ?, group_id = ?, updated_at = NOW()
      WHERE match_id = ?
    `, [
      match_number, team1_id, team2_id, formattedDate, match_time,
      match_type, tournament_stage, preservedGroupId, matchId
    ]);

    res.json({
      success: true,
      message: '比賽更新成功'
    });

  } catch (error) {
    console.error('更新比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新比賽失敗'
    });
  }
});

// 創建新比賽
router.post('/', async (req, res) => {
  try {
    // 驗證輸入數據
    const { error, value } = matchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { 
      match_number, 
      team1_id, 
      team2_id, 
      match_date, 
      match_time, 
      match_type, 
      tournament_stage, 
      group_id 
    } = value;

    // 格式化日期為MySQL datetime格式
    const formattedDate = moment(match_date).format('YYYY-MM-DD HH:mm:ss');
    
    // 確保group_id為null而不是undefined
    const finalGroupId = group_id || null;

    // 檢查隊伍不能相同
    if (team1_id === team2_id) {
      return res.status(400).json({
        success: false,
        message: '隊伍1和隊伍2不能相同'
      });
    }

    // 檢查比賽場次是否已存在
    const existingMatches = await query(
      'SELECT match_id FROM matches WHERE match_number = ?',
      [match_number]
    );

    if (existingMatches.length > 0) {
      return res.status(409).json({
        success: false,
        message: '比賽場次已存在'
      });
    }

    // 檢查隊伍是否存在
    const teams = await query(
      'SELECT team_id FROM teams WHERE team_id IN (?, ?)',
      [team1_id, team2_id]
    );

    if (teams.length !== 2) {
      return res.status(404).json({
        success: false,
        message: '指定的隊伍不存在'
      });
    }

    // 創建比賽
    const result = await query(`
      INSERT INTO matches (
        match_number, team1_id, team2_id, match_date, match_time,
        match_type, tournament_stage, group_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      match_number, team1_id, team2_id, formattedDate, match_time,
      match_type, tournament_stage, finalGroupId
    ]);

    res.status(201).json({
      success: true,
      message: '比賽創建成功',
      data: {
        match_id: result.insertId
      }
    });

  } catch (error) {
    console.error('創建比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建比賽失敗'
    });
  }
});

// 開始比賽
router.post('/:id/start', async (req, res) => {
  try {
    const matchId = req.params.id;

    // 檢查比賽是否存在且狀態為pending
    const matches = await query(
      'SELECT match_id, match_status FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    if (matches[0].match_status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '比賽已經開始或已結束'
      });
    }

    // 更新比賽狀態
    await query(
      'UPDATE matches SET match_status = ?, start_time = NOW() WHERE match_id = ?',
      ['active', matchId]
    );

    res.json({
      success: true,
      message: '比賽已開始'
    });

  } catch (error) {
    console.error('開始比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '開始比賽失敗'
    });
  }
});

// 更新比賽分數
router.put('/:id/score', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = scoreUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { team1_score, team2_score, team1_fouls, team2_fouls } = value;

    console.log(`🔄 Updating match ${matchId} with:`, {
      team1_score, team2_score, team1_fouls, team2_fouls
    });

    // 檢查比賽是否存在且正在進行
    const matches = await query(
      'SELECT match_id, match_status, team1_score, team2_score, team1_fouls, team2_fouls FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    const currentMatch = matches[0];
    console.log(`📊 Current match data:`, {
      team1_score: currentMatch.team1_score,
      team2_score: currentMatch.team2_score,
      team1_fouls: currentMatch.team1_fouls,
      team2_fouls: currentMatch.team2_fouls
    });

    if (!['active', 'overtime'].includes(currentMatch.match_status)) {
      return res.status(400).json({
        success: false,
        message: '只能更新進行中的比賽分數'
      });
    }

    // 更新分數
    const updateResult = await query(`
      UPDATE matches 
      SET team1_score = ?, team2_score = ?, team1_fouls = ?, team2_fouls = ?
      WHERE match_id = ?
    `, [team1_score, team2_score, team1_fouls, team2_fouls, matchId]);

    console.log(`✅ Update result:`, updateResult);

    // 驗證更新結果
    const verifyMatch = await query(
      'SELECT team1_score, team2_score, team1_fouls, team2_fouls FROM matches WHERE match_id = ?',
      [matchId]
    );
    
    console.log(`🔍 Verified updated data:`, verifyMatch[0]);

    res.json({
      success: true,
      message: '分數更新成功'
    });

  } catch (error) {
    console.error('更新分數錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新分數失敗'
    });
  }
});

// 編輯已完成比賽結果
router.put('/:id/result', async (req, res) => {
  try {
    const matchId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = completedMatchEditSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { team1_score, team2_score, team1_fouls, team2_fouls, winner_id, win_reason, referee_decision } = value;

    console.log(`🔄 Editing completed match ${matchId} result:`, {
      team1_score, team2_score, team1_fouls, team2_fouls, winner_id, win_reason, referee_decision
    });

    // 檢查比賽是否存在且已完成
    const matches = await query(`
      SELECT match_id, match_status, team1_id, team2_id, group_id, 
             team1_score as old_team1_score, team2_score as old_team2_score,
             team1_fouls as old_team1_fouls, team2_fouls as old_team2_fouls,
             winner_id as old_winner_id
      FROM matches WHERE match_id = ?
    `, [matchId]);

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    const match = matches[0];
    if (match.match_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '只能編輯已完成的比賽結果'
      });
    }

    // 驗證獲勝者ID是否為參賽隊伍之一（或null表示平局）
    if (winner_id && winner_id !== match.team1_id && winner_id !== match.team2_id) {
      return res.status(400).json({
        success: false,
        message: '獲勝者必須是參賽隊伍之一'
      });
    }

    await transaction(async (connection) => {
      // 更新比賽結果
      await connection.execute(`
        UPDATE matches 
        SET team1_score = ?, team2_score = ?, team1_fouls = ?, team2_fouls = ?,
            winner_id = ?, win_reason = ?, referee_decision = ?, updated_at = NOW()
        WHERE match_id = ?
      `, [team1_score, team2_score, team1_fouls, team2_fouls, winner_id, win_reason, referee_decision ? 1 : 0, matchId]);

      // 如果是小組賽，需要重新計算積分表
      if (match.group_id) {
        console.log('🔄 Recalculating group standings for group:', match.group_id);
        
        // 先撤銷舊的積分
        await reverseGroupStandings(connection, match.group_id, match.team1_id, match.team2_id, 
          match.old_team1_score, match.old_team2_score, match.old_winner_id);
        
        // 再應用新的積分
        await updateGroupStandings(connection, match.group_id, match.team1_id, match.team2_id, 
          team1_score, team2_score, winner_id);
      }
    });

    console.log('✅ Match result updated successfully');

    res.json({
      success: true,
      message: '比賽結果更新成功'
    });

  } catch (error) {
    console.error('編輯比賽結果錯誤:', error);
    res.status(500).json({
      success: false,
      message: '編輯比賽結果失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請聯繫系統管理員'
    });
  }
});

// 結束比賽
router.post('/:id/end', async (req, res) => {
  try {
    const matchId = req.params.id;
    const { winner_id, win_reason, referee_decision = false } = req.body;

    // 檢查比賽是否存在且正在進行
    const matches = await query(`
      SELECT match_id, match_status, team1_id, team2_id, team1_score, team2_score, team1_fouls, team2_fouls, group_id
      FROM matches WHERE match_id = ?
    `, [matchId]);

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    const match = matches[0];
    if (!['active', 'overtime'].includes(match.match_status)) {
      return res.status(400).json({
        success: false,
        message: '只能結束進行中的比賽'
      });
    }

    await transaction(async (connection) => {
      // 確定獲勝者 - 使用新的勝負條件
      let finalWinnerId = winner_id;
      let finalWinReason = win_reason;
      
      if (!finalWinnerId && !referee_decision) {
        // 自動確定獲勝者 - 無人機足球規則
        console.log(`🏆 Auto-determining winner: Team1(${match.team1_score}⚽,${match.team1_fouls}🚫) vs Team2(${match.team2_score}⚽,${match.team2_fouls}🚫)`);
        
        // 規則1: 分數高者獲勝
        if (match.team1_score > match.team2_score) {
          finalWinnerId = match.team1_id;
          finalWinReason = 'score';
          console.log(`✅ Team 1 wins by score: ${match.team1_score} > ${match.team2_score}`);
        } else if (match.team2_score > match.team1_score) {
          finalWinnerId = match.team2_id;
          finalWinReason = 'score';
          console.log(`✅ Team 2 wins by score: ${match.team2_score} > ${match.team1_score}`);
        } else {
          // 規則2: 分數相同時，犯規少者獲勝
          console.log(`⚖️ Scores tied (${match.team1_score}:${match.team2_score}), checking fouls...`);
          
          if (match.team1_fouls < match.team2_fouls) {
            finalWinnerId = match.team1_id;
            finalWinReason = 'fouls';
            console.log(`✅ Team 1 wins by fouls: ${match.team1_fouls} < ${match.team2_fouls}`);
          } else if (match.team2_fouls < match.team1_fouls) {
            finalWinnerId = match.team2_id;
            finalWinReason = 'fouls';
            console.log(`✅ Team 2 wins by fouls: ${match.team2_fouls} < ${match.team1_fouls}`);
          } else {
            // 規則3: 分數和犯規都相同 = 真正平局 (應該要延長賽，但如果強制結束則為平局)
            finalWinnerId = null;
            finalWinReason = 'draw';
            console.log(`🤝 True draw: scores (${match.team1_score}:${match.team2_score}) and fouls (${match.team1_fouls}:${match.team2_fouls}) both tied`);
          }
        }
      }

      // 更新比賽狀態
      await connection.execute(`
        UPDATE matches 
        SET match_status = 'completed', end_time = NOW(), winner_id = ?, win_reason = ?, referee_decision = ?
        WHERE match_id = ?
      `, [finalWinnerId, finalWinReason, referee_decision ? 1 : 0, matchId]);

      // 如果是小組賽，更新積分表
      if (match.group_id) {
        await updateGroupStandings(connection, match.group_id, match.team1_id, match.team2_id, 
          match.team1_score, match.team2_score, finalWinnerId);
      }

      // 如果是淘汰賽，自動推進勝者到下一輪
      if (finalWinnerId && !match.group_id) {
        await autoAdvanceKnockoutWinner(connection, matchId, finalWinnerId);
      }
    });

    res.json({
      success: true,
      message: '比賽已結束'
    });

  } catch (error) {
    console.error('結束比賽錯誤:', error);
    console.error('錯誤詳情:', error.message);
    console.error('錯誤堆疊:', error.stack);
    res.status(500).json({
      success: false,
      message: '結束比賽失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '請聯繫系統管理員'
    });
  }
});

// 更新小組積分的輔助函數
// 撤銷小組積分（用於編輯已完成比賽時）
async function reverseGroupStandings(connection, groupId, team1Id, team2Id, team1Score, team2Score, winnerId) {
  console.log(`🔄 Reversing group standings for group ${groupId}`);
  
  // 撤銷隊伍1的積分
  let team1Points = 0;
  let team1Won = 0, team1Drawn = 0, team1Lost = 0;
  
  if (winnerId === team1Id) {
    team1Points = -3;
    team1Won = -1;
  } else if (winnerId === team2Id) {
    team1Lost = -1;
  } else {
    team1Points = -1;
    team1Drawn = -1;
  }
  
  await connection.execute(`
    UPDATE group_standings 
    SET played = played - 1, won = won + ?, drawn = drawn + ?, lost = lost + ?,
        goals_for = goals_for - ?, goals_against = goals_against - ?, points = points + ?
    WHERE group_id = ? AND team_id = ?
  `, [team1Won, team1Drawn, team1Lost, team1Score, team2Score, team1Points, groupId, team1Id]);

  // 撤銷隊伍2的積分
  let team2Points = 0;
  let team2Won = 0, team2Drawn = 0, team2Lost = 0;
  
  if (winnerId === team2Id) {
    team2Points = -3;
    team2Won = -1;
  } else if (winnerId === team1Id) {
    team2Lost = -1;
  } else {
    team2Points = -1;
    team2Drawn = -1;
  }
  
  await connection.execute(`
    UPDATE group_standings 
    SET played = played - 1, won = won + ?, drawn = drawn + ?, lost = lost + ?,
        goals_for = goals_for - ?, goals_against = goals_against - ?, points = points + ?
    WHERE group_id = ? AND team_id = ?
  `, [team2Won, team2Drawn, team2Lost, team2Score, team1Score, team2Points, groupId, team2Id]);
}

async function updateGroupStandings(connection, groupId, team1Id, team2Id, team1Score, team2Score, winnerId) {
  // 更新隊伍1的積分
  let team1Points = 0, team1Won = 0, team1Drawn = 0, team1Lost = 0;
  if (winnerId === team1Id) {
    team1Points = 3;
    team1Won = 1;
  } else if (winnerId === team2Id) {
    team1Lost = 1;
  } else {
    team1Points = 1;
    team1Drawn = 1;
  }

  await connection.execute(`
    UPDATE group_standings 
    SET played = played + 1, won = won + ?, drawn = drawn + ?, lost = lost + ?,
        goals_for = goals_for + ?, goals_against = goals_against + ?, points = points + ?
    WHERE group_id = ? AND team_id = ?
  `, [team1Won, team1Drawn, team1Lost, team1Score, team2Score, team1Points, groupId, team1Id]);

  // 更新隊伍2的積分
  let team2Points = 0, team2Won = 0, team2Drawn = 0, team2Lost = 0;
  if (winnerId === team2Id) {
    team2Points = 3;
    team2Won = 1;
  } else if (winnerId === team1Id) {
    team2Lost = 1;
  } else {
    team2Points = 1;
    team2Drawn = 1;
  }

  await connection.execute(`
    UPDATE group_standings 
    SET played = played + 1, won = won + ?, drawn = drawn + ?, lost = lost + ?,
        goals_for = goals_for + ?, goals_against = goals_against + ?, points = points + ?
    WHERE group_id = ? AND team_id = ?
  `, [team2Won, team2Drawn, team2Lost, team2Score, team1Score, team2Points, groupId, team2Id]);
}

// 刪除比賽
router.delete('/:id', async (req, res) => {
  try {
    const matchId = req.params.id;

    // 檢查比賽是否存在
    const matches = await query(
      'SELECT match_id, match_status FROM matches WHERE match_id = ?',
      [matchId]
    );

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: '比賽不存在'
      });
    }

    // 允許刪除任何狀態的比賽
    // 移除狀態限制，管理員可以刪除任何比賽

    await transaction(async (connection) => {
      // 刪除比賽事件
      await connection.execute(
        'DELETE FROM match_events WHERE match_id = ?',
        [matchId]
      );

      // 刪除淘汰賽記錄
      await connection.execute(
        'DELETE FROM knockout_brackets WHERE match_id = ?',
        [matchId]
      );

      // 刪除比賽
      await connection.execute(
        'DELETE FROM matches WHERE match_id = ?',
        [matchId]
      );
    });

    res.json({
      success: true,
      message: '比賽刪除成功'
    });

  } catch (error) {
    console.error('刪除比賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除比賽失敗'
    });
  }
});

// 自動推進淘汰賽勝者到下一輪
async function autoAdvanceKnockoutWinner(connection, matchId, winnerId) {
  try {
    console.log(`🏆 Auto-advancing knockout winner: match ${matchId}, winner ${winnerId}`);
    
    // 查找當前比賽的淘汰賽信息
    const [currentBracket] = await connection.execute(`
      SELECT kb.*, m.match_number
      FROM knockout_brackets kb
      JOIN matches m ON kb.match_id = m.match_id
      WHERE kb.match_id = ?
    `, [matchId]);
    
    if (currentBracket.length === 0) {
      console.log(`⚠️ No knockout bracket found for match ${matchId}`);
      return;
    }
    
    const bracket = currentBracket[0];
    
    // 查找下一輪比賽
    if (!bracket.next_match_id) {
      console.log(`🏁 Match ${bracket.match_number} is the final - no next round`);
      return;
    }
    
    // 確定在下一輪比賽中的位置
    const isFirstMatch = (bracket.position_in_round % 2 === 1);
    const teamField = isFirstMatch ? 'team1_id' : 'team2_id';
    
    console.log(`📍 Advancing to next match ${bracket.next_match_id} as ${teamField}`);
    
    // 更新下一輪比賽
    await connection.execute(`
      UPDATE matches 
      SET ${teamField} = ?
      WHERE match_id = ?
    `, [winnerId, bracket.next_match_id]);
    
    console.log(`✅ Successfully advanced winner ${winnerId} to next round`);
    
  } catch (error) {
    console.error('❌ Error auto-advancing knockout winner:', error);
    // 不要拋出錯誤，避免影響比賽結束流程
  }
}

module.exports = router;