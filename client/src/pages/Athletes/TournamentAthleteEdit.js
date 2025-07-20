import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Row, 
  Col, 
  message, 
  Spin, 
  Space, 
  Typography, 
  Divider,
  Alert,
  Tag,
  Statistic
} from 'antd';
import { 
  UserOutlined, 
  SaveOutlined, 
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  NumberOutlined,
  UserSwitchOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentAthleteEdit = () => {
  const { t } = useTranslation(['athlete', 'common', 'team']);
  const { id: tournamentId, athleteId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [athlete, setAthlete] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamComposition, setTeamComposition] = useState({
    attacker: 0,
    defender: 0,
    substitute: 0,
    total: 0
  });

  // Load athlete data
  const loadAthleteData = async () => {
    try {
      const response = await fetch(`/api/athletes/${athleteId}`);
      const data = await response.json();

      if (data.success) {
        const athleteData = data.data.athlete;
        setAthlete(athleteData);
        setSelectedTeam(athleteData.team_id);
        
        // Set form values
        form.setFieldsValue({
          name: athleteData.name,
          jersey_number: athleteData.jersey_number,
          position: athleteData.position,
          age: athleteData.age,
          team_id: athleteData.team_id,
          is_active: Boolean(athleteData.is_active)
        });
        
        // Load team composition if athlete has a team
        if (athleteData.team_id) {
          await loadTeamComposition(athleteData.team_id);
        }
      } else {
        message.error(data.message || t('athlete:messages.noAthleteData'));
        navigate(`/tournaments/${tournamentId}/athletes`);
      }
    } catch (error) {
      console.error('Error loading athlete data:', error);
      message.error(t('athlete:messages.noAthleteData'));
      navigate(`/tournaments/${tournamentId}/athletes`);
    }
  };

  // Load teams for dropdown
  const loadTeams = async () => {
    try {
      console.log('Loading teams for tournament:', tournamentId);
      
      let response = await fetch(`/api/tournaments/${tournamentId}/teams`);
      let data = await response.json();
      
      if (!data.success) {
        response = await fetch(`/api/teams?tournament_id=${tournamentId}`);
        data = await response.json();
      }
      
      if (data.success) {
        const teamsData = data.data?.teams || data.data || data.teams || [];
        
        const cleanedTeams = teamsData.map(team => {
          let displayName = team.team_name;
          if (displayName && displayName.includes('_')) {
            const parts = displayName.split('_');
            const lastPart = parts[parts.length - 1];
            if (/^\d+$/.test(lastPart)) {
              displayName = parts.slice(0, -1).join('_');
            }
          }
          return {
            ...team,
            display_name: displayName
          };
        });
        
        setTeams(cleanedTeams);
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    }
  };

  // Load team composition
  const loadTeamComposition = async (teamId) => {
    if (!teamId) {
      setTeamComposition({ attacker: 0, defender: 0, substitute: 0, total: 0 });
      return;
    }

    try {
      const response = await fetch(`/api/athletes?tournament_id=${tournamentId}&team_id=${teamId}&is_active=true`);
      const data = await response.json();
      
      if (data.success) {
        const athletes = data.data.athletes || [];
        // Exclude current athlete from composition count
        const otherAthletes = athletes.filter(a => a.athlete_id !== parseInt(athleteId));
        
        const composition = {
          attacker: otherAthletes.filter(a => a.position === 'attacker').length,
          defender: otherAthletes.filter(a => a.position === 'defender').length,
          substitute: otherAthletes.filter(a => a.position === 'substitute').length,
          total: otherAthletes.length
        };
        
        setTeamComposition(composition);
      }
    } catch (error) {
      console.error('Error loading team composition:', error);
      setTeamComposition({ attacker: 0, defender: 0, substitute: 0, total: 0 });
    }
  };

  // Handle team selection change
  const handleTeamChange = (teamId) => {
    setSelectedTeam(teamId);
    loadTeamComposition(teamId);
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      const submitData = {
        tournament_id: parseInt(tournamentId),
        name: values.name.trim(),
        jersey_number: parseInt(values.jersey_number),
        position: values.position,
        age: parseInt(values.age),
        is_active: Boolean(values.is_active)
      };

      // Only include team_id if a team is actually selected
      if (values.team_id && values.team_id !== null && values.team_id !== undefined) {
        submitData.team_id = values.team_id;
      }

      console.log('Submitting athlete update:', submitData);

      const response = await fetch(`/api/athletes/${athleteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      const data = await response.json();
      console.log('Update response:', data);

      if (data.success) {
        message.success(t('athlete:messages.athleteUpdated'));
        navigate(`/tournaments/${tournamentId}/athletes/${athleteId}`);
      } else {
        message.error(data.message || t('athlete:messages.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating athlete:', error);
      message.error(t('athlete:messages.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Get position validation rules
  const getPositionValidationMessage = (position) => {
    if (!selectedTeam || !position) return null;
    
    const currentCount = teamComposition[position] || 0;
    
    if (position === 'attacker' && currentCount >= 1) {
      return {
        type: 'error',
        message: t('athlete:validation.attackerLimit')
      };
    }
    
    if (position === 'defender' && currentCount >= 5) {
      return {
        type: 'error',
        message: t('athlete:validation.defenderLimit')
      };
    }
    
    return null;
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([loadTeams(), loadAthleteData()]);
      setLoading(false);
    };
    
    initializeData();
  }, [tournamentId, athleteId]);

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
        <Alert
          message={t('athlete:messages.noAthleteData')}
          type="error"
          showIcon
        />
      </div>
    );
  }

  const selectedPosition = form.getFieldValue('position');
  const positionValidation = getPositionValidationMessage(selectedPosition);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Space className="items-center">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${athleteId}`)}
                className="hover:bg-gray-100 border-gray-300"
              >
                {t('common:buttons.back')}
              </Button>
              <Title level={2} className="mb-0 text-gray-800">
                <EditOutlined className="mr-2 text-blue-500" />
                {t('athlete:athlete.edit')}
              </Title>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={24}>
        {/* Main Form */}
        <Col span={16}>
          <Card className="shadow-sm border-0">
            <div className="mb-6">
              <Title level={3} className="text-gray-700 mb-2">
                {t('athlete:form.basicInfo')}
              </Title>
              <Text className="text-gray-500">
                {t('athlete:form.editDescription')}
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              className="space-y-4"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label={
                      <span className="text-gray-700 font-medium">
                        {t('athlete:athlete.name')}
                      </span>
                    }
                    rules={[
                      { required: true, message: t('athlete:validation.nameRequired') },
                      { min: 2, message: t('athlete:validation.nameMinLength') },
                      { max: 100, message: t('athlete:validation.nameMaxLength') }
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined className="text-gray-400" />}
                      placeholder={t('athlete:placeholders.enterAthleteName')}
                      className="h-10"
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="jersey_number"
                    label={
                      <span className="text-gray-700 font-medium">
                        {t('athlete:athlete.number')}
                      </span>
                    }
                    rules={[
                      { required: true, message: t('athlete:validation.numberRequired') },
                      { 
                        type: 'number', 
                        min: 1, 
                        max: 99, 
                        message: t('athlete:validation.numberRange'),
                        transform: (value) => Number(value)
                      }
                    ]}
                  >
                    <Input
                      type="number"
                      prefix={<NumberOutlined className="text-gray-400" />}
                      placeholder={t('athlete:placeholders.enterNumber')}
                      className="h-10"
                      min={1}
                      max={99}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="position"
                    label={
                      <span className="text-gray-700 font-medium">
                        {t('athlete:athlete.position')}
                      </span>
                    }
                    rules={[
                      { required: true, message: t('athlete:validation.positionRequired') }
                    ]}
                  >
                    <Select
                      placeholder={t('athlete:placeholders.selectPosition')}
                      className="h-10"
                      onChange={(value) => form.setFieldsValue({ position: value })}
                    >
                      <Option value="attacker">
                        <Space>
                          <span>⚽</span>
                          {t('athlete:positions.attacker')}
                        </Space>
                      </Option>
                      <Option value="defender">
                        <Space>
                          <span>🛡️</span>
                          {t('athlete:positions.defender')}
                        </Space>
                      </Option>
                      <Option value="substitute">
                        <Space>
                          <span>🔄</span>
                          {t('athlete:positions.substitute')}
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="age"
                    label={
                      <span className="text-gray-700 font-medium">
                        {t('athlete:athlete.age')}
                      </span>
                    }
                    rules={[
                      { required: true, message: t('athlete:validation.ageRequired') },
                      { 
                        type: 'number', 
                        min: 16, 
                        max: 50, 
                        message: t('athlete:validation.ageRange'),
                        transform: (value) => Number(value)
                      }
                    ]}
                  >
                    <Input
                      type="number"
                      prefix={<UserSwitchOutlined className="text-gray-400" />}
                      placeholder={t('athlete:placeholders.enterAge')}
                      className="h-10"
                      min={16}
                      max={50}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="team_id"
                label={
                  <span className="text-gray-700 font-medium">
                    {t('athlete:athlete.team')} 
                    <span className="text-gray-400 font-normal ml-1">
                      ({t('athlete:form.optional')})
                    </span>
                  </span>
                }
              >
                <Select
                  placeholder={t('athlete:placeholders.selectTeam')}
                  className="h-10"
                  allowClear
                  onChange={handleTeamChange}
                >
                  {teams.map(team => (
                    <Option key={team.team_id} value={team.team_id}>
                      <Space>
                        <TeamOutlined style={{ color: team.team_color }} />
                        {team.display_name || team.team_name}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="is_active"
                label={
                  <span className="text-gray-700 font-medium">
                    {t('athlete:athlete.status')}
                  </span>
                }
                initialValue={true}
              >
                <Select className="h-10">
                  <Option value={true}>
                    <Tag color="green">{t('athlete:status.active')}</Tag>
                  </Option>
                  <Option value={false}>
                    <Tag color="red">{t('athlete:status.inactive')}</Tag>
                  </Option>
                </Select>
              </Form.Item>

              {/* Position Validation Alert */}
              {positionValidation && (
                <Alert
                  message={positionValidation.message}
                  type={positionValidation.type}
                  showIcon
                  className="mb-4"
                />
              )}

              <Divider />

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${athleteId}`)}
                  className="hover:bg-gray-50 border-gray-300"
                >
                  {t('common:buttons.cancel')}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  icon={<SaveOutlined />}
                  className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600"
                  disabled={positionValidation?.type === 'error'}
                >
                  {t('athlete:buttons.update')}
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Team Composition Sidebar */}
        <Col span={8}>
          <Card className="shadow-sm border-0 mb-4">
            <div className="mb-4">
              <Title level={4} className="text-gray-700 mb-2">
                {t('athlete:form.currentInfo')}
              </Title>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Text className="text-gray-600">{t('athlete:athlete.name')}:</Text>
                <Text className="font-medium">{athlete.name}</Text>
              </div>
              <div className="flex justify-between items-center">
                <Text className="text-gray-600">{t('athlete:athlete.number')}:</Text>
                <Tag color="blue">#{athlete.jersey_number}</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text className="text-gray-600">{t('athlete:athlete.position')}:</Text>
                <Tag color="green">{t(`athlete:positions.${athlete.position}`)}</Tag>
              </div>
              <div className="flex justify-between items-center">
                <Text className="text-gray-600">{t('athlete:athlete.age')}:</Text>
                <Text className="font-medium">{athlete.age} {t('athlete:info.years')}</Text>
              </div>
            </div>
          </Card>

          {selectedTeam ? (
            <Card className="shadow-sm border-0">
              <div className="mb-4">
                <Title level={4} className="text-gray-700 mb-2">
                  <TeamOutlined className="mr-2" />
                  {t('athlete:form.teamComposition')}
                </Title>
                <Text className="text-gray-500 text-sm">
                  {t('athlete:form.currentTeamComposition')}
                </Text>
              </div>

              <div className="space-y-4">
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title={
                        <span className="text-red-600 text-sm">
                          ⚽ {t('athlete:positions.attacker')}
                        </span>
                      }
                      value={teamComposition.attacker}
                      suffix="/ 1"
                      valueStyle={{ 
                        color: teamComposition.attacker >= 1 ? '#dc2626' : '#059669',
                        fontSize: '18px'
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={
                        <span className="text-blue-600 text-sm">
                          🛡️ {t('athlete:positions.defender')}
                        </span>
                      }
                      value={teamComposition.defender}
                      suffix="/ 5"
                      valueStyle={{ 
                        color: teamComposition.defender >= 5 ? '#dc2626' : '#059669',
                        fontSize: '18px'
                      }}
                    />
                  </Col>
                </Row>

                <Statistic
                  title={
                    <span className="text-green-600 text-sm">
                      🔄 {t('athlete:positions.substitute')}
                    </span>
                  }
                  value={teamComposition.substitute}
                  suffix={t('athlete:form.unlimited')}
                  valueStyle={{ color: '#059669', fontSize: '18px' }}
                />

                <Divider className="my-3" />

                <Statistic
                  title={
                    <span className="text-gray-700 font-medium">
                      <TrophyOutlined className="mr-1" />
                      {t('athlete:form.totalAthletes')}
                    </span>
                  }
                  value={teamComposition.total}
                  valueStyle={{ color: '#374151', fontSize: '20px', fontWeight: 'bold' }}
                />
              </div>

              <Divider />

              <Alert
                message={t('athlete:form.teamRules')}
                description={
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• {t('athlete:form.rule1')}</li>
                    <li>• {t('athlete:form.rule2')}</li>
                    <li>• {t('athlete:form.rule3')}</li>
                    <li>• {t('athlete:form.rule4')}</li>
                  </ul>
                }
                type="info"
                showIcon
                className="mt-4"
              />
            </Card>
          ) : (
            <Card className="shadow-sm border-0">
              <div className="text-center py-8">
                <TeamOutlined className="text-4xl text-gray-300 mb-3" />
                <Title level={4} className="text-gray-500 mb-2">
                  {t('athlete:form.noTeamSelected')}
                </Title>
                <Text className="text-gray-400 text-sm">
                  {t('athlete:form.noTeamDescription')}
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TournamentAthleteEdit;