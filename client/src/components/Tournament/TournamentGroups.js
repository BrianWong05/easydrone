import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Tag,
  Progress,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import axios from 'axios';

const TournamentGroups = ({ tournamentId, groups, onRefresh }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 創建或編輯小組
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (editingGroup) {
        // 編輯小組 - 需要實現編輯API
        await axios.put(`/api/tournaments/${tournamentId}/groups/${editingGroup.group_id}`, values);
        message.success('小組更新成功');
      } else {
        // 創建小組
        await axios.post(`/api/tournaments/${tournamentId}/groups`, values);
        message.success('小組創建成功');
      }
      
      setIsModalVisible(false);
      setEditingGroup(null);
      form.resetFields();
      onRefresh();
    } catch (error) {
      console.error('操作小組失敗:', error);
      message.error(error.response?.data?.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  // 刪除小組
  const handleDelete = async (groupId) => {
    try {
      await axios.delete(`/api/tournaments/${tournamentId}/groups/${groupId}`);
      message.success('小組刪除成功');
      onRefresh();
    } catch (error) {
      console.error('刪除小組失敗:', error);
      message.error(error.response?.data?.message || '刪除失敗');
    }
  };

  // 打開創建/編輯模態框
  const openModal = (group = null) => {
    setEditingGroup(group);
    if (group) {
      const displayGroupName = group.group_name?.includes('_') ? group.group_name.split('_')[0] : group.group_name;
      form.setFieldsValue({
        group_name: displayGroupName,
        max_teams: group.max_teams
      });
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: '小組名稱',
      dataIndex: 'group_name',
      key: 'group_name',
      render: (text) => {
        const displayName = text?.includes('_') ? text.split('_')[0] : text;
        return (
          <Space>
            <TrophyOutlined style={{ color: '#faad14' }} />
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>小組 {displayName}</span>
          </Space>
        );
      }
    },
    {
      title: '隊伍數量',
      key: 'team_count',
      render: (_, record) => (
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <span>{record.team_count || 0} / {record.max_teams}</span>
          <Progress
            percent={Math.round(((record.team_count || 0) / record.max_teams) * 100)}
            size="small"
            style={{ width: 60 }}
            showInfo={false}
          />
        </Space>
      ),
      width: 150
    },
    {
      title: '比賽進度',
      key: 'match_progress',
      render: (_, record) => {
        const total = record.total_matches || 0;
        const completed = record.completed_matches || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return (
          <div style={{ width: 120 }}>
            <Progress
              percent={progress}
              size="small"
              format={() => `${completed}/${total}`}
            />
          </div>
        );
      },
      width: 150
    },
    {
      title: '狀態',
      key: 'status',
      render: (_, record) => {
        const teamCount = record.team_count || 0;
        const maxTeams = record.max_teams;
        const totalMatches = record.total_matches || 0;
        const completedMatches = record.completed_matches || 0;

        if (teamCount === 0) {
          return <Tag color="default">空小組</Tag>;
        } else if (teamCount < maxTeams) {
          return <Tag color="orange">未滿員</Tag>;
        } else if (totalMatches === 0) {
          return <Tag color="blue">待排賽</Tag>;
        } else if (completedMatches === totalMatches) {
          return <Tag color="green">已完成</Tag>;
        } else {
          return <Tag color="processing">進行中</Tag>;
        }
      },
      width: 100
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="編輯小組">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          
          <Popconfirm
            title="確定要刪除這個小組嗎？"
            description="刪除後將無法恢復，相關的隊伍和比賽也會被影響。"
            onConfirm={() => handleDelete(record.group_id)}
            okText="確定"
            cancelText="取消"
          >
            <Tooltip title="刪除小組">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      width: 100
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>小組管理</h3>
          <p style={{ color: '#666', margin: 0 }}>管理錦標賽的小組設置，每個小組可以包含多支隊伍</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          新增小組
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={groups}
        rowKey="group_id"
        pagination={false}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TrophyOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <div style={{ marginBottom: 16 }}>
                <span style={{ color: '#999', fontSize: 16 }}>暫無小組</span>
              </div>
              <div>
                <span style={{ color: '#999' }}>點擊「新增小組」按鈕創建第一個小組</span>
              </div>
            </div>
          )
        }}
      />

      <Modal
        title={editingGroup ? '編輯小組' : '新增小組'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingGroup(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ max_teams: 4 }}
        >
          <Form.Item
            name="group_name"
            label="小組名稱"
            rules={[
              { required: true, message: '請輸入小組名稱' },
              { len: 1, message: '小組名稱必須是單個字符' },
              { pattern: /^[A-Z]$/, message: '小組名稱必須是大寫字母' }
            ]}
          >
            <Input
              placeholder="例如：A"
              maxLength={1}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>

          <Form.Item
            name="max_teams"
            label="最大隊伍數"
            rules={[
              { required: true, message: '請輸入最大隊伍數' },
              { type: 'number', min: 2, max: 8, message: '隊伍數必須在2-8之間' }
            ]}
          >
            <InputNumber
              min={2}
              max={8}
              style={{ width: '100%' }}
              placeholder="建議4支隊伍"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingGroup ? '更新' : '創建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TournamentGroups;