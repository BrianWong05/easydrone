import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Table, 
  Tag, 
  Descriptions, 
  message, 
  Spin, 
  Alert,
  Divider,
  Modal,
  List
} from 'antd';
import { 
  TeamOutlined, 
  TrophyOutlined, 
  PlusOutlined, 
  CalendarOutlined,
  ArrowLeftOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [allTeams, setAllTeams] = useState([]);
  const [addTeamModalVisible, setAddTeamModalVisible] = useState(false);

  useEffect(() => {
    fetchGroupData();
    fetchAllTeams();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/groups/${id}`);
      if (response.data.success) {
        setGroupData(response.data.data.group);
        setTeams(response.data.data.teams || []);
        setMatches(response.data.data.matches || []);
        // Calculate standings from the fetched data
        calculateStandings(response.data.data.teams || [], response.data.data.matches || []);
      }
    } catch (error) {
      console.error('獲取小組數據失敗:', error);
      message.error('獲取小組數據失敗');
    } finally {
      setLoading(false);
    }
  };

  // Calculate standings from teams and matches data
  const calculateStandings = (teamsData, matchesData) => {
    console.log('🔄 Calculating standings for teams:', teamsData);
    console.log('🔄 Using matches:', matchesData);
    
    // Initialize standings for all teams in the group
    const standingsMap = {};
    teamsData.forEach(team => {
      standingsMap[team.team_id] = {
        team_id: team.team_id,
        team_name: team.team_name,
        team_color: team.team_color,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0
      };
    });
    
    // Process completed matches
    const completedMatches = matchesData.filter(match => match.match_status === 'completed');
    console.log('🏆 Processing completed matches:', completedMatches.length);
    
    completedMatches.forEach(match => {
      const team1Id = match.team1_id;
      const team2Id = match.team2_id;
      const team1Score = match.team1_score || 0;
      const team2Score = match.team2_score || 0;
      
      if (standingsMap[team1Id] && standingsMap[team2Id]) {
        // Update team1 stats
        standingsMap[team1Id].played += 1;
        standingsMap[team1Id].goals_for += team1Score;
        standingsMap[team1Id].goals_against += team2Score;
        
        // Update team2 stats
        standingsMap[team2Id].played += 1;
        standingsMap[team2Id].goals_for += team2Score;
        standingsMap[team2Id].goals_against += team1Score;
        
        // Determine winner and update points
        if (team1Score > team2Score) {
          // Team1 wins
          standingsMap[team1Id].won += 1;
          standingsMap[team1Id].points += 3;
          standingsMap[team2Id].lost += 1;
        } else if (team2Score > team1Score) {
          // Team2 wins
          standingsMap[team2Id].won += 1;
          standingsMap[team2Id].points += 3;
          standingsMap[team1Id].lost += 1;
        } else {
          // Draw
          standingsMap[team1Id].drawn += 1;
          standingsMap[team1Id].points += 1;
          standingsMap[team2Id].drawn += 1;
          standingsMap[team2Id].points += 1;
        }
        
        console.log(`📊 Updated: ${match.team1_name} ${team1Score}-${team2Score} ${match.team2_name}`);
      }
    });
    
    // Convert to array and sort by points, goal difference, goals for
    const standingsArray = Object.values(standingsMap).sort((a, b) => {
      // Sort by points (descending)
      if (b.points !== a.points) return b.points - a.points;
      
      // Then by goal difference (descending)
      const goalDiffA = a.goals_for - a.goals_against;
      const goalDiffB = b.goals_for - b.goals_against;
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
      
      // Then by goals for (descending)
      return b.goals_for - a.goals_for;
    });
    
    console.log('🏆 Final standings:', standingsArray);
    setStandings(standingsArray);
  };

  const fetchGroupStandings = () => {
    // Recalculate standings from current data
    calculateStandings(teams, matches);
  };

  const fetchAllTeams = async () => {
    try {
      const response = await axios.get('/api/teams?limit=1000');
      if (response.data.success) {
        setAllTeams(response.data.data.teams || []);
      }
    } catch (error) {
      console.error('獲取隊伍列表錯誤:', error);
    }
  };

  const handleAddTeam = async (teamId) => {
    try {
      // Get the team's current data first
      const teamResponse = await axios.get(`/api/teams/${teamId}`);
      if (!teamResponse.data.success) {
        message.error('無法獲取隊伍信息');
        return;
      }
      
      const teamData = teamResponse.data.data.team;
      console.log('🔍 Current team data:', teamData);
      
      // Prepare the update payload with all required fields
      const updatePayload = {
        team_name: teamData.team_name,
        group_id: parseInt(id),
        team_color: teamData.team_color,
        is_virtual: teamData.is_virtual || false
      };
      
      console.log('📤 Sending update payload:', updatePayload);
      
      const response = await axios.put(`/api/teams/${teamId}`, updatePayload);
      
      console.log('📥 Server response:', response.data);
      
      if (response.data.success) {
        message.success('隊伍已添加到小組');
        // 重新獲取小組數據
        fetchGroupData();
        fetchGroupStandings();
        fetchAllTeams();
        setAddTeamModalVisible(false);
      } else {
        console.error('❌ Server returned error:', response.data.message);
        message.error(response.data.message || '添加失敗');
      }
    } catch (error) {
      console.error('❌ 添加隊伍錯誤:', error);
      console.error('❌ Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || '添加隊伍失敗';
      message.error(errorMessage);
    }
  };

  // 獲取可添加的隊伍（沒有小組或不在當前小組的隊伍）
  const getAvailableTeams = () => {
    const currentTeamIds = teams.map(team => team.team_id);
    return allTeams.filter(team => 
      !team.group_id || !currentTeamIds.includes(team.team_id)
    );
  };

  const handleDeleteMatch = (matchId, matchNumber) => {
    Modal.confirm({
      title: '確認刪除',
      content: `確定要刪除比賽 "${matchNumber}" 嗎？此操作無法撤銷。`,
      okText: '確認刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await axios.delete(`/api/matches/${matchId}`);
          
          if (response.data.success) {
            message.success('比賽刪除成功！');
            // 重新獲取小組數據以更新比賽列表和積分榜
            fetchGroupData();
          } else {
            message.error(response.data.message || '刪除失敗');
          }
        } catch (error) {
          console.error('刪除比賽錯誤:', error);
          if (error.response?.data?.message) {
            message.error(error.response.data.message);
          } else {
            message.error('刪除失敗，請重試');
          }
        }
      },
    });
  };

  const teamColumns = [
    {
      title: '隊伍名稱',
      dataIndex: 'team_name',
      key: 'team_name',
    },
    {
      title: '隊伍顏色',
      dataIndex: 'team_color',
      key: 'team_color',
      render: (color) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 20, 
              height: 20, 
              backgroundColor: color, 
              marginRight: 8,
              border: '1px solid #d9d9d9'
            }} 
          />
          {color}
        </div>
      ),
    },
    {
      title: '是否虛擬隊伍',
      dataIndex: 'is_virtual',
      key: 'is_virtual',
      render: (isVirtual) => (
        <Tag color={isVirtual ? 'orange' : 'green'}>
          {isVirtual ? '虛擬' : '真實'}
        </Tag>
      ),
    },
  ];

  const standingsColumns = [
    {
      title: '排名',
      key: 'rank',
      render: (_, record, index) => (
        <span style={{ 
          fontWeight: 'bold', 
          fontSize: '16px',
          color: index === 0 ? '#faad14' : index === 1 ? '#52c41a' : '#1890ff'
        }}>
          {index + 1}
        </span>
      ),
      width: 60,
    },
    {
      title: '隊伍',
      key: 'team',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: 16, 
              height: 16, 
              backgroundColor: record.team_color, 
              marginRight: 8,
              border: '1px solid #d9d9d9',
              borderRadius: '2px'
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
            {record.team_name}
          </span>
        </div>
      ),
    },
    {
      title: '場次',
      dataIndex: 'played',
      key: 'played',
      width: 60,
      align: 'center',
    },
    {
      title: '勝',
      dataIndex: 'won',
      key: 'won',
      width: 50,
      align: 'center',
      render: (won) => <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{won}</span>
    },
    {
      title: '平',
      dataIndex: 'drawn',
      key: 'drawn',
      width: 50,
      align: 'center',
      render: (drawn) => <span style={{ color: '#faad14', fontWeight: 'bold' }}>{drawn}</span>
    },
    {
      title: '負',
      dataIndex: 'lost',
      key: 'lost',
      width: 50,
      align: 'center',
      render: (lost) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{lost}</span>
    },
    {
      title: '進球',
      dataIndex: 'goals_for',
      key: 'goals_for',
      width: 60,
      align: 'center',
    },
    {
      title: '失球',
      dataIndex: 'goals_against',
      key: 'goals_against',
      width: 60,
      align: 'center',
    },
    {
      title: '淨勝球',
      key: 'goal_difference',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const diff = record.goals_for - record.goals_against;
        return (
          <span style={{ 
            color: diff > 0 ? '#52c41a' : diff < 0 ? '#ff4d4f' : '#666',
            fontWeight: 'bold'
          }}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        );
      }
    },
    {
      title: '積分',
      dataIndex: 'points',
      key: 'points',
      width: 60,
      align: 'center',
      render: (points) => (
        <span style={{ 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#1890ff' 
        }}>
          {points}
        </span>
      )
    },
  ];

  const matchColumns = [
    {
      title: '比賽場次',
      dataIndex: 'match_number',
      key: 'match_number',
      render: (text, record) => (
        <span 
          style={{ 
            fontWeight: 'bold', 
            color: '#1890ff', 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          {text}
        </span>
      ),
    },
    {
      title: '對陣隊伍',
      key: 'teams',
      render: (_, record) => (
        <div 
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/matches/${record.match_id}`)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Text 
                strong 
                style={{ 
                  color: record.match_status === 'completed' && record.winner_id === record.team1_id ? '#52c41a' : '#1890ff',
                  fontWeight: record.match_status === 'completed' && record.winner_id === record.team1_id ? 'bold' : 'normal'
                }}
              >
                {record.team1_name}
              </Text>
              {record.match_status === 'completed' && (
                <span style={{ margin: '0 8px', fontSize: '16px', fontWeight: 'bold' }}>
                  {record.team1_score}
                </span>
              )}
            </div>
            
            <Text style={{ margin: '0 8px', color: '#666' }}>vs</Text>
            
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
              {record.match_status === 'completed' && (
                <span style={{ margin: '0 8px', fontSize: '16px', fontWeight: 'bold' }}>
                  {record.team2_score}
                </span>
              )}
              <Text 
                strong 
                style={{ 
                  color: record.match_status === 'completed' && record.winner_id === record.team2_id ? '#52c41a' : '#1890ff',
                  fontWeight: record.match_status === 'completed' && record.winner_id === record.team2_id ? 'bold' : 'normal'
                }}
              >
                {record.team2_name}
              </Text>
            </div>
          </div>
          
          {record.match_status === 'completed' && (
            <div style={{ marginTop: '4px', textAlign: 'center' }}>
              {record.winner_id ? (
                <div>
                  <Tag color="green" size="small">
                    🏆 {record.winner_id === record.team1_id ? record.team1_name : record.team2_name} 獲勝
                  </Tag>
                  {record.win_reason && (
                    <Tag color="blue" size="small" style={{ marginLeft: '4px' }}>
                      {record.win_reason === 'score' ? '比分勝出' :
                       record.win_reason === 'fouls' ? '犯規較少' :
                       record.win_reason === 'referee' ? '裁判判決' : record.win_reason}
                    </Tag>
                  )}
                </div>
              ) : (
                <Tag color="orange" size="small">
                  🤝 平局
                </Tag>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '比賽時間',
      dataIndex: 'match_date',
      key: 'match_date',
      render: (date) => new Date(date).toLocaleString('zh-TW'),
    },
    {
      title: '狀態',
      dataIndex: 'match_status',
      key: 'match_status',
      render: (status, record) => {
        const statusMap = {
          pending: { color: 'orange', text: '待開始' },
          active: { color: 'green', text: '進行中' },
          completed: { color: 'blue', text: '已完成' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            {status === 'completed' && record.team1_fouls !== undefined && record.team2_fouls !== undefined && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                犯規: {record.team1_fouls} - {record.team2_fouls}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            size="small"
            onClick={() => navigate(`/matches/${record.match_id}`)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small"
            onClick={() => navigate(
              record.match_status === 'completed' 
                ? `/matches/${record.match_id}/result-edit`
                : `/matches/${record.match_id}/edit`
            )}
          >
            {record.match_status === 'completed' ? '編輯結果' : '編輯'}
          </Button>
          <Button 
            type="link" 
            size="small"
            danger
            onClick={() => handleDeleteMatch(record.match_id, record.match_number)}
          >
            刪除
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>載入中...</p>
      </div>
    );
  }

  if (!groupData) {
    return (
      <Alert
        message="小組不存在"
        description="找不到指定的小組，請檢查URL是否正確"
        type="error"
        showIcon
      />
    );
  }

  const canGenerateMatches = teams.length >= 2 && matches.length === 0;

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
        >
          返回
        </Button>
      </Space>

      <Title level={2}>
        <TeamOutlined /> 小組 {groupData.group_name} 詳情
      </Title>

      <Card style={{ marginBottom: '24px' }}>
        <Descriptions bordered>
          <Descriptions.Item label="小組名稱">{groupData.group_name}</Descriptions.Item>
          <Descriptions.Item label="最大隊伍數">{groupData.max_teams}</Descriptions.Item>
          <Descriptions.Item label="當前隊伍數">{teams.length}</Descriptions.Item>
          <Descriptions.Item label="總比賽場次">{matches.length}</Descriptions.Item>
          <Descriptions.Item label="已完成比賽">
            {matches.filter(m => m.match_status === 'completed').length}
          </Descriptions.Item>
          <Descriptions.Item label="創建時間">
            {new Date(groupData.created_at).toLocaleString('zh-TW')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card 
        title={<><TeamOutlined /> 隊伍列表 ({teams.length})</>}
        style={{ marginBottom: '24px' }}
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setAddTeamModalVisible(true)}
            >
              添加隊伍
            </Button>
          </Space>
        }
      >
        <Table
          columns={teamColumns}
          dataSource={teams}
          rowKey="team_id"
          pagination={false}
          locale={{ emptyText: '暫無隊伍' }}
        />
      </Card>

      {/* 小組積分榜 */}
      <Card 
        title={<><BarChartOutlined /> 小組積分榜</>}
        style={{ marginBottom: '24px' }}
        extra={
          <Button 
            type="link" 
            onClick={fetchGroupStandings}
            loading={standingsLoading}
          >
            刷新積分榜
          </Button>
        }
      >
        {teams.length === 0 ? (
          <Alert
            message="暫無隊伍"
            description="請先添加隊伍到此小組"
            type="warning"
            showIcon
          />
        ) : (
          <Table
            columns={standingsColumns}
            dataSource={standings}
            rowKey="team_id"
            pagination={false}
            size="small"
            locale={{ emptyText: '暫無積分榜數據' }}
            style={{ marginTop: '16px' }}
          />
        )}
        
        {teams.length > 0 && (
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
            <p><strong>積分規則：</strong> 勝利 3分，平局 1分，失敗 0分</p>
            <p><strong>排名規則：</strong> 積分 → 淨勝球 → 進球數</p>
            {matches.filter(m => m.match_status === 'completed').length === 0 && (
              <p><strong>提示：</strong> 完成比賽後積分榜將自動更新</p>
            )}
          </div>
        )}
      </Card>

      <Card 
        title={<><TrophyOutlined /> 比賽列表 ({matches.length})</>}
        extra={
          <Space>
            {canGenerateMatches ? (
              <Button 
                type="primary" 
                icon={<CalendarOutlined />}
                onClick={() => navigate(`/groups/${id}/generate-matches`)}
              >
                生成循環賽
              </Button>
            ) : (
              <Button 
                icon={<PlusOutlined />}
                onClick={() => navigate(`/matches/create?group_id=${id}`)}
                disabled={teams.length < 2}
              >
                添加比賽
              </Button>
            )}
          </Space>
        }
      >
        {teams.length < 2 ? (
          <Alert
            message="無法創建比賽"
            description="至少需要2支隊伍才能創建比賽"
            type="warning"
            showIcon
          />
        ) : matches.length === 0 ? (
          <Alert
            message="尚未創建比賽"
            description="點擊上方「生成循環賽」按鈕可以自動創建小組內所有隊伍的循環賽"
            type="info"
            showIcon
          />
        ) : (
          <Table
            columns={matchColumns}
            dataSource={matches}
            rowKey="match_id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '暫無比賽' }}
          />
        )}
      </Card>

      {/* 添加隊伍模態框 */}
      <Modal
        title="添加隊伍到小組"
        open={addTeamModalVisible}
        onCancel={() => setAddTeamModalVisible(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setAddTeamModalVisible(false);
                navigate('/teams/create');
              }}
            >
              創建新隊伍
            </Button>
            <Button onClick={() => setAddTeamModalVisible(false)}>
              關閉
            </Button>
          </div>
        }
        width={600}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>選擇要添加到小組 {groupData?.group_name} 的隊伍：</Text>
          <Button 
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              setAddTeamModalVisible(false);
              navigate('/teams/create');
            }}
          >
            創建隊伍
          </Button>
        </div>
        
        {(() => {
          const availableTeams = getAvailableTeams();
          return availableTeams.length > 0 ? (
            <List
              dataSource={availableTeams}
              renderItem={(team) => (
                <List.Item
                  actions={[
                    <Button 
                      type="primary"
                      size="small"
                      onClick={() => handleAddTeam(team.team_id)}
                    >
                      添加到小組
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div 
                        style={{
                          width: 32,
                          height: 32,
                          backgroundColor: team.team_color,
                          borderRadius: '50%',
                          border: '1px solid #d9d9d9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      >
                        {team.team_name.charAt(0)}
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{team.team_name}</Text>
                        {team.is_virtual && <Tag color="orange" size="small">虛擬</Tag>}
                        {team.group_id && team.group_id !== parseInt(id) && (
                          <Tag color="red" size="small">已在其他小組</Tag>
                        )}
                      </Space>
                    }
                    description={`隊伍顏色: ${team.team_color}`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <TeamOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
              <div>
                <Text type="secondary">沒有可添加的隊伍</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  所有隊伍都已分配到小組或已在當前小組中
                </Text>
                <br />
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  style={{ marginTop: '16px' }}
                  onClick={() => {
                    setAddTeamModalVisible(false);
                    navigate('/teams/create');
                  }}
                >
                  創建新隊伍
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default GroupDetail;