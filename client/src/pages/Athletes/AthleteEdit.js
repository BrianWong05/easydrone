import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Select, Button, Space, InputNumber, message, Switch } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const AthleteEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // 獲取隊伍數據
  useEffect(() => {
    fetchTeams();
  }, []);

  // 獲取運動員數據
  useEffect(() => {
    fetchAthleteData();
  }, [id]);

  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const response = await axios.get('/api/http://localhost:8001/api/teams');
      
      if (response.data.success) {
        const teamsData = response.data.data.teams || [];
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

  const fetchAthleteData = async () => {
    try {
      console.log('🔍 獲取運動員數據，ID:', id);
      const response = await axios.get(`http://localhost:8001/api/athletes/${id}`);
      console.log('📡 API 響應:', response.data);
      
      if (response.data.success) {
        // 後端返回的數據結構是 {athlete: {...}, events: [...]}
        const athlete = response.data.data.athlete;
        console.log('👤 運動員數據:', athlete);
        
        if (athlete) {
          const formData = {
            name: athlete.name,
            team_id: athlete.team_id,
            jersey_number: athlete.jersey_number,
            position: athlete.position,
            age: athlete.age,
            is_active: athlete.is_active !== false // 確保布爾值正確
          };
          
          console.log('📝 設置表單數據:', formData);
          form.setFieldsValue(formData);
        } else {
          console.error('❌ 運動員數據為空');
          message.error('運動員數據格式錯誤');
          navigate('/athletes');
        }
      } else {
        message.error('獲取運動員信息失敗');
        navigate('/athletes');
      }
    } catch (error) {
      console.error('❌ 獲取運動員數據錯誤:', error);
      console.error('❌ 錯誤響應:', error.response?.data);
      message.error('無法載入運動員信息');
      navigate('/athletes');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log('👤 更新運動員，提交數據:', values);
      
      // 準備提交到後端的數據
      const athleteData = {
        team_id: values.team_id,
        name: values.name,
        jersey_number: values.jersey_number,
        position: values.position,
        age: values.age,
        is_active: values.is_active !== false
      };
      
      console.log('👤 發送到後端的數據:', athleteData);
      
      // 調用後端API更新運動員
      const response = await axios.put(`http://localhost:8001/api/athletes/${id}`, athleteData);
      
      if (response.data.success) {
        console.log('✅ 運動員更新成功:', response.data);
        message.success('運動員更新成功！');
        navigate('/athletes');
      } else {
        message.error(response.data.message || '更新失敗');
      }
    } catch (error) {
      console.error('❌ 更新運動員錯誤:', error);
      if (error.response?.status === 409) {
        message.error('該隊伍中已存在相同球衣號碼的運動員');
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('更新失敗，請檢查網絡連接或聯繫管理員');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/athletes');
  };

  if (initialLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <div>載入中...</div>
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
            返回列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>編輯運動員</Title>
        </div>

        <Card title="運動員信息" style={{ maxWidth: 800 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              is_active: true
            }}
          >
            <Form.Item
              label="運動員姓名"
              name="name"
              rules={[
                { required: true, message: '請輸入運動員姓名' },
                { min: 2, message: '姓名至少需要2個字符' },
                { max: 100, message: '姓名不能超過100個字符' }
              ]}
            >
              <Input 
                placeholder="請輸入運動員姓名"
                size="large"
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
                  更新運動員
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

export default AthleteEdit;