import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  message,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['tournament', 'common']);
  const [form] = Form.useForm();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasRelatedData, setHasRelatedData] = useState(false);
  const [knockoutMatches, setKnockoutMatches] = useState(0);
  const [groupMatches, setGroupMatches] = useState(0);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tournaments/${id}`);
      
      if (response.data.success) {
        const tournamentData = response.data.data.tournament;
        setTournament(tournamentData);
        
        // 檢查是否有相關數據
        const hasGroups = response.data.data.groups?.length > 0;
        const hasTeams = response.data.data.teams?.length > 0;
        const allMatches = response.data.data.matches || [];
        const groupMatchCount = allMatches.filter(m => m.match_type === 'group').length;
        const knockoutMatchCount = allMatches.filter(m => m.match_type === 'knockout').length;
        
        setGroupMatches(groupMatchCount);
        setKnockoutMatches(knockoutMatchCount);
        setHasRelatedData(hasGroups || hasTeams || allMatches.length > 0);
        
        // 設置表單初始值
        form.setFieldsValue({
          tournament_name: tournamentData.tournament_name,
          tournament_type: tournamentData.tournament_type,
          start_date: moment(tournamentData.start_date),
          end_date: moment(tournamentData.end_date)
        });
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      message.error(t('common:messages.dataLoadFailed'));
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      
      const updateData = {
        tournament_name: values.tournament_name,
        tournament_type: values.tournament_type,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD')
      };

      const response = await axios.put(`/api/tournaments/${id}`, updateData);
      
      if (response.data.success) {
        message.success(t('tournament:messages.tournamentUpdated'));
        navigate(`/tournaments/${id}`);
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      const errorMsg = error.response?.data?.message || t('common:messages.operationFailed');
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const getTournamentTypeInfo = (type) => {
    switch (type) {
      case 'group':
        return {
          title: t('tournament:create.typeDescriptions.group.title'),
          description: t('tournament:create.typeDescriptions.group.description'),
          features: t('tournament:create.typeDescriptions.group.features', { returnObjects: true })
        };
      case 'knockout':
        return {
          title: t('tournament:create.typeDescriptions.knockout.title'),
          description: t('tournament:create.typeDescriptions.knockout.description'),
          features: t('tournament:create.typeDescriptions.knockout.features', { returnObjects: true })
        };
      case 'mixed':
        return {
          title: t('tournament:create.typeDescriptions.mixed.title'),
          description: t('tournament:create.typeDescriptions.mixed.description'),
          features: t('tournament:create.typeDescriptions.mixed.features', { returnObjects: true })
        };
      default:
        return null;
    }
  };

  const getTournamentTypeChangeInfo = () => {
    if (!tournament) return null;

    const currentType = tournament.tournament_type;
    const selectedType = form.getFieldValue('tournament_type');

    if (currentType === selectedType) return null;

    // 小組賽制 → 混合賽制：總是允許
    if (currentType === 'group' && selectedType === 'mixed') {
      return {
        allowed: true,
        type: 'success',
        message: `✅ ${t('tournament:edit.typeChangeMessages.groupToMixed')}`,
        description: t('tournament:edit.typeChangeMessages.groupToMixedDesc')
      };
    }

    // 混合賽制 → 小組賽制：只有在沒有淘汰賽比賽時才允許
    if (currentType === 'mixed' && selectedType === 'group') {
      if (knockoutMatches > 0) {
        return {
          allowed: false,
          type: 'error',
          message: `❌ ${t('tournament:edit.typeChangeMessages.mixedToGroupBlocked')}`,
          description: t('tournament:edit.typeChangeMessages.mixedToGroupBlockedDesc', { count: knockoutMatches })
        };
      } else {
        return {
          allowed: true,
          type: 'warning',
          message: `⚠️ ${t('tournament:edit.typeChangeMessages.mixedToGroupAllowed')}`,
          description: t('tournament:edit.typeChangeMessages.mixedToGroupAllowedDesc')
        };
      }
    }

    // 其他變更：使用原有的嚴格規則
    if (hasRelatedData) {
      return {
        allowed: false,
        type: 'error',
        message: `❌ ${t('tournament:edit.typeChangeMessages.hasRelatedData')}`,
        description: t('tournament:edit.typeChangeMessages.hasRelatedDataDesc')
      };
    }

    return {
      allowed: true,
      type: 'info',
      message: `✅ ${t('tournament:edit.typeChangeMessages.noRelatedData')}`,
      description: t('tournament:edit.typeChangeMessages.noRelatedDataDesc')
    };
  };

  const isTournamentTypeChangeAllowed = () => {
    const changeInfo = getTournamentTypeChangeInfo();
    return changeInfo ? changeInfo.allowed : true;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Spin size="large" />
        <div className="mt-4">
          <Text>{t('tournament:edit.loading')}</Text>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-6 text-center">
        <Text type="danger">{t('tournament:edit.notFound')}</Text>
      </div>
    );
  }

  // 檢查是否可以編輯
  const canEdit = tournament.status === 'pending';

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${id}`)}
          className="mb-4"
        >
          {t('tournament:edit.backToDetail')}
        </Button>
        <Title level={2}>
          <EditOutlined /> {t('tournament:edit.title')}
        </Title>
        <Text type="secondary">{t('tournament:edit.subtitle')}</Text>
      </div>

      {!canEdit && (
        <Alert
          message={t('tournament:edit.cannotEdit')}
          description={t('tournament:edit.cannotEditDescription')}
          type="warning"
          className="mb-6"
          showIcon
        />
      )}

      {(() => {
        const changeInfo = getTournamentTypeChangeInfo();
        if (!changeInfo) return null;
        
        return (
          <Alert
            message={t('tournament:edit.typeChange')}
            description={
              <div>
                <div className="mb-2">{changeInfo.message}</div>
                <div className="text-xs text-gray-600">{changeInfo.description}</div>
                {groupMatches > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    📊 {t('tournament:edit.typeChangeMessages.groupMatches', { count: groupMatches })}
                  </div>
                )}
                {knockoutMatches > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    🏆 {t('tournament:edit.typeChangeMessages.knockoutMatches', { count: knockoutMatches })}
                  </div>
                )}
              </div>
            }
            type={changeInfo.type}
            className="mb-6"
            showIcon
          />
        );
      })()}

      <Row gutter={24}>
        <Col span={16}>
          <Card title={t('tournament:edit.tournamentInfo')}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              disabled={!canEdit}
            >
              <Form.Item
                label={t('tournament:create.tournamentName')}
                name="tournament_name"
                rules={[
                  { required: true, message: t('tournament:edit.validation.nameRequired') },
                  { min: 2, message: t('tournament:edit.validation.nameMinLength') },
                  { max: 100, message: t('tournament:edit.validation.nameMaxLength') }
                ]}
              >
                <Input 
                  placeholder={t('tournament:edit.validation.namePlaceholder')}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label={t('tournament:create.tournamentType')}
                name="tournament_type"
                rules={[{ required: true, message: t('tournament:edit.validation.typeRequired') }]}
              >
                <Select 
                  placeholder={t('tournament:edit.validation.typePlaceholder')}
                  size="large"
                  disabled={!isTournamentTypeChangeAllowed()}
                >
                  <Option value="group">
                    <div>
                      <div className="font-bold">{t('tournament:edit.typeOptions.groupTitle')}</div>
                      <div className="text-xs text-gray-600">
                        {t('tournament:edit.typeOptions.groupDesc')}
                      </div>
                    </div>
                  </Option>
                  <Option value="knockout">
                    <div>
                      <div className="font-bold">{t('tournament:edit.typeOptions.knockoutTitle')}</div>
                      <div className="text-xs text-gray-600">
                        {t('tournament:edit.typeOptions.knockoutDesc')}
                      </div>
                    </div>
                  </Option>
                  <Option value="mixed">
                    <div>
                      <div className="font-bold">{t('tournament:edit.typeOptions.mixedTitle')}</div>
                      <div className="text-xs text-gray-600">
                        {t('tournament:edit.typeOptions.mixedDesc')}
                      </div>
                    </div>
                  </Option>
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={t('tournament:create.startDate')}
                    name="start_date"
                    rules={[{ required: true, message: t('tournament:edit.validation.startDateRequired') }]}
                  >
                    <DatePicker 
                      className="w-full"
                      size="large"
                      placeholder={t('tournament:edit.validation.startDatePlaceholder')}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={t('tournament:create.endDate')}
                    name="end_date"
                    rules={[
                      { required: true, message: t('tournament:edit.validation.endDateRequired') },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || !getFieldValue('start_date')) {
                            return Promise.resolve();
                          }
                          if (value.isBefore(getFieldValue('start_date'))) {
                            return Promise.reject(new Error(t('tournament:edit.validation.endDateAfterStart')));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <DatePicker 
                      className="w-full"
                      size="large"
                      placeholder={t('tournament:edit.validation.endDatePlaceholder')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {canEdit && (
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saving}
                      size="large"
                    >
                      {t('tournament:edit.saveChanges')}
                    </Button>
                    <Button
                      onClick={() => navigate(`/tournaments/${id}`)}
                      size="large"
                    >
                      {t('tournament:edit.cancel')}
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title={t('tournament:edit.tournamentStatus')}>
            <Space direction="vertical" className="w-full">
              <div>
                <Text strong>{t('tournament:edit.currentStatus')}：</Text>
                <br />
                <Text>
                  {tournament.status === 'pending' && t('tournament:detail.status.pending')}
                  {tournament.status === 'active' && t('tournament:detail.status.active')}
                  {tournament.status === 'completed' && t('tournament:detail.status.completed')}
                </Text>
              </div>
              
              <div>
                <Text strong>{t('tournament:edit.createdAt')}：</Text>
                <br />
                <Text>{moment(tournament.created_at).format('YYYY-MM-DD HH:mm')}</Text>
              </div>
              
              {tournament.updated_at && (
                <div>
                  <Text strong>{t('tournament:edit.lastUpdated')}：</Text>
                  <br />
                  <Text>{moment(tournament.updated_at).format('YYYY-MM-DD HH:mm')}</Text>
                </div>
              )}
            </Space>
          </Card>

          {form.getFieldValue('tournament_type') && (
            <Card title={t('tournament:edit.formatDescription')} className="mt-4">
              {(() => {
                const typeInfo = getTournamentTypeInfo(form.getFieldValue('tournament_type'));
                if (!typeInfo) return null;
                
                return (
                  <Space direction="vertical" className="w-full">
                    <div>
                      <Text strong>{typeInfo.title}</Text>
                    </div>
                    <div>
                      <Text type="secondary">{typeInfo.description}</Text>
                    </div>
                    <div>
                      <Text strong>{t('tournament:edit.features')}：</Text>
                      <ul className="my-2 pl-5">
                        {typeInfo.features.map((feature, index) => (
                          <li key={index}>
                            <Text type="secondary">{feature}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Space>
                );
              })()}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TournamentEdit;