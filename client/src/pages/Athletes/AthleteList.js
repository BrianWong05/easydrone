import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Table, Tag, Avatar, Select, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UserOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

const AthleteList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState(searchParams.get('team') || 'all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetchAthletes(1, 10);
    fetchTeams();
  }, []);

  const fetchAthletes = async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      
      // 構建查詢參數
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (teamFilter && teamFilter !== 'all') {
        params.append('team_id', teamFilter);
      }
      
      if (positionFilter && positionFilter !== 'all') {
        params.append('position', positionFilter);
      }
      
      if (searchText) {
        params.append('search', searchText);
      }
      
      const response = await axios.get(`http://localhost:8001/api/athletes?${params.toString()}`);
      
      if (response.data.success) {
        const athletesData = response.data.data.athletes || [];
        const paginationData = response.data.data.pagination || {};
        
        setAthletes(athletesData);
        setPagination({
          current: paginationData.page || 1,
          pageSize: paginationData.limit || 10,
          total: paginationData.total || 0
        });
      } else {
        message.error('獲取運動員列表失敗');
      }
    } catch (error) {
      console.error('獲取運動員列表錯誤:', error);
      message.error('獲取運動員列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/http://localhost:8001/api/teams');
      if (response.data.success) {
        const teamsData = response.data.data.teams || [];
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('獲取隊伍列表錯誤:', error);
    }
  };

  const handleDelete = async (athleteId) => {
    try {
      console.log('🗑️ 刪除運動員，ID:', athleteId);
      const response = await axios.delete(`http://localhost:8001/api/athletes/${athleteId}`);
      
      if (response.data.success) {
        message.success('運動員刪除成功');
        fetchAthletes(pagination.current, pagination.pageSize); // 重新載入列表
      } else {
        message.error(response.data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('❌ 刪除運動員錯誤:', error);
      console.error('❌ 錯誤響應:', error.response?.data);
      
      if (error.response?.status === 404) {
        message.error('運動員不存在');
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('刪除失敗，請重試');
      }
    }
  };

  // 移除前端過濾，因為後端已經處理了過濾和分頁
  const filteredAthletes = athletes;

  // 處理篩選器變化
  const handleFilterChange = () => {
    fetchAthletes(1, pagination.pageSize);
  };


  const getPositionText = (position) => {
    switch (position) {
      case 'attacker': return '進攻手';
      case 'defender': return '防守員';
      case 'substitute': return '替補';
      default: return position;
    }
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'attacker': return 'red';
      case 'defender': return 'blue';
      case 'substitute': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: '運動員',
      key: 'athlete',
      render: (_, record) => (
        <Space>
          <Avatar 
            style={{ 
              backgroundColor: record.team_color,
              color: '#fff',
              fontWeight: 'bold'
            }}
            icon={<UserOutlined />}
          >
            {record.jersey_number}
          </Avatar>
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              #{record.jersey_number} | {record.age ? `${record.age}歲` : '年齡未知'}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '所屬隊伍',
      key: 'team',
      render: (_, record) => (
        <Space>
          <div 
            style={{
              width: 12,
              height: 12,
              backgroundColor: record.team_color,
              borderRadius: '50%',
              border: '1px solid #ccc'
            }}
          />
          <span>{record.team_name}</span>
        </Space>
      ),
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
      render: (position) => (
        <Tag color={getPositionColor(position)}>
          {getPositionText(position)}
        </Tag>
      ),
    },
    {
      title: '球衣號碼',
      dataIndex: 'jersey_number',
      key: 'jersey_number',
      render: (number) => (
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '16px',
          color: '#1890ff'
        }}>
          #{number}
        </span>
      ),
    },
    {
      title: '年齡',
      dataIndex: 'age',
      key: 'age',
      render: (age) => age ? `${age}歲` : '未知',
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '活躍' : '非活躍'}
        </Tag>
      ),
    },
    {
      title: '加入時間',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="default" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/athletes/${record.athlete_id}`)}
          >
            查看
          </Button>
          <Button 
            type="primary" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/athletes/${record.athlete_id}/edit`)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確認刪除運動員"
            description={`確定要刪除運動員 "${record.name}" 嗎？此操作無法撤銷。`}
            onConfirm={() => handleDelete(record.athlete_id)}
            okText="確認刪除"
            cancelText="取消"
            okType="danger"
          >
            <Button 
              type="primary" 
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>運動員列表</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/athletes/create')}
          >
            新增運動員
          </Button>
        </div>

        <Card>
          <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <Search
              placeholder="搜索運動員姓名或球衣號碼"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                // 延遲搜索以避免過多API調用
                setTimeout(() => handleFilterChange(), 500);
              }}
              style={{ width: 250 }}
              prefix={<SearchOutlined />}
            />
            
            <Select
              value={teamFilter}
              onChange={(value) => {
                setTeamFilter(value);
                handleFilterChange();
              }}
              style={{ width: 150 }}
              placeholder="選擇隊伍"
            >
              <Option value="all">全部隊伍</Option>
              {teams.map(team => (
                <Option key={team.team_id} value={team.team_id.toString()}>{team.team_name}</Option>
              ))}
            </Select>

            <Select
              value={positionFilter}
              onChange={(value) => {
                setPositionFilter(value);
                handleFilterChange();
              }}
              style={{ width: 120 }}
              placeholder="選擇位置"
            >
              <Option value="all">全部位置</Option>
              <Option value="attacker">進攻手</Option>
              <Option value="defender">防守員</Option>
              <Option value="substitute">替補</Option>
            </Select>
          </Space>
          
          <Table
            columns={columns}
            dataSource={filteredAthletes}
            loading={loading}
            rowKey="athlete_id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 名運動員`,
              onChange: (page, pageSize) => {
                fetchAthletes(page, pageSize);
              },
              onShowSizeChange: (current, size) => {
                fetchAthletes(1, size);
              }
            }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default AthleteList;