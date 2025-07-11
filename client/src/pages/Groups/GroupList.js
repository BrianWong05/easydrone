import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Row, Col, Table, Tag, Progress, message } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const GroupList = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      // 獲取小組列表和積分榜
      const [groupsRes, statsRes] = await Promise.all([
        axios.get('/api/groups'),
        axios.get('/api/stats/groups')
      ]);
      
      if (groupsRes.data.success) {
        const groupsData = groupsRes.data.data.groups || [];
        const standings = statsRes.data.success ? statsRes.data.data.standings || [] : [];
        
        // 組合小組數據和積分榜
        const groupsWithStandings = groupsData.map(group => {
          const groupStandings = standings
            .filter(team => team.group_id === group.group_id)
            .sort((a, b) => b.points - a.points)
            .map(team => ({
              team_id: team.team_id, // 添加 team_id 用於導航
              name: team.team_name,
              points: team.points,
              played: team.played,
              won: team.won,
              drawn: team.drawn,
              lost: team.lost,
              gf: team.goals_for,
              ga: team.goals_against
            }));
          
          return {
            group_id: group.group_id,
            group_name: group.group_name,
            max_teams: group.max_teams,
            current_teams: groupStandings.length,
            teams: groupStandings
          };
        });
        
        setGroups(groupsWithStandings);
      } else {
        message.error('獲取小組列表失敗');
      }
    } catch (error) {
      console.error('獲取小組數據錯誤:', error);
      message.error('獲取小組數據失敗');
    } finally {
      setLoading(false);
    }
  };

  const standingsColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <span style={{ 
          fontWeight: 'bold',
          color: index < 2 ? '#52c41a' : '#666'
        }}>
          {index + 1}
        </span>
      ),
    },
    {
      title: '隊伍',
      dataIndex: 'name',
      key: 'name',
      render: (name, record, index) => (
        <Space>
          {index < 2 && <TrophyOutlined style={{ color: '#faad14' }} />}
          <span 
            style={{ 
              fontWeight: index < 2 ? 'bold' : 'normal',
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => {
              if (record.team_id) {
                navigate(`/teams/${record.team_id}`);
              } else {
                message.warning('無法找到隊伍詳情');
              }
            }}
          >
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: '積分',
      dataIndex: 'points',
      key: 'points',
      width: 60,
      render: (points) => <span style={{ fontWeight: 'bold', color: '#1890ff' }}>{points}</span>,
    },
    {
      title: '場次',
      dataIndex: 'played',
      key: 'played',
      width: 60,
    },
    {
      title: '勝',
      dataIndex: 'won',
      key: 'won',
      width: 50,
      render: (won) => <span style={{ color: '#52c41a' }}>{won}</span>,
    },
    {
      title: '平',
      dataIndex: 'drawn',
      key: 'drawn',
      width: 50,
      render: (drawn) => <span style={{ color: '#faad14' }}>{drawn}</span>,
    },
    {
      title: '負',
      dataIndex: 'lost',
      key: 'lost',
      width: 50,
      render: (lost) => <span style={{ color: '#ff4d4f' }}>{lost}</span>,
    },
    {
      title: '進球',
      dataIndex: 'gf',
      key: 'gf',
      width: 60,
    },
    {
      title: '失球',
      dataIndex: 'ga',
      key: 'ga',
      width: 60,
    },
    {
      title: '淨勝球',
      key: 'gd',
      width: 80,
      render: (_, record) => {
        const gd = record.gf - record.ga;
        return (
          <span style={{ 
            color: gd > 0 ? '#52c41a' : gd < 0 ? '#ff4d4f' : '#666',
            fontWeight: 'bold'
          }}>
            {gd > 0 ? '+' : ''}{gd}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>小組列表</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/groups/create')}
          >
            新增小組
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {groups.map((group) => (
            <Col xs={24} lg={12} key={group.group_id}>
              <Card
                title={
                  <Space>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      小組 {group.group_name}
                    </span>
                    <Tag color="blue">
                      {group.current_teams}/{group.max_teams} 隊伍
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Button 
                      type="link" 
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/groups/${group.group_id}`)}
                    >
                      查看詳情
                    </Button>
                    <Button 
                      type="link" 
                      icon={<EditOutlined />}
                      onClick={() => navigate(`/groups/${group.group_id}/edit`)}
                    >
                      編輯
                    </Button>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Text type="secondary">隊伍完整度</Text>
                    <Progress 
                      percent={(group.current_teams / group.max_teams) * 100} 
                      size="small"
                      status={group.current_teams === group.max_teams ? 'success' : 'active'}
                    />
                  </div>
                  
                  <div>
                    <Text strong style={{ marginBottom: 8, display: 'block' }}>積分榜</Text>
                    <Table
                      columns={standingsColumns}
                      dataSource={group.teams}
                      pagination={false}
                      size="small"
                      rowKey="name"
                      scroll={{ x: true }}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {groups.length === 0 && !loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">暫無小組數據</Text>
              <br />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => navigate('/groups/create')}
                style={{ marginTop: 16 }}
              >
                創建第一個小組
              </Button>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default GroupList;