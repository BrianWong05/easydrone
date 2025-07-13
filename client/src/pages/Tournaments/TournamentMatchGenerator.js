import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  message,
  Typography,
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

const { Title, Text } = Typography;

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
      message.error("獲取錦標賽信息失敗");
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      if (response.data.success) {
        const groupsData = response.data.data?.groups || [];
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
          message.warning(`小組 ${group.group_name} 隊伍不足，跳過生成比賽`);
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
          
          message.success(`成功生成 ${successCount} 場比賽！${balanceInfo}使用圓桌法確保完美主客場平衡`);
          navigate(`/tournaments/${tournamentId}/matches`);
        } else {
          message.error(response.data.message || "比賽生成失敗");
        }
      } catch (error) {
        console.error("Error generating matches with optimized algorithm:", error);
        message.error(`比賽生成失敗: ${error.response?.data?.message || error.message}`);
      }
    } catch (error) {
      console.error("Error generating matches:", error);
      message.error("比賽生成失敗");
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateMatches();

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}
          style={{ marginBottom: 16 }}
        >
          返回比賽列表
        </Button>
        <Title level={2}>{tournament?.tournament_name} - 生成比賽</Title>
        <p style={{ color: "#666", marginBottom: 0 }}>自動為選中的小組生成循環賽比賽</p>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card title="小組選擇" style={{ marginBottom: 24 }}>
            <Alert
              message="選擇要生成比賽的小組"
              description="系統將為每個選中的小組生成循環賽（每支隊伍與其他隊伍各比賽一場）"
              type="info"
              style={{ marginBottom: 16 }}
            />

            <Checkbox.Group value={selectedGroups} onChange={setSelectedGroups} style={{ width: "100%" }}>
              <Row gutter={16}>
                {groups.map((group) => (
                  <Col span={6} key={group.group_id} style={{ marginBottom: 8 }}>
                    <Checkbox value={group.group_id}>
                      <Space direction="vertical" size={0}>
                        <Text strong>
                          小組 {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {group.team_count || 0} 支隊伍
                        </Text>
                      </Space>
                    </Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Card>

          <Card title="時間設置">
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>開始日期</Text>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    style={{ width: "100%", marginTop: 8 }}
                    placeholder="選擇開始日期"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>開始時間</Text>
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    format="HH:mm"
                    style={{ width: "100%", marginTop: 8 }}
                    placeholder="選擇開始時間"
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>比賽時長</Text>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <InputNumber
                        value={matchMinutes}
                        onChange={setMatchMinutes}
                        min={0}
                        max={60}
                        style={{ width: "100%" }}
                        placeholder="分鐘"
                        addonAfter="分"
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        value={matchSeconds}
                        onChange={setMatchSeconds}
                        min={0}
                        max={59}
                        style={{ width: "100%" }}
                        placeholder="秒"
                        addonAfter="秒"
                      />
                    </Col>
                  </Row>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    總時長: {matchDuration} 秒 ({Math.floor(matchDuration / 60)}分{matchDuration % 60}秒)
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>比賽間隔</Text>
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <InputNumber
                        value={breakMinutes}
                        onChange={setBreakMinutes}
                        min={0}
                        max={30}
                        style={{ width: "100%" }}
                        placeholder="分鐘"
                        addonAfter="分"
                      />
                    </Col>
                    <Col span={12}>
                      <InputNumber
                        value={breakSeconds}
                        onChange={setBreakSeconds}
                        min={0}
                        max={59}
                        style={{ width: "100%" }}
                        placeholder="秒"
                        addonAfter="秒"
                      />
                    </Col>
                  </Row>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
                    總間隔: {breakDuration} 秒 ({Math.floor(breakDuration / 60)}分{breakDuration % 60}秒)
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="生成預覽">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Statistic title="選中小組" value={stats.selectedGroups} suffix="個" />
              <Statistic title="預計生成比賽" value={stats.totalMatches} suffix="場" />
              <Statistic title="預計總時長" value={Math.ceil(stats.estimatedDuration)} suffix="分鐘" />

              <Divider />

              <div>
                <Text strong>開始時間：</Text>
                <br />
                <Text>
                  {startDate?.format("YYYY-MM-DD")} {startTime?.format("HH:mm")}
                </Text>
              </div>

              <div>
                <Text strong>預計結束：</Text>
                <br />
                <Text>
                  {(() => {
                    const dateStr = startDate?.format('YYYY-MM-DD') || moment().format('YYYY-MM-DD');
                    const timeStr = startTime?.format('HH:mm') || '09:00';
                    return moment(`${dateStr} ${timeStr}`, 'YYYY-MM-DD HH:mm')
                      .add(stats.estimatedDuration, "minutes")
                      .format("YYYY-MM-DD HH:mm");
                  })()}
                </Text>
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
                生成比賽
              </Button>

              {stats.totalMatches === 0 && (
                <Alert message="無法生成比賽" description="請確保選中的小組至少有2支隊伍" type="warning" showIcon />
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TournamentMatchGenerator;
