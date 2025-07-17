import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, Space, DatePicker, TimePicker, InputNumber, message, Spin, Row, Col, Divider } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CalendarOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import axios from 'axios';
import { convertToSeconds, convertFromSeconds } from '../../utils/timeUtils';

const { Option } = Select;

const TournamentMatchEdit = () => {
  const { t } = useTranslation(['match', 'common']);
  const navigate = useNavigate();
  const { id: tournamentId, matchId } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matchData, setMatchData] = useState(null);
  const [tournament, setTournament] = useState(null);

  // 獲取隊伍數據和比賽數據
  useEffect(() => {
    fetchData();
  }, [tournamentId, matchId]);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      
      // 並行獲取錦標賽信息、隊伍列表、小組列表和比賽詳情
      const [tournamentResponse, teamsResponse, groupsResponse, matchResponse] = await Promise.all([
        axios.get(`/api/tournaments/${tournamentId}`),
        axios.get(`/api/tournaments/${tournamentId}/teams`),
        axios.get(`/api/tournaments/${tournamentId}/groups`),
        axios.get(`/api/tournaments/${tournamentId}/matches/${matchId}`)
      ]);
      
      if (tournamentResponse.data.success) {
        setTournament(tournamentResponse.data.data.tournament || tournamentResponse.data.data);
      }

      if (teamsResponse.data.success) {
        const teamsData = teamsResponse.data.data.teams || teamsResponse.data.data || [];
        setTeams(teamsData);
      } else {
        message.error(t('messages.loadingMatches'));
      }

      if (groupsResponse.data.success) {
        const groupsData = groupsResponse.data.data.groups || groupsResponse.data.data || [];
        setGroups(groupsData);
      }

      if (matchResponse.data.success) {
        const match = matchResponse.data.data.match;
        setMatchData(match);
        
        // 設置表單初始值 - 從秒數轉換為分鐘和秒數
        console.log('🔍 Raw match_time from database (seconds):', match.match_time, typeof match.match_time);
        const { minutes, seconds } = convertFromSeconds(match.match_time);
        console.log('🔍 Converted to:', minutes, 'minutes,', seconds, 'seconds');
        
        // 分離日期和時間 - 使用字符串解析避免時區問題
        const matchMoment = moment(match.match_date);
        
        // 直接從字符串創建moment對象避免時區轉換
        const dateString = matchMoment.format('YYYY-MM-DD');
        const timeString = matchMoment.format('HH:mm');
        
        // 為DatePicker創建只包含日期的moment對象
        const dateForPicker = moment(dateString, 'YYYY-MM-DD');
        // 為TimePicker創建包含時間的moment對象
        const timeForPicker = moment(timeString, 'HH:mm');
        
        console.log('🔍 Edit - Original match_date:', match.match_date);
        console.log('🔍 Edit - Parsed moment:', matchMoment.format('YYYY-MM-DD HH:mm:ss'));
        console.log('🔍 Edit - Date string:', dateString);
        console.log('🔍 Edit - Time string:', timeString);
        console.log('🔍 Edit - Date for picker:', dateForPicker.format('YYYY-MM-DD'));
        console.log('🔍 Edit - Time for picker:', timeForPicker.format('HH:mm'));
        
        form.setFieldsValue({
          match_number: match.match_number,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          match_date: dateForPicker,
          match_time: timeForPicker,
          match_minutes: minutes,
          match_seconds: seconds,
          match_type: getLocalizedMatchType(match.match_type),
          tournament_stage: match.tournament_stage || '',
          group_id: match.group_id
        });
      } else {
        message.error(t('messages.noMatchData'));
        navigate(`/tournaments/${tournamentId}/matches`);
      }
    } catch (error) {
      console.error('獲取數據錯誤:', error);
      message.error(t('messages.loadingMatches'));
      navigate(`/tournaments/${tournamentId}/matches`);
    } finally {
      setDataLoading(false);
    }
  };

  // 將英文比賽類型轉換為本地化文本
  const getLocalizedMatchType = (englishType) => {
    switch (englishType) {
      case 'group': return t('types.groupStage');
      case 'knockout': return t('types.knockout');
      case 'friendly': return t('types.friendly');
      default: return t('types.friendly');
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 準備API數據 - 轉換為總秒數
      const totalSeconds = convertToSeconds(values.match_minutes, values.match_seconds);
      
      // 確定比賽類型
      const matchType = values.match_type === t('types.groupStage') ? 'group' : 
                       values.match_type === t('types.knockout') ? 'knockout' : 
                       values.match_type === t('types.friendly') ? 'friendly' : 'friendly';
      
      let groupId = values.group_id || null;
      
      // 如果是小組賽且沒有指定小組，自動分配小組ID
      if (matchType === 'group' && !groupId) {
        // 獲取選中隊伍的小組信息
        const team1 = teams.find(t => t.team_id === values.team1_id);
        const team2 = teams.find(t => t.team_id === values.team2_id);
        
        console.log('🏁 Team 1:', team1);
        console.log('🏁 Team 2:', team2);
        
        // 檢查兩支隊伍是否在同一小組
        if (team1?.group_id && team2?.group_id && team1.group_id === team2.group_id) {
          groupId = team1.group_id;
          console.log(`✅ 小組賽：兩支隊伍都在小組 ${team1.group_name} (ID: ${groupId})`);
        } else if (team1?.group_id && !team2?.group_id) {
          groupId = team1.group_id;
          console.log(`⚠️ 小組賽：隊伍1在小組 ${team1.group_name}，隊伍2無小組，使用隊伍1的小組`);
        } else if (!team1?.group_id && team2?.group_id) {
          groupId = team2.group_id;
          console.log(`⚠️ 小組賽：隊伍2在小組 ${team2.group_name}，隊伍1無小組，使用隊伍2的小組`);
        } else {
          console.log('⚠️ 小組賽：兩支隊伍都沒有分配小組或在不同小組');
          message.warning(t('messages.groupStageTeamWarning', { defaultValue: '小組賽建議選擇同一小組的隊伍' }));
        }
      }
      
      // 組合日期和時間
      console.log('🔍 Edit - Raw form values:', {
        match_date: values.match_date,
        match_time: values.match_time,
        match_date_format: values.match_date?.format('YYYY-MM-DD'),
        match_time_format: values.match_time?.format('HH:mm')
      });
      
      // 直接使用格式化的字符串來避免時區問題
      const dateString = values.match_date.format('YYYY-MM-DD'); // 從DatePicker獲取日期字符串
      const timeString = values.match_time.format('HH:mm'); // 從TimePicker獲取時間字符串
      
      // 直接組合字符串
      const matchDateTime = `${dateString} ${timeString}:00`;
        
      console.log('🔍 Edit - Date string:', dateString);
      console.log('🔍 Edit - Time string:', timeString);
      console.log('🔍 Edit - Combined datetime:', matchDateTime);

      const matchUpdateData = {
        match_number: values.match_number,
        team1_id: values.team1_id,
        team2_id: values.team2_id,
        match_date: matchDateTime,
        match_time: totalSeconds,
        match_type: matchType,
        tournament_stage: values.tournament_stage || null,
        group_id: groupId
      };
      
      console.log('🔄 更新比賽數據:', matchUpdateData);
      console.log('🏁 分配的小組ID:', groupId);
      
      // 調用後端API更新比賽
      const response = await axios.put(`/api/tournaments/${tournamentId}/matches/${matchId}`, matchUpdateData);
      
      if (response.data.success) {
        message.success(t('messages.matchUpdated'));
        navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
      } else {
        message.error(response.data.message || t('messages.updateFailed', { defaultValue: '更新失敗，請重試' }));
      }
    } catch (error) {
      console.error('更新比賽錯誤:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error(t('messages.updateFailed', { defaultValue: '更新失敗，請重試' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tournaments/${tournamentId}/matches/${matchId}`);
  };

  const handleSwapTeams = () => {
    const team1Id = form.getFieldValue('team1_id');
    const team2Id = form.getFieldValue('team2_id');
    
    form.setFieldsValue({
      team1_id: team2Id,
      team2_id: team1Id
    });
    
    message.success(t('messages.teamsSwapped', { defaultValue: '隊伍已交換！' }));
  };

  if (dataLoading) {
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
        <Button onClick={handleCancel}>{t('common:actions.back', { defaultValue: '返回' })}</Button>
      </div>
    );
  }

  // 檢查比賽狀態
  if (!['pending', 'postponed'].includes(matchData.match_status)) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold mb-4">{t('messages.cannotEdit', { defaultValue: '無法編輯' })}</h3>
        <p>{t('messages.canOnlyEditPendingMatches', { defaultValue: '只能編輯未開始或延期的比賽' })}</p>
        <Button onClick={handleCancel}>{t('common:actions.back', { defaultValue: '返回' })}</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleCancel}
          className="mb-4"
        >
          {t('actions.backToMatchDetail', { defaultValue: '返回比賽詳情' })}
        </Button>
        <h2 className="text-2xl font-bold mb-4">{tournament?.tournament_name} - {t('match.edit')}</h2>
        <p className="text-gray-600 mb-0">{t('messages.editDescription', { defaultValue: '修改比賽的詳細信息和設置' })}</p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label={t('match.number')}
                name="match_number"
                rules={[
                  { required: true, message: t('form.matchNumberRequired') },
                  { pattern: /^[A-Za-z0-9\-_]+$/, message: t('form.matchNumberPattern') },
                ]}
              >
                <Input placeholder={t('form.matchNumberPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('match.type')} name="match_type" rules={[{ required: true, message: t('form.matchTypeRequired') }]}>
                <Select>
                  <Option value={t('types.groupStage')}>{t('types.groupStage')}</Option>
                  <Option value={t('types.knockout')}>{t('types.knockout')}</Option>
                  <Option value={t('types.friendly')}>{t('types.friendly')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('match.stage')} name="tournament_stage">
            <Input placeholder={t('form.stagePlaceholder')} />
          </Form.Item>

          <Divider>{t('form.teamSetup')}</Divider>

          <Form.Item label={t('form.selectGroup')} name="group_id">
            <Select placeholder={t('form.selectGroupPlaceholder')} allowClear>
              <Option value={null}>{t('form.noGroup')}</Option>
              {groups.map((group) => (
                <Option key={group.group_id} value={group.group_id}>
                  {t('match.group')} {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={24} align="bottom">
            <Col span={11}>
              <Form.Item label={t('match.team1')} name="team1_id" rules={[{ required: true, message: t('form.team1Required') }]}>
                <Select placeholder={t('placeholders.selectTeam1')} showSearch optionFilterProp="children">
                  {teams.map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 mr-2 rounded-sm"
                          style={{
                            backgroundColor: team.team_color || "#ccc",
                          }}
                        />
                        {team.team_name?.includes("_") ? team.team_name.split("_")[0] : team.team_name}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={2} className="text-center">
              <Form.Item className="mb-0">
                <Button 
                  type="dashed" 
                  icon={<SwapOutlined />} 
                  onClick={handleSwapTeams}
                  title={t('actions.swapTeams', { defaultValue: '交換隊伍' })}
                  className="w-full h-8 flex items-center justify-center"
                >
                  {t('actions.swap', { defaultValue: '交換' })}
                </Button>
              </Form.Item>
            </Col>
            <Col span={11}>
              <Form.Item label={t('match.team2')} name="team2_id" rules={[{ required: true, message: t('form.team2Required') }]}>
                <Select placeholder={t('placeholders.selectTeam2')} showSearch optionFilterProp="children">
                  {teams.map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 mr-2 rounded-sm"
                          style={{
                            backgroundColor: team.team_color || "#ccc",
                          }}
                        />
                        {team.team_name?.includes("_") ? team.team_name.split("_")[0] : team.team_name}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

            <Divider>{t('form.timeSetup')}</Divider>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  label={t('match.date')}
                  name="match_date"
                  rules={[{ required: true, message: t('form.dateRequired') }]}
                >
                  <DatePicker 
                    placeholder={t('form.datePlaceholder')}
                    className="w-full"
                    disabledDate={(current) => current && current < moment().startOf('day')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={t('match.time')}
                  name="match_time"
                  rules={[{ required: true, message: t('form.timeRequired') }]}
                >
                  <TimePicker 
                    placeholder={t('form.timePlaceholder')}
                    className="w-full"
                    format="HH:mm"
                  />
                </Form.Item>
              </Col>
            </Row>

          <div>
            <label className="block mb-2 font-bold">{t('match.duration')}</label>
            <Input.Group compact>
              <Form.Item
                name="match_minutes"
                className="inline-block w-1/2 mb-0"
                dependencies={['match_seconds']}
                rules={[
                  { 
                    validator: (_, value) => {
                      const minutes = value ?? 0;
                      const seconds = form.getFieldValue('match_seconds') ?? 0;
                      if (minutes === 0 && seconds === 0) {
                        return Promise.reject(new Error(t('form.durationRequired')));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber 
                  placeholder={t('form.minutesPlaceholder')}
                  min={0}
                  max={60}
                  className="w-full"
                  addonAfter={t('common:time.minutes', { defaultValue: '分' })}
                  onChange={() => {
                    // 觸發秒數字段的驗證
                    form.validateFields(['match_seconds']);
                  }}
                />
              </Form.Item>
              <Form.Item
                name="match_seconds"
                className="inline-block w-1/2 mb-0"
                dependencies={['match_minutes']}
                rules={[
                  { 
                    validator: (_, value) => {
                      const seconds = value ?? 0;
                      const minutes = form.getFieldValue('match_minutes') ?? 0;
                      if (minutes === 0 && seconds === 0) {
                        return Promise.reject(new Error(t('form.durationRequired')));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber 
                  placeholder={t('form.secondsPlaceholder')}
                  min={0}
                  max={59}
                  className="w-full"
                  addonAfter={t('common:time.seconds', { defaultValue: '秒' })}
                  onChange={() => {
                    // 觸發分鐘字段的驗證
                    form.validateFields(['match_minutes']);
                  }}
                />
              </Form.Item>
            </Input.Group>
          </div>

          <Form.Item className="mt-8">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {t('actions.update', { defaultValue: '更新比賽' })}
              </Button>
              <Button onClick={handleCancel}>{t('common:actions.cancel', { defaultValue: '取消' })}</Button>
            </Space>
          </Form.Item>
          </Form>
        </Card>
      </div>
  );
};

export default TournamentMatchEdit;