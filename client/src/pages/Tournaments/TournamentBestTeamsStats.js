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
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const TournamentBestTeamsStats = () => {
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [bestTeamsData, setBestTeamsData] = useState(null);
  const [availableMatches, setAvailableMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [availableKnockoutRounds, setAvailableKnockoutRounds] = useState([]);
  
  // Filter states
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedKnockoutRounds, setSelectedKnockoutRounds] = useState([]);
  const [selectedMatchType, setSelectedMatchType] = useState(null);
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectAllMatches, setSelectAllMatches] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [tournamentId]);

  useEffect(() => {
    fetchAvailableMatches();
  }, [tournamentId, selectedGroups, selectedKnockoutRounds]);

  // Auto-select matches when groups or knockout rounds are selected
  useEffect(() => {
    if (availableMatches.length > 0) {
      autoSelectMatchesBasedOnFilters();
    }
  }, [availableMatches, selectedGroups, selectedKnockoutRounds]);

  const fetchInitialData = async () => {
    try {
      // Fetch tournament and groups for this tournament
      const [tournamentRes, groupsRes] = await Promise.all([
        axios.get(`/api/tournaments/${tournamentId}`),
        axios.get(`/api/tournaments/${tournamentId}/groups`)
      ]);
      
      if (tournamentRes.data.success) {
        const tournamentData = tournamentRes.data.data.tournament || tournamentRes.data.data;
        setTournament(tournamentData);
      }
      
      if (groupsRes.data.success) {
        const groupData = groupsRes.data.data;
        setGroups(Array.isArray(groupData) ? groupData : []);
      }

      // Fetch available knockout rounds from tournament matches
      await fetchAvailableKnockoutRounds();
    } catch (error) {
      console.error('獲取錦標賽數據失敗:', error);
      message.error('獲取錦標賽數據失敗');
      // Set default empty arrays on error
      setGroups([]);
      setAvailableKnockoutRounds([]);
    }
  };

  const fetchAvailableKnockoutRounds = async () => {
    try {
      console.log('🔍 Fetching knockout rounds for tournament:', tournamentId);
      
      // Get all knockout matches for this tournament to see which rounds exist
      const response = await axios.get('/api/stats/available-matches', { 
        params: { 
          tournament_id: tournamentId,
          match_type: 'knockout'
        }
      });
      
      console.log('🔍 API Response:', response.data);
      
      if (response.data.success) {
        const matches = response.data.data.matches || [];
        console.log('🔍 All knockout matches found:', matches.length);
        console.log('🔍 Sample matches:', matches.slice(0, 3));
        
        // Log all tournament_stage values (including null/undefined)
        const allStages = matches.map(match => match.tournament_stage);
        console.log('🔍 All tournament_stage values:', allStages);
        
        // Extract unique tournament stages from knockout matches
        const stages = [...new Set(matches.map(match => match.tournament_stage).filter(Boolean))];
        
        console.log('🏆 Found knockout stages in database:', stages);
        console.log('🏆 Available knockout rounds mapping:', knockoutRounds.map(r => r.value));
        
        // Filter knockout rounds to only show available ones
        const available = knockoutRounds.filter(round => stages.includes(round.value));
        console.log('🏆 Filtered available rounds:', available);
        
        setAvailableKnockoutRounds(available);
      } else {
        console.error('🔍 API returned success: false', response.data);
        setAvailableKnockoutRounds([]);
      }
    } catch (error) {
      console.error('獲取淘汰賽輪次失敗:', error);
      // Fallback to show all rounds if fetch fails
      setAvailableKnockoutRounds(knockoutRounds);
    }
  };

  const fetchAvailableMatches = async () => {
    try {
      setMatchesLoading(true);
      const params = { tournament_id: tournamentId };
      if (selectedGroups.length > 0) {
        // If multiple groups selected, we'll handle this in the backend or filter client-side
        params.group_id = selectedGroups[0]; // For now, use first selected group for API call
      }

      const response = await axios.get('/api/stats/available-matches', { params });
      if (response.data.success) {
        let matches = response.data.data.matches || [];
        
        // Client-side filtering for multiple groups if needed
        if (selectedGroups.length > 0) {
          matches = matches.filter(match => 
            selectedGroups.includes(match.group_id) || !match.group_id // Include non-group matches
          );
        }
        
        setAvailableMatches(matches);
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

  // Helper function to get cumulative knockout rounds
  const getCumulativeKnockoutRounds = (selectedRounds) => {
    if (selectedRounds.length === 0) return [];
    
    // Define round hierarchy (from earliest to latest)
    const roundHierarchy = [
      'round_of_32', 'round_of_16', 'quarter_final', 'quarterfinal', 'quarter-final', 'top8',
      'semi_final', 'semifinal', 'semi-final', 'top4',
      'third_place', 'third-place', 'bronze',
      'final', 'finals', 'gold'
    ];
    
    // Find the earliest selected round
    let earliestIndex = roundHierarchy.length;
    selectedRounds.forEach(round => {
      const index = roundHierarchy.indexOf(round);
      if (index !== -1 && index < earliestIndex) {
        earliestIndex = index;
      }
    });
    
    // Return all rounds from the earliest selected round onwards
    if (earliestIndex < roundHierarchy.length) {
      return roundHierarchy.slice(earliestIndex);
    }
    
    return selectedRounds; // Fallback to original selection
  };

  // Auto-select matches based on selected groups and knockout rounds
  const autoSelectMatchesBasedOnFilters = () => {
    if (availableMatches.length === 0) return;

    let matchesToSelect = [];

    // If groups are selected, include matches from those groups
    if (selectedGroups.length > 0) {
      const groupMatches = availableMatches.filter(match => 
        selectedGroups.includes(match.group_id)
      );
      matchesToSelect.push(...groupMatches.map(m => m.match_id));
    }

    // If knockout rounds are selected, include matches from those rounds
    if (selectedKnockoutRounds.length > 0) {
      const cumulativeRounds = getCumulativeKnockoutRounds(selectedKnockoutRounds);
      const knockoutMatches = availableMatches.filter(match => 
        cumulativeRounds.includes(match.tournament_stage)
      );
      matchesToSelect.push(...knockoutMatches.map(m => m.match_id));
    }

    // If mixed match type is selected and both groups and knockout rounds are selected
    if (selectedMatchType === 'mixed' && selectedGroups.length > 0 && selectedKnockoutRounds.length > 0) {
      // Already handled above - union of group and knockout matches
    }
    // If no specific filters, don't auto-select anything
    else if (selectedGroups.length === 0 && selectedKnockoutRounds.length === 0) {
      matchesToSelect = [];
    }

    // Remove duplicates and update selection
    const uniqueMatches = [...new Set(matchesToSelect)];
    setSelectedMatches(uniqueMatches);
    setSelectAllMatches(uniqueMatches.length === availableMatches.length);

    console.log('🎯 Auto-selected matches based on filters:', {
      selectedGroups,
      selectedKnockoutRounds,
      totalAvailable: availableMatches.length,
      autoSelected: uniqueMatches.length
    });
  };

  const fetchBestTeamsStats = async () => {
    try {
      setLoading(true);
      const params = { tournament_id: tournamentId }; // Always filter by current tournament
      
      // Priority 1: If specific matches are selected, use only those matches
      if (selectedMatches.length > 0) {
        params.match_ids = selectedMatches.join(',');
        console.log('🎯 Using selected matches:', selectedMatches.length, 'matches');
      } 
      // Priority 2: If no specific matches selected, use group/knockout filters
      else {
        if (selectedGroups.length > 0) {
          params.group_id = selectedGroups.join(',');
        }
        if (selectedKnockoutRounds.length > 0) {
          const cumulativeRounds = getCumulativeKnockoutRounds(selectedKnockoutRounds);
          params.tournament_stage = cumulativeRounds.join(',');
          console.log('🏆 Using knockout rounds filter:', cumulativeRounds);
        }
        if (selectedMatchType) params.match_type = selectedMatchType;
        console.log('🎯 Using filter-based selection (no specific matches selected)');
      }

      // Date range filter (always applied if set)
      if (selectedDateRange && selectedDateRange.length === 2) {
        params.date_from = selectedDateRange[0].format('YYYY-MM-DD');
        params.date_to = selectedDateRange[1].format('YYYY-MM-DD');
      }

      console.log('📊 Final API parameters:', params);

      const response = await axios.get('/api/stats/best-teams', { params });
      if (response.data.success) {
        setBestTeamsData(response.data.data);
        
        // Save to public cache for client-public display
        try {
          await axios.post('/api/stats/best-teams-cache', {
            stats_data: response.data.data
          });
          console.log('✅ Stats saved to public cache');
        } catch (cacheError) {
          console.error('Failed to save to public cache:', cacheError);
        }
        
        message.success(`統計數據已更新並發布到公開頁面 (基於 ${selectedMatches.length > 0 ? selectedMatches.length + ' 場選定比賽' : '篩選條件'})`);
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
    setSelectedGroups([]);
    setSelectedKnockoutRounds([]);
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

  // Helper function to clean group names
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return '';
    const match = groupName.match(/^(.+)_\d+$/);
    if (match) {
      return match[1];
    }
    return groupName;
  };

  // Knockout rounds mapping - including common variations
  const knockoutRounds = [
    { value: 'round_of_32', label: '32強' },
    { value: 'round_of_16', label: '16強' },
    { value: 'quarter_final', label: '八強' },
    { value: 'quarterfinal', label: '八強' },
    { value: 'quarter-final', label: '八強' },
    { value: 'top8', label: '八強' },
    { value: 'semi_final', label: '四強' },
    { value: 'semifinal', label: '四強' },
    { value: 'semi-final', label: '四強' },
    { value: 'top4', label: '四強' },
    { value: 'third_place', label: '季軍戰' },
    { value: 'third-place', label: '季軍戰' },
    { value: 'bronze', label: '季軍戰' },
    { value: 'final', label: '決賽' },
    { value: 'finals', label: '決賽' },
    { value: 'gold', label: '決賽' }
  ];

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
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? `小組 ${getDisplayGroupName(record.group_name)}` : '無小組'}
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
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.group_name ? `小組 ${getDisplayGroupName(record.group_name)}` : '無小組'}
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

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <BarChartOutlined /> {tournament?.tournament_name || '錦標賽'} - 最佳球隊統計
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
          <Col xs={24} sm={12} md={selectedMatchType === 'knockout' ? 12 : 8}>
            <div>
              <Text strong>比賽類型 <span style={{ color: '#ff4d4f' }}>*</span></Text>
              <Select
                style={{ width: '100%', marginTop: '4px' }}
                placeholder="請先選擇比賽類型"
                allowClear
                value={selectedMatchType}
                onChange={(value) => {
                  setSelectedMatchType(value);
                  // Clear group/knockout selection when switching match type
                  if (value === 'knockout' || !value) {
                    setSelectedGroups([]);
                  }
                  if (value === 'group' || value === 'mixed' || !value) {
                    setSelectedKnockoutRounds([]);
                  }
                }}
              >
                <Option value="group">小組賽</Option>
                <Option value="knockout">淘汰賽</Option>
                <Option value="mixed">混合賽制 (小組賽+淘汰賽)</Option>
              </Select>
            </div>
          </Col>
          {(selectedMatchType === 'group' || selectedMatchType === 'mixed') && (
            <Col xs={24} sm={12} md={8}>
              <div>
                <Text strong>小組 ({selectedGroups.length} 已選)</Text>
                <div style={{ 
                  marginTop: '8px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '6px', 
                  padding: '8px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Checkbox
                      indeterminate={selectedGroups.length > 0 && selectedGroups.length < groups.length}
                      checked={selectedGroups.length === groups.length && groups.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroups(groups.map(g => g.group_id));
                        } else {
                          setSelectedGroups([]);
                        }
                      }}
                    >
                      <Text strong>全選</Text>
                    </Checkbox>
                  </div>
                  {Array.isArray(groups) && groups.map(group => (
                    <div key={group.group_id} style={{ marginBottom: '4px' }}>
                      <Checkbox
                        checked={selectedGroups.includes(group.group_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.group_id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.group_id));
                          }
                        }}
                      >
                        {getDisplayGroupName(group.group_name)}
                      </Checkbox>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      此錦標賽暫無小組
                    </Text>
                  )}
                </div>
              </div>
            </Col>
          )}
          {(selectedMatchType === 'knockout' || selectedMatchType === 'mixed') && (
            <Col xs={24} sm={12} md={8}>
              <div>
                <Text strong>淘汰賽輪次 ({selectedKnockoutRounds.length} 已選)</Text>
                <div style={{ 
                  marginTop: '8px', 
                  border: '1px solid #d9d9d9', 
                  borderRadius: '6px', 
                  padding: '8px',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <Checkbox
                      indeterminate={selectedKnockoutRounds.length > 0 && selectedKnockoutRounds.length < availableKnockoutRounds.length}
                      checked={selectedKnockoutRounds.length === availableKnockoutRounds.length && availableKnockoutRounds.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedKnockoutRounds(availableKnockoutRounds.map(r => r.value));
                        } else {
                          setSelectedKnockoutRounds([]);
                        }
                      }}
                    >
                      <Text strong>全選</Text>
                    </Checkbox>
                  </div>
                  {availableKnockoutRounds.length === 0 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      此錦標賽暫無淘汰賽
                    </Text>
                  )}
                  {availableKnockoutRounds.map(round => (
                    <div key={round.value} style={{ marginBottom: '4px' }}>
                      <Checkbox
                        checked={selectedKnockoutRounds.includes(round.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKnockoutRounds([...selectedKnockoutRounds, round.value]);
                          } else {
                            setSelectedKnockoutRounds(selectedKnockoutRounds.filter(r => r !== round.value));
                          }
                        }}
                      >
                        <span>{round.label}</span>
                        <span style={{ fontSize: '10px', color: '#999', marginLeft: '4px' }}>
                          (含後續輪次)
                        </span>
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </div>
            </Col>
          )}
          <Col xs={24} sm={12} md={
            selectedMatchType === 'knockout' ? 4 : 
            selectedMatchType === 'mixed' ? 4 : 8
          }>
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
            <div style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              padding: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: '#fafafa'
            }}>
              {availableMatches.length === 0 && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  暫無符合條件的比賽
                </Text>
              )}
              {Array.isArray(availableMatches) && availableMatches.map(match => (
                <div key={match.match_id} style={{ marginBottom: '4px' }}>
                  <Checkbox
                    checked={selectedMatches.includes(match.match_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMatches([...selectedMatches, match.match_id]);
                      } else {
                        setSelectedMatches(selectedMatches.filter(id => id !== match.match_id));
                      }
                      // Update select all state
                      const newSelected = e.target.checked 
                        ? [...selectedMatches, match.match_id]
                        : selectedMatches.filter(id => id !== match.match_id);
                      setSelectAllMatches(newSelected.length === availableMatches.length);
                    }}
                  >
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {moment(match.match_date).format('MM/DD HH:mm')} - {match.match_type === 'group' ? '小組賽' : '淘汰賽'}
                        {match.match_number && (
                          <span style={{ marginLeft: '8px', color: '#1890ff' }}>
                            🏟️ {match.match_number}
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#666' }}>
                        {getDisplayTeamName(match.team1_name)} vs {getDisplayTeamName(match.team2_name)} 
                        <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                          ({match.team1_score || 0}-{match.team2_score || 0})
                        </span>
                      </div>
                      <div style={{ color: '#999', fontSize: '11px', display: 'flex', gap: '12px' }}>
                        {match.group_name && (
                          <span>{getDisplayGroupName(match.group_name)}</span>
                        )}
                        {match.tournament_stage && (
                          <span>🏆 {match.tournament_stage}</span>
                        )}
                      </div>
                    </div>
                  </Checkbox>
                </div>
              ))}
            </div>
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
              <p><strong>錦標賽：</strong> {tournament?.tournament_name || '未知'}</p>
              {bestTeamsData.summary.filters_applied.group_id && (
                <p><strong>小組：</strong> {
                  (() => {
                    if (!Array.isArray(groups)) return '未知';
                    const groupIds = bestTeamsData.summary.filters_applied.group_id.split(',');
                    const groupNames = groupIds.map(id => {
                      const group = groups.find(g => g.group_id == id);
                      return group ? getDisplayGroupName(group.group_name) : `未知(${id})`;
                    });
                    return groupNames.join(', ');
                  })()
                }</p>
              )}
              {bestTeamsData.summary.filters_applied.tournament_stage && (
                <p><strong>淘汰賽輪次：</strong> {
                  (() => {
                    const stageIds = bestTeamsData.summary.filters_applied.tournament_stage.split(',');
                    const stageNames = stageIds.map(id => 
                      availableKnockoutRounds.find(r => r.value === id)?.label || 
                      knockoutRounds.find(r => r.value === id)?.label || 
                      `未知(${id})`
                    );
                    return stageNames.join(', ');
                  })()
                }</p>
              )}
              {bestTeamsData.summary.filters_applied.match_type && (
                <p><strong>比賽類型：</strong> {
                  bestTeamsData.summary.filters_applied.match_type === 'group' ? '小組賽' : 
                  bestTeamsData.summary.filters_applied.match_type === 'knockout' ? '淘汰賽' : 
                  bestTeamsData.summary.filters_applied.match_type === 'mixed' ? '混合賽制' : 
                  bestTeamsData.summary.filters_applied.match_type
                }</p>
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
            message={selectedMatchType ? "請點擊「計算統計」開始分析" : "請先選擇比賽類型"}
            description={
              selectedMatchType 
                ? `分析 ${tournament?.tournament_name || '此錦標賽'} 中的${
                    selectedMatchType === 'group' ? '小組賽' : 
                    selectedMatchType === 'knockout' ? '淘汰賽' : 
                    '所有比賽'
                  }最佳進攻和防守球隊。`
                : `請先選擇要分析的比賽類型（小組賽、淘汰賽或混合賽制），然後設定其他篩選條件。`
            }
            type={selectedMatchType ? "info" : "warning"}
            showIcon
          />
        </Card>
      )}
    </div>
  );
};

export default TournamentBestTeamsStats;