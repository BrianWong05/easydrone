import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
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
import { useTranslation } from "react-i18next";
import moment from "moment";
import axios from "axios";
import { formatMatchDuration } from "../../utils/timeUtils";
import { determineWinner, needsOvertime, getWinReasonText } from "../../utils/winConditionUtils";
import { getMatchTypeText } from "../../utils/matchUtils";

const { Option } = Select;

const TournamentLiveMatch = () => {
  const { t } = useTranslation(["match", "common"]);
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
  const [timerEditModalVisible, setTimerEditModalVisible] = useState(false); // 計時器編輯模態框
  const [editMinutes, setEditMinutes] = useState(0); // 編輯分鐘
  const [editSeconds, setEditSeconds] = useState(0); // 編輯秒數

  // 中場休息計時器狀態
  const [halfTimeMinutes, setHalfTimeMinutes] = useState(5); // 中場休息分鐘
  const [halfTimeSeconds, setHalfTimeSeconds] = useState(0); // 中場休息秒數
  const [halfTimeRemaining, setHalfTimeRemaining] = useState(0); // 中場休息剩餘秒數
  const [halfTimeRunning, setHalfTimeRunning] = useState(false); // 中場休息計時器是否運行

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
              // 不自動開始計時器，等待用戶手動設置和啟動
              message.info(t("match:live.firstHalfEnded"));
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
                message.info(t("match:live.matchTied"));
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
              message.warning(t("match:live.overtimeEnded"));
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

  // 中場休息計時器
  useEffect(() => {
    let interval = null;
    if (halfTimeRunning && halfTimeRemaining > 0) {
      console.log(`中場休息計時器啟動 - 剩餘時間: ${halfTimeRemaining}秒`);
      interval = setInterval(() => {
        setHalfTimeRemaining((time) => {
          const newTime = time - 1;
          console.log(`中場休息倒數: ${newTime}秒`);
          if (newTime <= 0) {
            setHalfTimeRunning(false);
            message.info(t("match:live.halfTimeEnded"));
            console.log("中場休息時間結束");
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (interval) {
        clearInterval(interval);
        console.log("中場休息計時器停止");
      }
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [halfTimeRunning, halfTimeRemaining]);

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
      console.error("獲取比賽詳情錯誤:", error);
      message.error(t("messages.noMatchData"));
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
    // 停止中場休息計時器
    setHalfTimeRunning(false);
    setHalfTimeRemaining(0);
    message.success("下半場開始！");
    console.log(`開始下半場 - 設置倒數計時: ${totalSeconds}秒`);
  };

  const handleStartHalfTimeTimer = () => {
    const totalHalfTimeSeconds = halfTimeMinutes * 60 + halfTimeSeconds;
    setHalfTimeRemaining(totalHalfTimeSeconds);
    setHalfTimeRunning(true);
    message.success(
      t("live.halfTimeStarted", {
        minutes: halfTimeMinutes,
        seconds: halfTimeSeconds,
        defaultValue: `中場休息計時器開始！時長：${halfTimeMinutes}分${halfTimeSeconds}秒`,
      }),
    );
    console.log(`開始中場休息計時器 - 設置倒數計時: ${totalHalfTimeSeconds}秒`);
  };

  const handlePauseResumeHalfTime = () => {
    setHalfTimeRunning(!halfTimeRunning);
    message.info(halfTimeRunning ? t("match:live.halfTimeTimerPaused") : t("match:live.halfTimeTimerResumed"));
  };

  const handleOpenTimerEdit = () => {
    // 只有在計時器停止時才能編輯
    if (!isRunning) {
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;
      setEditMinutes(minutes);
      setEditSeconds(seconds);
      setTimerEditModalVisible(true);
    } else {
      message.warning(t("match:live.pauseTimerFirst"));
    }
  };

  const handleTimerEdit = () => {
    const newTime = editMinutes * 60 + editSeconds;
    if (newTime < 0) {
      message.error("時間不能為負數");
      return;
    }
    if (newTime > 3600) {
      // 限制最大1小時
      message.error(t("live.timeExceedsLimit", { defaultValue: "時間不能超過60分鐘" }));
      return;
    }

    setRemainingTime(newTime);
    setTimerEditModalVisible(false);
    message.success(
      t("live.timerSet", {
        minutes: editMinutes,
        seconds: editSeconds,
        defaultValue: `計時器已設置為 ${editMinutes}分${editSeconds}秒`,
      }),
    );
    console.log(`手動設置計時器: ${newTime}秒 (${editMinutes}分${editSeconds}秒)`);
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
      // 不自動開始計時器，等待用戶手動設置和啟動
      message.info(t("match:live.firstHalfEnded"));
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
        message.error(response.data.message || t("live.startFailed", { defaultValue: "開始比賽失敗" }));
      }
    } catch (error) {
      console.error("開始比賽錯誤:", error);
      message.error(t("live.startFailed", { defaultValue: "開始比賽失敗" }));
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
      <div className="p-6 text-center">
        <Spin size="large" />
        <div className="mt-4">{t("messages.loadingMatches")}</div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="p-6 text-center">
        <h3>{t("messages.matchNotFound", { defaultValue: "比賽不存在" })}</h3>
        <Button onClick={handleBack}>{t("match:actions.backToMatchList")}</Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <Space direction="vertical" size="large" className="w-full">
        {/* 頁面標題和控制按鈕 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              {t("common:buttons.back")}
            </Button>
            <h2 className="m-0 text-white">
              <span
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              >
                🎮 {t("live.controlPanel", { defaultValue: "即時比賽控制台" })}
              </span>
            </h2>
          </div>

          <Space>
            {!matchStarted && (matchData.match_status === "pending" || matchData.match_status === "postponed") && (
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStartMatch}>
                {t("actions.start")}
              </Button>
            )}
            {matchStarted && matchData.match_status === "active" && !isHalfTime && !isOvertime && (
              <div className="grid grid-cols-2 gap-2 w-96">
                {/* Top Row */}
                <Button danger size="large" icon={<StopOutlined />} onClick={() => setEndSessionModalVisible(true)}>
                  {currentHalf === 1
                    ? t("match:actions.endFirstHalf")
                    : currentHalf === 2
                    ? t("match:actions.endSecondHalf")
                    : t("match:actions.endOvertime")}
                </Button>
                <Button danger type="primary" size="large" onClick={() => setEndMatchModalVisible(true)}>
                  {t("match:actions.forceEndMatch")}
                </Button>
                {/* Bottom Row */}
                <Button
                  size="large"
                  icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handlePauseResume}
                >
                  {isRunning ? t("match:actions.pause") : t("match:actions.continue")}
                </Button>
                <Button size="large" onClick={handleOpenTimerEdit} disabled={isRunning}>
                  {t("match:actions.editTime")}
                </Button>
              </div>
            )}
            {isHalfTime && (
              <>
                <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStartSecondHalf}>
                  {t("match:live.startSecondHalf")}
                </Button>
                <Button
                  size="large"
                  icon={<PauseCircleOutlined />}
                  onClick={() => setHalfTimeModalVisible(true)}
                  className="ml-2"
                >
                  {t("match:actions.halfTimeTimer")}
                </Button>
              </>
            )}
            {isOvertime && (
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStartOvertime}
                className="bg-red-500"
              >
                開始延長賽
              </Button>
            )}
          </Space>
        </div>

        {/* 比賽信息卡片 */}
        <Card className="border-none" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={8}>
              <div className="text-2xl text-center text-white">
                <h3 className="text-white mb-2">{matchData.match_number}</h3>
                <span className="text-white">{getMatchTypeText(matchData)}</span>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div className="text-center">
                <h1
                  style={{
                    color: getTimeColor(),
                    margin: 0,
                    fontSize: "100px",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                    fontWeight: "bold",
                  }}
                >
                  {formatTime(remainingTime)}
                </h1>
                <span className="text-white text-sm">/ {formatMatchDuration(matchData.match_time)}</span>
                <div className="mt-2">
                  <Tag color={currentHalf === 1 ? "blue" : currentHalf === 2 ? "green" : "red"} className="text-xs">
                    {isHalfTime
                      ? t("match:actions.halfTime")
                      : isOvertime
                      ? "延長賽準備"
                      : currentHalf === 1
                      ? t("live.firstHalf", { defaultValue: "上半場" })
                      : currentHalf === 2
                      ? t("live.secondHalf", { defaultValue: "下半場" })
                      : "延長賽"}
                  </Tag>
                </div>
              </div>
            </Col>

            <Col xs={24} lg={8}>
              <div className="text-center text-white">
                <Tag
                  color={
                    matchData.match_status === "active"
                      ? "green"
                      : matchData.match_status === "completed"
                      ? "blue"
                      : "orange"
                  }
                  className="text-sm px-3 py-1"
                >
                  {matchData.match_status === "pending"
                    ? t("status.pending")
                    : matchData.match_status === "postponed"
                    ? t("status.pending")
                    : matchData.match_status === "active"
                    ? t("status.active")
                    : t("status.completed")}
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
                <div className="text-center text-6xl font-bold text-blue-500 py-6">
                  {getDisplayTeamName(matchData.team1_name)}
                </div>
              }
              className="h-[32rem]"
            >
              <div className="text-center">
                <div className="mb-6">
                  <h1 className="text-9xl m-0 text-blue-500 font-bold">{team1Score}</h1>
                  <div className="mt-4">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(1, "score", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      className="mr-2"
                    >
                      1
                    </Button>
                    <Button
                      icon={<MinusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(1, "score", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      1
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="font-bold">{t("statistics.fouls")}: </span>
                  <span className="text-2xl text-yellow-500">{team1Fouls}</span>
                  <div className="mt-2">
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(1, "foul", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      className="mr-1"
                    >
                      +{t("statistics.fouls")}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(1, "foul", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      -{t("statistics.fouls")}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <div className="text-center text-6xl font-bold text-red-500 py-6">
                  {getDisplayTeamName(matchData.team2_name)}
                </div>
              }
              className="h-[32rem]"
            >
              <div className="text-center">
                <div className="mb-6">
                  <h1 className="text-9xl m-0 text-red-500 font-bold">{team2Score}</h1>
                  <div className="mt-4">
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(2, "score", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      className="mr-2"
                    >
                      1
                    </Button>
                    <Button
                      icon={<MinusOutlined />}
                      size="large"
                      onClick={() => handleScoreChange(2, "score", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      1
                    </Button>
                  </div>
                </div>

                <div>
                  <span className="font-bold">{t("statistics.fouls")}: </span>
                  <span className="text-2xl text-yellow-500">{team2Fouls}</span>
                  <div className="mt-2">
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(2, "foul", 1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                      className="mr-1"
                    >
                      +{t("statistics.fouls")}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleScoreChange(2, "foul", -1)}
                      disabled={!matchStarted || matchData.match_status !== "active"}
                    >
                      -{t("statistics.fouls")}
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
            title={`🎮 ${t("live.keyboardShortcuts", { defaultValue: "鍵盤快捷鍵" })}`}
            size="small"
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <div className="text-center py-2">
              <span className="text-white text-base">
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
                : {t("live.startMatch", { defaultValue: "開始比賽" })}
              </span>
            </div>
          </Card>
        )}

        {/* 中場休息時的鍵盤快捷鍵說明 */}
        {isHalfTime && (
          <Card
            title={`🎮 ${t("live.keyboardShortcuts", { defaultValue: "鍵盤快捷鍵" })}`}
            size="small"
            style={{
              background: "linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <div className="text-center py-2">
              <span className="text-white text-base">
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
                : {t("match:live.startSecondHalf")}
              </span>
            </div>
          </Card>
        )}

        {matchStarted && matchData.match_status === "active" && (
          <Card
            title={`🎮 ${t("live.keyboardShortcuts", { defaultValue: "鍵盤快捷鍵" })}`}
            size="small"
            style={{
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <Row gutter={[16, 8]} className="text-white">
              <Col xs={12} sm={6}>
                <span className="text-white">
                  <kbd>Q</kbd>/<kbd>W</kbd>: {getDisplayTeamName(matchData.team1_name)}{" "}
                  {t("live.score", { defaultValue: "得分" })} +/-
                </span>
              </Col>
              <Col xs={12} sm={6}>
                <span className="text-white">
                  <kbd>O</kbd>/<kbd>P</kbd>: {getDisplayTeamName(matchData.team2_name)}{" "}
                  {t("live.score", { defaultValue: "得分" })} +/-
                </span>
              </Col>
              <Col xs={12} sm={6}>
                <span className="text-white">
                  <kbd>A</kbd>/<kbd>S</kbd>: {getDisplayTeamName(matchData.team1_name)} {t("statistics.fouls")} +/-
                </span>
              </Col>
              <Col xs={12} sm={6}>
                <span className="text-white">
                  <kbd>K</kbd>/<kbd>L</kbd>: {getDisplayTeamName(matchData.team2_name)} {t("statistics.fouls")} +/-
                </span>
              </Col>
              <Col xs={24} sm={24} className="text-center mt-2">
                <span className="text-white text-base">
                  <kbd className="text-sm px-2 py-1">{t("live.spacebar", { defaultValue: "空格" })}</kbd>:{" "}
                  {t("live.pauseResumeTimer", { defaultValue: "開始/暫停計時器" })}
                </span>
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
                    <span className="font-bold">{event.event_time}</span> -
                    <span className="ml-2">{event.team_name}</span>
                    <Tag color="blue" className="ml-2">
                      {event.event_type === "goal" ? "進球" : event.event_type === "foul" ? "犯規" : event.event_type}
                    </Tag>
                    {event.athlete_name && <span className="ml-2">({event.athlete_name})</span>}
                    {event.description && <div className="mt-1 text-gray-600">{event.description}</div>}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}

        {/* 中場休息模態框 */}
        <Modal
          title={t("match:live.firstHalfEnded")}
          open={halfTimeModalVisible}
          onOk={handleStartSecondHalf}
          onCancel={() => setHalfTimeModalVisible(false)}
          okText={t("match:live.startSecondHalf")}
          cancelText={t("match:actions.continueRest")}
          closable={false}
          maskClosable={false}
          width={600}
        >
          <div className="text-center py-5">
            <h3>⏰ {t("match:actions.halfTime")}</h3>
            <p>{t("match:live.firstHalfEndedMessage")}</p>
            <p className="text-2xl font-bold text-blue-500">
              {getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
              {getDisplayTeamName(matchData.team2_name)}
            </p>

            {/* 中場休息計時器 */}
            <div className="my-8 p-5 bg-gray-100 rounded-lg">
              <h4 className="mb-4">{t("match:actions.halfTimeTimer")}</h4>

              {/* 計時器顯示 */}
              <div className="mb-5">
                <h1
                  style={{
                    fontSize: "80px",
                    margin: "0",
                    color: halfTimeRemaining <= 60 ? "#f5222d" : "#52c41a",
                    fontWeight: "bold",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
                  }}
                >
                  {formatTime(halfTimeRemaining)}
                </h1>
                <span className="text-sm text-gray-600">
                  / {halfTimeMinutes}分{halfTimeSeconds}秒
                </span>
              </div>

              {/* 時間設置 - 始終顯示，就像延長賽設置一樣 */}
              <div className="mb-4">
                <span className="font-bold">{t("match:live.duration")}：</span>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <InputNumber
                    min={0}
                    max={30}
                    value={halfTimeMinutes}
                    onChange={setHalfTimeMinutes}
                    className="w-20"
                    disabled={halfTimeRunning}
                  />
                  <span>分</span>
                  <InputNumber
                    min={0}
                    max={59}
                    value={halfTimeSeconds}
                    onChange={setHalfTimeSeconds}
                    className="w-20"
                    disabled={halfTimeRunning}
                  />
                  <span>秒</span>
                </div>
                <div className="mt-2 text-gray-600 text-xs">
                  {t("match:live.totalDurationSeconds", {
                    minutes: halfTimeMinutes,
                    seconds: halfTimeSeconds,
                    totalSeconds: halfTimeMinutes * 60 + halfTimeSeconds,
                  })}
                </div>
              </div>

              {/* 計時器控制按鈕 */}
              <Space>
                {!halfTimeRunning && (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartHalfTimeTimer}
                    disabled={halfTimeMinutes === 0 && halfTimeSeconds === 0}
                  >
                    {halfTimeRemaining === 0 ? t("match:live.startHalfTimeTimer") : t("match:live.resumeTimer")}
                  </Button>
                )}
                {halfTimeRunning && (
                  <Button icon={<PauseCircleOutlined />} onClick={handlePauseResumeHalfTime}>
                    {t("match:live.pauseTimer")}
                  </Button>
                )}
              </Space>
            </div>

            <p className="text-gray-600">
              {halfTimeRemaining > 0 ? t("match:live.halfTimeInProgress") : t("match:live.readyForSecondHalf")}
            </p>
          </div>
        </Modal>

        {/* 延長賽模態框 */}
        <Modal
          title={`${t("match:live.tie")} - ${t("match:live.overtimeNeeded")}`}
          open={overtimeModalVisible}
          onOk={handleStartOvertime}
          onCancel={() => setOvertimeModalVisible(false)}
          okText={t("match:live.startOvertime")}
          cancelText={t("match:live.continueWithoutOvertime")}
          closable={false}
          maskClosable={false}
        >
          <div className="text-center py-5">
            <h3>🏆 {t("match:live.overtimeTitle")}</h3>
            <p>{t("match:live.matchTiedNeedsOvertimeDesc")}</p>
            <p>{t("match:live.currentScoreLabel")}：</p>
            <p className="text-2xl font-bold text-blue-500">
              {getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
              {getDisplayTeamName(matchData.team2_name)}
            </p>
            <p>
              {t("match:live.foulsLabel")}：{team1Fouls} : {team2Fouls}
            </p>
            <p className="text-gray-600 text-sm">⚽ {t("match:live.winCondition")}</p>

            <div className="my-5">
              <span className="font-bold">{t("match:live.overtimeDuration")}：</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <InputNumber min={0} max={30} value={overtimeMinutes} onChange={setOvertimeMinutes} className="w-20" />
                <span>{t("match:live.minutes")}</span>
                <InputNumber min={0} max={59} value={overtimeSeconds} onChange={setOvertimeSeconds} className="w-20" />
                <span>{t("match:live.seconds")}</span>
              </div>
              <div className="mt-2 text-gray-600 text-xs">
                {t("match:live.totalDurationSeconds", {
                  minutes: overtimeMinutes,
                  seconds: overtimeSeconds,
                  totalSeconds: overtimeMinutes * 60 + overtimeSeconds,
                })}
              </div>
            </div>
          </div>
        </Modal>

        {/* 結束比賽確認模態框 */}
        <Modal
          title={`${t("common:buttons.confirm")}${t("match:actions.forceEndMatch")}`}
          open={endMatchModalVisible}
          onOk={() => handleEndMatch()}
          onCancel={() => setEndMatchModalVisible(false)}
          okText={t("match:live.confirmForceEnd")}
          cancelText={t("common:buttons.cancel")}
          okType="danger"
        >
          <p>⚠️ {t("match:live.confirmForceEndMatch")}</p>
          <p>{t("match:live.forceEndWarning")}</p>
          <p>
            {t("match:live.currentScore")}：{getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
            {getDisplayTeamName(matchData.team2_name)}
          </p>
          <p>
            {t("match:live.currentStage")}：
            {currentHalf === 1
              ? t("match:live.firstHalf")
              : currentHalf === 2
              ? t("match:live.secondHalf")
              : t("match:live.overtime")}
          </p>
          <p>
            {t("match:live.fouls")}：{team1Fouls} : {team2Fouls}
          </p>
          <p>
            {t("match:live.currentStatus")}：
            {isHalfTime
              ? t("match:actions.halfTime")
              : isOvertime
              ? t("match:live.overtime")
              : currentHalf === 1
              ? t("match:live.firstHalf")
              : currentHalf === 2
              ? t("match:live.secondHalf")
              : t("match:live.overtime")}
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
                <p className="text-green-500 font-bold">
                  獲勝者：{winnerName} ({reasonText})
                </p>
              );
            } else {
              return (
                <p className="text-yellow-500 font-bold">
                  {t("match:live.result")}：{t("match:live.tie")}
                </p>
              );
            }
          })()}
          <p className="text-gray-400">{t("match:live.irreversibleAction")}</p>
        </Modal>

        {/* 結束當前階段確認模態框 */}
        <Modal
          title={`${t("common:buttons.confirm")}${
            currentHalf === 1
              ? t("match:actions.endFirstHalf")
              : currentHalf === 2
              ? t("match:actions.endSecondHalf")
              : t("match:actions.endOvertime")
          }`}
          open={endSessionModalVisible}
          onOk={() => {
            handleEndCurrentSession();
            setEndSessionModalVisible(false);
          }}
          onCancel={() => setEndSessionModalVisible(false)}
          okText={t("match:live.confirmEnd")}
          cancelText={t("common:buttons.cancel")}
          okType="primary"
        >
          <p>
            {t("match:live.confirmEndHalf", {
              action:
                currentHalf === 1
                  ? t("match:actions.endFirstHalf")
                  : currentHalf === 2
                  ? t("match:actions.endSecondHalf")
                  : t("match:actions.endOvertime"),
            })}
          </p>
          <p>
            {t("match:live.currentScore")}：{getDisplayTeamName(matchData.team1_name)} {team1Score} : {team2Score}{" "}
            {getDisplayTeamName(matchData.team2_name)}
          </p>
          <p>
            {t("match:live.remainingTime")}：{Math.floor(remainingTime / 60)}:
            {(remainingTime % 60).toString().padStart(2, "0")}
          </p>
          {currentHalf === 2 && team1Score === team2Score && (
            <p className="text-orange-500 font-bold">⚠️ {t("match:live.tieGameWarning")}</p>
          )}
        </Modal>

        {/* 計時器編輯模態框 */}
        <Modal
          title={t("match:actions.editTime")}
          open={timerEditModalVisible}
          onOk={handleTimerEdit}
          onCancel={() => setTimerEditModalVisible(false)}
          okText={t("match:live.confirmEdit")}
          cancelText={t("common:buttons.cancel")}
          okType="primary"
        >
          <div className="text-center py-5">
            <h4>⏰ {t("match:live.setRemainingTime")}</h4>
            <p className="text-gray-600 mb-5">{t("match:live.canOnlyEditWhenPaused")}</p>

            <div className="mb-5">
              <span className="font-bold">{t("match:live.currentRemainingTime")}：</span>
              <span className="text-2xl text-blue-500 ml-2">{formatTime(remainingTime)}</span>
            </div>

            <div className="my-5">
              <span className="font-bold">{t("match:live.setNewTime")}：</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                <InputNumber min={0} max={60} value={editMinutes} onChange={setEditMinutes} className="w-20" />
                <span>{t("common:time.minutes")}</span>
                <InputNumber min={0} max={59} value={editSeconds} onChange={setEditSeconds} className="w-20" />
                <span>{t("common:time.seconds")}</span>
              </div>
              <div className="mt-2 text-gray-600 text-xs">
                {t("match:live.totalDuration")}：{editMinutes}
                {t("common:time.minutes")}
                {editSeconds}
                {t("common:time.seconds")} ({editMinutes * 60 + editSeconds}
                {t("common:time.seconds")})
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-100 rounded-md">
              <span className="text-base text-blue-500">
                {t("match:live.preview")}：{formatTime(editMinutes * 60 + editSeconds)}
              </span>
            </div>

            <p className="text-gray-400 text-xs mt-4">{t("match:live.editTimerNote")}</p>
          </div>
        </Modal>
      </Space>
    </div>
  );
};

export default TournamentLiveMatch;
