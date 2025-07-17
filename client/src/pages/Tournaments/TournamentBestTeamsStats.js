import React, { useState, useEffect } from 'react';
import { 
  Card, 
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
  Radio,
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
  SearchOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;

const TournamentBestTeamsStats = () => {
  const { t } = useTranslation(['stats', 'common', 'tournament']);
  const navigate = useNavigate();
  const { id: tournamentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [bestTeamsData, setBestTeamsData] = useState(null);
  const [availableMatches, setAvailableMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [savingToCache, setSavingToCache] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [isShowingSavedStats, setIsShowingSavedStats] = useState(false);
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
      message.error(t('messages.loadingStats', { ns: 'stats' }));
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
      message.error(t('messages.noData', { ns: 'stats' }));
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
        setIsShowingSavedStats(false); // Mark as newly calculated, not saved
        
        // Calculate statistics only - do not save to database automatically
        console.log('📊 Stats calculated but not saved to database');
        
        message.success(t('actions.calculatedNotSaved', { ns: 'stats' }));
      }
    } catch (error) {
      console.error('獲取最佳球隊統計失敗:', error);
      message.error(t('messages.loadingStats', { ns: 'stats' }));
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

  // Save stats to cache for public display
  const saveToPublicCache = async () => {
    if (!bestTeamsData) {
      message.warning(t('messages.calculateFirst', { ns: 'stats' }));
      return;
    }

    setSavingToCache(true);
    try {
      const response = await axios.post('/api/stats/best-teams-cache', {
        stats_data: bestTeamsData,
        tournament_id: tournamentId,
        is_public: true // Always save as public when explicitly saving
      });

      if (response.data.success) {
        message.success(`${t('actions.savedToCache', { ns: 'stats' })} ${t('visibility.public', { ns: 'stats' })}`);
        // Refresh the current saved stats display
        fetchCurrentSavedStats();
        setIsShowingSavedStats(true);
        // Update visibility status since we saved as public
        setIsPublic(true);
      }
    } catch (error) {
      console.error('保存到緩存失敗:', error);
      message.error(t('messages.saveFailed', { ns: 'stats' }) + ': ' + (error.response?.data?.message || error.message));
    } finally {
      setSavingToCache(false);
    }
  };

  // Toggle visibility of cached stats
  const toggleVisibility = async () => {
    if (!bestTeamsData) {
      message.warning(t('messages.calculateFirst', { ns: 'stats' }));
      return;
    }

    setVisibilityLoading(true);
    try {
      const newVisibility = !isPublic;
      
      // If changing to public, first save/update the current data to the database
      if (newVisibility) {
        console.log('📤 Uploading current data to database before making public...');
        
        // Save the current bestTeamsData to the cache
        const saveResponse = await axios.post('/api/stats/best-teams-cache', {
          stats_data: bestTeamsData,
          tournament_id: tournamentId,
          is_public: true // Set as public when saving
        });

        if (!saveResponse.data.success) {
          throw new Error(saveResponse.data.message || 'Failed to save data to database');
        }
        
        console.log('✅ Data successfully uploaded to database');
      }
      
      // Then toggle the visibility
      const response = await axios.patch('/api/stats/best-teams-visibility', {
        tournament_id: tournamentId,
        is_public: newVisibility
      });

      if (response.data.success) {
        setIsPublic(newVisibility);
        setIsShowingSavedStats(true); // Mark as saved since we just saved it
        
        // Use translated message instead of server message
        const tournamentName = tournament?.tournament_name || t('tournament.tournament', { ns: 'tournament' });
        const statusText = newVisibility ? t('visibility.public', { ns: 'stats' }) : t('visibility.hidden', { ns: 'stats' });
        
        let successMessage;
        if (newVisibility) {
          successMessage = t('actions.dataUploadedAndMadePublic', { 
            ns: 'stats', 
            tournament: tournamentName 
          }) || `${tournamentName} data uploaded and made ${statusText}`;
        } else {
          successMessage = t('actions.visibilityChanged', { 
            ns: 'stats', 
            tournament: tournamentName, 
            status: statusText 
          });
        }
        
        message.success(successMessage);
        
        // Refresh the current saved stats display to show the updated data
        if (newVisibility) {
          fetchCurrentSavedStats();
        }
      }
    } catch (error) {
      console.error('切換可見性失敗:', error);
      message.error(t('messages.toggleFailed', { ns: 'stats' }) + ': ' + (error.response?.data?.message || error.message));
    } finally {
      setVisibilityLoading(false);
    }
  };

  // Fetch current visibility status
  const fetchVisibilityStatus = async () => {
    try {
      const response = await axios.get('/api/stats/best-teams-status', {
        params: { tournament_id: tournamentId }
      });

      if (response.data.success && response.data.data.length > 0) {
        setIsPublic(response.data.data[0].is_public === 1);
      }
    } catch (error) {
      console.error('獲取可見性狀態失敗:', error);
    }
  };

  // Fetch current saved stats from database
  const fetchCurrentSavedStats = async () => {
    try {
      console.log('🔍 Fetching current saved stats for tournament:', tournamentId);
      
      const response = await axios.get('/api/stats/best-teams-public', {
        params: { tournament_id: tournamentId }
      });

      if (response.data.success && response.data.data) {
        console.log('✅ Found saved stats, displaying them');
        setBestTeamsData(response.data.data);
        setIsShowingSavedStats(true);
      } else {
        console.log('📊 No saved stats found for this tournament');
        setBestTeamsData(null);
        setIsShowingSavedStats(false);
      }
    } catch (error) {
      console.error('獲取當前保存的統計失敗:', error);
      // Don't show error message for this, as it's normal to not have saved stats
      setBestTeamsData(null);
    }
  };

  // Fetch visibility status and current stats when component mounts
  useEffect(() => {
    if (tournamentId) {
      fetchVisibilityStatus();
      fetchCurrentSavedStats();
    }
  }, [tournamentId]);

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
    { value: 'round_of_32', label: t('knockout.round32', { ns: 'tournament' }) },
    { value: 'round_of_16', label: t('knockout.round16', { ns: 'tournament' }) },
    { value: 'quarter_final', label: t('knockout.quarter', { ns: 'tournament' }) },
    { value: 'quarterfinal', label: t('knockout.quarter', { ns: 'tournament' }) },
    { value: 'quarter-final', label: t('knockout.quarter', { ns: 'tournament' }) },
    { value: 'top8', label: t('knockout.quarter', { ns: 'tournament' }) },
    { value: 'semi_final', label: t('knockout.semi', { ns: 'tournament' }) },
    { value: 'semifinal', label: t('knockout.semi', { ns: 'tournament' }) },
    { value: 'semi-final', label: t('knockout.semi', { ns: 'tournament' }) },
    { value: 'top4', label: t('knockout.semi', { ns: 'tournament' }) },
    { value: 'third_place', label: t('knockout.third', { ns: 'tournament' }) },
    { value: 'third-place', label: t('knockout.third', { ns: 'tournament' }) },
    { value: 'bronze', label: t('knockout.third', { ns: 'tournament' }) },
    { value: 'final', label: t('knockout.final', { ns: 'tournament' }) },
    { value: 'finals', label: t('knockout.final', { ns: 'tournament' }) },
    { value: 'gold', label: t('knockout.final', { ns: 'tournament' }) }
  ];

  const attackTeamsColumns = [
    {
      title: t('rankings.position', { ns: 'stats' }),
      key: 'rank',
      render: (_, record, index) => (
        <div className="text-center">
          <span className={`font-bold ${
            index === 0 ? 'text-lg text-yellow-500' : 
            index === 1 ? 'text-base text-green-500' : 
            index === 2 ? 'text-base text-blue-500' : 
            'text-base text-gray-600'
          }`}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
          </span>
        </div>
      ),
      width: 80,
    },
    {
      title: t('rankings.team', { ns: 'stats' }),
      key: 'team',
      render: (_, record) => (
        <div className="flex items-center">
          <div 
            className="w-4 h-4 mr-2 border border-gray-300 rounded-sm"
            style={{ backgroundColor: record.team_color }}
          />
          <div>
            <div 
              className="font-bold text-blue-500 cursor-pointer underline hover:text-blue-700"
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <div className="text-xs text-gray-500">
              {record.group_name ? `${t('group.group', { ns: 'group' })} ${getDisplayGroupName(record.group_name)}` : t('messages.noGroup', { ns: 'stats' })}
            </div>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: t('metrics.matchesPlayed', { ns: 'stats' }),
      dataIndex: 'matches_played',
      key: 'matches_played',
      width: 100,
      align: 'center',
    },
    {
      title: t('metrics.totalGoalsFor', { ns: 'stats' }),
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 100,
      align: 'center',
      render: (goals) => <span className="font-bold text-green-500">{goals}</span>
    },
    {
      title: t('metrics.averageGoalsFor', { ns: 'stats' }),
      dataIndex: 'avg_goals_for',
      key: 'avg_goals_for',
      width: 100,
      align: 'center',
      render: (avg) => <span className="font-bold">{avg}</span>
    },
    {
      title: t('rankings.goalsAgainst', { ns: 'stats' }),
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 80,
      align: 'center',
    },
  ];

  const defenseTeamsColumns = [
    {
      title: t('rankings.position', { ns: 'stats' }),
      key: 'rank',
      render: (_, record, index) => (
        <div className="text-center">
          <span className={`font-bold ${
            index === 0 ? 'text-lg text-yellow-500' : 
            index === 1 ? 'text-base text-green-500' : 
            index === 2 ? 'text-base text-blue-500' : 
            'text-base text-gray-600'
          }`}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
          </span>
        </div>
      ),
      width: 80,
    },
    {
      title: t('rankings.team', { ns: 'stats' }),
      key: 'team',
      render: (_, record) => (
        <div className="flex items-center">
          <div 
            className="w-4 h-4 mr-2 border border-gray-300 rounded-sm"
            style={{ backgroundColor: record.team_color }}
          />
          <div>
            <div 
              className="font-bold text-blue-500 cursor-pointer underline hover:text-blue-700"
              onClick={() => navigate(`/tournaments/${tournamentId}/teams/${record.team_id}`)}
            >
              {getDisplayTeamName(record.team_name)}
            </div>
            <div className="text-xs text-gray-500">
              {record.group_name ? `${t('group.group', { ns: 'group' })} ${getDisplayGroupName(record.group_name)}` : t('messages.noGroup', { ns: 'stats' })}
            </div>
          </div>
        </div>
      ),
      width: 200,
    },
    {
      title: t('metrics.matchesPlayed', { ns: 'stats' }),
      dataIndex: 'matches_played',
      key: 'matches_played',
      width: 100,
      align: 'center',
    },
    {
      title: t('metrics.totalGoalsAgainst', { ns: 'stats' }),
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 100,
      align: 'center',
      render: (goals) => <span className="font-bold text-red-500">{goals}</span>
    },
    {
      title: t('metrics.averageGoalsAgainst', { ns: 'stats' }),
      dataIndex: 'avg_goals_against',
      key: 'avg_goals_against',
      width: 100,
      align: 'center',
      render: (avg) => <span className="font-bold">{avg}</span>
    },
    {
      title: t('rankings.goalsFor', { ns: 'stats' }),
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 80,
      align: 'center',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            <BarChartOutlined /> {tournament?.tournament_name || t('tournament.tournament', { ns: 'tournament' })} - {t('stats.bestTeams', { ns: 'stats' })}
          </h2>
          {bestTeamsData && (
            <div className="flex items-center space-x-2">
              {isShowingSavedStats ? (
                <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full border border-green-200">
                  📊 {t('stats.showingSavedStats', { ns: 'stats' })} {isPublic ? `(${t('visibility.public', { ns: 'stats' })})` : `(${t('visibility.hidden', { ns: 'stats' })})`}
                </span>
              ) : (
                <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full border border-yellow-200">
                  ⚡ {t('stats.showingCalculatedStats', { ns: 'stats' })}
                </span>
              )}
            </div>
          )}
        </div>
        <Space>
          <Button onClick={resetFilters}>
            {t('buttons.reset', { ns: 'common' })}
          </Button>
          <Space>
            <Button 
              type="primary"
              icon={<SearchOutlined />} 
              onClick={fetchBestTeamsStats}
              loading={loading}
            >
              {t('buttons.calculate', { ns: 'stats' })}
            </Button>
            
            {bestTeamsData && (
              <>
                <Button 
                  type="default" 
                  icon={<SaveOutlined />}
                  onClick={saveToPublicCache}
                  loading={savingToCache}
                >
                  {t('buttons.saveToPublic', { ns: 'stats' })}
                </Button>
                
                <Button 
                  type={isPublic ? "default" : "primary"} 
                  icon={isPublic ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={toggleVisibility}
                  loading={visibilityLoading}
                >
                  {isPublic ? t('buttons.changeToHidden', { ns: 'stats' }) : t('buttons.changeToPublic', { ns: 'stats' })}
                </Button>
                
              </>
            )}
          </Space>
        </Space>
      </div>

      {/* Filters */}
      <Card title={<><FilterOutlined /> {t('filters.title', { ns: 'stats' })}</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={selectedMatchType === 'knockout' ? 12 : 8}>
            <div>
              <div className="font-semibold">{t('filters.matchType', { ns: 'stats' })} <span className="text-red-500">*</span></div>
              <Select
                className="w-full mt-1"
                placeholder={t('filters.selectMatchType', { ns: 'stats' })}
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
                <Option value="group">{t('match.groupStage', { ns: 'tournament' })}</Option>
                <Option value="knockout">{t('match.knockout', { ns: 'tournament' })}</Option>
                <Option value="mixed">{t('match.mixed', { ns: 'tournament' })}</Option>
              </Select>
            </div>
          </Col>
          {(selectedMatchType === 'group' || selectedMatchType === 'mixed') && (
            <Col xs={24} sm={12} md={8}>
              <div>
                <div className="font-semibold">{t('group.group', { ns: 'group' })} ({selectedGroups.length} {t('filters.selected', { ns: 'stats' })})</div>
                <div className="mt-2 border border-gray-300 rounded-md p-2 max-h-30 overflow-y-auto bg-gray-50">
                  <div className="mb-2">
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
                      <span className="font-semibold">{t('buttons.selectAll', { ns: 'common' })}</span>
                    </Checkbox>
                  </div>
                  {Array.isArray(groups) && groups.map(group => (
                    <div key={group.group_id} className="mb-1">
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
                    <div className="text-xs text-gray-500">
                      {t('messages.noGroups', { ns: 'stats' })}
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
          {(selectedMatchType === 'knockout' || selectedMatchType === 'mixed') && (
            <Col xs={24} sm={12} md={8}>
              <div>
                <div className="font-semibold">{t('filters.knockoutRounds', { ns: 'stats' })} ({selectedKnockoutRounds.length} {t('filters.selected', { ns: 'stats' })})</div>
                <div className="mt-2 border border-gray-300 rounded-md p-2 max-h-30 overflow-y-auto bg-gray-50">
                  <Radio.Group
                    value={selectedKnockoutRounds.length > 0 ? selectedKnockoutRounds[0] : undefined}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedKnockoutRounds([e.target.value]);
                      } else {
                        setSelectedKnockoutRounds([]);
                      }
                    }}
                    className="w-full"
                  >
                    <div className="mb-2">
                      <Radio value={undefined}>
                        <span className="font-semibold">{t('filters.allRounds', { ns: 'stats' })}</span>
                      </Radio>
                    </div>
                    {availableKnockoutRounds.length === 0 && (
                      <div className="text-xs text-gray-500">
                        {t('messages.noKnockoutRounds', { ns: 'stats' })}
                      </div>
                    )}
                    {availableKnockoutRounds.map(round => (
                      <div key={round.value} className="mb-1">
                        <Radio value={round.value}>
                          <span>{round.label}</span>
                          <span className="text-xs text-gray-400 ml-1">
                            ({t('filters.includeSubsequent', { ns: 'stats' })})
                          </span>
                        </Radio>
                      </div>
                    ))}
                  </Radio.Group>
                </div>
              </div>
            </Col>
          )}
          <Col xs={24} sm={12} md={
            selectedMatchType === 'knockout' ? 4 : 
            selectedMatchType === 'mixed' ? 4 : 8
          }>
            <div>
              <div className="font-semibold">{t('filters.dateRange', { ns: 'stats' })}</div>
              <RangePicker
                className="w-full mt-1"
                value={selectedDateRange}
                onChange={setSelectedDateRange}
              />
            </div>
          </Col>
        </Row>
        
        <Divider />
        
        <div>
          <div className="mb-3 flex justify-between items-center">
            <div className="font-semibold">{t('filters.selectSpecificMatches', { ns: 'stats' })} ({selectedMatches.length}/{availableMatches.length})</div>
            <Checkbox
              checked={selectAllMatches}
              onChange={(e) => handleSelectAllMatches(e.target.checked)}
            >
              {t('buttons.selectAll', { ns: 'common' })}
            </Checkbox>
          </div>
          
          {matchesLoading ? (
            <Spin />
          ) : (
            <div className="border border-gray-300 rounded-md p-2 max-h-50 overflow-y-auto bg-gray-50">
              {availableMatches.length === 0 && (
                <div className="text-xs text-gray-500">
                  {t('messages.noMatchesFound', { ns: 'stats' })}
                </div>
              )}
              {Array.isArray(availableMatches) && availableMatches.map(match => (
                <div key={match.match_id} className="mb-1">
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
                    <div className="text-xs">
                      <div className="font-bold">
                        {moment(match.match_date).format('MM/DD HH:mm')} - {match.match_type === 'group' ? t('match.groupStage', { ns: 'tournament' }) : t('match.knockout', { ns: 'tournament' })}
                        {match.match_number && (
                          <span className="ml-2 text-blue-500">
                            🏟️ {match.match_number}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600">
                        {getDisplayTeamName(match.team1_name)} vs {getDisplayTeamName(match.team2_name)} 
                        <span className="ml-2 font-bold">
                          ({match.team1_score || 0}-{match.team2_score || 0})
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs flex gap-3">
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
            <div className="mt-2">
              <div className="text-xs text-gray-500">
                {t('messages.totalCompletedMatches', { ns: 'stats', count: availableMatches.length })}
              </div>
            </div>
          )}
        </div>
      </Card>


      {/* Results */}
      {bestTeamsData && (
        <>
          {/* Summary */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('metrics.analyzedMatches', { ns: 'stats' })}
                  value={bestTeamsData.summary.total_matches_analyzed}
                  prefix={<BarChartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('metrics.analyzedTeams', { ns: 'stats' })}
                  value={bestTeamsData.summary.teams_analyzed}
                  prefix={<TrophyOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="bg-green-50">
                <Statistic
                  title={t('stats.bestAttackTeam', { ns: 'stats' })}
                  value={getDisplayTeamName(bestTeamsData.best_attack_team?.team_name)}
                  suffix={`${bestTeamsData.best_attack_team?.goals_for || 0} ${t('metrics.goals', { ns: 'stats' })}`}
                  prefix={<FireOutlined className="text-green-500" />}
                  valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="bg-blue-50">
                <Statistic
                  title={t('stats.bestDefenseTeam', { ns: 'stats' })}
                  value={getDisplayTeamName(bestTeamsData.best_defense_team?.team_name)}
                  suffix={`${t('metrics.conceded', { ns: 'stats' })} ${bestTeamsData.best_defense_team?.goals_against || 0} ${t('metrics.goals', { ns: 'stats' })}`}
                  prefix={<SafetyOutlined className="text-blue-500" />}
                  valueStyle={{ color: '#1890ff', fontSize: '16px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Top Attack Teams */}
          <Card 
            title={<><FireOutlined className="text-green-500" /> {t('stats.bestAttackTeamsRanking', { ns: 'stats' })}</>} 
            className="mb-6"
          >
            <Table
              columns={attackTeamsColumns}
              dataSource={bestTeamsData.top_attack_teams}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('messages.noData', { ns: 'stats' }) }}
            />
          </Card>

          {/* Top Defense Teams */}
          <Card 
            title={<><SafetyOutlined className="text-blue-500" /> {t('stats.bestDefenseTeamsRanking', { ns: 'stats' })}</>}
            className="mb-6"
          >
            <Table
              columns={defenseTeamsColumns}
              dataSource={bestTeamsData.top_defense_teams}
              rowKey="team_id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('messages.noData', { ns: 'stats' }) }}
            />
          </Card>

          {/* Applied Filters Summary */}
          <Card title={t('filters.summary', { ns: 'stats' })} size="small">
            <div className="text-xs text-gray-600">
              <p><strong>{t('tournament', { ns: 'tournament' })}：</strong> {tournament?.tournament_name || t('common.unknown', { ns: 'common' })}</p>
              {bestTeamsData.summary.filters_applied.group_id && (
                <p><strong>{t('group.group', { ns: 'group' })}：</strong> {
                  (() => {
                    if (!Array.isArray(groups)) return t('common.unknown', { ns: 'common' });
                    const groupIds = bestTeamsData.summary.filters_applied.group_id.split(',');
                    const groupNames = groupIds.map(id => {
                      const group = groups.find(g => g.group_id == id);
                      return group ? getDisplayGroupName(group.group_name) : `${t('common.unknown', { ns: 'common' })}(${id})`;
                    });
                    return groupNames.join(', ');
                  })()
                }</p>
              )}
              {bestTeamsData.summary.filters_applied.tournament_stage && (
                <p><strong>{t('filters.knockoutRounds', { ns: 'stats' })}：</strong> {
                  (() => {
                    const stageIds = bestTeamsData.summary.filters_applied.tournament_stage.split(',');
                    const stageNames = stageIds.map(id => 
                      availableKnockoutRounds.find(r => r.value === id)?.label || 
                      knockoutRounds.find(r => r.value === id)?.label || 
                      `${t('common.unknown', { ns: 'common' })}(${id})`
                    );
                    return stageNames.join(', ');
                  })()
                }</p>
              )}
              {bestTeamsData.summary.filters_applied.match_type && (
                <p><strong>{t('filters.matchType', { ns: 'stats' })}：</strong> {
                  bestTeamsData.summary.filters_applied.match_type === 'group' ? t('match.groupStage', { ns: 'tournament' }) : 
                  bestTeamsData.summary.filters_applied.match_type === 'knockout' ? t('match.knockout', { ns: 'tournament' }) : 
                  bestTeamsData.summary.filters_applied.match_type === 'mixed' ? t('match.mixed', { ns: 'tournament' }) : 
                  bestTeamsData.summary.filters_applied.match_type
                }</p>
              )}
              {bestTeamsData.summary.filters_applied.date_range && (
                <p><strong>{t('filters.dateRange', { ns: 'stats' })}：</strong> {bestTeamsData.summary.filters_applied.date_range}</p>
              )}
              {bestTeamsData.summary.filters_applied.specific_matches && (
                <p><strong>{t('filters.specificMatches', { ns: 'stats' })}：</strong> {bestTeamsData.summary.filters_applied.specific_matches} {t('filters.matches', { ns: 'stats' })}</p>
              )}
              <p><strong>{t('stats.explanation', { ns: 'stats' })}：</strong> {t('stats.explanationText', { ns: 'stats' })}</p>
            </div>
          </Card>
        </>
      )}

      {!bestTeamsData && (
        <Card>
          <Alert
            message={selectedMatchType ? t('messages.clickCalculate', { ns: 'stats' }) : t('messages.selectMatchTypeFirst', { ns: 'stats' })}
            description={
              selectedMatchType 
                ? t('messages.analyzeDescription', { 
                    ns: 'stats',
                    tournament: tournament?.tournament_name || t('tournament.thisTournament', { ns: 'tournament' }),
                    matchType: selectedMatchType === 'group' ? t('match.groupStage', { ns: 'tournament' }) : 
                              selectedMatchType === 'knockout' ? t('match.knockout', { ns: 'tournament' }) : 
                              t('match.allMatches', { ns: 'tournament' })
                  })
                : t('messages.selectMatchTypeInstructions', { ns: 'stats' })
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