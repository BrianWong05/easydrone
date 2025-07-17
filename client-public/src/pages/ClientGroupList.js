import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Progress,
  Button
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';


const ClientGroupList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['group', 'common']);
  
  // 清理小組名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return '';
    const lastUnderscoreIndex = groupName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = groupName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = groupName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return groupName;
  };

  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalTeams: 0,
    totalMatches: 0,
    completedMatches: 0
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    fetchGroupsData();
  }, []);

  const fetchGroupsData = async () => {
    try {
      setLoading(true);
      
      // Get active tournament
      const tournamentResponse = await axios.get('/api/tournaments/public');
      let tournamentData = null;
      
      if (tournamentResponse.data.success && tournamentResponse.data.data) {
        tournamentData = tournamentResponse.data.data;
      } else {
        // Fallback to first active tournament
        const fallbackResponse = await axios.get('/api/tournaments?status=active&limit=1');
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          tournamentData = fallbackResponse.data.data.tournaments[0];
        }
      }

      if (!tournamentData) {
        setError(t('messages.noTournamentFound', { defaultValue: 'No tournament found to display' }));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch groups data - try tournament-specific endpoint first, then fallback to general groups
      let groupsResponse;
      try {
        groupsResponse = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      } catch (tournamentGroupsError) {
        // Fallback to general groups endpoint
        groupsResponse = await axios.get('/api/groups');
      }

      if (groupsResponse.data.success) {
        const groupsData = groupsResponse.data.data;
        const groupsList = Array.isArray(groupsData) ? groupsData : (groupsData.groups || []);
        
        // Filter groups for this tournament if using general endpoint
        const filteredGroups = groupsList.filter(group => 
          !group.tournament_id || group.tournament_id === tournamentId
        );

        // Fetch matches data for each group to calculate progress
        const groupsWithMatches = await Promise.all(
          filteredGroups.map(async (group) => {
            try {
              const matchesResponse = await axios.get(`/api/tournaments/${tournamentId}/groups/${group.group_id}/matches`);
              if (matchesResponse.data.success) {
                const matches = matchesResponse.data.data || [];
                const completedMatches = matches.filter(match => match.match_status === 'completed').length;
                return {
                  ...group,
                  matches,
                  completed_matches: completedMatches,
                  total_matches: matches.length
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch matches for group ${group.group_id}:`, error);
            }
            return group;
          })
        );
        
        setGroups(groupsWithMatches);
        
        // Calculate statistics
        const totalTeams = groupsWithMatches.reduce((sum, group) => sum + (group.team_count || 0), 0);
        const totalMatches = groupsWithMatches.reduce((sum, group) => sum + (group.total_matches || 0), 0);
        const completedMatches = groupsWithMatches.reduce((sum, group) => sum + (group.completed_matches || 0), 0);
        
        setStats({
          totalGroups: groupsWithMatches.length,
          totalTeams,
          totalMatches,
          completedMatches
        });

        // Update pagination total
        setPagination(prev => ({
          ...prev,
          total: groupsWithMatches.length
        }));
      }

    } catch (error) {
      console.error('Error fetching groups data:', error);
      setError(t('messages.loadingGroups'));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig, filters, sorter) => {
    const { current, pageSize } = paginationConfig;
    setPagination(prev => ({
      ...prev,
      current,
      pageSize
    }));
  };

  const getGroupStatus = (group) => {
    const totalMatches = group.total_matches || 0;
    const completedMatches = group.completed_matches || 0;
    
    if (totalMatches === 0) {
      return { status: 'not-started', text: t('common:status.notStarted', { defaultValue: '未開始' }), color: 'default' };
    } else if (completedMatches === totalMatches) {
      return { status: 'completed', text: t('common:status.completed', { defaultValue: '已完成' }), color: 'success' };
    } else if (completedMatches > 0) {
      return { status: 'in-progress', text: t('common:status.inProgress', { defaultValue: '進行中' }), color: 'processing' };
    } else {
      return { status: 'scheduled', text: t('common:status.scheduled', { defaultValue: '已排程' }), color: 'warning' };
    }
  };

  const getMatchProgress = (group) => {
    const total = group.total_matches || 0;
    const completed = group.completed_matches || 0;
    
    // If completed_matches is not provided or is 0, but we have matches data, calculate it
    if (completed === 0 && group.matches && Array.isArray(group.matches)) {
      const calculatedCompleted = group.matches.filter(match => match.match_status === 'completed').length;
      return total > 0 ? Math.round((calculatedCompleted / total) * 100) : 0;
    }
    
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const columns = [
    {
      title: t('group:group.name'),
      dataIndex: 'group_name',
      key: 'group_name',
      render: (name, record) => (
        <div className="space-y-1">
          <span className="text-base font-semibold text-gray-800 block font-bold">
            {getDisplayGroupName(name)}
          </span>
          {record.tournament_name && (
            <span className="text-xs text-gray-500 block">
              {record.tournament_name}
            </span>
          )}
        </div>
      ),
    },
    {
      title: t('group:group.teams'),
      dataIndex: 'team_count',
      key: 'team_count',
      align: 'center',
      render: (count, record) => (
        <div className="text-center space-y-1">
          <span className="text-base font-bold text-primary-600 block">
            {count || 0}
          </span>
          <span className="text-xs text-gray-500 block">
            / {record.max_teams || 4}
          </span>
        </div>
      ),
    },
    {
      title: t('group:group.progress'),
      key: 'match_progress',
      align: 'center',
      render: (_, record) => {
        const progress = getMatchProgress(record);
        const total = record.total_matches || 0;
        const completed = record.completed_matches || 0;
        
        return (
          <div className="text-center space-y-2">
            <Progress 
              percent={progress} 
              size="small" 
              status={progress === 100 ? 'success' : 'active'}
              className="min-w-[80px]"
            />
            <span className="text-xs text-gray-500 block">
              {completed} / {total}
            </span>
          </div>
        );
      },
    },
    {
      title: t('group:group.status'),
      key: 'status',
      align: 'center',
      render: (_, record) => {
        const status = getGroupStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: t('common:actions.actions'),
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          icon={<TeamOutlined />}
          onClick={() => navigate(`/groups/${record.group_id}`)}
          className="bg-primary-600 hover:bg-primary-700 border-primary-600 hover:border-primary-700 transition-colors duration-200"
        >
          {t('common:actions.viewDetails')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Spin size="large" />
        <div className="mt-4">
          <span className="text-gray-600 animate-pulse">{t('messages.loadingGroups')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <Alert
            message={t('common:messages.loadFailed')}
            description={error}
            type="error"
            showIcon
            className="border-0 bg-transparent"
            action={
              <Button 
                size="small" 
                onClick={fetchGroupsData}
                className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              >
                {t('common:actions.reload')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Tournament Header */}
      {tournament && (
        <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-warning-500">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <h2 className="m-0 flex items-center text-gray-800">
                <TrophyOutlined className="mr-3 text-warning-600" />
                <span className="bg-gradient-to-r from-warning-600 to-warning-700 bg-clip-text text-transparent">
                  {tournament.tournament_name}
                </span>
              </h2>
              <span className="text-gray-600 text-base">
                {t('group:group.list')}
              </span>
            </div>
            <div>
              <Tag 
                color="blue" 
                className="text-sm px-3 py-1 font-medium bg-blue-50 border-blue-200 text-blue-700"
              >
                {tournament.status === 'active' ? t('common:status.inProgress') : tournament.status}
              </Tag>
            </div>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary-500">
          <Statistic
            title={t('messages.totalGroups')}
            value={stats.totalGroups}
            prefix={<UsergroupAddOutlined className="text-primary-600" />}
            valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
          />
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-success-500">
          <Statistic
            title={t('common:stats.totalTeams')}
            value={stats.totalTeams}
            prefix={<TeamOutlined className="text-success-600" />}
            valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
          />
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-warning-500">
          <Statistic
            title={t('common:stats.totalMatches')}
            value={stats.totalMatches}
            prefix={<CalendarOutlined className="text-warning-600" />}
            valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
          />
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-error-500">
          <Statistic
            title={t('common:stats.completedMatches')}
            value={stats.completedMatches}
            prefix={<PlayCircleOutlined className="text-error-600" />}
            valueStyle={{ color: '#dc2626', fontWeight: 'bold' }}
          />
        </Card>
      </div>

      {/* Groups Table */}
      <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-primary-500">
        <div className="mb-6">
          <h3 className="flex items-center text-gray-800">
            <UsergroupAddOutlined className="mr-3 text-primary-600" />
            <span className="font-semibold">{t('group:group.list')}</span>
          </h3>
        </div>
        
        <Table
          columns={columns}
          dataSource={groups}
          rowKey="group_id"
          className="overflow-x-auto"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              t('common:pagination.showTotal', { 
                start: range[0], 
                end: range[1], 
                total: total,
                defaultValue: `${range[0]}-${range[1]} of ${total} groups`
              }),
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <div className="text-center py-16">
                <UsergroupAddOutlined className="text-6xl text-gray-300 mb-4" />
                <div className="mt-4">
                  <span className="text-gray-500">
                    {t('messages.noGroups')}
                  </span>
                </div>
              </div>
            )
          }}
        />
      </Card>
    </div>
  );
};

export default ClientGroupList;