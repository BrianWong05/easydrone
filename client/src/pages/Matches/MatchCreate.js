import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Select, Button, Space, DatePicker, InputNumber, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';
import { convertToSeconds } from '../../utils/timeUtils';

const { Title } = Typography;
const { Option } = Select;

const MatchCreate = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // 獲取隊伍數據
  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const response = await axios.get('/api/teams');
      
      if (response.data.success) {
        const teamsData = response.data.data.teams || [];
        setTeams(teamsData);
        console.log('🏆 比賽創建頁面獲取到的隊伍選項:', teamsData);
      } else {
        message.error('獲取隊伍列表失敗');
      }
    } catch (error) {
      console.error('獲取隊伍列表錯誤:', error);
      message.error('獲取隊伍列表失敗');
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 準備API數據 - 轉換為總秒數
      const totalSeconds = convertToSeconds(values.match_minutes, values.match_seconds);
      const matchData = {
        match_number: values.match_number,
        team1_id: values.team1_id,
        team2_id: values.team2_id,
        match_date: values.match_date.format('YYYY-MM-DD HH:mm:ss'),
        match_time: totalSeconds,
        match_type: values.match_type === '小組賽' ? 'group' : 
                   values.match_type === '友誼賽' ? 'friendly' : 'knockout',
        tournament_stage: values.tournament_stage || null
      };
      
      console.log('新增比賽數據:', matchData);
      
      // 調用後端API創建比賽
      const response = await axios.post('/api/matches', matchData);
      
      if (response.data.success) {
        message.success('比賽創建成功！');
        navigate('/matches');
      } else {
        message.error(response.data.message || '創建失敗，請重試');
      }
    } catch (error) {
      console.error('創建比賽錯誤:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('創建失敗，請重試');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/matches');
  };

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
          <Title level={2} style={{ margin: 0 }}>新增比賽</Title>
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              match_minutes: 10,
              match_seconds: 0,
              match_type: '小組賽',
              match_status: 'pending'
            }}
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
              >
                {teams.map(team => (
                  <Option key={team.team_id} value={team.team_id}>
                    {team.team_name} (小組 {team.group_name})
                  </Option>
                ))}
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
              >
                {teams.map(team => (
                  <Option key={team.team_id} value={team.team_id}>
                    {team.team_name} (小組 {team.group_name})
                  </Option>
                ))}
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

            <Form.Item
              label="比賽描述"
              name="description"
            >
              <Input.TextArea 
                placeholder="請輸入比賽描述（可選）"
                rows={3}
                maxLength={200}
                showCount
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
                  創建比賽
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

export default MatchCreate;