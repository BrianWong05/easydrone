import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Space, InputNumber, message, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title, Text } = Typography;

const TournamentGroupCreate = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const { t } = useTranslation(['group', 'common']);
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
        message.warning(t('group:create.canStillCreate'));
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      console.log('Tournament fetch error details:', error.response?.data);
      if (error.response?.status === 404) {
        message.warning(t('group:create.tournamentNotFound'));
      } else {
        message.error(t('common:messages.loadFailed'));
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
        description: values.description || `${t('tournament:tournament')} ${tournamentId} - ${t('group:group.name')} ${userLetter}`
      });
      if (response && response.data.success) {
        message.success(t('group:messages.groupCreated'));
        navigate(`/tournaments/${tournamentId}/groups`);
      } else {
        message.error(response?.data?.message || t('common:messages.operationFailed'));
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
          message.error(t('group:create.databaseUpdateNeeded'));
        } else {
          message.error(`${t('common:messages.error')}: ${errorMessage}`);
        }
      } else if (status === 400) {
        message.error(`${t('common:messages.operationFailed')}: ${errorMessage}`);
      } else if (status === 409) {
        message.error(`${t('group:create.nameConflict')}: ${errorMessage}`);
      } else {
        console.error('Final error creating group:', error);
        message.error(error.message || errorMessage || t('common:messages.operationFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/groups`);
  };

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        <div className="flex items-center gap-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
          >
            {t('common:buttons.back')}
          </Button>
          <div>
            <Title level={2} className="m-0">
              <TrophyOutlined className="mr-2 text-yellow-500" />
              {t('group:create.title')}
            </Title>
            <Text type="secondary">
              {t('group:create.subtitle', { 
                tournamentName: tournament?.tournament_name || `${t('tournament:tournament')} ${tournamentId}` 
              })}
            </Text>
          </div>
        </div>

        <Card>
          <Alert
            message={t('group:create.setupNotice')}
            description={t('group:create.setupNoticeDescription')}
            type="info"
            showIcon
            className="mb-6"
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
              label={t('group:group.name')}
              name="group_name"
              rules={[
                { required: true, message: t('group:placeholders.enterGroupName') },
                { pattern: /^[A-Z]$/, message: t('group:create.validation.namePattern') }
              ]}
            >
              <Input 
                placeholder={t('group:create.namePlaceholder')}
                size="large"
                maxLength={1}
                className="uppercase"
                onChange={(e) => {
                  const upperValue = e.target.value.toUpperCase();
                  form.setFieldsValue({ group_name: upperValue });
                }}
              />
            </Form.Item>

            <Form.Item
              label={t('group:group.maxTeams')}
              name="max_teams"
              rules={[
                { required: true, message: t('group:create.validation.maxTeamsRequired') },
                { type: 'number', min: 2, max: 8, message: t('group:create.validation.maxTeamsRange') }
              ]}
            >
              <InputNumber 
                placeholder={t('group:create.maxTeamsPlaceholder')}
                size="large"
                min={2}
                max={8}
                className="w-full"
                addonAfter={t('group:create.teamsUnit')}
              />
            </Form.Item>

            <Form.Item
              label={t('group:group.description')}
              name="description"
            >
              <Input.TextArea 
                placeholder={t('group:placeholders.enterDescription')}
                rows={4}
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Alert
              message={t('group:create.createTip')}
              description={t('group:create.createTipDescription', { 
                tournamentName: tournament?.tournament_name || `ID: ${tournamentId}` 
              })}
              type="success"
              showIcon
              className="mb-6"
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
                  {t('group:create.createGroup')}
                </Button>
                <Button 
                  onClick={handleCancel}
                  size="large"
                >
                  {t('common:buttons.cancel')}
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