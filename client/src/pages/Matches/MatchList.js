import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Table, Tag, Select, DatePicker, message, Modal } from 'antd';
import { PlusOutlined, PlayCircleOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';
import { getMatchTypeText } from '../../utils/matchUtils';

const { Title } = Typography;
const { Option } = Select;

const MatchList = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  // Refresh data when component becomes visible (e.g., returning from edit page)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing match list...');
      fetchMatches();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchMatches = async (status = statusFilter) => {
    try {
      setLoading(true);
      
      // 獲取所有比賽數據，不使用服務器端分頁
      const params = new URLSearchParams({
        page: '1',
        limit: '1000' // 獲取大量數據以確保獲取所有比賽
      });
      
      if (status && status !== 'all') {
        params.append('status', status);
      }
      
      const response = await axios.get(`/api/matches?${params.toString()}`);
      
      if (response.data.success) {
        const matchesData = response.data.data.matches || [];
        
        // 處理數據並應用自定義排序
        const processedMatches = matchesData.map(match => ({
          ...match,
          team1: match.team1_name,
          team2: match.team2_name,
          winner: match.winner_name || null,
          match_type_display: getMatchTypeText(match),
        })).sort(sortMatchNumber); // 在這裡應用排序
        
        setMatches(processedMatches);
        
        // 設置客戶端分頁信息
        setPagination({
          current: 1,
          pageSize: 10,
          total: processedMatches.length
        });
      } else {
        message.error('獲取比賽列表失敗');
      }
    } catch (error) {
      console.error('獲取比賽列表錯誤:', error);
      message.error('獲取比賽列表失敗');
    } finally {
      setLoading(false);
    }
  };

  // 客戶端分頁處理
  const startIndex = (pagination.current - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const paginatedMatches = matches.slice(startIndex, endIndex);

  const handleStartMatch = (matchId) => {
    navigate(`/matches/${matchId}/live`);
  };

  const handleDeleteMatch = (matchId, matchNumber) => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除比賽 "${matchNumber}" 嗎？此操作無法撤銷。`,
      okText: '確認刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/matches/${matchId}`);
          
          if (response.data.success) {
            message.success('比賽刪除成功！');
            // 重新獲取比賽列表
            fetchMatches();
          } else {
            message.error(response.data.message || '刪除失敗');
          }
        } catch (error) {
          console.error('刪除比賽錯誤:', error);
          if (error.response?.data?.message) {
            message.error(error.response.data.message);
          } else {
            message.error('刪除失敗，請重試');
          }
        }
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'active': return 'blue';
      case 'completed': return 'green';
      case 'overtime': return 'purple';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '待開始';
      case 'active': return '進行中';
      case 'completed': return '已完成';
      case 'overtime': return '延長賽';
      default: return status;
    }
  };

  // Custom sorting function for match numbers (e.g., A01, B01, C01, A02, B02, C02)
  const sortMatchNumber = (a, b) => {
    const aNumber = a.match_number || '';
    const bNumber = b.match_number || '';
    
    // Extract first character (group letter)
    const aGroup = aNumber.charAt(0);
    const bGroup = bNumber.charAt(0);
    
    // Extract last 2 characters as integer (match number)
    const aMatch = parseInt(aNumber.slice(-2)) || 0;
    const bMatch = parseInt(bNumber.slice(-2)) || 0;
    
    // First sort by match number (01, 02, 03...)
    if (aMatch !== bMatch) {
      return aMatch - bMatch;
    }
    
    // Then sort by group letter (A, B, C...)
    return aGroup.localeCompare(bGroup);
  };

  const columns = [
    {
      title: '比賽編號',
      dataIndex: 'match_number',
      key: 'match_number',
      render: (text, record) => (
        <span 
          style={{ 
            fontWeight: 'bold', 
            color: '#1890ff', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {text}
        </span>
      ),
      sorter: sortMatchNumber,
      defaultSortOrder: 'ascend',
    },
    {
      title: '對戰隊伍',
      key: 'teams',
      render: (_, record) => (
        <div 
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{record.team1}</span>
            <span style={{ margin: '0 8px', color: '#666' }}>vs</span>
            <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{record.team2}</span>
          </div>
          {record.group_name && (
            <Tag size="small" color="blue">小組 {record.group_name}</Tag>
          )}
        </div>
      ),
    },
    {
      title: '比分',
      key: 'score',
      render: (_, record) => (
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
          {record.match_status === 'pending' ? '-' : `${record.team1_score} : ${record.team2_score}`}
        </span>
      ),
    },
    {
      title: '比賽類型',
      dataIndex: 'match_type_display',
      key: 'match_type_display',
      render: (type) => <Tag color="cyan">{type}</Tag>,
    },
    {
      title: '狀態',
      dataIndex: 'match_status',
      key: 'match_status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '比賽時間',
      dataIndex: 'match_date',
      key: 'match_date',
      render: (date) => moment(date).format('MM-DD HH:mm'),
    },
    {
      title: '勝者',
      dataIndex: 'winner',
      key: 'winner',
      render: (winner) => winner ? <Tag color="gold">{winner}</Tag> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/matches/${record.match_id}`)}
          >
            查看
          </Button>
          {record.match_status === 'pending' && (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />}
              onClick={() => handleStartMatch(record.match_id)}
            >
              開始
            </Button>
          )}
          {record.match_status === 'active' && (
            <Button 
              type="link" 
              icon={<PlayCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => handleStartMatch(record.match_id)}
            >
              即時
            </Button>
          )}
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => navigate(
              record.match_status === 'completed' 
                ? `/matches/${record.match_id}/result-edit`
                : `/matches/${record.match_id}/edit`
            )}
          >
            {record.match_status === 'completed' ? '編輯結果' : '編輯'}
          </Button>
          <Button 
            type="link" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDeleteMatch(record.match_id, record.match_number)}
          >
            刪除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>比賽列表</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/matches/create')}
          >
            新增比賽
          </Button>
        </div>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <span>狀態篩選：</span>
            <Select
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPagination(prev => ({ ...prev, current: 1 })); // 重置到第一頁
                fetchMatches(value);
              }}
              style={{ width: 120 }}
            >
              <Option value="all">全部</Option>
              <Option value="pending">待開始</Option>
              <Option value="active">進行中</Option>
              <Option value="completed">已完成</Option>
            </Select>
          </Space>
          
          <Table
            columns={columns}
            style={
              {overflowX: 'auto', maxWidth: '100%'}
            }
            dataSource={paginatedMatches}
            loading={loading}
            rowKey="match_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 場比賽`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize: pageSize }));
              },
              onShowSizeChange: (current, size) => {
                setPagination(prev => ({ ...prev, current: 1, pageSize: size }));
              }
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default MatchList;