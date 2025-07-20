import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Space, 
  message, 
  Spin, 
  Alert,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip
} from 'antd';
import { 
  TrophyOutlined, 
  ReloadOutlined,
  CrownOutlined,
  SafetyOutlined,
  FireOutlined,
  BarChartOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';


const TournamentOverallLeaderboard = () => {
  const { t } = useTranslation(['stats', 'common', 'tournament']);
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  useEffect(() => {
    fetchTournamentData();
    fetchTournamentLeaderboard();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data.tournament);
      }
    } catch (error) {
      console.error('獲取錦標賽信息失敗:', error);
    }
  };

  const fetchTournamentLeaderboard = async () => {
    try {
      setLoading(true);
      
      // 先重新計算積分榜以確保數據是最新的
      try {
        await axios.post("/api/stats/calculate-all-group-standings");
        console.log('✅ Group standings recalculated for tournament leaderboard');
      } catch (calcError) {
        console.warn('⚠️ Failed to recalculate standings:', calcError);
        // 繼續執行，即使計算失敗也要顯示現有數據
      }
      
      const response = await axios.get(`/api/tournaments/${tournamentId}/stats/overall-leaderboard`);
      if (response.data.success) {
        const leaderboardData = response.data.data.leaderboard || [];
        setLeaderboard(leaderboardData);
        
        // Update pagination total
        setPagination(prev => ({
          ...prev,
          total: leaderboardData.length
        }));
      }
    } catch (error) {
      console.error('獲取錦標賽總排名榜失敗:', error);
      message.error(t('messages.noRankingData', { ns: 'stats' }));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (paginationConfig, filters, sorter) => {
    const { current, pageSize } = paginationConfig;
    setPagination(prev => ({
      ...prev,
      current,
      pageSize
    }));
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#faad14';
    if (rank === 2) return '#52c41a';
    if (rank === 3) return '#1890ff';
    return '#666';
  };

  // Helper function to clean team names (remove tournament suffix)
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  const leaderboardColumns = [
    {
      title: t('rankings.position', { ns: 'stats' }),
      key: 'rank',
      render: (_, record) => (
        <div className="text-center">
          <span style={{ 
            fontSize: record.rank <= 3 ? '18px' : '16px',
            fontWeight: 'bold',
            color: getRankColor(record.rank)
          }}>
            {getRankIcon(record.rank)}
          </span>
        </div>
      ),
      width: 80,
      fixed: 'left',
    },
    {
      title: t('rankings.team', { ns: 'stats' }),
      key: 'team',
      render: (_, record) => (
        <div className="flex items-center">
          <div 
            className="w-4 h-4 mr-2 border border-gray-300 rounded-sm"
            style={{ 
              backgroundColor: record.team_color
            }} 
          />
          <div>
            <div 
              className="font-bold text-blue-500 cursor-pointer underline"
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <span className="text-xs text-gray-500">
              {record.group_name ? (
                <>
                  {t('group.group', { ns: 'group' })} {record.group_name?.includes("_") ? record.group_name.split("_")[0] : record.group_name}
                  {record.group_position && (
                    <Tag 
                      size="small" 
                      color={
                        record.group_position === 1 ? 'gold' : 
                        record.group_position === 2 ? 'green' : 
                        record.group_position === 3 ? 'blue' : 'default'
                      }
                      className="ml-1"
                    >
                      {t('rankings.position', { ns: 'stats' })}{record.group_position}
                    </Tag>
                  )}
                </>
              ) : t('messages.noGroup', { ns: 'stats' })}
            </span>
          </div>
        </div>
      ),
      width: 220,
      fixed: 'left',
    },
    {
      title: t('rankings.played', { ns: 'stats' }),
      dataIndex: 'played',
      key: 'played',
      width: 70,
      align: 'center',
    },
    {
      title: t('rankings.wins', { ns: 'stats' }),
      dataIndex: 'won',
      key: 'won',
      width: 60,
      align: 'center',
      render: (won) => <span className="text-green-500 font-bold">{won}</span>
    },
    {
      title: t('rankings.draws', { ns: 'stats' }),
      dataIndex: 'drawn',
      key: 'drawn',
      width: 60,
      align: 'center',
      render: (drawn) => <span className="text-yellow-500 font-bold">{drawn}</span>
    },
    {
      title: t('rankings.losses', { ns: 'stats' }),
      dataIndex: 'lost',
      key: 'lost',
      width: 60,
      align: 'center',
      render: (lost) => <span className="text-red-500 font-bold">{lost}</span>
    },
    {
      title: t('rankings.goalsFor', { ns: 'stats' }),
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 70,
      align: 'center',
      render: (goals) => <span className="font-bold">{goals}</span>
    },
    {
      title: t('rankings.goalsAgainst', { ns: 'stats' }),
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 70,
      align: 'center',
    },
    {
      title: t('rankings.goalDifference', { ns: 'stats' }),
      key: 'goal_difference',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <span style={{ 
          color: record.goal_difference > 0 ? '#52c41a' : record.goal_difference < 0 ? '#ff4d4f' : '#666',
          fontWeight: 'bold'
        }}>
          {record.goal_difference > 0 ? '+' : ''}{record.goal_difference}
        </span>
      )
    },
    {
      title: t('rankings.points', { ns: 'stats' }),
      dataIndex: 'points',
      key: 'points',
      width: 80,
      align: 'center',
      render: (points, record) => (
        <span style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: record.rank <= 3 ? getRankColor(record.rank) : '#1890ff'
        }}>
          {points}
        </span>
      )
    },
    {
      title: t('metrics.winRate', { ns: 'stats' }),
      key: 'win_rate',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <span style={{ 
          color: record.win_rate >= 70 ? '#52c41a' : record.win_rate >= 40 ? '#faad14' : '#ff4d4f'
        }}>
          {record.win_rate}%
        </span>
      )
    },
    {
      title: t('metrics.averagePoints', { ns: 'stats' }),
      key: 'points_per_game',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <span>{record.points_per_game}</span>
      )
    },
  ];

  if (loading) {
    return (
      <div className="text-center p-12">
        <Spin size="large" />
        <p>{t('messages.loadingStats', { ns: 'stats' })}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
          >
            {t('navigation.backToTournamentList', { ns: 'common' })}
          </Button>
          <h2 className="text-2xl font-bold m-0">
            <TrophyOutlined /> {tournament?.tournament_name} - {t('rankings.overallRanking', { ns: 'stats' })}
          </h2>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchTournamentLeaderboard}
            loading={loading}
          >
            {t('buttons.refresh', { ns: 'common' })}
          </Button>
        </Space>
      </div>

      {/* 總排名榜 */}
      <Card title={<><BarChartOutlined /> {t('stats.ranking', { ns: 'stats' })}</>}>
        {leaderboard.length === 0 ? (
          <Alert
            message={t('messages.noRankingData', { ns: 'stats' })}
            description={t('messages.rankingWillShow', { ns: 'stats' })}
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={leaderboardColumns}
            dataSource={leaderboard}
            rowKey="team_id"
            pagination={{ 
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => t('pagination.rankingTotal', { 
                ns: 'stats', 
                start: range[0], 
                end: range[1], 
                total: total 
              }),
              pageSizeOptions: ['10', '20', '50', '100'],
              locale: {
                items_per_page: t('common:pagination.itemsPerPage'),
                jump_to: t('common:pagination.jumpTo'),
                page: t('common:pagination.page'),
              },
            }}
            onChange={handleTableChange}
            scroll={{ x: 1000 }}
            size="small"
            locale={{ emptyText: t('messages.noRankingData', { ns: 'stats' }) }}
            rowClassName={(record) => {
              if (record.rank === 1) return 'rank-first';
              if (record.rank === 2) return 'rank-second';
              if (record.rank === 3) return 'rank-third';
              return '';
            }}
          />
        )}
      </Card>

      {leaderboard.length > 0 && (
        <Card className="mt-6">
          <div className="text-xs text-gray-600">
            <p><strong>{t('rules.rankingRules', { ns: 'stats' })}：</strong> {t('rules.rankingDescription', { ns: 'stats' })}</p>
            <p><strong>{t('rules.pointsRules', { ns: 'stats' })}：</strong> {t('rules.pointsDescription', { ns: 'stats' })}</p>
            <p><strong>{t('rules.sortingRules', { ns: 'stats' })}：</strong> {t('rules.sortingDescription', { ns: 'stats' })}</p>
            <p><strong>{t('rules.tagDescription', { ns: 'stats' })}：</strong> 
              <Tag size="small" color="gold" className="mx-1">{t('rankings.position', { ns: 'stats' })}1</Tag>
              <Tag size="small" color="green" className="mx-1">{t('rankings.position', { ns: 'stats' })}2</Tag>
              <Tag size="small" color="blue" className="mx-1">{t('rankings.position', { ns: 'stats' })}3</Tag>
              {t('rules.tagExplanation', { ns: 'stats' })}
            </p>
          </div>
        </Card>
      )}

      <style jsx>{`
        .rank-first {
          background-color: #fff7e6 !important;
        }
        .rank-second {
          background-color: #f6ffed !important;
        }
        .rank-third {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </div>
  );
};

export default TournamentOverallLeaderboard;