import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  message, 
  Row, 
  Col, 
  Space,
  Divider,
  Avatar,
  Tag,
  Table,
  Statistic,
  Descriptions,
  Spin
} from 'antd';
import { 
  UserOutlined, 
  ArrowLeftOutlined,
  GlobalOutlined,
  EditOutlined,
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  NumberOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const GlobalAthleteDetail = () => {
  const { t } = useTranslation(['athlete', 'common']);
  const { id: athleteId } = useParams();
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalTournaments: 0,
    totalTeams: 0,
    activeParticipations: 0,
    positions: {}
  });

  // Load athlete data
  const loadAthleteData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/global-athletes/${athleteId}`);
      const data = await response.json();

      if (data.success) {
        setAthlete(data.data.athlete);
        setParticipations(data.data.participations);
        calculateStatistics(data.data.participations);
      } else {
        message.error(data.message || t('athlete:messages.loadingAthletes'));
        navigate('/global-athletes');
      }
    } catch (error) {
      console.error('Error loading athlete data:', error);
      message.error(t('athlete:messages.loadingAthletes'));
      navigate('/global-athletes');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStatistics = (participationsList) => {
    const uniqueTournaments = new Set(participationsList.map(p => p.tournament_id));
    const uniqueTeams = new Set(participationsList.filter(p => p.team_id).map(p => p.team_id));
    const activeParticipations = participationsList.filter(p => p.is_active);
    
    const positions = {};
    participationsList.forEach(p => {
      positions[p.position] = (positions[p.position] || 0) + 1;
    });

    setStatistics({
      totalTournaments: uniqueTournaments.size,
      totalTeams: uniqueTeams.size,
      activeParticipations: activeParticipations.length,
      positions
    });
  };

  // Position color mapping
  const getPositionColor = (position) => {
    const colors = {
      attacker: 'red',
      defender: 'blue',
      substitute: 'green'
    };
    return colors[position] || 'default';
  };

  // Clean team/group names
  const cleanName = (name) => {
    if (!name || !name.includes('_')) return name;
    const parts = name.split('_');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      return parts.slice(0, -1).join('_');
    }
    return name;
  };

  // Tournament participations table columns
  const columns = [
    {
      title: t('athlete:athlete.tournament'),
      dataIndex: 'tournament_name',
      key: 'tournament_name',
      render: (name, record) => (
        <Space>
          <TrophyOutlined className="text-yellow-500" />
          <span className="font-medium">{name}</span>
        </Space>
      )
    },
    {
      title: t('athlete:athlete.team'),
      dataIndex: 'team_name',
      key: 'team_name',
      render: (teamName, record) => {
        if (!teamName) {
          return <Tag color="gray">{t('athlete:info.noTeam')}</Tag>;
        }
        return (
          <Space>
            <TeamOutlined style={{ color: record.team_color }} />
            <span>{cleanName(teamName)}</span>
            {record.group_name && (
              <Tag color="blue">{cleanName(record.group_name)}</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: t('athlete:athlete.number'),
      dataIndex: 'jersey_number',
      key: 'jersey_number',
      width: 100,
      render: (number) => number ? (
        <Tag color="blue" icon={<NumberOutlined />}>{number}</Tag>
      ) : '-'
    },
    {
      title: t('athlete:athlete.position'),
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (position) => (
        <Tag color={getPositionColor(position)}>
          {t(`athlete:positions.${position}`)}
        </Tag>
      )
    },
    {
      title: t('athlete:athlete.status'),
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? t('athlete:status.active') : t('athlete:status.inactive')}
        </Tag>
      )
    },
    {
      title: t('athlete:athlete.joinDate'),
      dataIndex: 'joined_at',
      key: 'joined_at',
      width: 120,
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
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
    return null;
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
                onClick={() => navigate('/global-athletes')}
                className="hover:bg-gray-50"
              >
                {t('athlete:actions.back')}
              </Button>
              <Divider type="vertical" />
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-0">
                <GlobalOutlined className="text-green-500" />
                {t('athlete:athlete.detail')}
              </h2>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/global-athletes/${athleteId}/edit`)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {t('athlete:actions.edit')}
            </Button>
          </Col>
        </Row>
      </div>

      {/* Athlete Profile */}
      <Card className="mb-6 shadow-sm border-0">
        <Row gutter={24}>
          <Col span={6}>
            <div className="text-center">
              <Avatar
                size={120}
                src={athlete.avatar_url}
                icon={!athlete.avatar_url && <UserOutlined />}
                className="border-4 border-gray-200 shadow-lg mb-4"
              />
              <h3 className="text-xl font-bold text-gray-800 mb-2">{athlete.name}</h3>
              <Tag color="blue" className="text-sm">
                {t('athlete:athlete.age')}: {athlete.age} {t('athlete:info.years')}
              </Tag>
            </div>
          </Col>
          <Col span={18}>
            <Descriptions
              title={t('athlete:athlete.profile')}
              bordered
              column={2}
              size="middle"
            >
              <Descriptions.Item label={t('athlete:athlete.name')}>
                {athlete.name}
              </Descriptions.Item>
              <Descriptions.Item label={t('athlete:athlete.age')}>
                {athlete.age} {t('athlete:info.years')}
              </Descriptions.Item>
              <Descriptions.Item label={t('athlete:global.totalTournaments')}>
                {statistics.totalTournaments}
              </Descriptions.Item>
              <Descriptions.Item label={t('athlete:global.totalTeams')}>
                {statistics.totalTeams}
              </Descriptions.Item>
              <Descriptions.Item label={t('athlete:global.activeParticipations')}>
                {statistics.activeParticipations}
              </Descriptions.Item>
              <Descriptions.Item label={t('athlete:athlete.created')}>
                {new Date(athlete.created_at).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* Statistics Cards */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.totalTournaments')}</span>}
              value={statistics.totalTournaments}
              prefix={<TrophyOutlined className="text-yellow-500" />}
              valueStyle={{ color: '#1f2937', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.totalTeams')}</span>}
              value={statistics.totalTeams}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#2563eb', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.activeParticipations')}</span>}
              value={statistics.activeParticipations}
              prefix={<UserOutlined className="text-green-500" />}
              valueStyle={{ color: '#059669', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border-0">
            <Statistic
              title={<span className="text-gray-600 font-medium">{t('athlete:global.totalParticipations')}</span>}
              value={participations.length}
              prefix={<CalendarOutlined className="text-purple-500" />}
              valueStyle={{ color: '#7c3aed', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Position Distribution */}
      {Object.keys(statistics.positions).length > 0 && (
        <Card className="mb-6 shadow-sm border-0">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            {t('athlete:global.positionDistribution')}
          </h3>
          <Row gutter={16}>
            {Object.entries(statistics.positions).map(([position, count]) => (
              <Col span={8} key={position}>
                <Card className="text-center bg-gray-50">
                  <Statistic
                    title={t(`athlete:positions.${position}`)}
                    value={count}
                    valueStyle={{ color: getPositionColor(position) === 'red' ? '#dc2626' : getPositionColor(position) === 'blue' ? '#2563eb' : '#059669' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Tournament Participations */}
      <Card className="shadow-sm border-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-0">
            <TrophyOutlined className="text-yellow-500" />
            {t('athlete:global.tournamentParticipations')}
          </h3>
        </div>
        
        {participations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrophyOutlined className="text-4xl mb-4 text-gray-300" />
            <p>{t('athlete:global.noParticipations')}</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={participations}
            rowKey="participation_id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} ${t('common:common.of')} ${total} ${t('athlete:global.participations')}`,
            }}
            scroll={{ x: 800 }}
            className="overflow-hidden"
            rowClassName="hover:bg-gray-50 transition-colors duration-150"
          />
        )}
      </Card>
    </div>
  );
};

export default GlobalAthleteDetail;