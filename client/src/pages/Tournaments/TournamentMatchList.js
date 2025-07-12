import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Select,
  DatePicker,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import axios from "axios";
import moment from "moment";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TournamentMatchList = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();

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

  const [allMatches, setAllMatches] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [dateRange, setDateRange] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  useEffect(() => {
    fetchTournament();
    fetchAllMatches();
    fetchGroups();
    fetchTeams();
  }, [tournamentId]);

  useEffect(() => {
    if (allMatches.length > 0) {
      applyFiltersAndPagination();
    }
  }, [
    allMatches,
    filterStatus,
    filterType,
    filterGroup,
    filterTeam,
    dateRange,
    searchText,
    pagination.current,
    pagination.pageSize,
  ]);

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

  const fetchAllMatches = async () => {
    try {
      setLoading(true);
      // Fetch all matches without pagination
      const params = new URLSearchParams({
        limit: "1000", // Large number to get all matches
      });

      console.log("🔍 Fetching all matches for tournament:", tournamentId);

      const response = await axios.get(`/api/tournaments/${tournamentId}/matches?${params}`);
      console.log("🔍 All Matches API Response:", response.data);

      if (response.data.success) {
        const matchesData = response.data.data?.matches || [];
        setAllMatches(matchesData);
        console.log("✅ Fetched all matches:", matchesData.length);
      } else {
        message.error("獲取比賽列表失敗");
      }
    } catch (error) {
      console.error("❌ Error fetching all matches:", error);
      console.error("❌ Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      if (error.response?.status === 404) {
        message.error("錦標賽不存在");
      } else if (error.response?.status >= 500) {
        message.error("服務器錯誤，請稍後重試");
      } else if (error.code === "NETWORK_ERROR" || !error.response) {
        message.error("網絡連接錯誤，請檢查網絡連接");
      } else {
        message.error(`獲取比賽列表失敗: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndPagination = () => {
    let filteredMatches = [...allMatches];

    // Apply filters
    if (filterStatus !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.match_status === filterStatus);
    }
    if (filterType !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.match_type === filterType);
    }
    if (filterGroup !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.group_id === parseInt(filterGroup));
    }
    if (filterTeam !== "all") {
      filteredMatches = filteredMatches.filter(
        (match) => match.team1_id === parseInt(filterTeam) || match.team2_id === parseInt(filterTeam),
      );
    }
    if (dateRange.length === 2) {
      const startDate = dateRange[0].startOf("day");
      const endDate = dateRange[1].endOf("day");
      filteredMatches = filteredMatches.filter((match) => {
        const matchDate = moment(match.match_date);
        return matchDate.isBetween(startDate, endDate, null, "[]");
      });
    }
    if (searchText) {
      filteredMatches = filteredMatches.filter((match) =>
        match.match_number?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply default sorting by match number (A01, B01, C01, D01, A02, B02, C02, D02...)
    filteredMatches.sort(sortMatchNumbers);

    // Update pagination total
    setPagination((prev) => ({
      ...prev,
      total: filteredMatches.length,
    }));

    // Apply pagination AFTER sorting
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

    setMatches(paginatedMatches);
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      if (response.data.success) {
        const groupsData = response.data.data?.groups || [];
        setGroups(groupsData);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams?limit=100`);
      if (response.data.success) {
        const teamsData = response.data.data?.teams || [];
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const handleDelete = async (matchId) => {
    try {
      await axios.delete(`/api/matches/${matchId}`);
      message.success("比賽刪除成功");
      fetchAllMatches(); // Refresh all matches
    } catch (error) {
      console.error("Error deleting match:", error);
      const errorMessage = error.response?.data?.message || "刪除比賽失敗";
      message.error(errorMessage);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning("請選擇要刪除的比賽");
      return;
    }

    try {
      setBatchDeleteLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const matchId of selectedRowKeys) {
        try {
          await axios.delete(`/api/matches/${matchId}`);
          successCount++;
        } catch (error) {
          console.error(`Error deleting match ${matchId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        message.success(`成功刪除 ${successCount} 場比賽${errorCount > 0 ? `，${errorCount} 場失敗` : ""}`);
        setSelectedRowKeys([]);
        fetchAllMatches(); // Refresh all matches
      } else {
        message.error("批量刪除失敗");
      }
    } catch (error) {
      console.error("Error in batch delete:", error);
      message.error("批量刪除失敗");
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const handleTableChange = (paginationConfig) => {
    const { current, pageSize } = paginationConfig;
    setPagination((prev) => ({
      ...prev,
      current,
      pageSize,
    }));
  };

  const handleFilterChange = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1, // Reset to first page when filters change
    }));
  };

  // Custom sorting function for match numbers (e.g., A01, B01, C01, A02, B02, C02)
  const sortMatchNumbers = (a, b) => {
    const aNumber = a.match_number || "";
    const bNumber = b.match_number || "";

    if (!aNumber || !bNumber) return 0;

    // Extract group letter and number (e.g., "A01" -> "A" and "01")
    const aLetter = aNumber.charAt(0);
    const bLetter = bNumber.charAt(0);
    const aNum = parseInt(aNumber.slice(1)) || 0;
    const bNum = parseInt(bNumber.slice(1)) || 0;

    // First sort by number (01, 02, 03...)
    if (aNum !== bNum) {
      return aNum - bNum;
    }

    // Then sort by group letter (A, B, C, D...)
    return aLetter.localeCompare(bLetter);
  };

  // 獲取隊伍顯示名稱，如果沒有隊伍則顯示來源比賽的勝者
  const getTeamDisplayName = (record, teamPosition) => {
    const teamName = teamPosition === 'team1' ? record.team1_name : record.team2_name;
    
    if (teamName) {
      return getDisplayTeamName(teamName);
    }
    
    // 如果沒有隊伍名稱且是淘汰賽，嘗試生成來源比賽的勝者顯示
    if (record.match_type === 'knockout' && record.match_number) {
      // 根據比賽編號推斷來源比賽
      const matchNum = record.match_number;
      
      // SE05, SE06 來自 QU01-QU04
      if (matchNum === 'SE05') {
        return teamPosition === 'team1' ? 'QU01勝者' : 'QU02勝者';
      } else if (matchNum === 'SE06') {
        return teamPosition === 'team1' ? 'QU03勝者' : 'QU04勝者';
      }
      // FI07 來自 SE05, SE06
      else if (matchNum === 'FI07') {
        return teamPosition === 'team1' ? 'SE05勝者' : 'SE06勝者';
      }
      // 其他淘汰賽比賽的通用邏輯
      else if (matchNum.startsWith('QU')) {
        return '待定';
      }
    }
    
    return '待定';
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: "default", text: "待開始" },
      active: { color: "processing", text: "進行中" },
      overtime: { color: "warning", text: "延長賽" },
      completed: { color: "success", text: "已完成" },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTypeTag = (type) => {
    const typeConfig = {
      group: { color: "blue", text: "小組賽" },
      knockout: { color: "red", text: "淘汰賽" },
      friendly: { color: "green", text: "友誼賽" },
    };
    const config = typeConfig[type] || { color: "default", text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: "比賽場次",
      dataIndex: "match_number",
      key: "match_number",
      width: 120,
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => record.match_number?.toLowerCase().includes(value.toLowerCase()),
      sorter: (a, b) => sortMatchNumbers(a, b),
      sortDirections: ["ascend", "descend"],
      defaultSortOrder: "ascend",
      render: (matchNumber, record) => (
        <Button
          type="link"
          style={{ padding: 0, height: "auto", fontWeight: "normal" }}
          onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
        >
          {matchNumber}
        </Button>
      ),
    },
    {
      title: "隊伍對戰",
      key: "teams",
      width: 300,
      render: (_, record) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: record.team1_color || "#ccc",
                marginRight: 8,
                borderRadius: 2,
              }}
            />
            <span>{getTeamDisplayName(record, 'team1')}</span>
            <span style={{ margin: "0 8px", fontWeight: "bold" }}>
              {record.team1_score || 0} : {record.team2_score || 0}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: record.team2_color || "#ccc",
                marginRight: 8,
                borderRadius: 2,
              }}
            />
            <span>{getTeamDisplayName(record, 'team2')}</span>
          </div>
        </div>
      ),
    },
    {
      title: "小組",
      dataIndex: "group_name",
      key: "group_name",
      width: 80,
      render: (groupName) =>
        groupName ? <Tag color="blue">{groupName.includes("_") ? groupName.split("_")[0] : groupName}</Tag> : "-",
      sorter: (a, b) => {
        const aGroup = a.group_name || "";
        const bGroup = b.group_name || "";
        return aGroup.localeCompare(bGroup);
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "比賽類型",
      dataIndex: "match_type",
      key: "match_type",
      width: 100,
      render: (type) => getTypeTag(type),
      sorter: (a, b) => {
        const aType = a.match_type || "";
        const bType = b.match_type || "";
        return aType.localeCompare(bType);
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "狀態",
      dataIndex: "match_status",
      key: "match_status",
      width: 100,
      render: (status) => getStatusTag(status),
      sorter: (a, b) => {
        const statusOrder = { pending: 1, active: 2, overtime: 3, completed: 4 };
        const aOrder = statusOrder[a.match_status] || 0;
        const bOrder = statusOrder[b.match_status] || 0;
        return aOrder - bOrder;
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "比賽時間",
      dataIndex: "match_date",
      key: "match_date",
      width: 180,
      render: (date) => (date ? moment(date).format("YYYY-MM-DD HH:mm") : "-"),
      sorter: (a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return moment(a.match_date).valueOf() - moment(b.match_date).valueOf();
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: "勝者",
      dataIndex: "winner_name",
      key: "winner_name",
      width: 120,
      render: (winner) => (winner ? <Tag color="gold">{getDisplayTeamName(winner)}</Tag> : "-"),
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
          >
            查看
          </Button>
          {record.match_status === "pending" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
              disabled={!record.team1_name || !record.team2_name}
              title={!record.team1_name || !record.team2_name ? "比賽隊伍尚未確定，無法開始比賽" : "開始比賽"}
            >
              開始
            </Button>
          )}
          {record.match_status === "active" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              style={{ color: "#52c41a" }}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
            >
              繼續
            </Button>
          )}
          {record.match_status === "pending" && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/edit`)}
              disabled={!record.team1_name || !record.team2_name}
              title={!record.team1_name || !record.team2_name ? "比賽隊伍尚未確定，無法編輯比賽" : "編輯比賽"}
            >
              編輯
            </Button>
          )}
          <Popconfirm
            title="確認刪除比賽"
            description="確定要刪除這場比賽嗎？"
            onConfirm={() => handleDelete(record.match_id)}
            okText="確認"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 計算統計數據 (基於所有比賽，不只是當前頁面)
  const stats = {
    total: allMatches.length,
    pending: allMatches.filter((m) => m.match_status === "pending").length,
    active: allMatches.filter((m) => m.match_status === "active").length,
    completed: allMatches.filter((m) => m.match_status === "completed").length,
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>{tournament?.tournament_name} - 比賽管理</Title>
        <p style={{ color: "#666", marginBottom: 0 }}>管理錦標賽中的所有比賽，包括小組賽和淘汰賽</p>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="總比賽數" value={pagination.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="待開始" value={stats.pending} valueStyle={{ color: "#666" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="進行中" value={stats.active} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="已完成" value={stats.completed} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
      </Row>

      {/* 操作區域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜索比賽場次"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Select
                placeholder="比賽狀態"
                value={filterStatus}
                onChange={(value) => {
                  setFilterStatus(value);
                  handleFilterChange();
                }}
                style={{ width: 120 }}
              >
                <Option value="all">全部狀態</Option>
                <Option value="pending">待開始</Option>
                <Option value="active">進行中</Option>
                <Option value="completed">已完成</Option>
              </Select>
              <Select
                placeholder="比賽類型"
                value={filterType}
                onChange={(value) => {
                  setFilterType(value);
                  handleFilterChange();
                }}
                style={{ width: 120 }}
              >
                <Option value="all">全部類型</Option>
                <Option value="group">小組賽</Option>
                <Option value="knockout">淘汰賽</Option>
                <Option value="friendly">友誼賽</Option>
              </Select>
              <Select
                placeholder="選擇小組"
                value={filterGroup}
                onChange={(value) => {
                  setFilterGroup(value);
                  handleFilterChange();
                }}
                style={{ width: 120 }}
              >
                <Option value="all">全部小組</Option>
                {groups.map((group) => (
                  <Option key={group.group_id} value={group.group_id}>
                    小組 {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="選擇隊伍"
                value={filterTeam}
                onChange={(value) => {
                  setFilterTeam(value);
                  handleFilterChange();
                }}
                style={{ width: 150 }}
                showSearch
                optionFilterProp="children"
              >
                <Option value="all">全部隊伍</Option>
                {teams.map((team) => (
                  <Option key={team.team_id} value={team.team_id}>
                    {getDisplayTeamName(team.team_name)}
                  </Option>
                ))}
              </Select>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates || []);
                  handleFilterChange();
                }}
                placeholder={["開始日期", "結束日期"]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/matches/create`)}
              >
                新增比賽
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/matches/generate`)}
              >
                生成比賽
              </Button>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title="批量刪除比賽"
                  description={`確定要刪除選中的 ${selectedRowKeys.length} 場比賽嗎？`}
                  onConfirm={handleBatchDelete}
                  okText="確認"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />} loading={batchDeleteLoading}>
                    批量刪除 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 比賽列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={matches}
          rowKey="match_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 場比賽`,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default TournamentMatchList;
