import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Descriptions, Tag, Avatar, message, List, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined, EditOutlined, UserOutlined, TrophyOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const AthleteDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [athlete, setAthlete] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAthleteData();
  }, [id]);

  const fetchAthleteData = async () => {
    try {
      console.log('🔍 獲取運動員數據，ID:', id);
      const response = await axios.get(`http://localhost:8001/api/athletes/${id}`);
      console.log('📡 API 響應:', response.data);
      
      if (response.data.success) {
        // 後端返回的數據結構是 {athlete: {...}, events: [...]}
        const athleteData = response.data.data.athlete;
        console.log('👤 運動員數據:', athleteData);
        
        setAthlete(athleteData);
        
        // 獲取該運動員所在隊伍的比賽記錄
        if (athleteData.team_id) {
          await fetchTeamMatches(athleteData.team_id);
        }
      } else {
        message.error('獲取運動員信息失敗');
        navigate('/athletes');
      }
    } catch (error) {
      console.error('❌ 獲取運動員數據錯誤:', error);
      console.error('❌ 錯誤響應:', error.response?.data);
      message.error('無法載入運動員信息');
      navigate('/athletes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMatches = async (teamId) => {
    try {
      const response = await axios.get(`http://localhost:8001/api/matches?team_id=${teamId}`);
      if (response.data.success) {
        const matchesData = response.data.data.matches || [];
        setMatches(matchesData.slice(0, 5)); // 只顯示最近5場比賽
      }
    } catch (error) {
      console.error('獲取比賽記錄錯誤:', error);
    }
  };

  const handleBack = () => {
    navigate('/athletes');
  };

  const handleEdit = () => {
    navigate(`/athletes/${id}/edit`);
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

  if (loading) {
    return <div style={{ padding: '24px' }}>載入中...</div>;
  }

  if (!athlete) {
    return <div style={{ padding: '24px' }}>運動員不存在</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
          >
            返回列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>運動員詳情</Title>
        </div>

        <Card
          title={
            <Space>
              <Avatar 
                style={{ 
                  backgroundColor: athlete.team_color,
                  color: '#fff',
                  fontWeight: 'bold'
                }}
                icon={<UserOutlined />}
                size="large"
              >
                {athlete.jersey_number}
              </Avatar>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{athlete.name}</span>
              <Tag color={getPositionColor(athlete.position)}>
                {getPositionText(athlete.position)}
              </Tag>
              {!athlete.is_active && <Tag color="red">非活躍</Tag>}
            </Space>
          }
          extra={
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              編輯運動員
            </Button>
          }
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="運動員姓名">{athlete.name}</Descriptions.Item>
            <Descriptions.Item label="球衣號碼">#{athlete.jersey_number}</Descriptions.Item>
            <Descriptions.Item label="所屬隊伍">
              <Space>
                <div 
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: athlete.team_color,
                    borderRadius: '50%',
                    border: '1px solid #ccc'
                  }}
                />
                {athlete.team_name}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="位置">
              <Tag color={getPositionColor(athlete.position)}>
                {getPositionText(athlete.position)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="年齡">
              {athlete.age ? `${athlete.age}歲` : '未設定'}
            </Descriptions.Item>
            <Descriptions.Item label="狀態">
              <Tag color={athlete.is_active ? 'green' : 'red'}>
                {athlete.is_active ? '活躍' : '非活躍'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="加入時間" span={2}>
              {new Date(athlete.created_at).toLocaleDateString('zh-TW')}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 統計信息 */}
        <Card title={
          <Space>
            <TrophyOutlined />
            <span>統計信息</span>
          </Space>
        }>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="參與比賽"
                value={matches.length}
                suffix="場"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="球衣號碼"
                value={athlete.jersey_number}
                prefix="#"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="隊伍成員"
                value={athlete.is_active ? "活躍" : "非活躍"}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="加入天數"
                value={Math.floor((new Date() - new Date(athlete.created_at)) / (1000 * 60 * 60 * 24))}
                suffix="天"
              />
            </Col>
          </Row>
        </Card>

        {/* 隊伍信息 */}
        <Card 
          title={
            <Space>
              <TeamOutlined />
              <span>隊伍信息</span>
            </Space>
          }
          extra={
            <Button 
              type="link"
              onClick={() => navigate(`/teams/${athlete.team_id}`)}
            >
              查看隊伍詳情
            </Button>
          }
        >
          <Descriptions column={2}>
            <Descriptions.Item label="隊伍名稱">
              <Space>
                <div 
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: athlete.team_color,
                    borderRadius: '50%',
                    border: '1px solid #ccc'
                  }}
                />
                {athlete.team_name}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="所屬小組">
              {athlete.group_name ? `小組 ${athlete.group_name}` : '未分組'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 最近比賽記錄 */}
        {matches.length > 0 && (
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                <span>最近比賽記錄</span>
                <Tag color="blue">{matches.length} 場</Tag>
              </Space>
            }
            extra={
              <Button 
                type="link"
                onClick={() => navigate('/matches')}
              >
                查看所有比賽
              </Button>
            }
          >
            <List
              dataSource={matches}
              renderItem={(match) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => navigate(`/matches/${match.match_id}`)}
                    >
                      查看詳情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{match.team1_name}</span>
                        <span style={{ color: '#666' }}>vs</span>
                        <span>{match.team2_name}</span>
                        <Tag color={
                          match.match_status === 'completed' ? 'green' : 
                          match.match_status === 'active' ? 'blue' : 'default'
                        }>
                          {match.match_status === 'completed' ? '已完成' : 
                           match.match_status === 'active' ? '進行中' : '待開始'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <span>比分: {match.team1_score} - {match.team2_score}</span>
                        <span>|</span>
                        <span>{new Date(match.match_date).toLocaleDateString('zh-TW')}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </Space>
    </div>
  );
};

export default AthleteDetail;