import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Progress,
  Button
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  UsergroupAddOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const ClientGroupList = () => {
  const navigate = useNavigate();
  
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
        setError('找不到可顯示的錦標賽');
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
        
        setGroups(filteredGroups);
        
        // Calculate statistics
        const totalTeams = filteredGroups.reduce((sum, group) => sum + (group.team_count || 0), 0);
        const totalMatches = filteredGroups.reduce((sum, group) => sum + (group.total_matches || 0), 0);
        const completedMatches = filteredGroups.reduce((sum, group) => sum + (group.completed_matches || 0), 0);
        
        setStats({
          totalGroups: filteredGroups.length,
          totalTeams,
          totalMatches,
          completedMatches
        });
      }

    } catch (error) {
      console.error('Error fetching groups data:', error);
      setError('載入小組資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const getGroupStatus = (group) => {
    const totalMatches = group.total_matches || 0;
    const completedMatches = group.completed_matches || 0;
    
    if (totalMatches === 0) {
      return { status: 'not-started', text: '未開始', color: 'default' };
    } else if (completedMatches === totalMatches) {
      return { status: 'completed', text: '已完成', color: 'success' };
    } else if (completedMatches > 0) {
      return { status: 'in-progress', text: '進行中', color: 'processing' };
    } else {
      return { status: 'scheduled', text: '已排程', color: 'warning' };
    }
  };

  const getMatchProgress = (group) => {
    const total = group.total_matches || 0;
    const completed = group.completed_matches || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const columns = [
    {
      title: '小組',
      dataIndex: 'group_name',
      key: 'group_name',
      render: (name, record) => (
        <Space direction="vertical" size="small">
          <Text strong style={{ fontSize: '16px' }}>{getDisplayGroupName(name)}</Text>
          {record.tournament_name && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.tournament_name}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '隊伍數量',
      dataIndex: 'team_count',
      key: 'team_count',
      align: 'center',
      render: (count, record) => (
        <Space direction="vertical" size="small" style={{ textAlign: 'center' }}>
          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
            {count || 0}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            / {record.max_teams || 4}
          </Text>
        </Space>
      ),
    },
    {
      title: '比賽進度',
      key: 'match_progress',
      align: 'center',
      render: (_, record) => {
        const progress = getMatchProgress(record);
        const total = record.total_matches || 0;
        const completed = record.completed_matches || 0;
        
        return (
          <Space direction="vertical" size="small" style={{ textAlign: 'center' }}>
            <Progress 
              percent={progress} 
              size="small" 
              status={progress === 100 ? 'success' : 'active'}
              style={{ minWidth: '80px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {completed} / {total}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '狀態',
      key: 'status',
      align: 'center',
      render: (_, record) => {
        const status = getGroupStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          icon={<TeamOutlined />}
          onClick={() => navigate(`/groups/${record.group_id}`)}
        >
          查看詳情
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>載入小組資料中...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="載入失敗"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchGroupsData}>
              重新載入
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Tournament Header */}
      {tournament && (
        <Card style={{ marginBottom: 24 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space direction="vertical" size="small">
                <Title level={2} style={{ margin: 0 }}>
                  <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  {tournament.tournament_name}
                </Title>
                <Text type="secondary">小組列表</Text>
              </Space>
            </Col>
            <Col>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {tournament.status === 'active' ? '進行中' : tournament.status}
              </Tag>
            </Col>
          </Row>
        </Card>
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="總小組數"
              value={stats.totalGroups}
              prefix={<UsergroupAddOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="總隊伍數"
              value={stats.totalTeams}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="總比賽數"
              value={stats.totalMatches}
              prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已完成比賽"
              value={stats.completedMatches}
              prefix={<PlayCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Groups Table */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>
            <UsergroupAddOutlined style={{ marginRight: 8 }} />
            小組列表
          </Title>
        </div>
        
        <Table
          columns={columns}
          dataSource={groups}
          rowKey="group_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 項，共 ${total} 個小組`,
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <UsergroupAddOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">暫無小組資料</Text>
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