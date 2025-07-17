import React, { useState } from "react";
import {
  Card,
  Typography,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  message,
  Row,
  Col,
  Alert,
  Divider,
} from "antd";
import { TrophyOutlined, SaveOutlined, ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import moment from "moment";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const TournamentCreate = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['tournament', 'common']);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  // 提交表單
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      console.log("Form values:", values); // Debug log

      const formData = {
        tournament_name: values.tournament_name,
        tournament_type: values.tournament_type,
        start_date: values.dateRange?.[0]?.format("YYYY-MM-DD") || null,
        end_date: values.dateRange?.[1]?.format("YYYY-MM-DD") || null,
      };

      console.log("Sending data:", formData); // Debug log
      const response = await axios.post("/api/tournaments", formData);

      if (response.data.success) {
        message.success(t('tournament:messages.tournamentCreated'));
        navigate("/");
      } else {
        message.error(response.data.message || t('common:messages.operationFailed'));
      }
    } catch (error) {
      console.error("創建錦標賽失敗:", error);
      console.log("Error details:", error.response?.data); // Debug log
      message.error(error.response?.data?.message || t('common:messages.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 錦標賽類型說明
  const getTypeDescription = (type) => {
    const descriptions = {
      group: {
        title: t('tournament:create.typeDescriptions.group.title'),
        description: t('tournament:create.typeDescriptions.group.description'),
        features: t('tournament:create.typeDescriptions.group.features', { returnObjects: true }),
      },
      knockout: {
        title: t('tournament:create.typeDescriptions.knockout.title'),
        description: t('tournament:create.typeDescriptions.knockout.description'),
        features: t('tournament:create.typeDescriptions.knockout.features', { returnObjects: true }),
      },
      mixed: {
        title: t('tournament:create.typeDescriptions.mixed.title'),
        description: t('tournament:create.typeDescriptions.mixed.description'),
        features: t('tournament:create.typeDescriptions.mixed.features', { returnObjects: true }),
      },
    };

    return descriptions[type];
  };

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <Title level={2}>
            <TrophyOutlined className="mr-2 text-yellow-500" />
            {t('tournament:create.title')}
          </Title>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
            {t('tournament:create.backToList')}
          </Button>
        </div>

        <Row gutter={24}>
          <Col xs={24} lg={16}>
            {/* 基本信息表單 */}
            <Card title={t('tournament:create.basicInfo')} className="mb-6">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  tournament_type: "mixed",
                }}
              >
                <Form.Item
                  name="tournament_name"
                  label={t('tournament:create.tournamentName')}
                  rules={[
                    { required: true, message: t('tournament:create.validation.nameRequired') },
                    { min: 2, message: t('tournament:create.validation.nameMinLength') },
                    { max: 100, message: t('tournament:create.validation.nameMaxLength') },
                  ]}
                >
                  <Input placeholder={t('tournament:create.validation.namePlaceholder')} size="large" />
                </Form.Item>

                <Form.Item
                  name="tournament_type"
                  label={t('tournament:create.tournamentType')}
                  rules={[{ required: true, message: t('tournament:create.validation.typeRequired') }]}
                >
                  <Select placeholder={t('tournament:create.validation.typeRequired')} size="large" onChange={setSelectedType}>
                    <Option value="group">
                      <Space>
                        <span>🏆</span>
                        <span>{t('tournament:types.groupStage')}</span>
                      </Space>
                    </Option>
                    <Option value="knockout">
                      <Space>
                        <span>⚔️</span>
                        <span>{t('tournament:types.knockout')}</span>
                      </Space>
                    </Option>
                    <Option value="mixed">
                      <Space>
                        <span>🎯</span>
                        <span>{t('tournament:types.mixed')}</span>
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>

                <Form.Item name="dateRange" label={t('tournament:create.competitionDates')}>
                  <RangePicker
                    className="w-full"
                    size="large"
                    placeholder={[t('tournament:create.startDate'), t('tournament:create.endDate')]}
                    disabledDate={(current) => current && current < moment().startOf("day")}
                  />
                </Form.Item>

                <Divider />

                <Form.Item className="mb-0">
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} size="large">
                      {t('tournament:create.createTournament')}
                    </Button>
                    <Button onClick={() => navigate("/")} size="large">
                      {t('tournament:create.cancel')}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            {/* 賽制說明 */}
            <Card title={t('tournament:create.formatDescription')} className="mb-6">
              {selectedType ? (
                <div>
                  <Title level={4} className="text-blue-500 mb-2">
                    {getTypeDescription(selectedType).title}
                  </Title>
                  <Text type="secondary" className="mb-4 block">
                    {getTypeDescription(selectedType).description}
                  </Text>
                  <div>
                    <Text strong>{t('tournament:create.features')}：</Text>
                    <ul className="mt-2 pl-5">
                      {getTypeDescription(selectedType).features.map((feature, index) => (
                        <li key={index} className="mb-1">
                          <Text>{feature}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <InfoCircleOutlined className="text-5xl text-gray-300 mb-4" />
                  <Text type="secondary">{t('tournament:create.selectTypePrompt')}</Text>
                </div>
              )}
            </Card>

            {/* 創建提示 */}
            <Alert
              message={t('tournament:create.tips.title')}
              description={
                <div>
                  <p>• {t('tournament:create.tips.addTeams')}</p>
                  <p>• {t('tournament:create.tips.groupStage')}</p>
                  <p>• {t('tournament:create.tips.knockout')}</p>
                  <p>• {t('tournament:create.tips.mixed')}</p>
                </div>
              }
              type="info"
              showIcon
            />
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default TournamentCreate;
