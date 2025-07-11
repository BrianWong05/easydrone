import React, { useState } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Avatar
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const TournamentTeams = ({ tournamentId, teams, groups, onRefresh }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 創建或編輯隊伍
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (editingTeam) {
        // 編輯隊伍 - 需要實現編輯API
        await axios.put(`/api/tournaments/${tournamentId}/teams/${editingTeam.team_id}`, values);
        message.success('隊伍更新成功');
      } else {
        // 創建隊伍
        await axios.post(`/api/tournaments/${tournamentId}/teams`, values);
        message.success('隊伍創建成功');
      }
      
      setIsModalVisible(false);
      setEditingTeam(null);
      form.resetFields();
      onRefresh();
    } catch (error) {
      console.error('操作隊伍失敗:', error);
      message.error(error.response?.data?.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  // 刪除隊伍
  const handleDelete = async (teamId) => {
    try {
      await axios.delete(`/api/tournaments/${tournamentId}/teams/${teamId}`);
      message.success('隊伍刪除成功');
      onRefresh();
    } catch (error) {
      console.error('刪除隊伍失敗:', error);
      message.error(error.response?.data?.message || '刪除失敗');
    }
  };

  // 打開創建/編輯模態框
  const openModal = (team = null) => {
    setEditingTeam(team);
    if (team) {
      form.setFieldsValue({
        team_name: team.team_name,
        group_id: team.group_id,
        team_color: team.team_color,
        is_virtual: team.is_virtual
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        team_color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
      });
    }
    setIsModalVisible(true);
  };

  // 獲取小組名稱
  const getGroupName = (groupId) => {
    const group = groups.find(g => g.group_id === groupId);
    return group ? group.group_name : '未分組';
  };

  // 獲取小組標籤
  const getGroupTag = (groupId) => {
    if (!groupId) {
      return <Tag color="default">未分組</Tag>;
    }
    const group = groups.find(g => g.group_id === groupId);
    return group ? <Tag color="blue">小組 {group.group_name}</Tag> : <Tag color="default">未知小組</Tag>;
  };

  const columns = [
    {
      title: '隊伍',
      key: 'team_info',
      render: (_, record) => (
        <Space>
          <Avatar
            style={{ backgroundColor: record.team_color }}
            icon={<TeamOutlined />}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.team_name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.is_virtual ? '虛擬隊伍' : '真實隊伍'}
            </div>
          </div>
        </Space>
      ),
      width: 200
    },
    {
      title: '所屬小組',
      dataIndex: 'group_id',
      key: 'group_id',
      render: (groupId) => getGroupTag(groupId),
      width: 120
    },
    {
      title: '隊員數量',
      key: 'athlete_count',
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#52c41a' }} />
          <span>{record.athlete_count || 0} 人</span>
        </Space>
      ),
      width: 100
    },
    {
      title: '隊伍顏色',
      dataIndex: 'team_color',
      key: 'team_color',
      render: (color) => (
        <Space>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: color,
              border: '1px solid #d9d9d9',
              borderRadius: 4
            }}
          />
          <span style={{ fontFamily: 'monospace' }}>{color}</span>
        </Space>
      ),
      width: 120
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString('zh-TW'),
      width: 120
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="查看詳情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/teams/${record.team_id}`, '_blank')}
            />
          </Tooltip>
          
          <Tooltip title="編輯隊伍">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          
          <Popconfirm
            title="確定要刪除這支隊伍嗎？"
            description="刪除後將無法恢復，相關的隊員和比賽數據也會被刪除。"
            onConfirm={() => handleDelete(record.team_id)}
            okText="確定"
            cancelText="取消"
          >
            <Tooltip title="刪除隊伍">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      width: 120
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>隊伍管理</h3>
          <p style={{ color: '#666', margin: 0 }}>管理錦標賽的參賽隊伍，可以分配到不同小組</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openModal()}
        >
          新增隊伍
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={teams}
        rowKey="team_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
        }}
        locale={{
          emptyText: (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TeamOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <div style={{ marginBottom: 16 }}>
                <span style={{ color: '#999', fontSize: 16 }}>暫無隊伍</span>
              </div>
              <div>
                <span style={{ color: '#999' }}>點擊「新增隊伍」按鈕創建第一支隊伍</span>
              </div>
            </div>
          )
        }}
      />

      <Modal
        title={editingTeam ? '編輯隊伍' : '新增隊伍'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTeam(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ 
            is_virtual: false,
            team_color: '#1890ff'
          }}
        >
          <Form.Item
            name="team_name"
            label="隊伍名稱"
            rules={[
              { required: true, message: '請輸入隊伍名稱' },
              { min: 2, message: '隊伍名稱至少需要2個字符' },
              { max: 100, message: '隊伍名稱不能超過100個字符' }
            ]}
          >
            <Input placeholder="請輸入隊伍名稱" />
          </Form.Item>

          <Form.Item
            name="group_id"
            label="所屬小組"
            help="選擇隊伍所屬的小組，也可以暫時不分組"
          >
            <Select placeholder="請選擇小組" allowClear>
              {groups.map(group => (
                <Option key={group.group_id} value={group.group_id}>
                  小組 {group.group_name} ({group.team_count || 0}/{group.max_teams})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="team_color"
            label="隊伍顏色"
            rules={[
              { required: true, message: '請選擇隊伍顏色' },
              { pattern: /^#[0-9A-Fa-f]{6}$/, message: '請輸入有效的十六進制顏色代碼' }
            ]}
          >
            <Input
              type="color"
              style={{ width: 100, height: 40 }}
              placeholder="#1890ff"
            />
          </Form.Item>

          <Form.Item
            name="is_virtual"
            label="隊伍類型"
            help="虛擬隊伍用於測試或佔位，不參與實際比賽"
          >
            <Select>
              <Option value={false}>真實隊伍</Option>
              <Option value={true}>虛擬隊伍</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingTeam ? '更新' : '創建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TournamentTeams;