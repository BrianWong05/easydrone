import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  message,
  Space,
  Row,
  Col,
  Statistic,
  Alert,
  Checkbox,
  DatePicker,
  TimePicker,
  InputNumber,
  Divider,
} from "antd";
import { ArrowLeftOutlined, ThunderboltOutlined, CalendarOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";


// Optimized match generation algorithm to minimize back-to-back matches
function generateOptimizedMatches(teams) {
  if (teams.length < 2) return [];
  
  // Generate all possible match combinations
  const allMatches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      allMatches.push({
        team1: teams[i],
        team2: teams[j],
        team1_id: teams[i].team_id,
        team2_id: teams[j].team_id
      });
    }
  }
  
  console.log(`Generated ${allMatches.length} total matches for ${teams.length} teams`);
  
  // Optimize match order using round-robin scheduling
  const optimizedMatches = optimizeMatchOrder(allMatches, teams);
  
  return optimizedMatches;
}

function optimizeMatchOrder(matches, teams) {
  const teamIds = teams.map(t => t.team_id);
  const optimizedOrder = [];
  
  // Track when each team last played
  const teamLastPlayed = {};
  teamIds.forEach(id => teamLastPlayed[id] = -3); // Initialize to allow first matches
  
  // Create a copy of matches to work with
  const remainingMatches = [...matches];
  
  while (remainingMatches.length > 0) {
    let bestMatch = null;
    let bestScore = -1;
    let bestIndex = -1;
    
    // Find the best match to schedule next
    for (let i = 0; i < remainingMatches.length; i++) {
      const match = remainingMatches[i];
      const score = calculateMatchScore(match, teamLastPlayed, optimizedOrder.length);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = match;
        bestIndex = i;
      }
    }
    
    if (bestMatch) {
      // Add the best match to the schedule
      optimizedOrder.push(bestMatch);
      
      // Update last played times
      teamLastPlayed[bestMatch.team1_id] = optimizedOrder.length - 1;
      teamLastPlayed[bestMatch.team2_id] = optimizedOrder.length - 1;
      
      // Remove the scheduled match
      remainingMatches.splice(bestIndex, 1);
      
      console.log(`Scheduled match ${optimizedOrder.length}: ${bestMatch.team1.team_name} vs ${bestMatch.team2.team_name} (score: ${bestScore})`);
    } else {
      // Fallback: just take the first remaining match
      console.warn('No optimal match found, using fallback');
      const fallbackMatch = remainingMatches.shift();
      optimizedOrder.push(fallbackMatch);
      teamLastPlayed[fallbackMatch.team1_id] = optimizedOrder.length - 1;
      teamLastPlayed[fallbackMatch.team2_id] = optimizedOrder.length - 1;
    }
  }
  
  return optimizedOrder;
}

function calculateMatchScore(match, teamLastPlayed, currentRound) {
  const team1LastPlayed = teamLastPlayed[match.team1_id];
  const team2LastPlayed = teamLastPlayed[match.team2_id];
  
  // Calculate gaps since last played
  const team1Gap = currentRound - team1LastPlayed;
  const team2Gap = currentRound - team2LastPlayed;
  const minGap = Math.min(team1Gap, team2Gap);
  
  // Scoring criteria:
  // 1. Prefer matches where both teams haven't played recently (larger gaps)
  // 2. Heavily penalize if either team would play 3 in a row (gap < 2)
  // 3. Prefer balanced rest periods
  
  let score = 0;
  
  // Base score: prefer larger minimum gaps
  score += minGap * 10;
  
  // Penalty for playing too soon (less than 2 rounds gap)
  if (team1Gap < 2) score -= 100;
  if (team2Gap < 2) score -= 100;
  
  // Bonus for balanced rest (both teams have similar gaps)
  const gapDifference = Math.abs(team1Gap - team2Gap);
  score += (5 - gapDifference) * 2;
  
  // Bonus for giving teams adequate rest
  if (minGap >= 2) score += 20;
  if (minGap >= 3) score += 10;
  
  return score;
}

const TournamentMatchGenerator = () => {
  const { t } = useTranslation(['match', 'common']);
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [startDate, setStartDate] = useState(moment().add(1, "day"));
  const [startTime, setStartTime] = useState(moment("09:00", "HH:mm"));
  const [matchMinutes, setMatchMinutes] = useState(10);
  const [matchSeconds, setMatchSeconds] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakSeconds, setBreakSeconds] = useState(0);

  // Calculate total match duration in seconds
  const matchDuration = matchMinutes * 60 + matchSeconds;
  
  // Calculate total break duration in seconds
  const breakDuration = breakMinutes * 60 + breakSeconds;

  useEffect(() => {
    fetchTournament();
    fetchGroups();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data.tournament);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      message.error(t('messages.tournamentNotFound'));
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      if (response.data.success) {
        // The server now returns groups in data.groups with team_count
        const groupsData = response.data.data?.groups || [];
        console.log('Fetched groups:', groupsData); // Debug log
        setGroups(groupsData);
        // 默認選中所有小組
        setSelectedGroups(groupsData.map((g) => g.group_id));
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const calculateMatches = () => {
    const selectedGroupsData = groups.filter((g) => selectedGroups.includes(g.group_id));
    let totalMatches = 0;

    selectedGroupsData.forEach((group) => {
      const teamCount = group.team_count || 0;
      if (teamCount >= 2) {
        // 計算小組內循環賽場次: C(n,2) = n*(n-1)/2
        const groupMatches = (teamCount * (teamCount - 1)) / 2;
        totalMatches += groupMatches;
      }
    });

    return {
      totalMatches,
      selectedGroups: selectedGroupsData.length,
      estimatedDuration: ((totalMatches - 1) * breakDuration) / 60, // 分鐘 - 只計算比賽間隔
    };
  };

  const generateMatches = async () => {
    try {
      setLoading(true);

      const selectedGroupsData = groups.filter((g) => selectedGroups.includes(g.group_id));
      
      // 確保使用DatePicker的日期和TimePicker的時間
      const dateString = startDate.format('YYYY-MM-DD');
      const timeString = startTime.format('HH:mm');
      const currentTime = moment(`${dateString} ${timeString}`, 'YYYY-MM-DD HH:mm');
      
      console.log('🔍 Tournament Match Generator - Date string:', dateString);
      console.log('🔍 Tournament Match Generator - Time string:', timeString);
      console.log('🔍 Tournament Match Generator - Start time:', currentTime.format('YYYY-MM-DD HH:mm:ss'));

      // 驗證所有選中的小組都有足夠的隊伍
      for (const group of selectedGroupsData) {
        const teamsResponse = await axios.get(
          `/api/tournaments/${tournamentId}/teams?group_id=${group.group_id}&limit=100`,
        );
        const teams = teamsResponse.data.success ? teamsResponse.data.data?.teams || [] : [];

        if (teams.length < 2) {
          message.warning(t('generator.insufficientTeams', { 
            groupName: group.group_name,
            defaultValue: `小組 ${group.group_name} 隊伍不足，跳過生成比賽`
          }));
          return;
        }
      }

      // 使用優化的批量生成端點 (圓桌法確保主客場平衡)
      try {
        console.log('🎯 使用優化的圓桌法算法生成比賽...');
        
        const response = await axios.post(`/api/tournaments/${tournamentId}/matches/generate`, {
          selected_groups: selectedGroupsData.map(g => g.group_id),
          match_date: currentTime.format("YYYY-MM-DD HH:mm:ss"),
          match_time: matchDuration,
          match_interval: Math.max(10, Math.ceil(breakDuration / 60)), // Convert seconds to minutes, minimum 10
          optimize_schedule: true
        });

        if (response.data.success) {
          const successCount = response.data.data.total_matches;
          const groupResults = response.data.data.group_results || [];
          
          console.log('✅ 圓桌法生成成功:', response.data.data);
          
          // 顯示主客場平衡信息
          let balanceInfo = '';
          groupResults.forEach(group => {
            if (group.homeAwayAnalysis && group.homeAwayAnalysis.isWellBalanced) {
              balanceInfo += `小組${group.group_name}: 主客場平衡良好; `;
            }
          });
          
          message.success(t('generator.generateSuccess', { 
            count: successCount,
            balanceInfo,
            defaultValue: `成功生成 ${successCount} 場比賽！${balanceInfo}使用圓桌法確保完美主客場平衡`
          }));
          navigate(`/tournaments/${tournamentId}/matches`);
        } else {
          message.error(response.data.message || t('generator.generateFailed', { defaultValue: '比賽生成失敗' }));
        }
      } catch (error) {
        console.error("Error generating matches with optimized algorithm:", error);
        message.error(t('generator.generateError', { 
          error: error.response?.data?.message || error.message,
          defaultValue: `比賽生成失敗: ${error.response?.data?.message || error.message}`
        }));
      }
    } catch (error) {
      console.error("Error generating matches:", error);
      message.error(t('generator.generateFailed', { defaultValue: '比賽生成失敗' }));
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateMatches();

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}
          className="mb-4"
        >
          {t('actions.backToMatchList', { defaultValue: '返回比賽列表' })}
        </Button>
        <h2 className="text-2xl font-bold mb-4">{tournament?.tournament_name} - {t('match.generate')}</h2>
        <p className="text-gray-600 mb-0">{t('generator.description', { defaultValue: '自動為選中的小組生成循環賽比賽' })}</p>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title={t('generator.groupSelection', { defaultValue: '小組選擇' })} className="mb-6">
            <Alert
              message={t('generator.selectGroups', { defaultValue: '選擇要生成比賽的小組' })}
              description={t('generator.roundRobinDescription', { defaultValue: '系統將為每個選中的小組生成循環賽（每支隊伍與其他隊伍各比賽一場）' })}
              type="info"
              className="mb-4"
            />

            <Checkbox.Group value={selectedGroups} onChange={setSelectedGroups} className="w-full">
              <Row gutter={16}>
                {groups.map((group) => (
                  <Col span={6} key={group.group_id} className="mb-2">
                    <Checkbox value={group.group_id}>
                      <Space direction="vertical" size={0}>
                        <strong>
                          {t('match.group')} {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                        </strong>
                        <span className="text-xs text-gray-500">
                          {group.team_count || 0} {t('generator.teams', { defaultValue: '支隊伍' })}
                        </span>
                      </Space>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Card>

          <Card title={t('generator.timeSettings', { defaultValue: '時間設置' })}>
            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <strong>{t('generator.startDate', { defaultValue: '開始日期' })}</strong>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    className="w-full mt-2"
                    placeholder={t('generator.selectStartDate', { defaultValue: '選擇開始日期' })}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className="mb-4">
                  <strong>{t('generator.startTime', { defaultValue: '開始時間' })}</strong>
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    format="HH:mm"
                    className="w-full mt-2"
                    placeholder={t('generator.selectStartTime', { defaultValue: '選擇開始時間' })}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-4">
                  <strong>{t('match.duration')}</strong>
                  <Row gutter={8} className="mt-2">
                    <Col span={12}>
                      <InputNumber
                        value={matchMinutes}
                        onChange={setMatchMinutes}
                        min={0}
                        max={60}
                        className="w-full"
                        placeholder={t('form.minutesPlaceholder')}
                        addonAfter={t('common:time.minutes', { defaultValue: '分' })}
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        value={matchSeconds}
                        onChange={setMatchSeconds}
                        min={0}
                        max={59}
                        className="w-full"
                        placeholder={t('form.secondsPlaceholder')}
                        addonAfter={t('common:time.seconds', { defaultValue: '秒' })}
                      />
                    </Col>
                  </Row>
                  <div className="text-xs text-gray-600 mt-1">
                    {t('generator.totalDuration', { defaultValue: '總時長' })}: {matchDuration} {t('common:time.seconds', { defaultValue: '秒' })} ({Math.floor(matchDuration / 60)}{t('common:time.minutes', { defaultValue: '分' })}{matchDuration % 60}{t('common:time.seconds', { defaultValue: '秒' })})
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="mb-4">
                  <strong>{t('generator.matchInterval', { defaultValue: '比賽間隔' })}</strong>
                  <Row gutter={8} className="mt-2">
                    <Col span={12}>
                      <InputNumber
                        value={breakMinutes}
                        onChange={setBreakMinutes}
                        min={0}
                        max={30}
                        className="w-full"
                        placeholder={t('form.minutesPlaceholder')}
                        addonAfter={t('common:time.minutes', { defaultValue: '分' })}
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        value={breakSeconds}
                        onChange={setBreakSeconds}
                        min={0}
                        max={59}
                        className="w-full"
                        placeholder={t('form.secondsPlaceholder')}
                        addonAfter={t('common:time.seconds', { defaultValue: '秒' })}
                      />
                    </Col>
                  </Row>
                  <div className="text-xs text-gray-600 mt-1">
                    {t('generator.totalInterval', { defaultValue: '總間隔' })}: {breakDuration} {t('common:time.seconds', { defaultValue: '秒' })} ({Math.floor(breakDuration / 60)}{t('common:time.minutes', { defaultValue: '分' })}{breakDuration % 60}{t('common:time.seconds', { defaultValue: '秒' })})
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card title={t('generator.preview', { defaultValue: '生成預覽' })}>
            <Space direction="vertical" className="w-full">
              <Statistic title={t('generator.selectedGroups', { defaultValue: '選中小組' })} value={stats.selectedGroups} suffix={t('generator.groupsUnit', { defaultValue: '個' })} />
              <Statistic title={t('generator.estimatedMatches', { defaultValue: '預計生成比賽' })} value={stats.totalMatches} suffix={t('generator.matchesUnit', { defaultValue: '場' })} />
              <Statistic title={t('generator.estimatedDuration', { defaultValue: '預計總時長' })} value={Math.ceil(stats.estimatedDuration)} suffix={t('common:time.minutes', { defaultValue: '分鐘' })} />

              <Divider />

              <div>
                <strong>{t('generator.startTime', { defaultValue: '開始時間' })}：</strong>
                <br />
                <span>
                  {startDate?.format("YYYY-MM-DD")} {startTime?.format("HH:mm")}
                </span>
              </div>

              <div>
                <strong>{t('generator.estimatedEnd', { defaultValue: '預計結束' })}：</strong>
                <br />
                <span>
                  {(() => {
                    const dateStr = startDate?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD');
                    const timeStr = startTime?.format('HH:mm') || '09:00';
                    return moment(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm')
                      .add(stats.estimatedDuration, "minutes")
                      .format("YYYY-MM-DD HH:mm");
                  })()}
                </span>
              </div>

              <Divider />

              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={generateMatches}
                loading={loading}
                disabled={stats.totalMatches === 0}
                block
                size="large"
              >
                {t('match.generate')}
              </Button>

              {stats.totalMatches === 0 && (
                <Alert 
                  message={t('generator.cannotGenerate', { defaultValue: '無法生成比賽' })} 
                  description={t('generator.ensureMinimumTeams', { defaultValue: '請確保選中的小組至少有2支隊伍' })} 
                  type="warning" 
                  showIcon 
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TournamentMatchGenerator;
