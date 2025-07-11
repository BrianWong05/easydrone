// Utility functions for determining match winners

/**
 * Determine the winner based on drone soccer rules:
 * 1. Higher score wins
 * 2. If scores tied, fewer fouls wins  
 * 3. If both scores AND fouls tied, it's a draw (overtime needed)
 * @param {number} team1Score - Team 1 score
 * @param {number} team2Score - Team 2 score  
 * @param {number} team1Fouls - Team 1 fouls
 * @param {number} team2Fouls - Team 2 fouls
 * @param {number} team1Id - Team 1 ID
 * @param {number} team2Id - Team 2 ID
 * @returns {object} - {winnerId: number|null, reason: string}
 */
export const determineWinner = (team1Score, team2Score, team1Fouls, team2Fouls, team1Id, team2Id) => {
  console.log(`🏆 Determining winner: Team1(${team1Score}⚽,${team1Fouls}🚫) vs Team2(${team2Score}⚽,${team2Fouls}🚫)`);
  
  // Rule 1: Higher score wins
  if (team1Score > team2Score) {
    console.log(`✅ Team 1 wins by score: ${team1Score} > ${team2Score}`);
    return {
      winnerId: team1Id,
      reason: 'score'
    };
  }
  
  if (team2Score > team1Score) {
    console.log(`✅ Team 2 wins by score: ${team2Score} > ${team1Score}`);
    return {
      winnerId: team2Id,
      reason: 'score'
    };
  }
  
  // Rule 2: Scores tied, fewer fouls wins
  console.log(`⚖️ Scores tied (${team1Score}:${team2Score}), checking fouls...`);
  
  if (team1Fouls < team2Fouls) {
    console.log(`✅ Team 1 wins by fouls: ${team1Fouls} < ${team2Fouls}`);
    return {
      winnerId: team1Id,
      reason: 'fouls'
    };
  }
  
  if (team2Fouls < team1Fouls) {
    console.log(`✅ Team 2 wins by fouls: ${team2Fouls} < ${team1Fouls}`);
    return {
      winnerId: team2Id,
      reason: 'fouls'
    };
  }
  
  // Rule 3: Both scores and fouls tied - overtime needed
  console.log(`🤝 True draw: scores (${team1Score}:${team2Score}) and fouls (${team1Fouls}:${team2Fouls}) both tied - overtime needed`);
  return {
    winnerId: null,
    reason: 'draw'
  };
};

/**
 * Check if match needs overtime
 * Only when BOTH scores AND fouls are exactly tied
 * @param {number} team1Score - Team 1 score
 * @param {number} team2Score - Team 2 score  
 * @param {number} team1Fouls - Team 1 fouls
 * @param {number} team2Fouls - Team 2 fouls
 * @returns {boolean} - true if overtime is needed
 */
export const needsOvertime = (team1Score, team2Score, team1Fouls, team2Fouls) => {
  // Overtime only happens when both scores AND fouls are tied
  return (team1Score === team2Score) && (team1Fouls === team2Fouls);
};

/**
 * Get win condition description in Chinese
 * @param {string} reason - Win reason ('score', 'fouls', 'draw')
 * @returns {string} - Chinese description
 */
export const getWinReasonText = (reason) => {
  switch (reason) {
    case 'score':
      return '得分獲勝';
    case 'fouls':
      return '犯規較少獲勝';
    case 'draw':
      return '平局';
    default:
      return '未知';
  }
};