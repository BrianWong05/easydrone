import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Table,
  Tag,
  Progress,
  message,
  Modal,
  List,
  Avatar,
  Statistic,
  Empty,
  Popconfirm,
  Form,
  Select,
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
  TrophyOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentGroupDetail = () => {
  const navigate = useNavigate();
  const { id: tournamentId, groupId } = useParams();
  const { t } = useTranslation(['group', 'common', 'match']);
  const [group, setGroup] = useState(null);
  const [teams, setTeams] = useState([]);

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return "";
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addTeamModalVisible, setAddTeamModalVisible] = useState(false);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchGroupDetail();
    fetchTournament();
  }, [tournamentId, groupId]);

  // Listen for match result updates and refresh data
  useEffect(() => {
    const handleStorageChange = () => {
      const matchResultUpdated = localStorage.getItem("matchResultUpdated");
      if (matchResultUpdated) {
        // Clear the flag and refresh data
        localStorage.removeItem("matchResultUpdated");
        console.log("🔄 Match result was updated, refreshing group standings...");
        fetchGroupDetail();
      }
    };

    // Check on component mount
    handleStorageChange();

    // Listen for storage changes (when user navigates back from result edit)
    window.addEventListener("storage", handleStorageChange);

    // Also check when the window gains focus (when user returns to this tab)
    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data.tournament || response.data.data);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
    }
  };

  const fetchGroupDetail = async () => {
    try {
      setLoading(true);

      // 獲取小組詳情 - 使用常規的小組API，因為數據結構相同
      const response = await axios.get(`/api/groups/${groupId}`);

      if (response.data.success) {
        const {
          group: groupData,
          teams: teamsData,
          matches: matchesData,
          standings: standingsData,
        } = response.data.data;

        setGroup(groupData);
        setTeams(teamsData || []);
        setMatches(matchesData || []);
        setStandings(standingsData || []);
      } else {
        message.error(t('group:messages.noGroupData'));
      }
    } catch (error) {
      console.error("Error fetching group detail:", error);
      message.error(t('group:messages.noGroupData'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTeams = async () => {
    try {
      // 獲取錦標賽中未分配小組的隊伍
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams`);
      console.log("API Response for available teams:", response.data);

      if (response.data.success) {
        // Handle different possible response structures
        let allTeams = [];
        if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            allTeams = response.data.data;
            console.log("Teams found in response.data.data (array):", allTeams.length);
          } else if (response.data.data.teams && Array.isArray(response.data.data.teams)) {
            allTeams = response.data.data.teams;
            console.log("Teams found in response.data.data.teams:", allTeams.length);
          } else {
            console.log("Unexpected data structure:", response.data.data);
          }
        }

        // 過濾出未分配小組的隊伍
        const unassignedTeams = allTeams.filter((team) => !team.group_id);
        setAvailableTeams(unassignedTeams);
      } else {
        setAvailableTeams([]);
      }
    } catch (error) {
      console.error("Error fetching available teams:", error);
      message.error(t('common:messages.loadFailed'));
      setAvailableTeams([]);
    }
  };

  const handleAddTeam = async (values) => {
    try {
      await axios.post(`/api/groups/${groupId}/teams`, {
        team_id: values.team_id,
      });

      message.success(t('group:detail.teamAddedSuccess'));
      setAddTeamModalVisible(false);
      form.resetFields();
      fetchGroupDetail();
    } catch (error) {
      console.error("Error adding team:", error);
      const errorMessage = error.response?.data?.message || t('group:detail.addTeamFailed');
      message.error(errorMessage);
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      await axios.delete(`/api/groups/${groupId}/teams/${teamId}`);
      message.success(t('group:detail.teamRemovedSuccess'));
      fetchGroupDetail();
    } catch (error) {
      console.error("Error removing team:", error);
      const errorMessage = error.response?.data?.message || t('group:detail.removeTeamFailed');
      message.error(errorMessage);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await axios.delete(`/api/groups/${groupId}`);
      message.success(t('group:messages.groupDeleted'));
      navigate(`/tournaments/${tournamentId}/groups`);
    } catch (error) {
      console.error("Error deleting group:", error);
      const errorMessage = error.response?.data?.message || t('common:messages.operationFailed');
      message.error(errorMessage);
    }
  };

  const handleGenerateMatches = () => {
    navigate(`/tournaments/${tournamentId}/matches/generate`);
  };

  const openAddTeamModal = () => {
    fetchAvailableTeams();
    setAddTeamModalVisible(true);
  };

  // 比賽表格列定義
  const matchColumns = [
    {
      title: t('match:match.number'),
      dataIndex: "match_number",
      key: "match_number",
      width: 120,
      render: (match_number, record) => (
        <Button
          type="link"
          className="p-0 h-auto font-bold"
          onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
        >
          {match_number}
        </Button>
      ),
    },
    {
      title: t('match:match.team1'),
      key: "team1",
      render: (_, record) => (
        <Space>
          <div
            className="w-3 h-3 rounded-full border border-gray-300"
            style={{ backgroundColor: record.team1_color }}
          />
          <Button
            type="link"
            className="p-0 h-auto"
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team1_id}`)}
          >
            {getDisplayTeamName(record.team1_name)}
          </Button>
        </Space>
      ),
    },
    {
      title: t('match:match.score'),
      key: "score",
      align: "center",
      render: (_, record) => (
        <Text strong>
          {record.team1_score} - {record.team2_score}
        </Text>
      ),
    },
    {
      title: t('match:match.team2'),
      key: "team2",
      render: (_, record) => (
        <Space>
          <div
            className="w-3 h-3 rounded-full border border-gray-300"
            style={{ backgroundColor: record.team2_color }}
          />
          <Button
            type="link"
            className="p-0 h-auto"
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team2_id}`)}
          >
            {getDisplayTeamName(record.team2_name)}
          </Button>
        </Space>
      ),
    },
    {
      title: t('match:match.status'),
      dataIndex: "match_status",
      key: "match_status",
      render: (status) => {
        const statusConfig = {
          pending: { color: "default", text: t('match:status.pending') },
          active: { color: "processing", text: t('match:status.active') },
          completed: { color: "success", text: t('match:status.completed') },
          overtime: { color: "warning", text: t('match:status.overtime') },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: t('match:match.date'),
      dataIndex: "match_date",
      key: "match_date",
      render: (date) => new Date(date).toLocaleString("zh-TW"),
    },
    {
      title: t('common:actions.title'),
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
          >
            {t('common:buttons.view')}
          </Button>
          {record.match_status === "pending" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
            >
              {t('match:actions.start')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 積分榜表格列定義
  const standingsColumns = [
    {
      title: t('group:standings.position'),
      key: "rank",
      width: 60,
      render: (_, __, index) => (
        <Text strong className="text-base">
          {index + 1}
        </Text>
      ),
    },
    {
      title: t('group:standings.team'),
      key: "team",
      render: (_, record) => (
        <Space>
          <div
            className="w-3 h-3 rounded-full border border-gray-300"
            style={{ backgroundColor: record.team_color }}
          />
          <Button
            type="link"
            className="p-0 h-auto font-bold"
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
          >
            {getDisplayTeamName(record.team_name)}
          </Button>
        </Space>
      ),
    },
    {
      title: t('group:standings.played'),
      dataIndex: "played",
      key: "played",
      align: "center",
      width: 60,
    },
    {
      title: t('group:standings.won'),
      dataIndex: "won",
      key: "won",
      align: "center",
      width: 50,
      render: (won) => <Text className="text-green-500 font-bold">{won}</Text>,
    },
    {
      title: t('group:standings.drawn'),
      dataIndex: "drawn",
      key: "drawn",
      align: "center",
      width: 50,
      render: (drawn) => <Text className="text-yellow-500 font-bold">{drawn}</Text>,
    },
    {
      title: t('group:standings.lost'),
      dataIndex: "lost",
      key: "lost",
      align: "center",
      width: 50,
      render: (lost) => <Text className="text-red-500 font-bold">{lost}</Text>,
    },
    {
      title: t('group:standings.goalsFor'),
      dataIndex: "goals_for",
      key: "goals_for",
      align: "center",
      width: 60,
    },
    {
      title: t('group:standings.goalsAgainst'),
      dataIndex: "goals_against",
      key: "goals_against",
      align: "center",
      width: 60,
    },
    {
      title: t('group:standings.goalDifference'),
      key: "goal_difference",
      align: "center",
      width: 80,
      render: (_, record) => {
        const diff = record.goals_for - record.goals_against;
        return (
          <Text className={`${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : "text-gray-600"}`}>
            {diff > 0 ? "+" : ""}
            {diff}
          </Text>
        );
      },
    },
    {
      title: t('group:standings.points'),
      dataIndex: "points",
      key: "points",
      align: "center",
      width: 60,
      render: (points) => (
        <Text strong className="text-base text-blue-500">
          {points}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Text>{t('common:messages.loading')}</Text>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('group:detail.groupNotFound')} />
      </div>
    );
  }

  const displayGroupName = group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name;

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* 頁面標題和操作 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}>
              {t('group:detail.backToGroupList')}
            </Button>
            <div>
              <Title level={2} className="m-0">
                <TrophyOutlined className="mr-2 text-yellow-500" />
                {t('group:group.name')} {displayGroupName}
              </Title>
              <Text type="secondary">{tournament?.tournament_name || `${t('tournament:tournament')} ${tournamentId}`} - {t('group:group.detail')}</Text>
            </div>
          </div>

          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/groups/${groupId}/edit`)}
            >
              {t('group:group.edit')}
            </Button>
            <Popconfirm
              title={t('group:messages.deleteConfirmation')}
              description={t('group:detail.deleteWarning')}
              onConfirm={handleDeleteGroup}
              okText={t('common:actions.confirm')}
              cancelText={t('common:actions.cancel')}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t('group:group.delete')}
              </Button>
            </Popconfirm>
          </Space>
        </div>

        {/* 小組統計 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('group:detail.teamCount')}
                value={teams.length}
                suffix={`/ ${group.max_teams}`}
                valueStyle={{ color: teams.length >= group.max_teams ? "#cf1322" : "#3f8600" }}
              />
              <Progress
                percent={(teams.length / group.max_teams) * 100}
                showInfo={false}
                strokeColor={teams.length >= group.max_teams ? "#ff4d4f" : "#52c41a"}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title={t('group:detail.totalMatches')} value={matches.length} valueStyle={{ color: "#1890ff" }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('group:detail.completedMatches')}
                value={matches.filter((m) => m.match_status === "completed").length}
                suffix={`/ ${matches.length}`}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('group:detail.activeMatches')}
                value={matches.filter((m) => m.match_status === "active").length}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
        </Row>

        {/* 隊伍管理 */}
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>{t('group:detail.teamManagement')}</span>
              <Tag color="blue">{teams.length} {t('group:detail.teamsCount')}</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAddTeamModal}
                disabled={teams.length >= group.max_teams}
              >
                {t('group:detail.addTeam')}
              </Button>
              {teams.length >= 2 && matches.length === 0 && (
                <Button type="default" icon={<PlayCircleOutlined />} onClick={handleGenerateMatches}>
                  {t('group:detail.generateRoundRobin')}
                </Button>
              )}
            </Space>
          }
        >
          {teams.length > 0 ? (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
              dataSource={teams}
              renderItem={(team) => (
                <List.Item>
                  <Card
                    size="small"
                    actions={[
                      <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`/tournaments/${tournamentId}/teams/${team.team_id}`)}
                      >
                        {t('common:buttons.view')}
                      </Button>,
                      <Popconfirm
                        title={t('group:detail.removeTeamConfirmation')}
                        onConfirm={() => handleRemoveTeam(team.team_id)}
                        okText={t('common:actions.confirm')}
                        cancelText={t('common:actions.cancel')}
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          {t('group:detail.removeTeam')}
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Card.Meta
                      avatar={<Avatar style={{ backgroundColor: team.team_color }} icon={<TeamOutlined />} />}
                      title={getDisplayTeamName(team.team_name)}
                      description={`${t('team:labels.teamColor')}: ${team.team_color}`}
                    />
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('group:messages.noTeamsInGroup')}>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddTeamModal}>
                {t('group:detail.addFirstTeam')}
              </Button>
            </Empty>
          )}
        </Card>

        {/* 積分榜 */}
        {standings.length > 0 && (
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>{t('group:group.standings')}</span>
              </Space>
            }
          >
            <Table columns={standingsColumns} dataSource={standings} rowKey="team_id" pagination={false} size="small" />
          </Card>
        )}

        {/* 比賽列表 */}
        <Card
          title={
            <Space>
              <PlayCircleOutlined />
              <span>{t('group:detail.matchList')}</span>
              <Tag color="blue">{matches.length} {t('group:detail.matchesCount')}</Tag>
            </Space>
          }
        >
          {matches.length > 0 ? (
            <Table columns={matchColumns} dataSource={matches} rowKey="match_id" pagination={false} size="small" />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={teams.length < 2 ? t('group:detail.needTwoTeams') : t('group:messages.noMatchesInGroup')}
            >
              {teams.length >= 2 && (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleGenerateMatches}>
                  {t('group:detail.generateRoundRobin')}
                </Button>
              )}
            </Empty>
          )}
        </Card>
      </Space>

      {/* 添加隊伍模態框 */}
      <Modal
        title={t('group:detail.addTeamToGroup')}
        open={addTeamModalVisible}
        onCancel={() => setAddTeamModalVisible(false)}
        footer={null}
      >
        {availableTeams.length > 0 ? (
          <Form form={form} layout="vertical" onFinish={handleAddTeam}>
            <Form.Item label={t('group:detail.selectTeam')} name="team_id" rules={[{ required: true, message: t('group:detail.selectTeamRequired') }]}>
              <Select placeholder={t('group:detail.selectTeamPlaceholder')} size="large">
                {availableTeams.map((team) => (
                  <Option key={team.team_id} value={team.team_id}>
                    <Space>
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: team.team_color }}
                      />
                      {getDisplayTeamName(team.team_name)}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {t('group:detail.addTeam')}
                </Button>
                <Button onClick={() => setAddTeamModalVisible(false)}>{t('common:buttons.cancel')}</Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <div className="text-center py-10">
            <TeamOutlined className="text-5xl text-gray-300 mb-4" />
            <div>
              <Text type="secondary">{t('group:detail.noAvailableTeams')}</Text>
              <br />
              <Text type="secondary" className="text-xs">
                {t('group:detail.allTeamsAssigned')}
              </Text>
              <br />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="mt-4"
                onClick={() => {
                  setAddTeamModalVisible(false);
                  navigate(`/tournaments/${tournamentId}/teams/create`);
                }}
              >
                {t('team:create.createTeam')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TournamentGroupDetail;
