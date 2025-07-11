import React, { useState, useEffect } from 'react';
import { Card, Typography, Table, Tag, Row, Col, Space, Progress, message } from 'antd';
import { TrophyOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

const GroupStandingsLeaderboard = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);

      // 使用與錦標賽小組頁面相同的API調用方式
      const [groupsRes, statsRes] = await Promise.all([
        axios.get('/api/groups'),
        axios.get('/api/stats/groups'),
      ]);

      if (groupsRes.data.success) {
        const groupsData = groupsRes.data.data.groups || [];
        const standings = statsRes.data.success ? statsRes.data.data.standings || [] : [];

        // 組合小組數據和積分榜，與錦標賽頁面相同的邏輯
        const groupsWithStandings = groupsData.map((group) => {
          const groupStandings = standings
            .filter((team) => team.group_id === group.group_id)
            .sort((a, b) => b.points - a.points)
            .map((team) => ({
              team_id: team.team_id,
              name: team.team_name,
              points: team.points,
              played: team.played,
              won: team.won,
              drawn: team.drawn,
              lost: team.lost,
              gf: team.goals_for,
              ga: team.goals_against,
            }));

          return {
            group_id: group.group_id,
            group_name: group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name,
            internal_name: group.group_name,
            max_teams: group.max_teams,
            current_teams: groupStandings.length,
            teams: groupStandings,
            team_count: group.team_count || 0,
            total_matches: group.total_matches || 0,
            completed_matches: group.completed_matches || 0,
          };
        });

        setGroups(groupsWithStandings);
      } else {
        message.error("獲取小組列表失敗");
      }
    } catch (error) {
      console.error("獲取小組數據錯誤:", error);
      message.error("獲取小組數據失敗");
    } finally {
      setLoading(false);
    }
  };

  const standingsColumns = [
    {
      title: "排名",
      key: "rank",
      width: 60,
      render: (_, __, index) => (
        <span
          style={{
            fontWeight: "bold",
            color: index < 2 ? "#52c41a" : "#666",
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: "隊伍",
      dataIndex: "name",
      key: "name",
      render: (name, record, index) => (
        <Space>
          {index < 2 && <TrophyOutlined style={{ color: "#faad14" }} />}
          <span
            style={{
              fontWeight: index < 2 ? "bold" : "normal",
              color: "#1890ff",
            }}
          >
            {name}
          </span>
        </Space>
      ),
    },
    {
      title: "積分",
      dataIndex: "points",
      key: "points",
      width: 60,
      render: (points) => <span style={{ fontWeight: "bold", color: "#1890ff" }}>{points}</span>,
    },
    {
      title: "場次",
      dataIndex: "played",
      key: "played",
      width: 60,
    },
    {
      title: "勝",
      dataIndex: "won",
      key: "won",
      width: 50,
      render: (won) => <span style={{ color: "#52c41a" }}>{won}</span>,
    },
    {
      title: "平",
      dataIndex: "drawn",
      key: "drawn",
      width: 50,
      render: (drawn) => <span style={{ color: "#faad14" }}>{drawn}</span>,
    },
    {
      title: "負",
      dataIndex: "lost",
      key: "lost",
      width: 50,
      render: (lost) => <span style={{ color: "#ff4d4f" }}>{lost}</span>,
    },
    {
      title: "進球",
      dataIndex: "gf",
      key: "gf",
      width: 60,
    },
    {
      title: "失球",
      dataIndex: "ga",
      key: "ga",
      width: 60,
    },
    {
      title: "淨勝球",
      key: "gd",
      width: 80,
      render: (_, record) => {
        const gd = record.gf - record.ga;
        return (
          <span
            style={{
              color: gd > 0 ? "#52c41a" : gd < 0 ? "#ff4d4f" : "#666",
              fontWeight: "bold",
            }}
          >
            {gd > 0 ? "+" : ""}
            {gd}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Title level={2}>小組排行榜</Title>
        </div>

        <Row gutter={[16, 16]}>
          {groups.map((group) => (
            <Col xs={24} lg={12} key={group.group_id}>
              <Card
                title={
                  <Space>
                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>小組 {group.group_name}</span>
                    <Tag color="blue">
                      {group.current_teams}/{group.max_teams} 隊伍
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    {/* No action buttons for leaderboard view */}
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <div>
                    <Text type="secondary">隊伍完整度</Text>
                    <Progress
                      percent={(group.current_teams / group.max_teams) * 100}
                      size="small"
                      status={group.current_teams === group.max_teams ? "success" : "active"}
                    />
                  </div>

                  <div>
                    <Text type="secondary">比賽進度</Text>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Progress
                        percent={group.total_matches > 0 ? Math.round((group.completed_matches / group.total_matches) * 1000) / 10 : 0}
                        size="small"
                        status={group.completed_matches === group.total_matches && group.total_matches > 0 ? "success" : "active"}
                      />
                      <Text style={{ fontSize: "12px", color: "#666", whiteSpace: "nowrap" }}>
                        ({group.completed_matches}/{group.total_matches}比賽)
                      </Text>
                    </div>
                  </div>

                  <div>
                    <Text strong style={{ marginBottom: 8, display: "block" }}>
                      積分榜
                    </Text>
                    <Table
                      columns={standingsColumns}
                      dataSource={group.teams}
                      pagination={false}
                      size="small"
                      rowKey="name"
                      scroll={{ x: true }}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {groups.length === 0 && !loading && (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Text type="secondary">暫無小組數據</Text>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default GroupStandingsLeaderboard;