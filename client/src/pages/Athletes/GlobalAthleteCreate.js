import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Input, InputNumber, Button, message, Row, Col, Space, Divider, Upload, Avatar } from "antd";
import { UserOutlined, SaveOutlined, ArrowLeftOutlined, GlobalOutlined, UploadOutlined, CameraOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const GlobalAthleteCreate = () => {
  const { t } = useTranslation(["athlete", "common"]);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Handle avatar file change
  const handleAvatarChange = (info) => {
    const file = info.file;
    if (file.status === 'removed') {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    // Validate file type
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      message.error(t('athlete:messages.onlyImageFiles'));
      return false;
    }

    // Validate file size (5MB)
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t('athlete:messages.imageTooLarge'));
      return false;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
    
    return false; // Prevent auto upload
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // First create the athlete
      const response = await fetch("/api/global-athletes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          age: values.age
        }),
      });

      const data = await response.json();

      if (data.success) {
        const athleteId = data.data.athlete_id;
        
        // If there's an avatar file, upload it
        if (avatarFile) {
          const formData = new FormData();
          formData.append('avatar', avatarFile);

          try {
            const avatarResponse = await fetch(`/api/global-athletes/${athleteId}/avatar`, {
              method: 'POST',
              body: formData,
            });

            const avatarData = await avatarResponse.json();
            if (!avatarData.success) {
              message.warning(t('athlete:messages.avatarUploadFailed'));
            }
          } catch (avatarError) {
            console.error('Avatar upload error:', avatarError);
            message.warning(t('athlete:messages.avatarUploadFailed'));
          }
        }

        message.success(t("athlete:messages.athleteCreated"));
        navigate("/global-athletes");
      } else {
        message.error(data.message || t("athlete:messages.createFailed"));
      }
    } catch (error) {
      console.error("Error creating global athlete:", error);
      message.error(t("athlete:messages.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Handle form reset
  const handleReset = () => {
    form.resetFields();
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/global-athletes")}
                className="hover:bg-gray-50"
              >
                {t("athlete:actions.back")}
              </Button>
              <Divider type="vertical" />
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-0">
                <GlobalOutlined className="text-green-500" />
                {t("athlete:global.create")}
              </h2>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Description */}
      <Card className="mb-6 shadow-sm border-0">
        <div className="text-gray-600">
          <p className="mb-2">
            <strong>{t("athlete:global.description")}</strong>
          </p>
          <ul className="list-disc ml-6 space-y-1">
            <li>{t("athlete:global.createDescription1")}</li>
            <li>{t("athlete:global.createDescription2")}</li>
            <li>{t("athlete:global.createDescription3")}</li>
          </ul>
        </div>
      </Card>

      {/* Create Form */}
      <Card className="shadow-sm border-0">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-0">
            <UserOutlined className="text-blue-500" />
            {t("athlete:form.basicInfo")}
          </h3>
          <p className="text-gray-500 mt-2">{t("athlete:global.formDescription")}</p>
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit} className="space-y-4">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t("athlete:athlete.name")}
                rules={[
                  { required: true, message: t("athlete:validation.nameRequired") },
                  { min: 2, message: t("athlete:validation.nameMinLength") },
                  { max: 100, message: t("athlete:validation.nameMaxLength") },
                ]}
              >
                <Input
                  placeholder={t("athlete:placeholders.enterAthleteName")}
                  prefix={<UserOutlined className="text-gray-400" />}
                  className="h-10"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="age"
                label={t("athlete:athlete.age")}
                rules={[
                  { required: true, message: t("athlete:validation.ageRequired") },
                  { type: "number", message: t("athlete:validation.ageRequired") },
                ]}
              >
                <InputNumber
                  placeholder={t("athlete:placeholders.enterAge")}
                  className="w-full h-10"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                label={
                  <span>
                    {t("athlete:athlete.avatar")}
                    <span className="text-gray-400 font-normal ml-1">({t("athlete:form.optional")})</span>
                  </span>
                }
              >
                <div className="flex items-center gap-4">
                  <Avatar
                    size={80}
                    src={avatarPreview}
                    icon={!avatarPreview && <UserOutlined />}
                    className="border-2 border-gray-200 shadow-sm"
                  />
                  <div className="flex-1">
                    <Upload
                      accept="image/*"
                      showUploadList={false}
                      beforeUpload={() => false}
                      onChange={handleAvatarChange}
                      className="w-full"
                    >
                      <Button
                        icon={<CameraOutlined />}
                        className="w-full h-10"
                      >
                        {avatarFile ? t('athlete:actions.changeAvatar') : t('athlete:actions.uploadAvatar')}
                      </Button>
                    </Upload>
                    {avatarFile && (
                      <div className="mt-2 text-sm text-gray-500">
                        {avatarFile.name} ({(avatarFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-400">
                      {t('athlete:form.avatarUploadHint')}
                    </div>
                  </div>
                </div>
              </Form.Item>
            </Col>
          </Row>

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="text-sm text-blue-700">
              <strong>{t("athlete:global.helpTitle")}:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>{t("athlete:global.helpPoint1")}</li>
                <li>{t("athlete:global.helpPoint2")}</li>
                <li>{t("athlete:global.helpPoint3")}</li>
                <li>{t("athlete:global.helpPoint4")}</li>
              </ul>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button onClick={handleReset} className="hover:bg-gray-50">
              {t("common:common.reset")}
            </Button>
            <Button onClick={() => navigate("/global-athletes")}>{t("common:common.cancel")}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<SaveOutlined />}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {t("athlete:actions.create")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default GlobalAthleteCreate;
