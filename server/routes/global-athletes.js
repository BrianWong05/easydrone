const express = require('express');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { uploadAvatar, handleUploadError, isMulterAvailable } = require('../middleware/upload');

const router = express.Router();

// Global athlete schema (for creating/updating master athlete records)
const globalAthleteSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': '運動員姓名不能為空',
    'string.min': '運動員姓名至少需要2個字符',
    'string.max': '運動員姓名不能超過100個字符',
    'any.required': '運動員姓名是必填項'
  }),
  age: Joi.number().integer().required().messages({
    'any.required': '年齡是必填項'
  }),
  avatar_url: Joi.string().uri().optional().allow(null, '')
});

// Tournament participation schema
const participationSchema = Joi.object({
  athlete_id: Joi.number().integer().required().messages({
    'any.required': '運動員ID是必填項'
  }),
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
  is_active: Joi.boolean().default(true)
});

// Get all global athletes
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    
    let sql = `
      SELECT ga.*, 
             COUNT(ta.tournament_id) as tournaments_count,
             GROUP_CONCAT(DISTINCT t.tournament_name SEPARATOR ', ') as tournaments
      FROM global_athletes ga
      LEFT JOIN tournament_athletes ta ON ga.athlete_id = ta.athlete_id
      LEFT JOIN tournaments t ON ta.tournament_id = t.tournament_id
      WHERE 1=1
    `;
    const params = [];

    // Search by name
    if (search) {
      sql += ' AND ga.name LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' GROUP BY ga.athlete_id ORDER BY ga.name ASC';

    // Pagination
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const athletes = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM global_athletes ga WHERE 1=1';
    const countParams = [];
    
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
    console.error('獲取全局運動員列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取運動員列表失敗'
    });
  }
});

// Get single global athlete with all tournament participations
router.get('/:id', async (req, res) => {
  try {
    const athleteId = req.params.id;

    // Get global athlete info
    const athletes = await query(
      'SELECT * FROM global_athletes WHERE athlete_id = ?',
      [athleteId]
    );

    if (athletes.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    // Get all tournament participations
    const participations = await query(`
      SELECT ta.*, t.tournament_name, tm.team_name, tm.team_color, tg.group_name
      FROM tournament_athletes ta
      JOIN tournaments t ON ta.tournament_id = t.tournament_id
      LEFT JOIN teams tm ON ta.team_id = tm.team_id
      LEFT JOIN team_groups tg ON tm.group_id = tg.group_id
      WHERE ta.athlete_id = ?
      ORDER BY ta.joined_at DESC
    `, [athleteId]);

    res.json({
      success: true,
      data: {
        athlete: athletes[0],
        participations
      }
    });

  } catch (error) {
    console.error('獲取運動員詳情錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取運動員詳情失敗'
    });
  }
});

// Create new global athlete
router.post('/', async (req, res) => {
  try {
    const { error, value } = globalAthleteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, age, avatar_url } = value;

    // Convert undefined avatar_url to null for database
    const avatarUrlForDb = avatar_url === undefined ? null : avatar_url;

    const result = await query(
      'INSERT INTO global_athletes (name, age, avatar_url) VALUES (?, ?, ?)',
      [name, age, avatarUrlForDb]
    );

    res.status(201).json({
      success: true,
      message: '運動員創建成功',
      data: {
        athlete_id: result.insertId
      }
    });

  } catch (error) {
    console.error('創建運動員錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建運動員失敗'
    });
  }
});

// Update global athlete
router.put('/:id', async (req, res) => {
  try {
    const athleteId = req.params.id;
    const { error, value } = globalAthleteSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, age, avatar_url } = value;

    // Check if athlete exists and get current data
    const existing = await query(
      'SELECT athlete_id, avatar_url FROM global_athletes WHERE athlete_id = ?',
      [athleteId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    // Preserve existing avatar_url if no new one is provided
    const avatarUrlForDb = avatar_url === undefined ? existing[0].avatar_url : avatar_url;

    await query(
      'UPDATE global_athletes SET name = ?, age = ?, avatar_url = ? WHERE athlete_id = ?',
      [name, age, avatarUrlForDb, athleteId]
    );

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

// Add athlete to tournament (create participation)
router.post('/:id/tournaments/:tournamentId', async (req, res) => {
  try {
    const athleteId = req.params.id;
    const tournamentId = req.params.tournamentId;
    
    const participationData = {
      athlete_id: parseInt(athleteId),
      tournament_id: parseInt(tournamentId),
      ...req.body
    };

    const { error, value } = participationSchema.validate(participationData);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { team_id, jersey_number, position, is_active } = value;

    // Convert undefined team_id to null for database
    const teamIdForDb = team_id === undefined ? null : team_id;

    // Check if athlete already participates in this tournament
    const existing = await query(
      'SELECT participation_id FROM tournament_athletes WHERE athlete_id = ? AND tournament_id = ?',
      [athleteId, tournamentId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '運動員已參與此錦標賽'
      });
    }

    // Check jersey number uniqueness within team
    if (teamIdForDb) {
      const jerseyCheck = await query(
        'SELECT participation_id FROM tournament_athletes WHERE tournament_id = ? AND team_id = ? AND jersey_number = ?',
        [tournamentId, teamIdForDb, jersey_number]
      );

      if (jerseyCheck.length > 0) {
        return res.status(409).json({
          success: false,
          message: '該球衣號碼在隊伍中已存在'
        });
      }

      // Check team composition limits
      const positionCounts = await query(`
        SELECT position, COUNT(*) as count 
        FROM tournament_athletes 
        WHERE tournament_id = ? AND team_id = ? AND is_active = 1 
        GROUP BY position
      `, [tournamentId, teamIdForDb]);

      const counts = { attacker: 0, defender: 0, substitute: 0 };
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

    const result = await query(
      'INSERT INTO tournament_athletes (athlete_id, tournament_id, team_id, jersey_number, position, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [athleteId, tournamentId, teamIdForDb, jersey_number, position, is_active]
    );

    res.status(201).json({
      success: true,
      message: '運動員成功加入錦標賽',
      data: {
        participation_id: result.insertId
      }
    });

  } catch (error) {
    console.error('運動員加入錦標賽錯誤:', error);
    res.status(500).json({
      success: false,
      message: '運動員加入錦標賽失敗'
    });
  }
});

// Update athlete participation in tournament
router.put('/:id/tournaments/:tournamentId', async (req, res) => {
  try {
    const athleteId = req.params.id;
    const tournamentId = req.params.tournamentId;
    
    const participationData = {
      athlete_id: parseInt(athleteId),
      tournament_id: parseInt(tournamentId),
      ...req.body
    };

    const { error, value } = participationSchema.validate(participationData);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { team_id, jersey_number, position, is_active } = value;

    // Check if participation exists
    const existing = await query(
      'SELECT participation_id FROM tournament_athletes WHERE athlete_id = ? AND tournament_id = ?',
      [athleteId, tournamentId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員未參與此錦標賽'
      });
    }

    // Check jersey number uniqueness (excluding current participation)
    if (team_id) {
      const jerseyCheck = await query(
        'SELECT participation_id FROM tournament_athletes WHERE tournament_id = ? AND team_id = ? AND jersey_number = ? AND athlete_id != ?',
        [tournamentId, team_id, jersey_number, athleteId]
      );

      if (jerseyCheck.length > 0) {
        return res.status(409).json({
          success: false,
          message: '該球衣號碼在隊伍中已存在'
        });
      }
    }

    await query(
      'UPDATE tournament_athletes SET team_id = ?, jersey_number = ?, position = ?, is_active = ? WHERE athlete_id = ? AND tournament_id = ?',
      [team_id, jersey_number, position, is_active, athleteId, tournamentId]
    );

    res.json({
      success: true,
      message: '運動員錦標賽參與信息更新成功'
    });

  } catch (error) {
    console.error('更新運動員錦標賽參與錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新失敗'
    });
  }
});

// Remove athlete from tournament
router.delete('/:id/tournaments/:tournamentId', async (req, res) => {
  try {
    const athleteId = req.params.id;
    const tournamentId = req.params.tournamentId;

    // Check if participation exists
    const existing = await query(
      'SELECT participation_id FROM tournament_athletes WHERE athlete_id = ? AND tournament_id = ?',
      [athleteId, tournamentId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員未參與此錦標賽'
      });
    }

    // Check for match events
    const events = await query(
      'SELECT event_id FROM match_events WHERE participation_id = ?',
      [existing[0].participation_id]
    );

    if (events.length > 0) {
      return res.status(400).json({
        success: false,
        message: '無法移除運動員，該運動員已參與比賽事件'
      });
    }

    await query(
      'DELETE FROM tournament_athletes WHERE athlete_id = ? AND tournament_id = ?',
      [athleteId, tournamentId]
    );

    res.json({
      success: true,
      message: '運動員已從錦標賽中移除'
    });

  } catch (error) {
    console.error('移除運動員錯誤:', error);
    res.status(500).json({
      success: false,
      message: '移除運動員失敗'
    });
  }
});

// Upload avatar for global athlete
router.post('/:id/avatar', (req, res) => {
  if (!isMulterAvailable()) {
    return res.status(503).json({
      success: false,
      message: '文件上傳服務暫時不可用，請稍後再試'
    });
  }

  uploadAvatar(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res);
    }

    try {
      const athleteId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '請選擇要上傳的圖片文件'
        });
      }

      // Check if athlete exists
      const athlete = await query(
        'SELECT athlete_id, avatar_url FROM global_athletes WHERE athlete_id = ?',
        [athleteId]
      );

      if (athlete.length === 0) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({
          success: false,
          message: '運動員不存在'
        });
      }

      // Delete old avatar file if exists
      if (athlete[0].avatar_url) {
        const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(athlete[0].avatar_url));
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      const avatarUrl = `/api/uploads/avatars/${req.file.filename}`;

      await query(
        'UPDATE global_athletes SET avatar_url = ? WHERE athlete_id = ?',
        [avatarUrl, athleteId]
      );

      res.json({
        success: true,
        message: '頭像上傳成功',
        data: {
          avatar_url: avatarUrl,
          filename: req.file.filename
        }
      });

    } catch (error) {
      console.error('上傳頭像錯誤:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: '頭像上傳失敗'
      });
    }
  });
});

// Delete avatar for global athlete
router.delete('/:id/avatar', async (req, res) => {
  try {
    const athleteId = req.params.id;

    // Check if athlete exists and get current avatar
    const athlete = await query(
      'SELECT athlete_id, avatar_url FROM global_athletes WHERE athlete_id = ?',
      [athleteId]
    );

    if (athlete.length === 0) {
      return res.status(404).json({
        success: false,
        message: '運動員不存在'
      });
    }

    // Delete avatar file if exists
    if (athlete[0].avatar_url) {
      const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(athlete[0].avatar_url));
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Update database to remove avatar URL
    await query(
      'UPDATE global_athletes SET avatar_url = NULL WHERE athlete_id = ?',
      [athleteId]
    );

    res.json({
      success: true,
      message: '頭像刪除成功'
    });

  } catch (error) {
    console.error('刪除頭像錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除頭像失敗'
    });
  }
});

module.exports = router;