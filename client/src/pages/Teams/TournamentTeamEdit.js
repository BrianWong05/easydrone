import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Space, 
  ColorPicker, 
  message, 
  Switch,
  Alert,
  Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Option } = Select;

const TournamentTeamEdit = () => {
  const navigate = useNavigate();
  const { id: tournamentId, teamId } = useParams();
  const { t } = useTranslation(['team', 'common']);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    if (tournamentId && teamId) {
      fetchTournament();
      fetchTeam();
      fetchGroups();
    }
  }, [tournamentId, teamId]);

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

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/teams/${teamId}`);
      if (response.data.success) {
        const teamData = response.data.data.team;
        setTeam(teamData);
        
        // 設置表單初始值
        const displayTeamName = teamData.team_name?.includes('_') 
          ? teamData.team_name.split('_')[0] 
          : teamData.team_name;
          
        form.setFieldsValue({
          team_name: displayTeamName,
          group_id: teamData.group_id,
          team_color: teamData.team_color,
          is_virtual: teamData.is_virtual,
          description: teamData.description || ''
        });
      } else {
        message.error(t('common:messages.loadFailed'));
        navigate(`/tournaments/${tournamentId}/teams`);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      message.error(t('common:messages.loadFailed'));
      navigate(`/tournaments/${tournamentId}/teams`);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      console.log(`🔍 正在獲取錦標賽 ${tournamentId} 的小組列表...`);
      const response = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      
      if (response.data.success) {
        const groupsData = response.data.data?.groups || response.data.data || [];
        setGroups(groupsData);
        console.log('📋 獲取到的錦標賽小組選項:', groupsData);
        console.log(`✅ 成功載入 ${groupsData.length} 個小組`);
        
        // 額外調試信息
        if (groupsData.length === 0) {
          console.log('⚠️ 沒有找到小組，請檢查錦標賽是否有小組');
        } else {
          groupsData.forEach((group, index) => {
            console.log(`📋 小組 ${index + 1}:`, {
              id: group.group_id,
              name: group.group_name,
              maxTeams: group.max_teams,
              teamCount: group.team_count
            });
          });
        }
      } else {
        console.error('❌ 獲取小組列表失敗:', response.data.message);
        message.error(t('common:messages.loadFailed'));
      }
    } catch (error) {
      console.error('❌ 獲取錦標賽小組列表錯誤:', error);
      console.error('錯誤詳情:', error.response?.data);
      message.error(t('common:messages.networkError'));
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      console.log('Updating team with values:', values);
      
      // 使用錦標賽專屬的更新端點
      const response = await axios.put(`/api/tournaments/${tournamentId}/teams/${teamId}`, {
        team_name: `${values.team_name}_${tournamentId}`, // Internal: 隊伍名_1, 隊伍名_2, etc.
        group_id: values.group_id || null,
        team_color: typeof values.team_color === 'string' ? values.team_color : values.team_color.toHexString(),
        is_virtual: values.is_virtual || false,
        description: values.description || ''
      });
      
      if (response && response.data.success) {
        message.success(t('team:messages.teamUpdated'));
        navigate(`/tournaments/${tournamentId}/teams`);
      } else {
        message.error(response?.data?.message || t('common:messages.operationFailed'));
      }
    } catch (error) {
      console.error('Error updating team:', error);
      console.log('Error details:', error.response?.data);
      
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || '';
      
      if (status === 500) {
        message.error(`${t('common:messages.error')}: ${errorMessage}`);
      } else if (status === 400) {
        message.error(`${t('common:messages.operationFailed')}: ${errorMessage}`);
      } else if (status === 409) {
        message.error(`${t('team:messages.nameConflict')}: ${errorMessage}`);
      } else {
        message.error(errorMessage || t('common:messages.operationFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/teams`);
  };

  // 獲取可用的小組（未滿的小組，或當前隊伍所在的小組）
  const getAvailableGroups = () => {
    if (!Array.isArray(groups)) {
      return [];
    }
    return groups.filter(group => {
      const teamCount = group.team_count || 0;
      const maxTeams = group.max_teams || 4;
      // 如果是當前隊伍所在的小組，總是可選
      if (group.group_id === team?.group_id) {
        return true;
      }
      // 否則只有未滿的小組可選
      return teamCount < maxTeams;
    });
  };

  if (loading) {
    return (
      <div className="text-center p-12">
        <Spin size="large" />
        <p>{t('common:messages.loading')}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <Alert
        message={t('team:edit.teamNotFound')}
        description={t('team:edit.teamNotFoundDescription')}
        type="error"
        showIcon
      />
    );
  }

  const displayTeamName = team?.team_name?.includes('_') 
    ? team.team_name.split('_')[0] 
    : team?.team_name;

  const availableGroups = getAvailableGroups();

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        <div className="flex items-center gap-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
          >
            {t('common:buttons.back')}
          </Button>
          <div>
            <h2 className="text-2xl font-bold m-0">
              <TrophyOutlined className="mr-2 text-yellow-500" />
              {t('team:edit.title')} {displayTeamName}
            </h2>
            <p className="text-gray-500 m-0">
              {tournament?.tournament_name || `${t('tournament:tournament')} ${tournamentId}`} - {t('team:edit.subtitle')}
            </p>
          </div>
        </div>

        <Card>
          <Alert
            message={t('team:edit.editNotice')}
            description={t('team:edit.editNoticeDescription')}
            type="info"
            showIcon
            className="mb-6"
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label={t('team:team.name')}
              name="team_name"
              rules={[
                { required: true, message: t('team:placeholders.enterTeamName') },
                { min: 2, message: t('team:edit.validation.nameMinLength') },
                { max: 50, message: t('team:edit.validation.nameMaxLength') }
              ]}
            >
              <Input 
                placeholder={t('team:placeholders.enterTeamName')}
                size="large"
                maxLength={50}
              />
            </Form.Item>

            <Form.Item
              label={t('team:team.group')}
              name="group_id"
              help={t('team:edit.groupHelp')}
            >
              <Select
                placeholder={t('team:edit.selectGroup')}
                size="large"
                loading={groupsLoading}
                notFoundContent={groupsLoading ? t('team:edit.loadingGroups') : t('team:edit.noGroupsAvailable')}
              >
                <Option value={null}>
                  <span className="text-gray-400 italic">
                    {t('team:edit.noGroupAssignment')}
                  </span>
                </Option>
                {Array.isArray(availableGroups) ? availableGroups.map(group => {
                  const displayName = group.group_name?.includes('_') ? group.group_name.split('_')[0] : group.group_name;
                  const teamCount = group.team_count || 0;
                  const maxTeams = group.max_teams || 4;
                  const isCurrent = group.group_id === team?.group_id;
                  const isFull = teamCount >= maxTeams && !isCurrent;
                  return (
                    <Option 
                      key={group.group_id} 
                      value={group.group_id}
                      disabled={isFull}
                    >
                      <div className="flex justify-between items-center">
                        <span>
                          {t('team:team.group')} {displayName} {isCurrent && <span className="text-blue-500">({t('team:edit.current')})</span>}
                        </span>
                        <span className={`text-xs ${isFull ? 'text-red-500' : 'text-green-500'}`}>
                          {teamCount}/{maxTeams} {isFull ? `(${t('team:edit.full')})` : ''}
                        </span>
                      </div>
                    </Option>
                  );
                }) : []}
              </Select>
            </Form.Item>

            <Form.Item
              label={t('team:labels.teamColor')}
              name="team_color"
              rules={[{ required: true, message: t('team:edit.validation.colorRequired') }]}
            >
              <ColorPicker 
                size="large"
                showText
                format="hex"
                presets={[
                  {
                    label: t('team:edit.recommendedColors'),
                    colors: [
                      '#FF0000', '#0000FF', '#00FF00', '#FFFF00',
                      '#FF00FF', '#00FFFF', '#FFA500', '#800080',
                      '#1890ff', '#52c41a', '#faad14', '#f5222d'
                    ],
                  },
                ]}
              />
            </Form.Item>

            <Form.Item
              label={t('team:edit.teamType')}
              name="is_virtual"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren={t('team:list.teamType.virtual')} 
                unCheckedChildren={t('team:list.teamType.real')}
              />
            </Form.Item>

            <Form.Item
              label={t('team:team.description')}
              name="description"
            >
              <Input.TextArea 
                placeholder={t('team:placeholders.enterDescription')}
                rows={4}
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Alert
              message={t('team:edit.updateNotice')}
              description={t('team:edit.updateNoticeDescription', { 
                tournamentName: tournament?.tournament_name || `ID: ${tournamentId}` 
              })}
              type="success"
              showIcon
              className="mb-6"
            />

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={saving}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  {t('team:edit.saveChanges')}
                </Button>
                <Button 
                  onClick={handleCancel}
                  size="large"
                >
                  {t('common:buttons.cancel')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
};

export default TournamentTeamEdit;