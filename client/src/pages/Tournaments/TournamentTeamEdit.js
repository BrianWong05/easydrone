import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
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
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentTeamEdit = () => {
  const navigate = useNavigate();
  const { id: tournamentId, teamId } = useParams();
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
        message.error('獲取隊伍信息失敗');
        navigate(`/tournaments/${tournamentId}/teams`);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      message.error('獲取隊伍信息失敗');
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
        message.error('獲取錦標賽小組列表失敗');
      }
    } catch (error) {
      console.error('❌ 獲取錦標賽小組列表錯誤:', error);
      console.error('錯誤詳情:', error.response?.data);
      message.error('獲取錦標賽小組列表失敗，請檢查網絡連接');
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
        message.success(`隊伍 ${values.team_name} 更新成功！`);
        navigate(`/tournaments/${tournamentId}/teams`);
      } else {
        message.error(response?.data?.message || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      console.log('Error details:', error.response?.data);
      
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || '';
      
      if (status === 500) {
        message.error(`服務器錯誤：${errorMessage}`);
      } else if (status === 400) {
        message.error(`更新失敗：${errorMessage}`);
      } else if (status === 409) {
        message.error(`隊伍名稱衝突：${errorMessage}`);
      } else {
        message.error(errorMessage || '更新失敗，請重試');
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
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>載入中...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <Alert
        message="隊伍不存在"
        description="找不到指定的隊伍，請檢查URL是否正確"
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
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
          >
            返回
          </Button>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
              編輯隊伍 {displayTeamName}
            </Title>
            <Text type="secondary">
              {tournament?.tournament_name || `錦標賽 ${tournamentId}`} - 編輯隊伍信息
            </Text>
          </div>
        </div>

        <Card>
          <Alert
            message="編輯隊伍說明"
            description="修改隊伍信息時請注意：如果隊伍已有進行中或已完成的比賽，某些修改可能會被限制。隊伍名稱在同一錦標賽中必須唯一。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="隊伍名稱"
              name="team_name"
              rules={[
                { required: true, message: '請輸入隊伍名稱' },
                { min: 2, message: '隊伍名稱至少需要2個字符' },
                { max: 50, message: '隊伍名稱不能超過50個字符' }
              ]}
            >
              <Input 
                placeholder="請輸入隊伍名稱"
                size="large"
                maxLength={50}
              />
            </Form.Item>

            <Form.Item
              label="所屬小組"
              name="group_id"
              help="可選擇小組，或稍後在小組管理中分配"
            >
              <Select
                placeholder="請選擇小組"
                size="large"
                loading={groupsLoading}
                notFoundContent={groupsLoading ? "載入錦標賽小組中..." : "此錦標賽暫無可用小組"}
              >
                <Option value={null}>
                  <span style={{ color: '#999', fontStyle: 'italic' }}>
                    暫不分配小組
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          小組 {displayName} {isCurrent && <span style={{ color: '#1890ff' }}>(當前)</span>}
                        </span>
                        <span style={{ 
                          color: isFull ? '#ff4d4f' : '#52c41a',
                          fontSize: '12px'
                        }}>
                          {teamCount}/{maxTeams} {isFull ? '(已滿)' : ''}
                        </span>
                      </div>
                    </Option>
                  );
                }) : []}
              </Select>
            </Form.Item>

            <Form.Item
              label="隊伍顏色"
              name="team_color"
              rules={[{ required: true, message: '請選擇隊伍顏色' }]}
            >
              <ColorPicker 
                size="large"
                showText
                format="hex"
                presets={[
                  {
                    label: '推薦顏色',
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
              label="隊伍類型"
              name="is_virtual"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="虛擬隊伍" 
                unCheckedChildren="真實隊伍"
              />
            </Form.Item>

            <Form.Item
              label="隊伍描述"
              name="description"
            >
              <Input.TextArea 
                placeholder="請輸入隊伍描述（可選）"
                rows={4}
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Alert
              message="更新提示"
              description={`更新隊伍信息後，相關的運動員和比賽記錄將保持不變。此隊伍專屬於錦標賽「${tournament?.tournament_name || `ID: ${tournamentId}`}」。`}
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
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
                  保存更改
                </Button>
                <Button 
                  onClick={handleCancel}
                  size="large"
                >
                  取消
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