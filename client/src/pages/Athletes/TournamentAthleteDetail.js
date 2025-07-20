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
  CalendarOutlined,
  NumberOutlined,
  UserSwitchOutlined,
  PlayCircleOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const TournamentAthleteDetail = () => {
  const { t } = useTranslation(['athlete', 'common', 'match']);
  const { id: tournamentId, athleteId } = useParams();
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalEvents: 0,
    goals: 0,
    fouls: 0,
    penalties: 0,
    matchesPlayed: 0
  });

  // Load athlete data
  const loadAthleteData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/athletes/${athleteId}`);
      const data = await response.json();

      if (data.success) {
        setAthlete(data.data.athlete);
        setEvents(data.data.events || []);
        calculateStatistics(data.data.events || []);
      } else {
        message.error(data.message || t('athlete:messages.noAthleteData'));
        navigate(`/tournaments/${tournamentId}/athletes`);
      }
    } catch (error) {
      console.error('Error loading athlete data:', error);
      message.error(t('athlete:messages.noAthleteData'));
      navigate(`/tournaments/${tournamentId}/athletes`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from events
  const calculateStatistics = (eventsList) => {
    const stats = {
      totalEvents: eventsList.length,
      goals: eventsList.filter(e => e.event_type === 'goal').length,
      fouls: eventsList.filter(e => e.event_type === 'foul').length,
      penalties: eventsList.filter(e => e.event_type === 'penalty').length,
      matchesPlayed: new Set(eventsList.map(e => e.match_id)).size
    };
    setStatistics(stats);
  };

  // Get position color
  const getPositionColor = (position) => {
    const colors = {
      attacker: 'red',
      defender: 'blue',
      substitute: 'green'
    };
    return colors[position] || 'default';
  };

  // Get position icon
  const getPositionIcon = (position) => {
    const icons = {
      attacker: '⚽',
      defender: '🛡️',
      substitute: '🔄'
    };
    return icons[position] || '👤';
  };

  // Get event type color
  const getEventTypeColor = (eventType) => {
    const colors = {
      goal: 'green',
      foul: 'orange',
      penalty: 'red',
      substitution: 'blue'
    };
    return colors[eventType] || 'default';
  };

  // Get event type icon
  const getEventTypeIcon = (eventType) => {
    const icons = {
      goal: <TrophyOutlined />,
      foul: <ExclamationCircleOutlined />,
      penalty: <FireOutlined />,
      substitution: <PlayCircleOutlined />
    };
    return icons[eventType] || <ClockCircleOutlined />;
  };

  // Events table columns
  const eventsColumns = [
    {
      title: t('match:match.number'),
      dataIndex: 'match_number',
      key: 'match_number',
      width: 100,
      render: (matchNumber) => (
        <Badge count={matchNumber} className="bg-blue-500" />
      )
    },
    {
      title: t('match:match.teams'),
      key: 'teams',
      render: (_, record) => (
        <div className="text-sm">
          <div className="font-medium text-gray-800">
            {record.team1_name} vs {record.team2_name}
          </div>
        </div>
      )
    },
    {
      title: t('athlete:events.type'),
      dataIndex: 'event_type',
      key: 'event_type',
      width: 120,
      render: (eventType) => (
        <Tag color={getEventTypeColor(eventType)} className="flex items-center gap-1 w-fit">
          {getEventTypeIcon(eventType)}
          <span>{t(`athlete:events.${eventType}`)}</span>
        </Tag>
      )
    },
    {
      title: t('athlete:events.time'),
      dataIndex: 'event_time',
      key: 'event_time',
      width: 100,
      render: (eventTime) => (
        <span className="text-gray-600">{eventTime}'</span>
      )
    },
    {
      title: t('match:match.date'),
      dataIndex: 'match_date',
      key: 'match_date',
      render: (matchDate) => (
        <span className="text-gray-600">
          {new Date(matchDate).toLocaleDateString()}
        </span>
      )
    }
  ];

  useEffect(() => {
    if (athleteId) {
      loadAthleteData();
    }
  }, [athleteId]);

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
        <Empty description={t('athlete:messages.noAthleteData')} />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Space className="items-center">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/athletes`)}
                className="hover:bg-gray-100 border-gray-300"
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
              className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600"
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
                icon={<UserOutlined />} 
                className="bg-blue-500 mb-4"
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
                    value={athlete.team_name ? (
                      athlete.team_name.includes('_') ? 
                        athlete.team_name.split('_').slice(0, -1).join('_') : 
                        athlete.team_name
                    ) : t('athlete:info.noTeam')}
                    valueStyle={{ 
                      color: '#7c3aed', 
                      fontSize: '16px', 
                      fontWeight: 'bold',
                      wordBreak: 'break-word'
                    }}
                  />
                  {athlete.group_name && (
                    <div className="mt-2">
                      <Tag color="blue">{athlete.group_name}</Tag>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={6}>
                <div className="text-center">
                  <Text className="text-gray-500 block">{t('athlete:athlete.status')}</Text>
                  <Tag 
                    color={athlete.is_active ? 'green' : 'red'} 
                    className="mt-1 text-base px-3 py-1"
                  >
                    {athlete.is_active ? t('athlete:status.active') : t('athlete:status.inactive')}
                  </Tag>
                </div>
              </Col>
              
              <Col span={6}>
                <div className="text-center">
                  <Text className="text-gray-500 block">{t('athlete:info.tournament')}</Text>
                  <Text className="font-medium text-gray-800 mt-1 block">
                    {athlete.tournament_name}
                  </Text>
                </div>
              </Col>
              
              <Col span={6}>
                <div className="text-center">
                  <Text className="text-gray-500 block">{t('athlete:statistics.matchesPlayed')}</Text>
                  <Text className="font-bold text-blue-600 text-xl mt-1 block">
                    {statistics.matchesPlayed}
                  </Text>
                </div>
              </Col>
              
              <Col span={6}>
                <div className="text-center">
                  <Text className="text-gray-500 block">{t('athlete:events.total')}</Text>
                  <Text className="font-bold text-purple-600 text-xl mt-1 block">
                    {statistics.totalEvents}
                  </Text>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0 bg-green-50 border-green-200">
            <Statistic
              title={
                <span className="text-green-700 font-medium flex items-center gap-2">
                  <TrophyOutlined />
                  {t('athlete:statistics.goals')}
                </span>
              }
              value={statistics.goals}
              valueStyle={{ color: '#059669', fontSize: '32px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0 bg-orange-50 border-orange-200">
            <Statistic
              title={
                <span className="text-orange-700 font-medium flex items-center gap-2">
                  <ExclamationCircleOutlined />
                  {t('athlete:statistics.fouls')}
                </span>
              }
              value={statistics.fouls}
              valueStyle={{ color: '#ea580c', fontSize: '32px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0 bg-red-50 border-red-200">
            <Statistic
              title={
                <span className="text-red-700 font-medium flex items-center gap-2">
                  <FireOutlined />
                  {t('athlete:statistics.penalties')}
                </span>
              }
              value={statistics.penalties}
              valueStyle={{ color: '#dc2626', fontSize: '32px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0 bg-blue-50 border-blue-200">
            <Statistic
              title={
                <span className="text-blue-700 font-medium flex items-center gap-2">
                  <PlayCircleOutlined />
                  {t('athlete:events.total')}
                </span>
              }
              value={statistics.totalEvents}
              valueStyle={{ color: '#2563eb', fontSize: '32px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Match Events */}
      <Card className="shadow-sm border-0">
        <div className="mb-4">
          <Title level={3} className="text-gray-700 flex items-center gap-2 mb-0">
            <CalendarOutlined className="text-gray-500" />
            {t('athlete:events.history')}
          </Title>
        </div>
        
        {events.length > 0 ? (
          <Table
            columns={eventsColumns}
            dataSource={events}
            rowKey="event_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} ${t('common:common.of')} ${total} ${t('athlete:events.title')}`,
            }}
            scroll={{ x: 800 }}
            className="overflow-hidden"
            rowClassName="hover:bg-gray-50 transition-colors duration-150"
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