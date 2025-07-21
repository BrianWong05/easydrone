const express = require('express');
const Joi = require('joi');
const { query, transaction } = require('../config/database');

const router = express.Router();

// Combined athlete creation schema (creates both global athlete and tournament participation)
const athleteCreateSchema = Joi.object({
  // Global athlete fields
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': '運動員姓名不能為空',
    'string.min': '運動員姓名至少需要2個字符',
    'string.max': '運動員姓名不能超過100個字符',
    'any.required': '運動員姓名是必填項'
  }),
  age: Joi.number().integer().min(16).max(50).required().messages({
    'number.min': '年齡必須在16-50歲之間',
    'number.max': '年齡必須在16-50歲之間',
    'any.required': '年齡是必填項'
  }),
  
  // Tournament participation fields
  tournament_id: Joi.number().integer().required().messages({
    'any.required': '錦標賽ID是必填項'
  }),
  team_id: Joi.number().integer().optional().allow(null).messages({
    'number.base': '隊伍ID必須是數字'
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
  is_active: Joi.boolean().default(true),
  
  // Optional: existing athlete ID (for adding existing athlete to new tournament)
  existing_athlete_id: Joi.number().integer().optional()
});

// Athlete update schema (allows additional fields from frontend)
const athleteUpdateSchema = Joi.object({
  // Global athlete fields
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': '運動員姓名不能為空',
    'string.min': '運動員姓名至少需要2個字符',
    'string.max': '運動員姓名不能超過100個字符',
    'any.required': '運動員姓名是必填項'
  }),
  age: Joi.number().integer().min(16).max(50).required().messages({
    'number.min': '年齡必須在16-50歲之間',
    'number.max': '年齡必須在16-50歲之間',
    'any.required': '年齡是必填項'
  }),
  
  // Tournament participation fields
  tournament_id: Joi.number().integer().optional(), // Optional for updates
  team_id: Joi.number().integer().optional().allow(null).messages({
    'number.base': '隊伍ID必須是數字'
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
  is_active: Joi.boolean().default(true),
  
  // Frontend compatibility fields (ignored but allowed)
  athlete_id: Joi.number().integer().optional(), // Allow but ignore
  global_athlete_id: Joi.number().integer().optional(), // Allow but ignore
  participation_id: Joi.number().integer().optional(), // Allow but ignore
  avatar_url: Joi.string().optional().allow(null, ''), // Allow but ignore
  created_at: Joi.date().optional(), // Allow but ignore
  updated_at: Joi.date().optional() // Allow but ignore
});

// Get athletes for a specific tournament (backward compatible)
router.get('/', async (req, res) => {
  try {
    console.log('👥 開始獲取運動員列表...');
    const { tournament_id, team_id, position, is_active, search, page = 1, limit = 20 } = req.query;
    console.log('👥 查詢參數:', { tournament_id, team_id, position, is_active, search, page, limit });
    
    if (!tournament_id) {
      return res.status(400).json({
        success: false,
        message: '錦標賽ID是必填參數'
      });
    }

    let sql = `
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
      LEFT JOIN team_groups tg ON t.group_id = tg.group_id
      WHERE ta.tournament_id = ?
    `;
    const params = [tournament_id];

    // Apply filters
    if (team_id) {
      sql += ' AND ta.team_id = ?';
      params.push(team_id);
    }

    if (position) {
      sql += ' AND ta.position = ?';
      params.push(position);
    }

    if (is_active !== undefined) {
      sql += ' AND ta.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (search) {
      sql += ' AND ga.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY COALESCE(t.team_name, "無隊伍") ASC, ta.jersey_number ASC';

    // Pagination
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const athletes = await query(sql, params);
    console.log('👥 獲取到的運動員數據:', athletes.length);

    // Clean up team names by removing tournament ID suffix
    athletes.forEach(athlete => {
      if (athlete.team_name) {
        // Remove tournament ID suffix: "TeamName_123" -> "TeamName"
        // Only remove if the suffix matches the current tournament ID
        const suffix = `_${tournament_id}`;
        if (athlete.team_name.endsWith(suffix)) {
          athlete.team_name = athlete.team_name.slice(0, -suffix.length);
        }
      }
    });

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total 
      FROM tournament_athletes ta 
      JOIN global_athletes ga ON ta.athlete_id = ga.athlete_id
      LEFT JOIN teams t ON ta.team_id = t.team_id 
      WHERE ta.tournament_id = ?
    `;
    const countParams = [tournament_id];
    
    if (team_id) {
      countSql += ' AND ta.team_id = ?';
      countParams.push(team_id);
    }
    if (position) {
      countSql += ' AND ta.position = ?';
      countParams.push(position);
    }
    if (is_active !== undefined) {
      countSql += ' AND ta.is_active = ?';
      countParams.push(is_active === 'true' ? 1 : 0);
    }
    if (search) {
      countSql += ' AND ga.name LIKE ?';
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

// Get single athlete details (by participation_id for backward compatibility)
router.get('/:id', async (req, res) => {
  try {
    const participationId = req.params.id;
    console.log('👤 獲取運動員詳情，參與ID:', participationId);

    const athletes = await query(`
      SELECT 
        ta.participation_id as athlete_id,
        ga.athlete_id as global_athlete_id,
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
      LEFT JOIN team_groups tg ON t.group_id = tg.group_id
      WHERE ta.participation_id = ?
    `, [participationId]);

    if (athletes.length === 0) {
      console.log('❌ 運動員不存在，參與ID:', participationId);
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    // Clean up team name by removing tournament ID suffix
    const athlete = athletes[0];
    if (athlete.team_name) {
      // Remove tournament ID suffix: "TeamName_123" -> "TeamName"
      // Only remove if the suffix matches the current tournament ID
      const suffix = `_${athlete.tournament_id}`;
      if (athlete.team_name.endsWith(suffix)) {
        athlete.team_name = athlete.team_name.slice(0, -suffix.length);
      }
    }

    console.log('✅ 找到運動員:', athlete.name);

    // Get match events for this participation
    const events = await query(`
      SELECT me.*, m.match_number, m.match_date,
             t1.team_name as team1_name, t2.team_name as team2_name
      FROM match_events me
      JOIN matches m ON me.match_id = m.match_id
      JOIN teams t1 ON m.team1_id = t1.team_id
      JOIN teams t2 ON m.team2_id = t2.team_id
      WHERE me.participation_id = ?
      ORDER BY m.match_date DESC, me.event_time DESC
    `, [participationId]);

    // Clean up team names in events
    events.forEach(event => {
      if (event.team1_name) {
        const suffix = `_${athlete.tournament_id}`;
        if (event.team1_name.endsWith(suffix)) {
          event.team1_name = event.team1_name.slice(0, -suffix.length);
        }
      }
      if (event.team2_name) {
        const suffix = `_${athlete.tournament_id}`;
        if (event.team2_name.endsWith(suffix)) {
          event.team2_name = event.team2_name.slice(0, -suffix.length);
        }
      }
    });

    console.log('📊 找到比賽事件數量:', events.length);

    res.json({
      success: true,
      data: {
        athlete: athlete,
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

// Create athlete (can create new global athlete or add existing to tournament)
router.post('/', async (req, res) => {
  try {
    console.log('👤 收到創建運動員請求:', req.body);
    
    const { error, value } = athleteCreateSchema.validate(req.body);
    if (error) {
      console.log('❌ 驗證失敗:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    
    console.log('✅ 驗證通過，處理數據:', value);

    const { 
      name, age, tournament_id, team_id, jersey_number, 
      position, is_active, existing_athlete_id 
    } = value;

    // Start transaction
    const result = await transaction(async (conn) => {
      let athleteId;

      if (existing_athlete_id) {
        // Adding existing athlete to new tournament
        athleteId = existing_athlete_id;
        
        // Verify athlete exists
        const [existingAthlete] = await conn.execute(
          'SELECT athlete_id FROM global_athletes WHERE athlete_id = ?',
          [athleteId]
        );
        
        if (existingAthlete.length === 0) {
          throw new Error('指定的運動員不存在');
        }
      } else {
        // Create new global athlete
        const [athleteResult] = await conn.execute(
          'INSERT INTO global_athletes (name, age) VALUES (?, ?)',
          [name, age]
        );
        athleteId = athleteResult.insertId;
        console.log('✅ 創建全局運動員成功，ID:', athleteId);
      }

      // Check if athlete already participates in this tournament
      const [existingParticipation] = await conn.execute(
        'SELECT participation_id FROM tournament_athletes WHERE athlete_id = ? AND tournament_id = ?',
        [athleteId, tournament_id]
      );

      if (existingParticipation.length > 0) {
        throw new Error('運動員已參與此錦標賽');
      }

      // Validate tournament and team constraints
      if (team_id) {
        // Check team exists and belongs to tournament
        const [teams] = await conn.execute(
          'SELECT team_id FROM teams WHERE team_id = ? AND tournament_id = ?',
          [team_id, tournament_id]
        );

        if (teams.length === 0) {
          throw new Error('指定的隊伍不存在或不屬於該錦標賽');
        }

        // Check jersey number uniqueness
        const [jerseyCheck] = await conn.execute(
          'SELECT participation_id FROM tournament_athletes WHERE tournament_id = ? AND team_id = ? AND jersey_number = ?',
          [tournament_id, team_id, jersey_number]
        );

        if (jerseyCheck.length > 0) {
          throw new Error('該球衣號碼在隊伍中已存在');
        }

        // Check team composition limits
        const [positionCounts] = await conn.execute(`
          SELECT position, COUNT(*) as count 
          FROM tournament_athletes 
          WHERE tournament_id = ? AND team_id = ? AND is_active = 1 
          GROUP BY position
        `, [tournament_id, team_id]);

        const counts = { attacker: 0, defender: 0, substitute: 0 };
        positionCounts.forEach(pc => {
          counts[pc.position] = pc.count;
        });

        if (position === 'attacker' && counts.attacker >= 1) {
          throw new Error('每支隊伍只能有1名進攻手');
        }

        if (position === 'defender' && counts.defender >= 5) {
          throw new Error('每支隊伍最多只能有5名防守員');
        }
      }

      // Create tournament participation
      const [participationResult] = await conn.execute(
        'INSERT INTO tournament_athletes (athlete_id, tournament_id, team_id, jersey_number, position, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [athleteId, tournament_id, team_id || null, jersey_number, position, is_active]
      );

      console.log('✅ 運動員創建/加入錦標賽成功，參與ID:', participationResult.insertId);

      return {
        athlete_id: participationResult.insertId, // Return participation_id for backward compatibility
        global_athlete_id: athleteId,
        participation_id: participationResult.insertId
      };
    });

    res.status(201).json({
      success: true,
      message: existing_athlete_id ? '運動員成功加入錦標賽' : '運動員創建成功',
      data: result
    });

  } catch (error) {
    console.error('❌ 創建運動員錯誤:', error);
    
    let errorMessage = '創建運動員失敗';
    let statusCode = 500;
    
    if (error.message === '指定的運動員不存在') {
      errorMessage = error.message;
      statusCode = 404;
    } else if (error.message === '運動員已參與此錦標賽') {
      errorMessage = error.message;
      statusCode = 409;
    } else if (error.message === '指定的隊伍不存在或不屬於該錦標賽') {
      errorMessage = error.message;
      statusCode = 404;
    } else if (error.message === '該球衣號碼在隊伍中已存在') {
      errorMessage = error.message;
      statusCode = 409;
    } else if (error.message === '每支隊伍只能有1名進攻手' || error.message === '每支隊伍最多只能有5名防守員') {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = '該球衣號碼在隊伍中已存在';
      statusCode = 409;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update athlete participation
router.put('/:id', async (req, res) => {
  try {
    const participationId = req.params.id;
    
    // Get current participation info
    const currentParticipation = await query(
      'SELECT * FROM tournament_athletes WHERE participation_id = ?',
      [participationId]
    );

    if (currentParticipation.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員參與記錄不存在'
      });
    }

    const current = currentParticipation[0];
    
    // Validate update data
    const { error, value } = athleteUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, age, team_id, jersey_number, position, is_active } = value;

    // Start transaction
    await transaction(async (conn) => {
      // Update global athlete info
      await conn.execute(
        'UPDATE global_athletes SET name = ?, age = ? WHERE athlete_id = ?',
        [name, age, current.athlete_id]
      );

      // Validate team and jersey constraints
      if (team_id) {
        const [jerseyCheck] = await conn.execute(
          'SELECT participation_id FROM tournament_athletes WHERE tournament_id = ? AND team_id = ? AND jersey_number = ? AND participation_id != ?',
          [current.tournament_id, team_id, jersey_number, participationId]
        );

        if (jerseyCheck.length > 0) {
          throw new Error('該球衣號碼在隊伍中已存在');
        }
      }

      // Update tournament participation
      await conn.execute(
        'UPDATE tournament_athletes SET team_id = ?, jersey_number = ?, position = ?, is_active = ? WHERE participation_id = ?',
        [team_id || null, jersey_number, position, is_active, participationId]
      );

      console.log('✅ 運動員更新成功');
    });

    res.json({
      success: true,
      message: '運動員更新成功'
    });

  } catch (error) {
    console.error('更新運動員錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新運動員失敗'
    });
  }
});

// Delete athlete participation (remove from tournament)
router.delete('/:id', async (req, res) => {
  try {
    const participationId = req.params.id;

    // Check if participation exists
    const participation = await query(
      'SELECT * FROM tournament_athletes WHERE participation_id = ?',
      [participationId]
    );

    if (participation.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員參與記錄不存在'
      });
    }

    // Check for match events
    const events = await query(
      'SELECT event_id FROM match_events WHERE participation_id = ?',
      [participationId]
    );

    if (events.length > 0) {
      return res.status(400).json({
        success: false,
        message: '無法刪除運動員，該運動員已參與比賽事件'
      });
    }

    // Delete participation
    await query(
      'DELETE FROM tournament_athletes WHERE participation_id = ?',
      [participationId]
    );

    res.json({
      success: true,
      message: '運動員已從錦標賽中移除'
    });

  } catch (error) {
    console.error('刪除運動員錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除運動員失敗'
    });
  }
});

// Get team athlete stats (backward compatible)
router.get('/team/:teamId/stats', async (req, res) => {
  try {
    const teamId = req.params.teamId;

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

    // Get athlete stats using new structure
    const stats = await query(`
      SELECT 
        ta.participation_id as athlete_id,
        ga.name,
        ta.jersey_number,
        ta.position,
        COUNT(CASE WHEN me.event_type = 'goal' THEN 1 END) as goals,
        COUNT(CASE WHEN me.event_type = 'foul' THEN 1 END) as fouls,
        COUNT(CASE WHEN me.event_type = 'penalty' THEN 1 END) as penalties,
        COUNT(me.event_id) as total_events
      FROM tournament_athletes ta
      JOIN global_athletes ga ON ta.athlete_id = ga.athlete_id
      LEFT JOIN match_events me ON ta.participation_id = me.participation_id
      WHERE ta.team_id = ?
      GROUP BY ta.participation_id
      ORDER BY goals DESC, ta.jersey_number
    `, [teamId]);

    // Get position stats
    const positionStats = await query(`
      SELECT 
        position,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count
      FROM tournament_athletes 
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

module.exports = router;