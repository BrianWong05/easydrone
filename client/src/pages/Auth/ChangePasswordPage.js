import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

const ChangePasswordPage = () => {
  const { t } = useTranslation(['auth', 'common']);
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
        toast.success(t('auth:changePassword.changePasswordSuccess'));
        // 登出用戶，要求重新登入
        logout();
        navigate('/login');
      }
    } catch (err) {
      const message = err.response?.data?.message || t('auth:changePassword.changePasswordFailed');
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
    return Promise.reject(new Error(t('auth:changePassword.passwordMismatch')));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-5">
      <Card className="w-full max-w-lg shadow-2xl">
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <Title level={2} className="mb-2">
              {t('auth:changePassword.title')}
            </Title>
            <Text type="secondary">
              {t('auth:changePassword.currentUser', { username: user?.username })}
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
              label={t('auth:changePassword.currentPassword')}
              name="currentPassword"
              rules={[
                {
                  required: true,
                  message: t('auth:changePassword.currentPasswordRequired'),
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth:changePassword.currentPasswordPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              label={t('auth:changePassword.newPassword')}
              name="newPassword"
              rules={[
                {
                  required: true,
                  message: t('auth:changePassword.newPasswordRequired'),
                },
                {
                  min: 6,
                  message: t('auth:changePassword.passwordMinLength'),
                },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder={t('auth:changePassword.newPasswordPlaceholder')}
              />
            </Form.Item>

            <Form.Item
              label={t('auth:changePassword.confirmPassword')}
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                {
                  required: true,
                  message: t('auth:changePassword.confirmPasswordRequired'),
                },
                {
                  validator: validateConfirmPassword,
                },
              ]}
            >
              <Input.Password
                prefix={<KeyOutlined />}
                placeholder={t('auth:changePassword.confirmPasswordPlaceholder')}
              />
            </Form.Item>

            <Form.Item>
              <Space className="w-full" direction="vertical">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="w-full"
                >
                  {t('auth:changePassword.changePasswordButton')}
                </Button>
                <Button
                  type="default"
                  onClick={() => navigate(-1)}
                  className="w-full"
                >
                  {t('auth:changePassword.cancel')}
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <div className="text-center">
            <Text type="secondary" className="text-xs">
              {t('auth:changePassword.loginRequiredAfterChange')}
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;