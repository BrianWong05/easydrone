import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  message,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  InputNumber,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import moment from "moment";
import { convertToSeconds } from "../../utils/timeUtils";

const { Title } = Typography;
const { Option } = Select;

const TournamentMatchCreate = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['match', 'common']);
  const [form] = Form.useForm();

  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [matchType, setMatchType] = useState("group");

  useEffect(() => {
    fetchTournament();
    fetchGroups();
    fetchTeams();
  }, [tournamentId]);

  const fetchTournament = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data.tournament);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      message.error(t('common:messages.loadFailed'));
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/groups`);
      if (response.data.success) {
        const groupsData = response.data.data?.groups || [];
        setGroups(groupsData);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentId}/teams?limit=100`);
      if (response.data.success) {
        const teamsData = response.data.data?.teams || [];
        setTeams(teamsData);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      message.error(t('common:messages.loadFailed'));
    }
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroup(groupId);
    // Clear team selection
    form.setFieldsValue({
      team1_id: undefined,
      team2_id: undefined,
    });
  };

  const handleMatchTypeChange = (type) => {
    setMatchType(type);
    // If not group match, clear group and team selection
    if (type !== "group") {
      setSelectedGroup(null);
      form.setFieldsValue({
        group_id: undefined,
        team1_id: undefined,
        team2_id: undefined,
      });
    }
  };

  const getFilteredTeams = () => {
    // For non-group matches (knockout, friendly), show all teams regardless of group assignment
    if (matchType !== "group") {
      return teams;
    }
    
    // For group matches, apply group filtering
    if (selectedGroup === null) {
      // Show teams with no group assignment
      return teams.filter((team) => !team.group_id);
    }
    if (!selectedGroup) {
      // Show all teams when no group is selected
      return teams;
    }
    // Show teams from the selected group
    return teams.filter((team) => team.group_id === parseInt(selectedGroup));
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);

      // Combine date and time
      console.log('🔍 Create - Raw form values:', {
        match_date: values.match_date,
        match_time: values.match_time,
        match_date_format: values.match_date?.format('YYYY-MM-DD'),
        match_time_format: values.match_time?.format('HH:mm')
      });
      
      // Use formatted strings to avoid timezone issues
      const dateString = values.match_date.format('YYYY-MM-DD'); // Get date string from DatePicker
      const timeString = values.match_time.format('HH:mm'); // Get time string from TimePicker
      
      // Combine strings directly
      const matchDateTime = `${dateString} ${timeString}:00`;
        
      console.log('🔍 Create - Date string:', dateString);
      console.log('🔍 Create - Time string:', timeString);
      console.log('🔍 Create - Combined datetime:', matchDateTime);

      // Convert minutes and seconds to total seconds
      const totalSeconds = convertToSeconds(values.match_minutes, values.match_seconds);

      const submitData = {
        ...values,
        match_date: matchDateTime,
        match_time: totalSeconds,
      };

      // Remove frontend-only fields
      delete submitData.match_minutes;
      delete submitData.match_seconds;

      const response = await axios.post(`/api/tournaments/${tournamentId}/matches`, submitData);

      if (response.data.success) {
        message.success(t('match:messages.matchCreated'));
        navigate(`/tournaments/${tournamentId}/matches`);
      } else {
        message.error(response.data.message || t('match:messages.createFailed'));
      }
    } catch (error) {
      console.error("Error creating match:", error);
      const errorMessage = error.response?.data?.message || t('match:messages.createFailed');
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}
          className="mb-4"
        >
          {t('common:navigation.backToMatchList')}
        </Button>
        <Title level={2}>{tournament?.tournament_name} - {t('match:match.create')}</Title>
        <p className="text-gray-600 mb-0">{t('match:messages.createDescription')}</p>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            match_type: "group",
            match_minutes: 10,
            match_seconds: 0,
          }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label={t('match:match.matchNumber')}
                name="match_number"
                rules={[
                  { required: true, message: t('match:form.matchNumberRequired') },
                  { pattern: /^[A-Za-z0-9\-_]+$/, message: t('match:form.matchNumberPattern') },
                ]}
              >
                <Input placeholder={t('match:form.matchNumberPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('match:match.type')} name="match_type" rules={[{ required: true, message: t('match:form.matchTypeRequired') }]}>
                <Select onChange={handleMatchTypeChange}>
                  <Option value="group">{t('match:types.groupStage')}</Option>
                  <Option value="knockout">{t('match:types.knockout')}</Option>
                  <Option value="friendly">{t('match:types.friendly')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={t('match:match.stage')} name="tournament_stage">
            <Input placeholder={t('match:form.stagePlaceholder')} />
          </Form.Item>

          <Divider>{t('match:form.teamSetup')}</Divider>

          {matchType === "group" && (
            <Form.Item label={t('match:form.selectGroup')} name="group_id">
              <Select placeholder={t('match:form.selectGroupPlaceholder')} allowClear onChange={handleGroupChange}>
                <Option value={null}>{t('match:form.noGroup')}</Option>
                {groups.map((group) => (
                  <Option key={group.group_id} value={group.group_id}>
                    {t('match:match.group')} {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label={t('match:match.team1')} name="team1_id" rules={[{ required: true, message: t('match:form.team1Required') }]}>
                <Select placeholder={t('match:placeholders.selectTeam1')} showSearch optionFilterProp="children">
                  {getFilteredTeams().map((team) => (
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
            <Col span={12}>
              <Form.Item label={t('match:match.team2')} name="team2_id" rules={[{ required: true, message: t('match:form.team2Required') }]}>
                <Select placeholder={t('match:placeholders.selectTeam2')} showSearch optionFilterProp="children">
                  {getFilteredTeams().map((team) => (
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

          <Divider>{t('match:form.timeSetup')}</Divider>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label={t('match:match.date')} name="match_date" rules={[{ required: true, message: t('match:form.dateRequired') }]}>
                <DatePicker className="w-full" placeholder={t('match:form.datePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('match:match.time')} name="match_time" rules={[{ required: true, message: t('match:form.timeRequired') }]}>
                <TimePicker className="w-full" format="HH:mm" placeholder={t('match:form.timePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>

          <div>
            <label className="block mb-2 font-bold">{t('match:match.duration')}</label>
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
                        return Promise.reject(new Error(t('match:form.durationRequired')));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber 
                  placeholder={t('match:form.minutesPlaceholder')}
                  min={0}
                  max={60}
                  className="w-full"
                  addonAfter={t('common:time.minutes')}
                  onChange={() => {
                    // Trigger seconds field validation
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
                        return Promise.reject(new Error(t('match:form.durationRequired')));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber 
                  placeholder={t('match:form.secondsPlaceholder')}
                  min={0}
                  max={59}
                  className="w-full"
                  addonAfter={t('common:time.seconds')}
                  onChange={() => {
                    // Trigger minutes field validation
                    form.validateFields(['match_minutes']);
                  }}
                />
              </Form.Item>
            </Input.Group>
          </div>

          <Form.Item className="mt-8">
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {t('match:match.create')}
              </Button>
              <Button onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}>{t('common:actions.cancel')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TournamentMatchCreate;
