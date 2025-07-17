import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Row, Col, Space, Progress, message, Button } from 'antd';
import { TrophyOutlined, TeamOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';


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
          className={`font-bold ${
            index < 2 ? "text-green-500" : "text-gray-600"
          }`}
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
          {index < 2 && <TrophyOutlined className="text-yellow-500" />}
          <span
            className={`${
              index < 2 ? "font-bold" : "font-normal"
            } text-blue-500 cursor-pointer underline hover:text-blue-600`}
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
      render: (points) => <span className="font-bold text-blue-500">{points}</span>,
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
      render: (won) => <span className="text-green-500">{won}</span>,
    },
    {
      title: t('standings.drawn', { ns: 'group' }),
      dataIndex: "drawn",
      key: "drawn",
      width: 50,
      render: (drawn) => <span className="text-yellow-500">{drawn}</span>,
    },
    {
      title: t('standings.lost', { ns: 'group' }),
      dataIndex: "lost",
      key: "lost",
      width: 50,
      render: (lost) => <span className="text-red-500">{lost}</span>,
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
            className={`font-bold ${
              gd > 0 ? "text-green-500" : gd < 0 ? "text-red-500" : "text-gray-600"
            }`}
          >
            {gd > 0 ? "+" : ""}
            {gd}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{t('group.leaderboard', { ns: 'group' })}</h2>
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
                    <span className="text-lg font-bold">{t('group.group', { ns: 'group' })} {group.group_name}</span>
                    <Tag color="blue">
                      {group.current_teams || group.team_count || 0}/{group.max_teams} {t('match:match.teams')}
                    </Tag>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <span className="text-gray-500">{t('list.teamCompletion', { ns: 'group' })}</span>
                    <Progress
                      percent={(group.current_teams / group.max_teams) * 100}
                      size="small"
                      status={group.current_teams === group.max_teams ? "success" : "active"}
                    />
                  </div>

                  <div>
                    <span className="text-gray-500">{t('group.progress', { ns: 'group' })}</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        percent={group.total_matches > 0 ? Math.round((group.completed_matches / group.total_matches) * 100) : 0}
                        size="small"
                        status={group.completed_matches === group.total_matches && group.total_matches > 0 ? "success" : "active"}
                      />
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        ({group.completed_matches}/{group.total_matches}{t('group.matches', { ns: 'group' })})
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold mb-2 block">
                      {t('group.standings', { ns: 'group' })}
                    </span>
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
            <div className="text-center py-10">
              <span className="text-gray-500">{t('messages.noGroupData', { ns: 'group' })}</span>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default GroupLeaderboard;