import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  message,
  Modal,
  InputNumber,
  Select,
  Input,
  Timeline,
  Tag,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  PlusOutlined,
  MinusOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import moment from "moment";
import axios from "axios";
import { formatMatchDuration } from "../../utils/timeUtils";
import { determineWinner, needsOvertime, getWinReasonText } from "../../utils/winConditionUtils";
import { getMatchTypeText } from "../../utils/matchUtils";

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentLiveMatch = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return "";
    const lastUnderscoreIndex = teamName.lastIndexOf("_");
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = teamName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = teamName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return teamName;
  };

  // 比賽數據狀態
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 比賽控制狀態
  const [isRunning, setIsRunning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0); // 剩餘秒數
  const [matchStarted, setMatchStarted] = useState(false);
  const [currentHalf, setCurrentHalf] = useState(1); // 1 = 上半場, 2 = 下半場, 3 = 延長賽
  const [isHalfTime, setIsHalfTime] = useState(false); // 中場休息
  const [isOvertime, setIsOvertime] = useState(false); // 延長賽狀態

  // 分數狀態
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [team1Fouls, setTeam1Fouls] = useState(0);
  const [team2Fouls, setTeam2Fouls] = useState(0);

  // 事件記錄
  const [events, setEvents] = useState([]);

  // 模態框狀態
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [endMatchModalVisible, setEndMatchModalVisible] = useState(false);
  const [endSessionModalVisible, setEndSessionModalVisible] = useState(false);
  const [halfTimeModalVisible, setHalfTimeModalVisible] = useState(false);
  const [overtimeModalVisible, setOvertimeModalVisible] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(5); // 延長賽分鐘
  const [overtimeSeconds, setOvertimeSeconds] = useState(0); // 延長賽秒數

  // 事件表單狀態
  const [eventForm, setEventForm] = useState({
    team_id: null,
    event_type: "goal",
    description: "",
  });

  // 獲取比賽數據
  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  // 鍵盤快捷鍵處理
  useEffect(() => {
    const handleKeyPress = (event) => {
      // 防止在輸入框中觸發快捷鍵
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        return;
      }

      // Enter 鍵開始比賽（只在比賽未開始時有效）
      if (
        event.key === "Enter" &&
        !matchStarted &&
        (matchData?.match_status === "pending" || matchData?.match_status === "postponed")
      ) {
        event.preventDefault();
        handleStartMatch();
        return;
      }

      // Enter 鍵開始下半場（只在中場休息時有效）
      if (event.key === "Enter" && isHalfTime) {
        event.preventDefault();
        handleStartSecondHalf();
        return;
      }

      // 其他快捷鍵只在比賽進行中才響應
      if (!matchStarted || matchData?.match_status !== "active") {
        return;
      }

      const key = event.key.toLowerCase();

      switch (key) {
        // 隊伍1 得分控制
        case "q":
          event.preventDefault();
          handleScoreChange(1, "score", 1);
          break;
        case "w":
          event.preventDefault();
          handleScoreChange(1, "score", -1);
          break;

        // 隊伍2 得分控制
        case "o":
          event.preventDefault();
          handleScoreChange(2, "score", 1);
          break;
        case "p":
          event.preventDefault();
          handleScoreChange(2, "score", -1);
          break;

        // 隊伍1 犯規控制
        case "a":
          event.preventDefault();
          handleScoreChange(1, "foul", 1);
          break;
        case "s":
          event.preventDefault();
          handleScoreChange(1, "foul", -1);
          break;

        // 隊伍2 犯規控制
        case "k":
          event.preventDefault();
          handleScoreChange(2, "foul", 1);
          break;
        case "l":
          event.preventDefault();
          handleScoreChange(2, "foul", -1);
          break;

        // 計時器控制
        case " ":
          event.preventDefault();
          if (matchStarted) {
            handlePauseResume();
          }
          break;

        default:
          break;
      }
    };

    // 添加鍵盤事件監聽器
    document.addEventListener("keydown", handleKeyPress);

    // 清理事件監聽器
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [matchStarted, matchData, team1Score, team2Score, team1Fouls, team2Fouls, isRunning]);

  // 計時器 - 倒數計時
  useEffect(() => {
    let interval = null;
    if (isRunning && matchStarted && remainingTime > 0) {
      console.log(`計時器啟動 - 當前剩餘時間: ${remainingTime}秒`);
      interval = setInterval(() => {
        setRemainingTime((time) => {
          const newTime = time - 1;
          const halfText = currentHalf === 1 ? "上半場" : currentHalf === 2 ? "下半場" : "延長賽";
          console.log(`倒數計時: ${newTime}秒 (${halfText})`);
          if (newTime <= 0) {
            setIsRunning(false);
            if (currentHalf === 1) {
              // 上半場結束，進入中場休息
              setIsHalfTime(true);
              setHalfTimeModalVisible(true);
              message.info("上半場結束！進入中場休息");
              console.log("上半場結束，進入中場休息");
            } else if (currentHalf === 2) {
              // 下半場結束，檢查勝負條件
              const { winnerId, reason } = determineWinner(
                team1Score,
                team2Score,
                team1Fouls,
                team2Fouls,
                matchData.team1_id,
                matchData.team2_id,
              );

              if (winnerId === null) {
                // 真正的平局，需要延長賽
                setIsOvertime(true);
                setOvertimeModalVisible(true);
                message.info("比賽平局！需要延長賽");
                console.log("下半場結束，比賽平局，需要延長賽");
              } else {
                // 有獲勝者
                const winnerName =
                  winnerId === matchData.team1_id
                    ? getDisplayTeamName(matchData.team1_name)
                    : getDisplayTeamName(matchData.team2_name);
                const reasonText = getWinReasonText(reason);
                message.success(`比賽結束！${winnerName} ${reasonText}！`);
                console.log(`下半場結束，${winnerName} ${reasonText}`);
              }
            } else {
              // 延長賽結束，比賽結束
              message.warning("延長賽結束！比賽結束");
              console.log("延長賽結束，比賽結束");
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (interval) {
        clearInterval(interval);
        console.log("計時器停止");
      }
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, matchStarted]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/matches/${matchId}`);

      if (response.data.success) {
        const match = response.data.data.match;
        setMatchData(match);
        setTeam1Score(match.team1_score);
        setTeam2Score(match.team2_score);
        setTeam1Fouls(match.team1_fouls);
        setTeam2Fouls(match.team2_fouls);
        setEvents(response.data.data.events || []);

        // 設置初始剩餘時間 (match_time 現在已經是秒數)
        const totalSeconds = match.match_time;

        // 檢查比賽狀態
        if (match.match_status === "active") {
          setMatchStarted(true);
          setIsRunning(true);
          // 計算剩餘時間
          if (match.start_time) {
            const elapsed = moment().diff(moment(match.start_time), "seconds");
            const remaining = Math.max(0, totalSeconds - elapsed);
            setRemainingTime(remaining);
            console.log(`比賽進行中 - 總時間: ${totalSeconds}秒, 已過: ${elapsed}秒, 剩餘: ${remaining}秒`);
          } else {
            setRemainingTime(totalSeconds);
            console.log(`比賽進行中但無開始時間 - 設置剩餘時間: ${totalSeconds}秒`);
          }
        } else if (match.match_status === "completed") {
          setMatchStarted(true);
          setIsRunning(false);
          setRemainingTime(0);
          console.log("比賽已完成 - 剩餘時間: 0秒");
        } else if (match.match_status === "postponed") {
          // postponed 狀態，和 pending 一樣處理
          setMatchStarted(false);
          setIsRunning(false);
          setCurrentHalf(1);
          setIsHalfTime(false);
          setIsOvertime(false);
          setRemainingTime(totalSeconds);
          console.log(`比賽已延期 - 設置剩餘時間: ${totalSeconds}秒`);
        } else {
          // pending 狀態，設置為完整時間
          setMatchStarted(false);
          setIsRunning(false);
          setCurrentHalf(1);
          setIsHalfTime(false);
          setIsOvertime(false);
          setRemainingTime(totalSeconds);
          console.log(`比賽待開始 - 設置剩餘時間: ${totalSeconds}秒`);
        }
      } else {
        message.error("獲取比賽數據失敗");
        navigate("/matches");
      }
    } catch (error) {
      console.error("獲取比賽數據錯誤:", error);
      message.error("獲取比賽數據失敗");
      navigate("/matches");
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    try {
      const response = await axios.post(`/api/matches/${matchId}/start`);
      if (response.data.success) {
        const totalSeconds = matchData.match_time;
        setMatchStarted(true);
        setIsRunning(true);
        setCurrentHalf(1);
        setIsHalfTime(false);
        setIsOvertime(false);
        setRemainingTime(totalSeconds); // 設置為完整比賽時間
        console.log(`開始比賽上半場 - 設置倒數計時: ${totalSeconds}秒`);
        message.success("比賽已開始！上半場開始");
        // 更新比賽狀態
        setMatchData((prev) => ({ ...prev, match_status: "active" }));
      } else {
        message.error(response.data.message || "開始比賽失敗");
      }
    } catch (error) {
      console.error("開始比賽錯誤:", error);
      message.error("開始比賽失敗");
    }
  };

  const handlePauseResume = () => {
    setIsRunning(!isRunning);
    const halfText = currentHalf === 1 ? "上半場" : currentHalf === 2 ? "下半場" : "延長賽";
    message.info(isRunning ? `${halfText}已暫停` : `${halfText}已恢復`);
  };

  const handleStartSecondHalf = () => {
    const totalSeconds = matchData.match_time;
    setCurrentHalf(2);
    setIsHalfTime(false);
    setRemainingTime(totalSeconds); // 下半場重新開始完整時間
    setIsRunning(true);
    setHalfTimeModalVisible(false);
    message.success("下半場開始！");
    console.log(`開始下半場 - 設置倒數計時: ${totalSeconds}秒`);
  };

  const handleStartOvertime = () => {
    // 計算延長賽總秒數
    const totalOvertimeSeconds = overtimeMinutes * 60 + overtimeSeconds;
    setCurrentHalf(3);
    setIsOvertime(false);
    setRemainingTime(totalOvertimeSeconds);
    setIsRunning(true);
    setOvertimeModalVisible(false);

    // 格式化顯示時間
    const displayTime = overtimeSeconds > 0 ? `${overtimeMinutes}分${overtimeSeconds}秒` : `${overtimeMinutes}分鐘`;

    message.success(`延長賽開始！時長：${displayTime}`);
    console.log(`開始延長賽 - 設置倒數計時: ${totalOvertimeSeconds}秒 (${displayTime})`);
  };

  const updateScore = async (scores = null) => {
    try {
      // Use provided scores or current state values
      const scoreData = scores || {
        team1_score: team1Score,
        team2_score: team2Score,
        team1_fouls: team1Fouls,
        team2_fouls: team2Fouls,
      };

      console.log("🔄 Updating scores and fouls:", scoreData);

      const response = await axios.put(`/api/matches/${matchId}/score`, scoreData);

      if (!response.data.success) {
        message.error(response.data.message || "更新分數失敗");
        console.error("❌ Score update failed:", response.data.message);
      } else {
        console.log("✅ Score and fouls updated successfully");
      }
    } catch (error) {
      console.error("❌ 更新分數錯誤:", error);
      message.error("更新分數失敗");
    }
  };

  const handleScoreChange = (team, type, delta) => {
    let newScores = {
      team1_score: team1Score,
      team2_score: team2Score,
      team1_fouls: team1Fouls,
      team2_fouls: team2Fouls,
    };

    if (type === "score") {
      if (team === 1) {
        const newScore = Math.max(0, team1Score + delta);
        setTeam1Score(newScore);
        newScores.team1_score = newScore;
      } else {
        const newScore = Math.max(0, team2Score + delta);
        setTeam2Score(newScore);
        newScores.team2_score = newScore;
      }
    } else if (type === "foul") {
      if (team === 1) {
        const newFouls = Math.max(0, team1Fouls + delta);
        setTeam1Fouls(newFouls);
        newScores.team1_fouls = newFouls;
        console.log(`🚫 Team 1 fouls updated: ${team1Fouls} → ${newFouls}`);
      } else {
        const newFouls = Math.max(0, team2Fouls + delta);
        setTeam2Fouls(newFouls);
        newScores.team2_fouls = newFouls;
        console.log(`🚫 Team 2 fouls updated: ${team2Fouls} → ${newFouls}`);
      }
    }

    // Immediately update with the new values to avoid race conditions
    updateScore(newScores);
  };

  const handleEndCurrentSession = () => {
    setIsRunning(false);
    setRemainingTime(0);

    if (currentHalf === 1) {
      // 結束上半場，進入中場休息
      setIsHalfTime(true);
      setHalfTimeModalVisible(true);
      message.info("上半場結束！進入中場休息");
      console.log("手動結束上半場，進入中場休息");
    } else if (currentHalf === 2) {
      // 結束下半場，檢查勝負條件
      const { winnerId, reason } = determineWinner(
        team1Score,
        team2Score,
        team1Fouls,
        team2Fouls,
        matchData.team1_id,
        matchData.team2_id,
      );

      if (winnerId === null) {
        // 真正的平局，需要延長賽
        setIsOvertime(true);
        setOvertimeModalVisible(true);
        message.info("下半場結束！比賽平局，需要延長賽");
        console.log("手動結束下半場，比賽平局，需要延長賽");
      } else {
        // 有獲勝者，結束整場比賽
        handleEndMatch(winnerId, reason);
      }
    } else {
      // 結束延長賽，比賽結束
      const { winnerId, reason } = determineWinner(
        team1Score,
        team2Score,
        team1Fouls,
        team2Fouls,
        matchData.team1_id,
        matchData.team2_id,
      );
      handleEndMatch(winnerId, reason);
    }
  };

  const handleEndMatch = async (winnerId = null, reason = null) => {
    try {
      // 如果沒有提供獲勝者信息，重新計算
      if (winnerId === null || reason === null) {
        const result = determineWinner(
          team1Score,
          team2Score,
          team1Fouls,
          team2Fouls,
          matchData.team1_id,
          matchData.team2_id,
        );
        winnerId = result.winnerId;
        reason = result.reason;
      }

      const response = await axios.post(`/api/matches/${matchId}/end`, {
        winner_id: winnerId,
        win_reason: reason,
      });

      if (response.data.success) {
        setIsRunning(false);
        setMatchStarted(false);

        if (winnerId) {
          const winnerName =
            winnerId === matchData.team1_id
              ? getDisplayTeamName(matchData.team1_name)
              : getDisplayTeamName(matchData.team2_name);
          const reasonText = getWinReasonText(reason);
          message.success(`比賽已結束！${winnerName} ${reasonText}！`);
        } else {
          message.success("比賽已結束！平局！");
        }

        setEndMatchModalVisible(false);
        // 更新比賽狀態
        setMatchData((prev) => ({ ...prev, match_status: "completed" }));
      } else {
        message.error(response.data.message || "結束比賽失敗");
      }
    } catch (error) {
      console.error("結束比賽錯誤:", error);
      message.error("結束比賽失敗");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (!matchData) return "#000";
    const totalTime = matchData.match_time;
    const percentage = (remainingTime / totalTime) * 100;

    if (percentage > 50) return "#52c41a"; // 綠色 - 剩餘時間多
    if (percentage > 20) return "#faad14"; // 黃色 - 剩餘時間中等
    return "#f5222d"; // 紅色 - 剩餘時間少
  };

  const handleBack = () => {
    // 如果比賽正在進行中，顯示確認對話框
    if (matchStarted && matchData?.match_status === "active") {
      Modal.confirm({
        title: "確認離開比賽",
        content: "比賽正在進行中，確定要離開嗎？離開後比賽將繼續進行，但您將無法控制比賽。",
        okText: "確認離開",
        cancelText: "取消",
        okType: "danger",
        onOk: () => {
          navigate(-1);
        },
      });
    } else if (matchStarted && (isHalfTime || isOvertime)) {
      // 如果在中場休息或延長賽準備階段
      Modal.confirm({
        title: "確認離開比賽",
        content: "比賽處於中場休息或延長賽準備階段，確定要離開嗎？",
        okText: "確認離開",
        cancelText: "取消",
        okType: "warning",
        onOk: () => {
          navigate(-1);
        },
      });
    } else {
      // 比賽未開始或已結束，直接返回
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>載入比賽數據中...</div>
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

  return (
    <div style={{ padding: "24px", backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 頁面標題和控制按鈕 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              返回
            </Button>
            <Title level={2} style={{ margin: 0, color: "#fff" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              >
                🎮 即時比賽控制台
              </span>
            </Title>
          </div>

          <Space>
            {!matchStarted && (matchData.match_status === "pending" || matchData.match_status === "postponed") && (
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStartMatch}>
                開始比賽
              </Button>
            )}
            {matchStarted && matchData.match_status === "active" && !isHalfTime && !isOvertime && (
              <>
                <Button
                  size="large"
                  icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handlePauseResume}
                >
                  {isRunning ? "暫停" : "繼續"}
                </Button>
                <Button danger size="large" icon={<StopOutlined />} onClick={() => setEndSessionModalVisible(true)}>
                  {currentHalf === 1 ? "結束上半場" : currentHalf === 2 ? "結束下半場" : "結束延長賽"}
                </Button>
                <Button
                  danger
                  type="primary"
                  size="large"
                  onClick={() => setEndMatchModalVisible(true)}
                  style={{ marginLeft: "8px" }}
                >
                  強制結束比賽
                </Button>
              </>
            )}
            {isHalfTime && (
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStartSecondHalf}>
                開始下半場
              </Button>
            )}
            {isOvertime && (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartOvertime}
                style={{ backgroundColor: "#ff4d4f" }}
              >
                開始延長賽
              </Button>
            )}
          </Space>
        </div>

        {/* 比賽信息卡片 */}
        <Card style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={8}>
              <div style={{ textAlign: "center", color: "#fff" }}>
                <Title level={3} style={{ color: "#fff", marginBottom: 8 }}>
                  {matchData.match_number}
                </Title>
                <Text style={{ color: "#fff", fontSize: "16px" }}>{getMatchTypeText(matchData)}</Text>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div style={{ textAlign: "center" }}>
                <Title
                  level={1}
                  style={{
                    color: getTimeColor(),
                    margin: 0,
                    fontSize: "100px",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                    fontWeight: "bold",
                  }}
                >
                  {formatTime(remainingTime)}
                </Title>
                <Text style={{ color: "#fff", fontSize: "14px" }}>/ {formatMatchDuration(matchData.match_time)}</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag
                    color={currentHalf === 1 ? "blue" : currentHalf === 2 ? "green" : "red"}
                    style={{ fontSize: "12px" }}
                  >
                    {isHalfTime
                      ? "中場休息"
                      : isOvertime
                      ? "延長賽準備"
                      : currentHalf === 1
                      ? "上半場"
                      : currentHalf === 2
                      ? "下半場"
                      : "延長賽"}
                  </Tag>
                </div>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div style={{ textAlign: "center", color: "#fff" }}>
                <Tag
                  color={
                    matchData.match_status === "active"
                      ? "green"
                      : matchData.match_status === "completed"
                      ? "blue"
                      : "orange"
                  }
                  style={{ fontSize: "14px", padding: "4px 12px" }}
                >
                  {matchData.match_status === "pending"
                    ? "待開始"
                    : matchData.match_status === "postponed"
                    ? "待開始"
                    : matchData.match_status === "active"
                    ? "進行中"
                    : "已完成"}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 比分板 */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ textAlign: "center", fontSize: "64px", fontWeight: "bold", color: "#1890ff" }}>
                  {getDisplayTeamName(matchData.team1_name)}
                </div>
              }
              style={{ height: "450px" }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: 24 }}>
                  <Title level={1} style={{ fontSize: "120px", margin: 0, color: "#1890ff", fontWeight: "bold" }}>
                    {team1Score}
                  </Title>
                  <div style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(1, "score", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      style={{ marginRight: 8 }}
                    >
                      +1
                    </Button>
                    <Button
                      icon={<MinusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(1, "score", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      -1
                    </Button>
                  </div>
                </div>

                <div>
                  <Text strong>犯規: </Text>
                  <span style={{ fontSize: "24px", color: "#faad14" }}>{team1Fouls}</span>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(1, "foul", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      style={{ marginRight: 4 }}
                    >
                      +犯規
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(1, "foul", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      -犯規
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ textAlign: "center", fontSize: "64px", fontWeight: "bold", color: "#f5222d" }}>
                  {getDisplayTeamName(matchData.team2_name)}
                </div>
              }
              style={{ height: "450px" }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ marginBottom: 24 }}>
                  <Title level={1} style={{ fontSize: "120px", margin: 0, color: "#f5222d", fontWeight: "bold" }}>
                    {team2Score}
                  </Title>
                  <div style={{ marginTop: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(2, "score", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      style={{ marginRight: 8 }}
                    >
                      +1
                    </Button>
                    <Button
                      icon={<MinusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(2, "score", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      -1
                    </Button>
                  </div>
                </div>

                <div>
                  <Text strong>犯規: </Text>
                  <span style={{ fontSize: "24px", color: "#faad14" }}>{team2Fouls}</span>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(2, "foul", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      style={{ marginRight: 4 }}
                    >
                      +犯規
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(2, "foul", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      -犯規
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 鍵盤快捷鍵說明 */}
        {!matchStarted && matchData.match_status === "pending" && (
          <Card
            title="🎮 鍵盤快捷鍵"
            size="small"
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <Text style={{ color: "#fff", fontSize: "16px" }}>
                <kbd
                  style={{
                    fontSize: "16px",
                    padding: "6px 12px",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: "4px",
                  }}
                >
                  Enter
                </kbd>
                : 開始比賽
              </Text>
            </div>
          </Card>
        )}

        {/* 中場休息時的鍵盤快捷鍵說明 */}
        {isHalfTime && (
          <Card
            title="🎮 鍵盤快捷鍵"
            size="small"
            style={{
              background: "linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <Text style={{ color: "#fff", fontSize: "16px" }}>
                <kbd
                  style={{
                    fontSize: "16px",
                    padding: "6px 12px",
                    backgroundColor: "rgba(255,255,255,0.2)",
                    borderRadius: "4px",
                  }}
                >
                  Enter
                </kbd>
                : 開始下半場
              </Text>
            </div>
          </Card>
        )}

        {matchStarted && matchData.match_status === "active" && (
          <Card
            title="🎮 鍵盤快捷鍵"
            size="small"
            style={{
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <Row gutter={[16, 8]} style={{ color: "#fff" }}>
              <Col xs={12} sm={6}>
                <Text style={{ color: "#fff" }}>
                  <kbd>Q</kbd>/<kbd>W</kbd>: {getDisplayTeamName(matchData.team1_name)} 得分 +/-
                </Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text style={{ color: "#fff" }}>
                  <kbd>O</kbd>/<kbd>P</kbd>: {getDisplayTeamName(matchData.team2_name)} 得分 +/-
                </Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text style={{ color: "#fff" }}>
                  <kbd>A</kbd>/<kbd>S</kbd>: {getDisplayTeamName(matchData.team1_name)} 犯規 +/-
                </Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text style={{ color: "#fff" }}>
                  <kbd>K</kbd>/<kbd>L</kbd>: {getDisplayTeamName(matchData.team2_name)} 犯規 +/-
                </Text>
              </Col>
              <Col xs={24} sm={24} style={{ textAlign: "center", marginTop: 8 }}>
                <Text style={{ color: "#fff", fontSize: "16px" }}>
                  <kbd style={{ fontSize: "14px", padding: "4px 8px" }}>空格</kbd>: 開始/暫停計時器
                </Text>
              </Col>
            </Row>
          </Card>
        )}

        {/* 比賽事件 */}
        {events.length > 0 && (
          <Card title="比賽事件" extra={<TrophyOutlined />}>
            <Timeline>
              {events.map((event, index) => (
                <Timeline.Item
                  key={event.event_id || index}
                  color={event.event_type === "goal" ? "green" : event.event_type === "foul" ? "red" : "blue"}
                >
                  <div>
                    <Text strong>{event.event_time}</Text> -<Text style={{ marginLeft: 8 }}>{event.team_name}</Text>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {event.event_type === "goal" ? "進球" : event.event_type === "foul" ? "犯規" : event.event_type}
                    </Tag>
                    {event.athlete_name && <Text style={{ marginLeft: 8 }}>({event.athlete_name})</Text>}
                    {event.description && <div style={{ marginTop: 4, color: "#666" }}>{event.description}</div>}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}

        {/* 中場休息模態框 */}
        <Modal
          title="上半場結束"
          open={halfTimeModalVisible}
          onOk={handleStartSecondHalf}
          onCancel={() => setHalfTimeModalVisible(false)}
          okText="開始下半場"
          cancelText="繼續休息"
          closable={false}
          maskClosable={false}
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Title level={3}>⏰ 中場休息</Title>
            <p>上半場已結束，當前比分：</p>
            <p style={{ fontSize: "24px", fontWeight: "bold", color: "#1890ff" }}>
              {getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
              {getDisplayTeamName(matchData.team2_name)}
            </p>
            <p style={{ color: "#666" }}>準備好開始下半場了嗎？</p>
          </div>
        </Modal>

        {/* 延長賽模態框 */}
        <Modal
          title="比賽平局 - 需要延長賽"
          open={overtimeModalVisible}
          onOk={handleStartOvertime}
          onCancel={() => setOvertimeModalVisible(false)}
          okText="開始延長賽"
          cancelText="稍後開始"
          closable={false}
          maskClosable={false}
        >
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Title level={3}>🏆 延長賽</Title>
            <p>比賽結果平局，需要延長賽決定勝負！</p>
            <p>當前比分：</p>
            <p style={{ fontSize: "24px", fontWeight: "bold", color: "#1890ff" }}>
              {getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
              {getDisplayTeamName(matchData.team2_name)}
            </p>
            <p>
              犯規數：{team1Fouls} : {team2Fouls}
            </p>
            <p style={{ color: "#666", fontSize: "14px" }}>
              ⚽ 勝負條件：分數優先，分數相同時犯規較少者獲勝，分數和犯規都相同時延長賽
            </p>

            <div style={{ margin: "20px 0" }}>
              <Text strong>延長賽時長：</Text>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <InputNumber
                  min={0}
                  max={30}
                  value={overtimeMinutes}
                  onChange={setOvertimeMinutes}
                  style={{ width: "80px" }}
                />
                <Text>分</Text>
                <InputNumber
                  min={0}
                  max={59}
                  value={overtimeSeconds}
                  onChange={setOvertimeSeconds}
                  style={{ width: "80px" }}
                />
                <Text>秒</Text>
              </div>
              <div style={{ marginTop: "8px", color: "#666", fontSize: "12px" }}>
                總時長：{overtimeMinutes}分{overtimeSeconds}秒 ({overtimeMinutes * 60 + overtimeSeconds}秒)
              </div>
            </div>

            <p style={{ color: "#666" }}>延長賽期間，先得分的隊伍獲勝（黃金進球）</p>
          </div>
        </Modal>

        {/* 結束比賽確認模態框 */}
        <Modal
          title="確認強制結束比賽"
          open={endMatchModalVisible}
          onOk={() => handleEndMatch()}
          onCancel={() => setEndMatchModalVisible(false)}
          okText="確認結束"
          cancelText="取消"
          okType="danger"
        >
          <p>⚠️ 確定要強制結束這場比賽嗎？</p>
          <p>這將立即結束整場比賽，無論當前是哪個階段。</p>
          <p>
            當前比分：{getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
            {getDisplayTeamName(matchData.team2_name)}
          </p>
          <p>當前階段：{currentHalf === 1 ? "上半場" : currentHalf === 2 ? "下半場" : "延長賽"}</p>
          <p>
            犯規數：{team1Fouls} : {team2Fouls}
          </p>
          <p>
            當前狀態：
            {isHalfTime
              ? "中場休息"
              : isOvertime
              ? "延長賽準備"
              : currentHalf === 1
              ? "上半場"
              : currentHalf === 2
              ? "下半場"
              : "延長賽"}
          </p>
          {(() => {
            const { winnerId, reason } = determineWinner(
              team1Score,
              team2Score,
              team1Fouls,
              team2Fouls,
              matchData.team1_id,
              matchData.team2_id,
            );
            if (winnerId) {
              const winnerName =
                winnerId === matchData.team1_id
                  ? getDisplayTeamName(matchData.team1_name)
                  : getDisplayTeamName(matchData.team2_name);
              const reasonText = getWinReasonText(reason);
              return (
                <p style={{ color: "#52c41a", fontWeight: "bold" }}>
                  獲勝者：{winnerName} ({reasonText})
                </p>
              );
            } else {
              return <p style={{ color: "#faad14", fontWeight: "bold" }}>結果：平局</p>;
            }
          })()}
          <p style={{ color: "#999" }}>此操作無法撤銷，比賽結束後將自動計算勝負和積分。</p>
        </Modal>

        {/* 結束當前階段確認模態框 */}
        <Modal
          title={`確認${currentHalf === 1 ? "結束上半場" : currentHalf === 2 ? "結束下半場" : "結束延長賽"}`}
          open={endSessionModalVisible}
          onOk={() => {
            handleEndCurrentSession();
            setEndSessionModalVisible(false);
          }}
          onCancel={() => setEndSessionModalVisible(false)}
          okText="確認結束"
          cancelText="取消"
          okType="primary"
        >
          <p>確定要{currentHalf === 1 ? "結束上半場" : currentHalf === 2 ? "結束下半場" : "結束延長賽"}嗎？</p>
          <p>
            當前比分：{getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
            {getDisplayTeamName(matchData.team2_name)}
          </p>
          <p>
            剩餘時間：{Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, "0")}
          </p>
          {currentHalf === 2 && team1Score === team2Score && (
            <p style={{ color: "#ff6b35", fontWeight: "bold" }}>⚠️ 當前比分平局，結束下半場後將進入延長賽</p>
          )}
        </Modal>
      </Space>
    </div>
  );
};

export default TournamentLiveMatch;
