import React, { useState, useEffect } from "react";
import {
  Card,
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
import { useTranslation } from 'react-i18next';
import moment from "moment";
import axios from "axios";
import { formatMatchDuration } from "../../utils/timeUtils";
import { getMatchTypeText } from "../../utils/matchUtils";


const MatchDetail = () => {
  const { t } = useTranslation(['match', 'common']);
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
        message.error(t('messages.noMatchData'));
        navigate(`/tournaments/${tournamentId}/matches`);
      }
    } catch (error) {
      console.error("獲取比賽詳情錯誤:", error);
      message.error(t('messages.noMatchData'));
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
      title: t('messages.deleteConfirmation'),
      content: t('messages.deleteMatchConfirmation', { 
        matchNumber: matchData.match_number,
        defaultValue: `確定要刪除比賽 "${matchData.match_number}" 嗎？此操作無法撤銷。`
      }),
      okText: t('common:actions.confirmDelete', { defaultValue: '確認刪除' }),
      okType: "danger",
      cancelText: t('common:actions.cancel', { defaultValue: '取消' }),
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/matches/${matchId}`);

          if (response.data.success) {
            message.success(t('messages.matchDeleted'));
            navigate(`/tournaments/${tournamentId}/matches`);
          } else {
            message.error(response.data.message || t('messages.deleteFailed', { defaultValue: '刪除失敗' }));
          }
        } catch (error) {
          console.error("刪除比賽錯誤:", error);
          if (error.response?.data?.message) {
            message.error(error.response.data.message);
          } else {
            message.error(t('messages.deleteFailed', { defaultValue: '刪除失敗，請重試' }));
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
        return t('status.pending');
      case "active":
        return t('status.active');
      case "completed":
        return t('status.completed');
      case "overtime":
        return t('status.overtime');
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
        return t('statistics.goals');
      case "foul":
        return t('statistics.fouls');
      case "timeout":
        return t('events.timeout', { defaultValue: '暫停' });
      case "penalty":
        return t('events.penalty', { defaultValue: '點球' });
      case "substitution":
        return t('events.substitution', { defaultValue: '換人' });
      default:
        return t('events.other', { defaultValue: '其他' });
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
    if (!matchData) return t('common:status.pending', { defaultValue: '待定' });

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
      const resultType = matchNum === 'TP01' ? t('results.loss') : t('results.win');
      return `${sourceMatch}${resultType}`;
    }
    
    // 如果是第一輪比賽（沒有來源），返回待定
    if (matchNum.startsWith('QU') || matchNum.startsWith('R16') || matchNum.startsWith('R32')) {
      return t('common:status.pending', { defaultValue: '待定' });
    }
    
    return t('common:status.pending', { defaultValue: '待定' });
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <Spin size="large" />
        <div className="mt-4">{t('messages.loadingMatches')}</div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold mb-4">{t('messages.matchNotFound', { defaultValue: '比賽不存在' })}</h3>
        <Button onClick={handleBack}>{t('actions.backToMatchList', { defaultValue: '返回比賽列表' })}</Button>
      </div>
    );
  }

  const eventsColumns = [
    {
      title: t('match.time'),
      dataIndex: "event_time",
      key: "event_time",
      width: 80,
      render: (time) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{time}</code>,
    },
    {
      title: t('events.event', { defaultValue: '事件' }),
      dataIndex: "event_type",
      key: "event_type",
      width: 100,
      render: (type) => (
        <Space>
          <span>{getEventIcon(type)}</span>
          <span>{getEventText(type)}</span>
        </Space>
      ),
    },
    {
      title: t('match.teams'),
      dataIndex: "team_name",
      key: "team_name",
      width: 150,
      render: (teamName) => getDisplayTeamName(teamName),
    },
    {
      title: t('common:athlete', { defaultValue: '球員' }),
      dataIndex: "athlete_name",
      key: "athlete_name",
      width: 120,
      render: (name) => name || "-",
    },
    {
      title: t('common:description', { defaultValue: '描述' }),
      dataIndex: "description",
      key: "description",
      render: (desc) => desc || "-",
    },
  ];

  return (
    <div className="p-6">
      <Space direction="vertical" size="large" className="w-full">
        {/* 頁面標題和操作按鈕 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              {t('actions.backToMatchList', { defaultValue: '返回比賽列表' })}
            </Button>
            <h2 className="text-2xl font-bold m-0">
              {t('match.detail')}
            </h2>
          </div>

          <Space>
            {matchData.match_status === "pending" && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={!matchData.team1_name || !matchData.team2_name ? t('messages.teamsNotDetermined') : t('actions.edit')}
                >
                  {t('actions.edit')}
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartMatch}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={!matchData.team1_name || !matchData.team2_name ? t('messages.teamsNotDetermined') : t('actions.start')}
                >
                  {t('actions.start')}
                </Button>
              </>
            )}
            <Button danger icon={<DeleteOutlined />} onClick={handleDeleteMatch}>
              {t('actions.delete')}
            </Button>
            {matchData.match_status === "postponed" && (
              <>
                <Button
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={
                    !matchData.team1_name || !matchData.team2_name ? t('messages.teamsNotDetermined') : t('actions.editPostponed')
                  }
                  className="text-orange-500 border-orange-500"
                >
                  {t('actions.edit')}
                </Button>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartMatch}
                  disabled={!matchData.team1_name || !matchData.team2_name}
                  title={
                    !matchData.team1_name || !matchData.team2_name ? t('messages.teamsNotDetermined') : t('actions.startPostponed')
                  }
                  style={{ backgroundColor: "#fa8c16" }}
                >
                  {t('actions.start')}
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
                {t('match.live')}
              </Button>
            )}
            {matchData.match_status === "completed" && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/matches/${matchId}/result-edit`)}
              >
                {t('actions.editResult', { defaultValue: '編輯結果' })}
              </Button>
            )}
          </Space>
        </div>

        {/* 比賽基本信息 */}
        <Card>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <div className="text-center p-5">
                <h3 className="text-xl font-bold mb-2">
                  {matchData.match_number}
                </h3>
                <div className="text-2xl font-bold mb-4">
                  <span className="text-blue-500">{getTeamDisplayName("team1")}</span>
                  <span className="mx-4 text-gray-600">VS</span>
                  <span className="text-blue-500">{getTeamDisplayName("team2")}</span>
                </div>
                {matchData.match_status !== "pending" && (
                  <div className="text-3xl font-bold text-red-500">
                    {matchData.team1_score} : {matchData.team2_score}
                  </div>
                )}
                <div className="mt-4">
                  <Tag color={getStatusColor(matchData.match_status)} className="text-sm px-3 py-1">
                    {getStatusText(matchData.match_status)}
                  </Tag>
                  {matchData.group_name && (
                    <Tag color="blue" className="text-sm px-3 py-1 ml-2">
                      {t('match.group')} {getDisplayGroupName(matchData.group_name)}
                    </Tag>
                  )}
                </div>
              </div>
            </Col>

            <Col xs={24} lg={12}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title={`${getTeamDisplayName("team1")} ${t('statistics.fouls')}`} value={matchData.team1_fouls} prefix="🟨" />
                </Col>
                <Col span={12}>
                  <Statistic title={`${getTeamDisplayName("team2")} ${t('statistics.fouls')}`} value={matchData.team2_fouls} prefix="🟨" />
                </Col>
              </Row>
              {matchData.winner_name && (
                <div className="mt-4 text-center">
                  <TrophyOutlined className="text-yellow-500 text-xl mr-2" />
                  <strong className="text-base">
                    {t('match.winner')}：{getDisplayTeamName(matchData.winner_name)}
                  </strong>
                </div>
              )}
            </Col>
          </Row>
        </Card>

        {/* 比賽詳細信息 */}
        <Card title={t('match.detail')} extra={<CalendarOutlined />}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label={t('match.number')}>{matchData.match_number}</Descriptions.Item>
            <Descriptions.Item label={t('match.type')}>
              <Tag color="cyan">{getMatchTypeText(matchData)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('match.time')}>
              {moment(matchData.match_date).format("YYYY-MM-DD HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label={t('match.duration')}>{formatMatchDuration(matchData.match_time)}</Descriptions.Item>
            {matchData.tournament_stage && (
              <Descriptions.Item label={t('match.stage')} span={2}>
                {matchData.tournament_stage}
              </Descriptions.Item>
            )}
            {matchData.start_time && (
              <Descriptions.Item label={t('common:time.startTime', { defaultValue: '開始時間' })}>
                {moment(matchData.start_time).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
            )}
            {matchData.end_time && (
              <Descriptions.Item label={t('common:time.endTime', { defaultValue: '結束時間' })}>
                {moment(matchData.end_time).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
            )}
            {matchData.overtime_time && (
              <Descriptions.Item label={t('match.overtime')}>{matchData.overtime_time} {t('common:time.minutes', { defaultValue: '分鐘' })}</Descriptions.Item>
            )}
            {matchData.referee_decision && (
              <Descriptions.Item label={t('match.referee')} span={2}>
                <Tag color="red">{t('common:yes', { defaultValue: '是' })}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('common:time.createdAt', { defaultValue: '創建時間' })}>
              {moment(matchData.created_at).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
            <Descriptions.Item label={t('common:time.updatedAt', { defaultValue: '更新時間' })}>
              {moment(matchData.updated_at).format("YYYY-MM-DD HH:mm:ss")}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 比賽事件 */}
        {events.length > 0 && (
          <Card title={t('events.matchEvents', { defaultValue: '比賽事件' })} extra={<TeamOutlined />}>
            <Table columns={eventsColumns} dataSource={events} rowKey="event_id" pagination={false} size="small" />
          </Card>
        )}

        {/* 如果沒有事件，顯示提示 */}
        {events.length === 0 && matchData.match_status !== "pending" && (
          <Card title={t('events.matchEvents', { defaultValue: '比賽事件' })}>
            <div className="text-center p-10 text-gray-400">
              <TeamOutlined className="text-5xl mb-4" />
              <div>{t('events.noEvents', { defaultValue: '暫無比賽事件記錄' })}</div>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default MatchDetail;
