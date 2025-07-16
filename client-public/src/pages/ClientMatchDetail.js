import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Space,
  Tag,
  Spin,
  Alert,
  Row,
  Col,
  Button,
  Descriptions,
  Timeline,
  Statistic,
  Progress,
  Divider,
} from "antd";
import {
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  ThunderboltOutlined,
  FieldTimeOutlined,
  FlagOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import moment from "moment";

const { Title, Text } = Typography;

const ClientMatchDetail = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const { t } = useTranslation(["match", "common", "group", "team"]);

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

  // Helper function to find the source match for a team position in knockout matches
  const findSourceMatch = (match, teamKey) => {
    if (!match || match.match_type !== "knockout") return null;

    const currentMatchNumber = match.match_number;
    if (!currentMatchNumber) return null;

    // Define knockout progression mapping based on match numbers
    const knockoutProgression = {
      // Finals get teams from semifinals
      FI01: { team1: "SE01", team2: "SE02" },

      // Semifinals get teams from quarterfinals
      SE01: { team1: "QU01", team2: "QU02" },
      SE02: { team1: "QU03", team2: "QU04" },

      // Quarterfinals get teams from round of 16 (if exists)
      QU01: { team1: "R16_01", team2: "R16_02" },
      QU02: { team1: "R16_03", team2: "R16_04" },
      QU03: { team1: "R16_05", team2: "R16_06" },
      QU04: { team1: "R16_07", team2: "R16_08" },

      // Round of 16 get teams from round of 32 (if exists)
      R16_01: { team1: "R32_01", team2: "R32_02" },
      R16_02: { team1: "R32_03", team2: "R32_04" },
      R16_03: { team1: "R32_05", team2: "R32_06" },
      R16_04: { team1: "R32_07", team2: "R32_08" },
      R16_05: { team1: "R32_09", team2: "R32_10" },
      R16_06: { team1: "R32_11", team2: "R32_12" },
      R16_07: { team1: "R32_13", team2: "R32_14" },
      R16_08: { team1: "R32_15", team2: "R32_16" },
    };

    try {
      const progression = knockoutProgression[currentMatchNumber];
      if (progression) {
        return progression[teamKey];
      }
      return null;
    } catch (error) {
      console.error("Error finding source match:", error);
      return null;
    }
  };

  // Enhanced team display function that shows match references for knockout matches
  const getTeamDisplayNameWithReference = (match, teamKey) => {
    const teamName = match[`${teamKey}_name`];
    if (teamName) return getDisplayTeamName(teamName);

    // For knockout matches, show match winner reference when team is not assigned
    if (match.match_type === "knockout") {
      const teamId = match[`${teamKey}_id`];
      if (!teamId) {
        // Find the source match for this team position
        const sourceMatch = findSourceMatch(match, teamKey);
        if (sourceMatch) {
          return `${sourceMatch}${t("match:result.winner")}`;
        }
        // If no source match found, show generic placeholder
        return getKnockoutWinnerReference(match.match_number, teamKey) || t("match:status.pending");
      }
    }

    // For non-knockout matches or when team is assigned but no name
    return teamName || t("match:status.pending");
  };

  // 動態生成淘汰賽勝者引用
  const getKnockoutWinnerReference = (matchNumber, teamPosition) => {
    if (!matchNumber) return t("match:status.pending");

    const matchNum = matchNumber.toUpperCase();

    // 定義淘汰賽進階映射
    const knockoutProgression = {
      // 決賽 (Finals) - 來自準決賽
      FI01: { team1: "SE01", team2: "SE02" },
      FI02: { team1: "SE03", team2: "SE04" },

      // 季軍賽 (Third Place) - 來自準決賽敗者
      TP01: { team1: "SE01", team2: "SE02" },

      // 準決賽 (Semifinals) - 來自八強
      SE01: { team1: "QU01", team2: "QU02" },
      SE02: { team1: "QU03", team2: "QU04" },
      SE03: { team1: "QU05", team2: "QU06" },
      SE04: { team1: "QU07", team2: "QU08" },

      // 八強 (Quarterfinals) - 來自十六強
      QU01: { team1: "R16_01", team2: "R16_02" },
      QU02: { team1: "R16_03", team2: "R16_04" },
      QU03: { team1: "R16_05", team2: "R16_06" },
      QU04: { team1: "R16_07", team2: "R16_08" },
      QU05: { team1: "R16_09", team2: "R16_10" },
      QU06: { team1: "R16_11", team2: "R16_12" },
      QU07: { team1: "R16_13", team2: "R16_14" },
      QU08: { team1: "R16_15", team2: "R16_16" },

      // 十六強 (Round of 16) - 來自三十二強
      R16_01: { team1: "R32_01", team2: "R32_02" },
      R16_02: { team1: "R32_03", team2: "R32_04" },
      R16_03: { team1: "R32_05", team2: "R32_06" },
      R16_04: { team1: "R32_07", team2: "R32_08" },
      R16_05: { team1: "R32_09", team2: "R32_10" },
      R16_06: { team1: "R32_11", team2: "R32_12" },
      R16_07: { team1: "R32_13", team2: "R32_14" },
      R16_08: { team1: "R32_15", team2: "R32_16" },
      R16_09: { team1: "R32_17", team2: "R32_18" },
      R16_10: { team1: "R32_19", team2: "R32_20" },
      R16_11: { team1: "R32_21", team2: "R32_22" },
      R16_12: { team1: "R32_23", team2: "R32_24" },
      R16_13: { team1: "R32_25", team2: "R32_26" },
      R16_14: { team1: "R32_27", team2: "R32_28" },
      R16_15: { team1: "R32_29", team2: "R32_30" },
      R16_16: { team1: "R32_31", team2: "R32_32" },
    };

    const progression = knockoutProgression[matchNum];
    if (progression) {
      const sourceMatch = progression[teamPosition];
      // 季軍賽顯示敗者，其他比賽顯示勝者
      const resultType = matchNum === "TP01" ? t("match:result.loser") : t("match:result.winner");
      return `${sourceMatch}${resultType}`;
    }

    // 如果是第一輪比賽（沒有來源），返回待定
    if (matchNum.startsWith("QU") || matchNum.startsWith("R16") || matchNum.startsWith("R32")) {
      return t("match:status.pending");
    }

    return t("match:status.pending");
  };

  // Helper function to get navigation target (team ID or source match number)
  const getNavigationTarget = (match, teamKey) => {
    const teamId = match[`${teamKey}_id`];
    const teamName = match[`${teamKey}_name`];

    // If team is assigned, navigate to team page
    if (teamId && teamName) {
      return { type: "team", id: teamId };
    }

    // For knockout matches without assigned teams, navigate to source match
    if (match.match_type === "knockout" && !teamId) {
      // Use the comprehensive knockout progression mapping
      const matchNum = match.match_number?.toUpperCase();
      const knockoutProgression = {
        // 決賽 (Finals) - 來自準決賽
        FI01: { team1: "SE01", team2: "SE02" },
        FI02: { team1: "SE03", team2: "SE04" },

        // 季軍賽 (Third Place) - 來自準決賽敗者
        TP01: { team1: "SE01", team2: "SE02" },

        // 準決賽 (Semifinals) - 來自八強
        SE01: { team1: "QU01", team2: "QU02" },
        SE02: { team1: "QU03", team2: "QU04" },
        SE03: { team1: "QU05", team2: "QU06" },
        SE04: { team1: "QU07", team2: "QU08" },

        // 八強 (Quarterfinals) - 來自十六強
        QU01: { team1: "R16_01", team2: "R16_02" },
        QU02: { team1: "R16_03", team2: "R16_04" },
        QU03: { team1: "R16_05", team2: "R16_06" },
        QU04: { team1: "R16_07", team2: "R16_08" },
        QU05: { team1: "R16_09", team2: "R16_10" },
        QU06: { team1: "R16_11", team2: "R16_12" },
        QU07: { team1: "R16_13", team2: "R16_14" },
        QU08: { team1: "R16_15", team2: "R16_16" },

        // 十六強 (Round of 16) - 來自三十二強
        R16_01: { team1: "R32_01", team2: "R32_02" },
        R16_02: { team1: "R32_03", team2: "R32_04" },
        R16_03: { team1: "R32_05", team2: "R32_06" },
        R16_04: { team1: "R32_07", team2: "R32_08" },
        R16_05: { team1: "R32_09", team2: "R32_10" },
        R16_06: { team1: "R32_11", team2: "R32_12" },
        R16_07: { team1: "R32_13", team2: "R32_14" },
        R16_08: { team1: "R32_15", team2: "R32_16" },
        R16_09: { team1: "R32_17", team2: "R32_18" },
        R16_10: { team1: "R32_19", team2: "R32_20" },
        R16_11: { team1: "R32_21", team2: "R32_22" },
        R16_12: { team1: "R32_23", team2: "R32_24" },
        R16_13: { team1: "R32_25", team2: "R32_26" },
        R16_14: { team1: "R32_27", team2: "R32_28" },
        R16_15: { team1: "R32_29", team2: "R32_30" },
        R16_16: { team1: "R32_31", team2: "R32_32" },
      };

      const progression = knockoutProgression[matchNum];
      if (progression) {
        const sourceMatch = progression[teamKey];
        return { type: "match", matchNumber: sourceMatch };
      }
    }

    return null;
  };

  // Helper function to find match ID by match number
  const findMatchIdByNumber = async (matchNumber) => {
    try {
      console.log(`🔍 Searching for match: ${matchNumber}`);

      // Try to find the match in current tournament first
      if (match?.tournament_id) {
        console.log(`🏆 Searching in tournament: ${match.tournament_id}`);
        try {
          const tournamentResponse = await axios.get(`/api/tournaments/${match.tournament_id}/matches?limit=100`);
          if (tournamentResponse.data.success) {
            const matches = Array.isArray(tournamentResponse.data.data)
              ? tournamentResponse.data.data
              : tournamentResponse.data.data.matches || [];

            console.log(`📋 Found ${matches.length} matches in tournament`);
            const foundMatch = matches.find((m) => m.match_number === matchNumber);
            if (foundMatch) {
              console.log(`✅ Found match ${matchNumber} with ID: ${foundMatch.match_id}`);
              return foundMatch.match_id;
            }
          }
        } catch (tournamentError) {
          console.log("Tournament-specific search failed, trying general search");
        }
      }

      // Fallback to general matches endpoint
      console.log(`🌐 Searching in all matches`);
      const response = await axios.get(`/api/matches?limit=100`);
      if (response.data.success) {
        const matches = Array.isArray(response.data.data) ? response.data.data : response.data.data.matches || [];

        console.log(`📋 Found ${matches.length} total matches`);
        const foundMatch = matches.find((m) => m.match_number === matchNumber);
        if (foundMatch) {
          console.log(`✅ Found match ${matchNumber} with ID: ${foundMatch.match_id}`);
          return foundMatch.match_id;
        }
      }

      console.log(`❌ Match ${matchNumber} not found in any search`);
    } catch (error) {
      console.error("Error finding match by number:", error);
    }
    return null;
  };

  // Enhanced navigation handler
  const handleTeamNavigation = async (match, teamKey) => {
    const target = getNavigationTarget(match, teamKey);

    if (!target) {
      return; // No valid navigation target
    }

    if (target.type === "team") {
      navigate(`/teams/${target.id}`);
    } else if (target.type === "match") {
      // Find the match ID for the source match number
      const matchId = await findMatchIdByNumber(target.matchNumber);
      if (matchId) {
        navigate(`/matches/${matchId}`);
      } else {
        // Fallback: navigate to matches list with filter
        console.log(`Source match ${target.matchNumber} not found, redirecting to matches list`);
        navigate(`/matches?search=${target.matchNumber}`);
      }
    }
  };

  // 清理小組名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return "";
    const lastUnderscoreIndex = groupName.lastIndexOf("_");
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = groupName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = groupName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return groupName;
  };

  const [match, setMatch] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMatchDetail();
  }, [matchId]);

  const fetchMatchDetail = async () => {
    try {
      setLoading(true);

      // Fetch match detail
      const matchResponse = await axios.get(`/api/matches/${matchId}`);
      if (matchResponse.data.success) {
        const matchData = matchResponse.data.data;
        setMatch(matchData.match);
        setEvents(matchData.events || []);
      }
    } catch (error) {
      console.error("Error fetching match detail:", error);
      setError(t("match:messages.loadingMatchDetail"));
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusTag = (status) => {
    const statusMap = {
      pending: { color: "default", text: t("match:status.pending"), icon: <ClockCircleOutlined /> },
      active: { color: "processing", text: t("match:status.inProgress"), icon: <PlayCircleOutlined /> },
      in_progress: { color: "processing", text: t("match:status.inProgress"), icon: <PlayCircleOutlined /> },
      completed: { color: "success", text: t("match:status.completed"), icon: <CheckCircleOutlined /> },
      cancelled: { color: "error", text: t("match:status.cancelled"), icon: <ClockCircleOutlined /> },
    };

    const statusInfo = statusMap[status] || { color: "default", text: status, icon: <ClockCircleOutlined /> };
    return (
      <Tag color={statusInfo.color} icon={statusInfo.icon} style={{ fontSize: "14px", padding: "4px 12px" }}>
        {statusInfo.text}
      </Tag>
    );
  };

  const getMatchTypeTag = (type) => {
    const typeMap = {
      group: { color: "blue", text: t("match:types.groupStage") },
      knockout: { color: "purple", text: t("match:types.knockout") },
      friendly: { color: "green", text: t("match:types.friendly") },
    };

    const typeInfo = typeMap[type] || { color: "default", text: type };
    return (
      <Tag color={typeInfo.color} style={{ fontSize: "14px", padding: "4px 12px" }}>
        {typeInfo.text}
      </Tag>
    );
  };

  const getWinnerInfo = (match) => {
    if (match.match_status !== "completed" || !match.winner_id) {
      return null;
    }

    const winnerName =
      match.winner_id === match.team1_id
        ? getTeamDisplayNameWithReference(match, "team1")
        : getTeamDisplayNameWithReference(match, "team2");
    const winnerColor = match.winner_id === match.team1_id ? match.team1_color : match.team2_color;

    const winReasonMap = {
      score: t("match:winReason.score"),
      fouls: t("match:winReason.fouls"),
      referee: t("match:winReason.referee"),
      draw: t("match:winReason.draw"),
    };

    return {
      name: winnerName,
      color: winnerColor,
      reason: winReasonMap[match.win_reason] || match.win_reason,
    };
  };

  const getEventIcon = (eventType) => {
    const eventIcons = {
      goal: <TrophyOutlined style={{ color: "#52c41a" }} />,
      foul: <FlagOutlined style={{ color: "#f5222d" }} />,
      start: <PlayCircleOutlined style={{ color: "#1890ff" }} />,
      end: <CheckCircleOutlined style={{ color: "#722ed1" }} />,
      timeout: <ClockCircleOutlined style={{ color: "#faad14" }} />,
    };

    return eventIcons[eventType] || <StarOutlined style={{ color: "#d9d9d9" }} />;
  };

  const formatEventTime = (eventTime) => {
    if (!eventTime) return "";

    // Convert seconds to MM:SS format
    const minutes = Math.floor(eventTime / 60);
    const seconds = eventTime % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t("match:messages.loadingMatchDetail")}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-fade-in">
        <Alert
          message={t("common:messages.loadFailed")}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchMatchDetail}>
              {t("common:actions.reload")}
            </Button>
          }
        />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-fade-in">
        <Alert
          message={t("match:messages.matchNotFound")}
          description={t("match:messages.matchNotFoundDesc")}
          type="warning"
          showIcon
        />
      </div>
    );
  }

  const winnerInfo = getWinnerInfo(match);
  const matchDuration = match.match_time
    ? `${Math.floor(match.match_time / 60)} ${t("match:time.minutes")}`
    : `10 ${t("match:time.minutes")}`;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Back Button */}
      <button
        className="mb-6 flex items-center space-x-2 px-4 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors duration-200 text-gray-700 font-medium"
        onClick={() => navigate("/matches")}
      >
        <ArrowLeftOutlined className="text-gray-500" />
        <span>{t("common:actions.backToMatchList")}</span>
      </button>

      {/* Match Header */}
      <div className="mb-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-primary-500">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <h2 className="text-xl font-bold text-gray-800 flex items-center m-0">
                <PlayCircleOutlined className="mr-3 text-primary-600" />
                <span className="bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  {match.match_number}
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {getMatchTypeTag(match.match_type)}
                {match.group_name && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                    {getDisplayGroupName(match.group_name)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">{getMatchStatusTag(match.match_status)}</div>
          </div>
        </div>
      </div>

      {/* Match Score and Teams */}
      <div className="mb-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="p-6">
          <div className="flex items-center justify-center space-x-2">
            {/* Team 1 */}
            <div className="flex flex-col items-center space-y-3">
              <div
                className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: match.team1_color || "#1890ff",
                  border:
                    winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, "team1")
                      ? "4px solid #faad14"
                      : "none",
                }}
              >
                <TeamOutlined className="text-3xl text-white" />
              </div>
              <div className="text-center">
                <button
                  className="text-xl font-bold text-gray-800 hover:text-primary-600 transition-colors duration-200 bg-transparent border-none cursor-pointer"
                  onClick={() => handleTeamNavigation(match, "team1")}
                >
                  {getTeamDisplayNameWithReference(match, "team1")}
                </button>
                {winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, "team1") && (
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <TrophyOutlined className="mr-1" />
                    {t("match:result.winner")}
                  </div>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="text-center space-y-4 w-full">
              {match.match_status === "completed" ? (
                <div>
                  <h1 className="text-4xl font-bold text-primary-600 m-0 whitespace-nowrap">
                    {match.team1_score || 0} : {match.team2_score || 0}
                  </h1>
                  {winnerInfo && winnerInfo.reason && <p className="text-gray-500 mt-2">({winnerInfo.reason})</p>}
                </div>
              ) : match.match_status === "active" ? (
                <div>
                  <h1 className="text-5xl font-bold text-red-500 m-0">
                    {match.team1_score || 0} - {match.team2_score || 0}
                  </h1>
                  <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <PlayCircleOutlined className="mr-1" />
                    {t("match:status.inProgress")}
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-5xl font-bold text-gray-300 m-0">- : -</h1>
                  <p className="text-gray-500 mt-2">{t("match:status.notStarted")}</p>
                </div>
              )}
            </div>

            {/* Team 2 */}
            <div className="flex flex-col items-center space-y-3">
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{
                    backgroundColor: match.team2_color || "#52c41a",
                    border:
                      winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, "team2")
                        ? "4px solid #faad14"
                        : "none",
                  }}
                >
                  <TeamOutlined className="text-3xl text-white" />
                </div>
                <div>
                  <button
                    className="text-xl font-bold text-gray-800 hover:text-primary-600 transition-colors duration-200 bg-transparent border-none cursor-pointer"
                    onClick={() => handleTeamNavigation(match, "team2")}
                  >
                    {getTeamDisplayNameWithReference(match, "team2")}
                  </button>
                  {winnerInfo && winnerInfo.name === getTeamDisplayNameWithReference(match, "team2") && (
                    <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <TrophyOutlined className="mr-1" />
                      {t("match:result.winner")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Information */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-primary-500">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <CalendarOutlined className="mr-2 text-primary-600" />
              {t("match:match.information")}
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">{t("match:match.time")}</span>
                <span className="text-sm text-gray-800">
                  {match.match_date ? moment(match.match_date).format("YYYY/MM/DD HH:mm") : t("match:status.pending")}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">{t("match:match.duration")}</span>
                <span className="text-sm text-gray-800">{matchDuration}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">{t("match:match.type")}</span>
                <div>{getMatchTypeTag(match.match_type)}</div>
              </div>
              {match.group_name && (
                <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-600">{t("group:group.name")}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                    {getDisplayGroupName(match.group_name)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">{t("match:match.status")}</span>
                <div>{getMatchStatusTag(match.match_status)}</div>
              </div>
              {match.match_status === "completed" && (
                <>
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">{t("match:match.startTime")}</span>
                    <span className="text-sm text-gray-800">
                      {match.start_time ? moment(match.start_time).format("HH:mm:ss") : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-600">{t("match:match.endTime")}</span>
                    <span className="text-sm text-gray-800">
                      {match.end_time ? moment(match.end_time).format("HH:mm:ss") : "-"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Match Statistics */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-warning-500">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
              <ThunderboltOutlined className="mr-2 text-warning-600" />
              {t("match:match.statistics")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrophyOutlined className="text-xl mr-2" style={{ color: match.team1_color || "#1890ff" }} />
                  <span className="text-sm font-medium text-gray-600">
                    {getTeamDisplayNameWithReference(match, "team1")}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: match.team1_color || "#1890ff" }}>
                  {match.team1_score || 0} {t("match:statistics.goals")}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrophyOutlined className="text-xl mr-2" style={{ color: match.team2_color || "#52c41a" }} />
                  <span className="text-sm font-medium text-gray-600">
                    {getTeamDisplayNameWithReference(match, "team2")}
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: match.team2_color || "#52c41a" }}>
                  {match.team2_score || 0} {t("match:statistics.goals")}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FlagOutlined className="text-xl mr-2 text-red-500" />
                  <span className="text-sm font-medium text-gray-600">
                    {getTeamDisplayNameWithReference(match, "team1")} {t("match:statistics.fouls")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-red-500">{match.team1_fouls || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <FlagOutlined className="text-xl mr-2 text-red-500" />
                  <span className="text-sm font-medium text-gray-600">
                    {getTeamDisplayNameWithReference(match, "team2")} {t("match:statistics.fouls")}
                  </span>
                </div>
                <div className="text-2xl font-bold text-red-500">{match.team2_fouls || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Match Events */}
      {events.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-success-500">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-6">
              <FieldTimeOutlined className="mr-2 text-success-600" />
              {t("match:match.events")}
            </h3>
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">
                        {getDisplayTeamName(event.team_name)} - {event.event_type}
                      </p>
                      <span className="text-xs text-gray-500 font-mono">{formatEventTime(event.event_time)}</span>
                    </div>
                    {event.athlete_name && (
                      <p className="text-xs text-gray-600 mt-1">
                        {t("team:athlete.name")}: {event.athlete_name}
                      </p>
                    )}
                    {event.description && <p className="text-sm text-gray-700 mt-1">{event.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="mt-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-gray-400">
        <div className="p-6">
          <h4 className="text-base font-semibold text-gray-800 mb-4">{t("common:navigation.relatedPages")}</h4>
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center px-4 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              onClick={() => handleTeamNavigation(match, "team1")}
            >
              <TeamOutlined className="mr-2" />
              {t("common:actions.view")} {getTeamDisplayNameWithReference(match, "team1")}
            </button>
            <button
              className="inline-flex items-center px-4 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              onClick={() => handleTeamNavigation(match, "team2")}
            >
              <TeamOutlined className="mr-2" />
              {t("common:actions.view")} {getTeamDisplayNameWithReference(match, "team2")}
            </button>
            {match.group_id && (
              <button
                className="inline-flex items-center px-4 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
                onClick={() => navigate(`/groups/${match.group_id}`)}
              >
                <TrophyOutlined className="mr-2" />
                {t("common:actions.viewGroupDetails")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientMatchDetail;
