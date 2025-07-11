import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Table, 
  Space, 
  message, 
  Spin, 
  Alert,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  TrophyOutlined, 
  CalculatorOutlined,
  ReloadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const AllGroupStandings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [standings, setStandings] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchAllStandings();
  }, []);

  const fetchAllStandings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stats/group-standings');
      if (response.data.success) {
        setStandings(response.data.data.standings || []);
        calculateStats(response.data.data.standings || []);
      }
    } catch (error) {
      console.error('獲取積分榜失敗:', error);
      message.error('獲取積分榜失敗');
    } finally {
      setLoading(false);
    }
  };

  const calculateAllGroupStandings = async () => {
    try {
      setCalculating(true);
      message.loading('正在計算所有小組積分榜...', 0);
      
      const response = await axios.post('/api/stats/calculate-all-group-standings');
      
      message.destroy(); // Clear loading message
      
      if (response.data.success) {
        message.success(`計算完成！處理了 ${response.data.data.groups_processed} 個小組，${response.data.data.teams_processed} 支隊伍，${response.data.data.matches_processed} 場比賽`);
        setStandings(response.data.data.standings || []);
        calculateStats(response.data.data.standings || []);
      }
    } catch (error) {
      message.destroy();
      console.error('計算積分榜失敗:', error);
      message.error('計算積分榜失敗');
    } finally {
      setCalculating(false);
    }
  };

  const calculateStats = (standingsData) => {
    let totalTeams = 0;
    let totalMatches = 0;
    let totalGoals = 0;
    let groupsWithMatches = 0;

    standingsData.forEach(group => {
      totalTeams += group.teams.length;
      let groupHasMatches = false;
      
      group.teams.forEach(team => {
        totalMatches += team.played;
        totalGoals += team.goals_for;
        if (team.played > 0) groupHasMatches = true;
      });
      
      if (groupHasMatches) groupsWithMatches++;
    });

    setStats({
      totalGroups: standingsData.length,
      totalTeams,
      totalMatches: Math.floor(totalMatches / 2), // Each match involves 2 teams
      totalGoals,
      groupsWithMatches
    });
  };

  const standingsColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record, index) => (
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '14px',
          color: index === 0 ? '#faad14' : index === 1 ? '#52c41a' : '#1890ff'
        }}>
          {index + 1}
        </span>
      ),
      width: 50,
    },
    {
      title: '隊伍',
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 12, 
              height: 12, 
              backgroundColor: record.team_color, 
              marginRight: 6,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
            }} 
          />
          <span 
            style={{ 
              fontWeight: 'bold', 
              fontSize: '13px',
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => navigate(`/teams/${record.team_id}`)}
          >
            {record.team_name}
          </span>
        </div>
      ),
    },
    {
      title: '場',
      dataIndex: 'played',
      key: 'played',
      width: 40,
      align: 'center',
    },
    {
      title: '勝',
      dataIndex: 'won',
      key: 'won',
      width: 40,
      align: 'center',
      render: (won) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{won}</span>
    },
    {
      title: '平',
      dataIndex: 'drawn',
      key: 'drawn',
      width: 40,
      align: 'center',
      render: (drawn) => <span style={{ color: '#faad14', fontWeight: 'bold' }}>{drawn}</span>
    },
    {
      title: '負',
      dataIndex: 'lost',
      key: 'lost',
      width: 40,
      align: 'center',
      render: (lost) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{lost}</span>
    },
    {
      title: '進',
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 40,
      align: 'center',
    },
    {
      title: '失',
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 40,
      align: 'center',
    },
    {
      title: '淨',
      key: 'goal_difference',
      width: 50,
      align: 'center',
      render: (_, record) => {
        const diff = record.goals_for - record.goals_against;
        return (
          <span style={{ 
            color: diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#666',
            fontWeight: 'bold'
          }}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        );
      }
    },
    {
      title: '分',
      dataIndex: 'points',
      key: 'points',
      width: 50,
      align: 'center',
      render: (points) => (
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          color: '#1890ff' 
        }}>
          {points}
        </span>
      )
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <BarChartOutlined /> 所有小組積分榜
        </Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchAllStandings}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            type="primary"
            icon={<CalculatorOutlined />} 
            onClick={calculateAllGroupStandings}
            loading={calculating}
          >
            重新計算所有積分榜
          </Button>
        </Space>
      </div>

      {/* 統計概覽 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col span={4}>
            <Statistic title="小組數" value={stats.totalGroups} />
          </Col>
          <Col span={4}>
            <Statistic title="隊伍數" value={stats.totalTeams} />
          </Col>
          <Col span={4}>
            <Statistic title="比賽場次" value={stats.totalMatches} />
          </Col>
          <Col span={4}>
            <Statistic title="總進球數" value={stats.totalGoals} />
          </Col>
          <Col span={4}>
            <Statistic title="有比賽的小組" value={stats.groupsWithMatches} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="平均每場進球" 
              value={stats.totalMatches > 0 ? (stats.totalGoals / stats.totalMatches).toFixed(1) : 0} 
            />
          </Col>
        </Row>
      </Card>

      {/* 各小組積分榜 */}
      {standings.length === 0 ? (
        <Alert
          message="暫無積分榜數據"
          description="請點擊「重新計算所有積分榜」按鈕來生成積分榜"
          type="info"
          showIcon
        />
      ) : (
        <Row gutter={[16, 16]}>
          {standings.map(group => (
            <Col xs={24} sm={12} lg={8} xl={6} key={group.group_id}>
              <Card 
                title={
                  <div style={{ textAlign: 'center' }}>
                    <TrophyOutlined style={{ marginRight: '8px' }} />
                    小組 {group.group_name}
                  </div>
                }
                size="small"
                style={{ height: '100%' }}
              >
                <Table
                  columns={standingsColumns}
                  dataSource={group.teams}
                  rowKey="team_id"
                  pagination={false}
                  size="small"
                  locale={{ emptyText: '暫無隊伍' }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {standings.length > 0 && (
        <Card style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p><strong>積分規則：</strong> 勝利 3分，平局 1分，失敗 0分</p>
            <p><strong>排名規則：</strong> 積分 → 淨勝球 → 進球數</p>
            <p><strong>說明：</strong> 場=已踢場次，勝平負=勝平負場次，進失=進球失球，淨=淨勝球，分=積分</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AllGroupStandings;