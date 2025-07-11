import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Select, Button, Space, DatePicker, InputNumber, message, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';
import { convertToSeconds, convertFromSeconds } from '../../utils/timeUtils';

const { Title } = Typography;
const { Option } = Select;

const TournamentMatchEdit = () => {
  const navigate = useNavigate();
  const { id: tournamentId, matchId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matchData, setMatchData] = useState(null);
  const [tournament, setTournament] = useState(null);

  // 獲取隊伍數據和比賽數據
  useEffect(() => {
    fetchData();
  }, [tournamentId, matchId]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      // 並行獲取錦標賽信息、隊伍列表、小組列表和比賽詳情
      const [tournamentResponse, teamsResponse, groupsResponse, matchResponse] = await Promise.all([
        axios.get(`/api/tournaments/${tournamentId}`),
        axios.get(`/api/tournaments/${tournamentId}/teams`),
        axios.get(`/api/tournaments/${tournamentId}/groups`),
        axios.get(`/api/tournaments/${tournamentId}/matches/${matchId}`)
      ]);
      
      if (tournamentResponse.data.success) {
        setTournament(tournamentResponse.data.data.tournament || tournamentResponse.data.data);
      }

      if (teamsResponse.data.success) {
        const teamsData = teamsResponse.data.data.teams || teamsResponse.data.data || [];
        setTeams(teamsData);
      } else {
        message.error('獲取隊伍列表失敗');
      }

      if (groupsResponse.data.success) {
        const groupsData = groupsResponse.data.data.groups || groupsResponse.data.data || [];
        setGroups(groupsData);
      }

      if (matchResponse.data.success) {
        const match = matchResponse.data.data.match;
        setMatchData(match);
        
        // 設置表單初始值 - 從秒數轉換為分鐘和秒數
        console.log('🔍 Raw match_time from database (seconds):', match.match_time, typeof match.match_time);
        const { minutes, seconds } = convertFromSeconds(match.match_time);
        console.log('🔍 Converted to:', minutes, 'minutes,', seconds, 'seconds');
        
        form.setFieldsValue({
          match_number: match.match_number,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          match_date: moment(match.match_date),
          match_minutes: minutes,
          match_seconds: seconds,
          match_type: getChineseMatchType(match.match_type),
          tournament_stage: match.tournament_stage || '',
          group_id: match.group_id
        });
      } else {
        message.error('獲取比賽詳情失敗');
        navigate(`/tournaments/${tournamentId}/matches`);
      }
    } catch (error) {
      console.error('獲取數據錯誤:', error);
      message.error('獲取數據失敗');
      navigate(`/tournaments/${tournamentId}/matches`);
    } finally {
      setDataLoading(false);
    }
  };

  // 將英文比賽類型轉換為中文
  const getChineseMatchType = (englishType) => {
    switch (englishType) {
      case 'group': return '小組賽';
      case 'friendly': return '友誼賽';
      case 'knockout': return '淘汰賽';
      default: return '友誼賽';
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 準備API數據 - 轉換為總秒數
      const totalSeconds = convertToSeconds(values.match_minutes, values.match_seconds);
      
      // 確定比賽類型
      const matchType = values.match_type === '小組賽' ? 'group' : 
                       values.match_type === '友誼賽' ? 'friendly' : 'knockout';
      
      let groupId = values.group_id || null;
      
      // 如果是小組賽且沒有指定小組，自動分配小組ID
      if (matchType === 'group' && !groupId) {
        // 獲取選中隊伍的小組信息
        const team1 = teams.find(t => t.team_id === values.team1_id);
        const team2 = teams.find(t => t.team_id === values.team2_id);
        
        console.log('🏁 Team 1:', team1);
        console.log('🏁 Team 2:', team2);
        
        // 檢查兩支隊伍是否在同一小組
        if (team1?.group_id && team2?.group_id && team1.group_id === team2.group_id) {
          groupId = team1.group_id;
          console.log(`✅ 小組賽：兩支隊伍都在小組 ${team1.group_name} (ID: ${groupId})`);
        } else if (team1?.group_id && !team2?.group_id) {
          groupId = team1.group_id;
          console.log(`⚠️ 小組賽：隊伍1在小組 ${team1.group_name}，隊伍2無小組，使用隊伍1的小組`);
        } else if (!team1?.group_id && team2?.group_id) {
          groupId = team2.group_id;
          console.log(`⚠️ 小組賽：隊伍2在小組 ${team2.group_name}，隊伍1無小組，使用隊伍2的小組`);
        } else {
          console.log('⚠️ 小組賽：兩支隊伍都沒有分配小組或在不同小組');
          message.warning('小組賽建議選擇同一小組的隊伍');
        }
      }
      
      const matchUpdateData = {
        match_number: values.match_number,
        team1_id: values.team1_id,
        team2_id: values.team2_id,
        match_date: values.match_date.format('YYYY-MM-DD HH:mm:ss'),
        match_time: totalSeconds,
        match_type: matchType,
        tournament_stage: values.tournament_stage || null,
        group_id: groupId
      };
      
      console.log('🔄 更新比賽數據:', matchUpdateData);
      console.log('🏁 分配的小組ID:', groupId);
      
      // 調用後端API更新比賽
      const response = await axios.put(`/api/tournaments/${tournamentId}/matches/${matchId}`, matchUpdateData);
      
      if (response.data.success) {
        message.success('比賽更新成功！');
        navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
      } else {
        message.error(response.data.message || '更新失敗，請重試');
      }
    } catch (error) {
      console.error('更新比賽錯誤:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('更新失敗，請重試');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
  };

  if (dataLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>載入比賽資料中...</div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3}>比賽不存在</Title>
        <Button onClick={handleCancel}>返回</Button>
      </div>
    );
  }

  // 檢查比賽狀態
  if (matchData.match_status !== 'pending') {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3}>無法編輯</Title>
        <p>只能編輯未開始的比賽</p>
        <Button onClick={handleCancel}>返回</Button>
      </div>
    );
  }

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
          <Title level={2} style={{ margin: 0 }}>編輯比賽</Title>
          {tournament && (
            <span style={{ color: '#666' }}>
              {tournament.tournament_name}
            </span>
          )}
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="比賽編號"
              name="match_number"
              rules={[
                { required: true, message: '請輸入比賽編號' },
                { pattern: /^[A-Z]\d{2}$/, message: '比賽編號格式：A01' }
              ]}
            >
              <Input 
                placeholder="例如：A01"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="隊伍1"
              name="team1_id"
              rules={[{ required: true, message: '請選擇隊伍1' }]}
            >
              <Select 
                placeholder="請選擇隊伍1"
                size="large"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {teams.map(team => {
                  const displayName = team.team_name?.includes("_") ? team.team_name.split("_")[0] : team.team_name;
                  const groupName = team.group_name?.includes("_") ? team.group_name.split("_")[0] : team.group_name;
                  return (
                    <Option key={team.team_id} value={team.team_id}>
                      {displayName}{groupName ? ` (小組 ${groupName})` : ''}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              label="隊伍2"
              name="team2_id"
              rules={[{ required: true, message: '請選擇隊伍2' }]}
            >
              <Select 
                placeholder="請選擇隊伍2"
                size="large"
                showSearch
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {teams.map(team => {
                  const displayName = team.team_name?.includes("_") ? team.team_name.split("_")[0] : team.team_name;
                  const groupName = team.group_name?.includes("_") ? team.group_name.split("_")[0] : team.group_name;
                  return (
                    <Option key={team.team_id} value={team.team_id}>
                      {displayName}{groupName ? ` (小組 ${groupName})` : ''}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              label="所屬小組"
              name="group_id"
            >
              <Select 
                placeholder="請選擇小組（可選）"
                size="large"
                allowClear
              >
                {groups.map(group => {
                  const displayName = group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name;
                  return (
                    <Option key={group.group_id} value={group.group_id}>
                      小組 {displayName}
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              label="比賽時間"
              name="match_date"
              rules={[{ required: true, message: '請選擇比賽時間' }]}
            >
              <DatePicker 
                showTime
                placeholder="請選擇比賽時間"
                size="large"
                style={{ width: '100%' }}
                format="YYYY-MM-DD HH:mm"
                disabledDate={(current) => current && current < moment().startOf('day')}
              />
            </Form.Item>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>比賽時長</label>
              <Input.Group compact>
                <Form.Item
                  name="match_minutes"
                  style={{ display: 'inline-block', width: '50%', marginBottom: 0 }}
                  dependencies={['match_seconds']}
                  rules={[
                    { 
                      validator: (_, value) => {
                        const minutes = value ?? 0;
                        const seconds = form.getFieldValue('match_seconds') ?? 0;
                        if (minutes === 0 && seconds === 0) {
                          return Promise.reject(new Error('比賽時長不能為0'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <InputNumber 
                    placeholder="分鐘"
                    size="large"
                    min={0}
                    max={60}
                    style={{ width: '100%' }}
                    addonAfter="分"
                    onChange={() => {
                      // 觸發秒數字段的驗證
                      form.validateFields(['match_seconds']);
                    }}
                  />
                </Form.Item>
                <Form.Item
                  name="match_seconds"
                  style={{ display: 'inline-block', width: '50%', marginBottom: 0 }}
                  dependencies={['match_minutes']}
                  rules={[
                    { 
                      validator: (_, value) => {
                        const seconds = value ?? 0;
                        const minutes = form.getFieldValue('match_minutes') ?? 0;
                        if (minutes === 0 && seconds === 0) {
                          return Promise.reject(new Error('比賽時長不能為0'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <InputNumber 
                    placeholder="秒數"
                    size="large"
                    min={0}
                    max={59}
                    style={{ width: '100%' }}
                    addonAfter="秒"
                    onChange={() => {
                      // 觸發分鐘字段的驗證
                      form.validateFields(['match_minutes']);
                    }}
                  />
                </Form.Item>
              </Input.Group>
            </div>

            <Form.Item
              label="比賽類型"
              name="match_type"
              rules={[{ required: true, message: '請選擇比賽類型' }]}
            >
              <Select 
                placeholder="請選擇比賽類型"
                size="large"
              >
                <Option value="小組賽">小組賽</Option>
                <Option value="八強賽">八強賽</Option>
                <Option value="準決賽">準決賽</Option>
                <Option value="決賽">決賽</Option>
                <Option value="友誼賽">友誼賽</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="錦標賽階段"
              name="tournament_stage"
            >
              <Input 
                placeholder="例如：小組賽第1輪"
                size="large"
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  更新比賽
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

export default TournamentMatchEdit;