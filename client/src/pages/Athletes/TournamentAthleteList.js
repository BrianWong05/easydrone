import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  message, 
  Modal, 
  Tooltip,
  Badge,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Search } = Input;
const { Option } = Select;

const TournamentAthleteList = () => {
  const { t } = useTranslation(['athlete', 'common']);
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  
  const [athletes, setAthletes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    team_id: null,
    position: null,
    is_active: null
  });

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    attackers: 0,
    defenders: 0,
    substitutes: 0
  });

  // Load athletes data
  const loadAthletes = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tournament_id: tournamentId,
        page: page.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== null && value !== '')
        )
      });

      const response = await fetch(`/api/athletes?${params}`);
      const data = await response.json();

      if (data.success) {
        setAthletes(data.data.athletes);
        setPagination({
          current: page,
          pageSize,
          total: data.data.pagination.total
        });
        
        // Calculate statistics
        calculateStatistics(data.data.athletes);
      } else {
        message.error(data.message || t('athlete:messages.loadingAthletes'));
      }
    } catch (error) {
      console.error('Error loading athletes:', error);
      message.error(t('athlete:messages.loadingAthletes'));
    } finally {
      setLoading(false);
    }
  };

  // Load teams for filter dropdown
  const loadTeams = async () => {
    try {
      console.log('Loading teams for tournament:', tournamentId);
      
      // Try the tournament-specific endpoint first
      let response = await fetch(`/api/tournaments/${tournamentId}/teams`);
      let data = await response.json();
      console.log('Tournament teams API response:', data);
      
      // If that fails, try the general teams API with tournament filter
      if (!data.success) {
        console.log('Trying fallback teams API...');
        response = await fetch(`/api/teams?tournament_id=${tournamentId}`);
        data = await response.json();
        console.log('Fallback teams API response:', data);
      }
      
      if (data.success) {
        // Handle different possible data structures
        const teamsData = data.data?.teams || data.data || data.teams || [];
        console.log('Teams data found:', teamsData.length, 'teams');
        
        // Clean up team names by removing tournament ID suffix
        const cleanedTeams = teamsData.map(team => {
          let displayName = team.team_name;
          // Remove tournament ID suffix
          if (displayName && displayName.includes('_')) {
            const parts = displayName.split('_');
            const lastPart = parts[parts.length - 1];
            // Check if the last part is a number (tournament ID)
            if (/^\d+$/.test(lastPart)) {
              displayName = parts.slice(0, -1).join('_');
            }
          }
          return {
            ...team,
            display_name: displayName
          };
        });
        
        console.log('Setting teams:', cleanedTeams);
        setTeams(cleanedTeams);
      } else {
        console.error('Both team APIs failed');
        setTeams([]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    }
  };

  // Calculate statistics
  const calculateStatistics = (athletesList) => {
    const stats = {
      total: athletesList.length,
      active: athletesList.filter(a => a.is_active).length,
      attackers: athletesList.filter(a => a.position === 'attacker').length,
      defenders: athletesList.filter(a => a.position === 'defender').length,
      substitutes: athletesList.filter(a => a.position === 'substitute').length
    };
    setStatistics(stats);
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle search
  const handleSearch = () => {
    loadAthletes(1, pagination.pageSize);
  };

  // Handle table change (pagination, sorting, filtering)
  const handleTableChange = (paginationConfig) => {
    loadAthletes(paginationConfig.current, paginationConfig.pageSize);
  };

  // Handle delete athlete
  const handleDelete = (athleteId, athleteName) => {
    Modal.confirm({
      title: t('athlete:messages.deleteConfirmation'),
      content: `${t('athlete:messages.deleteWarning')}: ${athleteName}`,
      okText: t('common:common.confirm'),
      cancelText: t('common:common.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/athletes/${athleteId}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          
          if (data.success) {
            message.success(t('athlete:messages.athleteDeleted'));
            loadAthletes(pagination.current, pagination.pageSize);
          } else {
            message.error(data.message);
          }
        } catch (error) {
          console.error('Error deleting athlete:', error);
          message.error(t('common:common.error'));
        }
      }
    });
  };

  // Position color mapping
  const getPositionColor = (position) => {
    const colors = {
      attacker: 'red',
      defender: 'blue',
      substitute: 'green'
    };
    return colors[position] || 'default';
  };

  // Position icon mapping
  const getPositionIcon = (position) => {
    const icons = {
      attacker: '⚔️',
      defender: '🛡️',
      substitute: '🔄'
    };
    return icons[position] || '👤';
  };

  // Table columns
  const columns = [
    {
      title: t('athlete:athlete.number'),
      dataIndex: 'jersey_number',
      key: 'jersey_number',
      width: 80,
      render: (number) => (
        <Badge count={number} className="bg-blue-500" />
      ),
      sorter: (a, b) => a.jersey_number - b.jersey_number
    },
    {
      title: t('athlete:athlete.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space className="items-center">
          <UserOutlined className="text-gray-500" />
          <span className="font-medium text-gray-800">{name}</span>
          {!record.is_active && <Tag color="red">{t('athlete:status.inactive')}</Tag>}
        </Space>
      )
    },
    {
      title: t('athlete:athlete.position'),
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (position) => (
        <Tag color={getPositionColor(position)} className="flex items-center gap-1">
          <span>{getPositionIcon(position)}</span>
          <span>{t(`athlete:positions.${position}`)}</span>
        </Tag>
      ),
      filters: [
        { text: t('athlete:positions.attacker'), value: 'attacker' },
        { text: t('athlete:positions.defender'), value: 'defender' },
        { text: t('athlete:positions.substitute'), value: 'substitute' }
      ]
    },
    {
      title: t('athlete:athlete.team'),
      dataIndex: 'team_name',
      key: 'team_name',
      render: (teamName, record) => {
        // Clean up team name display by removing tournament ID suffix
        let displayName = teamName;
        if (displayName && displayName.includes('_')) {
          const parts = displayName.split('_');
          const lastPart = parts[parts.length - 1];
          // Check if the last part is a number (tournament ID)
          if (/^\d+$/.test(lastPart)) {
            displayName = parts.slice(0, -1).join('_');
          }
        }
        return (
          <Space className="items-center">
            <TeamOutlined style={{ color: record.team_color }} />
            <span className="text-gray-800">{displayName}</span>
            {record.group_name && (
              <Tag color="blue" className="ml-2">{record.group_name}</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: t('athlete:athlete.age'),
      dataIndex: 'age',
      key: 'age',
      width: 80,
      sorter: (a, b) => a.age - b.age
    },
    {
      title: t('athlete:athlete.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('athlete:status.active') : t('athlete:status.inactive')}
        </Tag>
      ),
      filters: [
        { text: t('athlete:status.active'), value: true },
        { text: t('athlete:status.inactive'), value: false }
      ]
    },
    {
      title: t('common:actions.title'),
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space className="flex items-center">
          <Tooltip title={t('athlete:athlete.detail')}>
            <Button
              type="link"
              icon={<UserOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${record.athlete_id}`)}
              className="text-blue-500 hover:text-blue-700 p-1"
            />
          </Tooltip>
          <Tooltip title={t('athlete:athlete.edit')}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${record.athlete_id}/edit`)}
              className="text-green-500 hover:text-green-700 p-1"
            />
          </Tooltip>
          <Tooltip title={t('athlete:athlete.delete')}>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.athlete_id, record.name)}
              className="text-red-500 hover:text-red-700 p-1"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Load data on component mount and filter changes
  useEffect(() => {
    loadTeams();
  }, [tournamentId]);

  useEffect(() => {
    loadAthletes(1, pagination.pageSize);
  }, [tournamentId, filters]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-0">
              <TrophyOutlined className="text-yellow-500" /> 
              {t('athlete:athlete.management')}
            </h2>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/athletes/create`)}
              className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600 shadow-sm"
            >
              {t('athlete:athlete.create')}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:athlete.totalAthletes')}</span>}
              value={statistics.total}
              prefix={<UserOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:status.active')}</span>}
              value={statistics.active}
              valueStyle={{ color: '#059669', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<UserOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:positions.attacker')}</span>}
              value={statistics.attackers}
              valueStyle={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<span className="text-lg">⚔️</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:positions.defender')}</span>}
              value={statistics.defenders}
              valueStyle={{ color: '#2563eb', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<span className="text-lg">🛡️</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-6 shadow-sm border-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-0">
            <FilterOutlined className="text-gray-500" />
            {t('common:common.filter')}
          </h3>
        </div>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t('athlete:placeholders.searchAthlete')}
              </label>
              <Search
                placeholder={t('athlete:placeholders.searchAthlete')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onSearch={handleSearch}
                enterButton={<SearchOutlined />}
                className="w-full"
              />
            </div>
          </Col>
          <Col span={4}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t('athlete:athlete.team')}
              </label>
              <Select
                placeholder={t('athlete:placeholders.selectTeam')}
                value={filters.team_id}
                onChange={(value) => handleFilterChange('team_id', value)}
                allowClear
                className="w-full"
              >
                {teams.map(team => (
                  <Option key={team.team_id} value={team.team_id}>
                    {team.display_name || team.team_name}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col span={4}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t('athlete:athlete.position')}
              </label>
              <Select
                placeholder={t('athlete:placeholders.selectPosition')}
                value={filters.position}
                onChange={(value) => handleFilterChange('position', value)}
                allowClear
                className="w-full"
              >
                <Option value="attacker">{t('athlete:positions.attacker')}</Option>
                <Option value="defender">{t('athlete:positions.defender')}</Option>
                <Option value="substitute">{t('athlete:positions.substitute')}</Option>
              </Select>
            </div>
          </Col>
          <Col span={4}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t('athlete:athlete.status')}
              </label>
              <Select
                placeholder={t('athlete:athlete.status')}
                value={filters.is_active}
                onChange={(value) => handleFilterChange('is_active', value)}
                allowClear
                className="w-full"
              >
                <Option value={true}>{t('athlete:status.active')}</Option>
                <Option value={false}>{t('athlete:status.inactive')}</Option>
              </Select>
            </div>
          </Col>
          <Col span={6}>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1 opacity-0">
                Actions
              </label>
              <Space className="w-full justify-end">
                <Button
                  icon={<FilterOutlined />}
                  onClick={handleSearch}
                  className="hover:bg-blue-50 hover:border-blue-300 border-gray-300"
                >
                  {t('common:common.filter')}
                </Button>
                <Button
                  onClick={() => {
                    setFilters({
                      search: '',
                      team_id: null,
                      position: null,
                      is_active: null
                    });
                  }}
                  className="hover:bg-gray-50 hover:border-gray-300 border-gray-300"
                >
                  {t('common:common.reset')}
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Athletes Table */}
      <Card className="shadow-sm border-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-0">
            <UserOutlined className="text-gray-500" />
            {t('athlete:athlete.list')}
          </h3>
        </div>
        <Table
          columns={columns}
          dataSource={athletes}
          rowKey="athlete_id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} ${t('common:common.of')} ${total} ${t('athlete:athlete.list')}`,
            className: "mt-4"
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
          className="overflow-hidden"
          rowClassName="hover:bg-gray-50 transition-colors duration-150"
        />
      </Card>
    </div>
  );
};

export default TournamentAthleteList;