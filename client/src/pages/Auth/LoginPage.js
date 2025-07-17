import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await login(values);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.message || '登入失敗');
      }
    } catch (err) {
      setError('登入過程中發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-5">
      <Card className="w-full max-w-md shadow-2xl">
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <Title level={2} className="mb-2">
              無人機足球系統
            </Title>
            <Text type="secondary">請登入您的帳號</Text>
          </div>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError('')}
            />
          )}

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                {
                  required: true,
                  message: '請輸入用戶名！',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用戶名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                {
                  required: true,
                  message: '請輸入密碼！',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密碼"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full"
              >
                登入
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text type="secondary" className="text-xs">
              無人機足球比賽管理系統 v1.0
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;