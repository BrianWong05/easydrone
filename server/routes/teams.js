const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 創建隊伍驗證模式
const teamSchema = Joi.object({
  team_name: Joi.string().min(2).max(100).required().messages({
    'string.empty': '隊伍名稱不能為空',
    'string.min': '隊伍名稱至少需要2個字符',
    'string.max': '隊伍名稱不能超過100個字符',
    'any.required': '隊伍名稱是必填項'
  }),
  group_id: Joi.number().integer().allow(null).messages({
    'number.base': '小組ID必須是數字'
  }),
  team_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#FFFFFF').messages({
    'string.pattern.base': '隊伍顏色必須是有效的十六進制顏色代碼'
  }),
  is_virtual: Joi.boolean().default(false),
  description: Joi.string().allow('').optional() // Allow description field
});

// 獲取所有隊伍
router.get('/', async (req, res) => {
  try {
    console.log('開始獲取隊伍列表...');
    
    // 獲取查詢參數
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const groupId = req.query.group_id || '';

    // 構建查詢條件
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('t.team_name LIKE ?');
      queryParams.push(`%${search}%`);
    }

    if (groupId) {
      whereConditions.push('t.group_id = ?');
      queryParams.push(groupId);
    }

    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';

    // 獲取總數
    const countSql = `
      SELECT COUNT(*) as total
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      ${whereClause}
    `;
    
    console.log('執行計數查詢:', countSql, queryParams);
    const countResult = await query(countSql, queryParams);
    const total = countResult[0].total;
    console.log('📊 隊伍總數:', total);

    // 獲取隊伍列表 - 使用簡化查詢避免參數綁定問題
    const sql = `
      SELECT t.team_id, t.team_name, t.group_id, t.team_color, t.is_virtual, 
             t.created_at, t.updated_at, g.group_name
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      ${whereClause}
      ORDER BY t.team_name 
      LIMIT ? OFFSET ?
    `;
    
    // 添加分頁參數
    const finalParams = [...queryParams, limit, offset];
    
    console.log('執行隊伍查詢:', sql);
    console.log('查詢參數:', finalParams);
    console.log('參數類型:', finalParams.map(p => typeof p));
    
    const teams = await query(sql, finalParams);
    console.log('🏆 獲取到的原始隊伍數據:', teams);
    console.log('🏆 隊伍數量:', teams.length);
    
    // 單獨獲取每個隊伍的運動員數量
    for (let team of teams) {
      try {
        const athleteCount = await query(
          'SELECT COUNT(*) as count FROM athletes WHERE team_id = ? AND is_active = 1',
          [team.team_id]
        );
        team.athlete_count = athleteCount[0].count;
        console.log(`👥 隊伍 ${team.team_name} (ID: ${team.team_id}) 運動員數量: ${team.athlete_count}`);
      } catch (error) {
        console.error(`獲取隊伍 ${team.team_id} 運動員數量失敗:`, error);
        team.athlete_count = 0;
      }
    }
    
    console.log('🏆 最終返回的隊伍數據:', teams);

    res.json({
      success: true,
      data: {
        teams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取隊伍列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取隊伍列表失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取單個隊伍詳情
router.get('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    // 獲取隊伍基本信息
    const teams = await query(`
      SELECT t.*, g.group_name
      FROM teams t
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      WHERE t.team_id = ?
    `, [teamId]);

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在'
      });
    }

    // 獲取隊伍成員
    const athletes = await query(`
      SELECT * FROM athletes 
      WHERE team_id = ? 
      ORDER BY jersey_number
    `, [teamId]);

    // 獲取隊伍比賽記錄
    const matches = await query(`
      SELECT m.*, 
             t1.team_name as team1_name,
             t2.team_name as team2_name,
             g.group_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.team_id
      JOIN teams t2 ON m.team2_id = t2.team_id
      LEFT JOIN team_groups g ON m.group_id = g.group_id
      WHERE m.team1_id = ? OR m.team2_id = ?
      ORDER BY m.match_date DESC
    `, [teamId, teamId]);

    res.json({
      success: true,
      data: {
        team: teams[0],
        athletes,
        matches
      }
    });

  } catch (error) {
    console.error('獲取隊伍詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取隊伍詳情失敗'
    });
  }
});

// 創建新隊伍
router.post('/', async (req, res) => {
  try {
    // 驗證輸入數據
    const { error, value } = teamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { team_name, group_id, team_color, is_virtual } = value;

    // 檢查隊伍名稱是否已存在
    const existingTeams = await query(
      'SELECT team_id FROM teams WHERE team_name = ?',
      [team_name]
    );

    if (existingTeams.length > 0) {
      return res.status(409).json({
        success: false,
        message: '隊伍名稱已存在'
      });
    }

    console.log('🔍 驗證小組信息，group_id:', group_id);
    
    // 如果指定了小組，檢查小組是否存在且未滿
    if (group_id) {
      console.log('📋 檢查小組是否存在...');
      
      // 先檢查所有可用的小組
      const allGroups = await query('SELECT * FROM team_groups ORDER BY group_name');
      console.log('📋 所有可用小組:', allGroups);
      
      const groups = await query(
        'SELECT group_id, group_name, max_teams FROM team_groups WHERE group_id = ?',
        [group_id]
      );
      
      console.log('📋 查詢到的目標小組:', groups);

      if (groups.length === 0) {
        return res.status(404).json({
          success: false,
          message: `指定的小組不存在 (ID: ${group_id})。可用小組: ${allGroups.map(g => `${g.group_name}組(ID:${g.group_id})`).join(', ')}`
        });
      }

      const teamCount = await query(
        'SELECT COUNT(*) as count FROM teams WHERE group_id = ?',
        [group_id]
      );
      
      console.log(`📋 小組 ${groups[0].group_name} 當前隊伍數: ${teamCount[0].count}/${groups[0].max_teams}`);

      if (teamCount[0].count >= groups[0].max_teams) {
        return res.status(400).json({
          success: false,
          message: `小組 ${groups[0].group_name} 已滿 (${teamCount[0].count}/${groups[0].max_teams})，無法添加更多隊伍`
        });
      }
      
      console.log(`✅ 小組 ${groups[0].group_name} 驗證通過，可以添加隊伍`);
    } else {
      console.log('📋 未指定小組，創建獨立隊伍');
    }

    // 創建隊伍
    const result = await query(
      'INSERT INTO teams (team_name, group_id, team_color, is_virtual) VALUES (?, ?, ?, ?)',
      [team_name, group_id, team_color, is_virtual]
    );

    // 如果分配了小組，更新小組積分表
    if (group_id) {
      await query(
        'INSERT INTO group_standings (group_id, team_id) VALUES (?, ?)',
        [group_id, result.insertId]
      );
    }

    res.status(201).json({
      success: true,
      message: '隊伍創建成功',
      data: {
        team_id: result.insertId
      }
    });

  } catch (error) {
    console.error('創建隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建隊伍失敗'
    });
  }
});

// 更新隊伍
router.put('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = teamSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { team_name, group_id, team_color, is_virtual } = value;

    // 檢查隊伍是否存在
    const existingTeams = await query(
      'SELECT team_id, group_id FROM teams WHERE team_id = ?',
      [teamId]
    );

    if (existingTeams.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在'
      });
    }

    const oldGroupId = existingTeams[0].group_id;

    // 檢查隊伍名稱是否與其他隊伍重複
    const duplicateTeams = await query(
      'SELECT team_id FROM teams WHERE team_name = ? AND team_id != ?',
      [team_name, teamId]
    );

    if (duplicateTeams.length > 0) {
      return res.status(409).json({
        success: false,
        message: '隊伍名稱已存在'
      });
    }

    // 如果要更改小組，需要檢查小組比賽狀態
    if (oldGroupId !== group_id) {
      // 檢查舊小組的比賽狀態
      if (oldGroupId) {
        const oldGroupMatches = await query(
          'SELECT match_id, match_status FROM matches WHERE group_id = ?',
          [oldGroupId]
        );

        if (oldGroupMatches.length > 0) {
          const nonPendingMatches = oldGroupMatches.filter(match => match.match_status !== 'pending');
          if (nonPendingMatches.length > 0) {
            return res.status(400).json({
              success: false,
              message: '無法更改隊伍小組：原小組存在已開始或已完成的比賽。只有當所有小組比賽都是待開始狀態時才能更改隊伍小組。'
            });
          }
        }
      }

      // 檢查新小組的比賽狀態
      if (group_id) {
        const newGroupMatches = await query(
          'SELECT match_id, match_status FROM matches WHERE group_id = ?',
          [group_id]
        );

        if (newGroupMatches.length > 0) {
          const nonPendingMatches = newGroupMatches.filter(match => match.match_status !== 'pending');
          if (nonPendingMatches.length > 0) {
            return res.status(400).json({
              success: false,
              message: '無法更改隊伍小組：目標小組存在已開始或已完成的比賽。只有當所有小組比賽都是待開始狀態時才能更改隊伍小組。'
            });
          }
        }

        // 檢查目標小組是否已滿
        const targetGroupInfo = await query(
          'SELECT group_name, max_teams FROM team_groups WHERE group_id = ?',
          [group_id]
        );

        if (targetGroupInfo.length === 0) {
          return res.status(404).json({
            success: false,
            message: '目標小組不存在'
          });
        }

        const currentTeamCount = await query(
          'SELECT COUNT(*) as count FROM teams WHERE group_id = ?',
          [group_id]
        );

        if (currentTeamCount[0].count >= targetGroupInfo[0].max_teams) {
          return res.status(400).json({
            success: false,
            message: `無法更改隊伍小組：目標小組 ${targetGroupInfo[0].group_name} 已滿 (${currentTeamCount[0].count}/${targetGroupInfo[0].max_teams})，無法添加更多隊伍。`
          });
        }
      }
    }

    await transaction(async (connection) => {
      // 處理小組變更
      if (oldGroupId !== group_id) {
        // 如果從舊小組移除，需要刪除舊小組的所有pending比賽
        if (oldGroupId) {
          const oldGroupMatches = await query(
            'SELECT match_id FROM matches WHERE group_id = ?',
            [oldGroupId]
          );

          if (oldGroupMatches.length > 0) {
            // 刪除比賽事件
            await connection.execute(
              'DELETE FROM match_events WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
              [oldGroupId]
            );

            // 刪除淘汰賽記錄
            await connection.execute(
              'DELETE FROM knockout_brackets WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
              [oldGroupId]
            );

            // 刪除所有舊小組比賽
            await connection.execute(
              'DELETE FROM matches WHERE group_id = ?',
              [oldGroupId]
            );

            console.log(`✅ 已刪除舊小組 ${oldGroupId} 的所有 ${oldGroupMatches.length} 場比賽`);
          }

          await connection.execute(
            'DELETE FROM group_standings WHERE group_id = ? AND team_id = ?',
            [oldGroupId, teamId]
          );
        }

        // 如果移動到新小組，需要刪除新小組的所有pending比賽
        if (group_id) {
          const newGroupMatches = await query(
            'SELECT match_id FROM matches WHERE group_id = ?',
            [group_id]
          );

          if (newGroupMatches.length > 0) {
            // 刪除比賽事件
            await connection.execute(
              'DELETE FROM match_events WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
              [group_id]
            );

            // 刪除淘汰賽記錄
            await connection.execute(
              'DELETE FROM knockout_brackets WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
              [group_id]
            );

            // 刪除所有新小組比賽
            await connection.execute(
              'DELETE FROM matches WHERE group_id = ?',
              [group_id]
            );

            console.log(`✅ 已刪除新小組 ${group_id} 的所有 ${newGroupMatches.length} 場比賽`);
          }

          await connection.execute(
            'INSERT INTO group_standings (group_id, team_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE team_id = team_id',
            [group_id, teamId]
          );
        }
      }

      // 更新隊伍信息
      await connection.execute(
        'UPDATE teams SET team_name = ?, group_id = ?, team_color = ?, is_virtual = ? WHERE team_id = ?',
        [team_name, group_id, team_color, is_virtual, teamId]
      );
    });

    res.json({
      success: true,
      message: '隊伍更新成功'
    });

  } catch (error) {
    console.error('更新隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新隊伍失敗'
    });
  }
});

// 刪除隊伍
router.delete('/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    // 檢查隊伍是否存在
    const teams = await query(
      'SELECT team_id, group_id FROM teams WHERE team_id = ?',
      [teamId]
    );

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在'
      });
    }

    const team = teams[0];

    // 檢查是否有相關的比賽
    const matches = await query(
      'SELECT match_id, match_status, group_id FROM matches WHERE team1_id = ? OR team2_id = ?',
      [teamId, teamId]
    );

    if (matches.length > 0) {
      // 檢查是否有非pending狀態的比賽
      const nonPendingMatches = matches.filter(match => match.match_status !== 'pending');
      if (nonPendingMatches.length > 0) {
        return res.status(400).json({
          success: false,
          message: '無法刪除隊伍：該隊伍已參與已開始或已完成的比賽。只有當所有相關比賽都是待開始狀態時才能刪除隊伍。'
        });
      }

      // 如果隊伍在小組中，檢查小組的所有比賽是否都是pending
      if (team.group_id) {
        const groupMatches = await query(
          'SELECT match_id, match_status FROM matches WHERE group_id = ?',
          [team.group_id]
        );

        const nonPendingGroupMatches = groupMatches.filter(match => match.match_status !== 'pending');
        if (nonPendingGroupMatches.length > 0) {
          return res.status(400).json({
            success: false,
            message: '無法刪除隊伍：該隊伍所在小組存在已開始或已完成的比賽。只有當小組所有比賽都是待開始狀態時才能刪除隊伍。'
          });
        }

        console.log(`🗑️ 刪除隊伍 ${teamId} 及其小組 ${team.group_id} 的所有待開始比賽，共 ${groupMatches.length} 場`);
      }
    }

    await transaction(async (connection) => {
      let deletedMatches = 0;

      // 如果隊伍在小組中且有pending比賽，刪除所有小組比賽
      if (team.group_id && matches.length > 0) {
        // 刪除比賽事件
        await connection.execute(
          'DELETE FROM match_events WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
          [team.group_id]
        );

        // 刪除淘汰賽記錄
        await connection.execute(
          'DELETE FROM knockout_brackets WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
          [team.group_id]
        );

        // 獲取要刪除的比賽數量
        const groupMatches = await connection.execute(
          'SELECT COUNT(*) as count FROM matches WHERE group_id = ?',
          [team.group_id]
        );
        deletedMatches = groupMatches[0][0].count;

        // 刪除所有小組比賽
        await connection.execute(
          'DELETE FROM matches WHERE group_id = ?',
          [team.group_id]
        );

        console.log(`✅ 已刪除小組 ${team.group_id} 的所有 ${deletedMatches} 場比賽`);
      } else if (matches.length > 0) {
        // 如果不在小組中但有pending比賽，只刪除該隊伍相關的比賽
        deletedMatches = matches.length;

        // 刪除比賽事件
        await connection.execute(
          'DELETE FROM match_events WHERE match_id IN (' + matches.map(() => '?').join(',') + ')',
          matches.map(m => m.match_id)
        );

        // 刪除淘汰賽記錄
        await connection.execute(
          'DELETE FROM knockout_brackets WHERE match_id IN (' + matches.map(() => '?').join(',') + ')',
          matches.map(m => m.match_id)
        );

        // 刪除比賽
        await connection.execute(
          'DELETE FROM matches WHERE team1_id = ? OR team2_id = ?',
          [teamId, teamId]
        );

        console.log(`✅ 已刪除隊伍 ${teamId} 相關的 ${deletedMatches} 場比賽`);
      }

      // 刪除小組積分記錄
      await connection.execute(
        'DELETE FROM group_standings WHERE team_id = ?',
        [teamId]
      );

      // 刪除隊員
      await connection.execute(
        'DELETE FROM athletes WHERE team_id = ?',
        [teamId]
      );

      // 刪除隊伍
      await connection.execute(
        'DELETE FROM teams WHERE team_id = ?',
        [teamId]
      );
    });

    const message = matches.length > 0 
      ? `隊伍刪除成功，同時刪除了 ${matches.length} 場相關的待開始比賽`
      : '隊伍刪除成功';

    res.json({
      success: true,
      message: message,
      data: {
        deletedMatches: matches.length
      }
    });

  } catch (error) {
    console.error('刪除隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除隊伍失敗'
    });
  }
});

module.exports = router;