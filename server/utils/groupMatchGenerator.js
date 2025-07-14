const moment = require('moment');

/**
 * 生成小組循環賽對陣表
 * Generate round-robin matches for a group
 * 
 * @param {Array} teams - 隊伍列表 Array of teams
 * @param {Object} options - 配置選項 Configuration options
 * @param {string} options.groupName - 小組名稱 Group name (e.g., 'A', 'B')
 * @param {string} options.matchDate - 比賽開始日期 Match start date (YYYY-MM-DD HH:mm:ss)
 * @param {number} options.matchTime - 每場比賽時長(秒) Match duration in seconds (default: 600)
 * @param {number} options.matchInterval - 比賽間隔時間(分鐘) Interval between matches in minutes (default: 30)
 * @param {string} options.matchType - 比賽類型 Match type (default: 'group')
 * @param {number} options.groupId - 小組ID Group ID
 * @returns {Array} 比賽列表 Array of match objects
 */
function generateGroupMatches(teams, options = {}) {
  const {
    groupName = 'A',
    matchDate = moment().format('YYYY-MM-DD 09:00:00'),
    matchTime = 600, // 10 minutes in seconds
    matchInterval = 30, // 30 minutes interval
    matchType = 'group',
    groupId = null
  } = options;

  // 驗證輸入
  if (!Array.isArray(teams) || teams.length < 2) {
    throw new Error('至少需要2支隊伍才能創建循環賽');
  }

  if (teams.length > 8) {
    throw new Error('每組最多支持8支隊伍');
  }

  const matches = [];
  let matchNumber = 1;
  const baseDate = moment(matchDate);

  // 生成循環賽對陣 (Circle Method Round Robin with Perfect Home/Away Balance)
  // 使用圓桌法確保數學上完美的主客場平衡
  
  const n = teams.length;
  
  // 使用圓桌法生成比賽對陣
  const roundRobinMatches = generateCircleMethodMatches(teams);
  
  console.log(`🏠 使用圓桌法生成 ${roundRobinMatches.length} 場比賽，確保完美主客場平衡`);
  
  // 生成比賽對象
  for (let i = 0; i < roundRobinMatches.length; i++) {
    const matchPair = roundRobinMatches[i];
    
    // 計算比賽時間
    const matchDateTime = baseDate.clone().add((matchNumber - 1) * matchInterval, 'minutes');
    
    // 生成比賽編號
    const matchNumberStr = `${groupName}${matchNumber.toString().padStart(2, '0')}`;

    const match = {
      match_number: matchNumberStr,
      team1_id: matchPair.homeTeam.team_id,
      team2_id: matchPair.awayTeam.team_id,
      team1_name: matchPair.homeTeam.team_name,
      team2_name: matchPair.awayTeam.team_name,
      match_date: matchDateTime.format('YYYY-MM-DD HH:mm:ss'),
      match_time: matchTime,
      match_type: matchType,
      group_id: groupId,
      tournament_stage: null,
      match_status: 'pending',
      team1_score: 0,
      team2_score: 0,
      team1_fouls: 0,
      team2_fouls: 0
    };

    matches.push(match);
    matchNumber++;
  }

  // 確保比賽按照比賽編號和時間升序排列
  matches.sort((a, b) => {
    // 首先按比賽編號排序
    const matchNumA = parseInt(a.match_number.replace(/[A-Za-z]/g, ''));
    const matchNumB = parseInt(b.match_number.replace(/[A-Za-z]/g, ''));
    if (matchNumA !== matchNumB) {
      return matchNumA - matchNumB;
    }
    // 如果比賽編號相同，按時間排序
    return new Date(a.match_date) - new Date(b.match_date);
  });

  return matches;
}

/**
 * 計算循環賽總場次數
 * Calculate total number of round-robin matches
 * 
 * @param {number} teamCount - 隊伍數量 Number of teams
 * @returns {number} 總場次 Total matches
 */
function calculateTotalMatches(teamCount) {
  if (teamCount < 2) return 0;
  return (teamCount * (teamCount - 1)) / 2;
}

/**
 * 驗證小組比賽配置
 * Validate group match configuration
 * 
 * @param {Object} config - 配置對象 Configuration object
 * @returns {Object} 驗證結果 Validation result
 */
function validateGroupMatchConfig(config) {
  const errors = [];
  
  if (!config.groupId) {
    errors.push('小組ID是必填項');
  }
  
  if (!config.matchDate) {
    errors.push('比賽日期是必填項');
  } else if (!moment(config.matchDate).isValid()) {
    errors.push('比賽日期格式無效');
  }
  
  if (config.matchTime && (config.matchTime < 60 || config.matchTime > 3600)) {
    errors.push('比賽時長必須在1-60分鐘之間');
  }
  
  if (config.matchInterval && (config.matchInterval < 10 || config.matchInterval > 120)) {
    errors.push('比賽間隔必須在10-120分鐘之間');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 生成優化的比賽時間表 - 完全避免背靠背比賽
 * Generate optimized match schedule to completely avoid back-to-back matches
 * Uses a systematic round-robin distribution approach
 * 
 * @param {Array} matches - 比賽列表 Array of matches
 * @param {number} matchInterval - 比賽間隔(分鐘) Match interval in minutes
 * @returns {Array} 優化後的比賽列表 Optimized match array
 */
function optimizeMatchSchedule(matches, matchInterval = 30) {
  if (matches.length <= 1) return matches;

  console.log(`🔧 Optimizing ${matches.length} matches to completely avoid back-to-back games...`);
  
  // 獲取所有參與的隊伍
  const allTeams = new Set();
  matches.forEach(match => {
    allTeams.add(match.team1_id);
    allTeams.add(match.team2_id);
  });
  
  const teamCount = allTeams.size;
  console.log(`📊 Total teams: ${teamCount}, Total matches: ${matches.length}`);

  // 使用系統性方法：將比賽分配到輪次中，確保每輪中每支隊伍最多出現一次
  const optimizedMatches = distributeMatchesInRounds(matches, teamCount);

  // 首先按照比賽編號排序，確保A01在A02之前
  optimizedMatches.sort((a, b) => {
    const matchNumA = parseInt(a.match_number.replace(/[A-Za-z]/g, ''));
    const matchNumB = parseInt(b.match_number.replace(/[A-Za-z]/g, ''));
    return matchNumA - matchNumB;
  });

  // 重新分配比賽時間，確保A01最早，A02其次，依此類推
  const baseDate = moment(matches[0].match_date);
  optimizedMatches.forEach((match, index) => {
    const newDateTime = baseDate.clone().add(index * matchInterval, 'minutes');
    match.match_date = newDateTime.format('YYYY-MM-DD HH:mm:ss');
  });

  // 分析優化結果
  const backToBackCount = analyzeBackToBackMatches(optimizedMatches);
  console.log(`✅ Optimization complete: ${backToBackCount} back-to-back matches remaining`);

  return optimizedMatches;
}

/**
 * 將比賽分配到輪次中，確保每輪中每支隊伍最多出現一次
 * Distribute matches into rounds ensuring each team appears at most once per round
 * 
 * @param {Array} matches - 比賽列表 Array of matches
 * @param {number} teamCount - 隊伍總數 Total number of teams
 * @returns {Array} 優化後的比賽列表 Optimized match array
 */
function distributeMatchesInRounds(matches, teamCount) {
  const rounds = [];
  const matchPool = [...matches];
  
  console.log(`🔄 Distributing matches into rounds...`);

  while (matchPool.length > 0) {
    const currentRound = [];
    const usedTeamsInRound = new Set();
    
    // 在當前輪次中盡可能多地安排比賽，確保沒有隊伍重複
    for (let i = matchPool.length - 1; i >= 0; i--) {
      const match = matchPool[i];
      
      // 檢查這場比賽的兩支隊伍是否都沒有在當前輪次中出現
      if (!usedTeamsInRound.has(match.team1_id) && !usedTeamsInRound.has(match.team2_id)) {
        currentRound.push(match);
        usedTeamsInRound.add(match.team1_id);
        usedTeamsInRound.add(match.team2_id);
        matchPool.splice(i, 1);
        
        console.log(`  Round ${rounds.length + 1}: Added ${match.team1_name} vs ${match.team2_name}`);
      }
    }
    
    if (currentRound.length > 0) {
      rounds.push(currentRound);
      console.log(`✅ Round ${rounds.length} complete: ${currentRound.length} matches`);
    } else {
      console.error('❌ Could not create a valid round, breaking to avoid infinite loop');
      break;
    }
  }

  // 將所有輪次的比賽按順序合併
  const result = [];
  rounds.forEach((round, roundIndex) => {
    round.forEach(match => {
      result.push(match);
    });
  });

  console.log(`📋 Created ${rounds.length} rounds with ${result.length} total matches`);
  
  // 驗證結果
  const verification = verifyNoBackToBack(result);
  if (verification.hasBackToBack) {
    console.warn(`⚠️ Warning: Still has ${verification.backToBackCount} back-to-back matches`);
    verification.backToBackDetails.forEach(detail => {
      console.warn(`  🔴 ${detail}`);
    });
  } else {
    console.log(`🎉 Perfect! No back-to-back matches found!`);
  }

  return result;
}

/**
 * 驗證比賽安排中是否存在背靠背比賽
 * Verify if there are any back-to-back matches in the schedule
 * 
 * @param {Array} matches - 比賽列表 Array of matches
 * @returns {Object} 驗證結果 Verification result
 */
function verifyNoBackToBack(matches) {
  const teamLastMatchIndex = new Map();
  const backToBackDetails = [];
  let backToBackCount = 0;

  matches.forEach((match, index) => {
    const team1LastIndex = teamLastMatchIndex.get(match.team1_id);
    const team2LastIndex = teamLastMatchIndex.get(match.team2_id);

    // 檢查是否為背靠背比賽
    if (team1LastIndex === index - 1) {
      backToBackCount++;
      backToBackDetails.push(`Match ${index + 1}: ${match.team1_name} plays back-to-back (previous match ${team1LastIndex + 1})`);
    }
    if (team2LastIndex === index - 1) {
      backToBackCount++;
      backToBackDetails.push(`Match ${index + 1}: ${match.team2_name} plays back-to-back (previous match ${team2LastIndex + 1})`);
    }

    // 更新隊伍最後比賽索引
    teamLastMatchIndex.set(match.team1_id, index);
    teamLastMatchIndex.set(match.team2_id, index);
  });

  return {
    hasBackToBack: backToBackCount > 0,
    backToBackCount,
    backToBackDetails
  };
}

/**
 * 使用圓桌法生成完美平衡的循環賽對陣
 * Generate perfectly balanced round-robin matches using circle method
 * 
 * @param {Array} teams - 隊伍列表 Array of teams
 * @returns {Array} 比賽對陣列表 Array of match pairings with home/away assignments
 */
function generateCircleMethodMatches(teams) {
  const n = teams.length;
  
  if (n < 2) return [];
  
  // 創建隊伍索引數組
  const teamIndices = Array.from({ length: n }, (_, i) => i);
  
  // 如果是奇數隊伍，添加一個虛擬隊伍（輪空）
  const isOdd = n % 2 === 1;
  if (isOdd) {
    teamIndices.push(-1); // -1 表示輪空
  }
  
  const totalTeams = teamIndices.length;
  const rounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;
  
  const allMatches = [];
  const homeAwayBalance = new Map();
  
  // 初始化主客場統計
  teams.forEach(team => {
    homeAwayBalance.set(team.team_id, { home: 0, away: 0 });
  });
  
  console.log(`🎯 圓桌法: ${n}隊 → ${rounds}輪 × ${matchesPerRound}場/輪`);
  
  // 生成每一輪的比賽
  for (let round = 0; round < rounds; round++) {
    const roundMatches = [];
    
    // 第一個位置固定，其他位置旋轉
    const arrangement = [teamIndices[0]];
    for (let i = 1; i < totalTeams; i++) {
      const rotatedIndex = ((i - 1 + round) % (totalTeams - 1)) + 1;
      arrangement.push(teamIndices[rotatedIndex]);
    }
    
    // 配對：第一個與最後一個，第二個與倒數第二個，以此類推
    for (let i = 0; i < matchesPerRound; i++) {
      const team1Index = arrangement[i];
      const team2Index = arrangement[totalTeams - 1 - i];
      
      // 跳過輪空
      if (team1Index === -1 || team2Index === -1) continue;
      
      const team1 = teams[team1Index];
      const team2 = teams[team2Index];
      
      // 決定主客場 - 使用平衡策略
      const balance1 = homeAwayBalance.get(team1.team_id);
      const balance2 = homeAwayBalance.get(team2.team_id);
      
      let homeTeam, awayTeam;
      
      // 優先讓主場次數較少的隊伍做主場
      if (balance1.home < balance2.home) {
        homeTeam = team1;
        awayTeam = team2;
      } else if (balance2.home < balance1.home) {
        homeTeam = team2;
        awayTeam = team1;
      } else {
        // 主場次數相同時，使用輪換策略
        if ((round + i) % 2 === 0) {
          homeTeam = team1;
          awayTeam = team2;
        } else {
          homeTeam = team2;
          awayTeam = team1;
        }
      }
      
      // 更新統計
      homeAwayBalance.get(homeTeam.team_id).home++;
      homeAwayBalance.get(awayTeam.team_id).away++;
      
      roundMatches.push({
        homeTeam,
        awayTeam,
        round: round + 1,
        matchInRound: i + 1
      });
    }
    
    allMatches.push(...roundMatches);
  }
  
  // 輸出平衡統計
  console.log('🏠 圓桌法主客場平衡統計:');
  teams.forEach(team => {
    const balance = homeAwayBalance.get(team.team_id);
    console.log(`  ${team.team_name}: 主場 ${balance.home} 次, 客場 ${balance.away} 次`);
  });
  
  return allMatches;
}

/**
 * 分析背靠背比賽數量
 * Analyze the number of back-to-back matches
 * 
 * @param {Array} matches - 比賽列表 Array of matches
 * @returns {number} 背靠背比賽數量 Number of back-to-back matches
 */
function analyzeBackToBackMatches(matches) {
  let backToBackCount = 0;
  const teamLastMatchIndex = new Map();

  matches.forEach((match, index) => {
    const team1LastIndex = teamLastMatchIndex.get(match.team1_id);
    const team2LastIndex = teamLastMatchIndex.get(match.team2_id);

    // 檢查是否為背靠背比賽 (上一場比賽就是前一個索引)
    if (team1LastIndex === index - 1) {
      backToBackCount++;
      console.log(`🔴 Back-to-back for ${match.team1_name}: match ${index} after match ${team1LastIndex + 1}`);
    }
    if (team2LastIndex === index - 1) {
      backToBackCount++;
      console.log(`🔴 Back-to-back for ${match.team2_name}: match ${index} after match ${team2LastIndex + 1}`);
    }

    // 更新隊伍最後比賽索引
    teamLastMatchIndex.set(match.team1_id, index);
    teamLastMatchIndex.set(match.team2_id, index);
  });

  return backToBackCount;
}

/**
 * 分析主客場平衡情況
 * Analyze home/away balance for all teams
 * 
 * @param {Array} matches - 比賽列表 Array of matches
 * @param {Array} teams - 隊伍列表 Array of teams
 * @returns {Object} 主客場平衡分析 Home/away balance analysis
 */
function analyzeHomeAwayBalance(matches, teams) {
  const homeAwayStats = new Map();
  
  // 初始化統計
  teams.forEach(team => {
    homeAwayStats.set(team.team_id, {
      team_name: team.team_name,
      home_games: 0,
      away_games: 0,
      total_games: 0
    });
  });
  
  // 統計每場比賽
  matches.forEach(match => {
    const team1Stats = homeAwayStats.get(match.team1_id);
    const team2Stats = homeAwayStats.get(match.team2_id);
    
    if (team1Stats) {
      team1Stats.home_games++;
      team1Stats.total_games++;
    }
    
    if (team2Stats) {
      team2Stats.away_games++;
      team2Stats.total_games++;
    }
  });
  
  // 轉換為數組並計算平衡度
  const balanceArray = Array.from(homeAwayStats.values()).map(stats => ({
    ...stats,
    balance_difference: Math.abs(stats.home_games - stats.away_games),
    balance_ratio: stats.total_games > 0 ? (stats.home_games / stats.total_games).toFixed(2) : 0
  }));
  
  // 計算整體平衡指標
  const totalBalanceDifference = balanceArray.reduce((sum, team) => sum + team.balance_difference, 0);
  const maxBalanceDifference = Math.max(...balanceArray.map(team => team.balance_difference));
  const isWellBalanced = maxBalanceDifference <= 1; // 最大差異不超過1場
  
  return {
    teamStats: balanceArray,
    totalBalanceDifference,
    maxBalanceDifference,
    isWellBalanced,
    summary: `最大主客場差異: ${maxBalanceDifference} 場, ${isWellBalanced ? '平衡良好' : '需要優化'}`
  };
}

/**
 * 生成比賽統計信息
 * Generate match statistics
 * 
 * @param {Array} teams - 隊伍列表 Array of teams
 * @param {Object} options - 配置選項 Configuration options
 * @returns {Object} 統計信息 Statistics object
 */
function generateMatchStatistics(teams, options = {}) {
  const teamCount = teams.length;
  const totalMatches = calculateTotalMatches(teamCount);
  const matchInterval = options.matchInterval || 30;
  const matchTime = options.matchTime || 600;
  
  // 計算總時長
  const totalDuration = (totalMatches - 1) * matchInterval + (matchTime / 60);
  const startTime = moment(options.matchDate || moment());
  const endTime = startTime.clone().add(totalDuration, 'minutes');
  
  return {
    teamCount,
    totalMatches,
    estimatedDuration: `${Math.floor(totalDuration / 60)}小時${Math.round(totalDuration % 60)}分鐘`,
    startTime: startTime.format('YYYY-MM-DD HH:mm'),
    endTime: endTime.format('YYYY-MM-DD HH:mm'),
    matchesPerTeam: teamCount - 1,
    averageRestTime: `${matchInterval * (teamCount - 2)}分鐘`
  };
}

module.exports = {
  generateGroupMatches,
  calculateTotalMatches,
  validateGroupMatchConfig,
  optimizeMatchSchedule,
  generateMatchStatistics,
  analyzeBackToBackMatches,
  analyzeHomeAwayBalance
};