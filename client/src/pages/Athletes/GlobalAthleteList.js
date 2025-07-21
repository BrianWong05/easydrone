import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  message, 
  Modal, 
  Tooltip,
  Avatar,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  TrophyOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Search } = Input;

const GlobalAthleteList = () => {
  const { t } = useTranslation(['athlete', 'common']);
  const navigate = useNavigate();
  
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  const [filters, setFilters] = useState({
    search: ''
  });

  const [statistics, setStatistics] = useState({
    total: 0,
    activeTournaments: 0
  });

  // Load global athletes
  const loadAthletes = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== null && value !== '')
        )
      });

      const response = await fetch(`/api/global-athletes?${params}`);
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

  // Calculate statistics
  const calculateStatistics = (athletesList) => {
    const stats = {
      total: athletesList.length,
      activeTournaments: athletesList.reduce((sum, athlete) => sum + (athlete.tournaments_count || 0), 0)
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

  // Handle table change
  const handleTableChange = (paginationConfig) => {
    loadAthletes(paginationConfig.current, paginationConfig.pageSize);
  };

  // Handle athlete click
  const handleAthleteClick = (athleteId) => {
    navigate(`/global-athletes/${athleteId}`);
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
          const response = await fetch(`/api/global-athletes/${athleteId}`, {
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

  // Table columns
  const columns = [
    {
      title: t('athlete:athlete.name'),
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Tooltip title={t('athlete:actions.viewDetails')}>
          <Space 
            className="items-center cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200"
            onClick={() => handleAthleteClick(record.athlete_id)}
          >
            <Avatar
              size={40}
              src={record.avatar_url}
              icon={!record.avatar_url && <UserOutlined />}
              className="border-2 border-gray-200 hover:border-blue-300 transition-colors duration-200 shadow-sm"
            />
            <div className="flex flex-col">
              <span className="font-medium text-gray-800 hover:text-blue-600 transition-colors duration-200">
                {name}
              </span>
              <span className="text-xs text-gray-500">
                {t('athlete:athlete.age')}: {record.age}
              </span>
            </div>
          </Space>
        </Tooltip>
      )
    },
    {
      title: t('athlete:info.tournaments'),
      dataIndex: 'tournaments_count',
      key: 'tournaments_count',
      width: 120,
      render: (count, record) => (
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{count || 0}</div>
          <div className="text-xs text-gray-500">{t('athlete:info.tournaments')}</div>
        </div>
      ),
      sorter: (a, b) => (a.tournaments_count || 0) - (b.tournaments_count || 0)
    },
    {
      title: t('athlete:info.tournamentList'),
      dataIndex: 'tournaments',
      key: 'tournaments',
      render: (tournaments) => (
        <div className="max-w-xs">
          {tournaments ? (
            <Tooltip title={tournaments}>
              <div className="truncate text-gray-600">
                {tournaments}
              </div>
            </Tooltip>
          ) : (
            <span className="text-gray-400 italic">
              {t('athlete:info.noTournaments')}
            </span>
          )}
        </div>
      )
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
              onClick={() => handleAthleteClick(record.athlete_id)}
              className="text-blue-500 hover:text-blue-700 p-1"
            />
          </Tooltip>
          <Tooltip title={t('athlete:athlete.edit')}>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/global-athletes/${record.athlete_id}/edit`)}
              className="text-green-500 hover:text-green-700 p-1"
            />
          </Tooltip>
          <Tooltip title={t('athlete:actions.addToTournament')}>
            <Button
              type="link"
              icon={<TrophyOutlined />}
              onClick={() => navigate(`/global-athletes/${record.athlete_id}/add-tournament`)}
              className="text-orange-500 hover:text-orange-700 p-1"
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
    loadAthletes(1, pagination.pageSize);
  }, [filters]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-0">
              <UserOutlined className="text-blue-500" /> 
              {t('athlete:global.management')}
            </h2>
            <p className="text-gray-600 mt-2">
              {t('athlete:global.description')}
            </p>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/global-athletes/create')}
              className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600 shadow-sm"
            >
              {t('athlete:global.create')}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.totalAthletes')}</span>}
              value={statistics.total}
              prefix={<UserOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.totalParticipations')}</span>}
              value={statistics.activeTournaments}
              valueStyle={{ color: '#059669', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<TrophyOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.averageParticipations')}</span>}
              value={statistics.total > 0 ? (statistics.activeTournaments / statistics.total).toFixed(1) : 0}
              valueStyle={{ color: '#2563eb', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<TeamOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-6 shadow-sm border-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-0">
            <SearchOutlined className="text-gray-500" />
            {t('common:common.search')}
          </h3>
        </div>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder={t('athlete:placeholders.searchAthlete')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
              className="w-full"
            />
          </Col>
          <Col span={4}>
            <Button
              onClick={() => {
                setFilters({ search: '' });
              }}
              className="hover:bg-gray-50 hover:border-gray-300 border-gray-300"
            >
              {t('common:common.reset')}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Athletes Table */}
      <Card className="shadow-sm border-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-0">
            <UserOutlined className="text-gray-500" />
            {t('athlete:global.list')}
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
              `${range[0]}-${range[1]} ${t('common:common.of')} ${total} ${t('athlete:global.list')}`,
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

export default GlobalAthleteList;