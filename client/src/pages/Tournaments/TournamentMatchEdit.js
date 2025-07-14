import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Select, Button, Space, DatePicker, TimePicker, InputNumber, message, Spin, Row, Col, Divider } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalendarOutlined, SwapOutlined } from '@ant-design/icons';
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
        
        // 分離日期和時間 - 使用字符串解析避免時區問題
        const matchMoment = moment(match.match_date);
        
        // 直接從字符串創建moment對象避免時區轉換
        const dateString = matchMoment.format('YYYY-MM-DD');
        const timeString = matchMoment.format('HH:mm');
        
        // 為DatePicker創建只包含日期的moment對象
        const dateForPicker = moment(dateString, 'YYYY-MM-DD');
        // 為TimePicker創建包含時間的moment對象
        const timeForPicker = moment(timeString, 'HH:mm');
        
        console.log('🔍 Edit - Original match_date:', match.match_date);
        console.log('🔍 Edit - Parsed moment:', matchMoment.format('YYYY-MM-DD HH:mm:ss'));
        console.log('🔍 Edit - Date string:', dateString);
        console.log('🔍 Edit - Time string:', timeString);
        console.log('🔍 Edit - Date for picker:', dateForPicker.format('YYYY-MM-DD'));
        console.log('🔍 Edit - Time for picker:', timeForPicker.format('HH:mm'));
        
        form.setFieldsValue({
          match_number: match.match_number,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          match_date: dateForPicker,
          match_time: timeForPicker,
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
      case 'knockout': return '淘汰賽';
      case 'friendly': return '友誼賽';
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
                       values.match_type === '淘汰賽' ? 'knockout' : 
                       values.match_type === '友誼賽' ? 'friendly' : 'friendly';
      
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
      
      // 組合日期和時間
      console.log('🔍 Edit - Raw form values:', {
        match_date: values.match_date,
        match_time: values.match_time,
        match_date_format: values.match_date?.format('YYYY-MM-DD'),
        match_time_format: values.match_time?.format('HH:mm')
      });
      
      // 直接使用格式化的字符串來避免時區問題
      const dateString = values.match_date.format('YYYY-MM-DD'); // 從DatePicker獲取日期字符串
      const timeString = values.match_time.format('HH:mm'); // 從TimePicker獲取時間字符串
      
      // 直接組合字符串
      const matchDateTime = `${dateString} ${timeString}:00`;
        
      console.log('🔍 Edit - Date string:', dateString);
      console.log('🔍 Edit - Time string:', timeString);
      console.log('🔍 Edit - Combined datetime:', matchDateTime);

      const matchUpdateData = {
        match_number: values.match_number,
        team1_id: values.team1_id,
        team2_id: values.team2_id,
        match_date: matchDateTime,
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

  const handleSwapTeams = () => {
    const team1Id = form.getFieldValue('team1_id');
    const team2Id = form.getFieldValue('team2_id');
    
    form.setFieldsValue({
      team1_id: team2Id,
      team2_id: team1Id
    });
    
    message.success('隊伍已交換！');
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
  if (!['pending', 'postponed'].includes(matchData.match_status)) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Title level={3}>無法編輯</Title>
        <p>只能編輯未開始或延期的比賽</p>
        <Button onClick={handleCancel}>返回</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleCancel}
          style={{ marginBottom: 16 }}
        >
          返回比賽詳情
        </Button>
        <Title level={2}>{tournament?.tournament_name} - 編輯比賽</Title>
        <p style={{ color: "#666", marginBottom: 0 }}>修改比賽的詳細信息和設置</p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="比賽場次"
                name="match_number"
                rules={[
                  { required: true, message: "請輸入比賽場次" },
                  { pattern: /^[A-Za-z0-9\-_]+$/, message: "比賽場次只能包含字母、數字、連字符和下劃線" },
                ]}
              >
                <Input placeholder="例如: A1, B2, SF1, F1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="比賽類型" name="match_type" rules={[{ required: true, message: "請選擇比賽類型" }]}>
                <Select>
                  <Option value="小組賽">小組賽</Option>
                  <Option value="淘汰賽">淘汰賽</Option>
                  <Option value="友誼賽">友誼賽</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="錦標賽階段" name="tournament_stage">
            <Input placeholder="例如: 小組賽第1輪, 八強賽, 決賽" />
          </Form.Item>

          <Divider>隊伍設置</Divider>

          <Form.Item label="選擇小組（可選）" name="group_id">
            <Select placeholder="選擇小組後將只顯示該小組的隊伍" allowClear>
              <Option value={null}>無小組</Option>
              {groups.map((group) => (
                <Option key={group.group_id} value={group.group_id}>
                  小組 {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={24} align="bottom">
            <Col span={11}>
              <Form.Item label="隊伍1" name="team1_id" rules={[{ required: true, message: "請選擇隊伍1" }]}>
                <Select placeholder="選擇隊伍1" showSearch optionFilterProp="children">
                  {teams.map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: team.team_color || "#ccc",
                            marginRight: 8,
                            borderRadius: 2,
                          }}
                        />
                        {team.team_name?.includes("_") ? team.team_name.split("_")[0] : team.team_name}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={2} style={{ textAlign: 'center' }}>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button 
                  type="dashed" 
                  icon={<SwapOutlined />} 
                  onClick={handleSwapTeams}
                  title="交換隊伍"
                  style={{ 
                    width: '100%',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  交換
                </Button>
              </Form.Item>
            </Col>
            <Col span={11}>
              <Form.Item label="隊伍2" name="team2_id" rules={[{ required: true, message: "請選擇隊伍2" }]}>
                <Select placeholder="選擇隊伍2" showSearch optionFilterProp="children">
                  {teams.map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: team.team_color || "#ccc",
                            marginRight: 8,
                            borderRadius: 2,
                          }}
                        />
                        {team.team_name?.includes("_") ? team.team_name.split("_")[0] : team.team_name}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

            <Divider>時間設置</Divider>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label="比賽日期"
                  name="match_date"
                  rules={[{ required: true, message: '請選擇比賽日期' }]}
                >
                  <DatePicker 
                    placeholder="選擇比賽日期"
                    style={{ width: '100%' }}
                    disabledDate={(current) => current && current < moment().startOf('day')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="比賽時間"
                  name="match_time"
                  rules={[{ required: true, message: '請選擇比賽時間' }]}
                >
                  <TimePicker 
                    placeholder="選擇比賽時間"
                    style={{ width: '100%' }}
                    format="HH:mm"
                  />
                </Form.Item>
              </Col>
            </Row>

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

          <Form.Item style={{ marginTop: 32 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                更新比賽
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
          </Form>
        </Card>
      </div>
  );
};

export default TournamentMatchEdit;