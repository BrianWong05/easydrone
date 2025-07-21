import React, { useState } from 'react';
import { Upload, Avatar, Button, message, Modal } from 'antd';
import { UserOutlined, UploadOutlined, DeleteOutlined, CameraOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const AvatarUpload = ({ 
  athleteId, 
  currentAvatar, 
  onAvatarChange, 
  size = 100,
  showUploadButton = true,
  disabled = false 
}) => {
  const { t } = useTranslation(['athlete', 'common']);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleUpload = async (file) => {
    if (!athleteId) {
      message.error(t('athlete:messages.athleteIdRequired'));
      return false;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
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

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/athletes/${athleteId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        message.success(t('athlete:messages.avatarUploadSuccess'));
        if (onAvatarChange) {
          onAvatarChange(data.data.avatar_url);
        }
      } else {
        message.error(data.message || t('athlete:messages.avatarUploadFailed'));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      message.error(t('athlete:messages.avatarUploadFailed'));
    } finally {
      setLoading(false);
    }

    return false; // Prevent default upload behavior
  };

  const handleDelete = async () => {
    if (!athleteId || !currentAvatar) return;

    Modal.confirm({
      title: t('athlete:messages.confirmDeleteAvatar'),
      content: t('athlete:messages.deleteAvatarWarning'),
      okText: t('common:actions.delete'),
      cancelText: t('common:actions.cancel'),
      okType: 'danger',
      onOk: async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/athletes/${athleteId}/avatar`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });

          const data = await response.json();

          if (data.success) {
            message.success(t('athlete:messages.avatarDeleteSuccess'));
            if (onAvatarChange) {
              onAvatarChange(null);
            }
          } else {
            message.error(data.message || t('athlete:messages.avatarDeleteFailed'));
          }
        } catch (error) {
          console.error('Avatar delete error:', error);
          message.error(t('athlete:messages.avatarDeleteFailed'));
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const avatarSrc = currentAvatar ? `${currentAvatar}?t=${Date.now()}` : null;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
        <Avatar
          size={size}
          src={avatarSrc}
          icon={!avatarSrc && <UserOutlined />}
          style={{ 
            cursor: avatarSrc ? 'pointer' : 'default',
            border: '2px solid #d9d9d9'
          }}
          onClick={() => avatarSrc && setPreviewVisible(true)}
        />
        
        {!disabled && showUploadButton && (
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="image/*"
            disabled={loading}
          >
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<CameraOutlined />}
              loading={loading}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                zIndex: 1
              }}
            />
          </Upload>
        )}
      </div>

      {!disabled && showUploadButton && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="image/*"
            disabled={loading}
          >
            <Button 
              icon={<UploadOutlined />} 
              loading={loading}
              size="small"
            >
              {currentAvatar ? t('athlete:actions.changeAvatar') : t('athlete:actions.uploadAvatar')}
            </Button>
          </Upload>
          
          {currentAvatar && (
            <Button 
              icon={<DeleteOutlined />} 
              danger 
              size="small"
              onClick={handleDelete}
              loading={loading}
            >
              {t('athlete:actions.deleteAvatar')}
            </Button>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewVisible}
        title={t('athlete:labels.avatarPreview')}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        centered
      >
        <div style={{ textAlign: 'center' }}>
          <img
            alt="avatar"
            style={{ width: '100%', maxWidth: 400 }}
            src={avatarSrc}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AvatarUpload;