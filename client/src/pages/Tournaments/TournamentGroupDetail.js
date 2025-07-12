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
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentGroupDetail = () => {
  const navigate = useNavigate();
  const { id: tournamentId, groupId } = useParams();
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
        message.error("獲取小組詳情失敗");
      }
    } catch (error) {
      console.error("Error fetching group detail:", error);
      message.error("獲取小組詳情失敗");
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
      message.error("獲取可用隊伍失敗");
      setAvailableTeams([]);
    }
  };

  const handleAddTeam = async (values) => {
    try {
      await axios.post(`/api/groups/${groupId}/teams`, {
        team_id: values.team_id,
      });

      message.success("隊伍添加成功");
      setAddTeamModalVisible(false);
      form.resetFields();
      fetchGroupDetail();
    } catch (error) {
      console.error("Error adding team:", error);
      const errorMessage = error.response?.data?.message || "添加隊伍失敗";
      message.error(errorMessage);
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      await axios.delete(`/api/groups/${groupId}/teams/${teamId}`);
      message.success("隊伍移除成功");
      fetchGroupDetail();
    } catch (error) {
      console.error("Error removing team:", error);
      const errorMessage = error.response?.data?.message || "移除隊伍失敗";
      message.error(errorMessage);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await axios.delete(`/api/groups/${groupId}`);
      message.success("小組刪除成功");
      navigate(`/tournaments/${tournamentId}/groups`);
    } catch (error) {
      console.error("Error deleting group:", error);
      const errorMessage = error.response?.data?.message || "刪除小組失敗";
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
      title: "比賽編號",
      dataIndex: "match_number",
      key: "match_number",
      width: 120,
    },
    {
      title: "隊伍1",
      key: "team1",
      render: (_, record) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: record.team1_color,
              borderRadius: "50%",
              border: "1px solid #d9d9d9",
            }}
          />
          <Text>{getDisplayTeamName(record.team1_name)}</Text>
        </Space>
      ),
    },
    {
      title: "比分",
      key: "score",
      align: "center",
      render: (_, record) => (
        <Text strong>
          {record.team1_score} - {record.team2_score}
        </Text>
      ),
    },
    {
      title: "隊伍2",
      key: "team2",
      render: (_, record) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: record.team2_color,
              borderRadius: "50%",
              border: "1px solid #d9d9d9",
            }}
          />
          <Text>{getDisplayTeamName(record.team2_name)}</Text>
        </Space>
      ),
    },
    {
      title: "狀態",
      dataIndex: "match_status",
      key: "match_status",
      render: (status) => {
        const statusConfig = {
          pending: { color: "default", text: "待開始" },
          active: { color: "processing", text: "進行中" },
          completed: { color: "success", text: "已完成" },
          overtime: { color: "warning", text: "延長賽" },
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "比賽時間",
      dataIndex: "match_date",
      key: "match_date",
      render: (date) => new Date(date).toLocaleString("zh-TW"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
          >
            詳情
          </Button>
          {record.match_status === "pending" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
            >
              開始
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 積分榜表格列定義
  const standingsColumns = [
    {
      title: "排名",
      key: "rank",
      width: 60,
      render: (_, __, index) => (
        <Text strong style={{ fontSize: "16px" }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: "隊伍",
      key: "team",
      render: (_, record) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: record.team_color,
              borderRadius: "50%",
              border: "1px solid #d9d9d9",
            }}
          />
          <Text strong>{getDisplayTeamName(record.team_name)}</Text>
        </Space>
      ),
    },
    {
      title: "場次",
      dataIndex: "played",
      key: "played",
      align: "center",
      width: 60,
    },
    {
      title: "勝",
      dataIndex: "won",
      key: "won",
      align: "center",
      width: 50,
      render: (won) => <Text style={{ color: "#52c41a", fontWeight: "bold" }}>{won}</Text>,
    },
    {
      title: "平",
      dataIndex: "drawn",
      key: "drawn",
      align: "center",
      width: 50,
      render: (drawn) => <Text style={{ color: "#faad14", fontWeight: "bold" }}>{drawn}</Text>,
    },
    {
      title: "負",
      dataIndex: "lost",
      key: "lost",
      align: "center",
      width: 50,
      render: (lost) => <Text style={{ color: "#ff4d4f", fontWeight: "bold" }}>{lost}</Text>,
    },
    {
      title: "進球",
      dataIndex: "goals_for",
      key: "goals_for",
      align: "center",
      width: 60,
    },
    {
      title: "失球",
      dataIndex: "goals_against",
      key: "goals_against",
      align: "center",
      width: 60,
    },
    {
      title: "淨勝球",
      key: "goal_difference",
      align: "center",
      width: 80,
      render: (_, record) => {
        const diff = record.goals_for - record.goals_against;
        return (
          <Text style={{ color: diff > 0 ? "#52c41a" : diff < 0 ? "#ff4d4f" : "#666" }}>
            {diff > 0 ? "+" : ""}
            {diff}
          </Text>
        );
      },
    },
    {
      title: "積分",
      dataIndex: "points",
      key: "points",
      align: "center",
      width: 60,
      render: (points) => (
        <Text strong style={{ fontSize: "16px", color: "#1890ff" }}>
          {points}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Text>載入中...</Text>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ padding: "24px" }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="找不到指定的小組" />
      </div>
    );
  }

  const displayGroupName = group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name;

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 頁面標題和操作 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}>
              返回小組列表
            </Button>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <TrophyOutlined style={{ marginRight: 8, color: "#faad14" }} />
                小組 {displayGroupName}
              </Title>
              <Text type="secondary">{tournament?.tournament_name || `錦標賽 ${tournamentId}`} - 小組詳情</Text>
            </div>
          </div>

          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/groups/${groupId}/edit`)}
            >
              編輯小組
            </Button>
            <Popconfirm
              title="確定要刪除這個小組嗎？"
              description="刪除後將無法恢復，相關的隊伍和比賽也會被影響。"
              onConfirm={handleDeleteGroup}
              okText="確定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                刪除小組
              </Button>
            </Popconfirm>
          </Space>
        </div>

        {/* 小組統計 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="隊伍數量"
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
              <Statistic title="比賽場次" value={matches.length} valueStyle={{ color: "#1890ff" }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已完成比賽"
                value={matches.filter((m) => m.match_status === "completed").length}
                suffix={`/ ${matches.length}`}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="進行中比賽"
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
              <span>隊伍管理</span>
              <Tag color="blue">{teams.length} 支隊伍</Tag>
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
                添加隊伍
              </Button>
              {teams.length >= 2 && matches.length === 0 && (
                <Button type="default" icon={<PlayCircleOutlined />} onClick={handleGenerateMatches}>
                  生成循環賽
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
                        詳情
                      </Button>,
                      <Popconfirm
                        title="確定要移除這支隊伍嗎？"
                        onConfirm={() => handleRemoveTeam(team.team_id)}
                        okText="確定"
                        cancelText="取消"
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          移除
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Card.Meta
                      avatar={<Avatar style={{ backgroundColor: team.team_color }} icon={<TeamOutlined />} />}
                      title={getDisplayTeamName(team.team_name)}
                      description={`隊伍顏色: ${team.team_color}`}
                    />
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暫無隊伍">
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddTeamModal}>
                添加第一支隊伍
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
                <span>積分榜</span>
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
              <span>比賽列表</span>
              <Tag color="blue">{matches.length} 場比賽</Tag>
            </Space>
          }
        >
          {matches.length > 0 ? (
            <Table columns={matchColumns} dataSource={matches} rowKey="match_id" pagination={false} size="small" />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={teams.length < 2 ? "至少需要2支隊伍才能創建比賽" : "暫無比賽"}
            >
              {teams.length >= 2 && (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleGenerateMatches}>
                  生成循環賽
                </Button>
              )}
            </Empty>
          )}
        </Card>
      </Space>

      {/* 添加隊伍模態框 */}
      <Modal
        title="添加隊伍到小組"
        open={addTeamModalVisible}
        onCancel={() => setAddTeamModalVisible(false)}
        footer={null}
      >
        {availableTeams.length > 0 ? (
          <Form form={form} layout="vertical" onFinish={handleAddTeam}>
            <Form.Item label="選擇隊伍" name="team_id" rules={[{ required: true, message: "請選擇要添加的隊伍" }]}>
              <Select placeholder="請選擇隊伍" size="large">
                {availableTeams.map((team) => (
                  <Option key={team.team_id} value={team.team_id}>
                    <Space>
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          backgroundColor: team.team_color,
                          borderRadius: "50%",
                          border: "1px solid #d9d9d9",
                        }}
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
                  添加隊伍
                </Button>
                <Button onClick={() => setAddTeamModalVisible(false)}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <TeamOutlined style={{ fontSize: "48px", color: "#ccc", marginBottom: "16px" }} />
            <div>
              <Text type="secondary">沒有可添加的隊伍</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                所有隊伍都已分配到小組或已在當前小組中
              </Text>
              <br />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ marginTop: "16px" }}
                onClick={() => {
                  setAddTeamModalVisible(false);
                  navigate(`/tournaments/${tournamentId}/teams/create`);
                }}
              >
                創建新隊伍
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TournamentGroupDetail;
