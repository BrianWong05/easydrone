import React, { useState, useEffect } from "react";
import { Card, Typography, Button, Space, Descriptions, Tag, Avatar, List, message, Table } from "antd";
import { ArrowLeftOutlined, EditOutlined, UserOutlined, TeamOutlined, TrophyOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const { Title, Text } = Typography;

const TeamDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    fetchTeamData();
    fetchTeamMatches();
  }, [id]);

  const fetchTeamData = async () => {
    try {
      const response = await axios.get(`/api/teams/${id}`);
      if (response.data.success) {
        const data = response.data.data;
        setTeam(data.team);
        setAthletes(data.athletes || []);
      } else {
        message.error("獲取隊伍信息失敗");
        navigate("/teams");
      }
    } catch (error) {
      console.error("獲取隊伍數據錯誤:", error);
      message.error("無法載入隊伍信息");
      navigate("/teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMatches = async () => {
    try {
      setMatchesLoading(true);
      const response = await axios.get(`/api/matches?team_id=${id}`);
      if (response.data.success) {
        setMatches(response.data.data.matches || []);
      }
    } catch (error) {
      console.error("獲取隊伍比賽錯誤:", error);
      message.error("無法載入比賽信息");
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/teams");
  };

  const handleEdit = () => {
    navigate(`/teams/${id}/edit`);
  };

  const getPositionText = (position) => {
    switch (position) {
      case "attacker":
        return "進攻手";
      case "defender":
        return "防守員";
      case "substitute":
        return "替補";
      default:
        return position;
    }
  };

  const getPositionColor = (position) => {
    switch (position) {
      case "attacker":
        return "red";
      case "defender":
        return "blue";
      case "substitute":
        return "orange";
      default:
        return "default";
    }
  };

  const matchColumns = [
    {
      title: "比賽場次",
      dataIndex: "match_number",
      key: "match_number",
      render: (text, record) => (
        <span
          style={{
            fontWeight: "bold",
            color: "#1890ff",
            cursor: "pointer",
            textDecoration: "underline",
          }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {text}
        </span>
      ),
    },
    {
      title: "對手",
      key: "opponent",
      render: (_, record) => {
        const isTeam1 = record.team1_id === parseInt(id);
        const opponentName = isTeam1 ? record.team2_name : record.team1_name;
        const teamScore = isTeam1 ? record.team1_score : record.team2_score;
        const opponentScore = isTeam1 ? record.team2_score : record.team1_score;

        return (
          <div style={{ cursor: "pointer" }} onClick={() => navigate(`/matches/${record.match_id}`)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Text strong style={{ color: "#1890ff" }}>
                vs {opponentName}
              </Text>
              {record.match_status === "completed" && (
                <span style={{ fontSize: "14px", fontWeight: "bold", marginLeft: "8px" }}>
                  {teamScore} - {opponentScore}
                </span>
              )}
            </div>

            {record.match_status === "completed" && (
              <div style={{ marginTop: "4px" }}>
                {record.winner_id ? (
                  <Tag color={record.winner_id === parseInt(id) ? "green" : "red"} size="small">
                    {record.winner_id === parseInt(id) ? "🏆 勝利" : "❌ 失敗"}
                  </Tag>
                ) : (
                  <Tag color="orange" size="small">
                    🤝 平局
                  </Tag>
                )}
                {record.win_reason && (
                  <Tag color="blue" size="small" style={{ marginLeft: "4px" }}>
                    {record.win_reason === "score"
                      ? "比分"
                      : record.win_reason === "fouls"
                      ? "犯規"
                      : record.win_reason === "referee"
                      ? "裁判"
                      : record.win_reason}
                  </Tag>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "比賽時間",
      dataIndex: "match_date",
      key: "match_date",
      render: (date) => new Date(date).toLocaleString("zh-TW"),
    },
    {
      title: "狀態",
      dataIndex: "match_status",
      key: "match_status",
      render: (status, record) => {
        const statusMap = {
          pending: { color: "orange", text: "待開始" },
          active: { color: "green", text: "進行中" },
          completed: { color: "blue", text: "已完成" },
        };
        const statusInfo = statusMap[status] || { color: "default", text: status };

        const isTeam1 = record.team1_id === parseInt(id);
        const teamFouls = isTeam1 ? record.team1_fouls : record.team2_fouls;
        const opponentFouls = isTeam1 ? record.team2_fouls : record.team1_fouls;

        return (
          <div style={{ textAlign: "center" }}>
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            {status === "completed" && teamFouls !== undefined && opponentFouls !== undefined && (
              <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                犯規: {teamFouls} - {opponentFouls}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/matches/${record.match_id}`)}>
            查看
          </Button>
          {record.match_status === "pending" && (
            <Button type="link" size="small" onClick={() => navigate(`/matches/${record.match_id}/live`)}>
              開始比賽
            </Button>
          )}
          {record.match_status === "active" && (
            <Button
              type="link"
              size="small"
              style={{ color: "#52c41a" }}
              onClick={() => navigate(`/matches/${record.match_id}/live`)}
            >
              進入比賽
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const getTeamStats = () => {
    const completedMatches = matches.filter((m) => m.match_status === "completed");
    const wins = completedMatches.filter((m) => m.winner_id === parseInt(id)).length;
    const draws = completedMatches.filter((m) => !m.winner_id).length;
    const losses = completedMatches.length - wins - draws;

    let goalsFor = 0;
    let goalsAgainst = 0;
    let foulsFor = 0;
    let foulsAgainst = 0;

    completedMatches.forEach((match) => {
      const isTeam1 = match.team1_id === parseInt(id);
      if (isTeam1) {
        goalsFor += match.team1_score || 0;
        goalsAgainst += match.team2_score || 0;
        foulsFor += match.team1_fouls || 0;
        foulsAgainst += match.team2_fouls || 0;
      } else {
        goalsFor += match.team2_score || 0;
        goalsAgainst += match.team1_score || 0;
        foulsFor += match.team2_fouls || 0;
        foulsAgainst += match.team1_fouls || 0;
      }
    });

    return {
      played: completedMatches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      foulsFor,
      foulsAgainst,
      points: wins * 3 + draws,
    };
  };

  if (loading) {
    return <div style={{ padding: "24px" }}>載入中...</div>;
  }

  if (!team) {
    return <div style={{ padding: "24px" }}>隊伍不存在</div>;
  }

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            返回列表
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            隊伍詳情
          </Title>
        </div>

        <Card
          title={
            <Space>
              <div
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: team.team_color,
                  borderRadius: "50%",
                  border: "1px solid #ccc",
                }}
              />
              <span style={{ fontSize: "20px", fontWeight: "bold" }}>{team.team_name}</span>
              <Tag color="blue">小組 {team.group_name}</Tag>
              {team.is_virtual && <Tag color="orange">虛擬隊伍</Tag>}
            </Space>
          }
          extra={
            <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              編輯隊伍
            </Button>
          }
        >
          <Descriptions column={2} bordered>
            <Descriptions.Item label="隊伍名稱">{team.team_name}</Descriptions.Item>
            <Descriptions.Item label="所屬小組">小組 {team.group_name}</Descriptions.Item>
            <Descriptions.Item label="隊伍顏色">
              <Space>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    backgroundColor: team.team_color,
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                  }}
                />
                {team.team_color}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="隊伍類型">
              <Tag color={team.is_virtual ? "orange" : "green"}>{team.is_virtual ? "虛擬隊伍" : "正式隊伍"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="運動員數量">{athletes.length} 人</Descriptions.Item>
            <Descriptions.Item label="創建時間">{team.created_at}</Descriptions.Item>
            {team.description && (
              <Descriptions.Item label="隊伍描述" span={2}>
                {team.description}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>隊伍成員</span>
              <Tag color="blue">{athletes.length} 人</Tag>
            </Space>
          }
          extra={
            <Space>
              <Button type="default" onClick={() => navigate(`/athletes?team=${team.team_id}`)}>
                管理運動員
              </Button>
              <Button type="primary" onClick={() => navigate("/athletes/create")}>
                添加運動員
              </Button>
            </Space>
          }
        >
          {athletes.length > 0 ? (
            <List
              dataSource={athletes}
              renderItem={(athlete) => (
                <List.Item
                  actions={[
                    <Button type="link" size="small" onClick={() => navigate(`/athletes/${athlete.athlete_id}`)}>
                      查看
                    </Button>,
                    <Button type="link" size="small" onClick={() => navigate(`/athletes/${athlete.athlete_id}/edit`)}>
                      編輯
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{
                          backgroundColor: team.team_color,
                          color: "#fff",
                          fontWeight: "bold",
                        }}
                      >
                        {athlete.jersey_number}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <Text strong>{athlete.name}</Text>
                        <Tag color={getPositionColor(athlete.position)}>{getPositionText(athlete.position)}</Tag>
                      </Space>
                    }
                    description={`#${athlete.jersey_number} | ${athlete.age ? `${athlete.age}歲` : "年齡未知"}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <UserOutlined style={{ fontSize: "48px", color: "#ccc", marginBottom: "16px" }} />
              <div>
                <Text type="secondary">暫無隊員</Text>
                <br />
                <Button type="primary" style={{ marginTop: "16px" }} onClick={() => navigate("/athletes/create")}>
                  添加第一個運動員
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 比賽記錄 */}
        <Card
          title={
            <Space>
              <TrophyOutlined />
              <span>比賽記錄</span>
              <Tag color="blue">{matches.length} 場</Tag>
            </Space>
          }
          loading={matchesLoading}
        >
          {matches.length > 0 ? (
            <>
              {/* 戰績統計 */}
              <Card size="small" style={{ marginBottom: "16px", backgroundColor: "#f8f9fa" }} title="戰績統計">
                {(() => {
                  const stats = getTeamStats();
                  return (
                    <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1890ff" }}>{stats.played}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>已踢</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#52c41a" }}>{stats.wins}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>勝</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#faad14" }}>{stats.draws}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>平</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#ff4d4f" }}>{stats.losses}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>負</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1890ff" }}>{stats.points}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>積分</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                          {stats.goalsFor} - {stats.goalsAgainst}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>進球-失球</div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "bold",
                            color: stats.goalDifference > 0 ? "#52c41a" : stats.goalDifference < 0 ? "#ff4d4f" : "#666",
                          }}
                        >
                          {stats.goalDifference > 0 ? "+" : ""}
                          {stats.goalDifference}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>淨勝球</div>
                      </div>
                    </div>
                  );
                })()}
              </Card>

              {/* 比賽列表 */}
              <Table
                columns={matchColumns}
                dataSource={matches}
                rowKey="match_id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: "暫無比賽記錄" }}
                size="small"
              />
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <TrophyOutlined style={{ fontSize: "48px", color: "#ccc", marginBottom: "16px" }} />
              <div>
                <Text type="secondary">暫無比賽記錄</Text>
                <br />
                <Button type="primary" style={{ marginTop: "16px" }} onClick={() => navigate("/matches/create")}>
                  創建比賽
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default TeamDetail;
