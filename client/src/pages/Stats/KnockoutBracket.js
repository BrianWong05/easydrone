import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  Card,
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
  Checkbox,
} from "antd";
import { ArrowLeftOutlined, ThunderboltOutlined, TrophyOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import moment from "moment";


const KnockoutBracket = () => {
  const { t } = useTranslation(['tournament', 'common', 'match']);
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
          include_third_place: true, // 默認包含季軍賽
        });
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      message.error(t('messages.tournamentLoadFailed', { ns: 'tournament' }));
    }
  };

  const fetchBrackets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tournaments/${tournamentId}/bracket`);
      if (response.data.success) {
        const brackets = response.data.data.rounds || {};
        console.log('🔍 Knockout bracket data for tournament', tournamentId, ':', brackets);
        
        // Log sample match data to see available fields
        Object.keys(brackets).forEach(roundNum => {
          const matches = brackets[roundNum];
          if (matches && matches.length > 0) {
            console.log(`🔍 Round ${roundNum} sample match:`, matches[0]);
            console.log(`🔍 Match date field:`, matches[0].match_date);
            console.log(`🔍 Match time field:`, matches[0].match_time);
            console.log(`🔍 All match fields:`, Object.keys(matches[0]));
          }
        });
        
        setBrackets(brackets);
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
        include_third_place: values.include_third_place || false,
      };

      console.log("🎯 生成淘汰賽請求:", requestData);

      const response = await axios.post(`/api/tournaments/${tournamentId}/knockout/generate`, requestData);

      if (response.data.success) {
        message.success(response.data.message);

        // 顯示生成結果
        const data = response.data.data;
        message.info(
          t('messages.knockoutGenerated', { 
            ns: 'tournament',
            teams: data.selected_teams,
            rounds: data.total_rounds,
            matches: data.total_matches
          })
        );

        // 重新獲取對戰表
        await fetchBrackets();
      }
    } catch (error) {
      console.error("Error generating knockout:", error);
      const errorMsg = error.response?.data?.message || t('messages.knockoutGenerationFailed', { ns: 'tournament' });
      message.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const deleteAllKnockoutMatches = () => {
    Modal.confirm({
      title: t('messages.confirmDeleteAllKnockout', { ns: 'tournament' }),
      content: t('messages.deleteAllKnockoutWarning', { ns: 'tournament' }),
      okText: t('buttons.confirmDelete', { ns: 'common' }),
      cancelText: t('buttons.cancel', { ns: 'common' }),
      okType: "danger",
      onOk: async () => {
        try {
          setDeleting(true);
          const response = await axios.delete(`/api/tournaments/${tournamentId}/knockout`);

          if (response.data.success) {
            message.success(t('messages.allKnockoutDeleted', { ns: 'tournament' }));
            setBrackets({});
            await fetchBrackets();
          }
        } catch (error) {
          console.error("Error deleting knockout matches:", error);
          const errorMsg = error.response?.data?.message || t('messages.knockoutDeletionFailed', { ns: 'tournament' });
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
          type: t('types.mixed', { ns: 'tournament' }),
          description: t('knockout.mixedDescription', { ns: 'tournament' }),
          color: "blue",
        };
      case "knockout":
        return {
          type: t('knockout.pureKnockout', { ns: 'tournament' }),
          description: t('knockout.knockoutDescription', { ns: 'tournament' }),
          color: "red",
        };
      case "group":
        return {
          type: t('types.groupStage', { ns: 'tournament' }),
          description: t('knockout.groupNotSupported', { ns: 'tournament' }),
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
          <div className="text-center py-10">
            <TrophyOutlined className="text-5xl text-gray-300 mb-4" />
            <h4 className="text-lg font-semibold text-gray-400 m-0">
              {t('knockout.noBracketGenerated', { ns: 'tournament' })}
            </h4>
            <p className="text-gray-500 m-0">{t('knockout.useGenerationFunction', { ns: 'tournament' })}</p>
          </div>
        </Card>
      );
    }

    const rounds = Object.keys(brackets).sort((a, b) => parseInt(a) - parseInt(b));
    
    // 分離季軍賽和常規輪次
    const regularRounds = [];
    let thirdPlaceMatches = [];
    
    rounds.forEach((roundNum) => {
      const roundMatches = brackets[roundNum];
      const thirdPlace = roundMatches.filter(match => match.tournament_stage === 'third_place');
      const regular = roundMatches.filter(match => match.tournament_stage !== 'third_place');
      
      if (thirdPlace.length > 0) {
        thirdPlaceMatches = thirdPlace;
      }
      if (regular.length > 0) {
        regularRounds.push({ roundNum, matches: regular });
      }
    });

    return (
      <Card
        title={t('knockout.bracketTitle', { ns: 'tournament' })}
        extra={
          <Button danger icon={<DeleteOutlined />} onClick={deleteAllKnockoutMatches} loading={deleting}>
            {t('knockout.deleteAllKnockout', { ns: 'tournament' })}
          </Button>
        }
      >
        {/* 常規淘汰賽輪次 */}
        <Row gutter={16}>
          {regularRounds.map(({ roundNum, matches }) => {
            const roundName = getRoundName(parseInt(roundNum), regularRounds.length);

            return (
              <Col key={roundNum} span={24 / regularRounds.length}>
                <Card size="small" title={roundName} className="mb-4">
                  {matches.map((match) => (
                    <div
                      key={match.match_id}
                      className={`border border-gray-300 rounded p-2 mb-2 cursor-pointer transition-all duration-300 hover:border-blue-500 ${
                        match.match_status === "completed" 
                          ? "bg-green-50 hover:bg-blue-50" 
                          : "bg-gray-50 hover:bg-blue-50"
                      }`}
                      onClick={() => navigate(`/tournaments/${tournamentId}/matches/${match.match_id}`)}
                      title={t('knockout.clickToViewDetails', { ns: 'tournament' })}
                    >
                      <div className="font-bold mb-1">{getMatchDisplayName(match)}</div>
                      <div className="text-xs">
                        {getTeamDisplayName(match, "team1", brackets)} vs {getTeamDisplayName(match, "team2", brackets)}
                      </div>
                      {/* Match Date and Time */}
                      <div className="text-xs text-gray-600 mt-1">
                        {match.match_date ? (
                          <>📅 {moment(match.match_date).format('MM/DD HH:mm')}</>
                        ) : (
                          <span className="text-gray-300">📅 {t('knockout.timeTBD', { ns: 'tournament' })}</span>
                        )}
                      </div>
                      {match.match_status === "completed" && (
                        <>
                          <div className="text-sm font-bold text-blue-500 mt-1">
                            {match.team1_score || 0} : {match.team2_score || 0}
                          </div>
                          <div className="text-xs text-green-500 mt-0.5">
                            {t('knockout.winner', { ns: 'tournament' })}: {getDisplayTeamName(match.winner_name)}
                          </div>
                        </>
                      )}
                      <Tag color={getStatusColor(match.match_status)} size="small" className="mt-1">
                        {getStatusText(match.match_status)}
                      </Tag>
                    </div>
                  ))}
                </Card>
              </Col>
            );
          })}
        </Row>
        
        {/* 季軍賽 */}
        {thirdPlaceMatches.length > 0 && (
          <Row gutter={16} className="mt-4">
            <Col span={24}>
              <Card size="small" title={t('knockout.third', { ns: 'tournament' })} className="bg-orange-50 border-orange-400">
                {thirdPlaceMatches.map((match) => (
                  <div
                    key={match.match_id}
                    className={`border border-orange-400 rounded p-2 mb-2 cursor-pointer transition-all duration-300 hover:border-orange-500 ${
                      match.match_status === "completed" 
                        ? "bg-orange-100 hover:bg-orange-200" 
                        : "bg-orange-25 hover:bg-orange-100"
                    }`}
                    onClick={() => navigate(`/tournaments/${tournamentId}/matches/${match.match_id}`)}
                    title={t('knockout.clickToViewDetails', { ns: 'tournament' })}
                  >
                    <div className="font-bold mb-1 text-orange-500">🥉 {getMatchDisplayName(match)}</div>
                    <div className="text-xs">
                      {getTeamDisplayName(match, "team1", brackets)} vs {getTeamDisplayName(match, "team2", brackets)}
                    </div>
                    {/* Match Date and Time for Third Place */}
                    <div className="text-xs text-orange-500 mt-1">
                      {match.match_date ? (
                        <>📅 {moment(match.match_date).format('MM/DD HH:mm')}</>
                      ) : (
                        <span className="text-orange-300">📅 {t('knockout.timeTBD', { ns: 'tournament' })}</span>
                      )}
                    </div>
                    {match.match_status === "completed" && (
                      <>
                        <div className="text-sm font-bold text-orange-500 mt-1">
                          {match.team1_score || 0} : {match.team2_score || 0}
                        </div>
                        <div className="text-xs text-orange-500 mt-0.5">
                          {t('knockout.thirdPlace', { ns: 'tournament' })}: {getDisplayTeamName(match.winner_name)}
                        </div>
                      </>
                    )}
                    <Tag color="orange" size="small" className="mt-1">
                      {getStatusText(match.match_status)}
                    </Tag>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        )}
      </Card>
    );
  };

  const getRoundName = (roundNum, totalRounds) => {
    const remainingRounds = totalRounds - roundNum + 1;
    switch (remainingRounds) {
      case 1:
        return t('knockout.final', { ns: 'tournament' });
      case 2:
        return t('knockout.semi', { ns: 'tournament' });
      case 3:
        return t('knockout.quarter', { ns: 'tournament' });
      case 4:
        return t('knockout.round16', { ns: 'tournament' });
      default:
        return t('knockout.roundNumber', { ns: 'tournament', number: roundNum });
    }
  };

  const getMatchDisplayName = (match) => {
    if (match.tournament_stage === 'third_place') {
      return t('knockout.third', { ns: 'tournament' });
    }
    return match.match_number;
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
        return t('status.completed', { ns: 'common' });
      case "active":
        return t('status.ongoing', { ns: 'common' });
      case "pending":
        return t('status.pending', { ns: 'common' });
      default:
        return t('common.unknown', { ns: 'common' });
    }
  };

  // 獲取隊伍顯示名稱，如果沒有隊伍則顯示來源比賽的勝者
  const getTeamDisplayName = (match, teamPosition, allBrackets) => {
    const teamName = teamPosition === "team1" ? match.team1_name : match.team2_name;

    if (teamName) {
      return getDisplayTeamName(teamName);
    }

    // 特殊處理：季軍賽顯示準決賽敗者
    if (match.tournament_stage === 'third_place') {
      // 找到所有準決賽比賽
      const semiMatches = [];
      Object.values(allBrackets).forEach(roundMatches => {
        roundMatches.forEach(m => {
          if (m.tournament_stage === 'semi_final') {
            semiMatches.push(m);
          }
        });
      });

      // 按比賽編號排序
      semiMatches.sort((a, b) => a.match_number.localeCompare(b.match_number));

      if (semiMatches.length >= 2) {
        if (teamPosition === "team1") {
          return `${semiMatches[0].match_number}敗者`;
        } else {
          return `${semiMatches[1].match_number}敗者`;
        }
      }
      return "TBD";
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
    <div className="p-6">
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className="mb-4"
        >
          {t('navigation.backToTournamentDetail', { ns: 'tournament' })}
        </Button>
        <h2 className="text-2xl font-bold m-0">{tournament?.tournament_name} - {t('knockout.bracketTitle', { ns: 'tournament' })}</h2>
      </div>

      {typeInfo && (
        <Alert
          message={`${t('tournament.type', { ns: 'tournament' })}：${typeInfo.type}`}
          description={typeInfo.description}
          type={tournament?.tournament_type === "group" ? "warning" : "info"}
          className="mb-6"
          showIcon
        />
      )}

      {tournament?.tournament_type !== "group" && (
        <Card title={t('knockout.generateTitle', { ns: 'tournament' })} className="mb-6">
          <Form form={form} layout="vertical" onFinish={generateKnockout}>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  label={t('knockout.teamCount', { ns: 'tournament' })}
                  name="team_count"
                  rules={[{ required: true, message: t('knockout.selectTeamCount', { ns: 'tournament' }) }]}
                >
                  <InputNumber min={2} max={32} className="w-full" placeholder={t('knockout.powerOfTwo', { ns: 'tournament' })} />
                </Form.Item>
                <div className="text-xs text-gray-600 -mt-4 mb-4">
                  {t('knockout.available', { ns: 'tournament' })}: {getTeamCountOptions().join(", ")}
                </div>
              </Col>
              <Col span={6}>
                <Form.Item label={t('knockout.matchDate', { ns: 'tournament' })} name="match_date" rules={[{ required: true, message: t('knockout.selectMatchDate', { ns: 'tournament' }) }]}>
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label={t('knockout.startTime', { ns: 'tournament' })} name="match_time" rules={[{ required: true, message: t('knockout.selectStartTime', { ns: 'tournament' }) }]}>
                  <TimePicker className="w-full" format="HH:mm" />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item
                  label={t('knockout.matchDurationMinutes', { ns: 'tournament' })}
                  name="match_minutes"
                  rules={[{ required: true, message: t('knockout.enterMinutes', { ns: 'tournament' }) }]}
                >
                  <InputNumber min={1} max={60} className="w-full" placeholder={t('knockout.minutes', { ns: 'tournament' })} />
                </Form.Item>
              </Col>
              <Col span={3}>
                <Form.Item
                  label={t('knockout.matchDurationSeconds', { ns: 'tournament' })}
                  name="match_seconds"
                  rules={[{ required: true, message: t('knockout.enterSeconds', { ns: 'tournament' }) }]}
                >
                  <InputNumber min={0} max={59} className="w-full" placeholder={t('knockout.seconds', { ns: 'tournament' })} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} className="mt-4">
              <Col span={6}>
                <Form.Item
                  label={t('knockout.intervalMinutes', { ns: 'tournament' })}
                  name="interval_minutes"
                  rules={[{ required: true, message: t('knockout.enterIntervalMinutes', { ns: 'tournament' }) }]}
                >
                  <InputNumber min={0} max={120} className="w-full" placeholder={t('knockout.minutes', { ns: 'tournament' })} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label={t('knockout.intervalSeconds', { ns: 'tournament' })}
                  name="interval_seconds"
                  rules={[{ required: true, message: t('knockout.enterIntervalSeconds', { ns: 'tournament' }) }]}
                >
                  <InputNumber min={0} max={59} className="w-full" placeholder={t('knockout.seconds', { ns: 'tournament' })} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <div className="py-2 text-gray-600">
                  <p className="text-gray-500 m-0">
                    {t('knockout.intervalDescription', { ns: 'tournament' })}
                  </p>
                </div>
              </Col>
            </Row>

            <Row gutter={16} className="mt-4">
              <Col span={24}>
                <Form.Item
                  name="include_third_place"
                  valuePropName="checked"
                >
                  <Checkbox>
                    {t('knockout.includeThirdPlace', { ns: 'tournament' })}
                  </Checkbox>
                </Form.Item>
                <div className="mt-2 text-gray-600 text-xs">
                  <p className="text-gray-500 m-0">
                    {t('knockout.thirdPlaceDescription', { ns: 'tournament' })}
                  </p>
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
                  {t('knockout.generateBracket', { ns: 'tournament' })}
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
