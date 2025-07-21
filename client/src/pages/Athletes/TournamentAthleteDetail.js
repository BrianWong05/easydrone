import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Tag, 
  Button, 
  Space, 
  Divider, 
  Table, 
  message, 
  Spin, 
  Avatar,
  Typography,
  Badge,
  Tooltip,
  Empty
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  ArrowLeftOutlined,
  TeamOutlined,
  TrophyOutlined,
  NumberOutlined,
  UserSwitchOutlined,
  CalendarOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const TournamentAthleteDetail = () => {
  const { t } = useTranslation(['athlete', 'common']);
  const { id: tournamentId, athleteId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [events, setEvents] = useState([]);

  // Load athlete data
  const loadAthleteData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/athletes/${athleteId}`);
      const data = await response.json();

      if (data.success) {
        setAthlete(data.data.athlete);
        setEvents(data.data.events || []);
        
        // Calculate basic statistics from events
        const stats = {
          matchesPlayed: 0,
          goals: 0,
          fouls: 0,
          penalties: 0,
          substitutions: 0
        };
        
        data.data.events.forEach(event => {
          if (event.event_type === 'goal') stats.goals++;
          if (event.event_type === 'foul') stats.fouls++;
          if (event.event_type === 'penalty') stats.penalties++;
          if (event.event_type === 'substitution') stats.substitutions++;
        });
        
        setStatistics(stats);
      } else {
        message.error(data.message || t('athlete:messages.noAthleteData'));
        navigate(`/tournaments/${tournamentId}/athletes`);
      }
    } catch (error) {
      console.error('Error loading athlete data:', error);
      message.error(t('athlete:messages.loadingAthletes'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (athleteId) {
      loadAthleteData();
    }
  }, [athleteId]);

  // Helper functions
  const getPositionColor = (position) => {
    const colors = {
      attacker: 'red',
      defender: 'blue',
      substitute: 'green'
    };
    return colors[position] || 'default';
  };

  const getPositionIcon = (position) => {
    const icons = {
      attacker: '⚽',
      defender: '🛡️',
      substitute: '🔄'
    };
    return icons[position] || '👤';
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'default';
  };

  // Event table columns
  const eventColumns = [
    {
      title: t('athlete:events.type'),
      dataIndex: 'event_type',
      key: 'event_type',
      render: (type) => {
        const typeColors = {
          goal: 'success',
          foul: 'warning',
          penalty: 'error',
          substitution: 'processing'
        };
        return (
          <Tag color={typeColors[type] || 'default'}>
            {t(`athlete:events.${type}`)}
          </Tag>
        );
      }
    },
    {
      title: t('athlete:events.time'),
      dataIndex: 'event_time',
      key: 'event_time'
    },
    {
      title: t('common:date.startDate'),
      dataIndex: 'match_date',
      key: 'match_date',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: t('athlete:athlete.team'),
      key: 'teams',
      render: (_, record) => `${record.team1_name} vs ${record.team2_name}`
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-6">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('athlete:messages.noAthleteData')}
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/athletes`)}
                className="hover:bg-gray-100"
              >
                {t('common:buttons.back')}
              </Button>
              <Title level={2} className="mb-0 text-gray-800">
                {t('athlete:athlete.detail')}
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${athleteId}/edit`)}
            >
              {t('athlete:athlete.edit')}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Athlete Profile Card */}
      <Card className="mb-6 shadow-sm border-0">
        <Row gutter={24}>
          <Col span={6}>
            <div className="text-center">
              <Avatar 
                size={120} 
                src={athlete.avatar_url ? `${athlete.avatar_url}?t=${Date.now()}` : null}
                icon={!athlete.avatar_url && <UserOutlined />} 
                className="bg-blue-500 mb-4 border-4 border-white shadow-lg"
                style={{
                  cursor: athlete.avatar_url ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (athlete.avatar_url) {
                    window.open(athlete.avatar_url, '_blank');
                  }
                }}
              />
              <div>
                <Title level={3} className="mb-2 text-gray-800">
                  {athlete.name}
                </Title>
                <Tag 
                  color={getPositionColor(athlete.position)} 
                  className="text-base px-3 py-1 flex items-center gap-2 w-fit mx-auto"
                >
                  <span className="text-lg">{getPositionIcon(athlete.position)}</span>
                  <span>{t(`athlete:positions.${athlete.position}`)}</span>
                </Tag>
              </div>
            </div>
          </Col>
          
          <Col span={18}>
            <Row gutter={[24, 16]}>
              <Col span={8}>
                <Card className="bg-blue-50 border-blue-200 h-full">
                  <Statistic
                    title={
                      <span className="text-blue-700 font-medium flex items-center gap-2">
                        <NumberOutlined />
                        {t('athlete:athlete.number')}
                      </span>
                    }
                    value={athlete.jersey_number}
                    valueStyle={{ color: '#1d4ed8', fontSize: '28px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              
              <Col span={8}>
                <Card className="bg-green-50 border-green-200 h-full">
                  <Statistic
                    title={
                      <span className="text-green-700 font-medium flex items-center gap-2">
                        <UserSwitchOutlined />
                        {t('athlete:athlete.age')}
                      </span>
                    }
                    value={athlete.age}
                    suffix={t('athlete:info.years')}
                    valueStyle={{ color: '#059669', fontSize: '28px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
              
              <Col span={8}>
                <Card className="bg-purple-50 border-purple-200 h-full">
                  <Statistic
                    title={
                      <span className="text-purple-700 font-medium flex items-center gap-2">
                        <TeamOutlined />
                        {t('athlete:athlete.team')}
                      </span>
                    }
                    value={athlete.team_name || t('athlete:info.noTeam')}
                    valueStyle={{ 
                      color: '#7c3aed', 
                      fontSize: athlete.team_name ? '18px' : '16px', 
                      fontWeight: 'bold' 
                    }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <div className="flex items-center gap-3">
                  <TrophyOutlined className="text-yellow-500 text-xl" />
                  <div>
                    <Text strong className="text-gray-700">
                      {t('athlete:info.tournament')}:
                    </Text>
                    <br />
                    <Text className="text-gray-600">
                      {athlete.tournament_name}
                    </Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="flex items-center gap-3">
                  <Badge 
                    status={getStatusColor(athlete.is_active)} 
                    className="text-lg"
                  />
                  <div>
                    <Text strong className="text-gray-700">
                      {t('athlete:athlete.status')}:
                    </Text>
                    <br />
                    <Text className="text-gray-600">
                      {athlete.is_active ? t('athlete:status.active') : t('athlete:status.inactive')}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics Card */}
      <Card title={t('athlete:athlete.statistics')} className="mb-6 shadow-sm border-0">
        <Row gutter={[24, 16]}>
          <Col span={6}>
            <Statistic
              title={
                <span className="flex items-center gap-2">
                  <FireOutlined className="text-red-500" />
                  {t('athlete:statistics.goals')}
                </span>
              }
              value={statistics.goals}
              valueStyle={{ color: '#dc2626' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span className="flex items-center gap-2">
                  <ThunderboltOutlined className="text-yellow-500" />
                  {t('athlete:statistics.fouls')}
                </span>
              }
              value={statistics.fouls}
              valueStyle={{ color: '#d97706' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span className="flex items-center gap-2">
                  <TrophyOutlined className="text-blue-500" />
                  {t('athlete:statistics.penalties')}
                </span>
              }
              value={statistics.penalties}
              valueStyle={{ color: '#2563eb' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span className="flex items-center gap-2">
                  <UserSwitchOutlined className="text-green-500" />
                  {t('athlete:events.substitution')}
                </span>
              }
              value={statistics.substitutions}
              valueStyle={{ color: '#059669' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Events History */}
      <Card 
        title={t('athlete:events.history')} 
        className="shadow-sm border-0"
      >
        {events.length > 0 ? (
          <Table
            columns={eventColumns}
            dataSource={events}
            rowKey="event_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                t('common:pagination.total', {
                  start: range[0],
                  end: range[1],
                  total: total
                })
            }}
          />
        ) : (
          <Empty
            description={t('athlete:messages.noEvents')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
    </div>
  );
};

export default TournamentAthleteDetail;