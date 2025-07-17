import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  InputNumber, 
  message, 
  Alert,
  Divider,
  List,
  Tag,
  Modal,
  Select,
  Spin
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  TrophyOutlined,
  TeamOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Option } = Select;

const TournamentGroupEdit = () => {
  const navigate = useNavigate();
  const { id: tournamentId, groupId } = useParams();
  const [form] = Form.useForm();
  const { t } = useTranslation('group');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [removeTeamModalVisible, setRemoveTeamModalVisible] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState(null);
  const [addTeamModalVisible, setAddTeamModalVisible] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Clean team name display (remove _{tournament_id} suffix)
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // Check if it ends with _{tournamentId}, if so remove it
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  // Get tournament information
  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data.tournament || response.data.data);
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  // Get group detailed information
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/groups/${groupId}`);
      if (response.data.success) {
        const data = response.data.data;
        setGroup(data.group);
        setTeams(data.teams || []);
        setMatches(data.matches || []);
        
        // Check if editing is allowed
        const nonPendingMatches = (data.matches || []).filter(match => match.match_status !== 'pending');
        const canEditGroup = nonPendingMatches.length === 0;
        setCanEdit(canEditGroup);
        
        // Set form initial values
        const displayGroupName = data.group.group_name?.includes('_') 
          ? data.group.group_name.split('_')[0] 
          : data.group.group_name;
          
        form.setFieldsValue({
          group_name: displayGroupName,
          max_teams: data.group.max_teams,
          description: data.group.description || ''
        });
      } else {
        message.error(t('edit.messages.fetchGroupFailed'));
        navigate(`/tournaments/${tournamentId}/groups`);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      message.error(t('edit.messages.fetchGroupFailed'));
      navigate(`/tournaments/${tournamentId}/groups`);
    } finally {
      setLoading(false);
    }
  };

  // Get all teams in the tournament
  const fetchAllTeams = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams`);
      if (response.data.success) {
        setAllTeams(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tournament teams list:', error);
    }
  };

  useEffect(() => {
    if (tournamentId && groupId) {
      fetchTournament();
      fetchGroupData();
      fetchAllTeams();
    }
  }, [tournamentId, groupId]);

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      console.log('Updating group with values:', values);
      
      // Use tournament-specific update endpoint
      const response = await axios.put(`/api/tournaments/${tournamentId}/groups/${groupId}`, {
        group_name: `${values.group_name}_${tournamentId}`, // Internal: A_1, B_1, etc.
        max_teams: values.max_teams,
        description: values.description || `${t('tournament.tournament')} ${tournamentId} - ${t('group.group')} ${values.group_name}`
      });
      
      if (response && response.data.success) {
        message.success(t('edit.messages.updateSuccess', { groupName: values.group_name }));
        navigate(`/tournaments/${tournamentId}/groups/${groupId}`);
      } else {
        message.error(response?.data?.message || t('edit.messages.updateFailed'));
      }
    } catch (error) {
      console.error('Error updating group:', error);
      console.log('Error details:', error.response?.data);
      
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || '';
      
      if (status === 500) {
        message.error(t('edit.messages.serverError', { message: errorMessage }));
      } else if (status === 400) {
        message.error(t('edit.messages.updateFailed') + (errorMessage ? `: ${errorMessage}` : ''));
      } else if (status === 409) {
        message.error(t('edit.messages.nameConflict', { message: errorMessage }));
      } else {
        message.error(errorMessage || t('edit.messages.updateFailedRetry'));
      }
    } finally {
      setSaving(false);
    }
  };

  // Team management functions
  const handleRemoveTeam = async (teamId) => {
    try {
      await axios.delete(`/api/groups/${groupId}/teams/${teamId}`);
      message.success(t('edit.messages.teamRemovedSuccess'));
      await fetchGroupData();
      await fetchAllTeams();
      setRemoveTeamModalVisible(false);
      setTeamToRemove(null);
    } catch (error) {
      console.error('Remove team error:', error);
      const errorMessage = error.response?.data?.message || t('edit.messages.removeTeamFailed');
      message.error(errorMessage);
    }
  };

  const handleAddTeam = async (teamId) => {
    try {
      await axios.post(`/api/groups/${groupId}/teams`, {
        team_id: teamId
      });
      message.success(t('edit.messages.teamAddedSuccess'));
      await fetchGroupData();
      await fetchAllTeams();
      setAddTeamModalVisible(false);
    } catch (error) {
      console.error('Add team error:', error);
      const errorMessage = error.response?.data?.message || t('edit.messages.addTeamFailed');
      message.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/groups/${groupId}`);
  };

  // Get teams available for adding (teams not assigned to any group in tournament)
  const getAvailableTeams = () => {
    if (!Array.isArray(allTeams) || !Array.isArray(teams)) {
      return [];
    }
    // Only show teams not assigned to any group (group_id is null or undefined)
    return allTeams.filter(team => 
      !team.group_id || team.group_id === null || team.group_id === undefined
    );
  };

  // Get match status statistics
  const getMatchStatusStats = () => {
    if (!Array.isArray(matches)) {
      return { pending: 0, active: 0, completed: 0, total: 0 };
    }
    const pending = matches.filter(m => m.match_status === 'pending').length;
    const active = matches.filter(m => m.match_status === 'active').length;
    const completed = matches.filter(m => m.match_status === 'completed').length;
    return { pending, active, completed, total: matches.length };
  };

  if (loading) {
    return (
      <div className="text-center py-12 px-6">
        <Spin size="large" />
        <p>{t('edit.loading')}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <Alert
        message={t('edit.groupNotFound')}
        description={t('edit.groupNotFoundDescription')}
        type="error"
        showIcon
      />
    );
  }

  const displayGroupName = group?.group_name?.includes('_') 
    ? group.group_name.split('_')[0] 
    : group?.group_name;

  const availableTeams = getAvailableTeams();
  const matchStats = getMatchStatusStats();

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* Page Title */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCancel}
            >
              {t('edit.backButton')}
            </Button>
            <div>
              <h2 className="text-2xl font-bold m-0">
                <TrophyOutlined className="mr-2 text-yellow-500" />
                {t('edit.title', { groupName: displayGroupName })}
              </h2>
              <span className="text-gray-500">
                {tournament?.tournament_name || `${t('tournament.tournament')} ${tournamentId}`} - {t('edit.subtitle')}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Restriction Alert */}
        {!canEdit && (
          <Alert
            message={t('edit.cannotEdit')}
            description={
              <div>
                <p>{t('edit.cannotEditDescription')}</p>
                <p>{t('edit.matchStatusStats')}</p>
                <ul className="mb-0 pl-5">
                  <li>{t('edit.pending')}：{matchStats.pending} {t('edit.matches')}</li>
                  <li>{t('edit.active')}：{matchStats.active} {t('edit.matches')}</li>
                  <li>{t('edit.completed')}：{matchStats.completed} {t('edit.matches')}</li>
                  <li>{t('edit.total')}：{matchStats.total} {t('edit.matches')}</li>
                </ul>
                <p className="mt-2 mb-0">
                  <strong>{t('edit.editRestriction')}</strong>
                </p>
              </div>
            }
            type="warning"
            showIcon
            className="mb-6"
          />
        )}

        {/* Basic Information Edit */}
        <Card title={t('edit.basicInfo')} className="mb-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="max-w-xl"
            disabled={!canEdit}
          >
            <Form.Item
              label={t('group.name')}
              name="group_name"
              rules={[
                { required: true, message: t('placeholders.enterGroupName') },
                { pattern: /^[A-Z]$/, message: t('create.validation.namePattern') }
              ]}
            >
              <Input 
                placeholder={t('create.namePlaceholder')}
                size="large"
                maxLength={1}
                className="uppercase w-48"
              />
            </Form.Item>

            <Form.Item
              label={t('group.maxTeams')}
              name="max_teams"
              rules={[
                { required: true, message: t('create.validation.maxTeamsRequired') },
                { type: 'number', min: 2, max: 8, message: t('create.validation.maxTeamsRange') }
              ]}
            >
              <InputNumber 
                placeholder={t('create.maxTeamsPlaceholder')}
                size="large"
                min={2}
                max={8}
                className="w-48"
                addonAfter={t('create.teamsUnit')}
              />
            </Form.Item>

            <Form.Item
              label={t('group.description')}
              name="description"
            >
              <Input.TextArea 
                placeholder={t('placeholders.enterDescription')}
                rows={4}
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                  disabled={!canEdit}
                >
                  {t('edit.saveChanges')}
                </Button>
                <Button onClick={handleCancel}>
                  {canEdit ? t('edit.cancel') : t('edit.return')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Team Management */}
        <Card 
          title={
            <Space>
              <TeamOutlined />
              <span>{t('edit.teamManagement')}</span>
              <Tag color="blue">{teams.length}/{group.max_teams}</Tag>
            </Space>
          }
          extra={
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddTeamModalVisible(true)}
              disabled={!canEdit || teams.length >= group.max_teams}
            >
              {t('edit.addTeam')}
            </Button>
          }
        >
          {teams.length > 0 ? (
            <List
              dataSource={teams}
              renderItem={(team) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => navigate(`/teams/${team.team_id}`)}
                    >
                      {t('edit.viewDetails')}
                    </Button>,
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => navigate(`/teams/${team.team_id}/edit`)}
                    >
                      {t('edit.editTeam')}
                    </Button>,
                    <Button 
                      type="link" 
                      size="small"
                      danger
                      disabled={!canEdit}
                      onClick={() => {
                        setTeamToRemove(team);
                        setRemoveTeamModalVisible(true);
                      }}
                    >
                      {t('edit.remove')}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div 
                        className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.team_color }}
                      >
                        {getDisplayTeamName(team.team_name).charAt(0)}
                      </div>
                    }
                    title={
                      <Space>
                        <span className="font-bold">{getDisplayTeamName(team.team_name)}</span>
                        {team.is_virtual && <Tag color="orange">{t('edit.virtual')}</Tag>}
                      </Space>
                    }
                    description={`${t('edit.teamColor')}: ${team.team_color} | ${t('edit.createdAt')}: ${new Date(team.created_at).toLocaleDateString()}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div className="text-center py-10">
              <TeamOutlined className="text-5xl text-gray-300 mb-4" />
              <div>
                <span className="text-gray-500">{t('edit.noTeamsInGroup')}</span>
                <br />
                <Button 
                  type="primary" 
                  className="mt-4"
                  onClick={() => setAddTeamModalVisible(true)}
                  disabled={!canEdit}
                >
                  {t('edit.addFirstTeam')}
                </Button>
              </div>
            </div>
          )}

          {teams.length >= group.max_teams && canEdit && (
            <Alert
              message={t('edit.groupFull')}
              description={t('edit.groupFullDescription', { maxTeams: group.max_teams })}
              type="warning"
              showIcon
              className="mt-4"
            />
          )}

          {matchStats.total > 0 && (
            <Alert
              message={t('edit.matchStatus')}
              description={
                <div>
                  <p>{t('edit.matchStatusDescription', { total: matchStats.total })}</p>
                  <Space>
                    <Tag color="orange">{t('edit.pending')}：{matchStats.pending}</Tag>
                    <Tag color="green">{t('edit.active')}：{matchStats.active}</Tag>
                    <Tag color="blue">{t('edit.completed')}：{matchStats.completed}</Tag>
                  </Space>
                  {!canEdit && (
                    <p className="mt-2 mb-0 text-yellow-500">
                      <strong>⚠️ {t('edit.cannotEditTeams')}</strong>
                    </p>
                  )}
                </div>
              }
              type="info"
              showIcon
              className="mt-4"
            />
          )}
        </Card>

        {/* Remove Team Confirmation Modal */}
        <Modal
          title={t('edit.confirmRemoveTeam')}
          open={removeTeamModalVisible}
          onOk={() => handleRemoveTeam(teamToRemove?.team_id)}
          onCancel={() => {
            setRemoveTeamModalVisible(false);
            setTeamToRemove(null);
          }}
          okText={t('edit.confirmRemove')}
          cancelText={t('edit.cancel')}
          okType="danger"
        >
          <p>{t('edit.removeTeamDescription', { 
            teamName: getDisplayTeamName(teamToRemove?.team_name), 
            groupName: displayGroupName 
          })}</p>
          <p>{t('edit.removeTeamWarning')}</p>
        </Modal>

        {/* Add Team Modal */}
        <Modal
          title={t('edit.addTeamToGroup')}
          open={addTeamModalVisible}
          onCancel={() => setAddTeamModalVisible(false)}
          footer={
            <div className="flex justify-between items-center">
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddTeamModalVisible(false);
                  navigate(`/tournaments/${tournamentId}/teams/create`);
                }}
              >
                {t('edit.createNewTeam')}
              </Button>
              <Button onClick={() => setAddTeamModalVisible(false)}>
                {t('edit.close')}
              </Button>
            </div>
          }
          width={600}
        >
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span>{t('edit.selectTeamDescription', { groupName: displayGroupName })}</span>
              <Button 
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddTeamModalVisible(false);
                  navigate(`/tournaments/${tournamentId}/teams/create`);
                }}
              >
                {t('edit.createTeam')}
              </Button>
            </div>
            <span className="text-gray-500 text-xs">
              {t('edit.availableTeamsDescription', { count: availableTeams.length })}
            </span>
          </div>
          
          {availableTeams.length > 0 ? (
            <List
              dataSource={availableTeams}
              renderItem={(team) => (
                <List.Item
                  actions={[
                    <Button 
                      type="primary"
                      size="small"
                      onClick={() => handleAddTeam(team.team_id)}
                    >
                      {t('edit.addToGroup')}
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div 
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: team.team_color }}
                      >
                        {getDisplayTeamName(team.team_name).charAt(0)}
                      </div>
                    }
                    title={
                      <Space>
                        <span className="font-bold">{getDisplayTeamName(team.team_name)}</span>
                        {team.is_virtual && <Tag color="orange" size="small">{t('edit.virtual')}</Tag>}
                        <Tag color="green" size="small">{t('edit.available')}</Tag>
                      </Space>
                    }
                    description={`${t('edit.teamColor')}: ${team.team_color}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div className="text-center py-10">
              <TeamOutlined className="text-5xl text-gray-300 mb-4" />
              <div>
                <span className="text-gray-500">{t('detail.noAvailableTeams')}</span>
                <br />
                <span className="text-gray-500 text-xs">
                  {t('edit.noAvailableTeamsDescription')}
                </span>
                <br />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  className="mt-4"
                  onClick={() => {
                    setAddTeamModalVisible(false);
                    navigate(`/tournaments/${tournamentId}/teams/create`);
                  }}
                >
                  {t('edit.createNewTeam')}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Space>
    </div>
  );
};

export default TournamentGroupEdit;