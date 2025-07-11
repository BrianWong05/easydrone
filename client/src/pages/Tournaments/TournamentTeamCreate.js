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
  Alert
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentTeamCreate = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
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
    setLoading(true);
    try {
      console.log('Creating team with values:', values);
      
      // 使用錦標賽專屬的創建端點
      const response = await axios.post(`/api/tournaments/${tournamentId}/teams`, {
        team_name: `${values.team_name}_${tournamentId}`, // Internal: 隊伍名_1, 隊伍名_2, etc.
        group_id: values.group_id || null,
        team_color: typeof values.team_color === 'string' ? values.team_color : values.team_color.toHexString(),
        is_virtual: values.is_virtual || false,
        description: values.description || ''
      });
      
      if (response && response.data.success) {
        message.success(`隊伍 ${values.team_name} 創建成功！`);
        navigate(`/tournaments/${tournamentId}/teams`);
      } else {
        message.error(response?.data?.message || '創建失敗');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      console.log('Error details:', error.response?.data);
      
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || '';
      
      if (status === 500) {
        message.error(`服務器錯誤：${errorMessage}`);
      } else if (status === 400) {
        message.error(`創建失敗：${errorMessage}`);
      } else if (status === 409) {
        message.error(`隊伍名稱衝突：${errorMessage}`);
      } else {
        message.error(errorMessage || '創建失敗，請重試');
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
              新增隊伍
            </Title>
            <Text type="secondary">
              為 {tournament?.tournament_name || `錦標賽 ${tournamentId}`} 創建新的參賽隊伍
            </Text>
          </div>
        </div>

        <Card>
          <Alert
            message="隊伍創建說明"
            description="隊伍名稱在同一錦標賽中必須唯一。您可以選擇將隊伍分配到小組，或稍後再進行分配。系統支持錦標賽專屬隊伍，您可以在不同錦標賽中使用相同的隊伍名稱。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
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
                  const isFull = teamCount >= maxTeams;
                  return (
                    <Option 
                      key={group.group_id} 
                      value={group.group_id}
                      disabled={isFull}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>小組 {displayName}</span>
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
              message="創建提示"
              description={`創建隊伍後，您可以在隊伍詳情頁面中添加運動員，或在小組管理中調整隊伍分配。此隊伍將專屬於錦標賽「${tournament?.tournament_name || `ID: ${tournamentId}`}」。`}
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
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
                  創建隊伍
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

export default TournamentTeamCreate;