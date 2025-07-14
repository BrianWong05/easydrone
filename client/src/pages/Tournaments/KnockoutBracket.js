import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Form,
  InputNumber,
  DatePicker,
  TimePicker,
  message,
  Space,
  Alert,
  Divider,
  Table,
  Tag,
  Row,
  Col,
  Modal,
} from "antd";
import { ArrowLeftOutlined, ThunderboltOutlined, TrophyOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";

const { Title, Text } = Typography;

const KnockoutBracket = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  const [tournament, setTournament] = useState(null);
  const [brackets, setBrackets] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTournament();
    fetchBrackets();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data.tournament);

        // 設置默認值
        form.setFieldsValue({
          team_count: 8,
          match_date: moment().add(1, "day"),
          match_time: moment("14:00", "HH:mm"),
          interval_minutes: 30,
          interval_seconds: 0,
          match_minutes: 10,
          match_seconds: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      message.error("獲取錦標賽信息失敗");
    }
  };

  const fetchBrackets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tournaments/${tournamentId}/bracket`);
      if (response.data.success) {
        setBrackets(response.data.data.rounds || {});
      }
    } catch (error) {
      console.error("Error fetching brackets:", error);
      // 如果沒有淘汰賽數據，不顯示錯誤
    } finally {
      setLoading(false);
    }
  };

  const generateKnockout = async (values) => {
    try {
      setGenerating(true);

      // Use ONLY the date from match_date and ONLY the time from match_time
      const dateOnly = values.match_date.format("YYYY-MM-DD"); // Only date part
      const timeOnly = values.match_time.format("HH:mm:ss");   // Only time part
      const combinedDateTime = `${dateOnly} ${timeOnly}`;      // Combine them
      
      const requestData = {
        team_count: values.team_count,
        match_date: combinedDateTime,
        match_time: (values.match_minutes || 10) * 60 + (values.match_seconds || 0),
        match_interval: (values.interval_minutes || 30) * 60 + (values.interval_seconds || 0),
      };

      console.log("🎯 生成淘汰賽請求:", requestData);

      const response = await axios.post(`/api/tournaments/${tournamentId}/knockout/generate`, requestData);

      if (response.data.success) {
        message.success(response.data.message);

        // 顯示生成結果
        const data = response.data.data;
        message.info(
          `成功生成 ${data.selected_teams} 支隊伍的淘汰賽，共 ${data.total_rounds} 輪 ${data.total_matches} 場比賽`,
        );

        // 重新獲取對戰表
        await fetchBrackets();
      }
    } catch (error) {
      console.error("Error generating knockout:", error);
      const errorMsg = error.response?.data?.message || "生成淘汰賽失敗";
      message.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const deleteAllKnockoutMatches = () => {
    Modal.confirm({
      title: "確認刪除所有淘汰賽",
      content: "確定要刪除所有淘汰賽比賽嗎？此操作將清空整個淘汰賽對戰表，且無法撤銷。",
      okText: "確定刪除",
      cancelText: "取消",
      okType: "danger",
      onOk: async () => {
        try {
          setDeleting(true);
          const response = await axios.delete(`/api/tournaments/${tournamentId}/knockout`);

          if (response.data.success) {
            message.success("所有淘汰賽比賽已刪除");
            setBrackets({});
            await fetchBrackets();
          }
        } catch (error) {
          console.error("Error deleting knockout matches:", error);
          const errorMsg = error.response?.data?.message || "刪除淘汰賽失敗";
          message.error(errorMsg);
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const getTeamCountOptions = () => {
    // 2的冪：2, 4, 8, 16, 32
    return [2, 4, 8, 16, 32];
  };

  const getTournamentTypeInfo = () => {
    if (!tournament) return null;

    switch (tournament.tournament_type) {
      case "mixed":
        return {
          type: "混合賽制",
          description: "將根據小組賽總排名榜選擇前N名隊伍進行淘汰賽",
          color: "blue",
        };
      case "knockout":
        return {
          type: "純淘汰賽",
          description: "將隨機選擇隊伍進行淘汰賽",
          color: "red",
        };
      case "group":
        return {
          type: "小組賽",
          description: "小組賽類型不支持淘汰賽生成",
          color: "default",
        };
      default:
        return null;
    }
  };

  const renderBrackets = () => {
    if (Object.keys(brackets).length === 0) {
      return (
        <Card>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <TrophyOutlined style={{ fontSize: "48px", color: "#ccc", marginBottom: "16px" }} />
            <Title level={4} style={{ color: "#999" }}>
              尚未生成淘汰賽對戰表
            </Title>
            <Text type="secondary">請使用上方的生成功能創建淘汰賽結構</Text>
          </div>
        </Card>
      );
    }

    const rounds = Object.keys(brackets).sort((a, b) => parseInt(a) - parseInt(b));

    return (
      <Card
        title="淘汰賽對戰表"
        extra={
          <Button danger icon={<DeleteOutlined />} onClick={deleteAllKnockoutMatches} loading={deleting}>
            刪除所有淘汰賽
          </Button>
        }
      >
        <Row gutter={16}>
          {rounds.map((roundNum) => {
            const roundMatches = brackets[roundNum];
            const roundName = getRoundName(parseInt(roundNum), rounds.length);

            return (
              <Col key={roundNum} span={24 / rounds.length}>
                <Card size="small" title={roundName} style={{ marginBottom: "16px" }}>
                  {roundMatches.map((match) => (
                    <div
                      key={match.match_id}
                      style={{
                        border: "1px solid #d9d9d9",
                        borderRadius: "4px",
                        padding: "8px",
                        marginBottom: "8px",
                        backgroundColor: match.match_status === "completed" ? "#f6ffed" : "#fafafa",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = match.match_status === "completed" ? "#f0f9ff" : "#e6f7ff";
                        e.target.style.borderColor = "#1890ff";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = match.match_status === "completed" ? "#f6ffed" : "#fafafa";
                        e.target.style.borderColor = "#d9d9d9";
                      }}
                      onClick={() => navigate(`/tournaments/${tournamentId}/matches/${match.match_id}`)}
                      title="點擊查看比賽詳情"
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{match.match_number}</div>
                      <div style={{ fontSize: "12px" }}>
                        {getTeamDisplayName(match, "team1", brackets)} vs {getTeamDisplayName(match, "team2", brackets)}
                      </div>
                      {match.match_status === "completed" && (
                        <>
                          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1890ff", marginTop: "4px" }}>
                            {match.team1_score || 0} : {match.team2_score || 0}
                          </div>
                          <div style={{ fontSize: "12px", color: "#52c41a", marginTop: "2px" }}>
                            勝者: {getDisplayTeamName(match.winner_name)}
                          </div>
                        </>
                      )}
                      <Tag color={getStatusColor(match.match_status)} size="small" style={{ marginTop: "4px" }}>
                        {getStatusText(match.match_status)}
                      </Tag>
                    </div>
                  ))}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  const getRoundName = (roundNum, totalRounds) => {
    const remainingRounds = totalRounds - roundNum + 1;
    switch (remainingRounds) {
      case 1:
        return "決賽";
      case 2:
        return "準決賽";
      case 3:
        return "八強賽";
      case 4:
        return "十六強賽";
      default:
        return `第${roundNum}輪`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "active":
        return "blue";
      case "pending":
        return "orange";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "active":
        return "進行中";
      case "pending":
        return "待開始";
      default:
        return "未知";
    }
  };

  // 獲取隊伍顯示名稱，如果沒有隊伍則顯示來源比賽的勝者
  const getTeamDisplayName = (match, teamPosition, allBrackets) => {
    const teamName = teamPosition === "team1" ? match.team1_name : match.team2_name;

    if (teamName) {
      return getDisplayTeamName(teamName);
    }

    // 如果沒有隊伍名稱，查找來源比賽
    const currentRound = match.round_number;
    if (currentRound === 1) {
      return "TBD"; // 第一輪沒有來源比賽
    }

    // 查找前一輪的比賽
    const previousRound = currentRound - 1;
    const previousRoundMatches = allBrackets[previousRound] || [];

    // 計算來源比賽的位置
    const currentPosition = match.position_in_round;
    let sourcePosition1, sourcePosition2;

    if (teamPosition === "team1") {
      // team1 來自前一輪的奇數位置比賽
      sourcePosition1 = (currentPosition - 1) * 2 + 1;
    } else {
      // team2 來自前一輪的偶數位置比賽
      sourcePosition2 = (currentPosition - 1) * 2 + 2;
    }

    const sourcePosition = sourcePosition1 || sourcePosition2;
    const sourceMatch = previousRoundMatches.find((m) => m.position_in_round === sourcePosition);

    if (sourceMatch && sourceMatch.match_number) {
      return `${sourceMatch.match_number}勝者`;
    }

    return "TBD";
  };

  const typeInfo = getTournamentTypeInfo();

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          style={{ marginBottom: 16 }}
        >
          返回錦標賽詳情
        </Button>
        <Title level={2}>{tournament?.tournament_name} - 淘汰賽對戰表</Title>
      </div>

      {typeInfo && (
        <Alert
          message={`錦標賽類型：${typeInfo.type}`}
          description={typeInfo.description}
          type={tournament?.tournament_type === "group" ? "warning" : "info"}
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      {tournament?.tournament_type !== "group" && (
        <Card title="生成淘汰賽" style={{ marginBottom: 24 }}>
          <Form form={form} layout="vertical" onFinish={generateKnockout}>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  label="參賽隊伍數量"
                  name="team_count"
                  rules={[{ required: true, message: "請選擇參賽隊伍數量" }]}
                >
                  <InputNumber min={2} max={32} style={{ width: "100%" }} placeholder="必須是2的冪" />
                </Form.Item>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "-16px", marginBottom: "16px" }}>
                  可選: {getTeamCountOptions().join(", ")}
                </div>
              </Col>
              <Col span={6}>
                <Form.Item label="比賽日期" name="match_date" rules={[{ required: true, message: "請選擇比賽日期" }]}>
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="開始時間" name="match_time" rules={[{ required: true, message: "請選擇開始時間" }]}>
                  <TimePicker style={{ width: "100%" }} format="HH:mm" />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item
                  label="比賽時長（分鐘）"
                  name="match_minutes"
                  rules={[{ required: true, message: "請輸入分鐘" }]}
                >
                  <InputNumber min={1} max={60} style={{ width: "100%" }} placeholder="分鐘" />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item
                  label="比賽時長（秒）"
                  name="match_seconds"
                  rules={[{ required: true, message: "請輸入秒數" }]}
                >
                  <InputNumber min={0} max={59} style={{ width: "100%" }} placeholder="秒" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: "16px" }}>
              <Col span={6}>
                <Form.Item
                  label="比賽間隔（分鐘）"
                  name="interval_minutes"
                  rules={[{ required: true, message: "請輸入間隔分鐘" }]}
                >
                  <InputNumber min={0} max={120} style={{ width: "100%" }} placeholder="分鐘" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="比賽間隔（秒）"
                  name="interval_seconds"
                  rules={[{ required: true, message: "請輸入間隔秒數" }]}
                >
                  <InputNumber min={0} max={59} style={{ width: "100%" }} placeholder="秒" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <div style={{ padding: "8px 0", color: "#666" }}>
                  <Text type="secondary">
                    比賽間隔：每場比賽之間的時間間隔，用於準備和清場
                  </Text>
                </div>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<ThunderboltOutlined />}
                  loading={generating}
                  size="large"
                >
                  生成淘汰賽對戰表
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Divider />

      {renderBrackets()}
    </div>
  );
};

export default KnockoutBracket;
