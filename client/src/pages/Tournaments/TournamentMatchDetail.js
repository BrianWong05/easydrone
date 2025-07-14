import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Descriptions,
  Table,
  Spin,
  message,
  Row,
  Col,
  Statistic,
  Timeline,
  Modal,
} from "antd";
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  EditOutlined,
  CalendarOutlined,
  TrophyOutlined,
  TeamOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import axios from "axios";
import { formatMatchDuration } from "../../utils/timeUtils";
import { getMatchTypeText } from "../../utils/matchUtils";

const { Title, Text } = Typography;

const MatchDetail = () => {
  const navigate = useNavigate();
  const { id: tournamentId, matchId } = useParams();
  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetchMatchDetail();
  }, [matchId]);

  const fetchMatchDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/matches/${matchId}`);

      if (response.data.success) {
        setMatchData(response.data.data.match);
        setEvents(response.data.data.events || []);
      } else {
        message.error("獲取比賽詳情失敗");
        navigate(`/tournaments/${tournamentId}/matches`);
      }
    } catch (error) {
      console.error("獲取比賽詳情錯誤:", error);
      message.error("獲取比賽詳情失敗");
      navigate(`/tournaments/${tournamentId}/matches`);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/tournaments/${tournamentId}/matches`);
  };

  const handleEdit = () => {
    navigate(`/tournaments/${tournamentId}/matches/${matchId}/edit`);
  };

  const handleStartMatch = () => {
    navigate(`/tournaments/${tournamentId}/matches/${matchId}/live`);
  };

  const handleDeleteMatch = () => {
    Modal.confirm({
      title: "確認刪除",
      content: `確定要刪除比賽 "${matchData.match_number}" 嗎？此操作無法撤銷。`,
      okText: "確認刪除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/matches/${matchId}`);

          if (response.data.success) {
            message.success("比賽刪除成功！");
            navigate(`/tournaments/${tournamentId}/matches`);
          } else {
            message.error(response.data.message || "刪除失敗");
          }
        } catch (error) {
          console.error("刪除比賽錯誤:", error);
          if (error.response?.data?.message) {
            message.error(error.response.data.message);
          } else {
            message.error("刪除失敗，請重試");
          }
        }
      },
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "orange";
      case "active":
        return "blue";
      case "completed":
        return "green";
      case "overtime":
        return "purple";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "待開始";
      case "active":
        return "進行中";
      case "completed":
        return "已完成";
      case "overtime":
        return "延長賽";
      default:
        return status;
    }
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "goal":
        return "⚽";
      case "foul":
        return "🟨";
      case "timeout":
        return "⏰";
      case "penalty":
        return "🟥";
      case "substitution":
        return "🔄";
      default:
        return "📝";
    }
  };

  const getEventText = (eventType) => {
    switch (eventType) {
      case "goal":
        return "進球";
      case "foul":
        return "犯規";
      case "timeout":
        return "暫停";
      case "penalty":
        return "點球";
      case "substitution":
        return "換人";
      default:
        return "其他";
    }
  };

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return "";
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  // 清理小組名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return "";
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (groupName.endsWith(suffix)) {
      return groupName.slice(0, -suffix.length);
    }
    return groupName;
  };

  // 獲取隊伍顯示名稱，如果沒有隊伍則顯示來源比賽的勝者
  const getTeamDisplayName = (teamPosition) => {
    if (!matchData) return "待定";

    const teamName = teamPosition === "team1" ? matchData.team1_name : matchData.team2_name;

    if (teamName) {
      // 移除隊伍名稱中的錦標賽ID後綴（例如：TeamName_1 -> TeamName）
      return getDisplayTeamName(teamName);
    }

    // 如果沒有隊伍名稱且是淘汰賽，動態生成來源比賽的勝者顯示
    if (matchData.match_type === "knockout" && matchData.match_number) {
      return getKnockoutWinnerReference(matchData.match_number, teamPosition);
    }

    return "待定";
  };

  // 動態生成淘汰賽勝者引用
  const getKnockoutWinnerReference = (matchNumber, teamPosition) => {
    if (!matchNumber) return "待定";
    
    const matchNum = matchNumber.toUpperCase();
    
    // 定義淘汰賽進階映射
    const knockoutProgression = {
      // 決賽 (Finals) - 來自準決賽
      'FI01': { team1: 'SE01', team2: 'SE02' },
      'FI02': { team1: 'SE03', team2: 'SE04' },
      
      // 季軍賽 (Third Place) - 來自準決賽敗者
      'TP01': { team1: 'SE01', team2: 'SE02' },
      
      // 準決賽 (Semifinals) - 來自八強
      'SE01': { team1: 'QU01', team2: 'QU02' },
      'SE02': { team1: 'QU03', team2: 'QU04' },
      'SE03': { team1: 'QU05', team2: 'QU06' },
      'SE04': { team1: 'QU07', team2: 'QU08' },
      
      // 八強 (Quarterfinals) - 來自十六強
      'QU01': { team1: 'R16_01', team2: 'R16_02' },
      'QU02': { team1: 'R16_03', team2: 'R16_04' },
      'QU03': { team1: 'R16_05', team2: 'R16_06' },
      'QU04': { team1: 'R16_07', team2: 'R16_08' },
      'QU05': { team1: 'R16_09', team2: 'R16_10' },
      'QU06': { team1: 'R16_11', team2: 'R16_12' },
      'QU07': { team1: 'R16_13', team2: 'R16_14' },
      'QU08': { team1: 'R16_15', team2: 'R16_16' },
      
      // 十六強 (Round of 16) - 來自三十二強
      'R16_01': { team1: 'R32_01', team2: 'R32_02' },
      'R16_02': { team1: 'R32_03', team2: 'R32_04' },
      'R16_03': { team1: 'R32_05', team2: 'R32_06' },
      'R16_04': { team1: 'R32_07', team2: 'R32_08' },
      'R16_05': { team1: 'R32_09', team2: 'R32_10' },
      'R16_06': { team1: 'R32_11', team2: 'R32_12' },
      'R16_07': { team1: 'R32_13', team2: 'R32_14' },
      'R16_08': { team1: 'R32_15', team2: 'R32_16' },
      'R16_09': { team1: 'R32_17', team2: 'R32_18' },
      'R16_10': { team1: 'R32_19', team2: 'R32_20' },
      'R16_11': { team1: 'R32_21', team2: 'R32_22' },
      'R16_12': { team1: 'R32_23', team2: 'R32_24' },
      'R16_13': { team1: 'R32_25', team2: 'R32_26' },
      'R16_14': { team1: 'R32_27', team2: 'R32_28' },
      'R16_15': { team1: 'R32_29', team2: 'R32_30' },
      'R16_16': { team1: 'R32_31', team2: 'R32_32' }
    };
    
    const progression = knockoutProgression[matchNum];
    if (progression) {
      const sourceMatch = progression[teamPosition];
      // 季軍賽顯示敗者，其他比賽顯示勝者
      const resultType = matchNum === 'TP01' ? '敗者' : '勝者';
      return `${sourceMatch}${resultType}`;
    }
    
    // 如果是第一輪比賽（沒有來源），返回待定
    if (matchNum.startsWith('QU') || matchNum.startsWith('R16') || matchNum.startsWith('R32')) {
      return "待定";
    }
    
    return "待定";
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>載入比賽詳情中...</div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Title level={3}>比賽不存在</Title>
        <Button onClick={handleBack}>返回比賽列表</Button>
      </div>
    );
  }

  const eventsColumns = [
    {
      title: "時間",
      dataIndex: "event_time",
      key: "event_time",
      width: 80,
      render: (time) => <Text code>{time}</Text>,
    },
    {
      title: "事件",
      dataIndex: "event_type",
      key: "event_type",
      width: 100,
      render: (type) => (
        <Space>
          <span>{getEventIcon(type)}</span>
          <Text>{getEventText(type)}</Text>
        </Space>
      ),
    },
    {
      title: "隊伍",
      dataIndex: "team_name",
      key: "team_name",
      width: 150,
      render: (teamName) => getDisplayTeamName(teamName),
    },
    {
      title: "球員",
      dataIndex: "athlete_name",
      key: "athlete_name",
      width: 120,
      render: (name) => name || "-",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      render: (desc) => desc || "-",
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 頁面標題和操作按鈕 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              返回比賽列表
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              比賽詳情
            </Title>
          </div>

          <Space>
            {matchData.match_status === "pending" && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={!matchData.team1_name || !matchData.team2_name ? "比賽隊伍尚未確定，無法編輯比賽" : "編輯比賽"}
                >
                  編輯比賽
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartMatch}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={!matchData.team1_name || !matchData.team2_name ? "比賽隊伍尚未確定，無法開始比賽" : "開始比賽"}
                >
                  開始比賽
                </Button>
              </>
            )}
            <Button danger icon={<DeleteOutlined />} onClick={handleDeleteMatch}>
              刪除比賽
            </Button>
            {matchData.match_status === "postponed" && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={
                    !matchData.team1_name || !matchData.team2_name ? "比賽隊伍尚未確定，無法編輯比賽" : "編輯延期比賽"
                  }
                  style={{ color: "#fa8c16", borderColor: "#fa8c16" }}
                >
                  編輯比賽
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartMatch}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={
                    !matchData.team1_name || !matchData.team2_name ? "比賽隊伍尚未確定，無法開始比賽" : "開始延期的比賽"
                  }
                  style={{ backgroundColor: "#fa8c16" }}
                >
                  開始比賽
                </Button>
              </>
            )}
            {matchData.match_status === "active" && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStartMatch}
                style={{ backgroundColor: "#52c41a" }}
              >
                即時比賽
              </Button>
            )}
            {matchData.match_status === "completed" && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/matches/${matchId}/result-edit`)}
              >
                編輯結果
              </Button>
            )}
          </Space>
        </div>

        {/* 比賽基本信息 */}
        <Card>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Title level={3} style={{ marginBottom: 8 }}>
                  {matchData.match_number}
                </Title>
                <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: 16 }}>
                  <span style={{ color: "#1890ff" }}>{getTeamDisplayName("team1")}</span>
                  <span style={{ margin: "0 16px", color: "#666" }}>VS</span>
                  <span style={{ color: "#1890ff" }}>{getTeamDisplayName("team2")}</span>
                </div>
                {matchData.match_status !== "pending" && (
                  <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f5222d" }}>
                    {matchData.team1_score} : {matchData.team2_score}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <Tag color={getStatusColor(matchData.match_status)} style={{ fontSize: "14px", padding: "4px 12px" }}>
                    {getStatusText(matchData.match_status)}
                  </Tag>
                  {matchData.group_name && (
                    <Tag color="blue" style={{ fontSize: "14px", padding: "4px 12px", marginLeft: 8 }}>
                      小組 {getDisplayGroupName(matchData.group_name)}
                    </Tag>
                  )}
                </div>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title={`${getTeamDisplayName("team1")} 犯規`} value={matchData.team1_fouls} prefix="🟨" />
                </Col>
                <Col span={12}>
                  <Statistic title={`${getTeamDisplayName("team2")} 犯規`} value={matchData.team2_fouls} prefix="🟨" />
                </Col>
              </Row>
              {matchData.winner_name && (
                <div style={{ marginTop: 16, textAlign: "center" }}>
                  <TrophyOutlined style={{ color: "#faad14", fontSize: "20px", marginRight: 8 }} />
                  <Text strong style={{ fontSize: "16px" }}>
                    獲勝者：{getDisplayTeamName(matchData.winner_name)}
                  </Text>
                </div>
              )}
            </Col>
          </Row>
        </Card>

        {/* 比賽詳細信息 */}
        <Card title="比賽信息" extra={<CalendarOutlined />}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="比賽編號">{matchData.match_number}</Descriptions.Item>
            <Descriptions.Item label="比賽類型">
              <Tag color="cyan">{getMatchTypeText(matchData)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="比賽時間">
              {moment(matchData.match_date).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label="比賽時長">{formatMatchDuration(matchData.match_time)}</Descriptions.Item>
            {matchData.tournament_stage && (
              <Descriptions.Item label="錦標賽階段" span={2}>
                {matchData.tournament_stage}
              </Descriptions.Item>
            )}
            {matchData.start_time && (
              <Descriptions.Item label="開始時間">
                {moment(matchData.start_time).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
            )}
            {matchData.end_time && (
              <Descriptions.Item label="結束時間">
                {moment(matchData.end_time).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
            )}
            {matchData.overtime_time && (
              <Descriptions.Item label="延長賽時間">{matchData.overtime_time} 分鐘</Descriptions.Item>
            )}
            {matchData.referee_decision && (
              <Descriptions.Item label="裁判決定" span={2}>
                <Tag color="red">是</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="創建時間">
              {moment(matchData.created_at).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            <Descriptions.Item label="更新時間">
              {moment(matchData.updated_at).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 比賽事件 */}
        {events.length > 0 && (
          <Card title="比賽事件" extra={<TeamOutlined />}>
            <Table columns={eventsColumns} dataSource={events} rowKey="event_id" pagination={false} size="small" />
          </Card>
        )}

        {/* 如果沒有事件，顯示提示 */}
        {events.length === 0 && matchData.match_status !== "pending" && (
          <Card title="比賽事件">
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
              <TeamOutlined style={{ fontSize: "48px", marginBottom: 16 }} />
              <div>暫無比賽事件記錄</div>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default MatchDetail;
