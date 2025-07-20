const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 創建運動員驗證模式
const athleteSchema = Joi.object({
  tournament_id: Joi.number().integer().required().messages({
    'any.required': '錦標賽ID是必填項'
  }),
  team_id: Joi.number().integer().optional().allow(null).messages({
    'number.base': '隊伍ID必須是數字'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': '運動員姓名不能為空',
    'string.min': '運動員姓名至少需要2個字符',
    'string.max': '運動員姓名不能超過100個字符',
    'any.required': '運動員姓名是必填項'
  }),
  jersey_number: Joi.number().integer().min(1).max(99).required().messages({
    'number.min': '球衣號碼必須在1-99之間',
    'number.max': '球衣號碼必須在1-99之間',
    'any.required': '球衣號碼是必填項'
  }),
  position: Joi.string().valid('attacker', 'defender', 'substitute').required().messages({
    'any.only': '位置必須是進攻手、防守員或替補',
    'any.required': '位置是必填項'
  }),
  age: Joi.number().integer().min(16).max(50).required().messages({
    'number.min': '年齡必須在16-50歲之間',
    'number.max': '年齡必須在16-50歲之間',
    'any.required': '年齡是必填項'
  }),
  is_active: Joi.boolean().default(true)
});

// 獲取所有運動員
router.get('/', async (req, res) => {
  try {
    console.log('👥 開始獲取運動員列表...');
    const { tournament_id, team_id, position, is_active, search, page = 1, limit = 20 } = req.query;
    console.log('👥 查詢參數:', { tournament_id, team_id, position, is_active, search, page, limit });
    
    let sql = `
      SELECT a.*, t.team_name, t.team_color, g.group_name, tour.tournament_name
      FROM athletes a
      LEFT JOIN teams t ON a.team_id = t.team_id
      JOIN tournaments tour ON a.tournament_id = tour.tournament_id
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      WHERE 1=1
    `;
    const params = [];

    // 按錦標賽篩選 (必需)
    if (tournament_id) {
      sql += ' AND a.tournament_id = ?';
      params.push(tournament_id);
    } else {
      return res.status(400).json({
        success: false,
        message: '錦標賽ID是必填參數'
      });
    }

    // 按隊伍篩選
    if (team_id) {
      sql += ' AND a.team_id = ?';
      params.push(team_id);
    }

    // 按位置篩選
    if (position) {
      sql += ' AND a.position = ?';
      params.push(position);
    }

    // 按狀態篩選
    if (is_active !== undefined) {
      sql += ' AND a.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    // 搜索運動員姓名
    if (search) {
      sql += ' AND a.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY COALESCE(t.team_name, "無隊伍") ASC, a.jersey_number ASC';

    // 分頁
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const athletes = await query(sql, params);
    console.log('👥 獲取到的原始運動員數據:', athletes);
    console.log('👥 運動員數量:', athletes.length);
    
    // 按隊伍分組顯示
    const teamGroups = {};
    athletes.forEach(athlete => {
      const teamName = athlete.team_name || '無隊伍';
      if (!teamGroups[teamName]) {
        teamGroups[teamName] = [];
      }
      teamGroups[teamName].push(athlete);
      console.log(`👥 ${teamName} - ${athlete.name} (#${athlete.jersey_number}, ${athlete.position})`);
    });

    // 獲取總數
    let countSql = 'SELECT COUNT(*) as total FROM athletes a LEFT JOIN teams t ON a.team_id = t.team_id WHERE a.tournament_id = ?';
    const countParams = [tournament_id];
    
    if (team_id) {
      countSql += ' AND a.team_id = ?';
      countParams.push(team_id);
    }
    if (position) {
      countSql += ' AND a.position = ?';
      countParams.push(position);
    }
    if (is_active !== undefined) {
      countSql += ' AND a.is_active = ?';
      countParams.push(is_active === 'true' ? 1 : 0);
    }
    if (search) {
      countSql += ' AND a.name LIKE ?';
      countParams.push(`%${search}%`);
    }

    const [{ total }] = await query(countSql, countParams);

    res.json({
      success: true,
      data: {
        athletes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取運動員列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取運動員列表失敗'
    });
  }
});

// 獲取單個運動員詳情
router.get('/:id', async (req, res) => {
  try {
    const athleteId = req.params.id;
    console.log('👤 獲取運動員詳情，ID:', athleteId);

    const athletes = await query(`
      SELECT a.*, t.team_name, t.team_color, g.group_name, tour.tournament_name
      FROM athletes a
      LEFT JOIN teams t ON a.team_id = t.team_id
      JOIN tournaments tour ON a.tournament_id = tour.tournament_id
      LEFT JOIN team_groups g ON t.group_id = g.group_id
      WHERE a.athlete_id = ?
    `, [athleteId]);

    if (athletes.length === 0) {
      console.log('❌ 運動員不存在，ID:', athleteId);
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    console.log('✅ 找到運動員:', athletes[0].name);

    // 獲取運動員參與的比賽事件
    const events = await query(`
      SELECT me.*, m.match_number, m.match_date,
             t1.team_name as team1_name, t2.team_name as team2_name
      FROM match_events me
      JOIN matches m ON me.match_id = m.match_id
      JOIN teams t1 ON m.team1_id = t1.team_id
      JOIN teams t2 ON m.team2_id = t2.team_id
      WHERE me.athlete_id = ?
      ORDER BY m.match_date DESC, me.event_time DESC
    `, [athleteId]);

    console.log('📊 找到比賽事件數量:', events.length);

    res.json({
      success: true,
      data: {
        athlete: athletes[0],
        events
      }
    });

  } catch (error) {
    console.error('❌ 獲取運動員詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取運動員詳情失敗'
    });
  }
});

// 創建運動員
router.post('/', async (req, res) => {
  try {
    console.log('👤 收到創建運動員請求:', req.body);
    
    // 驗證輸入數據
    const { error, value } = athleteSchema.validate(req.body);
    if (error) {
      console.log('❌ 驗證失敗:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    console.log('✅ 驗證通過，處理數據:', value);

    const { tournament_id, team_id, name, jersey_number, position, age, is_active } = value;

    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id, tournament_name FROM tournaments WHERE tournament_id = ?',
      [tournament_id]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '指定的錦標賽不存在'
      });
    }

    // 如果指定了隊伍，進行隊伍相關驗證
    if (team_id) {
      // 檢查隊伍是否存在且屬於該錦標賽
      const teams = await query(
        'SELECT team_id, team_name FROM teams WHERE team_id = ? AND tournament_id = ?',
        [team_id, tournament_id]
      );

      if (teams.length === 0) {
        return res.status(404).json({
          success: false,
          message: '指定的隊伍不存在或不屬於該錦標賽'
        });
      }

      // 檢查球衣號碼是否在該錦標賽的隊伍中已存在
      const existingAthletes = await query(
        'SELECT athlete_id FROM athletes WHERE tournament_id = ? AND team_id = ? AND jersey_number = ?',
        [tournament_id, team_id, jersey_number]
      );

      if (existingAthletes.length > 0) {
        return res.status(409).json({
          success: false,
          message: '該球衣號碼在隊伍中已存在'
        });
      }

      // 檢查隊伍結構限制（1名進攻手，最多5名防守員）
      const positionCounts = await query(`
        SELECT position, COUNT(*) as count 
        FROM athletes 
        WHERE tournament_id = ? AND team_id = ? AND is_active = 1 
        GROUP BY position
      `, [tournament_id, team_id]);

      const counts = {
        attacker: 0,
        defender: 0,
        substitute: 0
      };

      positionCounts.forEach(pc => {
        counts[pc.position] = pc.count;
      });

      if (position === 'attacker' && counts.attacker >= 1) {
        return res.status(400).json({
          success: false,
          message: '每支隊伍只能有1名進攻手'
        });
      }

      if (position === 'defender' && counts.defender >= 5) {
        return res.status(400).json({
          success: false,
          message: '每支隊伍最多只能有5名防守員'
        });
      }
    } else {
      // 沒有指定隊伍時，檢查球衣號碼在整個錦標賽中是否唯一（可選邏輯）
      const existingAthletes = await query(
        'SELECT athlete_id FROM athletes WHERE tournament_id = ? AND jersey_number = ? AND team_id IS NOT NULL',
        [tournament_id, jersey_number]
      );

      if (existingAthletes.length > 0) {
        console.log('⚠️ 警告：球衣號碼在錦標賽中已被其他隊伍使用，但允許創建無隊伍運動員');
      }
    }


    // 創建運動員
    console.log('📝 準備插入數據庫:', { team_id, name, jersey_number, position, age, is_active });
    
    // 嘗試插入，如果age字段不存在則添加它
    let result;
    try {
      if (team_id) {
        result = await query(
          'INSERT INTO athletes (tournament_id, team_id, name, jersey_number, position, age, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tournament_id, team_id, name, jersey_number, position, age, is_active]
        );
      } else {
        result = await query(
          'INSERT INTO athletes (tournament_id, name, jersey_number, position, age, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [tournament_id, name, jersey_number, position, age, is_active]
        );
      }
    } catch (insertError) {
      if (insertError.code === 'ER_BAD_FIELD_ERROR' && insertError.message.includes('age')) {
        console.log('🔧 age字段不存在，正在添加...');
        
        // 添加age字段
        await query('ALTER TABLE athletes ADD COLUMN age INT NOT NULL DEFAULT 25');
        console.log('✅ age字段已添加，重新嘗試插入...');
        
        // 重新嘗試插入
        if (team_id) {
          result = await query(
            'INSERT INTO athletes (tournament_id, team_id, name, jersey_number, position, age, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tournament_id, team_id, name, jersey_number, position, age, is_active]
          );
        } else {
          result = await query(
            'INSERT INTO athletes (tournament_id, name, jersey_number, position, age, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            [tournament_id, name, jersey_number, position, age, is_active]
          );
        }
      } else {
        throw insertError; // 重新拋出其他錯誤
      }
    }

    console.log('✅ 運動員創建成功，ID:', result.insertId);

    res.status(201).json({
      success: true,
      message: '運動員創建成功',
      data: {
        athlete_id: result.insertId
      }
    });

  } catch (error) {
    console.error('❌ 創建運動員錯誤:', error);
    console.error('❌ 錯誤詳情:', error.message);
    console.error('❌ SQL錯誤代碼:', error.code);
    
    // 根據不同的錯誤類型返回不同的錯誤信息
    let errorMessage = '創建運動員失敗';
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = '數據庫表不存在，請檢查數據庫初始化';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = '數據庫字段錯誤，請檢查數據庫結構';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = '該球衣號碼在隊伍中已存在';
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = '指定的隊伍不存在';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 更新運動員
router.put('/:id', async (req, res) => {
  try {
    const athleteId = req.params.id;
    
    // 驗證輸入數據
    const { error, value } = athleteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { tournament_id, team_id, name, jersey_number, position, age, is_active } = value;

    // 檢查運動員是否存在
    const existingAthletes = await query(
      'SELECT athlete_id, team_id, tournament_id FROM athletes WHERE athlete_id = ?',
      [athleteId]
    );

    if (existingAthletes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    // 檢查錦標賽是否存在
    const tournaments = await query(
      'SELECT tournament_id FROM tournaments WHERE tournament_id = ?',
      [tournament_id]
    );

    if (tournaments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '指定的錦標賽不存在'
      });
    }

    // 只有當提供了 team_id 時才檢查隊伍是否存在且屬於該錦標賽
    if (team_id) {
      const teams = await query(
        'SELECT team_id FROM teams WHERE team_id = ? AND tournament_id = ?',
        [team_id, tournament_id]
      );

      if (teams.length === 0) {
        return res.status(404).json({
          success: false,
          message: '指定的隊伍不存在或不屬於該錦標賽'
        });
      }
    }

    // 檢查球衣號碼是否與其他運動員重複
    if (team_id) {
      const duplicateAthletes = await query(
        'SELECT athlete_id FROM athletes WHERE tournament_id = ? AND team_id = ? AND jersey_number = ? AND athlete_id != ?',
        [tournament_id, team_id, jersey_number, athleteId]
      );

      if (duplicateAthletes.length > 0) {
        return res.status(409).json({
          success: false,
          message: '該球衣號碼在隊伍中已存在'
        });
      }
    }

    // 如果改變了位置且有隊伍，檢查隊伍結構限制
    if (team_id) {
      const currentAthlete = await query(
        'SELECT position FROM athletes WHERE athlete_id = ?',
        [athleteId]
      );

      if (currentAthlete[0].position !== position) {
        const positionCounts = await query(`
          SELECT position, COUNT(*) as count 
          FROM athletes 
          WHERE tournament_id = ? AND team_id = ? AND is_active = 1 AND athlete_id != ?
          GROUP BY position
        `, [tournament_id, team_id, athleteId]);

        const counts = {
          attacker: 0,
          defender: 0,
          substitute: 0
        };

        positionCounts.forEach(pc => {
          counts[pc.position] = pc.count;
        });

        if (position === 'attacker' && counts.attacker >= 1) {
          return res.status(400).json({
            success: false,
            message: '每支隊伍只能有1名進攻手'
          });
        }

        if (position === 'defender' && counts.defender >= 5) {
          return res.status(400).json({
            success: false,
            message: '每支隊伍最多只能有5名防守員'
          });
        }
      }
    }

    // 更新運動員
    console.log('📝 準備更新運動員:', { athleteId, team_id, name, jersey_number, position, age, is_active });
    
    // 確保 team_id 為 null 而不是 undefined
    const finalTeamId = team_id === undefined ? null : team_id;
    
    await query(
      'UPDATE athletes SET tournament_id = ?, team_id = ?, name = ?, jersey_number = ?, position = ?, age = ?, is_active = ? WHERE athlete_id = ?',
      [tournament_id, finalTeamId, name, jersey_number, position, age, is_active, athleteId]
    );

    console.log('✅ 運動員更新成功');

    res.json({
      success: true,
      message: '運動員更新成功'
    });

  } catch (error) {
    // 根據不同的錯誤類型返回不同的錯誤信息
    let errorMessage = '更新運動員失敗';
    
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = '數據庫字段錯誤，請檢查數據庫結構';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = '該球衣號碼在隊伍中已存在';
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = '指定的隊伍不存在';
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      errorMessage = '輸入的數據過長';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 刪除運動員
router.delete('/:id', async (req, res) => {
  try {
    const athleteId = req.params.id;

    // 檢查運動員是否存在
    const athletes = await query(
      'SELECT athlete_id FROM athletes WHERE athlete_id = ?',
      [athleteId]
    );

    if (athletes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    // 檢查是否有相關的比賽事件
    const events = await query(
      'SELECT event_id FROM match_events WHERE athlete_id = ?',
      [athleteId]
    );

    if (events.length > 0) {
      return res.status(400).json({
        success: false,
        message: '無法刪除運動員，該運動員已參與比賽事件'
      });
    }

    // 刪除運動員
    await query(
      'DELETE FROM athletes WHERE athlete_id = ?',
      [athleteId]
    );

    res.json({
      success: true,
      message: '運動員刪除成功'
    });

  } catch (error) {
    console.error('刪除運動員錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除運動員失敗'
    });
  }
});

// 獲取隊伍的運動員統計
router.get('/team/:teamId/stats', async (req, res) => {
  try {
    const teamId = req.params.teamId;

    // 檢查隊伍是否存在
    const teams = await query(
      'SELECT team_id, team_name FROM teams WHERE team_id = ?',
      [teamId]
    );

    if (teams.length === 0) {
      return res.status(404).json({
        success: false,
        message: '隊伍不存在'
      });
    }

    // 獲取運動員統計
    const stats = await query(`
      SELECT 
        a.athlete_id,
        a.name,
        a.jersey_number,
        a.position,
        COUNT(CASE WHEN me.event_type = 'goal' THEN 1 END) as goals,
        COUNT(CASE WHEN me.event_type = 'foul' THEN 1 END) as fouls,
        COUNT(CASE WHEN me.event_type = 'penalty' THEN 1 END) as penalties,
        COUNT(me.event_id) as total_events
      FROM athletes a
      LEFT JOIN match_events me ON a.athlete_id = me.athlete_id
      WHERE a.team_id = ?
      GROUP BY a.athlete_id
      ORDER BY goals DESC, a.jersey_number
    `, [teamId]);

    // 獲取位置統計
    const positionStats = await query(`
      SELECT 
        position,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM athletes 
      WHERE team_id = ?
      GROUP BY position
    `, [teamId]);

    res.json({
      success: true,
      data: {
        team: teams[0],
        athlete_stats: stats,
        position_stats: positionStats
      }
    });

  } catch (error) {
    console.error('獲取隊伍運動員統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取隊伍運動員統計失敗'
    });
  }
});

// 批量更新運動員狀態
router.patch('/batch/status', async (req, res) => {
  try {
    const { athlete_ids, is_active } = req.body;

    if (!Array.isArray(athlete_ids) || athlete_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '運動員ID列表不能為空'
      });
    }

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '狀態值必須是布爾類型'
      });
    }

    // 批量更新狀態
    const placeholders = athlete_ids.map(() => '?').join(',');
    await query(
      `UPDATE athletes SET is_active = ? WHERE athlete_id IN (${placeholders})`,
      [is_active, ...athlete_ids]
    );

    res.json({
      success: true,
      message: `成功更新${athlete_ids.length}名運動員的狀態`
    });

  } catch (error) {
    console.error('批量更新運動員狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '批量更新運動員狀態失敗'
    });
  }
});

module.exports = router;