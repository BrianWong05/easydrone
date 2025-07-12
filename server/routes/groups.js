const express = require('express');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 創建小組驗證模式
const groupSchema = Joi.object({
  group_name: Joi.string().min(1).max(50).required().messages({
    'string.empty': '小組名稱不能為空',
    'string.min': '小組名稱至少需要1個字符',
    'string.max': '小組名稱不能超過50個字符',
    'any.required': '小組名稱是必填項'
  }),
  max_teams: Joi.number().integer().min(2).max(8).default(4).messages({
    'number.min': '每組最少需要2支隊伍',
    'number.max': '每組最多8支隊伍'
  }),
  tournament_id: Joi.number().integer().optional().messages({
    'number.base': '錦標賽ID必須是數字'
  }),
  display_name: Joi.string().optional().allow('').messages({
    'string.base': '顯示名稱必須是字符串'
  }),
  description: Joi.string().optional().allow('').messages({
    'string.base': '描述必須是字符串'
  })
});

// 獲取所有小組
router.get('/', async (req, res) => {
  try {
    console.log('開始獲取小組列表...');
    
    // 獲取所有小組，包含錦標賽信息
    const groups = await query(`
      SELECT tg.group_id, tg.group_name, tg.max_teams, tg.tournament_id, 
             tg.created_at, tg.updated_at,
             t.tournament_name
      FROM team_groups tg
      LEFT JOIN tournaments t ON tg.tournament_id = t.tournament_id
      ORDER BY tg.tournament_id, tg.group_name
    `);
    
    console.log('🏁 獲取到的原始小組數據:', groups);
    console.log('🏁 小組數量:', groups.length);
    
    // 為每個小組單獨獲取隊伍數量
    for (let group of groups) {
      try {
        const teamCount = await query(
          'SELECT COUNT(*) as count FROM teams WHERE group_id = ?',
          [group.group_id]
        );
        group.team_count = teamCount[0].count;
        console.log(`🏁 小組 ${group.group_name} (ID: ${group.group_id}) 隊伍數量: ${group.team_count}`);
        
        const matchCount = await query(
          'SELECT COUNT(*) as total, COUNT(CASE WHEN match_status = "completed" THEN 1 END) as completed FROM matches WHERE group_id = ?',
          [group.group_id]
        );
        group.total_matches = matchCount[0].total;
        group.completed_matches = matchCount[0].completed;
        console.log(`🏁 小組 ${group.group_name} 比賽統計: 總計 ${group.total_matches}, 已完成 ${group.completed_matches}`);
      } catch (error) {
        console.error(`獲取小組 ${group.group_id} 統計失敗:`, error);
        group.team_count = 0;
        group.total_matches = 0;
        group.completed_matches = 0;
      }
    }
    
    console.log('🏁 最終返回的小組數據:', groups);

    res.json({
      success: true,
      data: {
        groups
      }
    });

  } catch (error) {
    console.error('獲取小組列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取小組列表失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 獲取單個小組詳情
router.get('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;

    // 獲取小組基本信息
    const groups = await query(`
      SELECT * FROM team_groups WHERE group_id = ?
    `, [groupId]);

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在'
      });
    }

    // 獲取小組隊伍
    const teams = await query(`
      SELECT * FROM teams WHERE group_id = ? ORDER BY team_name
    `, [groupId]);

    // 獲取小組比賽
    const matches = await query(`
      SELECT m.*, 
             t1.team_name as team1_name, t1.team_color as team1_color,
             t2.team_name as team2_name, t2.team_color as team2_color
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.team_id
      JOIN teams t2 ON m.team2_id = t2.team_id
      WHERE m.group_id = ?
      ORDER BY m.match_date, m.match_number
    `, [groupId]);

    // 獲取小組積分榜
    const standings = await query(`
      SELECT gs.*, t.team_name, t.team_color,
             (gs.goals_for - gs.goals_against) as goal_difference
      FROM group_standings gs
      JOIN teams t ON gs.team_id = t.team_id
      WHERE gs.group_id = ?
      ORDER BY gs.points DESC, goal_difference DESC, gs.goals_for DESC
    `, [groupId]);

    res.json({
      success: true,
      data: {
        group: groups[0],
        teams,
        matches,
        standings
      }
    });

  } catch (error) {
    console.error('獲取小組詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取小組詳情失敗'
    });
  }
});

// 創建新小組 (temporarily remove auth for development)
router.post('/', async (req, res) => {
  try {
    // 驗證輸入數據
    const { error, value } = groupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { group_name, max_teams, tournament_id } = value;

    // 檢查小組名稱是否在同一錦標賽中已存在
    let existingGroups;
    if (tournament_id) {
      // 錦標賽專屬小組：檢查同一錦標賽中是否有相同名稱
      existingGroups = await query(
        'SELECT group_id FROM team_groups WHERE group_name = ? AND tournament_id = ?',
        [group_name, tournament_id]
      );
    } else {
      // 全局小組：檢查全局範圍內是否有相同名稱（tournament_id IS NULL）
      existingGroups = await query(
        'SELECT group_id FROM team_groups WHERE group_name = ? AND tournament_id IS NULL',
        [group_name]
      );
    }

    if (existingGroups.length > 0) {
      const scope = tournament_id ? `錦標賽 ${tournament_id}` : '全局範圍';
      return res.status(409).json({
        success: false,
        message: `小組名稱在${scope}中已存在`
      });
    }

    // 如果指定了錦標賽ID，驗證錦標賽是否存在
    if (tournament_id) {
      const tournamentExists = await query(
        'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
        [tournament_id]
      );
      
      if (tournamentExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: '指定的錦標賽不存在'
        });
      }
    }

    // 創建小組
    const result = await query(
      'INSERT INTO team_groups (group_name, max_teams, tournament_id) VALUES (?, ?, ?)',
      [group_name, max_teams, tournament_id || null]
    );

    res.status(201).json({
      success: true,
      message: '小組創建成功',
      data: {
        group_id: result.insertId
      }
    });

  } catch (error) {
    console.error('創建小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建小組失敗'
    });
  }
});

// 更新小組 (temporarily remove auth for development)
router.put('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = groupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { group_name, max_teams } = value;

    // 檢查小組是否存在
    const existingGroups = await query(
      'SELECT group_id FROM team_groups WHERE group_id = ?',
      [groupId]
    );

    if (existingGroups.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在'
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

    // 檢查小組名稱是否與其他小組重複
    const duplicateGroups = await query(
      'SELECT group_id FROM team_groups WHERE group_name = ? AND group_id != ?',
      [group_name, groupId]
    );

    if (duplicateGroups.length > 0) {
      return res.status(409).json({
        success: false,
        message: '小組名稱已存在'
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

    // 更新小組
    await query(
      'UPDATE team_groups SET group_name = ?, max_teams = ? WHERE group_id = ?',
      [group_name, max_teams, groupId]
    );

    res.json({
      success: true,
      message: '小組更新成功'
    });

  } catch (error) {
    console.error('更新小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新小組失敗'
    });
  }
});

// 刪除小組 (temporarily remove auth for development)
router.delete('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;

    // 檢查小組是否存在
    const groups = await query(
      'SELECT group_id FROM team_groups WHERE group_id = ?',
      [groupId]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在'
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
      message: '小組刪除成功'
    });

  } catch (error) {
    console.error('刪除小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除小組失敗'
    });
  }
});

// 為小組添加隊伍 (temporarily remove auth for development)
router.post('/:id/teams', async (req, res) => {
  try {
    const groupId = req.params.id;
    const { team_id } = req.body;

    if (!team_id) {
      return res.status(400).json({
        success: false,
        message: '隊伍ID是必填項'
      });
    }

    // 檢查小組是否存在
    const groups = await query(
      'SELECT group_id, max_teams, tournament_id FROM team_groups WHERE group_id = ?',
      [groupId]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在'
      });
    }

    // 檢查小組比賽狀態
    const matches = await query(
      'SELECT match_id, match_status FROM matches WHERE group_id = ?',
      [groupId]
    );

    if (matches.length > 0) {
      const nonPendingMatches = matches.filter(match => match.match_status !== 'pending');
      if (nonPendingMatches.length > 0) {
        return res.status(400).json({
          success: false,
          message: '無法添加隊伍：小組存在已開始或已完成的比賽'
        });
      }
    }

    // 檢查隊伍是否存在
    const teams = await query(
      'SELECT team_id, group_id FROM teams WHERE team_id = ?',
      [team_id]
    );

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在'
      });
    }

    if (teams[0].group_id) {
      // 獲取隊伍當前所在小組的信息
      const currentGroup = await query(
        'SELECT group_name FROM team_groups WHERE group_id = ?',
        [teams[0].group_id]
      );
      
      const currentGroupName = currentGroup.length > 0 ? currentGroup[0].group_name : teams[0].group_id;
      
      return res.status(400).json({
        success: false,
        message: `隊伍已在其他小組：該隊伍目前已分配到小組 ${currentGroupName}，無法添加到其他小組。請先從原小組移除該隊伍。`
      });
    }

    // 檢查小組是否已滿
    const teamCount = await query(
      'SELECT COUNT(*) as count FROM teams WHERE group_id = ?',
      [groupId]
    );

    if (teamCount[0].count >= groups[0].max_teams) {
      return res.status(400).json({
        success: false,
        message: '該小組已滿，無法添加更多隊伍'
      });
    }

    await transaction(async (connection) => {
      // 更新隊伍的小組
      await connection.execute(
        'UPDATE teams SET group_id = ? WHERE team_id = ?',
        [groupId, team_id]
      );

      // 添加到積分表
      await connection.execute(
        'INSERT INTO group_standings (group_id, team_id, tournament_id) VALUES (?, ?, ?)',
        [groupId, team_id, groups[0].tournament_id]
      );
    });

    res.json({
      success: true,
      message: '隊伍添加到小組成功'
    });

  } catch (error) {
    console.error('添加隊伍到小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '添加隊伍到小組失敗'
    });
  }
});

// 從小組移除隊伍 (temporarily remove auth for development)
router.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    const groupId = req.params.id;
    const teamId = req.params.teamId;

    // 檢查隊伍是否在該小組
    const teams = await query(
      'SELECT team_id FROM teams WHERE team_id = ? AND group_id = ?',
      [teamId, groupId]
    );

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不在該小組中'
      });
    }

    // 檢查小組比賽狀態 - 只有當所有比賽都是pending時才能移除隊伍
    const allMatches = await query(
      'SELECT match_id, match_status FROM matches WHERE group_id = ?',
      [groupId]
    );

    if (allMatches.length > 0) {
      const nonPendingMatches = allMatches.filter(match => match.match_status !== 'pending');
      if (nonPendingMatches.length > 0) {
        return res.status(400).json({
          success: false,
          message: '無法移除隊伍：小組存在已開始或已完成的比賽。只有當所有小組比賽都是待開始狀態時才能移除隊伍。'
        });
      }

      // 如果所有比賽都是pending狀態，則刪除所有小組比賽
      console.log(`🗑️ 刪除小組 ${groupId} 的所有待開始比賽，共 ${allMatches.length} 場`);
    }

    await transaction(async (connection) => {
      // 如果有pending比賽，先刪除所有小組比賽
      if (allMatches.length > 0) {
        // 刪除比賽事件
        await connection.execute(
          'DELETE FROM match_events WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
          [groupId]
        );

        // 刪除淘汰賽記錄
        await connection.execute(
          'DELETE FROM knockout_brackets WHERE match_id IN (SELECT match_id FROM matches WHERE group_id = ?)',
          [groupId]
        );

        // 刪除所有小組比賽
        await connection.execute(
          'DELETE FROM matches WHERE group_id = ?',
          [groupId]
        );

        console.log(`✅ 已刪除小組 ${groupId} 的所有比賽`);
      }

      // 從積分表移除
      await connection.execute(
        'DELETE FROM group_standings WHERE group_id = ? AND team_id = ?',
        [groupId, teamId]
      );

      // 更新隊伍的小組為null
      await connection.execute(
        'UPDATE teams SET group_id = NULL WHERE team_id = ?',
        [teamId]
      );
    });

    const message = allMatches.length > 0 
      ? `隊伍從小組移除成功，同時刪除了 ${allMatches.length} 場待開始的小組比賽`
      : '隊伍從小組移除成功';

    res.json({
      success: true,
      message: message,
      data: {
        deletedMatches: allMatches.length
      }
    });

  } catch (error) {
    console.error('從小組移除隊伍錯誤:', error);
    res.status(500).json({
      success: false,
      message: '從小組移除隊伍失敗'
    });
  }
});

// 創建小組循環賽 (temporarily remove auth for testing)
router.post('/:id/matches', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const { 
      match_date, 
      match_time = 600, // Default 10 minutes in seconds
      match_interval = 30, // Default 30 minutes interval
      optimize_schedule = false, // Whether to optimize match schedule
      custom_match_order = null // Custom match order from frontend
    } = req.body;

    // Import the utility function
    const { 
      generateGroupMatches, 
      validateGroupMatchConfig, 
      optimizeMatchSchedule,
      generateMatchStatistics,
      analyzeBackToBackMatches
    } = require('../utils/groupMatchGenerator');

    // Validate configuration
    const validation = validateGroupMatchConfig({
      groupId,
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

    // 檢查小組是否存在
    const groups = await query(
      'SELECT group_id, group_name FROM team_groups WHERE group_id = ?',
      [groupId]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        success: false,
        message: '小組不存在'
      });
    }

    // 獲取小組隊伍
    const teams = await query(
      'SELECT team_id, team_name FROM teams WHERE group_id = ? ORDER BY team_name',
      [groupId]
    );

    if (teams.length < 2) {
      return res.status(400).json({
        success: false,
        message: '小組至少需要2支隊伍才能創建循環賽'
      });
    }

    // 檢查是否已有小組比賽
    const existingMatches = await query(
      'SELECT match_id FROM matches WHERE group_id = ?',
      [groupId]
    );

    if (existingMatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: '該小組已有比賽，無法重複創建'
      });
    }

    // 生成比賽列表
    let matches = generateGroupMatches(teams, {
      groupName: groups[0].group_name,
      matchDate: match_date,
      matchTime: match_time,
      matchInterval: match_interval,
      matchType: 'group',
      groupId: groupId
    });

    // 如果有自定義比賽順序，應用自定義順序
    if (custom_match_order && Array.isArray(custom_match_order)) {
      console.log('🎯 Applying custom match order from frontend...');
      matches = applyCustomMatchOrder(matches, custom_match_order, teams);
    } else if (optimize_schedule) {
      // 如果啟用優化，則優化比賽時間表
      matches = optimizeMatchSchedule(matches, match_interval);
    }

    // 生成統計信息
    const statistics = generateMatchStatistics(teams, {
      matchDate: match_date,
      matchTime: match_time,
      matchInterval: match_interval
    });

    // 分析背靠背比賽情況
    const backToBackAnalysis = {
      beforeOptimization: analyzeBackToBackMatches(generateGroupMatches(teams, {
        groupName: groups[0].group_name,
        matchDate: match_date,
        matchTime: match_time,
        matchInterval: match_interval,
        matchType: 'group',
        groupId: groupId
      })),
      afterOptimization: optimize_schedule ? analyzeBackToBackMatches(matches) : null
    };

    // 插入比賽到數據庫
    await transaction(async (connection) => {
      for (const match of matches) {
        await connection.execute(`
          INSERT INTO matches (
            match_number, team1_id, team2_id, match_date, match_time,
            match_type, group_id, match_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          match.match_number,
          match.team1_id,
          match.team2_id,
          match.match_date,
          match.match_time,
          match.match_type,
          match.group_id,
          match.match_status
        ]);
      }
    });

    res.status(201).json({
      success: true,
      message: `小組${groups[0].group_name}循環賽創建成功`,
      data: {
        groupName: groups[0].group_name,
        matchesCreated: matches.length,
        matches: matches,
        statistics: statistics,
        backToBackAnalysis: backToBackAnalysis
      }
    });

  } catch (error) {
    console.error('創建小組循環賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: error.message || '創建小組循環賽失敗'
    });
  }
});

/**
 * 應用自定義比賽順序
 * Apply custom match order from frontend
 * 
 * @param {Array} originalMatches - 原始比賽列表
 * @param {Array} customOrder - 自定義順序 [{team1_name, team2_name}, ...]
 * @param {Array} teams - 隊伍列表
 * @returns {Array} 重新排序的比賽列表
 */
function applyCustomMatchOrder(originalMatches, customOrder, teams) {
  const reorderedMatches = [];
  const baseDate = moment(originalMatches[0].match_date);
  const matchInterval = 30; // Default interval, could be passed as parameter
  
  // 創建隊伍名稱到ID的映射
  const teamNameToId = new Map();
  teams.forEach(team => {
    teamNameToId.set(team.team_name, team.team_id);
  });

  customOrder.forEach((customMatch, index) => {
    const team1Id = teamNameToId.get(customMatch.team1_name);
    const team2Id = teamNameToId.get(customMatch.team2_name);
    
    // 找到對應的原始比賽
    const originalMatch = originalMatches.find(match => 
      (match.team1_id === team1Id && match.team2_id === team2Id) ||
      (match.team1_id === team2Id && match.team2_id === team1Id)
    );

    if (originalMatch) {
      // 創建新的比賽，保持原始數據但更新時間和場次
      const newMatch = {
        ...originalMatch,
        match_number: `${originalMatch.match_number.charAt(0)}${(index + 1).toString().padStart(2, '0')}`,
        match_date: baseDate.clone().add(index * matchInterval, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        team1_id: team1Id,
        team2_id: team2Id,
        team1_name: customMatch.team1_name,
        team2_name: customMatch.team2_name
      };
      
      reorderedMatches.push(newMatch);
      console.log(`📅 Custom match ${index + 1}: ${customMatch.team1_name} vs ${customMatch.team2_name}`);
    } else {
      console.warn(`⚠️ Could not find original match for ${customMatch.team1_name} vs ${customMatch.team2_name}`);
    }
  });

  console.log(`✅ Applied custom order: ${reorderedMatches.length} matches reordered`);
  return reorderedMatches;
}

// ===== 錦標賽專屬小組管理 =====

// 獲取特定錦標賽的小組
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    console.log(`獲取錦標賽 ${tournamentId} 的小組列表...`);
    
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
    
    // 獲取錦標賽的小組
    const groups = await query(`
      SELECT tg.group_id, tg.group_name, tg.max_teams, tg.tournament_id, 
             tg.created_at, tg.updated_at,
             t.tournament_name
      FROM team_groups tg
      LEFT JOIN tournaments t ON tg.tournament_id = t.tournament_id
      WHERE tg.tournament_id = ?
      ORDER BY tg.group_name
    `, [tournamentId]);
    
    // 為每個小組獲取隊伍數量和比賽統計
    for (let group of groups) {
      const teamCount = await query(
        'SELECT COUNT(*) as count FROM teams WHERE group_id = ?',
        [group.group_id]
      );
      group.team_count = teamCount[0].count;
      
      const matchCount = await query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN match_status = "completed" THEN 1 END) as completed FROM matches WHERE group_id = ?',
        [group.group_id]
      );
      group.match_count = matchCount[0].total;
      group.completed_matches = matchCount[0].completed;
    }
    
    res.json({
      success: true,
      data: groups
    });
    
  } catch (error) {
    console.error('獲取錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取錦標賽小組失敗'
    });
  }
});

// 為特定錦標賽創建小組
router.post('/tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    
    console.log(`創建錦標賽 ${tournamentId} 的小組，請求數據:`, req.body);
    
    // 檢查數據庫表結構
    try {
      const tableStructure = await query('DESCRIBE team_groups');
      console.log('當前表結構:', tableStructure.map(col => col.Field));
      
      const hasRequiredColumns = tableStructure.some(col => col.Field === 'tournament_id');
      if (!hasRequiredColumns) {
        return res.status(500).json({
          success: false,
          message: '數據庫表結構未更新，請運行遷移腳本'
        });
      }
    } catch (structureError) {
      console.error('檢查表結構失敗:', structureError);
      return res.status(500).json({
        success: false,
        message: '數據庫表結構檢查失敗'
      });
    }
    
    // 驗證錦標賽是否存在（暫時跳過，因為可能沒有 tournaments 表）
    try {
      const tournamentExists = await query(
        'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
        [tournamentId]
      );
      
      if (tournamentExists.length === 0) {
        console.log(`錦標賽 ${tournamentId} 不存在，但繼續創建小組`);
      }
    } catch (tournamentError) {
      console.log('tournaments 表不存在，跳過錦標賽驗證');
    }
    
    // 添加錦標賽ID到請求數據
    const groupData = {
      ...req.body,
      tournament_id: parseInt(tournamentId)
    };
    
    // 驗證輸入數據
    const { error, value } = groupSchema.validate(groupData);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { group_name, max_teams } = value;

    // 檢查小組名稱是否在該錦標賽中已存在
    const existingGroups = await query(
      'SELECT group_id FROM team_groups WHERE group_name = ? AND tournament_id = ?',
      [group_name, tournamentId]
    );

    if (existingGroups.length > 0) {
      return res.status(409).json({
        success: false,
        message: `小組名稱在錦標賽 ${tournamentId} 中已存在`
      });
    }

    // 創建小組
    const result = await query(
      'INSERT INTO team_groups (group_name, max_teams, tournament_id) VALUES (?, ?, ?)',
      [group_name, max_teams, tournamentId]
    );

    res.status(201).json({
      success: true,
      message: '錦標賽小組創建成功',
      data: {
        group_id: result.insertId,
        tournament_id: tournamentId
      }
    });

  } catch (error) {
    console.error('創建錦標賽小組錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建錦標賽小組失敗'
    });
  }
});

module.exports = router;