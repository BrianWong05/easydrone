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
  Statistic,
  Tag,
  Tooltip
} from 'antd';
import { 
  TrophyOutlined, 
  ReloadOutlined,
  CrownOutlined,
  SafetyOutlined,
  FireOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const OverallLeaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    fetchOverallLeaderboard();
  }, []);

  const fetchOverallLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stats/overall-leaderboard');
      if (response.data.success) {
        setLeaderboard(response.data.data.leaderboard || []);
      }
    } catch (error) {
      console.error('獲取總排名榜失敗:', error);
      message.error('獲取總排名榜失敗');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#faad14';
    if (rank === 2) return '#52c41a';
    if (rank === 3) return '#1890ff';
    return '#666';
  };

  // Helper function to clean team names (remove tournament suffix)
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否包含 _{number} 格式的後綴，如果是則移除
    const match = teamName.match(/^(.+)_\d+$/);
    if (match) {
      return match[1];
    }
    return teamName;
  };

  const leaderboardColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontSize: record.rank <= 3 ? '18px' : '16px',
            fontWeight: 'bold',
            color: getRankColor(record.rank)
          }}>
            {getRankIcon(record.rank)}
          </span>
        </div>
      ),
      width: 80,
      fixed: 'left',
    },
    {
      title: '隊伍',
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color, 
              marginRight: 8,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
            }} 
          />
          <div>
            <div 
              style={{ 
                fontWeight: 'bold',
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? (
                <>
                  小組 {record.group_name}
                  {record.group_position && (
                    <Tag 
                      size="small" 
                      color={
                        record.group_position === 1 ? 'gold' : 
                        record.group_position === 2 ? 'green' : 
                        record.group_position === 3 ? 'blue' : 'default'
                      }
                      style={{ marginLeft: '4px' }}
                    >
                      第{record.group_position}名
                    </Tag>
                  )}
                </>
              ) : '無小組'}
            </Text>
          </div>
        </div>
      ),
      width: 220,
      fixed: 'left',
    },
    {
      title: '場次',
      dataIndex: 'played',
      key: 'played',
      width: 70,
      align: 'center',
    },
    {
      title: '勝',
      dataIndex: 'won',
      key: 'won',
      width: 60,
      align: 'center',
      render: (won) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{won}</span>
    },
    {
      title: '平',
      dataIndex: 'drawn',
      key: 'drawn',
      width: 60,
      align: 'center',
      render: (drawn) => <span style={{ color: '#faad14', fontWeight: 'bold' }}>{drawn}</span>
    },
    {
      title: '負',
      dataIndex: 'lost',
      key: 'lost',
      width: 60,
      align: 'center',
      render: (lost) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{lost}</span>
    },
    {
      title: '進球',
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 70,
      align: 'center',
      render: (goals) => <span style={{ fontWeight: 'bold' }}>{goals}</span>
    },
    {
      title: '失球',
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 70,
      align: 'center',
    },
    {
      title: '淨勝球',
      key: 'goal_difference',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <span style={{ 
          color: record.goal_difference > 0 ? '#52c41a' : record.goal_difference < 0 ? '#ff4d4f' : '#666',
          fontWeight: 'bold'
        }}>
          {record.goal_difference > 0 ? '+' : ''}{record.goal_difference}
        </span>
      )
    },
    {
      title: '積分',
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
      render: (points, record) => (
        <span style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: record.rank <= 3 ? getRankColor(record.rank) : '#1890ff'
        }}>
          {points}
        </span>
      )
    },
    {
      title: '勝率',
      key: 'win_rate',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <span style={{ 
          color: record.win_rate >= 70 ? '#52c41a' : record.win_rate >= 40 ? '#faad14' : '#ff4d4f'
        }}>
          {record.win_rate}%
        </span>
      )
    },
    {
      title: '場均積分',
      key: 'points_per_game',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <span>{record.points_per_game}</span>
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
          <TrophyOutlined /> 總排名榜
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchOverallLeaderboard}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* 總排名榜 */}
      <Card title={<><BarChartOutlined /> 所有隊伍排名</>}>
        {leaderboard.length === 0 ? (
          <Alert
            message="暫無排名數據"
            description="當隊伍完成比賽後，排名將自動顯示"
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={leaderboardColumns}
            dataSource={leaderboard}
            rowKey="team_id"
            pagination={{ 
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 名，共 ${total} 支隊伍`
            }}
            scroll={{ x: 1000 }}
            size="small"
            locale={{ emptyText: '暫無排名數據' }}
            rowClassName={(record) => {
              if (record.rank === 1) return 'rank-first';
              if (record.rank === 2) return 'rank-second';
              if (record.rank === 3) return 'rank-third';
              return '';
            }}
          />
        )}
      </Card>

      {leaderboard.length > 0 && (
        <Card style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <p><strong>排名規則：</strong> 小組內排名 → 同排名隊伍間比較（積分 → 淨勝球 → 進球數）</p>
            <p><strong>積分規則：</strong> 勝利 3分，平局 1分，失敗 0分</p>
            <p><strong>排序說明：</strong> 先顯示各小組第1名，再顯示各小組第2名，以此類推</p>
            <p><strong>標籤說明：</strong> 
              <Tag size="small" color="gold" style={{ margin: '0 4px' }}>第1名</Tag>
              <Tag size="small" color="green" style={{ margin: '0 4px' }}>第2名</Tag>
              <Tag size="small" color="blue" style={{ margin: '0 4px' }}>第3名</Tag>
              表示該隊伍在其小組內的排名
            </p>
          </div>
        </Card>
      )}

      <style jsx>{`
        .rank-first {
          background-color: #fff7e6 !important;
        }
        .rank-second {
          background-color: #f6ffed !important;
        }
        .rank-third {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </div>
  );
};

export default OverallLeaderboard;