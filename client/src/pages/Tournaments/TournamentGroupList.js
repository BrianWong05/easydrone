import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Space, Row, Col, Table, Tag, Progress, message } from "antd";
import { PlusOutlined, EyeOutlined, EditOutlined, TrophyOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import axios from "axios";

const { Title, Text } = Typography;

const TournamentGroupList = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const { t } = useTranslation(['group', 'common']);
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

      // 使用錦標賽專屬端點
      const [groupsRes, statsRes] = await Promise.all([
        axios.get(`/api/tournaments/${tournamentId}/groups`),
        axios.get("/api/stats/groups"),
      ]);

      if (groupsRes.data.success) {
        const tournamentGroups = groupsRes.data.data?.groups || groupsRes.data.data || [];
        const standings = statsRes.data.success ? statsRes.data.data.standings || [] : [];

        // 組合小組數據和積分榜
        const groupsWithStandings = tournamentGroups.map((group) => {
          const groupStandings = standings
            .filter((team) => team.group_id === group.group_id)
            .sort((a, b) => b.points - a.points)
            .map((team) => ({
              team_id: team.team_id, // 添加 team_id 用於導航
              name: team.team_name,
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
            group_name: group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name, // Show only letter part
            internal_name: group.group_name, // Keep internal name for reference
            max_teams: group.max_teams || 4, // Default to 4 if not provided
            current_teams: groupStandings.length,
            teams: groupStandings,
            team_count: group.team_count || 0, // Add team count from API
            total_matches: group.total_matches || 0,
            completed_matches: group.completed_matches || 0,
          };
        });

        setGroups(groupsWithStandings);
      } else {
        message.error(t('group:messages.loadingGroups'));
      }
    } catch (error) {
      console.error("獲取小組數據錯誤:", error);
      message.error(t('group:messages.noGroupData'));
    } finally {
      setLoading(false);
    }
  };

  const standingsColumns = [
    {
      title: t('group:standings.position'),
      key: "rank",
      width: 60,
      render: (_, __, index) => (
        <span
          className={`font-bold ${index < 2 ? 'text-green-500' : 'text-gray-600'}`}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: t('group:standings.team'),
      dataIndex: "name",
      key: "name",
      render: (name, record, index) => (
        <Space>
          {index < 2 && <TrophyOutlined className="text-yellow-500" />}
          <span
            className={`${index < 2 ? 'font-bold' : 'font-normal'} text-blue-500 cursor-pointer underline`}
            onClick={() => {
              if (record.team_id) {
                navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`);
              } else {
                message.warning(t('common:messages.noData'));
              }
            }}
          >
            {getDisplayTeamName(name)}
          </span>
        </Space>
      ),
    },
    {
      title: t('group:standings.points'),
      dataIndex: "points",
      key: "points",
      width: 60,
      render: (points) => <span className="font-bold text-blue-500">{points}</span>,
    },
    {
      title: t('group:standings.played'),
      dataIndex: "played",
      key: "played",
      width: 60,
    },
    {
      title: t('group:standings.won'),
      dataIndex: "won",
      key: "won",
      width: 50,
      render: (won) => <span className="text-green-500">{won}</span>,
    },
    {
      title: t('group:standings.drawn'),
      dataIndex: "drawn",
      key: "drawn",
      width: 50,
      render: (drawn) => <span className="text-yellow-500">{drawn}</span>,
    },
    {
      title: t('group:standings.lost'),
      dataIndex: "lost",
      key: "lost",
      width: 50,
      render: (lost) => <span className="text-red-500">{lost}</span>,
    },
    {
      title: t('group:standings.goalsFor'),
      dataIndex: "gf",
      key: "gf",
      width: 60,
    },
    {
      title: t('group:standings.goalsAgainst'),
      dataIndex: "ga",
      key: "ga",
      width: 60,
    },
    {
      title: t('group:standings.goalDifference'),
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
          <Title level={2}>{t('group:group.list')}</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/groups/create`)}
          >
            {t('group:group.create')}
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {groups.map((group) => (
            <Col xs={24} lg={12} key={group.group_id}>
              <Card
                title={
                  <Space>
                    <span className="text-lg font-bold">{t('group:group.name')} {group.group_name}</span>
                    <Tag color="blue">
                      {group.current_teams}/{group.max_teams} {t('group:group.teams')}
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/tournaments/${tournamentId}/groups/${group.group_id}`)}
                    >
                      {t('common:buttons.view')}
                    </Button>
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/tournaments/${tournamentId}/groups/${group.group_id}/edit`)}
                    >
                      {t('common:buttons.edit')}
                    </Button>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" className="w-full" size="middle">
                  <div>
                    <Text type="secondary">{t('group:list.teamCompletion')}</Text>
                    <Progress
                      percent={group.max_teams > 0 ? Math.round((group.current_teams / group.max_teams) * 100) : 0}
                      size="small"
                      status={group.current_teams === group.max_teams ? "success" : "active"}
                      format={(percent) => `${group.current_teams || 0}/${group.max_teams || 4}`}
                    />
                  </div>

                  <div>
                    <Text strong className="mb-2 block">
                      {t('group:group.standings')}
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
            <div className="text-center py-10">
              <Text type="secondary">{t('group:messages.noGroups')}</Text>
              <br />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/groups/create`)}
                className="mt-4"
              >
                {t('group:list.createFirstGroup')}
              </Button>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default TournamentGroupList;
