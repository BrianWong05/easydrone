import React, { useState, useEffect } from "react";
import { Card, Table, Tag, Statistic, Spin, Alert, Tabs, Avatar, Space, Row, Col } from "antd";
import {
  TrophyOutlined,
  TeamOutlined,
  CalendarOutlined,
  FireOutlined,
  StarOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import moment from "moment";

const { TabPane } = Tabs;

const ClientLeaderboard = () => {
  const { t } = useTranslation(["team", "common", "public", "match", "stats", "group"]);
  const navigate = useNavigate();
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

  const [tournament, setTournament] = useState(null);
  const [overallLeaderboard, setOverallLeaderboard] = useState([]);
  const [groupLeaderboards, setGroupLeaderboards] = useState([]);
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalMatches: 0,
    completedMatches: 0,
    totalGoals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);

      // Get active tournament
      const tournamentResponse = await axios.get("/api/tournaments/public");
      let tournamentData = null;

      if (tournamentResponse.data.success && tournamentResponse.data.data) {
        tournamentData = tournamentResponse.data.data;
      } else {
        // Fallback to first active tournament
        const fallbackResponse = await axios.get("/api/tournaments?status=active&limit=1");
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          tournamentData = fallbackResponse.data.data.tournaments[0];
        }
      }

      if (!tournamentData) {
        setError(t("public:layout.noActiveTournament"));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // 先重新計算積分榜以確保數據是最新的
      try {
        await axios.post("/api/stats/calculate-all-group-standings");
        console.log("✅ Group standings recalculated for client leaderboard");
      } catch (calcError) {
        console.warn("⚠️ Failed to recalculate standings:", calcError);
        // 繼續執行，即使計算失敗也要顯示現有數據
      }

      // Fetch overall leaderboard for this tournament
      const overallResponse = await axios.get(`/api/tournaments/${tournamentId}/stats/overall-leaderboard`);
      if (overallResponse.data.success) {
        setOverallLeaderboard(overallResponse.data.data.leaderboard || []);
      }

      // Fetch group leaderboards for this tournament only
      const groupsResponse = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      if (groupsResponse.data.success) {
        const tournamentGroups = groupsResponse.data.data?.groups || groupsResponse.data.data || [];

        // For each group, get its standings
        const groupLeaderboards = [];
        for (const group of tournamentGroups) {
          try {
            const standingsResponse = await axios.get(`/api/stats/group-standings?group_id=${group.group_id}`);
            if (standingsResponse.data.success) {
              const groupStandings = standingsResponse.data.data.standings || [];
              // Find the group that matches our current group
              const matchingGroup = groupStandings.find((g) => g.group_id === group.group_id);
              if (matchingGroup) {
                groupLeaderboards.push(matchingGroup);
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch standings for group ${group.group_id}:`, error);
          }
        }
        setGroupLeaderboards(groupLeaderboards);
      }

      // Calculate statistics
      const teamsResponse = await axios.get(`/api/tournaments/${tournamentId}/teams`);
      const matchesResponse = await axios.get(`/api/tournaments/${tournamentId}/matches`);

      let totalTeams = 0;
      let totalMatches = 0;
      let completedMatches = 0;
      let totalGoals = 0;

      if (teamsResponse.data.success) {
        const teamsData = teamsResponse.data.data;
        const teams = Array.isArray(teamsData) ? teamsData : teamsData.teams || [];
        totalTeams = teams.length;
      }

      if (matchesResponse.data.success) {
        const matchesData = matchesResponse.data.data;
        const matches = Array.isArray(matchesData) ? matchesData : matchesData.matches || [];
        totalMatches = matches.length;
        completedMatches = matches.filter((m) => m.match_status === "completed").length;
        totalGoals = matches.reduce((sum, match) => {
          if (match.match_status === "completed") {
            return sum + (match.team1_score || 0) + (match.team2_score || 0);
          }
          return sum;
        }, 0);
      }

      setStats({
        totalTeams,
        totalMatches,
        completedMatches,
        totalGoals,
      });
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setError(t("stats:messages.loadingStats"));
    } finally {
      setLoading(false);
    }
  };

  const overallColumns = [
    {
      title: t("stats:rankings.position"),
      dataIndex: "rank",
      key: "rank",
      width: 80,
      render: (rank) => {
        let color = "#666";
        let icon = null;

        if (rank === 1) {
          color = "#faad14";
          icon = <TrophyOutlined style={{ color }} />;
        } else if (rank === 2) {
          color = "#a0a0a0";
          icon = <StarOutlined style={{ color }} />;
        } else if (rank === 3) {
          color = "#cd7f32";
          icon = <FireOutlined style={{ color }} />;
        }

        return (
          <div className="flex items-center space-x-2">
            {icon}
            <span
              className={`text-base font-bold ${
                rank === 1
                  ? "text-warning-500"
                  : rank === 2
                  ? "text-gray-400"
                  : rank === 3
                  ? "text-orange-600"
                  : "text-gray-600"
              }`}
            >
              {rank}
            </span>
          </div>
        );
      },
    },
    {
      title: t("team:team.name"),
      dataIndex: "team_name",
      key: "team_name",
      render: (name, record) => (
        <div className="flex items-center space-x-3">
          <Avatar
            style={{
              backgroundColor: record.team_color || "#1890ff",
              border: `2px solid ${record.team_color || "#1890ff"}`,
            }}
            className="flex-shrink-0"
            icon={<TeamOutlined />}
          />
          <div className="min-w-0 flex-1">
            <span
              className="text-base font-semibold cursor-pointer hover:underline transition-colors duration-200 block truncate"
              style={{ color: record.team_color || "#1890ff" }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
              title={getDisplayTeamName(name)}
            >
              {getDisplayTeamName(name)}
            </span>
            {record.group_name && (
              <span className="text-xs text-gray-500 block truncate">
                {t("team:team.group")} {getDisplayGroupName(record.group_name)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: t("team:team.points"),
      dataIndex: "points",
      key: "points",
      width: 100,
      render: (points) => <span className="text-lg font-bold text-primary-600">{points || 0}</span>,
      sorter: (a, b) => (b.points || 0) - (a.points || 0),
    },
    {
      title: t("match:match.list"),
      children: [
        {
          title: t("team:team.matchesPlayed"),
          dataIndex: "played",
          key: "played",
          width: 60,
          align: "center",
          render: (played) => <span className="font-bold">{played || 0}</span>,
        },
        {
          title: t("team:team.wins"),
          dataIndex: "won",
          key: "won",
          width: 50,
          align: "center",
          render: (won) => <span className="text-success-600 font-medium">{won || 0}</span>,
        },
        {
          title: t("team:team.draws"),
          dataIndex: "drawn",
          key: "drawn",
          width: 50,
          align: "center",
          render: (drawn) => <span className="text-warning-600 font-medium">{drawn || 0}</span>,
        },
        {
          title: t("team:team.losses"),
          dataIndex: "lost",
          key: "lost",
          width: 50,
          align: "center",
          render: (lost) => <span className="text-error-500 font-medium">{lost || 0}</span>,
        },
      ],
    },
    {
      title: t("team:team.goalsFor"),
      children: [
        {
          title: t("team:labels.goalsForShort", { defaultValue: "進" }),
          dataIndex: "goals_for",
          key: "goals_for",
          width: 50,
          align: "center",
          render: (goals) => (
            <span className="font-bold" style={{ color: "#000" }}>
              {goals || 0}
            </span>
          ),
        },
        {
          title: t("team:labels.goalsAgainstShort", { defaultValue: "失" }),
          dataIndex: "goals_against",
          key: "goals_against",
          width: 50,
          align: "center",
          render: (goals) => <span style={{ color: "#000" }}>{goals || 0}</span>,
        },
        {
          title: t("team:labels.goalDifferenceShort", { defaultValue: "差" }),
          dataIndex: "goal_difference",
          key: "goal_difference",
          width: 60,
          align: "center",
          render: (diff) => {
            const color = diff > 0 ? "#52c41a" : diff < 0 ? "#ff4d4f" : "#666";
            return (
              <span style={{ color }}>
                {diff > 0 ? "+" : ""}
                {diff || 0}
              </span>
            );
          },
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Spin size="large" />
        <div className="mt-4">
          <span className="text-gray-600 animate-pulse">{t("stats:messages.loadingStats")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message={t("common:messages.error")} description={error} type="error" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Tournament Header */}
        <Card>
          <Row align="middle" justify="space-between">
            <Col>
              <Space align="center">
                <TrophyOutlined style={{ fontSize: 32, color: "#faad14" }} />
                <div>
                  <h2 style={{ margin: 0 }}>
                    {tournament?.tournament_name} {t("public:navigation.leaderboard")}
                  </h2>
                  <Space>
                    <Tag color="blue">
                      {tournament?.tournament_type === "group" && t("public:tournamentTypes.group")}
                      {tournament?.tournament_type === "knockout" && t("public:tournamentTypes.knockout")}
                      {tournament?.tournament_type === "mixed" && t("public:tournamentTypes.mixed")}
                    </Tag>
                    <span className="text-gray-500">
                      {t("stats:messages.lastUpdated", { defaultValue: "最後更新" })}:{" "}
                      {moment().format("YYYY-MM-DD HH:mm")}
                    </span>
                  </Space>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Statistics */}
        <Card title={t("stats:stats.overview")}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title={t("team:team.totalTeams")}
                value={stats.totalTeams}
                prefix={<TeamOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t("stats:metrics.totalMatches")}
                value={stats.totalMatches}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t("stats:messages.completedMatches")}
                value={stats.completedMatches}
                prefix={<RiseOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t("stats:metrics.goalsScored")}
                value={stats.totalGoals}
                prefix={<FireOutlined />}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Col>
          </Row>
        </Card>

        {/* Leaderboards */}
        <Card>
          <Tabs defaultActiveKey="overall" size="large">
            <TabPane tab={t("stats:rankings.overallRanking")} key="overall">
              <Table
                columns={overallColumns}
                dataSource={overallLeaderboard}
                rowKey="team_id"
                pagination={false}
                locale={{
                  emptyText: (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <TrophyOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                      <div>
                        <span className="text-gray-500" style={{ fontSize: 16 }}>
                          {t("stats:messages.noRankingData")}
                        </span>
                      </div>
                    </div>
                  ),
                }}
                scroll={{ x: 800 }}
              />

              {/* 排名規則說明 */}
              {overallLeaderboard.length > 0 && (
                <Card style={{ marginTop: "24px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    <p>
                      <strong>{t("stats:rules.rankingRules", { defaultValue: "排名規則" })}：</strong>{" "}
                      {t("stats:rules.rankingDescription", {
                        defaultValue: "小組內排名 → 同排名隊伍間比較（積分 → 淨勝球 → 進球數）",
                      })}
                    </p>
                    <p>
                      <strong>{t("stats:rules.pointsRules", { defaultValue: "積分規則" })}：</strong>{" "}
                      {t("stats:rules.pointsDescription", { defaultValue: "勝利 3分，平局 1分，失敗 0分" })}
                    </p>
                    <p>
                      <strong>{t("stats:rules.sortingRules", { defaultValue: "排序說明" })}：</strong>{" "}
                      {t("stats:rules.sortingDescription", {
                        defaultValue: "先顯示各小組第1名，再顯示各小組第2名，以此類推",
                      })}
                    </p>
                  </div>
                </Card>
              )}
            </TabPane>

            {groupLeaderboards.map((group) => (
              <TabPane tab={getDisplayGroupName(group.group_name)} key={group.group_id}>
                <Table
                  columns={overallColumns.filter((col) => col.key !== "group_name")}
                  dataSource={(group.teams || []).map((team, index) => ({
                    ...team,
                    rank: index + 1,
                  }))}
                  rowKey="team_id"
                  pagination={false}
                  locale={{
                    emptyText: (
                      <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <TeamOutlined style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }} />
                        <div>
                          <span className="text-gray-500" style={{ fontSize: 16 }}>
                            {getDisplayGroupName(group.group_name)} {t("team:messages.noTeamData")}
                          </span>
                        </div>
                      </div>
                    ),
                  }}
                  scroll={{ x: 700 }}
                />
              </TabPane>
            ))}
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default ClientLeaderboard;
