import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  message,
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Spin
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;

const TournamentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasRelatedData, setHasRelatedData] = useState(false);
  const [knockoutMatches, setKnockoutMatches] = useState(0);
  const [groupMatches, setGroupMatches] = useState(0);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tournaments/${id}`);
      
      if (response.data.success) {
        const tournamentData = response.data.data.tournament;
        setTournament(tournamentData);
        
        // 檢查是否有相關數據
        const hasGroups = response.data.data.groups?.length > 0;
        const hasTeams = response.data.data.teams?.length > 0;
        const allMatches = response.data.data.matches || [];
        const groupMatchCount = allMatches.filter(m => m.match_type === 'group').length;
        const knockoutMatchCount = allMatches.filter(m => m.match_type === 'knockout').length;
        
        setGroupMatches(groupMatchCount);
        setKnockoutMatches(knockoutMatchCount);
        setHasRelatedData(hasGroups || hasTeams || allMatches.length > 0);
        
        // 設置表單初始值
        form.setFieldsValue({
          tournament_name: tournamentData.tournament_name,
          tournament_type: tournamentData.tournament_type,
          start_date: moment(tournamentData.start_date),
          end_date: moment(tournamentData.end_date)
        });
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      message.error('獲取錦標賽信息失敗');
      navigate('/tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSaving(true);
      
      const updateData = {
        tournament_name: values.tournament_name,
        tournament_type: values.tournament_type,
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD')
      };

      const response = await axios.put(`/api/tournaments/${id}`, updateData);
      
      if (response.data.success) {
        message.success('錦標賽更新成功');
        navigate(`/tournaments/${id}`);
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      const errorMsg = error.response?.data?.message || '更新錦標賽失敗';
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const getTournamentTypeInfo = (type) => {
    switch (type) {
      case 'group':
        return {
          title: '小組賽制',
          description: '隊伍分組進行循環賽，適合多隊伍參與的賽事。',
          features: ['分組循環賽', '積分排名', '適合多隊伍']
        };
      case 'knockout':
        return {
          title: '淘汰賽制',
          description: '單場淘汰制，敗者即被淘汰，適合快速決出勝負。',
          features: ['單場淘汰', '快速決勝', '刺激緊張']
        };
      case 'mixed':
        return {
          title: '混合賽制',
          description: '結合小組賽和淘汰賽，先進行小組賽選出晉級隊伍，再進行淘汰賽決出冠軍。',
          features: ['小組賽+淘汰賽', '兩階段比賽', '最完整的賽制']
        };
      default:
        return null;
    }
  };

  const getTournamentTypeChangeInfo = () => {
    if (!tournament) return null;

    const currentType = tournament.tournament_type;
    const selectedType = form.getFieldValue('tournament_type');

    if (currentType === selectedType) return null;

    // 小組賽制 → 混合賽制：總是允許
    if (currentType === 'group' && selectedType === 'mixed') {
      return {
        allowed: true,
        type: 'success',
        message: '✅ 允許變更：小組賽制可以隨時變更為混合賽制',
        description: '現有的小組和比賽數據將保留，您可以稍後添加淘汰賽階段。'
      };
    }

    // 混合賽制 → 小組賽制：只有在沒有淘汰賽比賽時才允許
    if (currentType === 'mixed' && selectedType === 'group') {
      if (knockoutMatches > 0) {
        return {
          allowed: false,
          type: 'error',
          message: '❌ 無法變更：存在淘汰賽比賽',
          description: `發現 ${knockoutMatches} 場淘汰賽比賽。請先刪除所有淘汰賽比賽才能變更為小組賽制。`
        };
      } else {
        return {
          allowed: true,
          type: 'warning',
          message: '⚠️ 允許變更：混合賽制變更為小組賽制',
          description: '沒有淘汰賽比賽，可以安全變更為小組賽制。'
        };
      }
    }

    // 其他變更：使用原有的嚴格規則
    if (hasRelatedData) {
      return {
        allowed: false,
        type: 'error',
        message: '❌ 無法變更：存在相關數據',
        description: '錦標賽已有相關數據（小組、隊伍或比賽）。請先清除所有相關數據。'
      };
    }

    return {
      allowed: true,
      type: 'info',
      message: '✅ 允許變更：無相關數據',
      description: '錦標賽沒有相關數據，可以安全變更類型。'
    };
  };

  const isTournamentTypeChangeAllowed = () => {
    const changeInfo = getTournamentTypeChangeInfo();
    return changeInfo ? changeInfo.allowed : true;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>載入錦標賽信息中...</Text>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text type="danger">錦標賽不存在</Text>
      </div>
    );
  }

  // 檢查是否可以編輯
  const canEdit = tournament.status === 'pending';

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/tournaments/${id}`)}
          style={{ marginBottom: 16 }}
        >
          返回錦標賽詳情
        </Button>
        <Title level={2}>
          <EditOutlined /> 編輯錦標賽
        </Title>
        <Text type="secondary">修改錦標賽的基本信息</Text>
      </div>

      {!canEdit && (
        <Alert
          message="無法編輯錦標賽"
          description="只能編輯待開始狀態的錦標賽。已開始或已完成的錦標賽無法修改。"
          type="warning"
          style={{ marginBottom: 24 }}
          showIcon
        />
      )}

      {(() => {
        const changeInfo = getTournamentTypeChangeInfo();
        if (!changeInfo) return null;
        
        return (
          <Alert
            message="錦標賽類型變更"
            description={
              <div>
                <div style={{ marginBottom: '8px' }}>{changeInfo.message}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{changeInfo.description}</div>
                {groupMatches > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    📊 小組賽比賽: {groupMatches} 場
                  </div>
                )}
                {knockoutMatches > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    🏆 淘汰賽比賽: {knockoutMatches} 場
                  </div>
                )}
              </div>
            }
            type={changeInfo.type}
            style={{ marginBottom: 24 }}
            showIcon
          />
        );
      })()}

      <Row gutter={24}>
        <Col span={16}>
          <Card title="錦標賽信息">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              disabled={!canEdit}
            >
              <Form.Item
                label="錦標賽名稱"
                name="tournament_name"
                rules={[
                  { required: true, message: '請輸入錦標賽名稱' },
                  { min: 2, message: '錦標賽名稱至少需要2個字符' },
                  { max: 100, message: '錦標賽名稱不能超過100個字符' }
                ]}
              >
                <Input 
                  placeholder="請輸入錦標賽名稱"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="錦標賽類型"
                name="tournament_type"
                rules={[{ required: true, message: '請選擇錦標賽類型' }]}
              >
                <Select 
                  placeholder="請選擇錦標賽類型"
                  size="large"
                  disabled={!isTournamentTypeChangeAllowed()}
                >
                  <Option value="group">
                    <div>
                      <div style={{ fontWeight: 'bold' }}>小組賽制</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        隊伍分組進行循環賽
                      </div>
                    </div>
                  </Option>
                  <Option value="knockout">
                    <div>
                      <div style={{ fontWeight: 'bold' }}>淘汰賽制</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        單場淘汰制，快速決勝
                      </div>
                    </div>
                  </Option>
                  <Option value="mixed">
                    <div>
                      <div style={{ fontWeight: 'bold' }}>混合賽制</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        小組賽+淘汰賽組合
                      </div>
                    </div>
                  </Option>
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="開始日期"
                    name="start_date"
                    rules={[{ required: true, message: '請選擇開始日期' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      size="large"
                      placeholder="選擇開始日期"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="結束日期"
                    name="end_date"
                    rules={[
                      { required: true, message: '請選擇結束日期' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || !getFieldValue('start_date')) {
                            return Promise.resolve();
                          }
                          if (value.isBefore(getFieldValue('start_date'))) {
                            return Promise.reject(new Error('結束日期不能早於開始日期'));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      size="large"
                      placeholder="選擇結束日期"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {canEdit && (
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saving}
                      size="large"
                    >
                      保存更改
                    </Button>
                    <Button
                      onClick={() => navigate(`/tournaments/${id}`)}
                      size="large"
                    >
                      取消
                    </Button>
                  </Space>
                </Form.Item>
              )}
            </Form>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="錦標賽狀態">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>當前狀態：</Text>
                <br />
                <Text>
                  {tournament.status === 'pending' && '待開始'}
                  {tournament.status === 'active' && '進行中'}
                  {tournament.status === 'completed' && '已完成'}
                </Text>
              </div>
              
              <div>
                <Text strong>創建時間：</Text>
                <br />
                <Text>{moment(tournament.created_at).format('YYYY-MM-DD HH:mm')}</Text>
              </div>
              
              {tournament.updated_at && (
                <div>
                  <Text strong>最後更新：</Text>
                  <br />
                  <Text>{moment(tournament.updated_at).format('YYYY-MM-DD HH:mm')}</Text>
                </div>
              )}
            </Space>
          </Card>

          {form.getFieldValue('tournament_type') && (
            <Card title="賽制說明" style={{ marginTop: 16 }}>
              {(() => {
                const typeInfo = getTournamentTypeInfo(form.getFieldValue('tournament_type'));
                if (!typeInfo) return null;
                
                return (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>{typeInfo.title}</Text>
                    </div>
                    <div>
                      <Text type="secondary">{typeInfo.description}</Text>
                    </div>
                    <div>
                      <Text strong>特點：</Text>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        {typeInfo.features.map((feature, index) => (
                          <li key={index}>
                            <Text type="secondary">{feature}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Space>
                );
              })()}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TournamentEdit;