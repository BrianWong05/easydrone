import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
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
import axios from "axios";
import moment from "moment";

const { Title, Text } = Typography;

const TournamentDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
      message.error("載入錦標賽詳情失敗");
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
        message.success("錦標賽狀態更新成功");
        fetchTournamentDetail();
      }
    } catch (error) {
      console.error("更新錦標賽狀態失敗:", error);
      message.error(error.response?.data?.message || "更新錦標賽狀態失敗");
    }
  };

  // 獲取狀態標籤
  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: "orange", text: "待開始" },
      active: { color: "green", text: "進行中" },
      completed: { color: "blue", text: "已完成" },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 獲取比賽狀態標籤
  const getMatchStatusTag = (status) => {
    const statusConfig = {
      pending: { color: "orange", text: "待開始" },
      active: { color: "green", text: "進行中" },
      completed: { color: "blue", text: "已完成" },
      overtime: { color: "purple", text: "延長賽" },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 管理功能卡片數據
  const managementCards = [
    {
      title: "隊伍管理",
      icon: <TeamOutlined style={{ fontSize: 24, color: "#1890ff" }} />,
      description: "管理錦標賽隊伍，新增、編輯隊伍信息",
      count: stats.totalTeams,
      actions: [
        { text: "查看隊伍", path: `/tournaments/${id}/teams` },
        { text: "新增隊伍", path: `/tournaments/${id}/teams/create` },
      ],
    },
    {
      title: "小組管理",
      icon: <GroupOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      description: "管理錦標賽小組，分組和小組設置",
      count: stats.totalGroups,
      actions: [
        { text: "查看小組", path: `/tournaments/${id}/groups` },
        { text: "新增小組", path: `/tournaments/${id}/groups/create` },
      ],
    },
    {
      title: "比賽管理",
      icon: <CalendarOutlined style={{ fontSize: 24, color: "#fa8c16" }} />,
      description: "管理比賽賽程，創建和編輯比賽",
      count: stats.totalMatches,
      actions: [
        { text: "查看比賽", path: `/tournaments/${id}/matches` },
        { text: "新增比賽", path: `/tournaments/${id}/matches/create` },
      ],
    },
    {
      title: "運動員管理",
      icon: <UserOutlined style={{ fontSize: 24, color: "#eb2f96" }} />,
      description: "管理運動員信息和隊伍成員",
      count: stats.totalAthletes,
      actions: [
        { text: "查看運動員", path: `/tournaments/${id}/athletes` },
        { text: "新增運動員", path: `/tournaments/${id}/athletes/create` },
      ],
    },
    {
      title: "積分榜",
      icon: <BarChartOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      description: "查看比賽積分榜和統計數據",
      count: stats.completedMatches,
      actions: [
        { text: "小組積分榜", path: `/tournaments/${id}/leaderboard/groups` },
        { text: "總積分榜", path: `/tournaments/${id}/leaderboard/overall` },
      ],
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Title level={4}>載入中...</Title>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Empty description="找不到錦標賽" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 錦標賽基本信息 */}
        <Card>
          <Row align="middle" justify="space-between">
            <Col>
              <Space align="center">
                <TrophyOutlined style={{ fontSize: 32, color: "#faad14" }} />
                <div>
                  <Title level={2} style={{ margin: 0 }}>
                    {tournament.tournament_name}
                  </Title>
                  <Space>
                    {getStatusTag(tournament.status)}
                    <Text type="secondary">
                      {tournament.tournament_type === "group" && "小組賽"}
                      {tournament.tournament_type === "knockout" && "淘汰賽"}
                      {tournament.tournament_type === "mixed" && "混合賽制"}
                    </Text>
                  </Space>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<EditOutlined />} onClick={() => navigate(`/tournaments/${id}/edit`)}>
                  編輯錦標賽
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  type="primary"
                  onClick={() => navigate(`/tournaments/${id}/settings`)}
                >
                  錦標賽設置
                </Button>
              </Space>
            </Col>
          </Row>

          <Divider />

          <Descriptions column={4}>
            <Descriptions.Item label="開始日期">
              {tournament.start_date ? moment(tournament.start_date).format("YYYY-MM-DD") : "未設置"}
            </Descriptions.Item>
            <Descriptions.Item label="結束日期">
              {tournament.end_date ? moment(tournament.end_date).format("YYYY-MM-DD") : "未設置"}
            </Descriptions.Item>
            <Descriptions.Item label="創建時間">
              {moment(tournament.created_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label="最後更新">
              {moment(tournament.updated_at).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 統計數據 */}
        <Card title="錦標賽統計">
          <Row gutter={16}>
            <Col span={4}>
              <Statistic
                title="總隊伍數"
                value={stats.totalTeams}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="小組數"
                value={stats.totalGroups}
                prefix={<GroupOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="總比賽數"
                value={stats.totalMatches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "#fa8c16" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="運動員數"
                value={stats.totalAthletes}
                prefix={<UserOutlined />}
                valueStyle={{ color: "#eb2f96" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="已完成比賽"
                value={stats.completedMatches}
                prefix={<PlayCircleOutlined />}
                valueStyle={{ color: "#722ed1" }}
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="待進行比賽"
                value={stats.pendingMatches}
                prefix={<StopOutlined />}
                valueStyle={{ color: "#fa541c" }}
              />
            </Col>
          </Row>
        </Card>

        {/* 管理功能區域 */}
        <Card title="管理功能">
          <Row gutter={[16, 16]}>
            {managementCards.map((card, index) => (
              <Col span={8} key={index}>
                <Card hoverable style={{ height: "100%" }} bodyStyle={{ padding: 20 }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Space>
                        {card.icon}
                        <Title level={4} style={{ margin: 0 }}>
                          {card.title}
                        </Title>
                      </Space>
                      <Statistic value={card.count} />
                    </div>
                    <Text type="secondary">{card.description}</Text>
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
          title="最近比賽"
          extra={
            <Button type="link" onClick={() => navigate(`/tournaments/${id}/matches`)}>
              查看全部比賽
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
                      查看詳情
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<CalendarOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{match.match_number}</Text>
                        {getMatchStatusTag(match.match_status)}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text>
                          {getDisplayTeamName(match.team1_name)} vs {getDisplayTeamName(match.team2_name)}
                        </Text>
                        <Text type="secondary">{moment(match.match_date).format("YYYY-MM-DD HH:mm")}</Text>
                        {match.match_status === "completed" && (
                          <Text>
                            比分: {match.team1_score} - {match.team2_score}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暫無比賽記錄" />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default TournamentDetail;
