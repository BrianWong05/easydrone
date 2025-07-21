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
  Alert
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Option } = Select;

const TournamentTeamCreate = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const { t } = useTranslation(['team', 'common']);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    fetchTournament();
    fetchGroups();
  }, [tournamentId]);

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

  // Clean group name display (remove _{tournament_id} suffix only)
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return '';
    // Check if it ends with _{tournamentId}, if so remove it
    const suffix = `_${tournamentId}`;
    if (groupName.endsWith(suffix)) {
      return groupName.slice(0, -suffix.length);
    }
    return groupName;
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
    setLoading(true);
    try {
      console.log('Creating team with values:', values);
      
      // 使用錦標賽專屬的創建端點
      const response = await axios.post(`/api/tournaments/${tournamentId}/teams`, {
        team_name: values.team_name, // Use team name as entered by user
        group_id: values.group_id || null,
        team_color: typeof values.team_color === 'string' ? values.team_color : values.team_color.toHexString(),
        is_virtual: values.is_virtual || false,
        description: values.description || ''
      });
      
      if (response && response.data.success) {
        message.success(t('team:messages.teamCreated'));
        navigate(`/tournaments/${tournamentId}/teams`);
      } else {
        message.error(response?.data?.message || t('common:messages.operationFailed'));
      }
    } catch (error) {
      console.error('Error creating team:', error);
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
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/teams`);
  };

  // 獲取所有錦標賽小組（創建時顯示所有小組，包括已滿的）
  const getAllTournamentGroups = () => {
    if (!Array.isArray(groups)) {
      console.log('⚠️ groups 不是數組:', groups);
      return [];
    }
    console.log('📋 可用的錦標賽小組:', groups);
    return groups;
  };

  const availableGroups = getAllTournamentGroups();

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
              {t('team:create.title')}
            </h2>
            <p className="text-gray-500 m-0">
              {t('team:create.subtitle', { 
                tournamentName: tournament?.tournament_name || `${t('tournament:tournament')} ${tournamentId}` 
              })}
            </p>
          </div>
        </div>

        <Card>
          <Alert
            message={t('team:create.createNotice')}
            description={t('team:create.createNoticeDescription')}
            type="info"
            showIcon
            className="mb-6"
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              team_color: '#1890ff',
              is_virtual: false
            }}
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
                  const displayName = getDisplayGroupName(group.group_name);
                  const teamCount = group.team_count || 0;
                  const maxTeams = group.max_teams || 4;
                  const isFull = teamCount >= maxTeams;
                  return (
                    <Option 
                      key={group.group_id} 
                      value={group.group_id}
                      disabled={isFull}
                    >
                      <div className="flex justify-between items-center">
                        <span>{t('team:team.group')} {displayName}</span>
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
              message={t('team:create.createTip')}
              description={t('team:create.createTipDescription', { 
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
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  {t('team:create.createTeam')}
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

export default TournamentTeamCreate;