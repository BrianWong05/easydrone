import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Space, Table, Tag, Avatar, message, Input, Select, Tooltip, Popconfirm } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentTeamList = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30,
    total: 0,
  });
  const [teamStats, setTeamStats] = useState({
    total_teams: 0,
    grouped_teams: 0,
    ungrouped_teams: 0,
    virtual_teams: 0,
  });

  useEffect(() => {
    fetchTournament();
    fetchTeams(pagination.current, pagination.pageSize);
    fetchGroups();
    fetchTeamStats();
  }, [tournamentId]);

  // Add effect to handle search and filter changes
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      fetchTeams(1, pagination.pageSize); // Reset to first page when searching
    }, 500); // Debounce search by 500ms

    return () => clearTimeout(delayTimer);
  }, [searchText, filterGroup]);

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

  const fetchTeams = async (page = 1, pageSize = 30) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      });
      
      // Add search parameter if search text exists
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }
      
      // Add group filter if not "all"
      if (filterGroup !== 'all') {
        if (filterGroup === 'unassigned') {
          params.append('unassigned', 'true');
        } else {
          params.append('group_id', filterGroup);
        }
      }
      
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams?${params}`);
      console.log("🔍 Teams API Response:", response.data); // Debug log
      if (response.data.success) {
        // Fix: Access teams from response.data.data.teams, not response.data.data
        const teamsData = response.data.data?.teams || response.data.data || [];
        const paginationData = response.data.data?.pagination || {};
        console.log("📊 Teams Data:", teamsData); // Debug log
        console.log("📄 Pagination Data:", paginationData); // Debug log
        setTeams(teamsData);
        setPagination({
          current: paginationData.page || page,
          pageSize: paginationData.limit || pageSize,
          total: paginationData.total || 0,
        });
      } else {
        message.error("獲取隊伍列表失敗");
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      message.error("獲取隊伍列表失敗");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      console.log("🔍 Groups API Response:", response.data); // Debug log
      if (response.data.success) {
        // Fix: Access groups from response.data.data.groups, not response.data.data
        const groupsData = response.data.data?.groups || response.data.data || [];
        console.log("📊 Groups Data:", groupsData); // Debug log
        setGroups(groupsData);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams/stats`);
      console.log("🔍 Team Stats API Response:", response.data); // Debug log
      if (response.data.success) {
        setTeamStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching team stats:", error);
    }
  };

  const handleDelete = async (teamId) => {
    try {
      await axios.delete(`/api/tournaments/${tournamentId}/teams/${teamId}`);
      message.success("隊伍刪除成功");
      fetchTeams(pagination.current, pagination.pageSize);
      fetchTeamStats(); // Refresh statistics after deletion
    } catch (error) {
      console.error("Error deleting team:", error);
      const errorMessage = error.response?.data?.message || "刪除隊伍失敗";
      message.error(errorMessage);
    }
  };

  const handleTableChange = (paginationConfig) => {
    const { current, pageSize } = paginationConfig;
    fetchTeams(current, pageSize);
  };

  // Note: Filtering is now handled server-side through pagination
  // Client-side filtering is disabled when using server-side pagination
  const filteredTeams = Array.isArray(teams) ? teams : [];

  const columns = [
    {
      title: "隊伍",
      key: "team",
      render: (_, record) => {
        const displayName = record.team_name?.includes("_") ? record.team_name.split("_")[0] : record.team_name;
        return (
          <Space>
            <Avatar
              style={{
                backgroundColor: record.team_color,
                color: "#fff",
                fontWeight: "bold",
              }}
              icon={<TeamOutlined />}
            >
              {displayName.charAt(0)}
            </Avatar>
            <div>
              <Text 
                strong 
                style={{ cursor: "pointer", color: "#1890ff" }}
                onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
              >
                {displayName}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                {record.team_color}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: "所屬小組",
      key: "group",
      render: (_, record) => {
        if (!record.group_id) {
          return <Tag color="default">未分配</Tag>;
        }
        const group = Array.isArray(groups) ? groups.find((g) => g.group_id === record.group_id) : null;
        const groupDisplayName = group?.group_name?.includes("_") ? group.group_name.split("_")[0] : group?.group_name;
        return <Tag color="blue">小組 {groupDisplayName || record.group_id}</Tag>;
      },
    },
    {
      title: "隊伍類型",
      dataIndex: "is_virtual",
      key: "is_virtual",
      render: (isVirtual) => <Tag color={isVirtual ? "orange" : "green"}>{isVirtual ? "虛擬隊伍" : "真實隊伍"}</Tag>,
    },
    {
      title: "創建時間",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => new Date(date).toLocaleDateString("zh-TW"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            />
          </Tooltip>
          <Tooltip title="編輯隊伍">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}/edit`)}
            />
          </Tooltip>
          <Popconfirm
            title="確定要刪除這支隊伍嗎？"
            description="刪除後將無法恢復，相關的運動員和比賽記錄也會被影響。"
            onConfirm={() => handleDelete(record.team_id)}
            okText="確定"
            cancelText="取消"
          >
            <Tooltip title="刪除隊伍">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 頁面標題 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <TrophyOutlined style={{ marginRight: 8, color: "#faad14" }} />
              錦標賽隊伍管理
            </Title>
            <Text type="secondary">{tournament?.tournament_name || `錦標賽 ${tournamentId}`} - 管理參賽隊伍</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/create`)}
            size="large"
          >
            新增隊伍
          </Button>
        </div>

        {/* 統計信息 */}
        <Card>
          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1890ff" }}>
                {teamStats.total_teams || 0}
              </div>
              <div style={{ color: "#666" }}>總隊伍數</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#52c41a" }}>
                {teamStats.grouped_teams || 0}
              </div>
              <div style={{ color: "#666" }}>已分組</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#faad14" }}>
                {teamStats.ungrouped_teams || 0}
              </div>
              <div style={{ color: "#666" }}>未分組</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#722ed1" }}>
                {teamStats.virtual_teams || 0}
              </div>
              <div style={{ color: "#666" }}>虛擬隊伍</div>
            </div>
          </div>
        </Card>

        {/* 搜索和過濾 */}
        <Card>
          <Space size="large">
            <Input
              placeholder="搜索隊伍名稱"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Select value={filterGroup} onChange={setFilterGroup} style={{ width: 150 }}>
              <Option value="all">所有小組</Option>
              <Option value="unassigned">未分配</Option>
              {Array.isArray(groups)
                ? groups.map((group) => {
                    const displayName = group.group_name?.includes("_")
                      ? group.group_name.split("_")[0]
                      : group.group_name;
                    return (
                      <Option key={group.group_id} value={group.group_id.toString()}>
                        小組 {displayName}
                      </Option>
                    );
                  })
                : []}
            </Select>
            <Text type="secondary">
              顯示 {filteredTeams.length} / {teamStats.total_teams || 0} 支隊伍
            </Text>
          </Space>
        </Card>

        {/* 隊伍列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={filteredTeams}
            rowKey="team_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 支隊伍`,
              pageSizeOptions: ["10", "20", "30", "50", "100"],
            }}
            onChange={handleTableChange}
            locale={{
              emptyText: (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <TeamOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                  <div style={{ marginBottom: 16 }}>
                    <span style={{ color: "#999", fontSize: 16 }}>暫無隊伍</span>
                  </div>
                  <div>
                    <span style={{ color: "#999" }}>點擊「新增隊伍」按鈕創建第一支隊伍</span>
                  </div>
                </div>
              ),
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default TournamentTeamList;
