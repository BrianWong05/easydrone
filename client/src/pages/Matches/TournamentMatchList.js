import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Space,
  Table,
  Tag,
  Select,
  DatePicker,
  Input,
  message,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Modal,
  InputNumber,
  Form,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;

const TournamentMatchList = () => {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['match', 'common']);

  // 清理隊伍名稱顯示（移除 _{tournament_id} 後綴）
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return '';
    // 檢查是否以 _{tournamentId} 結尾，如果是則移除
    const suffix = `_${tournamentId}`;
    if (teamName.endsWith(suffix)) {
      return teamName.slice(0, -suffix.length);
    }
    return teamName;
  };

  const [allMatches, setAllMatches] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [groups, setGroups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [dateRange, setDateRange] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [batchPostponeLoading, setBatchPostponeLoading] = useState(false);
  const [postponeModalVisible, setPostponeModalVisible] = useState(false);
  const [postponeForm] = Form.useForm();

  useEffect(() => {
    fetchTournament();
    fetchAllMatches();
    fetchGroups();
    fetchTeams();
  }, [tournamentId]);

  useEffect(() => {
    if (allMatches.length > 0) {
      applyFiltersAndPagination();
    }
  }, [
    allMatches,
    filterStatus,
    filterType,
    filterGroup,
    filterTeam,
    dateRange,
    searchText,
    pagination.current,
    pagination.pageSize,
  ]);

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

  const fetchAllMatches = async () => {
    try {
      setLoading(true);
      // Fetch all matches without pagination
      const params = new URLSearchParams({
        limit: "1000", // Large number to get all matches
        _t: Date.now(), // Add timestamp to prevent caching
        _refresh: Math.random(), // Additional cache buster
      });

      console.log("🔍 Fetching all matches for tournament:", tournamentId);

      const response = await axios.get(`/api/tournaments/${tournamentId}/matches?${params}`);
      console.log("🔍 All Matches API Response:", response.data);

      if (response.data.success) {
        const matchesData = response.data.data?.matches || [];
        console.log("🔍 Setting matches data:", matchesData.length, "matches");
        setAllMatches(matchesData);
        console.log("✅ Fetched all matches:", matchesData.length);
      } else {
        message.error(t('match:messages.loadingMatches'));
      }
    } catch (error) {
      console.error("❌ Error fetching all matches:", error);
      console.error("❌ Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      if (error.response?.status === 404) {
        message.error(t('match:messages.tournamentNotFound'));
      } else if (error.response?.status >= 500) {
        message.error(t('common:messages.error'));
      } else if (error.code === "NETWORK_ERROR" || !error.response) {
        message.error(t('common:messages.networkError'));
      } else {
        message.error(`${t('match:messages.loadingMatches')}: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndPagination = () => {
    let filteredMatches = [...allMatches];

    // Apply filters
    if (filterStatus !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.match_status === filterStatus);
    }
    if (filterType !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.match_type === filterType);
    }
    if (filterGroup !== "all") {
      filteredMatches = filteredMatches.filter((match) => match.group_id === parseInt(filterGroup));
    }
    if (filterTeam !== "all") {
      filteredMatches = filteredMatches.filter(
        (match) => match.team1_id === parseInt(filterTeam) || match.team2_id === parseInt(filterTeam),
      );
    }
    if (dateRange.length === 2) {
      const startDate = dateRange[0].startOf("day");
      const endDate = dateRange[1].endOf("day");
      filteredMatches = filteredMatches.filter((match) => {
        const matchDate = moment(match.match_date);
        return matchDate.isBetween(startDate, endDate, null, "[]");
      });
    }
    if (searchText) {
      filteredMatches = filteredMatches.filter((match) =>
        match.match_number?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply default sorting by match number (A01, B01, C01, D01, A02, B02, C02, D02...)
    filteredMatches.sort(sortMatchNumbers);

    // Add total order index to each match after sorting
    filteredMatches.forEach((match, index) => {
      match.totalOrder = index + 1;
    });

    // Update pagination total
    setPagination((prev) => ({
      ...prev,
      total: filteredMatches.length,
    }));

    // Apply pagination AFTER sorting
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

    setMatches(paginatedMatches);
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
    }
  };

  const handleDelete = async (matchId) => {
    try {
      console.log('🗑️ Deleting match:', matchId);
      console.log('🗑️ Current matches count before delete:', allMatches.length);
      
      await axios.delete(`/api/matches/${matchId}`);
      message.success(t('match:messages.matchDeleted'));
      
      // Immediately remove the deleted match from local state for instant UI update
      setAllMatches(prevMatches => {
        const filteredMatches = prevMatches.filter(match => match.match_id !== matchId);
        console.log('🗑️ Matches count after local filter:', filteredMatches.length);
        return filteredMatches;
      });
      
      // Clear selected rows if the deleted match was selected
      setSelectedRowKeys(prevKeys => prevKeys.filter(key => key !== matchId));
      
      // Force immediate refresh from server to ensure data consistency
      console.log('🔄 Immediately refreshing matches from server...');
      await fetchAllMatches();
      
    } catch (error) {
      console.error("Error deleting match:", error);
      const errorMessage = error.response?.data?.message || t('common:messages.operationFailed');
      message.error(errorMessage);
      
      // If delete failed, refresh to restore correct state
      console.log('❌ Delete failed, refreshing to restore correct state...');
      await fetchAllMatches();
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('match:list.selectMatchesToDelete'));
      return;
    }

    try {
      setBatchDeleteLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const matchId of selectedRowKeys) {
        try {
          await axios.delete(`/api/matches/${matchId}`);
          successCount++;
        } catch (error) {
          console.error(`Error deleting match ${matchId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        message.success(t('match:list.batchDeleteSuccess', { 
          successCount, 
          errorCount: errorCount > 0 ? `, ${errorCount} ${t('match:list.failed')}` : "" 
        }));
        
        // Immediately remove deleted matches from local state for instant UI update
        setAllMatches(prevMatches => {
          const filteredMatches = prevMatches.filter(match => !selectedRowKeys.includes(match.match_id));
          console.log('🗑️ Batch delete - matches count after local filter:', filteredMatches.length);
          return filteredMatches;
        });
        
        setSelectedRowKeys([]);
        
        // Force immediate refresh from server to ensure data consistency
        console.log('🔄 Batch delete - immediately refreshing matches from server...');
        await fetchAllMatches();
      } else {
        message.error(t('match:list.batchDeleteFailed'));
      }
    } catch (error) {
      console.error("Error in batch delete:", error);
      message.error(t('match:list.batchDeleteFailed'));
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const handleBatchPostpone = async (values) => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('match:list.selectMatchesToPostpone'));
      return;
    }

    try {
      setBatchPostponeLoading(true);
      
      const response = await axios.put('/api/matches/batch-postpone', {
        matchIds: selectedRowKeys,
        delayMinutes: values.delayMinutes || 0
      });

      if (response.data.success) {
        message.success(response.data.message);
        setSelectedRowKeys([]);
        setPostponeModalVisible(false);
        postponeForm.resetFields();
        // Force refresh after postpone
        setTimeout(async () => {
          console.log('🔄 Postpone - refreshing matches from server...');
          await fetchAllMatches();
        }, 500);
      } else {
        message.error(response.data.message || t('match:list.batchPostponeFailed'));
      }
    } catch (error) {
      console.error("Error in batch postpone:", error);
      const errorMessage = error.response?.data?.message || t('match:list.batchPostponeFailed');
      message.error(errorMessage);
    } finally {
      setBatchPostponeLoading(false);
    }
  };

  const showPostponeModal = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('match:list.selectMatchesToPostpone'));
      return;
    }
    setPostponeModalVisible(true);
  };

  const handlePostponeCancel = () => {
    setPostponeModalVisible(false);
    postponeForm.resetFields();
  };


  const handleTableChange = (paginationConfig) => {
    const { current, pageSize } = paginationConfig;
    setPagination((prev) => ({
      ...prev,
      current,
      pageSize,
    }));
  };

  const handleFilterChange = () => {
    setPagination((prev) => ({
      ...prev,
      current: 1, // Reset to first page when filters change
    }));
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

  // 獲取隊伍顯示名稱，如果沒有隊伍則顯示來源比賽的勝者
  const getTeamDisplayName = (record, teamPosition) => {
    const teamName = teamPosition === 'team1' ? record.team1_name : record.team2_name;
    
    if (teamName) {
      return getDisplayTeamName(teamName);
    }
    
    // 如果沒有隊伍名稱且是淘汰賽，動態生成來源比賽的勝者顯示
    if (record.match_type === 'knockout' && record.match_number) {
      return getKnockoutWinnerReference(record.match_number, teamPosition);
    }
    
    return t('match:status.pending');
  };

  // 動態生成淘汰賽勝者引用
  const getKnockoutWinnerReference = (matchNumber, teamPosition) => {
    if (!matchNumber) return '待定';
    
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
      const resultType = matchNum === 'TP01' ? t('match:results.loss') : t('match:results.win');
      return `${sourceMatch}${resultType}`;
    }
    
    // 如果是第一輪比賽（沒有來源），返回待定
    if (matchNum.startsWith('QU') || matchNum.startsWith('R16') || matchNum.startsWith('R32')) {
      return t('match:status.pending');
    }
    
    return t('match:status.pending');
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      pending: { color: "default", text: t('match:status.pending') },
      active: { color: "processing", text: t('match:status.active') },
      overtime: { color: "warning", text: t('match:status.overtime') },
      completed: { color: "success", text: t('match:status.completed') },
      postponed: { color: "orange", text: t('match:status.postponed') },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getTypeTag = (type) => {
    const typeConfig = {
      group: { color: "blue", text: t('match:types.groupStage') },
      knockout: { color: "red", text: t('match:types.knockout') },
      friendly: { color: "green", text: t('match:types.friendly') },
    };
    const config = typeConfig[type] || { color: "default", text: type };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: t('match:list.totalOrder'),
      dataIndex: "totalOrder",
      key: "totalOrder",
      width: 80,
      align: "center",
      sorter: (a, b) => (a.totalOrder || 0) - (b.totalOrder || 0),
      sortDirections: ["ascend", "descend"],
      render: (totalOrder) => (
        <span className="font-bold text-blue-500">
          {totalOrder}
        </span>
      ),
    },
    {
      title: t('match:match.matchNumber'),
      dataIndex: "match_number",
      key: "match_number",
      width: 120,
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) => record.match_number?.toLowerCase().includes(value.toLowerCase()),
      sorter: (a, b) => sortMatchNumbers(a, b),
      sortDirections: ["ascend", "descend"],
      defaultSortOrder: "ascend",
      render: (matchNumber, record) => (
        <Button
          type="link"
          className="p-0 h-auto font-normal"
          onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
        >
          {matchNumber}
        </Button>
      ),
    },
    {
      title: t('match:list.teamMatchup'),
      key: "teams",
      width: 300,
      render: (_, record) => (
        <div>
          <div className="flex items-center mb-1">
            <div
              className="w-3 h-3 mr-2 rounded-sm"
              style={{
                backgroundColor: record.team1_color || "#ccc",
              }}
            />
            <span>{getTeamDisplayName(record, 'team1')}</span>
            <span className="mx-2 font-bold">
              {record.team1_score || 0} : {record.team2_score || 0}
            </span>
          </div>
          <div className="flex items-center">
            <div
              className="w-3 h-3 mr-2 rounded-sm"
              style={{
                backgroundColor: record.team2_color || "#ccc",
              }}
            />
            <span>{getTeamDisplayName(record, 'team2')}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('match:match.group'),
      dataIndex: "group_name",
      key: "group_name",
      width: 80,
      render: (groupName) =>
        groupName ? <Tag color="blue">{groupName.includes("_") ? groupName.split("_")[0] : groupName}</Tag> : "-",
      sorter: (a, b) => {
        const aGroup = a.group_name || "";
        const bGroup = b.group_name || "";
        return aGroup.localeCompare(bGroup);
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: t('match:match.type'),
      dataIndex: "match_type",
      key: "match_type",
      width: 100,
      render: (type) => getTypeTag(type),
      sorter: (a, b) => {
        const aType = a.match_type || "";
        const bType = b.match_type || "";
        return aType.localeCompare(bType);
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: t('match:match.status'),
      dataIndex: "match_status",
      key: "match_status",
      width: 100,
      render: (status) => getStatusTag(status),
      sorter: (a, b) => {
        const statusOrder = { pending: 1, active: 2, overtime: 3, completed: 4, postponed: 5 };
        const aOrder = statusOrder[a.match_status] || 0;
        const bOrder = statusOrder[b.match_status] || 0;
        return aOrder - bOrder;
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: t('match:match.date'),
      dataIndex: "match_date",
      key: "match_date",
      width: 180,
      render: (date) => (date ? moment(date).format("YYYY-MM-DD HH:mm") : "-"),
      sorter: (a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return moment(a.match_date).valueOf() - moment(b.match_date).valueOf();
      },
      sortDirections: ["ascend", "descend"],
    },
    {
      title: t('match:match.winner'),
      dataIndex: "winner_name",
      key: "winner_name",
      width: 120,
      render: (winner) => (winner ? <Tag color="gold">{getDisplayTeamName(winner)}</Tag> : "-"),
    },
    {
      title: t('common:actions.title'),
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}`)}
          >
            {t('match:actions.view')}
          </Button>
          {record.match_status === "pending" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
              disabled={!record.team1_name || !record.team2_name}
              title={!record.team1_name || !record.team2_name ? t('match:messages.teamsNotDetermined') : t('match:actions.start')}
            >
              {t('match:actions.start')}
            </Button>
          )}
          {record.match_status === "active" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              className="text-green-500"
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
            >
              {t('match:actions.continue')}
            </Button>
          )}
          {record.match_status === "postponed" && (
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              className="text-orange-500"
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/live`)}
              disabled={!record.team1_name || !record.team2_name}
              title={!record.team1_name || !record.team2_name ? t('match:messages.teamsNotDetermined') : t('match:actions.startPostponed')}
            >
              {t('match:actions.start')}
            </Button>
          )}
          {record.match_status === "pending" && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/edit`)}
              disabled={!record.team1_name || !record.team2_name}
              title={!record.team1_name || !record.team2_name ? t('match:messages.teamsNotDetermined') : t('match:actions.edit')}
            >
              {t('match:actions.edit')}
            </Button>
          )}
          {record.match_status === "postponed" && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/tournaments/${tournamentId}/matches/${record.match_id}/edit`)}
              disabled={!record.team1_name || !record.team2_name}
              title={!record.team1_name || !record.team2_name ? t('match:messages.teamsNotDetermined') : t('match:actions.editPostponed')}
              className="text-orange-500"
            >
              {t('match:actions.edit')}
            </Button>
          )}
          <Popconfirm
            title={t('match:messages.deleteConfirmation')}
            description={t('match:messages.deleteConfirmation')}
            onConfirm={() => handleDelete(record.match_id)}
            okText={t('common:actions.confirm')}
            cancelText={t('common:actions.cancel')}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              {t('match:actions.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 計算統計數據 (基於所有比賽，不只是當前頁面)
  const stats = {
    total: allMatches.length,
    pending: allMatches.filter((m) => m.match_status === "pending").length,
    active: allMatches.filter((m) => m.match_status === "active").length,
    completed: allMatches.filter((m) => m.match_status === "completed").length,
    postponed: allMatches.filter((m) => m.match_status === "postponed").length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">{tournament?.tournament_name} - {t('match:match.management')}</h2>
        <p className="text-gray-600 mb-0">{t('match:messages.managementDescription')}</p>
      </div>

      {/* 統計卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card>
            <Statistic title={t('match:statistics.totalMatches')} value={pagination.total} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title={t('match:status.pending')} value={stats.pending} valueStyle={{ color: "#666" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title={t('match:status.active')} value={stats.active} valueStyle={{ color: "#1890ff" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title={t('match:status.completed')} value={stats.completed} valueStyle={{ color: "#52c41a" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title={t('match:status.postponed')} value={stats.postponed} valueStyle={{ color: "#fa8c16" }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title={t('match:statistics.others')} value={stats.total - stats.pending - stats.active - stats.completed - stats.postponed} valueStyle={{ color: "#999" }} />
          </Card>
        </Col>
      </Row>

      {/* 操作區域 */}
      <Card className="mb-6">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder={t('match:placeholders.searchMatch')}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-48"
              />
              <Select
                placeholder={t('match:list.filterStatus')}
                value={filterStatus}
                onChange={(value) => {
                  setFilterStatus(value);
                  handleFilterChange();
                }}
                className="min-w-[120px] w-auto"
              >
                <Option value="all">{t('common:filters.allStatus')}</Option>
                <Option value="pending">{t('match:status.pending')}</Option>
                <Option value="active">{t('match:status.active')}</Option>
                <Option value="completed">{t('match:status.completed')}</Option>
                <Option value="postponed">{t('match:status.postponed')}</Option>
              </Select>
              <Select
                placeholder={t('match:match.type')}
                value={filterType}
                onChange={(value) => {
                  setFilterType(value);
                  handleFilterChange();
                }}
                className="min-w-[140px] w-auto"
              >
                <Option value="all">{t('common:filters.allMatchTypes')}</Option>
                <Option value="group">{t('match:types.groupStage')}</Option>
                <Option value="knockout">{t('match:types.knockout')}</Option>
                <Option value="friendly">{t('match:types.friendly')}</Option>
              </Select>
              <Select
                placeholder={t('match:list.filterGroup')}
                value={filterGroup}
                onChange={(value) => {
                  setFilterGroup(value);
                  handleFilterChange();
                }}
                className="min-w-[120px] w-auto"
              >
                <Option value="all">{t('common:filters.allGroups')}</Option>
                {groups.map((group) => (
                  <Option key={group.group_id} value={group.group_id}>
                    {t('match:match.group')} {group.group_name?.includes("_") ? group.group_name.split("_")[0] : group.group_name}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder={t('match:list.filterTeam')}
                value={filterTeam}
                onChange={(value) => {
                  setFilterTeam(value);
                  handleFilterChange();
                }}
                className="min-w-[120px] w-auto"
                showSearch
                optionFilterProp="children"
              >
                <Option value="all">{t('common:filters.allTeams')}</Option>
                {teams.map((team) => (
                  <Option key={team.team_id} value={team.team_id}>
                    {getDisplayTeamName(team.team_name)}
                  </Option>
                ))}
              </Select>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates || []);
                  handleFilterChange();
                }}
                placeholder={[t('common:date.startDate'), t('common:date.endDate')]}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/matches/create`)}
              >
                {t('match:list.addMatch')}
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/matches/generate`)}
              >
                {t('match:list.generateMatches')}
              </Button>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button 
                    icon={<ClockCircleOutlined />} 
                    loading={batchPostponeLoading}
                    onClick={showPostponeModal}
                  >
                    {t('match:list.batchPostpone')} ({selectedRowKeys.length})
                  </Button>
                  <Popconfirm
                    title={t('match:list.batchDelete')}
                    description={t('match:list.batchDeleteConfirmation', { count: selectedRowKeys.length })}
                    onConfirm={handleBatchDelete}
                    okText={t('common:actions.confirm')}
                    cancelText={t('common:actions.cancel')}
                  >
                    <Button danger icon={<DeleteOutlined />} loading={batchDeleteLoading}>
                      {t('match:list.batchDelete')} ({selectedRowKeys.length})
                    </Button>
                  </Popconfirm>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 比賽列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={matches}
          rowKey="match_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => t('common:pagination.showTotal', { start: range[0], end: range[1], total }),
            pageSizeOptions: ["10", "20", "50", "100"],
            locale: {
              items_per_page: t('common:pagination.itemsPerPage'),
              jump_to: t('common:pagination.jumpTo'),
              page: t('common:pagination.page'),
            },
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 延期比賽模態框 */}
      <Modal
        title={t('match:list.batchPostpone')}
        open={postponeModalVisible}
        onCancel={handlePostponeCancel}
        footer={null}
        width={400}
      >
        <Form
          form={postponeForm}
          layout="vertical"
          onFinish={handleBatchPostpone}
          initialValues={{ delayMinutes: 30 }}
        >
          <p>{t('match:list.selectedMatchesCount')}: <strong>{selectedRowKeys.length}</strong></p>
          
          <Form.Item
            label={t('match:list.delayTime')}
            name="delayMinutes"
            rules={[
              { required: true, message: t('match:list.delayTimeRequired') },
              { type: 'number', min: 0, max: 1440, message: t('match:list.delayTimeRange') }
            ]}
            extra={t('match:list.delayTimeNote')}
          >
            <InputNumber
              className="w-full"
              placeholder={t('match:list.delayTimePlaceholder')}
              min={0}
              max={1440}
              step={15}
              addonAfter={t('common:time.minutes')}
            />
          </Form.Item>

          <div className="text-right mt-6">
            <Space>
              <Button onClick={handlePostponeCancel}>
                {t('common:actions.cancel')}
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={batchPostponeLoading}
                icon={<ClockCircleOutlined />}
              >
                {t('match:list.confirmPostpone')}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TournamentMatchList;
