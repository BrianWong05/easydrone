import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';

const { Title, Text } = Typography;

const LoginPage = () => {
  const { t } = useTranslation(['auth', 'common']);
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
        setError(result.message || t('auth:login.loginFailed'));
      }
    } catch (err) {
      setError(t('auth:login.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-5">
      {/* Language Switcher - positioned at top right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl">
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <Title level={2} className="mb-2">
              {t('auth:login.title')}
            </Title>
            <Text type="secondary">{t('auth:login.subtitle')}</Text>
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
                  message: t('auth:login.usernameRequired'),
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder={t('auth:login.usernamePlaceholder')}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                {
                  required: true,
                  message: t('auth:login.passwordRequired'),
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth:login.passwordPlaceholder')}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full"
              >
                {t('auth:login.loginButton')}
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text type="secondary" className="text-xs">
              {t('auth:login.systemVersion')}
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default LoginPage;