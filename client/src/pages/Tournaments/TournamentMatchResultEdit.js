import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, InputNumber, Button, Space, Select, message, Spin, Row, Col, Statistic, Tag, Checkbox } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { determineWinner, getWinReasonText } from '../../utils/winConditionUtils';

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentMatchResultEdit = () => {
  const navigate = useNavigate();
  const { id: tournamentId, matchId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [tournament, setTournament] = useState(null);

  // 表單狀態
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [team1Fouls, setTeam1Fouls] = useState(0);
  const [team2Fouls, setTeam2Fouls] = useState(0);
  const [manualWinner, setManualWinner] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [winReason, setWinReason] = useState('score');
  const [refereeDecision, setRefereeDecision] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tournamentId, matchId]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      // 並行獲取錦標賽信息和比賽詳情
      const [tournamentResponse, matchResponse] = await Promise.all([
        axios.get(`/api/tournaments/${tournamentId}`),
        axios.get(`/api/tournaments/${tournamentId}/matches/${matchId}`)
      ]);
      
      if (tournamentResponse.data.success) {
        setTournament(tournamentResponse.data.data.tournament || tournamentResponse.data.data);
      }
      
      if (matchResponse.data.success) {
        const match = matchResponse.data.data.match;
        setMatchData(match);
        
        // 設置初始值
        setTeam1Score(match.team1_score || 0);
        setTeam2Score(match.team2_score || 0);
        setTeam1Fouls(match.team1_fouls || 0);
        setTeam2Fouls(match.team2_fouls || 0);
        setSelectedWinner(match.winner_id);
        setWinReason(match.win_reason || 'score');
        setRefereeDecision(match.referee_decision || false);
        
        // 設置表單初始值
        form.setFieldsValue({
          team1_score: match.team1_score || 0,
          team2_score: match.team2_score || 0,
          team1_fouls: match.team1_fouls || 0,
          team2_fouls: match.team2_fouls || 0,
          winner_id: match.winner_id,
          win_reason: match.win_reason || 'score',
          referee_decision: match.referee_decision || false
        });
      } else {
        message.error('獲取比賽數據失敗');
        navigate(`/tournaments/${tournamentId}/matches`);
      }
    } catch (error) {
      console.error('獲取比賽數據錯誤:', error);
      message.error('獲取比賽數據失敗');
      navigate(`/tournaments/${tournamentId}/matches`);
    } finally {
      setDataLoading(false);
    }
  };

  // 當分數或犯規改變時，自動計算獲勝者
  useEffect(() => {
    if (!manualWinner && matchData) {
      const { winnerId, reason } = determineWinner(
        team1Score, team2Score, team1Fouls, team2Fouls, 
        matchData.team1_id, matchData.team2_id
      );
      setSelectedWinner(winnerId);
      setWinReason(reason);
      form.setFieldsValue({
        winner_id: winnerId,
        win_reason: reason
      });
    }
  }, [team1Score, team2Score, team1Fouls, team2Fouls, manualWinner, matchData, form]);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      const resultData = {
        team1_score: team1Score,
        team2_score: team2Score,
        team1_fouls: team1Fouls,
        team2_fouls: team2Fouls,
        winner_id: selectedWinner,
        win_reason: winReason,
        referee_decision: refereeDecision
      };

      console.log('提交錦標賽比賽結果:', resultData);

      // 使用錦標賽專用的API端點
      const response = await axios.put(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, resultData);
      
      if (response.data.success) {
        message.success('比賽結果更新成功');
        
        // Set a flag to indicate that match results were updated
        // This will help other pages know they need to refresh their data
        localStorage.setItem('matchResultUpdated', Date.now().toString());
        
        navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
      } else {
        message.error(response.data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新錦標賽比賽結果錯誤:', error);
      message.error(error.response?.data?.message || '更新比賽結果失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
  };

  if (dataLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>載入比賽數據中...</div>
      </div>
    );
  }

  if (!matchData) {
    return null;
  }

  if (matchData.match_status !== 'completed') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Title level={3}>只能編輯已完成的比賽結果</Title>
        <Button onClick={handleCancel}>返回</Button>
      </div>
    );
  }

  // 獲取當前預測的獲勝者信息
  const predictedWinner = selectedWinner === matchData.team1_id ? matchData.team1_name : 
                         selectedWinner === matchData.team2_id ? matchData.team2_name : null;

  // 處理隊伍名稱顯示（移除錦標賽前綴）
  const getDisplayTeamName = (teamName) => {
    return teamName?.includes("_") ? teamName.split("_")[0] : teamName;
  };

  const team1DisplayName = getDisplayTeamName(matchData.team1_name);
  const team2DisplayName = getDisplayTeamName(matchData.team2_name);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 頁面標題 */}
        <Card>
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCancel}
            >
              返回
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              <TrophyOutlined style={{ marginRight: 8 }} />
              編輯比賽結果
            </Title>
            {tournament && (
              <span style={{ color: '#666' }}>
                {tournament.tournament_name}
              </span>
            )}
          </Space>
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ fontSize: '16px' }}>
              {matchData.match_number}: {team1DisplayName} vs {team2DisplayName}
            </Text>
            {matchData.group_name && (
              <Tag color="blue" style={{ marginLeft: 8 }}>
                小組 {matchData.group_name?.includes("_") ? matchData.group_name.split("_")[0] : matchData.group_name}
              </Tag>
            )}
          </div>
        </Card>

        {/* 當前結果預覽 */}
        <Card title="結果預覽" size="small">
          <Row gutter={24}>
            <Col span={8}>
              <Statistic 
                title={team1DisplayName} 
                value={`${team1Score} : ${team1Fouls}`}
                suffix="(分數:犯規)"
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title={team2DisplayName} 
                value={`${team2Score} : ${team2Fouls}`}
                suffix="(分數:犯規)"
              />
            </Col>
            <Col span={8}>
              <div>
                <Text strong>獲勝者：</Text>
                <div style={{ marginTop: 4 }}>
                  {predictedWinner ? (
                    <Tag color="gold">{getDisplayTeamName(predictedWinner)}</Tag>
                  ) : (
                    <Tag color="default">平局</Tag>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                  {getWinReasonText(winReason)}
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 編輯表單 */}
        <Card title="編輯比賽結果">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
          >
            <Row gutter={24}>
              <Col span={12}>
                <Title level={4}>{team1DisplayName}</Title>
                <Form.Item label="得分" name="team1_score">
                  <InputNumber
                    min={0}
                    max={99}
                    value={team1Score}
                    onChange={setTeam1Score}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="犯規" name="team1_fouls">
                  <InputNumber
                    min={0}
                    max={99}
                    value={team1Fouls}
                    onChange={setTeam1Fouls}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Title level={4}>{team2DisplayName}</Title>
                <Form.Item label="得分" name="team2_score">
                  <InputNumber
                    min={0}
                    max={99}
                    value={team2Score}
                    onChange={setTeam2Score}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item label="犯規" name="team2_fouls">
                  <InputNumber
                    min={0}
                    max={99}
                    value={team2Fouls}
                    onChange={setTeam2Fouls}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Checkbox
                checked={manualWinner}
                onChange={(e) => setManualWinner(e.target.checked)}
              >
                手動指定獲勝者（覆蓋自動計算）
              </Checkbox>
            </Form.Item>

            {manualWinner && (
              <>
                <Form.Item label="獲勝者" name="winner_id">
                  <Select
                    value={selectedWinner}
                    onChange={setSelectedWinner}
                    placeholder="選擇獲勝者"
                    allowClear
                  >
                    <Option value={matchData.team1_id}>{team1DisplayName}</Option>
                    <Option value={matchData.team2_id}>{team2DisplayName}</Option>
                    <Option value={null}>平局</Option>
                  </Select>
                </Form.Item>

                <Form.Item label="獲勝原因" name="win_reason">
                  <Select 
                    value={winReason} 
                    onChange={setWinReason}
                    disabled={refereeDecision}
                  >
                    <Option value="score">得分獲勝</Option>
                    <Option value="fouls">犯規較少獲勝</Option>
                    <Option value="referee">裁判決定</Option>
                    <Option value="draw">平局</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Checkbox
                    checked={refereeDecision}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRefereeDecision(checked);
                      if (checked) {
                        setWinReason('referee');
                        form.setFieldsValue({ win_reason: 'referee' });
                      }
                    }}
                  >
                    裁判決定
                  </Checkbox>
                </Form.Item>
              </>
            )}

            <Form.Item style={{ marginTop: 32 }}>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  保存結果
                </Button>
                <Button 
                  onClick={handleCancel}
                  size="large"
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
};

export default TournamentMatchResultEdit;