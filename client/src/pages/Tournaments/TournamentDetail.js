import React, { useState, useEffect } from "react";
import {
  Card,
  Button,
  Space,
  Descriptions,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Empty,
  List,
  Avatar,
  Divider,
} from "antd";
import {
  TrophyOutlined,
  EditOutlined,
  CalendarOutlined,
  TeamOutlined,
  PlayCircleOutlined,
  StopOutlined,
  BarChartOutlined,
  UserOutlined,
  GroupOutlined,
  PlusOutlined,
  SettingOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import moment from "moment";


const TournamentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation(['tournament', 'common']);
  const [tournament, setTournament] = useState(null);

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${id}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalGroups: 0,
    totalMatches: 0,
    totalAthletes: 0,
    completedMatches: 0,
    pendingMatches: 0,
  });
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // 獲取錦標賽詳情和統計數據
  const fetchTournamentDetail = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/tournaments/${id}`);
      if (response.data.success) {
        const data = response.data.data;
        setTournament(data.tournament);

        // 計算統計數據
        const teams = data.teams || [];
        const groups = data.groups || [];
        const matches = data.matches || [];

        const completedMatches = matches.filter((m) => m.match_status === "completed").length;
        const pendingMatches = matches.filter((m) => m.match_status === "pending").length;

        setStats({
          totalTeams: teams.length,
          totalGroups: groups.length,
          totalMatches: matches.length,
          totalAthletes: teams.reduce((sum, team) => sum + (team.athlete_count || 0), 0),
          completedMatches,
          pendingMatches,
        });

        // 設置最近的比賽（最多5場）
        const sortedMatches = matches.sort((a, b) => new Date(b.match_date) - new Date(a.match_date)).slice(0, 5);
        setRecentMatches(sortedMatches);
      }
    } catch (error) {
      console.error("Error fetching tournament detail:", error);
      message.error(t('common:messages.dataLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTournamentDetail();
    }
  }, [id]);

  // 更新錦標賽狀態
  const handleStatusUpdate = async (status) => {
    try {
      const response = await axios.put(`/api/tournaments/${id}/status`, { status });
      if (response.data.success) {
        message.success(t('tournament:messages.statusUpdateSuccess'));
        fetchTournamentDetail();
      }
    } catch (error) {
      console.error("更新錦標賽狀態失敗:", error);
      message.error(error.response?.data?.message || t('common:messages.operationFailed'));
    }
  };

  // 獲取狀態標籤
  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: "orange", text: t('tournament:detail.status.pending') },
      active: { color: "green", text: t('tournament:detail.status.active') },
      completed: { color: "blue", text: t('tournament:detail.status.completed') },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 獲取比賽狀態標籤
  const getMatchStatusTag = (status) => {
    const statusConfig = {
      pending: { color: "orange", text: t('tournament:detail.status.pending') },
      active: { color: "green", text: t('tournament:detail.status.active') },
      completed: { color: "blue", text: t('tournament:detail.status.completed') },
      overtime: { color: "purple", text: t('tournament:detail.status.overtime') },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 管理功能卡片數據
  const managementCards = [
    {
      title: t('tournament:detail.management.teams.title'),
      icon: <TeamOutlined className="text-2xl text-blue-500" />,
      description: t('tournament:detail.management.teams.description'),
      count: stats.totalTeams,
      actions: [
        { text: t('tournament:detail.management.teams.viewTeams'), path: `/tournaments/${id}/teams` },
        { text: t('tournament:detail.management.teams.addTeam'), path: `/tournaments/${id}/teams/create` },
      ],
    },
    {
      title: t('tournament:detail.management.groups.title'),
      icon: <GroupOutlined className="text-2xl text-green-500" />,
      description: t('tournament:detail.management.groups.description'),
      count: stats.totalGroups,
      actions: [
        { text: t('tournament:detail.management.groups.viewGroups'), path: `/tournaments/${id}/groups` },
        { text: t('tournament:detail.management.groups.addGroup'), path: `/tournaments/${id}/groups/create` },
      ],
    },
    {
      title: t('tournament:detail.management.matches.title'),
      icon: <CalendarOutlined className="text-2xl text-orange-500" />,
      description: t('tournament:detail.management.matches.description'),
      count: stats.totalMatches,
      actions: [
        { text: t('tournament:detail.management.matches.viewMatches'), path: `/tournaments/${id}/matches` },
        { text: t('tournament:detail.management.matches.addMatch'), path: `/tournaments/${id}/matches/create` },
      ],
    },
    {
      title: t('tournament:detail.management.athletes.title'),
      icon: <UserOutlined className="text-2xl text-pink-500" />,
      description: t('tournament:detail.management.athletes.description'),
      count: stats.totalAthletes,
      actions: [
        { text: t('tournament:detail.management.athletes.viewAthletes'), path: `/tournaments/${id}/athletes` },
        { text: t('tournament:detail.management.athletes.addAthlete'), path: `/tournaments/${id}/athletes/create` },
      ],
    },
    {
      title: t('tournament:detail.management.leaderboard.title'),
      icon: <BarChartOutlined className="text-2xl text-purple-500" />,
      description: t('tournament:detail.management.leaderboard.description'),
      count: stats.completedMatches,
      actions: [
        { text: t('tournament:detail.management.leaderboard.groupLeaderboard'), path: `/tournaments/${id}/leaderboard/groups` },
        { text: t('tournament:detail.management.leaderboard.overallLeaderboard'), path: `/tournaments/${id}/leaderboard/overall` },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-center">
        <h4 className="text-lg font-semibold m-0">{t('tournament:detail.loading')}</h4>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-6 text-center">
        <Empty description={t('tournament:detail.notFound')} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* 錦標賽基本信息 */}
        <Card>
          <Row align="middle" justify="space-between">
            <Col>
              <Space align="center">
                <TrophyOutlined className="text-3xl text-yellow-500" />
                <div>
                  <h2 className="text-2xl font-bold m-0">
                    {tournament.tournament_name}
                  </h2>
                  <Space>
                    {getStatusTag(tournament.status)}
                    <span className="text-gray-500">
                      {tournament.tournament_type === "group" && t('tournament:types.groupStage')}
                      {tournament.tournament_type === "knockout" && t('tournament:types.knockout')}
                      {tournament.tournament_type === "mixed" && t('tournament:types.mixed')}
                    </span>
                  </Space>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/tournaments/${id}/edit`)}>
                  {t('tournament:detail.editTournament')}
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  type="primary"
                  onClick={() => navigate(`/tournaments/${id}/settings`)}
                >
                  {t('tournament:detail.tournamentSettings')}
                </Button>
              </Space>
            </Col>
          </Row>

          <Divider />

          <Descriptions column={4}>
            <Descriptions.Item label={t('tournament:detail.startDate')}>
              {tournament.start_date ? moment(tournament.start_date).format("YYYY-MM-DD") : t('tournament:detail.notSet')}
            </Descriptions.Item>
            <Descriptions.Item label={t('tournament:detail.endDate')}>
              {tournament.end_date ? moment(tournament.end_date).format("YYYY-MM-DD") : t('tournament:detail.notSet')}
            </Descriptions.Item>
            <Descriptions.Item label={t('tournament:detail.createdAt')}>
              {moment(tournament.created_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label={t('tournament:detail.lastUpdated')}>
              {moment(tournament.updated_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 統計數據 */}
        <Card title={t('tournament:detail.statistics')}>
          <Row gutter={16}>
            <Col span={4}>
              <Statistic
                title={t('tournament:detail.totalTeams')}
                value={stats.totalTeams}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#3b82f6" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={t('tournament:detail.totalGroups')}
                value={stats.totalGroups}
                prefix={<GroupOutlined />}
                valueStyle={{ color: "#10b981" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={t('tournament:detail.totalMatches')}
                value={stats.totalMatches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "#f97316" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={t('tournament:detail.totalAthletes')}
                value={stats.totalAthletes}
                prefix={<UserOutlined />}
                valueStyle={{ color: "#ec4899" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={t('tournament:detail.completedMatches')}
                value={stats.completedMatches}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: "#8b5cf6" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title={t('tournament:detail.pendingMatches')}
                value={stats.pendingMatches}
                prefix={<StopOutlined />}
                valueStyle={{ color: "#f97316" }}
              />
            </Col>
          </Row>
        </Card>

        {/* 管理功能區域 */}
        <Card title={t('tournament:detail.managementFunctions')}>
          <Row gutter={[16, 16]}>
            {managementCards.map((card, index) => (
              <Col span={8} key={index}>
                <Card hoverable className="h-full" bodyStyle={{ padding: 20 }}>
                  <Space direction="vertical" className="w-full">
                    <div className="flex items-center justify-between">
                      <Space>
                        {card.icon}
                        <h4 className="text-lg font-semibold m-0">
                          {card.title}
                        </h4>
                      </Space>
                      <Statistic value={card.count} />
                    </div>
                    <p className="text-gray-500 m-0">{card.description}</p>
                    <Space wrap>
                      {card.actions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          size="small"
                          onClick={() => navigate(action.path)}
                          icon={<RightOutlined />}
                        >
                          {action.text}
                        </Button>
                      ))}
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 最近比賽 */}
        <Card
          title={t('tournament:detail.recentMatches')}
          extra={
            <Button type="link" onClick={() => navigate(`/tournaments/${id}/matches`)}>
              {t('tournament:detail.viewAllMatches')}
            </Button>
          }
        >
          {recentMatches.length > 0 ? (
            <List
              dataSource={recentMatches}
              renderItem={(match) => (
                <List.Item
                  actions={[
                    <Button type="link" onClick={() => navigate(`/tournaments/${id}/matches/${match.match_id}`)}>
                      {t('tournament:detail.viewDetails')}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<CalendarOutlined />} />}
                    title={
                      <Space>
                        <strong className="font-semibold">{match.match_number}</strong>
                        {getMatchStatusTag(match.match_status)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <span>
                          {getDisplayTeamName(match.team1_name)} vs {getDisplayTeamName(match.team2_name)}
                        </span>
                        <span className="text-gray-500">{moment(match.match_date).format("YYYY-MM-DD HH:mm")}</span>
                        {match.match_status === "completed" && (
                          <span>
                            {t('tournament:detail.score')}: {match.team1_score} - {match.team2_score}
                          </span>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description={t('tournament:detail.noMatchRecords')} />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default TournamentDetail;
