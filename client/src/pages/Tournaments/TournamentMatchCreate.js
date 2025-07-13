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
import axios from "axios";
import moment from "moment";
import { convertToSeconds } from "../../utils/timeUtils";

const { Title } = Typography;
const { Option } = Select;

const TournamentMatchCreate = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
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
      message.error("獲取錦標賽信息失敗");
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
      message.error("獲取隊伍列表失敗");
    }
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroup(groupId);
    // 清空隊伍選擇
    form.setFieldsValue({
      team1_id: undefined,
      team2_id: undefined,
    });
  };

  const handleMatchTypeChange = (type) => {
    setMatchType(type);
    // 如果不是小組賽，清空小組選擇和隊伍選擇
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

      // 組合日期和時間
      console.log('🔍 Create - Raw form values:', {
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
        
      console.log('🔍 Create - Date string:', dateString);
      console.log('🔍 Create - Time string:', timeString);
      console.log('🔍 Create - Combined datetime:', matchDateTime);

      // 轉換分鐘和秒數為總秒數
      const totalSeconds = convertToSeconds(values.match_minutes, values.match_seconds);

      const submitData = {
        ...values,
        match_date: matchDateTime,
        match_time: totalSeconds,
      };

      // 移除前端用的字段
      delete submitData.match_minutes;
      delete submitData.match_seconds;

      const response = await axios.post(`/api/tournaments/${tournamentId}/matches`, submitData);

      if (response.data.success) {
        message.success("比賽創建成功");
        navigate(`/tournaments/${tournamentId}/matches`);
      } else {
        message.error(response.data.message || "創建比賽失敗");
      }
    } catch (error) {
      console.error("Error creating match:", error);
      const errorMessage = error.response?.data?.message || "創建比賽失敗";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}
          style={{ marginBottom: 16 }}
        >
          返回比賽列表
        </Button>
        <Title level={2}>{tournament?.tournament_name} - 新增比賽</Title>
        <p style={{ color: "#666", marginBottom: 0 }}>為錦標賽創建新的比賽場次</p>
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
                label="比賽場次"
                name="match_number"
                rules={[
                  { required: true, message: "請輸入比賽場次" },
                  { pattern: /^[A-Za-z0-9\-_]+$/, message: "比賽場次只能包含字母、數字、連字符和下劃線" },
                ]}
              >
                <Input placeholder="例如: A1, B2, SF1, F1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="比賽類型" name="match_type" rules={[{ required: true, message: "請選擇比賽類型" }]}>
                <Select onChange={handleMatchTypeChange}>
                  <Option value="group">小組賽</Option>
                  <Option value="knockout">淘汰賽</Option>
                  <Option value="friendly">友誼賽</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="錦標賽階段" name="tournament_stage">
            <Input placeholder="例如: 小組賽第1輪, 八強賽, 決賽" />
          </Form.Item>

          <Divider>隊伍設置</Divider>

          {matchType === "group" && (
            <Form.Item label="選擇小組（可選）" name="group_id">
              <Select placeholder="選擇小組後將只顯示該小組的隊伍" allowClear onChange={handleGroupChange}>
                <Option value={null}>無小組</Option>
                {groups.map((group) => (
                  <Option key={group.group_id} value={group.group_id}>
                    小組 {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="隊伍1" name="team1_id" rules={[{ required: true, message: "請選擇隊伍1" }]}>
                <Select placeholder="選擇隊伍1" showSearch optionFilterProp="children">
                  {getFilteredTeams().map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: team.team_color || "#ccc",
                            marginRight: 8,
                            borderRadius: 2,
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
              <Form.Item label="隊伍2" name="team2_id" rules={[{ required: true, message: "請選擇隊伍2" }]}>
                <Select placeholder="選擇隊伍2" showSearch optionFilterProp="children">
                  {getFilteredTeams().map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: team.team_color || "#ccc",
                            marginRight: 8,
                            borderRadius: 2,
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

          <Divider>時間設置</Divider>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="比賽日期" name="match_date" rules={[{ required: true, message: "請選擇比賽日期" }]}>
                <DatePicker style={{ width: "100%" }} placeholder="選擇比賽日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="比賽時間" name="match_time" rules={[{ required: true, message: "請選擇比賽時間" }]}>
                <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="選擇比賽時間" />
              </Form.Item>
            </Col>
          </Row>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>比賽時長</label>
            <Input.Group compact>
              <Form.Item
                name="match_minutes"
                style={{ display: 'inline-block', width: '50%', marginBottom: 0 }}
                dependencies={['match_seconds']}
                rules={[
                  { 
                    validator: (_, value) => {
                      const minutes = value ?? 0;
                      const seconds = form.getFieldValue('match_seconds') ?? 0;
                      if (minutes === 0 && seconds === 0) {
                        return Promise.reject(new Error('比賽時長不能為0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber 
                  placeholder="分鐘"
                  min={0}
                  max={60}
                  style={{ width: '100%' }}
                  addonAfter="分"
                  onChange={() => {
                    // 觸發秒數字段的驗證
                    form.validateFields(['match_seconds']);
                  }}
                />
              </Form.Item>
              <Form.Item
                name="match_seconds"
                style={{ display: 'inline-block', width: '50%', marginBottom: 0 }}
                dependencies={['match_minutes']}
                rules={[
                  { 
                    validator: (_, value) => {
                      const seconds = value ?? 0;
                      const minutes = form.getFieldValue('match_minutes') ?? 0;
                      if (minutes === 0 && seconds === 0) {
                        return Promise.reject(new Error('比賽時長不能為0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber 
                  placeholder="秒數"
                  min={0}
                  max={59}
                  style={{ width: '100%' }}
                  addonAfter="秒"
                  onChange={() => {
                    // 觸發分鐘字段的驗證
                    form.validateFields(['match_minutes']);
                  }}
                />
              </Form.Item>
            </Input.Group>
          </div>

          <Form.Item style={{ marginTop: 32 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                創建比賽
              </Button>
              <Button onClick={() => navigate(`/tournaments/${tournamentId}/matches`)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default TournamentMatchCreate;
