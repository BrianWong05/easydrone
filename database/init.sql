-- 創建數據庫（如果不存在）
CREATE DATABASE IF NOT EXISTS drone_soccer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE drone_soccer;

-- 管理員表
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 比賽類型表 (必須先創建，因為其他表會引用它)
CREATE TABLE IF NOT EXISTS tournaments (
    tournament_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_name VARCHAR(100) NOT NULL,
    tournament_type ENUM('group', 'knockout', 'mixed') NOT NULL,
    start_date DATE,
    end_date DATE,
    status ENUM('pending', 'active', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 小組表 (錦標賽範圍)
CREATE TABLE IF NOT EXISTS team_groups (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,
    max_teams INT DEFAULT 4 NOT NULL,
    tournament_id INT NULL,
    display_name VARCHAR(10) NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_group (tournament_id, group_name),
    INDEX idx_team_groups_tournament_id (tournament_id)
);

-- 隊伍表 (錦標賽範圍)
CREATE TABLE IF NOT EXISTS teams (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    group_id INT NULL,
    team_color VARCHAR(20) DEFAULT '#FFFFFF',
    is_virtual TINYINT(1) DEFAULT 0,
    description TEXT NULL COMMENT '隊伍描述',
    tournament_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES team_groups(group_id) ON DELETE SET NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_team (tournament_id, team_name),
    INDEX idx_teams_tournament_id (tournament_id)
) COMMENT = '隊伍表 - 包含隊伍基本信息和描述';

-- 運動員表 - 無人機足球隊伍結構：1名進攻手，3-5名防守人員
CREATE TABLE IF NOT EXISTS athletes (
    athlete_id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    jersey_number INT NOT NULL,
    position ENUM('attacker', 'defender', 'substitute') NOT NULL,
    age INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    UNIQUE KEY (team_id, jersey_number)
);

-- 比賽表
CREATE TABLE IF NOT EXISTS matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    match_number VARCHAR(50) NOT NULL,
    team1_id INT NULL,
    team2_id INT NULL,
    team1_score INT DEFAULT 0,
    team2_score INT DEFAULT 0,
    team1_fouls INT DEFAULT 0,
    team2_fouls INT DEFAULT 0,
    match_date DATETIME NOT NULL,
    match_time INT DEFAULT 600, -- Time in seconds (600 = 10 minutes)
    start_time DATETIME NULL,
    end_time DATETIME NULL,
    match_status ENUM('pending', 'active', 'overtime', 'completed', 'postponed') DEFAULT 'pending',
    match_type VARCHAR(50) NULL,
    tournament_stage VARCHAR(50) NULL,
    group_id INT NULL,
    tournament_id INT NULL,
    winner_id INT NULL,
    win_reason ENUM('score', 'fouls', 'draw', 'referee') DEFAULT NULL,
    overtime_time INT NULL,
    overtime_start_time DATETIME NULL,
    referee_decision TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team1_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    FOREIGN KEY (team2_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    FOREIGN KEY (group_id) REFERENCES team_groups(group_id) ON DELETE SET NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    INDEX idx_matches_tournament_id (tournament_id)
);

-- 比賽事件表
CREATE TABLE IF NOT EXISTS match_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    team_id INT NOT NULL,
    athlete_id INT NULL,
    event_type ENUM('goal', 'foul', 'timeout', 'penalty', 'substitution', 'other') NOT NULL,
    event_time TIME NOT NULL,
    period INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (athlete_id) REFERENCES athletes(athlete_id) ON DELETE SET NULL
);

-- 小組積分表 (錦標賽範圍)
CREATE TABLE IF NOT EXISTS group_standings (
    standing_id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    team_id INT NOT NULL,
    tournament_id INT NULL,
    played INT DEFAULT 0,
    won INT DEFAULT 0,
    drawn INT DEFAULT 0,
    lost INT DEFAULT 0,
    goals_for INT DEFAULT 0,
    goals_against INT DEFAULT 0,
    points INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES team_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE,
    UNIQUE KEY unique_tournament_group_team (tournament_id, group_id, team_id),
    INDEX idx_group_standings_tournament_id (tournament_id)
);

-- 淘汰賽結構表
CREATE TABLE IF NOT EXISTS knockout_brackets (
    bracket_id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NULL,
    match_id INT NULL,
    round_number INT NOT NULL,
    position_in_round INT NOT NULL,
    next_match_id INT NULL,
    is_winner_bracket BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (next_match_id) REFERENCES matches(match_id) ON DELETE SET NULL
);

-- 插入默認管理員賬號 (密碼: admin123)
INSERT IGNORE INTO admins (username, password, email) VALUES 
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@dronesoccer.com');

-- 初始化小組積分表 (錦標賽範圍)
INSERT INTO group_standings (group_id, team_id, tournament_id) 
SELECT g.group_id, t.team_id, t.tournament_id 
FROM team_groups g 
JOIN teams t ON g.group_id = t.group_id 
WHERE t.tournament_id IS NOT NULL;

-- 創建觸發器來自動更新小組積分表
DELIMITER $$

CREATE TRIGGER update_group_standings_after_match_update
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    -- 只在比賽狀態變為completed或結果發生變化時觸發
    IF (NEW.match_status = 'completed' AND OLD.match_status != 'completed') OR
       (NEW.match_status = 'completed' AND (
           OLD.team1_score != NEW.team1_score OR 
           OLD.team2_score != NEW.team2_score OR 
           OLD.winner_id != NEW.winner_id
       )) THEN
        
        -- 如果是小組賽且有小組ID
        IF NEW.group_id IS NOT NULL AND NEW.tournament_id IS NOT NULL THEN
            -- 重新計算整個小組的積分表
            CALL recalculate_group_standings(NEW.group_id, NEW.tournament_id);
        END IF;
    END IF;
END$$

-- 創建存儲過程來重新計算小組積分
CREATE PROCEDURE recalculate_group_standings(IN p_group_id INT, IN p_tournament_id INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_team_id INT;
    DECLARE v_played, v_won, v_drawn, v_lost, v_goals_for, v_goals_against, v_points INT DEFAULT 0;
    
    -- 游標來遍歷小組中的所有隊伍
    DECLARE team_cursor CURSOR FOR 
        SELECT team_id FROM teams WHERE group_id = p_group_id AND tournament_id = p_tournament_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- 重置所有隊伍的積分
    UPDATE group_standings 
    SET played = 0, won = 0, drawn = 0, lost = 0, 
        goals_for = 0, goals_against = 0, points = 0
    WHERE group_id = p_group_id AND tournament_id = p_tournament_id;
    
    -- 為每支隊伍重新計算積分
    OPEN team_cursor;
    team_loop: LOOP
        FETCH team_cursor INTO v_team_id;
        IF done THEN
            LEAVE team_loop;
        END IF;
        
        -- 重置變量
        SET v_played = 0, v_won = 0, v_drawn = 0, v_lost = 0;
        SET v_goals_for = 0, v_goals_against = 0, v_points = 0;
        
        -- 計算該隊伍作為team1的比賽
        SELECT 
            COUNT(*),
            COALESCE(SUM(team1_score), 0),
            COALESCE(SUM(team2_score), 0),
            COALESCE(SUM(CASE WHEN winner_id = team1_id THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN winner_id = team2_id THEN 1 ELSE 0 END), 0)
        INTO v_played, v_goals_for, v_goals_against, v_won, v_drawn, v_lost
        FROM matches 
        WHERE team1_id = v_team_id AND group_id = p_group_id AND tournament_id = p_tournament_id AND match_status = 'completed';
        
        -- 計算該隊伍作為team2的比賽並累加
        SELECT 
            v_played + COUNT(*),
            v_goals_for + COALESCE(SUM(team2_score), 0),
            v_goals_against + COALESCE(SUM(team1_score), 0),
            v_won + COALESCE(SUM(CASE WHEN winner_id = team2_id THEN 1 ELSE 0 END), 0),
            v_drawn + COALESCE(SUM(CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END), 0),
            v_lost + COALESCE(SUM(CASE WHEN winner_id = team1_id THEN 1 ELSE 0 END), 0)
        INTO v_played, v_goals_for, v_goals_against, v_won, v_drawn, v_lost
        FROM matches 
        WHERE team2_id = v_team_id AND group_id = p_group_id AND tournament_id = p_tournament_id AND match_status = 'completed';
        
        -- 計算積分
        SET v_points = v_won * 3 + v_drawn * 1;
        
        -- 更新積分表
        UPDATE group_standings 
        SET played = v_played, won = v_won, drawn = v_drawn, lost = v_lost,
            goals_for = v_goals_for, goals_against = v_goals_against, points = v_points
        WHERE team_id = v_team_id AND group_id = p_group_id AND tournament_id = p_tournament_id;
        
    END LOOP;
    CLOSE team_cursor;
END$$

DELIMITER ;

-- Create best_teams_cache table for storing calculated stats for public display
CREATE TABLE IF NOT EXISTS best_teams_cache (
  cache_id INT AUTO_INCREMENT PRIMARY KEY,
  tournament_id INT,
  stats_data JSON NOT NULL,
  is_public TINYINT(1) DEFAULT 1 COMMENT 'Whether the stats are visible to public clients (1=visible, 0=hidden)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_tournament_id (tournament_id),
  INDEX idx_is_public (is_public),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(tournament_id) ON DELETE CASCADE
);

-- Add some sample data or leave empty for first calculation
-- The table will be populated when admin calculates stats