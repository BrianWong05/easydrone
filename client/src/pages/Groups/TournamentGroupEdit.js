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
import axios from 'axios';

const { Option } = Select;

const TournamentGroupEdit = () => {
  const navigate = useNavigate();
  const { id: tournamentId, groupId } = useParams();
  const [form] = Form.useForm();
  
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

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  // 獲取錦標賽信息
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

  // 獲取小組詳細信息
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/groups/${groupId}`);
      if (response.data.success) {
        const data = response.data.data;
        setGroup(data.group);
        setTeams(data.teams || []);
        setMatches(data.matches || []);
        
        // 檢查是否可以編輯
        const nonPendingMatches = (data.matches || []).filter(match => match.match_status !== 'pending');
        const canEditGroup = nonPendingMatches.length === 0;
        setCanEdit(canEditGroup);
        
        // 設置表單初始值
        const displayGroupName = data.group.group_name?.includes('_') 
          ? data.group.group_name.split('_')[0] 
          : data.group.group_name;
          
        form.setFieldsValue({
          group_name: displayGroupName,
          max_teams: data.group.max_teams,
          description: data.group.description || ''
        });
      } else {
        message.error('獲取小組信息失敗');
        navigate(`/tournaments/${tournamentId}/groups`);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      message.error('獲取小組信息失敗');
      navigate(`/tournaments/${tournamentId}/groups`);
    } finally {
      setLoading(false);
    }
  };

  // 獲取錦標賽中的所有隊伍
  const fetchAllTeams = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams`);
      if (response.data.success) {
        setAllTeams(response.data.data || []);
      }
    } catch (error) {
      console.error('獲取錦標賽隊伍列表錯誤:', error);
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
      
      // 使用錦標賽專屬的更新端點
      const response = await axios.put(`/api/tournaments/${tournamentId}/groups/${groupId}`, {
        group_name: `${values.group_name}_${tournamentId}`, // Internal: A_1, B_1, etc.
        max_teams: values.max_teams,
        description: values.description || `錦標賽 ${tournamentId} - 小組 ${values.group_name}`
      });
      
      if (response && response.data.success) {
        message.success(`小組 ${values.group_name} 更新成功！`);
        navigate(`/tournaments/${tournamentId}/groups/${groupId}`);
      } else {
        message.error(response?.data?.message || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      console.log('Error details:', error.response?.data);
      
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || '';
      
      if (status === 500) {
        message.error(`服務器錯誤：${errorMessage}`);
      } else if (status === 400) {
        message.error(`更新失敗：${errorMessage}`);
      } else if (status === 409) {
        message.error(`小組名稱衝突：${errorMessage}`);
      } else {
        message.error(errorMessage || '更新失敗，請重試');
      }
    } finally {
      setSaving(false);
    }
  };

  // 隊伍管理函數
  const handleRemoveTeam = async (teamId) => {
    try {
      await axios.delete(`/api/groups/${groupId}/teams/${teamId}`);
      message.success('隊伍已從小組中移除');
      await fetchGroupData();
      await fetchAllTeams();
      setRemoveTeamModalVisible(false);
      setTeamToRemove(null);
    } catch (error) {
      console.error('移除隊伍錯誤:', error);
      const errorMessage = error.response?.data?.message || '移除隊伍失敗';
      message.error(errorMessage);
    }
  };

  const handleAddTeam = async (teamId) => {
    try {
      await axios.post(`/api/groups/${groupId}/teams`, {
        team_id: teamId
      });
      message.success('隊伍已添加到小組');
      await fetchGroupData();
      await fetchAllTeams();
      setAddTeamModalVisible(false);
    } catch (error) {
      console.error('添加隊伍錯誤:', error);
      const errorMessage = error.response?.data?.message || '添加隊伍失敗';
      message.error(errorMessage);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/groups/${groupId}`);
  };

  // 獲取可添加的隊伍（錦標賽中未分配小組的隊伍）
  const getAvailableTeams = () => {
    if (!Array.isArray(allTeams) || !Array.isArray(teams)) {
      return [];
    }
    // 只顯示未分配到任何小組的隊伍（group_id 為 null 或 undefined）
    return allTeams.filter(team => 
      !team.group_id || team.group_id === null || team.group_id === undefined
    );
  };

  // 獲取比賽狀態統計
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
        <p>載入中...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <Alert
        message="小組不存在"
        description="找不到指定的小組，請檢查URL是否正確"
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
        {/* 頁面標題 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCancel}
            >
              返回
            </Button>
            <div>
              <h2 className="text-2xl font-bold m-0">
                <TrophyOutlined className="mr-2 text-yellow-500" />
                編輯小組 {displayGroupName}
              </h2>
              <span className="text-gray-500">
                {tournament?.tournament_name || `錦標賽 ${tournamentId}`} - 編輯小組信息
              </span>
            </div>
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
                <ul className="mb-0 pl-5">
                  <li>待開始：{matchStats.pending} 場</li>
                  <li>進行中：{matchStats.active} 場</li>
                  <li>已完成：{matchStats.completed} 場</li>
                  <li>總計：{matchStats.total} 場</li>
                </ul>
                <p className="mt-2 mb-0">
                  <strong>只有當所有比賽都是待開始狀態或沒有比賽時才能編輯小組。</strong>
                </p>
              </div>
            }
            type="warning"
            showIcon
            className="mb-6"
          />
        )}

        {/* 基本信息編輯 */}
        <Card title="基本信息" className="mb-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="max-w-xl"
            disabled={!canEdit}
          >
            <Form.Item
              label="小組名稱"
              name="group_name"
              rules={[
                { required: true, message: '請輸入小組名稱' },
                { pattern: /^[A-Z]$/, message: '小組名稱必須是單個大寫字母（A-Z）' }
              ]}
            >
              <Input 
                placeholder="請輸入小組名稱（例如：A）"
                size="large"
                maxLength={1}
                className="uppercase w-48"
              />
            </Form.Item>

            <Form.Item
              label="最大隊伍數量"
              name="max_teams"
              rules={[
                { required: true, message: '請輸入最大隊伍數量' },
                { type: 'number', min: 2, max: 8, message: '隊伍數量必須在2-8之間' }
              ]}
            >
              <InputNumber 
                placeholder="請輸入最大隊伍數量"
                size="large"
                min={2}
                max={8}
                className="w-48"
                addonAfter="支隊伍"
              />
            </Form.Item>

            <Form.Item
              label="小組描述"
              name="description"
            >
              <Input.TextArea 
                placeholder="請輸入小組描述（可選）"
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
                  保存更改
                </Button>
                <Button onClick={handleCancel}>
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
                        className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: team.team_color }}
                      >
                        {getDisplayTeamName(team.team_name).charAt(0)}
                      </div>
                    }
                    title={
                      <Space>
                        <span className="font-bold">{getDisplayTeamName(team.team_name)}</span>
                        {team.is_virtual && <Tag color="orange">虛擬</Tag>}
                      </Space>
                    }
                    description={`隊伍顏色: ${team.team_color} | 創建時間: ${new Date(team.created_at).toLocaleDateString('zh-TW')}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div className="text-center py-10">
              <TeamOutlined className="text-5xl text-gray-300 mb-4" />
              <div>
                <span className="text-gray-500">此小組暫無隊伍</span>
                <br />
                <Button 
                  type="primary" 
                  className="mt-4"
                  onClick={() => setAddTeamModalVisible(true)}
                  disabled={!canEdit}
                >
                  添加第一支隊伍
                </Button>
              </div>
            </div>
          )}

          {teams.length >= group.max_teams && canEdit && (
            <Alert
              message="小組已滿"
              description={`當前小組已達到最大隊伍數限制（${group.max_teams}支隊伍）`}
              type="warning"
              showIcon
              className="mt-4"
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
                    <p className="mt-2 mb-0 text-yellow-500">
                      <strong>⚠️ 存在非待開始狀態的比賽，無法編輯隊伍</strong>
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
          <p>確定要將 <strong>{getDisplayTeamName(teamToRemove?.team_name)}</strong> 從小組 {displayGroupName} 中移除嗎？</p>
          <p>移除後，該隊伍將不再屬於任何小組。</p>
        </Modal>

        {/* 添加隊伍模態框 */}
        <Modal
          title="添加隊伍到小組"
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
                創建新隊伍
              </Button>
              <Button onClick={() => setAddTeamModalVisible(false)}>
                關閉
              </Button>
            </div>
          }
          width={600}
        >
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span>選擇要添加到小組 {displayGroupName} 的隊伍：</span>
              <Button 
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddTeamModalVisible(false);
                  navigate(`/tournaments/${tournamentId}/teams/create`);
                }}
              >
                創建隊伍
              </Button>
            </div>
            <span className="text-gray-500 text-xs">
              顯示錦標賽中尚未分配到任何小組的隊伍 ({availableTeams.length} 支可用)
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
                      添加到小組
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
                        {team.is_virtual && <Tag color="orange" size="small">虛擬</Tag>}
                        <Tag color="green" size="small">可添加</Tag>
                      </Space>
                    }
                    description={`隊伍顏色: ${team.team_color}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div className="text-center py-10">
              <TeamOutlined className="text-5xl text-gray-300 mb-4" />
              <div>
                <span className="text-gray-500">沒有可添加的隊伍</span>
                <br />
                <span className="text-gray-500 text-xs">
                  所有隊伍都已分配到小組或已在當前小組中
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

export default TournamentGroupEdit;