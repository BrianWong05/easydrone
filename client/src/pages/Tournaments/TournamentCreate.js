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
import axios from "axios";
import moment from "moment";

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const TournamentCreate = () => {
  const navigate = useNavigate();
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
        message.success("錦標賽創建成功！");
        navigate("/");
      } else {
        message.error(response.data.message || "創建錦標賽失敗");
      }
    } catch (error) {
      console.error("創建錦標賽失敗:", error);
      console.log("Error details:", error.response?.data); // Debug log
      message.error(error.response?.data?.message || "創建錦標賽失敗");
    } finally {
      setLoading(false);
    }
  };

  // 錦標賽類型說明
  const getTypeDescription = (type) => {
    const descriptions = {
      group: {
        title: "小組賽制",
        description: "隊伍分組進行循環賽，每組前幾名晉級下一階段。適合參賽隊伍較多的情況。",
        features: ["分組循環賽", "積分排名", "小組出線"],
      },
      knockout: {
        title: "淘汰賽制",
        description: "單場淘汰制，敗者直接出局。比賽節奏快，適合決定最終冠軍。",
        features: ["單場淘汰", "勝者晉級", "快速決出冠軍"],
      },
      mixed: {
        title: "混合賽制",
        description: "結合小組賽和淘汰賽，先進行小組賽選出晉級隊伍，再進行淘汰賽決出冠軍。",
        features: ["小組賽+淘汰賽", "兩階段比賽", "最完整的賽制"],
      },
    };

    return descriptions[type];
  };

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 頁面標題 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Title level={2}>
            <TrophyOutlined style={{ marginRight: 8, color: "#faad14" }} />
            新增錦標賽
          </Title>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/")}>
            返回列表
          </Button>
        </div>

        <Row gutter={24}>
          <Col xs={24} lg={16}>
            {/* 基本信息表單 */}
            <Card title="基本信息" style={{ marginBottom: 24 }}>
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
                  label="錦標賽名稱"
                  rules={[
                    { required: true, message: "請輸入錦標賽名稱" },
                    { min: 2, message: "錦標賽名稱至少需要2個字符" },
                    { max: 100, message: "錦標賽名稱不能超過100個字符" },
                  ]}
                >
                  <Input placeholder="請輸入錦標賽名稱，例如：2024年春季無人機足球錦標賽" size="large" />
                </Form.Item>

                <Form.Item
                  name="tournament_type"
                  label="錦標賽類型"
                  rules={[{ required: true, message: "請選擇錦標賽類型" }]}
                >
                  <Select placeholder="請選擇錦標賽類型" size="large" onChange={setSelectedType}>
                    <Option value="group">
                      <Space>
                        <span>🏆</span>
                        <span>小組賽制</span>
                      </Space>
                    </Option>
                    <Option value="knockout">
                      <Space>
                        <span>⚔️</span>
                        <span>淘汰賽制</span>
                      </Space>
                    </Option>
                    <Option value="mixed">
                      <Space>
                        <span>🎯</span>
                        <span>混合賽制</span>
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>

                <Form.Item name="dateRange" label="比賽日期（可選）">
                  <RangePicker
                    style={{ width: "100%" }}
                    size="large"
                    placeholder={["開始日期", "結束日期"]}
                    disabledDate={(current) => current && current < moment().startOf("day")}
                  />
                </Form.Item>

                <Divider />

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space>
                    <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} size="large">
                      創建錦標賽
                    </Button>
                    <Button onClick={() => navigate("/")} size="large">
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            {/* 賽制說明 */}
            <Card title="賽制說明" style={{ marginBottom: 24 }}>
              {selectedType ? (
                <div>
                  <Title level={4} style={{ color: "#1890ff", marginBottom: 8 }}>
                    {getTypeDescription(selectedType).title}
                  </Title>
                  <Text type="secondary" style={{ marginBottom: 16, display: "block" }}>
                    {getTypeDescription(selectedType).description}
                  </Text>
                  <div>
                    <Text strong>特點：</Text>
                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                      {getTypeDescription(selectedType).features.map((feature, index) => (
                        <li key={index} style={{ marginBottom: 4 }}>
                          <Text>{feature}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <InfoCircleOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                  <Text type="secondary">請選擇錦標賽類型查看詳細說明</Text>
                </div>
              )}
            </Card>

            {/* 創建提示 */}
            <Alert
              message="創建提示"
              description={
                <div>
                  <p>• 錦標賽創建後可以添加參賽隊伍</p>
                  <p>• 小組賽需要先創建小組並分配隊伍</p>
                  <p>• 淘汰賽可以直接生成對戰圖表</p>
                  <p>• 混合賽制結合了兩種賽制的優點</p>
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
