import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  InputNumber, 
  DatePicker, 
  TimePicker, 
  Switch, 
  Button, 
  Space, 
  message, 
  Spin, 
  Alert, 
  Descriptions, 
  Table, 
  Modal,
  Typography,
  Divider,
  Select,
  Tooltip
} from 'antd';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  TeamOutlined, 
  TrophyOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  UndoOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DragOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import { convertToSeconds } from '../../utils/timeUtils';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const GroupMatchGenerator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated, initialize } = useAuthStore();
  const [form] = Form.useForm();
  
  // 狀態管理
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editableMatches, setEditableMatches] = useState([]);
  const [originalMatches, setOriginalMatches] = useState([]);

  // 載入小組數據
  useEffect(() => {
    // Initialize auth store if not already done
    if (!isAuthenticated && !token) {
      initialize();
    }
    fetchGroupData();
  }, [id, initialize, isAuthenticated, token]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/groups/${id}`);
      if (response.data.success) {
        setGroupData(response.data.data.group);
        setTeams(response.data.data.teams || []);
      }
    } catch (error) {
      console.error('獲取小組數據失敗:', error);
      message.error('獲取小組數據失敗');
    } finally {
      setLoading(false);
    }
  };

  // 預覽比賽安排
  const handlePreview = async () => {
    try {
      const values = await form.validateFields();
      
      // 計算比賽統計
      const teamCount = teams.length;
      const totalMatches = (teamCount * (teamCount - 1)) / 2;
      const matchTimeInSeconds = convertToSeconds(values.match_minutes, values.match_seconds);
      const matchDuration = matchTimeInSeconds / 60; // 轉換為分鐘
      const totalDuration = (totalMatches - 1) * values.match_interval + matchDuration;
      
      // 確保使用DatePicker的日期和TimePicker的時間
      const dateString = values.match_date.format('YYYY-MM-DD');
      const timeString = values.start_time.format('HH:mm:ss');
      const startTime = `${dateString} ${timeString}`;
      
      console.log('🔍 Group Match - Date string:', dateString);
      console.log('🔍 Group Match - Time string:', timeString);
      console.log('🔍 Group Match - Combined startTime:', startTime);
      const endTime = moment(startTime).add(totalDuration, 'minutes');

      // 生成比賽預覽數據
      const matches = [];
      let matchNumber = 1;
      const baseTime = moment(startTime);

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const matchTime = baseTime.clone().add((matchNumber - 1) * values.match_interval, 'minutes');
          matches.push({
            key: matchNumber,
            matchNumber: `${groupData.group_name}${matchNumber.toString().padStart(2, '0')}`,
            team1: teams[i].team_name,
            team2: teams[j].team_name,
            scheduledTime: matchTime.format('HH:mm'),
            duration: `${matchTimeInSeconds / 60}分鐘`
          });
          matchNumber++;
        }
      }

      setPreviewData({
        statistics: {
          teamCount,
          totalMatches,
          estimatedDuration: `${Math.floor(totalDuration / 60)}小時${Math.round(totalDuration % 60)}分鐘`,
          startTime: moment(startTime).format('YYYY-MM-DD HH:mm'),
          endTime: endTime.format('YYYY-MM-DD HH:mm'),
          matchesPerTeam: teamCount - 1,
          averageRestTime: `${values.match_interval * (teamCount - 2)}分鐘`
        },
        matches
      });
      setEditableMatches([...matches]);
      setOriginalMatches([...matches]);
      setShowPreview(true);
    } catch (error) {
      console.error('預覽失敗:', error);
    }
  };

  // 生成比賽
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const values = await form.validateFields();
      
      // 確保使用DatePicker的日期和TimePicker的時間
      const dateString = values.match_date.format('YYYY-MM-DD');
      const timeString = values.start_time.format('HH:mm:ss');
      const matchDateTime = `${dateString} ${timeString}`;
      
      console.log('🔍 Group Match Generate - Date string:', dateString);
      console.log('🔍 Group Match Generate - Time string:', timeString);
      console.log('🔍 Group Match Generate - Combined matchDateTime:', matchDateTime);
      
      // 轉換分鐘和秒數為總秒數
      const matchTimeInSeconds = convertToSeconds(values.match_minutes, values.match_seconds);

      // 如果有編輯過的比賽順序，使用自定義順序
      const useCustomOrder = editableMatches.length > 0 && 
                            JSON.stringify(editableMatches) !== JSON.stringify(originalMatches);

      const requestData = {
        match_date: matchDateTime,
        match_time: matchTimeInSeconds,
        match_interval: values.match_interval,
        optimize_schedule: values.optimize_schedule || false,
        custom_match_order: useCustomOrder ? editableMatches.map(match => ({
          team1_name: match.team1,
          team2_name: match.team2
        })) : null
      };

      // Ensure we have proper headers
      const config = {
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add auth token if available
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`/api/groups/${id}/matches`, requestData, config);
      
      if (response.data.success) {
        message.success(response.data.message);
        // 顯示結果
        const backToBackAnalysis = response.data.data.backToBackAnalysis;
        const optimizationUsed = values.optimize_schedule;
        const customOrderUsed = useCustomOrder;
        
        Modal.success({
          title: '循環賽創建成功！',
          content: (
            <div>
              <p>小組 {response.data.data.groupName} 循環賽已成功創建</p>
              <p>共創建 {response.data.data.matchesCreated} 場比賽</p>
              <p>預計總時長：{response.data.data.statistics.estimatedDuration}</p>
              
              {customOrderUsed && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#1890ff', fontWeight: 'bold' }}>
                    ✏️ 已應用自定義比賽順序
                  </p>
                  <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
                    比賽將按照您編輯的順序進行
                  </p>
                </div>
              )}
              
              {optimizationUsed && !customOrderUsed && backToBackAnalysis && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#52c41a', fontWeight: 'bold' }}>
                    🎯 優化效果：背靠背比賽從 {backToBackAnalysis.beforeOptimization} 場減少到 {backToBackAnalysis.afterOptimization} 場
                  </p>
                  {backToBackAnalysis.afterOptimization === 0 && (
                    <p style={{ margin: '4px 0 0 0', color: '#52c41a' }}>
                      🎉 完美！沒有任何背靠背比賽！
                    </p>
                  )}
                </div>
              )}
            </div>
          ),
          onOk: () => {
            navigate(`/groups/${id}`);
          }
        });
      }
    } catch (error) {
      console.error('生成比賽失敗:', error);
      const errorMessage = error.response?.data?.message || '生成比賽失敗';
      message.error(errorMessage);
      
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          message.error(err);
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  // 處理比賽順序變更
  const handleMatchChange = (matchIndex, newTeam1, newTeam2) => {
    const updatedMatches = [...editableMatches];
    updatedMatches[matchIndex] = {
      ...updatedMatches[matchIndex],
      team1: newTeam1,
      team2: newTeam2
    };
    setEditableMatches(updatedMatches);
  };

  // 重置比賽順序
  const resetMatchOrder = () => {
    setEditableMatches([...originalMatches]);
    message.success('已重置為原始順序');
  };

  // 隨機重排比賽
  const shuffleMatches = () => {
    const shuffled = [...editableMatches];
    // 只打亂對陣隊伍，保持場次和時間不變
    const teamPairs = shuffled.map(match => ({ team1: match.team1, team2: match.team2 }));
    
    // Fisher-Yates shuffle algorithm
    for (let i = teamPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamPairs[i], teamPairs[j]] = [teamPairs[j], teamPairs[i]];
    }
    
    const newMatches = shuffled.map((match, index) => ({
      ...match,
      team1: teamPairs[index].team1,
      team2: teamPairs[index].team2
    }));
    
    setEditableMatches(newMatches);
    message.success('已隨機重排對陣隊伍');
  };

  // 交換兩場比賽的對陣隊伍
  const swapMatches = (index1, index2) => {
    if (index1 < 0 || index2 < 0 || index1 >= editableMatches.length || index2 >= editableMatches.length) {
      return;
    }
    
    const newMatches = [...editableMatches];
    const temp = {
      team1: newMatches[index1].team1,
      team2: newMatches[index1].team2
    };
    
    newMatches[index1].team1 = newMatches[index2].team1;
    newMatches[index1].team2 = newMatches[index2].team2;
    newMatches[index2].team1 = temp.team1;
    newMatches[index2].team2 = temp.team2;
    
    setEditableMatches(newMatches);
    message.success(`已交換第 ${index1 + 1} 場和第 ${index2 + 1} 場比賽`);
  };

  // 上移比賽（與上一場交換）
  const moveMatchUp = (index) => {
    if (index > 0) {
      swapMatches(index, index - 1);
    }
  };

  // 下移比賽（與下一場交換）
  const moveMatchDown = (index) => {
    if (index < editableMatches.length - 1) {
      swapMatches(index, index + 1);
    }
  };

  // 創建所有可能的對陣組合選項
  const createMatchOptions = () => {
    const options = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        options.push({
          value: `${teams[i].team_name}-vs-${teams[j].team_name}`,
          label: `${teams[i].team_name} vs ${teams[j].team_name}`,
          team1: teams[i].team_name,
          team2: teams[j].team_name
        });
      }
    }
    return options;
  };

  const matchOptions = createMatchOptions();

  // 表格列定義
  const columns = [
    {
      title: '比賽場次',
      dataIndex: 'matchNumber',
      key: 'matchNumber',
      width: 100,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: (
        <Space>
          對陣隊伍
          <Tooltip title="使用右側按鈕調整順序">
            <SwapOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      ),
      key: 'teams',
      render: (_, record, index) => {
        const isModified = originalMatches[index] && 
          (originalMatches[index].team1 !== record.team1 || originalMatches[index].team2 !== record.team2);
        
        return (
          <div style={{ 
            padding: '8px 12px',
            border: isModified ? '2px solid #faad14' : '1px solid #d9d9d9',
            borderRadius: '6px',
            backgroundColor: isModified ? '#fff7e6' : '#fafafa',
            fontWeight: isModified ? 'bold' : 'normal'
          }}>
            <Text strong>{record.team1} vs {record.team2}</Text>
            {isModified && (
              <Text style={{ color: '#fa8c16', fontSize: '12px', marginLeft: '8px' }}>
                (已修改)
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: '預定時間',
      dataIndex: 'scheduledTime',
      key: 'scheduledTime',
      width: 100,
      render: (text) => <Text>{text}</Text>
    },
    {
      title: '比賽時長',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (text) => <Text>{text}</Text>
    },
    {
      title: (
        <Space>
          調整順序
          <Tooltip title="上移/下移比賽順序">
            <ArrowUpOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      ),
      key: 'actions',
      width: 120,
      render: (_, record, index) => (
        <Space>
          <Tooltip title="上移">
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => moveMatchUp(index)}
              disabled={index === 0}
              style={{ 
                color: index === 0 ? '#d9d9d9' : '#1890ff',
                border: '1px solid',
                borderColor: index === 0 ? '#d9d9d9' : '#1890ff'
              }}
            />
          </Tooltip>
          <Tooltip title="下移">
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => moveMatchDown(index)}
              disabled={index === editableMatches.length - 1}
              style={{ 
                color: index === editableMatches.length - 1 ? '#d9d9d9' : '#1890ff',
                border: '1px solid',
                borderColor: index === editableMatches.length - 1 ? '#d9d9d9' : '#1890ff'
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>載入中...</p>
      </div>
    );
  }

  if (!groupData) {
    return (
      <Alert
        message="小組不存在"
        description="找不到指定的小組，請檢查URL是否正確"
        type="error"
        showIcon
      />
    );
  }

  if (teams.length < 2) {
    return (
      <Alert
        message="隊伍數量不足"
        description={`小組 ${groupData.group_name} 目前只有 ${teams.length} 支隊伍，至少需要2支隊伍才能創建循環賽`}
        type="warning"
        showIcon
        action={
          <Button size="small" onClick={() => navigate(`/groups/${id}`)}>
            返回小組詳情
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>
          <TrophyOutlined /> 創建小組循環賽 - 小組 {groupData.group_name}
        </Title>
        
        <Descriptions bordered style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="小組名稱">{groupData.group_name}</Descriptions.Item>
          <Descriptions.Item label="隊伍數量">{teams.length}</Descriptions.Item>
          <Descriptions.Item label="預計比賽場次">
            {(teams.length * (teams.length - 1)) / 2}
          </Descriptions.Item>
        </Descriptions>

        <Card size="small" style={{ marginBottom: '24px' }}>
          <Title level={4}><TeamOutlined /> 參賽隊伍</Title>
          <Space wrap>
            {teams.map(team => (
              <Text key={team.team_id} code>{team.team_name}</Text>
            ))}
          </Space>
        </Card>

        <Divider />

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            match_date: moment().add(1, 'day'),
            start_time: moment('09:00', 'HH:mm'),
            match_minutes: 10, // 10 minutes
            match_seconds: 0,  // 0 seconds
            match_interval: 30,
            optimize_schedule: false
          }}
        >
          <Title level={4}><SettingOutlined /> 比賽配置</Title>
          
          <Form.Item
            name="match_date"
            label="比賽日期"
            rules={[{ required: true, message: '請選擇比賽日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < moment().startOf('day')}
              placeholder="選擇比賽日期"
            />
          </Form.Item>

          <Form.Item
            name="start_time"
            label="開始時間"
            rules={[{ required: true, message: '請選擇開始時間' }]}
          >
            <TimePicker 
              style={{ width: '100%' }}
              format="HH:mm"
              placeholder="選擇開始時間"
            />
          </Form.Item>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>每場比賽時長</label>
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
                  size="large"
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
                  size="large"
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

          <Form.Item
            name="match_interval"
            label="比賽間隔時間（分鐘）"
            rules={[{ required: true, message: '請輸入比賽間隔時間' }]}
            extra="兩場比賽之間的間隔時間，用於隊伍休息和場地準備"
          >
            <InputNumber
              min={10}
              max={120}
              style={{ width: '100%' }}
              placeholder="間隔時間（分鐘）"
              formatter={value => `${value}分鐘`}
              parser={value => value.replace('分鐘', '')}
            />
          </Form.Item>

          <Form.Item
            name="optimize_schedule"
            label="優化比賽時間表"
            valuePropName="checked"
            extra="啟用後將優化比賽順序，避免隊伍背靠背比賽，確保充分休息時間"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="default" 
                icon={<InfoCircleOutlined />}
                onClick={handlePreview}
              >
                預覽比賽安排
              </Button>
              <Button 
                type="primary" 
                icon={<CalendarOutlined />}
                loading={generating}
                onClick={handleGenerate}
              >
                生成循環賽
              </Button>
              <Button onClick={() => navigate(`/groups/${id}`)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 預覽模態框 */}
        <Modal
          title={
            <Space>
              比賽安排預覽
              <Tooltip title="可以調整對陣隊伍順序">
                <EditOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
            </Space>
          }
          open={showPreview}
          onCancel={() => setShowPreview(false)}
          footer={[
            <Button key="reset" icon={<UndoOutlined />} onClick={resetMatchOrder}>
              重置順序
            </Button>,
            <Button key="shuffle" icon={<SwapOutlined />} onClick={shuffleMatches}>
              隨機重排
            </Button>,
            <Button key="cancel" onClick={() => setShowPreview(false)}>
              關閉
            </Button>,
            <Button 
              key="generate" 
              type="primary" 
              loading={generating}
              onClick={handleGenerate}
            >
              確認生成
            </Button>
          ]}
          width={900}
        >
          {previewData && (
            <div>
              <Descriptions bordered size="small" style={{ marginBottom: '16px' }}>
                <Descriptions.Item label="參賽隊伍">{previewData.statistics.teamCount}</Descriptions.Item>
                <Descriptions.Item label="總比賽場次">{previewData.statistics.totalMatches}</Descriptions.Item>
                <Descriptions.Item label="每隊比賽場次">{previewData.statistics.matchesPerTeam}</Descriptions.Item>
                <Descriptions.Item label="開始時間">{previewData.statistics.startTime}</Descriptions.Item>
                <Descriptions.Item label="預計結束時間">{previewData.statistics.endTime}</Descriptions.Item>
                <Descriptions.Item label="總時長">{previewData.statistics.estimatedDuration}</Descriptions.Item>
              </Descriptions>
              
              {form.getFieldValue('optimize_schedule') && (
                <Alert
                  message="優化提示"
                  description="已啟用比賽時間表優化，系統將自動調整比賽順序以避免隊伍背靠背比賽，確保每支隊伍都有充分的休息時間。"
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}

              <Alert
                message="編輯提示"
                description="使用右側的上移/下移按鈕調整比賽順序，或使用下方的隨機重排按鈕。比賽場次和時間將保持不變。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              {editableMatches.length > 0 && JSON.stringify(editableMatches) !== JSON.stringify(originalMatches) && (
                <Alert
                  message="已修改比賽順序"
                  description="您已經修改了比賽順序。生成時將使用您的自定義順序，而不是系統優化。"
                  type="warning"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}

              <Table
                columns={columns}
                dataSource={editableMatches}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
                rowKey="key"
              />
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default GroupMatchGenerator;