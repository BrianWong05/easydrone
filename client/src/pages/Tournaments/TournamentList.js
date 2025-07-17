import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Table, 
  Tag, 
  Progress, 
  Select, 
  Input, 
  message,
  Tooltip,
  Popconfirm
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined,
  TrophyOutlined,
  CalendarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const TournamentList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['tournament', 'common']);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: ''
  });

  // 獲取錦標賽列表
  const fetchTournaments = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        ...filters
      };

      // 過濾掉空值參數
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await axios.get('/api/tournaments', { params });
      
      if (response.data.success) {
        // 處理空數據情況
        const tournaments = response.data.data.tournaments || [];
        const pagination = response.data.data.pagination || { total: 0, page: 1, pages: 1 };
        
        setTournaments(tournaments);
        setPagination({
          current: page,
          pageSize,
          total: pagination.total
        });
      } else {
        // API返回success: false的情況
        console.warn('API返回失敗狀態:', response.data.message);
        setTournaments([]);
        setPagination({
          current: 1,
          pageSize,
          total: 0
        });
      }
    } catch (error) {
      console.error('獲取錦標賽列表失敗:', error);
      
      // 區分不同類型的錯誤
      if (error.response) {
        // 服務器返回錯誤狀態碼
        const status = error.response.status;
        const errorMessage = error.response.data?.message || '服務器錯誤';
        
        if (status === 404) {
          // 404通常表示沒有數據，這是正常情況
          console.log('暫無錦標賽數據');
          setTournaments([]);
          setPagination({
            current: 1,
            pageSize,
            total: 0
          });
        } else {
          message.error(`${t('common:messages.dataLoadFailed')}: ${errorMessage}`);
        }
      } else if (error.request) {
        // 網絡錯誤
        message.error(t('common:messages.networkError'));
      } else {
        // 其他錯誤
        message.error(t('common:messages.operationFailed'));
      }
      
      // 設置空狀態
      setTournaments([]);
      setPagination({
        current: 1,
        pageSize,
        total: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [filters]);

  // 刪除錦標賽
  const handleDelete = async (tournamentId) => {
    try {
      const response = await axios.delete(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        message.success(t('tournament:messages.tournamentDeleted'));
        fetchTournaments(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      console.error('刪除錦標賽失敗:', error);
      message.error(error.response?.data?.message || t('common:messages.operationFailed'));
    }
  };

  // 更新錦標賽狀態
  const handleStatusUpdate = async (tournamentId, status) => {
    try {
      const response = await axios.put(`/api/tournaments/${tournamentId}/status`, { status });
      if (response.data.success) {
        message.success(t('tournament:messages.statusUpdateSuccess'));
        fetchTournaments(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      console.error('更新錦標賽狀態失敗:', error);
      message.error(error.response?.data?.message || t('common:messages.operationFailed'));
    }
  };

  // 獲取狀態標籤
  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: t('tournament:list.status.pending') },
      active: { color: 'green', text: t('tournament:list.status.active') },
      completed: { color: 'blue', text: t('tournament:list.status.completed') }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return (
      <Tag color={config.color}>
        {config.text}
        {status === 'active' && <span className="ml-1">🌐</span>}
      </Tag>
    );
  };

  // 獲取類型標籤
  const getTypeTag = (type) => {
    const typeConfig = {
      group: { color: 'cyan', text: t('tournament:types.groupStage') },
      knockout: { color: 'red', text: t('tournament:types.knockout') },
      mixed: { color: 'purple', text: t('tournament:types.mixed') }
    };
    
    const config = typeConfig[type] || { color: 'default', text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 計算進度
  const getProgress = (completed, total) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const columns = [
    {
      title: t('tournament:list.columns.name'),
      dataIndex: 'tournament_name',
      key: 'tournament_name',
      render: (text, record) => (
        <Space>
          <TrophyOutlined 
            className={record.status === 'active' ? 'text-green-500' : 'text-yellow-500'} 
          />
          <Button
            type="link"
            className={`p-0 h-auto font-bold text-base ${
              record.status === 'active' ? 'text-green-500' : 'text-blue-500'
            }`}
            onClick={() => navigate(`/tournaments/${record.tournament_id}`)}
          >
            {text}
            {record.status === 'active' && <span className="ml-2 text-sm">{t('tournament:list.status.publicDisplay')}</span>}
          </Button>
        </Space>
      )
    },
    {
      title: t('tournament:list.columns.type'),
      dataIndex: 'tournament_type',
      key: 'tournament_type',
      render: (type) => getTypeTag(type),
      width: 120
    },
    {
      title: t('tournament:list.columns.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      width: 100
    },
    {
      title: t('tournament:list.columns.progress'),
      key: 'progress',
      render: (_, record) => {
        const progress = getProgress(record.completed_matches, record.total_matches);
        return (
          <div className="w-30">
            <Progress 
              percent={progress} 
              size="small" 
              format={() => `${record.completed_matches}/${record.total_matches}`}
            />
          </div>
        );
      },
      width: 150
    },
    {
      title: t('tournament:list.columns.dates'),
      key: 'dates',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <div>
            <CalendarOutlined className="mr-1 text-green-500" />
            {t('tournament:list.dates.start')}: {moment(record.start_date).format('YYYY-MM-DD')}
          </div>
          <div>
            <CalendarOutlined className="mr-1 text-red-500" />
            {t('tournament:list.dates.end')}: {moment(record.end_date).format('YYYY-MM-DD')}
          </div>
        </Space>
      ),
      width: 180
    },
    {
      title: t('tournament:list.columns.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
      width: 150
    },
    {
      title: t('tournament:list.columns.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('tournament:list.actions.viewDetails')}>
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/tournaments/${record.tournament_id}`)}
            />
          </Tooltip>
          
          {record.tournament_type === 'knockout' && (
            <Tooltip title={t('tournament:list.actions.viewBracket')}>
              <Button 
                type="text" 
                icon={<TeamOutlined />} 
                onClick={() => navigate(`/tournaments/${record.tournament_id}/bracket`)}
              />
            </Tooltip>
          )}
          
          <Tooltip title={t('tournament:list.actions.edit')}>
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => navigate(`/tournaments/${record.tournament_id}/edit`)}
            />
          </Tooltip>
          
          {record.status === 'pending' && (
            <Tooltip title={t('tournament:list.tooltips.activateTournament')}>
              <Button 
                type="text" 
                className="text-green-500 hover:text-green-600"
                onClick={() => handleStatusUpdate(record.tournament_id, 'active')}
              >
                {t('tournament:list.actions.activate')}
              </Button>
            </Tooltip>
          )}
          
          {record.status === 'active' && (
            <Tooltip title={t('tournament:list.tooltips.deactivateTournament')}>
              <Button 
                type="text" 
                className="text-yellow-500 hover:text-yellow-600"
                onClick={() => handleStatusUpdate(record.tournament_id, 'pending')}
              >
                {t('tournament:list.actions.deactivate')}
              </Button>
            </Tooltip>
          )}
          
          {record.status === 'completed' && (
            <Tooltip title={t('tournament:list.tooltips.reactivateTournament')}>
              <Button 
                type="text" 
                className="text-blue-500 hover:text-blue-600"
                onClick={() => handleStatusUpdate(record.tournament_id, 'active')}
              >
                {t('tournament:list.actions.reactivate')}
              </Button>
            </Tooltip>
          )}
          
          <Popconfirm
            title={t('tournament:messages.deleteConfirmation')}
            description={t('tournament:messages.deleteWarning')}
            onConfirm={() => handleDelete(record.tournament_id)}
            okText={t('common:buttons.confirm')}
            cancelText={t('common:buttons.cancel')}
          >
            <Tooltip title={t('tournament:list.actions.delete')}>
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      width: 200,
      fixed: 'right'
    }
  ];

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* 頁面標題和新增按鈕 */}
        <div className="flex justify-between items-center">
          <Title level={2}>
            <TrophyOutlined className="mr-2 text-yellow-500" />
            {t('tournament:list.title')}
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/tournaments/create')}
            size="large"
          >
            {t('tournament:list.addTournament')}
          </Button>
        </div>

        {/* 篩選器 */}
        <Card>
          <Space wrap>
            <Search
              placeholder={t('tournament:list.searchPlaceholder')}
              className="w-50"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
            />
            
            <Select
              placeholder={t('tournament:list.selectStatus')}
              className="w-30"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="pending">{t('tournament:list.filters.statusPending')}</Option>
              <Option value="active">{t('tournament:list.filters.statusActive')}</Option>
              <Option value="completed">{t('tournament:list.filters.statusCompleted')}</Option>
            </Select>
            
            <Select
              placeholder={t('tournament:list.selectType')}
              className="w-30"
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              allowClear
            >
              <Option value="group">{t('tournament:types.groupStage')}</Option>
              <Option value="knockout">{t('tournament:types.knockout')}</Option>
              <Option value="mixed">{t('tournament:types.mixed')}</Option>
            </Select>
          </Space>
        </Card>

        {/* 錦標賽列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={tournaments}
            rowKey="tournament_id"
            loading={loading}
            locale={{
              emptyText: (
                <div className="text-center py-10">
                  <TrophyOutlined className="text-5xl text-gray-300 mb-4" />
                  <div className="mb-4">
                    <Text type="secondary" className="text-lg">{t('tournament:list.noData')}</Text>
                  </div>
                  <div>
                    <Text type="secondary" className="text-base">{t('tournament:list.noDataDescription')}</Text>
                  </div>
                  <div className="mt-4">
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/tournaments/create')}
                    >
                      {t('tournament:list.addTournament')}
                    </Button>
                  </div>
                </div>
              )
            }}
            pagination={tournaments.length > 0 ? {
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => t('common:pagination.total', { start: range[0], end: range[1], total }),
              pageSizeOptions: ['10', '20', '50', '100'],
              locale: {
                items_per_page: t('common:pagination.itemsPerPage'),
                jump_to: t('common:buttons.search'),
                jump_to_confirm: t('common:buttons.confirm'),
                page: '',
              },
              onChange: (page, pageSize) => {
                fetchTournaments(page, pageSize);
              }
            } : false}
            scroll={{ x: 1200 }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default TournamentList;