import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Table, Tag, Row, Col, Space, Progress, message, Button } from 'antd';
import { TrophyOutlined, TeamOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title, Text } = Typography;

const GroupLeaderboard = () => {
  const { t } = useTranslation(['group', 'common']);
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  useEffect(() => {
    fetchGroups();
  }, [tournamentId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);

      // 先重新計算積分榜以確保數據是最新的
      try {
        await axios.post("/api/stats/calculate-all-group-standings");
        console.log('✅ Group standings recalculated');
      } catch (calcError) {
        console.warn('⚠️ Failed to recalculate standings:', calcError);
        // 繼續執行，即使計算失敗也要顯示現有數據
      }

      // 使用與錦標賽小組頁面相同的API調用方式
      const [groupsRes, statsRes] = await Promise.all([
        axios.get(`/api/tournaments/${tournamentId}/groups`),
        axios.get("/api/stats/groups"),
      ]);

      if (groupsRes.data.success) {
        const tournamentGroups = groupsRes.data.data?.groups || groupsRes.data.data || [];
        const standings = statsRes.data.success ? statsRes.data.data.standings || [] : [];

        // 組合小組數據和積分榜，與錦標賽頁面相同的邏輯
        const groupsWithStandings = tournamentGroups.map((group) => {
          const groupStandings = standings
            .filter((team) => team.group_id === group.group_id)
            .sort((a, b) => b.points - a.points)
            .map((team) => ({
              team_id: team.team_id,
              name: getDisplayTeamName(team.team_name),
              points: team.points,
              played: team.played,
              won: team.won,
              drawn: team.drawn,
              lost: team.lost,
              gf: team.goals_for,
              ga: team.goals_against,
            }));

          return {
            group_id: group.group_id,
            group_name: group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name,
            internal_name: group.group_name,
            max_teams: group.max_teams,
            current_teams: group.team_count || groupStandings.length,
            teams: groupStandings,
            team_count: group.team_count || 0,
            total_matches: group.total_matches || 0,
            completed_matches: group.completed_matches || 0,
          };
        });

        setGroups(groupsWithStandings);
      } else {
        message.error(t('messages.loadingGroups', { ns: 'group' }));
      }
    } catch (error) {
      console.error("獲取小組數據錯誤:", error);
      message.error(t('messages.noGroupData', { ns: 'group' }));
    } finally {
      setLoading(false);
    }
  };

  const standingsColumns = [
    {
      title: t('standings.position', { ns: 'group' }),
      key: "rank",
      width: 60,
      render: (_, __, index) => (
        <span
          style={{
            fontWeight: "bold",
            color: index < 2 ? "#52c41a" : "#666",
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: t('standings.team', { ns: 'group' }),
      dataIndex: "name",
      key: "name",
      render: (name, record, index) => (
        <Space>
          {index < 2 && <TrophyOutlined style={{ color: "#faad14" }} />}
          <span
            style={{
              fontWeight: index < 2 ? "bold" : "normal",
              color: "#1890ff",
              cursor: "pointer",
              textDecoration: "underline"
            }}
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
          >
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: t('standings.points', { ns: 'group' }),
      dataIndex: "points",
      key: "points",
      width: 60,
      render: (points) => <span style={{ fontWeight: "bold", color: "#1890ff" }}>{points}</span>,
    },
    {
      title: t('standings.played', { ns: 'group' }),
      dataIndex: "played",
      key: "played",
      width: 60,
    },
    {
      title: t('standings.won', { ns: 'group' }),
      dataIndex: "won",
      key: "won",
      width: 50,
      render: (won) => <span style={{ color: "#52c41a" }}>{won}</span>,
    },
    {
      title: t('standings.drawn', { ns: 'group' }),
      dataIndex: "drawn",
      key: "drawn",
      width: 50,
      render: (drawn) => <span style={{ color: "#faad14" }}>{drawn}</span>,
    },
    {
      title: t('standings.lost', { ns: 'group' }),
      dataIndex: "lost",
      key: "lost",
      width: 50,
      render: (lost) => <span style={{ color: "#ff4d4f" }}>{lost}</span>,
    },
    {
      title: t('standings.goalsFor', { ns: 'group' }),
      dataIndex: "gf",
      key: "gf",
      width: 60,
    },
    {
      title: t('standings.goalsAgainst', { ns: 'group' }),
      dataIndex: "ga",
      key: "ga",
      width: 60,
    },
    {
      title: t('standings.goalDifference', { ns: 'group' }),
      key: "gd",
      width: 80,
      render: (_, record) => {
        const gd = record.gf - record.ga;
        return (
          <span
            style={{
              color: gd > 0 ? "#52c41a" : gd < 0 ? "#ff4d4f" : "#666",
              fontWeight: "bold",
            }}
          >
            {gd > 0 ? "+" : ""}
            {gd}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={2}>{t('group.leaderboard', { ns: 'group' })}</Title>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchGroups}
            loading={loading}
            type="primary"
          >
            {t('refresh', { ns: 'common' })}
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {groups.map((group) => (
            <Col xs={24} lg={12} key={group.group_id}>
              <Card
                title={
                  <Space>
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>{t('group.group', { ns: 'group' })} {group.group_name}</span>
                    <Tag color="blue">
                      {group.current_teams || group.team_count || 0}/{group.max_teams} {t('match:match.teams')}
                    </Tag>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div>
                    <Text type="secondary">{t('list.teamCompletion', { ns: 'group' })}</Text>
                    <Progress
                      percent={(group.current_teams / group.max_teams) * 100}
                      size="small"
                      status={group.current_teams === group.max_teams ? "success" : "active"}
                    />
                  </div>

                  <div>
                    <Text type="secondary">{t('group.progress', { ns: 'group' })}</Text>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Progress
                        percent={group.total_matches > 0 ? Math.round((group.completed_matches / group.total_matches) * 100) : 0}
                        size="small"
                        status={group.completed_matches === group.total_matches && group.total_matches > 0 ? "success" : "active"}
                      />
                      <Text style={{ fontSize: "12px", color: "#666", whiteSpace: "nowrap" }}>
                        ({group.completed_matches}/{group.total_matches}{t('group.matches', { ns: 'group' })})
                      </Text>
                    </div>
                  </div>

                  <div>
                    <Text strong style={{ marginBottom: 8, display: "block" }}>
                      {t('group.standings', { ns: 'group' })}
                    </Text>
                    <Table
                      columns={standingsColumns}
                      dataSource={group.teams}
                      pagination={false}
                      size="small"
                      rowKey="name"
                      scroll={{ x: true }}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {groups.length === 0 && !loading && (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text type="secondary">{t('messages.noGroupData', { ns: 'group' })}</Text>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default GroupLeaderboard;