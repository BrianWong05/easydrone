import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Select, Button, Space, ColorPicker, message, Switch } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const TeamEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 模擬小組數據
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // 獲取小組數據
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      const response = await axios.get('/api/groups');
      
      if (response.data.success) {
        const groupsData = response.data.data.groups || [];
        setGroups(groupsData);
        console.log('📋 編輯頁面獲取到的小組選項:', groupsData);
      } else {
        message.error('獲取小組列表失敗');
      }
    } catch (error) {
      console.error('獲取小組列表錯誤:', error);
      message.error('獲取小組列表失敗');
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [id]);

  const fetchTeamData = async () => {
    try {
      console.log('🔍 Fetching team data for ID:', id);
      const response = await axios.get(`/api/teams/${id}`);
      console.log('📡 API Response:', response.data);
      
      if (response.data.success) {
        console.log('📊 Full response data:', response.data.data);
        
        // Check if team data is nested or direct
        const team = response.data.data.team || response.data.data;
        console.log('👥 Team object:', team);
        
        if (team) {
          const formData = {
            team_name: team.team_name,
            group_id: team.group_id,
            team_color: team.team_color,
            is_virtual: team.is_virtual || false,
            description: team.description || ''
          };
          
          console.log('📝 Setting form values:', formData);
          form.setFieldsValue(formData);
        } else {
          console.error('❌ No team data found in response');
          message.error('隊伍數據格式錯誤');
          navigate('/teams');
        }
      } else {
        console.error('❌ API returned success: false');
        message.error('獲取隊伍信息失敗');
        navigate('/teams');
      }
    } catch (error) {
      console.error('❌ 獲取隊伍數據錯誤:', error);
      console.error('❌ Error response:', error.response?.data);
      message.error('無法載入隊伍信息');
      navigate('/teams');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 準備提交到後端的數據
      const teamData = {
        team_name: values.team_name,
        group_id: values.group_id || null, // 如果沒選擇小組則設為null
        team_color: typeof values.team_color === 'string' ? values.team_color : values.team_color.toHexString(),
        is_virtual: values.is_virtual || false,
        description: values.description || ''
      };
      
      // 調用後端API更新隊伍
      const response = await axios.put(`/api/teams/${id}`, teamData);
      
      if (response.data.success) {
        message.success('隊伍更新成功！');
        navigate('/teams');
      } else {
        message.error(response.data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新隊伍錯誤:', error);
      if (error.response?.status === 409) {
        message.error('隊伍名稱已存在，請使用其他名稱');
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
    navigate('/teams');
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
            返回
          </Button>
          <Title level={2} style={{ margin: 0 }}>編輯隊伍</Title>
        </div>

        <Card>
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
              />
            </Form.Item>

            <Form.Item
              label="所屬小組"
              name="group_id"
              help="可以選擇加入小組，或保持無小組狀態稍後再分配"
            >
              <Select 
                placeholder="請選擇小組"
                size="large"
                allowClear
                clearIcon={null}
              >
                <Option key="no-group" value={null}>
                  <span style={{ color: '#999', fontStyle: 'italic' }}>
                    無小組 (稍後分配)
                  </span>
                </Option>
                {groups.map(group => (
                  <Option key={group.group_id} value={group.group_id}>
                    小組 {group.group_name}
                  </Option>
                ))}
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
                      '#008000', '#000080', '#800000', '#808000'
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
                unCheckedChildren="正式隊伍"
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

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  更新隊伍
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

export default TeamEdit;