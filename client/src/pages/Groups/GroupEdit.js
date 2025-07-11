import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Form, 
  Input, 
  InputNumber, 
  message, 
  Spin, 
  Alert,
  Divider,
  List,
  Tag,
  Modal,
  Select
} from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  TeamOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const GroupEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [removeTeamModalVisible, setRemoveTeamModalVisible] = useState(false);
  const [teamToRemove, setTeamToRemove] = useState(null);
  const [addTeamModalVisible, setAddTeamModalVisible] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  useEffect(() => {
    fetchGroupData();
    fetchAllTeams();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/groups/${id}`);
      if (response.data.success) {
        const data = response.data.data;
        setGroupData(data.group);
        setTeams(data.teams || []);
        setMatches(data.matches || []);
        
        // 檢查是否可以編輯
        const nonPendingMatches = (data.matches || []).filter(match => match.match_status !== 'pending');
        const canEditGroup = nonPendingMatches.length === 0;
        setCanEdit(canEditGroup);
        
        // 設置表單初始值
        form.setFieldsValue({
          group_name: data.group.group_name,
          max_teams: data.group.max_teams
        });
      } else {
        message.error('獲取小組數據失敗');
        navigate('/groups');
      }
    } catch (error) {
      console.error('獲取小組數據錯誤:', error);
      message.error('獲取小組數據失敗');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTeams = async () => {
    try {
      const response = await axios.get('/api/teams?limit=1000');
      if (response.data.success) {
        setAllTeams(response.data.data.teams || []);
      }
    } catch (error) {
      console.error('獲取隊伍列表錯誤:', error);
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      const response = await axios.put(`/api/groups/${id}`, values);
      
      if (response.data.success) {
        message.success('小組信息更新成功！');
        navigate(`/groups/${id}`);
      } else {
        message.error(response.data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新小組錯誤:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('更新失敗，請重試');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTeam = async (teamId) => {
    try {
      // Get the team's current data first
      const teamResponse = await axios.get(`/api/teams/${teamId}`);
      if (!teamResponse.data.success) {
        message.error('無法獲取隊伍信息');
        return;
      }
      
      const teamData = teamResponse.data.data.team;
      console.log('🔍 Current team data for removal:', teamData);
      
      // Prepare the update payload with all required fields, setting group_id to null
      const updatePayload = {
        team_name: teamData.team_name,
        group_id: null, // Remove from group
        team_color: teamData.team_color,
        is_virtual: teamData.is_virtual || false
      };
      
      console.log('📤 Sending removal payload:', updatePayload);
      
      const response = await axios.put(`/api/teams/${teamId}`, updatePayload);
      
      console.log('📥 Server response for removal:', response.data);
      
      if (response.data.success) {
        message.success('隊伍已從小組中移除');
        // Refresh data to ensure consistency
        await fetchGroupData();
        await fetchAllTeams();
        setRemoveTeamModalVisible(false);
        setTeamToRemove(null);
      } else {
        console.error('❌ Server returned error for removal:', response.data.message);
        message.error(response.data.message || '移除失敗');
      }
    } catch (error) {
      console.error('❌ 移除隊伍錯誤:', error);
      console.error('❌ Error response for removal:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || '移除隊伍失敗';
      message.error(errorMessage);
    }
  };

  const handleAddTeam = async (teamId) => {
    try {
      // Get the team's current data first
      const teamResponse = await axios.get(`/api/teams/${teamId}`);
      if (!teamResponse.data.success) {
        message.error('無法獲取隊伍信息');
        return;
      }
      
      const teamData = teamResponse.data.data.team;
      console.log('🔍 Current team data for adding:', teamData);
      
      // Prepare the update payload with all required fields
      const updatePayload = {
        team_name: teamData.team_name,
        group_id: parseInt(id),
        team_color: teamData.team_color,
        is_virtual: teamData.is_virtual || false
      };
      
      console.log('📤 Sending add payload:', updatePayload);
      
      const response = await axios.put(`/api/teams/${teamId}`, updatePayload);
      
      console.log('📥 Server response for adding:', response.data);
      
      if (response.data.success) {
        message.success('隊伍已添加到小組');
        // 重新獲取小組數據
        await fetchGroupData();
        await fetchAllTeams();
        setAddTeamModalVisible(false);
      } else {
        console.error('❌ Server returned error for adding:', response.data.message);
        message.error(response.data.message || '添加失敗');
      }
    } catch (error) {
      console.error('❌ 添加隊伍錯誤:', error);
      console.error('❌ Error response for adding:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || '添加隊伍失敗';
      message.error(errorMessage);
    }
  };

  const handleBack = () => {
    navigate(`/groups/${id}`);
  };

  // 獲取可添加的隊伍（沒有小組或不在當前小組的隊伍）
  const getAvailableTeams = () => {
    const currentTeamIds = teams.map(team => team.team_id);
    return allTeams.filter(team => 
      !team.group_id || !currentTeamIds.includes(team.team_id)
    );
  };

  // 獲取比賽狀態統計
  const getMatchStatusStats = () => {
    const pending = matches.filter(m => m.match_status === 'pending').length;
    const active = matches.filter(m => m.match_status === 'active').length;
    const completed = matches.filter(m => m.match_status === 'completed').length;
    return { pending, active, completed, total: matches.length };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>載入中...</p>
      </div>
    );
  }

  if (!groupData) {
    return (
      <Alert
        message="小組不存在"
        description="找不到指定的小組，請檢查URL是否正確"
        type="error"
        showIcon
      />
    );
  }

  const availableTeams = getAvailableTeams();
  const matchStats = getMatchStatusStats();

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 頁面標題 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBack}
            >
              返回
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              <TeamOutlined /> 編輯小組 {groupData.group_name}
            </Title>
          </div>
        </div>

        {/* 編輯限制提示 */}
        {!canEdit && (
          <Alert
            message="無法編輯小組"
            description={
              <div>
                <p>此小組存在已開始或已完成的比賽，無法進行編輯。</p>
                <p>比賽狀態統計：</p>
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                  <li>待開始：{matchStats.pending} 場</li>
                  <li>進行中：{matchStats.active} 場</li>
                  <li>已完成：{matchStats.completed} 場</li>
                  <li>總計：{matchStats.total} 場</li>
                </ul>
                <p style={{ marginTop: '8px', marginBottom: 0 }}>
                  <strong>只有當所有比賽都是待開始狀態或沒有比賽時才能編輯小組。</strong>
                </p>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* 基本信息編輯 */}
        <Card title="基本信息" style={{ marginBottom: '24px' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            style={{ maxWidth: '600px' }}
            disabled={!canEdit}
          >
            <Form.Item
              label="小組名稱"
              name="group_name"
              rules={[
                { required: true, message: '請輸入小組名稱' },
                { max: 1, message: '小組名稱只能是一個字符' },
                { pattern: /^[A-Z]$/, message: '小組名稱必須是大寫字母' }
              ]}
            >
              <Input 
                placeholder="請輸入小組名稱（如：A、B、C、D）"
                style={{ width: '200px' }}
              />
            </Form.Item>

            <Form.Item
              label="最大隊伍數"
              name="max_teams"
              rules={[
                { required: true, message: '請輸入最大隊伍數' },
                { type: 'number', min: 2, max: 16, message: '隊伍數必須在2-16之間' }
              ]}
            >
              <InputNumber 
                min={2}
                max={16}
                placeholder="請輸入最大隊伍數"
                style={{ width: '200px' }}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={!canEdit}
                >
                  保存更改
                </Button>
                <Button onClick={handleBack}>
                  {canEdit ? '取消' : '返回'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* 隊伍管理 */}
        <Card 
          title={
            <Space>
              <TeamOutlined />
              <span>隊伍管理</span>
              <Tag color="blue">{teams.length}/{groupData.max_teams}</Tag>
            </Space>
          }
          extra={
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddTeamModalVisible(true)}
              disabled={!canEdit || teams.length >= groupData.max_teams}
            >
              添加隊伍
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
                      查看詳情
                    </Button>,
                    <Button 
                      type="link" 
                      size="small"
                      onClick={() => navigate(`/teams/${team.team_id}/edit`)}
                    >
                      編輯隊伍
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
                      移除
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div 
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: team.team_color,
                          borderRadius: '50%',
                          border: '2px solid #d9d9d9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}
                      >
                        {team.team_name.charAt(0)}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{team.team_name}</Text>
                        {team.is_virtual && <Tag color="orange">虛擬</Tag>}
                      </Space>
                    }
                    description={`隊伍顏色: ${team.team_color} | 創建時間: ${new Date(team.created_at).toLocaleDateString('zh-TW')}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TeamOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
              <div>
                <Text type="secondary">此小組暫無隊伍</Text>
                <br />
                <Button 
                  type="primary" 
                  style={{ marginTop: '16px' }}
                  onClick={() => setAddTeamModalVisible(true)}
                >
                  添加第一支隊伍
                </Button>
              </div>
            </div>
          )}

          {teams.length >= groupData.max_teams && canEdit && (
            <Alert
              message="小組已滿"
              description={`當前小組已達到最大隊伍數限制（${groupData.max_teams}支隊伍）`}
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}

          {matchStats.total > 0 && (
            <Alert
              message="比賽狀態"
              description={
                <div>
                  <p>此小組共有 {matchStats.total} 場比賽：</p>
                  <Space>
                    <Tag color="orange">待開始：{matchStats.pending}</Tag>
                    <Tag color="green">進行中：{matchStats.active}</Tag>
                    <Tag color="blue">已完成：{matchStats.completed}</Tag>
                  </Space>
                  {!canEdit && (
                    <p style={{ marginTop: '8px', marginBottom: 0, color: '#faad14' }}>
                      <strong>⚠️ 存在非待開始狀態的比賽，無法編輯隊伍</strong>
                    </p>
                  )}
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: '16px' }}
            />
          )}
        </Card>

        {/* 移除隊伍確認模態框 */}
        <Modal
          title="確認移除隊伍"
          open={removeTeamModalVisible}
          onOk={() => handleRemoveTeam(teamToRemove?.team_id)}
          onCancel={() => {
            setRemoveTeamModalVisible(false);
            setTeamToRemove(null);
          }}
          okText="確認移除"
          cancelText="取消"
          okType="danger"
        >
          <p>確定要將 <strong>{teamToRemove?.team_name}</strong> 從小組 {groupData.group_name} 中移除嗎？</p>
          <p>移除後，該隊伍將不再屬於任何小組。</p>
        </Modal>

        {/* 添加隊伍模態框 */}
        <Modal
          title="添加隊伍到小組"
          open={addTeamModalVisible}
          onCancel={() => setAddTeamModalVisible(false)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddTeamModalVisible(false);
                  navigate('/teams/create');
                }}
              >
                創建新隊伍
              </Button>
              <Button onClick={() => setAddTeamModalVisible(false)}>
                關閉
              </Button>
            </div>
          }
          width={600}
        >
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>選擇要添加到小組 {groupData.group_name} 的隊伍：</Text>
            <Button 
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setAddTeamModalVisible(false);
                navigate('/teams/create');
              }}
            >
              創建隊伍
            </Button>
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
                      添加到小組
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div 
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: team.team_color,
                          borderRadius: '50%',
                          border: '1px solid #d9d9d9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      >
                        {team.team_name.charAt(0)}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{team.team_name}</Text>
                        {team.is_virtual && <Tag color="orange" size="small">虛擬</Tag>}
                        {team.group_id && team.group_id !== parseInt(id) && (
                          <Tag color="red" size="small">已在其他小組</Tag>
                        )}
                      </Space>
                    }
                    description={`隊伍顏色: ${team.team_color}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TeamOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
              <div>
                <Text type="secondary">沒有可添加的隊伍</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  所有隊伍都已分配到小組或已在當前小組中
                </Text>
                <br />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    setAddTeamModalVisible(false);
                    navigate('/teams/create');
                  }}
                >
                  創建新隊伍
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </Space>
    </div>
  );
};

export default GroupEdit;