import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, Space, InputNumber, message, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const GroupCreate = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 模擬API調用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('新增小組數據:', values);
      message.success('小組創建成功！');
      navigate('/groups');
    } catch (error) {
      message.error('創建失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/groups');
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
          <Title level={2} style={{ margin: 0 }}>新增小組</Title>
        </div>

        <Card>
          <Alert
            message="小組設置說明"
            description="小組名稱通常使用單個字母（如A、B、C、D），每個小組建議包含3-4支隊伍進行循環賽。"
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
              description="創建小組後，您可以在隊伍管理中將隊伍分配到此小組，或在小組詳情頁面中添加隊伍。"
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

export default GroupCreate;