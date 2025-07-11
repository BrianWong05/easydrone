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
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const TournamentList = () => {
  const navigate = useNavigate();
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
          message.error(`獲取錦標賽列表失敗: ${errorMessage}`);
        }
      } else if (error.request) {
        // 網絡錯誤
        message.error('網絡連接失敗，請檢查網絡連接');
      } else {
        // 其他錯誤
        message.error('獲取錦標賽列表失敗，請稍後重試');
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
      const response = await axios.delete(`/tournaments/${tournamentId}`);
      if (response.data.success) {
        message.success('錦標賽刪除成功');
        fetchTournaments(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      console.error('刪除錦標賽失敗:', error);
      message.error(error.response?.data?.message || '刪除錦標賽失敗');
    }
  };

  // 更新錦標賽狀態
  const handleStatusUpdate = async (tournamentId, status) => {
    try {
      const response = await axios.put(`/tournaments/${tournamentId}/status`, { status });
      if (response.data.success) {
        message.success('錦標賽狀態更新成功');
        fetchTournaments(pagination.current, pagination.pageSize);
      }
    } catch (error) {
      console.error('更新錦標賽狀態失敗:', error);
      message.error(error.response?.data?.message || '更新錦標賽狀態失敗');
    }
  };

  // 獲取狀態標籤
  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: 'orange', text: '待開始' },
      active: { color: 'green', text: '進行中' },
      completed: { color: 'blue', text: '已完成' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 獲取類型標籤
  const getTypeTag = (type) => {
    const typeConfig = {
      group: { color: 'cyan', text: '小組賽' },
      knockout: { color: 'red', text: '淘汰賽' },
      mixed: { color: 'purple', text: '混合賽制' }
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
      title: '錦標賽名稱',
      dataIndex: 'tournament_name',
      key: 'tournament_name',
      render: (text, record) => (
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span style={{ fontWeight: 'bold' }}>{text}</span>
        </Space>
      )
    },
    {
      title: '類型',
      dataIndex: 'tournament_type',
      key: 'tournament_type',
      render: (type) => getTypeTag(type),
      width: 120
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
      width: 100
    },
    {
      title: '比賽進度',
      key: 'progress',
      render: (_, record) => {
        const progress = getProgress(record.completed_matches, record.total_matches);
        return (
          <div style={{ width: 120 }}>
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
      title: '日期',
      key: 'dates',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <div>
            <CalendarOutlined style={{ marginRight: 4, color: '#52c41a' }} />
            開始: {moment(record.start_date).format('YYYY-MM-DD')}
          </div>
          <div>
            <CalendarOutlined style={{ marginRight: 4, color: '#f5222d' }} />
            結束: {moment(record.end_date).format('YYYY-MM-DD')}
          </div>
        </Space>
      ),
      width: 180
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm'),
      width: 150
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/tournaments/${record.tournament_id}`)}
            />
          </Tooltip>
          
          {record.tournament_type === 'knockout' && (
            <Tooltip title="查看淘汰賽圖表">
              <Button 
                type="text" 
                icon={<TeamOutlined />} 
                onClick={() => navigate(`/tournaments/${record.tournament_id}/bracket`)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="編輯">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => navigate(`/tournaments/${record.tournament_id}/edit`)}
            />
          </Tooltip>
          
          {record.status === 'pending' && (
            <Tooltip title="開始錦標賽">
              <Button 
                type="text" 
                style={{ color: '#52c41a' }}
                onClick={() => handleStatusUpdate(record.tournament_id, 'active')}
              >
                開始
              </Button>
            </Tooltip>
          )}
          
          {record.status === 'active' && (
            <Tooltip title="結束錦標賽">
              <Button 
                type="text" 
                style={{ color: '#faad14' }}
                onClick={() => handleStatusUpdate(record.tournament_id, 'completed')}
              >
                結束
              </Button>
            </Tooltip>
          )}
          
          <Popconfirm
            title="確定要刪除這個錦標賽嗎？"
            description="刪除後將無法恢復，相關的比賽數據也會被刪除。"
            onConfirm={() => handleDelete(record.tournament_id)}
            okText="確定"
            cancelText="取消"
          >
            <Tooltip title="刪除">
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
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 頁面標題和新增按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>
            <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
            錦標賽管理
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/tournaments/create')}
            size="large"
          >
            新增錦標賽
          </Button>
        </div>

        {/* 篩選器 */}
        <Card>
          <Space wrap>
            <Search
              placeholder="搜索錦標賽名稱"
              style={{ width: 200 }}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              allowClear
            />
            
            <Select
              placeholder="選擇狀態"
              style={{ width: 120 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
            >
              <Option value="pending">待開始</Option>
              <Option value="active">進行中</Option>
              <Option value="completed">已完成</Option>
            </Select>
            
            <Select
              placeholder="選擇類型"
              style={{ width: 120 }}
              value={filters.type}
              onChange={(value) => setFilters({ ...filters, type: value })}
              allowClear
            >
              <Option value="group">小組賽</Option>
              <Option value="knockout">淘汰賽</Option>
              <Option value="mixed">混合賽制</Option>
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
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <TrophyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                  <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ fontSize: 16 }}>暫無錦標賽數據</Text>
                  </div>
                  <div>
                    <Text type="secondary">點擊上方「新增錦標賽」按鈕創建您的第一個錦標賽</Text>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => navigate('/tournaments/create')}
                    >
                      新增錦標賽
                    </Button>
                  </div>
                </div>
              )
            }}
            pagination={tournaments.length > 0 ? {
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
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