import React, { useState, useEffect } from "react";
import { Card, Table, Space, Tag, Spin, Alert, Statistic, Row, Col, Button, Select, DatePicker, Input } from "antd";
import {
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FireOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;

const ClientMatchList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["match", "common", "group"]);
  const [tournament, setTournament] = useState(null);

  // Clean team name display (remove _{tournament_id} suffix)
  const getDisplayTeamName = (teamName) => {
    if (!teamName) return "";
    const lastUnderscoreIndex = teamName.lastIndexOf("_");
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
    if (!match || match.match_type !== "knockout") return null;

    const currentMatchNumber = match.match_number;
    if (!currentMatchNumber) return null;

    // Define knockout progression mapping based on match numbers
    const knockoutProgression = {
      // Finals get teams from semifinals
      FI01: { team1: "SE01", team2: "SE02" },

      // Semifinals get teams from quarterfinals
      SE01: { team1: "QU01", team2: "QU02" },
      SE02: { team1: "QU03", team2: "QU04" },

      // Quarterfinals get teams from round of 16 (if exists)
      QU01: { team1: "R16_01", team2: "R16_02" },
      QU02: { team1: "R16_03", team2: "R16_04" },
      QU03: { team1: "R16_05", team2: "R16_06" },
      QU04: { team1: "R16_07", team2: "R16_08" },

      // Round of 16 get teams from round of 32 (if exists)
      R16_01: { team1: "R32_01", team2: "R32_02" },
      R16_02: { team1: "R32_03", team2: "R32_04" },
      R16_03: { team1: "R32_05", team2: "R32_06" },
      R16_04: { team1: "R32_07", team2: "R32_08" },
      R16_05: { team1: "R32_09", team2: "R32_10" },
      R16_06: { team1: "R32_11", team2: "R32_12" },
      R16_07: { team1: "R32_13", team2: "R32_14" },
      R16_08: { team1: "R32_15", team2: "R32_16" },
    };

    try {
      const progression = knockoutProgression[currentMatchNumber];
      if (progression) {
        const sourceMatchNumber = progression[teamKey];
        // Verify the source match exists in the matches list
        const sourceMatch = allMatches.find((m) => m.match_number === sourceMatchNumber);
        return sourceMatch ? sourceMatchNumber : null;
      }
      return null;
    } catch (error) {
      console.error("Error finding source match:", error);
      return null;
    }
  };

  // Enhanced team display function that shows match references for knockout matches
  const getTeamDisplayNameWithReference = (match, teamKey) => {
    const teamName = match[`${teamKey}_name`];
    if (teamName) return getDisplayTeamName(teamName);

    // For knockout matches, show match winner reference when team is not assigned
    if (match.match_type === "knockout") {
      const teamId = match[`${teamKey}_id`];
      if (!teamId) {
        // Find the source match for this team position
        const sourceMatch = findSourceMatch(match, teamKey, matches);
        if (sourceMatch) {
          return `${sourceMatch}${t("match:result.winner")}`;
        }
        // If no source match found, show generic placeholder
        return getKnockoutWinnerReference(match.match_number, teamKey) || t("match:status.pending");
      }
    }

    // For non-knockout matches or when team is assigned but no name
    return teamName || t("match:status.pending");
  };

  // Dynamically generate knockout winner reference
  const getKnockoutWinnerReference = (matchNumber, teamPosition) => {
    if (!matchNumber) return t("match:status.pending");

    const matchNum = matchNumber.toUpperCase();

    // defineknockoutprogressionmapping
    const knockoutProgression = {
      // Tournament match logic
      FI01: { team1: "SE01", team2: "SE02" },
      FI02: { team1: "SE03", team2: "SE04" },

      // Tournament match logic
      TP01: { team1: "SE01", team2: "SE02" },

      // Tournament match logic
      SE01: { team1: "QU01", team2: "QU02" },
      SE02: { team1: "QU03", team2: "QU04" },
      SE03: { team1: "QU05", team2: "QU06" },
      SE04: { team1: "QU07", team2: "QU08" },

      // Quarterfinals (Quarterfinals) - fromRound of 16
      QU01: { team1: "R16_01", team2: "R16_02" },
      QU02: { team1: "R16_03", team2: "R16_04" },
      QU03: { team1: "R16_05", team2: "R16_06" },
      QU04: { team1: "R16_07", team2: "R16_08" },
      QU05: { team1: "R16_09", team2: "R16_10" },
      QU06: { team1: "R16_11", team2: "R16_12" },
      QU07: { team1: "R16_13", team2: "R16_14" },
      QU08: { team1: "R16_15", team2: "R16_16" },

      // Round of 16 (Round of 16) - fromRound of 32
      R16_01: { team1: "R32_01", team2: "R32_02" },
      R16_02: { team1: "R32_03", team2: "R32_04" },
      R16_03: { team1: "R32_05", team2: "R32_06" },
      R16_04: { team1: "R32_07", team2: "R32_08" },
      R16_05: { team1: "R32_09", team2: "R32_10" },
      R16_06: { team1: "R32_11", team2: "R32_12" },
      R16_07: { team1: "R32_13", team2: "R32_14" },
      R16_08: { team1: "R32_15", team2: "R32_16" },
      R16_09: { team1: "R32_17", team2: "R32_18" },
      R16_10: { team1: "R32_19", team2: "R32_20" },
      R16_11: { team1: "R32_21", team2: "R32_22" },
      R16_12: { team1: "R32_23", team2: "R32_24" },
      R16_13: { team1: "R32_25", team2: "R32_26" },
      R16_14: { team1: "R32_27", team2: "R32_28" },
      R16_15: { team1: "R32_29", team2: "R32_30" },
      R16_16: { team1: "R32_31", team2: "R32_32" },
    };

    const progression = knockoutProgression[matchNum];
    if (progression) {
      const sourceMatch = progression[teamPosition];
      // Tournament match logic
      const resultType = matchNum === "TP01" ? t("match:result.loser") : t("match:result.winner");
      return `${sourceMatch}${resultType}`;
    }

    // ifisfirst roundmatch（nosource），returnpending
    if (matchNum.startsWith("QU") || matchNum.startsWith("R16") || matchNum.startsWith("R32")) {
      return t("match:status.pending");
    }

    return t("match:status.pending");
  };

  // Clean group name display (remove _{tournament_id} suffix)
  const getDisplayGroupName = (groupName) => {
    if (!groupName) return "";
    const lastUnderscoreIndex = groupName.lastIndexOf("_");
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
    search: "",
  });
  const [stats, setStats] = useState({
    totalMatches: 0,
    pendingMatches: 0,
    activeMatches: 0,
    completedMatches: 0,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
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
      const tournamentResponse = await axios.get("/api/tournaments/public");
      let tournamentData = null;

      if (tournamentResponse.data.success && tournamentResponse.data.data) {
        tournamentData = tournamentResponse.data.data;
      } else {
        // Fallback to first active tournament
        const fallbackResponse = await axios.get("/api/tournaments?status=active&limit=1");
        if (fallbackResponse.data.success && fallbackResponse.data.data.tournaments.length > 0) {
          tournamentData = fallbackResponse.data.data.tournaments[0];
        }
      }

      if (!tournamentData) {
        setError(t("common:messages.noTournamentFound", { defaultValue: "No tournament found to display" }));
        return;
      }

      setTournament(tournamentData);
      const tournamentId = tournamentData.tournament_id;

      // Fetch groups for filter options
      try {
        const groupsResponse = await axios.get(`/api/tournaments/${tournamentId}/groups`);
        if (groupsResponse.data.success) {
          const groupsData = Array.isArray(groupsResponse.data.data)
            ? groupsResponse.data.data
            : groupsResponse.data.data.groups || [];
          setGroups(groupsData);
        }
      } catch (groupsError) {
        console.log("Groups not available for filtering");
        setGroups([]);
      }

      // Build query parameters for matches
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.type) params.append("type", filters.type);
      if (filters.group_id) params.append("group_id", filters.group_id);
      if (filters.date_range && filters.date_range.length === 2) {
        params.append("date_from", filters.date_range[0].format("YYYY-MM-DD"));
        params.append("date_to", filters.date_range[1].format("YYYY-MM-DD"));
      }
      params.append("limit", "100"); // Get more matches for client view

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
        let matchesList = Array.isArray(matchesData) ? matchesData : matchesData.matches || [];

        // Filter by search term if provided
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          matchesList = matchesList.filter(
            (match) =>
              getDisplayTeamName(match.team1_name)?.toLowerCase().includes(searchTerm) ||
              getDisplayTeamName(match.team2_name)?.toLowerCase().includes(searchTerm) ||
              match.match_number?.toLowerCase().includes(searchTerm) ||
              getDisplayGroupName(match.group_name)?.toLowerCase().includes(searchTerm),
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
        const pendingMatches = matchesList.filter((m) => m.match_status === "pending").length;
        const activeMatches = matchesList.filter((m) => ["active", "in_progress"].includes(m.match_status)).length;
        const completedMatches = matchesList.filter((m) => m.match_status === "completed").length;

        setStats({
          totalMatches,
          pendingMatches,
          activeMatches,
          completedMatches,
        });

        // Update pagination total
        setPagination((prev) => ({
          ...prev,
          total: totalMatches,
        }));
      }
    } catch (error) {
      console.error("Error fetching matches data:", error);
      setError(t("match:messages.loadingMatches"));
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatusTag = (status) => {
    const statusMap = {
      pending: { color: "default", text: t("match:status.pending"), icon: <ClockCircleOutlined /> },
      active: { color: "processing", text: t("match:status.inProgress"), icon: <PlayCircleOutlined /> },
      in_progress: { color: "processing", text: t("match:status.inProgress"), icon: <PlayCircleOutlined /> },
      completed: { color: "success", text: t("match:status.completed"), icon: <CheckCircleOutlined /> },
      cancelled: { color: "error", text: t("match:status.cancelled"), icon: <ClockCircleOutlined /> },
    };

    const statusInfo = statusMap[status] || { color: "default", text: status, icon: <ClockCircleOutlined /> };
    return (
      <Tag color={statusInfo.color} icon={statusInfo.icon}>
        {statusInfo.text}
      </Tag>
    );
  };

  const getMatchTypeTag = (type) => {
    const typeMap = {
      group: { color: "blue", text: t("match:types.groupStage") },
      knockout: { color: "purple", text: t("match:types.knockout") },
      friendly: { color: "green", text: t("match:types.friendly") },
    };

    const typeInfo = typeMap[type] || { color: "default", text: type };
    return <Tag color={typeInfo.color}>{typeInfo.text}</Tag>;
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: undefined,
      type: undefined,
      group_id: undefined,
      date_range: null,
      search: "",
    });
  };

  const handleTableChange = (paginationConfig, filters, sorter) => {
    const { current, pageSize } = paginationConfig;
    setPagination(prev => ({
      ...prev,
      current,
      pageSize
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
      if (aType === "group" && bType === "knockout") return -1;
      if (aType === "knockout" && bType === "group") return 1;
      // For other types, use alphabetical order
      return aType.localeCompare(bType);
    }

    // For group matches, use the original logic
    if (aType === "group") {
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
    if (aType === "knockout") {
      const getKnockoutOrder = (matchNumber) => {
        const num = matchNumber.toUpperCase();
        // Quarterfinals (QU01, QU02, QU03, QU04)
        if (num.startsWith("QU")) return 1000 + parseInt(num.slice(2));
        // Round of 16 (R16_01, R16_02, etc.)
        if (num.startsWith("R16")) return 900 + parseInt(num.slice(4));
        // Round of 32 (R32_01, R32_02, etc.)
        if (num.startsWith("R32")) return 800 + parseInt(num.slice(4));
        // Semifinals (SE01, SE02, etc.)
        if (num.startsWith("SE")) return 2000 + parseInt(num.slice(2));
        // Third place playoff (TP01, 3RD01, etc.) - should come after semifinals but before finals
        if (num.startsWith("TP")) return 2500 + parseInt(num.slice(2));
        if (num.startsWith("3RD")) return 2500 + parseInt(num.slice(3));
        // Finals (FI01, etc.)
        if (num.startsWith("FI")) return 3000 + parseInt(num.slice(2));
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
      title: t("match:match.totalOrder"),
      dataIndex: "totalOrder",
      key: "totalOrder",
      width: 80,
      align: "center",
      sorter: (a, b) => (a.totalOrder || 0) - (b.totalOrder || 0),
      sortDirections: ["ascend", "descend"],
      render: (totalOrder) => <span className="font-bold text-blue-600 text-base">{totalOrder}</span>,
    },
    {
      title: t("match:match.number"),
      dataIndex: "match_number",
      key: "match_number",
      width: 100,
      sorter: (a, b) => sortMatchNumbers(a, b),
      sortDirections: ["ascend", "descend"],
      defaultSortOrder: "ascend",
      render: (number, record) => {
        if (!record || !record.match_id) {
          return <span className="text-gray-400">{number}</span>;
        }

        return (
          <Button
            type="link"
            className="p-0 h-auto font-bold text-blue-600 hover:text-blue-800"
            onClick={() => navigate(`/matches/${record.match_id}`)}
          >
            {number}
          </Button>
        );
      },
    },
    {
      title: t("match:match.teams"),
      key: "teams",
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: record.team1_color || "#1890ff" }} />
            <span className="font-bold text-gray-800">{getTeamDisplayNameWithReference(record, "team1")}</span>
            <span className="text-gray-500 mx-1">vs</span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: record.team2_color || "#52c41a" }} />
            <span className="font-bold text-gray-800">{getTeamDisplayNameWithReference(record, "team2")}</span>
          </div>
          {record.match_status === "completed" && (
            <span className="text-base font-bold text-blue-600">
              {record.team1_score || 0} - {record.team2_score || 0}
            </span>
          )}
        </div>
      ),
    },
    {
      title: t("match:match.time"),
      dataIndex: "match_date",
      key: "match_date",
      width: 150,
      sorter: (a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return moment(a.match_date).valueOf() - moment(b.match_date).valueOf();
      },
      sortDirections: ["ascend", "descend"],
      render: (date) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-800">{date ? moment(date).format("MM/DD") : "-"}</span>
          <span className="text-xs text-gray-500">{date ? moment(date).format("HH:mm") : "-"}</span>
        </div>
      ),
    },
    {
      title: t("match:match.type"),
      dataIndex: "match_type",
      key: "match_type",
      width: 100,
      align: "center",
      sorter: (a, b) => {
        const aType = a.match_type || "";
        const bType = b.match_type || "";
        return aType.localeCompare(bType);
      },
      sortDirections: ["ascend", "descend"],
      render: (type) => getMatchTypeTag(type),
    },
    {
      title: t("group:group.name"),
      dataIndex: "group_name",
      key: "group_name",
      width: 120,
      sorter: (a, b) => {
        const aGroup = getDisplayGroupName(a.group_name) || "";
        const bGroup = getDisplayGroupName(b.group_name) || "";
        return aGroup.localeCompare(bGroup);
      },
      sortDirections: ["ascend", "descend"],
      render: (groupName) =>
        groupName ? <Tag color="cyan">{getDisplayGroupName(groupName)}</Tag> : <span className="text-gray-500">-</span>,
    },
    {
      title: t("match:match.status"),
      dataIndex: "match_status",
      key: "match_status",
      width: 120,
      align: "center",
      sorter: (a, b) => {
        const statusOrder = {
          pending: 1,
          active: 2,
          in_progress: 2,
          completed: 3,
          cancelled: 4,
        };
        const aOrder = statusOrder[a.match_status] || 0;
        const bOrder = statusOrder[b.match_status] || 0;
        return aOrder - bOrder;
      },
      sortDirections: ["ascend", "descend"],
      render: (status) => getMatchStatusTag(status),
    },
    {
      title: t("common:actions.actions"),
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => {
        if (!record || !record.match_id) {
          return (
            <Button type="primary" size="small" disabled>
              {t("common:actions.viewDetails")}
            </Button>
          );
        }

        return (
          <Button type="primary" size="small" onClick={() => navigate(`/matches/${record.match_id}`)}>
            {t("common:actions.viewDetails")}
          </Button>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-center bg-gray-50 min-h-screen">
        <Spin size="large" />
        <div className="mt-4">
          <span className="text-gray-600">{t("match:messages.loadingMatches")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <Alert
          message={t("common:messages.loadFailed")}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchMatchesData}>
              {t("common:actions.reload")}
            </Button>
          }
          className="bg-white shadow-sm"
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Tournament Header */}
      {tournament && (
        <Card className="mb-6 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-gray-800 font-bold flex items-center">
                <TrophyOutlined className="mr-2 text-yellow-500" />
                {tournament.tournament_name}
              </h2>
              <span className="text-gray-600">{t("match:match.list")}</span>
            </div>
            <div>
              <Tag color="blue" className="text-sm px-3 py-1">
                {tournament.status === "active" ? t("common:status.inProgress") : tournament.status}
              </Tag>
            </div>
          </div>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <Statistic
            title={<span className="text-gray-600 text-sm">{t("common:stats.totalMatches")}</span>}
            value={stats.totalMatches}
            prefix={<CalendarOutlined className="text-blue-500" />}
            valueStyle={{ color: "#1890ff", fontSize: "20px", fontWeight: "bold" }}
          />
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <Statistic
            title={<span className="text-gray-600 text-sm">{t("match:stats.pendingMatches")}</span>}
            value={stats.pendingMatches}
            prefix={<ClockCircleOutlined className="text-yellow-500" />}
            valueStyle={{ color: "#faad14", fontSize: "20px", fontWeight: "bold" }}
          />
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <Statistic
            title={<span className="text-gray-600 text-sm">{t("match:stats.activeMatches")}</span>}
            value={stats.activeMatches}
            prefix={<PlayCircleOutlined className="text-red-500" />}
            valueStyle={{ color: "#f5222d", fontSize: "20px", fontWeight: "bold" }}
          />
        </Card>
        <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <Statistic
            title={<span className="text-gray-600 text-sm">{t("common:stats.completedMatches")}</span>}
            value={stats.completedMatches}
            prefix={<CheckCircleOutlined className="text-green-500" />}
            valueStyle={{ color: "#52c41a", fontSize: "20px", fontWeight: "bold" }}
          />
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-center">
          <div className="col-span-1">
            <span className="font-bold text-gray-700">
              <FilterOutlined className="mr-2 text-blue-500" />
              {t("common:filters.title")}
            </span>
          </div>
          <div className="col-span-1">
            <Select
              placeholder={t("match:placeholders.selectStatus")}
              value={filters.status}
              onChange={(value) => handleFilterChange("status", value)}
              className="w-full"
              allowClear
            >
              <Option value="pending">{t("match:status.pending")}</Option>
              <Option value="active">{t("match:status.inProgress")}</Option>
              <Option value="completed">{t("match:status.completed")}</Option>
            </Select>
          </div>
          <div className="col-span-1">
            <Select
              placeholder={t("match:placeholders.selectType")}
              value={filters.type}
              onChange={(value) => handleFilterChange("type", value)}
              className="w-full"
              allowClear
            >
              <Option value="group">{t("match:types.groupStage")}</Option>
              <Option value="knockout">{t("match:types.knockout")}</Option>
              <Option value="friendly">{t("match:types.friendly")}</Option>
            </Select>
          </div>
          <div className="col-span-1">
            <Select
              placeholder={t("group:placeholders.selectGroup")}
              value={filters.group_id}
              onChange={(value) => handleFilterChange("group_id", value)}
              className="w-full"
              allowClear
            >
              {groups.map((group) => (
                <Option key={group.group_id} value={group.group_id}>
                  {getDisplayGroupName(group.group_name)}
                </Option>
              ))}
            </Select>
          </div>
          <div className="col-span-1">
            <Input
              placeholder={t("match:placeholders.searchMatch")}
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <Button onClick={clearFilters} className="w-full border-gray-300 hover:border-blue-500 hover:text-blue-500">
              {t("common:actions.clearFilters")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Matches Table */}
      <Card className="bg-white shadow-sm">
        <div className="mb-4">
          <h2 className="text-gray-800 font-bold flex items-center">
            <PlayCircleOutlined className="mr-2 text-blue-500" />
            {t("match:match.list")}
          </h2>
        </div>

        <Table
          columns={columns}
          dataSource={matches}
          rowKey="match_id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              t("match:pagination.showTotal", {
                start: range[0],
                end: range[1],
                total: total,
                defaultValue: `${range[0]}-${range[1]} of ${total} matches`,
              }),
            pageSizeOptions: ["10", "20", "50", "100"]
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <div className="text-center py-10">
                <CalendarOutlined className="text-5xl text-gray-300 mb-4" />
                <div className="mt-4">
                  <span className="text-gray-500">{t("match:messages.noMatches")}</span>
                </div>
              </div>
            ),
          }}
          scroll={{ x: 800 }}
          className="overflow-x-auto"
        />
      </Card>
    </div>
  );
};

export default ClientMatchList;
