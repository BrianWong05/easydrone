import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Button,
  Select,
  DatePicker,
  Input
} from 'antd';
import { 
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ClientMatchList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['match', 'common', 'group']);
  const [tournament, setTournament] = useState(null);

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    const lastUnderscoreIndex = teamName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = teamName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = teamName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return teamName;
  };

  // Helper function to find the source match for a team position in knockout matches
  const findSourceMatch = (match, teamKey, allMatches) => {
    if (!match || match.match_type !== 'knockout') return null;
    
    const currentMatchNumber = match.match_number;
    if (!currentMatchNumber) return null;
    
    // Define knockout progression mapping based on match numbers
    const knockoutProgression = {
      // Finals get teams from semifinals
      'FI01': { team1: 'SE01', team2: 'SE02' },
      
      // Semifinals get teams from quarterfinals
      'SE01': { team1: 'QU01', team2: 'QU02' },
      'SE02': { team1: 'QU03', team2: 'QU04' },
      
      // Quarterfinals get teams from round of 16 (if exists)
      'QU01': { team1: 'R16_01', team2: 'R16_02' },
      'QU02': { team1: 'R16_03', team2: 'R16_04' },
      'QU03': { team1: 'R16_05', team2: 'R16_06' },
      'QU04': { team1: 'R16_07', team2: 'R16_08' },
      
      // Round of 16 get teams from round of 32 (if exists)
      'R16_01': { team1: 'R32_01', team2: 'R32_02' },
      'R16_02': { team1: 'R32_03', team2: 'R32_04' },
      'R16_03': { team1: 'R32_05', team2: 'R32_06' },
      'R16_04': { team1: 'R32_07', team2: 'R32_08' },
      'R16_05': { team1: 'R32_09', team2: 'R32_10' },
      'R16_06': { team1: 'R32_11', team2: 'R32_12' },
      'R16_07': { team1: 'R32_13', team2: 'R32_14' },
      'R16_08': { team1: 'R32_15', team2: 'R32_16' }
    };
    
    try {
      const progression = knockoutProgression[currentMatchNumber];
      if (progression) {
        const sourceMatchNumber = progression[teamKey];
        // Verify the source match exists in the matches list
        const sourceMatch = allMatches.find(m => m.match_number === sourceMatchNumber);
        return sourceMatch ? sourceMatchNumber : null;
      }
      return null;
    } catch (error) {
      console.error('Error finding source match:', error);
      return null;
    }
  };

  // Enhanced team display function that shows match references for knockout matches
  const getTeamDisplayNameWithReference = (match, teamKey) => {
    const teamName = match[`${teamKey}_name`];
    if (teamName) return getDisplayTeamName(teamName);
    
    // For knockout matches, show match winner reference when team is not assigned
    if (match.match_type === 'knockout') {
      const teamId = match[`${teamKey}_id`];
      if (!teamId) {
        // Find the source match for this team position
        const sourceMatch = findSourceMatch(match, teamKey, matches);
        if (sourceMatch) {
          return `${sourceMatch}${t('match:result.winner')}`;
        }
        // If no source match found, show generic placeholder
        return getKnockoutWinnerReference(match.match_number, teamKey) || t('match:status.pending');
      }
    }
    
    // For non-knockout matches or when team is assigned but no name
    return teamName || t('match:status.pending');
  };

  // 動態生成淘汰賽勝者引用
  const getKnockoutWinnerReference = (matchNumber, teamPosition) => {
    if (!matchNumber) return t('match:status.pending');
    
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
      const resultType = matchNum === 'TP01' ? t('match:result.loser') : t('match:result.winner');
      return `${sourceMatch}${resultType}`;
    }
    
    // 如果是第一輪比賽（沒有來源），返回待定
    if (matchNum.startsWith('QU') || matchNum.startsWith('R16') || matchNum.startsWith('R32')) {
      return t('match:status.pending');
    }
    
    return t('match:status.pending');
  };

  // 清理小組名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return '';
    const lastUnderscoreIndex = groupName.lastIndexOf('_');
    if (lastUnderscoreIndex !== -1) {
      const beforeUnderscore = groupName.substring(0, lastUnderscoreIndex);
      const afterUnderscore = groupName.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(afterUnderscore)) {
        return beforeUnderscore;
      }
    }
    return groupName;
  };

  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: undefined,
    type: undefined,
    group_id: undefined,
    date_range: null,
    search: ''
  });
  const [stats, setStats] = useState({
    totalMatches: 0,
    pendingMatches: 0,
    activeMatches: 0,
    completedMatches: 0
  });

  useEffect(() => {
    fetchMatchesData();
  }, []);

  useEffect(() => {
    fetchMatchesData();
  }, [filters]);

  const fetchMatchesData = async () => {
    try {
      setLoading(true);
      
      // Get active tournament
      const tournamentResponse = await axios.get('/api/tournaments/public');
      let tournamentData = null;
      
      if (tournamentResponse.data.success && tournamentResponse.data.data) {
        tournamentData = tournamentResponse.data.data;
      } else {
        // Fallback to first active tournament
        const fallbackResponse = await axios.get('/api/tournaments?status=active&limit=1');
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          tournamentData = fallbackResponse.data.data.tournaments[0];
        }
      }

      if (!tournamentData) {
        setError(t('common:messages.noTournamentFound', { defaultValue: '找不到可顯示的錦標賽' }));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch groups for filter options
      try {
        const groupsResponse = await axios.get(`/api/tournaments/${tournamentId}/groups`);
        if (groupsResponse.data.success) {
          const groupsData = Array.isArray(groupsResponse.data.data) ? 
            groupsResponse.data.data : (groupsResponse.data.data.groups || []);
          setGroups(groupsData);
        }
      } catch (groupsError) {
        console.log('Groups not available for filtering');
        setGroups([]);
      }

      // Build query parameters for matches
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.group_id) params.append('group_id', filters.group_id);
      if (filters.date_range && filters.date_range.length === 2) {
        params.append('date_from', filters.date_range[0].format('YYYY-MM-DD'));
        params.append('date_to', filters.date_range[1].format('YYYY-MM-DD'));
      }
      params.append('limit', '100'); // Get more matches for client view

      // Fetch matches data - try tournament-specific endpoint first
      let matchesResponse;
      try {
        const url = `/api/tournaments/${tournamentId}/matches?${params.toString()}`;
        matchesResponse = await axios.get(url);
      } catch (tournamentMatchesError) {
        // Fallback to general matches endpoint
        matchesResponse = await axios.get(`/api/matches?${params.toString()}`);
      }

      if (matchesResponse.data.success) {
        const matchesData = matchesResponse.data.data;
        let matchesList = Array.isArray(matchesData) ? matchesData : (matchesData.matches || []);
        
        // Filter by search term if provided
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          matchesList = matchesList.filter(match => 
            getDisplayTeamName(match.team1_name)?.toLowerCase().includes(searchTerm) ||
            getDisplayTeamName(match.team2_name)?.toLowerCase().includes(searchTerm) ||
            match.match_number?.toLowerCase().includes(searchTerm) ||
            getDisplayGroupName(match.group_name)?.toLowerCase().includes(searchTerm)
          );
        }

        // Sort matches by match number (A01, B01, C01, A02, B02, C02...)
        matchesList.sort(sortMatchNumbers);

        // Add total order index to each match after sorting
        matchesList.forEach((match, index) => {
          match.totalOrder = index + 1;
        });
        
        setMatches(matchesList);
        
        // Calculate statistics
        const totalMatches = matchesList.length;
        const pendingMatches = matchesList.filter(m => m.match_status === 'pending').length;
        const activeMatches = matchesList.filter(m => ['active', 'in_progress'].includes(m.match_status)).length;
        const completedMatches = matchesList.filter(m => m.match_status === 'completed').length;
        
        setStats({
          totalMatches,
          pendingMatches,
          activeMatches,
          completedMatches
        });
      }

    } catch (error) {
      console.error('Error fetching matches data:', error);
      setError(t('match:messages.loadingMatches'));
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusTag = (status) => {
    const statusMap = {
      'pending': { color: 'default', text: t('match:status.pending'), icon: <ClockCircleOutlined /> },
      'active': { color: 'processing', text: t('match:status.inProgress'), icon: <PlayCircleOutlined /> },
      'in_progress': { color: 'processing', text: t('match:status.inProgress'), icon: <PlayCircleOutlined /> },
      'completed': { color: 'success', text: t('match:status.completed'), icon: <CheckCircleOutlined /> },
      'cancelled': { color: 'error', text: t('match:status.cancelled'), icon: <ClockCircleOutlined /> }
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status, icon: <ClockCircleOutlined /> };
    return (
      <Tag color={statusInfo.color} icon={statusInfo.icon}>
        {statusInfo.text}
      </Tag>
    );
  };

  const getMatchTypeTag = (type) => {
    const typeMap = {
      'group': { color: 'blue', text: t('match:types.groupStage') },
      'knockout': { color: 'purple', text: t('match:types.knockout') },
      'friendly': { color: 'green', text: t('match:types.friendly') }
    };
    
    const typeInfo = typeMap[type] || { color: 'default', text: type };
    return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: undefined,
      type: undefined,
      group_id: undefined,
      date_range: null,
      search: ''
    });
  };

  // Custom sorting function for match numbers with proper tournament progression
  const sortMatchNumbers = (a, b) => {
    const aNumber = a.match_number || "";
    const bNumber = b.match_number || "";
    const aType = a.match_type || "";
    const bType = b.match_type || "";

    if (!aNumber || !bNumber) return 0;

    // First, separate by match type: group matches come before knockout matches
    if (aType !== bType) {
      if (aType === 'group' && bType === 'knockout') return -1;
      if (aType === 'knockout' && bType === 'group') return 1;
      // For other types, use alphabetical order
      return aType.localeCompare(bType);
    }

    // For group matches, use the original logic
    if (aType === 'group') {
      // Extract group letter and number (e.g., "A01" -> "A" and "01")
      const aLetter = aNumber.charAt(0);
      const bLetter = bNumber.charAt(0);
      const aNum = parseInt(aNumber.slice(1)) || 0;
      const bNum = parseInt(bNumber.slice(1)) || 0;

      // First sort by number (01, 02, 03...)
      if (aNum !== bNum) {
        return aNum - bNum;
      }

      // Then sort by group letter (A, B, C, D...)
      return aLetter.localeCompare(bLetter);
    }

    // For knockout matches, sort by tournament progression
    if (aType === 'knockout') {
      const getKnockoutOrder = (matchNumber) => {
        const num = matchNumber.toUpperCase();
        // Quarterfinals (QU01, QU02, QU03, QU04)
        if (num.startsWith('QU')) return 1000 + parseInt(num.slice(2));
        // Round of 16 (R16_01, R16_02, etc.)
        if (num.startsWith('R16')) return 900 + parseInt(num.slice(4));
        // Round of 32 (R32_01, R32_02, etc.)
        if (num.startsWith('R32')) return 800 + parseInt(num.slice(4));
        // Semifinals (SE01, SE02, etc.)
        if (num.startsWith('SE')) return 2000 + parseInt(num.slice(2));
        // Third place playoff (TP01, 3RD01, etc.) - should come after semifinals but before finals
        if (num.startsWith('TP')) return 2500 + parseInt(num.slice(2));
        if (num.startsWith('3RD')) return 2500 + parseInt(num.slice(3));
        // Finals (FI01, etc.)
        if (num.startsWith('FI')) return 3000 + parseInt(num.slice(2));
        // Other knockout matches - extract number for sorting
        const numPart = num.match(/\d+/);
        return numPart ? parseInt(numPart[0]) : 0;
      };

      return getKnockoutOrder(aNumber) - getKnockoutOrder(bNumber);
    }

    // Fallback: alphabetical sorting
    return aNumber.localeCompare(bNumber);
  };

  // Table columns
  const columns = [
    {
      title: t('match:match.totalOrder'),
      dataIndex: 'totalOrder',
      key: 'totalOrder',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.totalOrder || 0) - (b.totalOrder || 0),
      sortDirections: ['ascend', 'descend'],
      render: (totalOrder) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '16px' }}>
          {totalOrder}
        </span>
      ),
    },
    {
      title: t('match:match.number'),
      dataIndex: 'match_number',
      key: 'match_number',
      width: 100,
      sorter: (a, b) => sortMatchNumbers(a, b),
      sortDirections: ['ascend', 'descend'],
      defaultSortOrder: 'ascend',
      render: (number, record) => (
        <Button
          type="link"
          style={{ padding: 0, height: "auto", fontWeight: "bold" }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {number}
        </Button>
      ),
    },
    {
      title: t('match:match.teams'),
      key: 'teams',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                backgroundColor: record.team1_color || '#1890ff',
                borderRadius: '50%'
              }}
            />
            <Text strong>{getTeamDisplayNameWithReference(record, 'team1')}</Text>
            <Text type="secondary">vs</Text>
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                backgroundColor: record.team2_color || '#52c41a',
                borderRadius: '50%'
              }}
            />
            <Text strong>{getTeamDisplayNameWithReference(record, 'team2')}</Text>
          </Space>
          {record.match_status === 'completed' && (
            <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              {record.team1_score || 0} - {record.team2_score || 0}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('match:match.time'),
      dataIndex: 'match_date',
      key: 'match_date',
      width: 150,
      sorter: (a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return moment(a.match_date).valueOf() - moment(b.match_date).valueOf();
      },
      sortDirections: ['ascend', 'descend'],
      render: (date) => (
        <Space direction="vertical" size="small">
          <Text>{date ? moment(date).format('MM/DD') : '-'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {date ? moment(date).format('HH:mm') : '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: t('match:match.type'),
      dataIndex: 'match_type',
      key: 'match_type',
      width: 100,
      align: 'center',
      sorter: (a, b) => {
        const aType = a.match_type || "";
        const bType = b.match_type || "";
        return aType.localeCompare(bType);
      },
      sortDirections: ['ascend', 'descend'],
      render: (type) => getMatchTypeTag(type),
    },
    {
      title: t('group:group.name'),
      dataIndex: 'group_name',
      key: 'group_name',
      width: 120,
      sorter: (a, b) => {
        const aGroup = getDisplayGroupName(a.group_name) || "";
        const bGroup = getDisplayGroupName(b.group_name) || "";
        return aGroup.localeCompare(bGroup);
      },
      sortDirections: ['ascend', 'descend'],
      render: (groupName) => groupName ? (
        <Tag color="cyan">{getDisplayGroupName(groupName)}</Tag>
      ) : (
        <Text type="secondary">-</Text>
      ),
    },
    {
      title: t('match:match.status'),
      dataIndex: 'match_status',
      key: 'match_status',
      width: 120,
      align: 'center',
      sorter: (a, b) => {
        const statusOrder = { 
          pending: 1, 
          active: 2, 
          in_progress: 2, 
          completed: 3, 
          cancelled: 4 
        };
        const aOrder = statusOrder[a.match_status] || 0;
        const bOrder = statusOrder[b.match_status] || 0;
        return aOrder - bOrder;
      },
      sortDirections: ['ascend', 'descend'],
      render: (status) => getMatchStatusTag(status),
    },
    {
      title: t('common:actions.actions'),
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {t('common:actions.viewDetails')}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>{t('match:messages.loadingMatches')}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message={t('common:messages.loadFailed')}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchMatchesData}>
              {t('common:actions.reload')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Tournament Header */}
      {tournament && (
        <Card style={{ marginBottom: 24 }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space direction="vertical" size="small">
                <Title level={2} style={{ margin: 0 }}>
                  <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
                  {tournament.tournament_name}
                </Title>
                <Text type="secondary">{t('match:match.list')}</Text>
              </Space>
            </Col>
            <Col>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {tournament.status === 'active' ? t('common:status.inProgress') : tournament.status}
              </Tag>
            </Col>
          </Row>
        </Card>
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('common:stats.totalMatches')}
              value={stats.totalMatches}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('match:stats.pendingMatches')}
              value={stats.pendingMatches}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('match:stats.activeMatches')}
              value={stats.activeMatches}
              prefix={<PlayCircleOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title={t('common:stats.completedMatches')}
              value={stats.completedMatches}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={4}>
            <Text strong>
              <FilterOutlined style={{ marginRight: 8 }} />
              {t('common:filters.title')}
            </Text>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('match:placeholders.selectStatus')}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="pending">{t('match:status.pending')}</Option>
              <Option value="active">{t('match:status.inProgress')}</Option>
              <Option value="completed">{t('match:status.completed')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('match:placeholders.selectType')}
              value={filters.type}
              onChange={(value) => handleFilterChange('type', value)}
              style={{ width: '100%' }}
              allowClear
            >
              <Option value="group">{t('match:types.groupStage')}</Option>
              <Option value="knockout">{t('match:types.knockout')}</Option>
              <Option value="friendly">{t('match:types.friendly')}</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('group:placeholders.selectGroup')}
              value={filters.group_id}
              onChange={(value) => handleFilterChange('group_id', value)}
              style={{ width: '100%' }}
              allowClear
            >
              {groups.map(group => (
                <Option key={group.group_id} value={group.group_id}>
                  {getDisplayGroupName(group.group_name)}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Input
              placeholder={t('match:placeholders.searchMatch')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button onClick={clearFilters}>
              {t('common:actions.clearFilters')}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Matches Table */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>
            <PlayCircleOutlined style={{ marginRight: 8 }} />
            {t('match:match.list')}
          </Title>
        </div>
        
        <Table
          columns={columns}
          dataSource={matches}
          rowKey="match_id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              t('match:pagination.showTotal', { 
                start: range[0], 
                end: range[1], 
                total: total,
                defaultValue: `第 ${range[0]}-${range[1]} 項，共 ${total} 場比賽`
              }),
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 20
          }}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <CalendarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">{t('match:messages.noMatches')}</Text>
                </div>
              </div>
            )
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default ClientMatchList;