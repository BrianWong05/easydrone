import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
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
  Select,
  DatePicker,
  Checkbox,
  Divider,
  Form,
  Input
} from 'antd';
import { 
  TrophyOutlined, 
  ReloadOutlined,
  CrownOutlined,
  SafetyOutlined,
  FireOutlined,
  BarChartOutlined,
  FilterOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const BestTeamsStats = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [bestTeamsData, setBestTeamsData] = useState(null);
  const [availableMatches, setAvailableMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Filter states
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedMatchType, setSelectedMatchType] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectAllMatches, setSelectAllMatches] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAvailableMatches();
  }, [selectedTournament, selectedGroup]);

  const fetchInitialData = async () => {
    try {
      // Fetch tournaments and groups for filters
      const [tournamentsRes, groupsRes] = await Promise.all([
        axios.get('/api/tournaments'),
        axios.get('/api/groups')
      ]);
      
      if (tournamentsRes.data.success) {
        const tournamentData = tournamentsRes.data.data;
        setTournaments(Array.isArray(tournamentData) ? tournamentData : []);
      }
      
      if (groupsRes.data.success) {
        const groupData = groupsRes.data.data;
        setGroups(Array.isArray(groupData) ? groupData : []);
      }
    } catch (error) {
      console.error('獲取初始數據失敗:', error);
      message.error('獲取初始數據失敗');
      // Set default empty arrays on error
      setTournaments([]);
      setGroups([]);
    }
  };

  const fetchAvailableMatches = async () => {
    try {
      setMatchesLoading(true);
      const params = {};
      if (selectedTournament) params.tournament_id = selectedTournament;
      if (selectedGroup) params.group_id = selectedGroup;

      const response = await axios.get('/api/stats/available-matches', { params });
      if (response.data.success) {
        setAvailableMatches(response.data.data.matches || []);
        setSelectedMatches([]); // Reset selected matches when filters change
        setSelectAllMatches(false);
      }
    } catch (error) {
      console.error('獲取可用比賽失敗:', error);
      message.error('獲取可用比賽失敗');
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchBestTeamsStats = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (selectedTournament) params.tournament_id = selectedTournament;
      if (selectedGroup) params.group_id = selectedGroup;
      if (selectedMatchType) params.match_type = selectedMatchType;
      if (selectedDateRange && selectedDateRange.length === 2) {
        params.date_from = selectedDateRange[0].format('YYYY-MM-DD');
        params.date_to = selectedDateRange[1].format('YYYY-MM-DD');
      }
      if (selectedMatches.length > 0) {
        params.match_ids = selectedMatches.join(',');
      }

      const response = await axios.get('/api/stats/best-teams', { params });
      if (response.data.success) {
        setBestTeamsData(response.data.data);
        message.success('統計數據已更新');
      }
    } catch (error) {
      console.error('獲取最佳球隊統計失敗:', error);
      message.error('獲取最佳球隊統計失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllMatches = (checked) => {
    setSelectAllMatches(checked);
    if (checked) {
      setSelectedMatches(availableMatches.map(match => match.match_id));
    } else {
      setSelectedMatches([]);
    }
  };

  const handleMatchSelection = (matchIds) => {
    setSelectedMatches(matchIds);
    setSelectAllMatches(matchIds.length === availableMatches.length);
  };

  const resetFilters = () => {
    setSelectedTournament(null);
    setSelectedGroup(null);
    setSelectedMatchType(null);
    setSelectedDateRange(null);
    setSelectedMatches([]);
    setSelectAllMatches(false);
    setBestTeamsData(null);
  };

  // Helper function to clean team names
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    const match = teamName.match(/^(.+)_\d+$/);
    if (match) {
      return match[1];
    }
    return teamName;
  };

  const attackTeamsColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record, index) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontSize: index === 0 ? '18px' : '16px',
            fontWeight: 'bold',
            color: index === 0 ? '#faad14' : index === 1 ? '#52c41a' : index === 2 ? '#1890ff' : '#666'
          }}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
          </span>
        </div>
      ),
      width: 80,
    },
    {
      title: '隊伍',
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color, 
              marginRight: 8,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
            }} 
          />
          <div>
            <div 
              style={{ 
                fontWeight: 'bold',
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? `小組 ${record.group_name}` : '無小組'}
            </Text>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: '比賽場次',
      dataIndex: 'matches_played',
      key: 'matches_played',
      width: 100,
      align: 'center',
    },
    {
      title: '總進球',
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 100,
      align: 'center',
      render: (goals) => <span style={{ fontWeight: 'bold', color: '#52c41a' }}>{goals}</span>
    },
    {
      title: '平均進球',
      dataIndex: 'avg_goals_for',
      key: 'avg_goals_for',
      width: 100,
      align: 'center',
      render: (avg) => <span style={{ fontWeight: 'bold' }}>{avg}</span>
    },
    {
      title: '失球',
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 80,
      align: 'center',
    },
  ];

  const defenseTeamsColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record, index) => (
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontSize: index === 0 ? '18px' : '16px',
            fontWeight: 'bold',
            color: index === 0 ? '#faad14' : index === 1 ? '#52c41a' : index === 2 ? '#1890ff' : '#666'
          }}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
          </span>
        </div>
      ),
      width: 80,
    },
    {
      title: '隊伍',
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color, 
              marginRight: 8,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
            }} 
          />
          <div>
            <div 
              style={{ 
                fontWeight: 'bold',
                color: '#1890ff',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
              onClick={() => navigate(`/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? `小組 ${record.group_name}` : '無小組'}
            </Text>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: '比賽場次',
      dataIndex: 'matches_played',
      key: 'matches_played',
      width: 100,
      align: 'center',
    },
    {
      title: '總失球',
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 100,
      align: 'center',
      render: (goals) => <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{goals}</span>
    },
    {
      title: '平均失球',
      dataIndex: 'avg_goals_against',
      key: 'avg_goals_against',
      width: 100,
      align: 'center',
      render: (avg) => <span style={{ fontWeight: 'bold' }}>{avg}</span>
    },
    {
      title: '進球',
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 80,
      align: 'center',
    },
  ];

  const matchColumns = [
    {
      title: '比賽日期',
      dataIndex: 'match_date',
      key: 'match_date',
      width: 120,
      render: (date) => moment(date).format('YYYY-MM-DD')
    },
    {
      title: '比賽',
      key: 'match',
      render: (_, record) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: record.team1_color, fontWeight: 'bold' }}>
              {getDisplayTeamName(record.team1_name)}
            </span>
            <span style={{ margin: '0 8px', fontWeight: 'bold' }}>
              {record.team1_score} - {record.team2_score}
            </span>
            <span style={{ color: record.team2_color, fontWeight: 'bold' }}>
              {getDisplayTeamName(record.team2_name)}
            </span>
          </div>
          {record.group_name && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              小組 {record.group_name}
            </Text>
          )}
        </div>
      ),
      width: 300,
    },
    {
      title: '比賽類型',
      dataIndex: 'match_type',
      key: 'match_type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'group' ? 'blue' : type === 'knockout' ? 'red' : 'default'}>
          {type === 'group' ? '小組賽' : type === 'knockout' ? '淘汰賽' : type}
        </Tag>
      )
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <BarChartOutlined /> 最佳球隊統計
        </Title>
        <Space>
          <Button onClick={resetFilters}>
            重置篩選
          </Button>
          <Button 
            type="primary"
            icon={<SearchOutlined />} 
            onClick={fetchBestTeamsStats}
            loading={loading}
          >
            計算統計
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card title={<><FilterOutlined /> 篩選條件</>} style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>錦標賽</Text>
              <Select
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="選擇錦標賽"
                allowClear
                value={selectedTournament}
                onChange={setSelectedTournament}
              >
                {Array.isArray(tournaments) && tournaments.map(tournament => (
                  <Option key={tournament.tournament_id} value={tournament.tournament_id}>
                    {tournament.tournament_name}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>小組</Text>
              <Select
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="選擇小組"
                allowClear
                value={selectedGroup}
                onChange={setSelectedGroup}
              >
                {Array.isArray(groups) && groups.map(group => (
                  <Option key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>比賽類型</Text>
              <Select
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="選擇比賽類型"
                allowClear
                value={selectedMatchType}
                onChange={setSelectedMatchType}
              >
                <Option value="group">小組賽</Option>
                <Option value="knockout">淘汰賽</Option>
              </Select>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text strong>日期範圍</Text>
              <RangePicker
                style={{ width: '100%', marginTop: '4px' }}
                value={selectedDateRange}
                onChange={setSelectedDateRange}
              />
            </div>
          </Col>
        </Row>
        
        <Divider />
        
        <div>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>選擇特定比賽 ({selectedMatches.length}/{availableMatches.length})</Text>
            <Checkbox
              checked={selectAllMatches}
              onChange={(e) => handleSelectAllMatches(e.target.checked)}
            >
              全選
            </Checkbox>
          </div>
          
          {matchesLoading ? (
            <Spin />
          ) : (
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="選擇要包含在統計中的比賽（留空表示包含所有符合條件的比賽）"
              value={selectedMatches}
              onChange={handleMatchSelection}
              maxTagCount={3}
              maxTagTextLength={20}
            >
              {Array.isArray(availableMatches) && availableMatches.map(match => (
                <Option key={match.match_id} value={match.match_id}>
                  {moment(match.match_date).format('MM-DD')} {getDisplayTeamName(match.team1_name)} vs {getDisplayTeamName(match.team2_name)} ({match.team1_score}-{match.team2_score})
                </Option>
              ))}
            </Select>
          )}
          
          {availableMatches.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                共 {availableMatches.length} 場已完成的比賽可供選擇
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      {bestTeamsData && (
        <>
          {/* Summary */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="分析比賽數"
                  value={bestTeamsData.summary.total_matches_analyzed}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="分析隊伍數"
                  value={bestTeamsData.summary.teams_analyzed}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ backgroundColor: '#f6ffed' }}>
                <Statistic
                  title="最佳進攻球隊"
                  value={getDisplayTeamName(bestTeamsData.best_attack_team?.team_name)}
                  suffix={`${bestTeamsData.best_attack_team?.goals_for || 0} 球`}
                  prefix={<FireOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card style={{ backgroundColor: '#e6f7ff' }}>
                <Statistic
                  title="最佳防守球隊"
                  value={getDisplayTeamName(bestTeamsData.best_defense_team?.team_name)}
                  suffix={`失 ${bestTeamsData.best_defense_team?.goals_against || 0} 球`}
                  prefix={<SafetyOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Top Attack Teams */}
          <Card 
            title={<><FireOutlined style={{ color: '#52c41a' }} /> 最佳進攻球隊排行榜</>} 
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={attackTeamsColumns}
              dataSource={bestTeamsData.top_attack_teams}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: '暫無數據' }}
            />
          </Card>

          {/* Top Defense Teams */}
          <Card 
            title={<><SafetyOutlined style={{ color: '#1890ff' }} /> 最佳防守球隊排行榜</>}
            style={{ marginBottom: '24px' }}
          >
            <Table
              columns={defenseTeamsColumns}
              dataSource={bestTeamsData.top_defense_teams}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: '暫無數據' }}
            />
          </Card>

          {/* Applied Filters Summary */}
          <Card title="篩選條件摘要" size="small">
            <div style={{ fontSize: '12px', color: '#666' }}>
              {bestTeamsData.summary.filters_applied.tournament_id && (
                <p><strong>錦標賽：</strong> {Array.isArray(tournaments) ? tournaments.find(t => t.tournament_id == bestTeamsData.summary.filters_applied.tournament_id)?.tournament_name || '未知' : '未知'}</p>
              )}
              {bestTeamsData.summary.filters_applied.group_id && (
                <p><strong>小組：</strong> {Array.isArray(groups) ? groups.find(g => g.group_id == bestTeamsData.summary.filters_applied.group_id)?.group_name || '未知' : '未知'}</p>
              )}
              {bestTeamsData.summary.filters_applied.match_type && (
                <p><strong>比賽類型：</strong> {bestTeamsData.summary.filters_applied.match_type === 'group' ? '小組賽' : '淘汰賽'}</p>
              )}
              {bestTeamsData.summary.filters_applied.date_range && (
                <p><strong>日期範圍：</strong> {bestTeamsData.summary.filters_applied.date_range}</p>
              )}
              {bestTeamsData.summary.filters_applied.specific_matches && (
                <p><strong>特定比賽：</strong> {bestTeamsData.summary.filters_applied.specific_matches} 場比賽</p>
              )}
              <p><strong>統計說明：</strong> 最佳進攻球隊以總進球數排名，最佳防守球隊以總失球數排名（越少越好）</p>
            </div>
          </Card>
        </>
      )}

      {!bestTeamsData && (
        <Card>
          <Alert
            message="請設定篩選條件並點擊「計算統計」"
            description="您可以選擇錦標賽、小組、比賽類型、日期範圍或特定比賽來計算最佳進攻和防守球隊統計"
            type="info"
            showIcon
          />
        </Card>
      )}
    </div>
  );
};

export default BestTeamsStats;