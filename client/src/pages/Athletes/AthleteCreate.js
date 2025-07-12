import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Select, Button, Space, InputNumber, message, Switch } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const AthleteCreate = () => {
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
      console.log('🏈 獲取隊伍列表...');
      const response = await axios.get('/api/teams');
      
      if (response.data.success) {
        const teamsData = response.data.data.teams || [];
        console.log('🏈 獲取到的隊伍數據:', teamsData);
        setTeams(teamsData);
      } else {
        message.error('獲取隊伍列表失敗');
      }
    } catch (error) {
      console.error('獲取隊伍列表錯誤:', error);
      message.error('無法載入隊伍列表');
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log('👤 創建運動員，提交數據:', values);
      
      // 準備提交到後端的數據
      const athleteData = {
        team_id: values.team_id,
        name: values.name,
        jersey_number: values.jersey_number,
        position: values.position,
        age: values.age,
        is_active: values.is_active !== false // 默認為true
      };
      
      console.log('👤 發送到後端的數據:', athleteData);
      
      // 調用後端API創建運動員
      const response = await axios.post('/api/athletes', athleteData);
      
      if (response.data.success) {
        console.log('✅ 運動員創建成功:', response.data);
        message.success('運動員創建成功！');
        navigate('/athletes');
      } else {
        message.error(response.data.message || '創建失敗');
      }
    } catch (error) {
      console.error('❌ 創建運動員錯誤:', error);
      console.error('❌ 錯誤響應:', error.response?.data);
      
      if (error.response?.status === 409) {
        message.error('該隊伍中已存在相同球衣號碼的運動員');
      } else if (error.response?.status === 400) {
        message.error(error.response.data.message || '輸入數據有誤');
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.response?.status === 500) {
        message.error('服務器錯誤，請稍後重試或聯繫管理員');
      } else {
        message.error('創建失敗，請檢查網絡連接或聯繫管理員');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/athletes');
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
          <Title level={2} style={{ margin: 0 }}>新增運動員</Title>
        </div>

        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              is_active: true,
              position: 'defender'
            }}
          >
            <Form.Item
              label="運動員姓名"
              name="name"
              rules={[
                { required: true, message: '請輸入運動員姓名' },
                { min: 2, message: '姓名至少需要2個字符' },
                { max: 20, message: '姓名不能超過20個字符' }
              ]}
            >
              <Input 
                placeholder="請輸入運動員姓名"
                size="large"
                prefix={<UserAddOutlined />}
              />
            </Form.Item>

            <Form.Item
              label="所屬隊伍"
              name="team_id"
              rules={[{ required: true, message: '請選擇所屬隊伍' }]}
            >
              <Select 
                placeholder="請選擇隊伍"
                size="large"
                loading={teamsLoading}
                disabled={teamsLoading}
              >
                {teams.map(team => (
                  <Option key={team.team_id} value={team.team_id}>
                    {team.team_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="球衣號碼"
              name="jersey_number"
              rules={[
                { required: true, message: '請輸入球衣號碼' },
                { type: 'number', min: 1, max: 99, message: '球衣號碼必須在1-99之間' }
              ]}
            >
              <InputNumber 
                placeholder="請輸入球衣號碼"
                size="large"
                min={1}
                max={99}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="位置"
              name="position"
              rules={[{ required: true, message: '請選擇位置' }]}
            >
              <Select 
                placeholder="請選擇位置"
                size="large"
              >
                <Option value="attacker">進攻手</Option>
                <Option value="defender">防守員</Option>
                <Option value="substitute">替補</Option>
              </Select>
            </Form.Item>


            <Form.Item
              label="年齡"
              name="age"
              rules={[
                { required: true, message: '請輸入年齡' },
                { type: 'number', min: 16, max: 50, message: '年齡必須在16-50歲之間' }
              ]}
            >
              <InputNumber 
                placeholder="請輸入年齡 (16-50歲)"
                size="large"
                min={16}
                max={50}
                style={{ width: '100%' }}
                addonAfter="歲"
                parser={value => value.replace(/\D/g, '')}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item
              label="狀態"
              name="is_active"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="活躍" 
                unCheckedChildren="非活躍"
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
                  創建運動員
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

export default AthleteCreate;