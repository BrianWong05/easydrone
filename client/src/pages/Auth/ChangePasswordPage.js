import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

const ChangePasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.put('/api/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });

      if (response.data.success) {
        toast.success('密碼修改成功！請重新登入');
        // 登出用戶，要求重新登入
        logout();
        navigate('/login');
      }
    } catch (err) {
      const message = err.response?.data?.message || '密碼修改失敗';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const validateConfirmPassword = (_, value) => {
    if (!value || form.getFieldValue('newPassword') === value) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('兩次輸入的密碼不一致！'));
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              修改密碼
            </Title>
            <Text type="secondary">
              用戶: {user?.username}
            </Text>
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
            form={form}
            name="changePassword"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              label="目前密碼"
              name="currentPassword"
              rules={[
                {
                  required: true,
                  message: '請輸入目前密碼！',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="請輸入目前密碼"
              />
            </Form.Item>

            <Form.Item
              label="新密碼"
              name="newPassword"
              rules={[
                {
                  required: true,
                  message: '請輸入新密碼！',
                },
                {
                  min: 6,
                  message: '密碼至少需要6個字符！',
                },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder="請輸入新密碼（至少6個字符）"
              />
            </Form.Item>

            <Form.Item
              label="確認新密碼"
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                {
                  required: true,
                  message: '請確認新密碼！',
                },
                {
                  validator: validateConfirmPassword,
                },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder="請再次輸入新密碼"
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%' }} direction="vertical">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  修改密碼
                </Button>
                <Button
                  type="default"
                  onClick={() => navigate(-1)}
                  style={{ width: '100%' }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              修改密碼後需要重新登入
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;