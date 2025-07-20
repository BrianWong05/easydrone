import React, { useState, useEffect } from "react";
import { Card, Button, Space, Table, Tag, Avatar, message, Input, Select, Tooltip, Popconfirm } from "antd";
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
import { useTranslation } from 'react-i18next';
import axios from "axios";

const { Option } = Select;

const TournamentTeamList = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const { t } = useTranslation(['team', 'common']);
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
        message.error(t('common:messages.dataLoadFailed'));
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      message.error(t('common:messages.dataLoadFailed'));
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
      message.success(t('team:messages.teamDeleted'));
      fetchTeams(pagination.current, pagination.pageSize);
      fetchTeamStats(); // Refresh statistics after deletion
    } catch (error) {
      console.error("Error deleting team:", error);
      const errorMessage = error.response?.data?.message || t('common:messages.operationFailed');
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
      title: t('team:list.columns.team'),
      key: "team",
      render: (_, record) => {
        const displayName = record.team_name?.includes("_") ? record.team_name.split("_")[0] : record.team_name;
        return (
          <Space>
            <Avatar
              className="text-white font-bold"
              style={{ backgroundColor: record.team_color }}
              icon={<TeamOutlined />}
            >
              {displayName.charAt(0)}
            </Avatar>
            <div>
              <strong 
                className="cursor-pointer text-blue-500 hover:text-blue-700"
                onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
              >
                {displayName}
              </strong>
              <br />
              <span className="text-xs text-gray-500">
                {record.team_color}
              </span>
            </div>
          </Space>
        );
      },
    },
    {
      title: t('team:list.columns.group'),
      key: "group",
      render: (_, record) => {
        if (!record.group_id) {
          return <Tag color="default">{t('team:list.unassigned')}</Tag>;
        }
        const group = Array.isArray(groups) ? groups.find((g) => g.group_id === record.group_id) : null;
        const groupDisplayName = group?.group_name?.includes("_") ? group.group_name.split("_")[0] : group?.group_name;
        return <Tag color="blue">{t('team:list.group')} {groupDisplayName || record.group_id}</Tag>;
      },
    },
    {
      title: t('team:list.columns.type'),
      dataIndex: "is_virtual",
      key: "is_virtual",
      render: (isVirtual) => <Tag color={isVirtual ? "orange" : "green"}>{isVirtual ? t('team:list.teamType.virtual') : t('team:list.teamType.real')}</Tag>,
    },
    {
      title: t('team:list.columns.createdAt'),
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => new Date(date).toLocaleDateString("zh-TW"),
    },
    {
      title: t('team:list.columns.actions'),
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title={t('team:list.actions.viewDetails')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            />
          </Tooltip>
          <Tooltip title={t('team:list.actions.editTeam')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}/edit`)}
            />
          </Tooltip>
          <Popconfirm
            title={t('team:list.actions.deleteConfirmation')}
            description={t('team:list.actions.deleteWarning')}
            onConfirm={() => handleDelete(record.team_id)}
            okText={t('common:buttons.confirm')}
            cancelText={t('common:buttons.cancel')}
          >
            <Tooltip title={t('team:list.actions.deleteTeam')}>
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* 頁面標題 */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold m-0">
              <TrophyOutlined className="mr-2 text-yellow-500" />
              {t('team:list.title')}
            </h2>
            <p className="text-gray-500 m-0">{tournament?.tournament_name || `錦標賽 ${tournamentId}`} - {t('team:list.subtitle')}</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/teams/create`)}
            size="large"
          >
            {t('team:list.addTeam')}
          </Button>
        </div>

        {/* 統計信息 */}
        <Card>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {teamStats.total_teams || 0}
              </div>
              <div className="text-gray-600">{t('team:list.stats.totalTeams')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {teamStats.grouped_teams || 0}
              </div>
              <div className="text-gray-600">{t('team:list.stats.grouped')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {teamStats.ungrouped_teams || 0}
              </div>
              <div className="text-gray-600">{t('team:list.stats.ungrouped')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {teamStats.virtual_teams || 0}
              </div>
              <div className="text-gray-600">{t('team:list.stats.virtual')}</div>
            </div>
          </div>
        </Card>

        {/* 搜索和過濾 */}
        <Card>
          <Space size="large">
            <Input
              placeholder={t('team:list.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-64"
            />
            <Select value={filterGroup} onChange={setFilterGroup} className="w-40">
              <Option value="all">{t('team:list.allGroups')}</Option>
              <Option value="unassigned">{t('team:list.unassigned')}</Option>
              {Array.isArray(groups)
                ? groups.map((group) => {
                    const displayName = group.group_name?.includes("_")
                      ? group.group_name.split("_")[0]
                      : group.group_name;
                    return (
                      <Option key={group.group_id} value={group.group_id.toString()}>
                        {t('team:list.group')} {displayName}
                      </Option>
                    );
                  })
                : []}
            </Select>
            <p className="text-gray-500 m-0">
              {t('team:list.showingTeams', { count: filteredTeams.length, total: teamStats.total_teams || 0 })}
            </p>
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
              showTotal: (total, range) => t('common:pagination.total', { start: range[0], end: range[1], total }) + ` ${t('team:team.totalTeams')}`,
              pageSizeOptions: ["10", "20", "30", "50", "100"],
              locale: {
                items_per_page: t('common:pagination.itemsPerPage'),
                jump_to: t('common:pagination.jumpTo'),
                page: t('common:pagination.page'),
              },
            }}
            onChange={handleTableChange}
            locale={{
              emptyText: (
                <div className="text-center py-10">
                  <TeamOutlined className="text-5xl text-gray-300 mb-4" />
                  <div className="mb-4">
                    <span className="text-gray-400 text-base">{t('team:list.noTeams')}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('team:list.noTeamsDescription')}</span>
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
