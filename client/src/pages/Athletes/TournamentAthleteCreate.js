import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  message,
  InputNumber,
  Switch,
  Divider,
  Alert,
  Space,
  Tooltip,
  Avatar,
  Typography,
  Upload,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  UploadOutlined,
  CameraOutlined,
} from "@ant-design/icons";
import AvatarUpload from "../../components/AvatarUpload";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/authStore";

const { Text } = Typography;

const { Option } = Select;

const TournamentAthleteCreate = () => {
  const { t } = useTranslation(["athlete", "common"]);
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamComposition, setTeamComposition] = useState({
    attackers: 0,
    defenders: 0,
    substitutes: 0,
    total: 0,
  });
  const [createdAthleteId, setCreatedAthleteId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Load teams for the tournament
  const loadTeams = async () => {
    try {
      console.log("Loading teams for tournament:", tournamentId);

      // Try tournament-specific endpoint first
      let response = await fetch(`/api/tournaments/${tournamentId}/teams`);
      let data = await response.json();

      // Fallback to general teams API if needed
      if (!data.success) {
        response = await fetch(`/api/teams?tournament_id=${tournamentId}`);
        data = await response.json();
      }

      if (data.success) {
        const teamsData = data.data?.teams || data.data || data.teams || [];

        // Clean up team names by removing tournament ID suffix
        const cleanedTeams = teamsData.map((team) => {
          let displayName = team.team_name;
          if (displayName && displayName.includes("_")) {
            const parts = displayName.split("_");
            const lastPart = parts[parts.length - 1];
            if (/^\d+$/.test(lastPart)) {
              displayName = parts.slice(0, -1).join("_");
            }
          }
          return {
            ...team,
            display_name: displayName,
          };
        });

        setTeams(cleanedTeams);
      }
    } catch (error) {
      console.error("Error loading teams:", error);
      message.error(t("athlete:messages.loadTeamsFailed"));
    }
  };

  // Load team composition when team is selected
  const loadTeamComposition = async (teamId) => {
    try {
      const response = await fetch(`/api/athletes/team/${teamId}/stats`);
      const data = await response.json();

      if (data.success) {
        const stats = data.data.position_stats || [];
        const composition = {
          attackers: 0,
          defenders: 0,
          substitutes: 0,
          total: 0,
        };

        stats.forEach((stat) => {
          composition[stat.position + "s"] = stat.active_count || 0;
          composition.total += stat.active_count || 0;
        });

        setTeamComposition(composition);
      }
    } catch (error) {
      console.error("Error loading team composition:", error);
    }
  };

  // Handle team selection
  const handleTeamChange = (teamId) => {
    if (teamId) {
      const team = teams.find((t) => t.team_id === teamId);
      setSelectedTeam(team);
      loadTeamComposition(teamId);
    } else {
      // Team was deselected/cleared
      setSelectedTeam(null);
      setTeamComposition({ attackers: 0, defenders: 0, substitutes: 0, total: 0 });
    }
  };

  // Handle avatar file selection
  const handleAvatarSelect = (file) => {
    setSelectedAvatarFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    return false; // Prevent default upload
  };

  // Upload avatar after athlete creation
  const uploadAvatarAfterCreation = async (athleteId) => {
    if (!selectedAvatarFile) return;

    try {
      const formData = new FormData();
      formData.append("avatar", selectedAvatarFile);

      const { token } = useAuthStore.getState();
      const response = await fetch(`/api/athletes/${athleteId}/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        message.success(t("athlete:messages.avatarUploadSuccess"));
        setAvatarUrl(data.data.avatar_url);
      } else {
        message.error(data.message || t("athlete:messages.avatarUploadFailed"));
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      message.error(t("athlete:messages.avatarUploadFailed"));
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const athleteData = {
        tournament_id: parseInt(tournamentId),
        name: values.name.trim(),
        jersey_number: values.jersey_number,
        position: values.position,
        age: values.age,
        is_active: values.is_active !== false,
      };

      // Only include team_id if a team is selected
      if (values.team_id) {
        athleteData.team_id = values.team_id;
      }

      console.log("Creating athlete:", athleteData);

      const response = await fetch("/api/athletes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(athleteData),
      });

      const data = await response.json();

      if (data.success) {
        const newAthleteId = data.data.athlete_id;
        setCreatedAthleteId(newAthleteId);
        message.success(t("athlete:messages.athleteCreated"));

        // Upload avatar if one was selected
        if (selectedAvatarFile) {
          await uploadAvatarAfterCreation(newAthleteId);
        }

        navigate(`/tournaments/${tournamentId}/athletes`);
      } else {
        message.error(data.message || t("athlete:messages.createFailed"));
      }
    } catch (error) {
      console.error("Error creating athlete:", error);
      message.error(t("athlete:messages.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Get position availability info
  const getPositionAvailability = (position) => {
    switch (position) {
      case "attacker":
        return {
          current: teamComposition.attackers,
          max: 1,
          available: teamComposition.attackers < 1,
          color: teamComposition.attackers >= 1 ? "text-red-500" : "text-green-500",
        };
      case "defender":
        return {
          current: teamComposition.defenders,
          max: 5,
          available: teamComposition.defenders < 5,
          color: teamComposition.defenders >= 5 ? "text-red-500" : "text-green-500",
        };
      case "substitute":
        return {
          current: teamComposition.substitutes,
          max: "∞",
          available: true,
          color: "text-green-500",
        };
      default:
        return { current: 0, max: 0, available: true, color: "text-gray-500" };
    }
  };

  // Load teams on component mount
  useEffect(() => {
    loadTeams();
  }, [tournamentId]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/tournaments/${tournamentId}/athletes`)}
                className="hover:bg-gray-100"
              >
                {t("common:buttons.back")}
              </Button>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-0">
                <UserOutlined className="text-blue-500" />
                {t("athlete:athlete.create")}
              </h2>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Main Form */}
      <Row gutter={24}>
        <Col span={16}>
          <Card className="shadow-sm border-0">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <UserOutlined className="text-gray-500" />
                {t("athlete:form.basicInfo")}
              </h3>
              <p className="text-gray-500 text-sm">{t("athlete:form.basicInfoDescription")}</p>
            </div>

            {/* Avatar Upload Section */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-md font-semibold text-blue-700 mb-3">
                {t("athlete:actions.uploadAvatar")} ({t("athlete:form.optional")})
              </h4>
              {createdAthleteId ? (
                <AvatarUpload
                  athleteId={createdAthleteId}
                  currentAvatar={avatarUrl}
                  onAvatarChange={setAvatarUrl}
                  size={80}
                />
              ) : (
                <div className="text-center">
                  <div className="mb-3 relative inline-block">
                    <Avatar
                      size={80}
                      src={avatarPreview}
                      icon={!avatarPreview && <UserOutlined />}
                      className="bg-gray-300"
                    />
                    <Upload
                      beforeUpload={handleAvatarSelect}
                      showUploadList={false}
                      accept="image/*"
                      disabled={loading}
                    >
                      <Button
                        type="primary"
                        shape="circle"
                        size="small"
                        icon={<CameraOutlined />}
                        className="absolute bottom-0 right-0 z-10"
                      />
                    </Upload>
                  </div>
                  <div className="space-y-2">
                    <Upload
                      beforeUpload={handleAvatarSelect}
                      showUploadList={false}
                      accept="image/*"
                      disabled={loading}
                    >
                      <Button icon={<UploadOutlined />} size="small" type={selectedAvatarFile ? "default" : "dashed"}>
                        {selectedAvatarFile ? t("athlete:actions.changeAvatar") : t("athlete:actions.selectAvatar")}
                      </Button>
                    </Upload>
                    {selectedAvatarFile && <div className="text-xs text-green-600">✓ {selectedAvatarFile.name}</div>}
                    <Text type="secondary" className="text-xs block">
                      {t("athlete:form.avatarWillUploadAfterCreation")}
                    </Text>
                  </div>
                </div>
              )}
            </div>

            {/* Success message with avatar upload option */}
            {createdAthleteId && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-md font-semibold text-green-700 mb-3">✅ {t("athlete:messages.athleteCreated")}</h4>
                <Text className="text-green-600">{t("athlete:form.nowUploadAvatar")}</Text>
              </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-4">
              {/* Team Selection */}
              <Form.Item
                name="team_id"
                label={
                  <span className="text-sm font-medium text-gray-700">
                    {t("athlete:athlete.team")}{" "}
                    <span className="text-gray-400 text-xs">({t("athlete:form.optional")})</span>
                  </span>
                }
              >
                <Select
                  placeholder={t("athlete:placeholders.selectTeam")}
                  onChange={handleTeamChange}
                  className="w-full"
                  size="large"
                  allowClear
                  clearIcon={<span className="text-gray-400 hover:text-gray-600">✕</span>}
                >
                  {teams.map((team) => (
                    <Option key={team.team_id} value={team.team_id}>
                      <Space>
                        <TeamOutlined style={{ color: team.team_color }} />
                        {team.display_name || team.team_name}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Athlete Name */}
              <Form.Item
                name="name"
                label={<span className="text-sm font-medium text-gray-700">{t("athlete:athlete.name")}</span>}
                rules={[
                  { required: true, message: t("athlete:validation.nameRequired") },
                  { min: 2, message: t("athlete:validation.nameMinLength") },
                  { max: 100, message: t("athlete:validation.nameMaxLength") },
                ]}
              >
                <Input
                  placeholder={t("athlete:placeholders.enterAthleteName")}
                  prefix={<UserOutlined className="text-gray-400" />}
                  size="large"
                  className="w-full"
                />
              </Form.Item>

              {/* Jersey Number and Age */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="jersey_number"
                    label={<span className="text-sm font-medium text-gray-700">{t("athlete:athlete.number")}</span>}
                    rules={[
                      { required: true, message: t("athlete:validation.numberRequired") },
                      { type: "number", min: 1, max: 99, message: t("athlete:validation.numberRange") },
                    ]}
                  >
                    <InputNumber
                      placeholder={t("athlete:placeholders.enterNumber")}
                      min={1}
                      max={99}
                      size="large"
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="age"
                    label={<span className="text-sm font-medium text-gray-700">{t("athlete:athlete.age")}</span>}
                    rules={[
                      { required: true, message: t("athlete:validation.ageRequired") },
                      { type: "number", min: 16, max: 50, message: t("athlete:validation.ageRange") },
                    ]}
                  >
                    <InputNumber
                      placeholder={t("athlete:placeholders.enterAge")}
                      min={16}
                      max={50}
                      size="large"
                      className="w-full"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Position Selection */}
              <Form.Item
                name="position"
                label={<span className="text-sm font-medium text-gray-700">{t("athlete:athlete.position")}</span>}
                rules={[{ required: true, message: t("athlete:validation.positionRequired") }]}
              >
                <Select placeholder={t("athlete:placeholders.selectPosition")} size="large" className="w-full">
                  {["attacker", "defender", "substitute"].map((position) => {
                    const availability = selectedTeam
                      ? getPositionAvailability(position)
                      : { available: true, current: 0, max: "∞", color: "text-gray-500" };
                    return (
                      <Option key={position} value={position} disabled={selectedTeam && !availability.available}>
                        <div className="flex justify-between items-center">
                          <span>{t(`athlete:positions.${position}`)}</span>
                          {selectedTeam && (
                            <span className={`text-xs ${availability.color}`}>
                              {availability.current}/{availability.max}
                            </span>
                          )}
                        </div>
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>

              {/* Active Status */}
              <Form.Item
                name="is_active"
                label={<span className="text-sm font-medium text-gray-700">{t("athlete:athlete.status")}</span>}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch
                  checkedChildren={t("athlete:status.active")}
                  unCheckedChildren={t("athlete:status.inactive")}
                  size="default"
                />
              </Form.Item>

              {/* Form Actions */}
              <Divider />
              <Form.Item className="mb-0">
                <Space className="w-full justify-end">
                  <Button
                    onClick={() => navigate(`/tournaments/${tournamentId}/athletes`)}
                    size="large"
                    className="hover:bg-gray-100"
                  >
                    {t("common:buttons.cancel")}
                  </Button>
                  {!createdAthleteId ? (
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      icon={<SaveOutlined />}
                      size="large"
                      className="bg-blue-500 hover:bg-blue-600 border-blue-500 hover:border-blue-600"
                    >
                      {t("athlete:athlete.create")}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        type="default"
                        onClick={() => navigate(`/tournaments/${tournamentId}/athletes`)}
                        size="large"
                        className="w-full"
                      >
                        {t("athlete:actions.back")}
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => navigate(`/tournaments/${tournamentId}/athletes/${createdAthleteId}`)}
                        size="large"
                        className="w-full"
                      >
                        {t("athlete:actions.view")}
                      </Button>
                    </div>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Sidebar - Team Info */}
        <Col span={8}>
          {selectedTeam ? (
            <Card className="shadow-sm border-0 mb-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <TeamOutlined style={{ color: selectedTeam.team_color }} />
                  {selectedTeam.display_name || selectedTeam.team_name}
                </h3>
                <p className="text-gray-500 text-sm">{t("athlete:form.teamComposition")}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚔️</span>
                    <span className="font-medium text-gray-700">{t("athlete:positions.attacker")}</span>
                  </div>
                  <span className={`font-bold ${teamComposition.attackers >= 1 ? "text-red-500" : "text-green-500"}`}>
                    {teamComposition.attackers}/1
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <span className="font-medium text-gray-700">{t("athlete:positions.defender")}</span>
                  </div>
                  <span className={`font-bold ${teamComposition.defenders >= 5 ? "text-red-500" : "text-green-500"}`}>
                    {teamComposition.defenders}/5
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔄</span>
                    <span className="font-medium text-gray-700">{t("athlete:positions.substitute")}</span>
                  </div>
                  <span className="font-bold text-green-500">{teamComposition.substitutes}/∞</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-t">
                  <span className="font-semibold text-gray-700">{t("athlete:form.totalAthletes")}</span>
                  <span className="font-bold text-gray-800">{teamComposition.total}</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="shadow-sm border-0 mb-4">
              <div className="text-center py-8">
                <UserOutlined className="text-4xl text-gray-300 mb-4" />
                <h4 className="text-gray-600 font-medium mb-2">{t("athlete:form.noTeamSelected")}</h4>
                <p className="text-gray-500 text-sm">{t("athlete:form.noTeamDescription")}</p>
              </div>
            </Card>
          )}

          {/* Rules Info */}
          <Card className="shadow-sm border-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-2">
                <InfoCircleOutlined className="text-blue-500" />
                {t("athlete:form.teamRules")}
              </h3>
            </div>

            <Alert
              message={t("athlete:form.rulesTitle")}
              description={
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• {t("athlete:form.rule1")}</li>
                  <li>• {t("athlete:form.rule2")}</li>
                  <li>• {t("athlete:form.rule3")}</li>
                  <li>• {t("athlete:form.rule4")}</li>
                </ul>
              }
              type="info"
              showIcon
              className="border-blue-200 bg-blue-50"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TournamentAthleteCreate;
