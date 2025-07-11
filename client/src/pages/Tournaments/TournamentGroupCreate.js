import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Space, InputNumber, message, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const TournamentGroupCreate = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState(null);

  // 獲取錦標賽信息
  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      console.log('Tournament API response:', response.data);
      if (response.data.success) {
        setTournament(response.data.data.tournament || response.data.data);
      } else {
        console.log('Tournament API returned success: false');
        message.warning('無法載入錦標賽信息，但您仍可以創建小組');
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      console.log('Tournament fetch error details:', error.response?.data);
      if (error.response?.status === 404) {
        message.warning('錦標賽不存在或API端點未實現');
      } else {
        message.error('載入錦標賽信息失敗');
      }
    }
  };

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log('Creating group with values:', values);
      
      // Use new tournament-specific endpoint with proper backend support
      const userLetter = values.group_name;
      
      console.log(`Creating group ${userLetter} for tournament ${tournamentId}`);
      
      // Use tournament-specific endpoint
      const response = await axios.post(`/api/groups/tournament/${tournamentId}`, {
        group_name: `${userLetter}_${tournamentId}`, // Internal: A_1, B_1, etc.
        display_name: userLetter, // Display: A, B, etc.
        max_teams: values.max_teams,
        description: values.description || `錦標賽 ${tournamentId} - 小組 ${userLetter}`
      });
      if (response && response.data.success) {
        message.success(`小組 ${userLetter} 創建成功！`);
        navigate(`/tournaments/${tournamentId}/groups`);
      } else {
        message.error(response?.data?.message || '創建失敗');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      console.log('Error details:', error.response?.data);
      console.log('Error status:', error.response?.status);
      console.log('Full error response:', error.response);
      
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || '';
      
      if (status === 500) {
        console.log('500 Error message:', errorMessage);
        if (errorMessage.includes('數據庫表結構未更新')) {
          message.error('數據庫需要更新，請聯繫管理員運行遷移腳本');
        } else {
          message.error(`服務器錯誤：${errorMessage}`);
        }
      } else if (status === 400) {
        message.error(`創建失敗：${errorMessage}`);
      } else if (status === 409) {
        message.error(`小組名稱衝突：${errorMessage}`);
      } else {
        console.error('Final error creating group:', error);
        message.error(error.message || errorMessage || '創建失敗，請重試');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/groups`);
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
          <div>
            <Title level={2} style={{ margin: 0 }}>
              <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
              新增小組
            </Title>
            <Text type="secondary">
              為 {tournament?.tournament_name || `錦標賽 ${tournamentId}`} 創建新的比賽小組
            </Text>
          </div>
        </div>

        <Card>
          <Alert
            message="小組設置說明"
            description="小組名稱使用單個字母（如A、B、C、D），每個小組建議包含3-4支隊伍進行循環賽。系統支持錦標賽專屬小組，您可以在不同錦標賽中使用相同的小組名稱。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              max_teams: 4
            }}
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
                style={{ textTransform: 'uppercase' }}
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
                style={{ width: '100%' }}
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

            <Alert
              message="創建提示"
              description={`創建小組後，您可以在隊伍管理中將隊伍分配到此小組，或在小組詳情頁面中添加隊伍。此小組將專屬於錦標賽「${tournament?.tournament_name || `ID: ${tournamentId}`}」。`}
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
                  創建小組
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

export default TournamentGroupCreate;