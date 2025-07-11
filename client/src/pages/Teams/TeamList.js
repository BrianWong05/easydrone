import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Table, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title } = Typography;

const TeamList = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchTeams(1, 10);
  }, []);

  const fetchTeams = async (page = 1, limit = 10, search = '') => {
    try {
      console.log('正在獲取隊伍數據...');
      setLoading(true);
      
      // 構建查詢參數
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      // 通過nginx代理連接到後端服務
      const response = await axios.get(`/api/teams?${params.toString()}`);
      console.log('API響應:', response.data);
      
      if (response.data.success) {
        // 後端返回的數據結構是 { teams: [], pagination: {} }
        const teamsData = response.data.data?.teams || response.data.data || [];
        const paginationData = response.data.data?.pagination || {};
        
        console.log('獲取到的隊伍數據:', teamsData);
        console.log('分頁數據:', paginationData);
        
        setTeams(teamsData);
        setPagination({
          current: paginationData.page || 1,
          pageSize: paginationData.limit || 10,
          total: paginationData.total || 0
        });
      } else {
        console.warn('API返回失敗狀態:', response.data);
        throw new Error('API返回失敗狀態');
      }
    } catch (error) {
      console.error('獲取隊伍數據失敗:', error);
      console.error('錯誤詳情:', error.response?.data);
      console.error('錯誤狀態:', error.response?.status);
      
      // 不使用模擬數據，顯示錯誤信息
      message.error('無法連接到後端服務器，請檢查服務器狀態');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId) => {
    try {
      const response = await axios.delete(`/api/teams/${teamId}`);
      if (response.data.success) {
        // 從列表中移除已刪除的隊伍
        setTeams(teams.filter(team => team.team_id !== teamId));
        message.success('隊伍刪除成功');
      } else {
        message.error(response.data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除隊伍錯誤:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('刪除失敗，請檢查網絡連接');
      }
    }
  };

  const columns = [
    {
      title: '隊伍名稱',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (text, record) => (
        <Space>
          <div 
            style={{
              width: 20,
              height: 20,
              backgroundColor: record.team_color,
              borderRadius: '50%',
              border: '1px solid #ccc'
            }}
          />
          <span 
            style={{ 
              fontWeight: 'bold',
              color: '#1890ff',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => navigate(`/teams/${record.team_id}`)}
          >
            {text}
          </span>
        </Space>
      ),
    },
    {
      title: '所屬小組',
      dataIndex: 'group_name',
      key: 'group_name',
      render: (group) => (
        <Tag color="blue">小組 {group}</Tag>
      ),
    },
    {
      title: '隊員數量',
      dataIndex: 'athlete_count',
      key: 'athlete_count',
      render: (count) => `${count} 人`,
    },
    {
      title: '隊伍類型',
      dataIndex: 'is_virtual',
      key: 'is_virtual',
      render: (isVirtual) => (
        <Tag color={isVirtual ? 'orange' : 'green'}>
          {isVirtual ? '虛擬隊伍' : '正式隊伍'}
        </Tag>
      ),
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/teams/${record.team_id}`)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => navigate(`/teams/${record.team_id}/edit`)}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除這個隊伍嗎？"
            onConfirm={() => handleDelete(record.team_id)}
            okText="確定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger
              icon={<DeleteOutlined />}
            >
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>隊伍列表</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/teams/create')}
          >
            新增隊伍
          </Button>
        </div>
        
        <Card>
          {teams.length === 0 && !loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', color: '#666' }}>
                  無法載入隊伍數據
                </span>
              </div>
              <Button 
                type="primary" 
                onClick={() => fetchTeams(pagination.current, pagination.pageSize)}
                loading={loading}
              >
                重新載入
              </Button>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={teams}
              loading={loading}
              rowKey="team_id"
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 支隊伍`,
                onChange: (page, pageSize) => {
                  fetchTeams(page, pageSize);
                },
                onShowSizeChange: (current, size) => {
                  fetchTeams(1, size);
                }
              }}
            />
          )}
        </Card>
      </Space>
    </div>
  );
};

export default TeamList;