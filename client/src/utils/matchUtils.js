/**
 * 比賽相關工具函數
 * Match-related utility functions
 */
import i18n from '../i18n';

/**
 * 獲取比賽類型的本地化顯示文本
 * Get localized display text for match type
 * 
 * @param {Object} matchData - 比賽數據對象
 * @param {string} matchData.match_type - 比賽類型 (group, friendly, knockout)
 * @param {string} matchData.group_name - 小組名稱
 * @param {string} matchData.tournament_stage - 錦標賽階段
 * @returns {string} 比賽類型的本地化顯示文本
 */
export const getMatchTypeText = (matchData) => {
  if (!matchData) return i18n.t('common:unknown', { defaultValue: '未知' });
  
  // 優先使用 match_type 字段
  if (matchData.match_type) {
    switch (matchData.match_type) {
      case 'group':
        return i18n.t('match:types.groupStage', { defaultValue: '小組賽' });
      case 'friendly':
        return i18n.t('match:types.friendly', { defaultValue: '友誼賽' });
      case 'knockout':
        return i18n.t('match:types.knockout', { defaultValue: '淘汰賽' });
      default:
        return matchData.match_type;
    }
  }
  
  // 如果沒有 match_type，根據其他字段推斷
  if (matchData.group_name) {
    return i18n.t('match:types.groupStage', { defaultValue: '小組賽' });
  }
  
  if (matchData.tournament_stage) {
    return i18n.t('match:types.tournament', { defaultValue: '錦標賽' });
  }
  
  return i18n.t('match:types.friendly', { defaultValue: '友誼賽' });
};

/**
 * 獲取比賽類型的顏色
 * Get color for match type
 * 
 * @param {Object} matchData - 比賽數據對象
 * @returns {string} Ant Design 顏色名稱
 */
export const getMatchTypeColor = (matchData) => {
  if (!matchData) return 'default';
  
  const matchType = matchData.match_type;
  
  switch (matchType) {
    case 'group':
      return 'blue';
    case 'friendly':
      return 'green';
    case 'knockout':
      return 'red';
    default:
      return 'cyan';
  }
};

/**
 * 獲取完整的比賽類型信息（包含小組信息）
 * Get complete match type information (including group info)
 * 
 * @param {Object} matchData - 比賽數據對象
 * @returns {Object} { text: string, color: string, detail: string }
 */
export const getMatchTypeInfo = (matchData) => {
  if (!matchData) return { 
    text: i18n.t('common:unknown', { defaultValue: '未知' }), 
    color: 'default', 
    detail: '' 
  };
  
  const baseText = getMatchTypeText(matchData);
  const color = getMatchTypeColor(matchData);
  
  let detail = '';
  if (matchData.group_name) {
    detail = `${i18n.t('match:group', { defaultValue: '小組' })} ${matchData.group_name}`;
  } else if (matchData.tournament_stage) {
    detail = matchData.tournament_stage;
  }
  
  return {
    text: baseText,
    color: color,
    detail: detail
  };
};