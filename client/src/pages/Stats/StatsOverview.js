import React from 'react';
import { Card, Typography, Row, Col, Button } from 'antd';
import { BarChartOutlined, TrophyOutlined, FireOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const StatsOverview = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>統計概覽</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={<><TrophyOutlined /> 總排名榜</>}
            extra={<Button type="link" onClick={() => navigate('/stats/overall-leaderboard')}>查看</Button>}
          >
            <p>查看所有隊伍的總排名和積分統計</p>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={<><BarChartOutlined /> 小組積分榜</>}
            extra={<Button type="link" onClick={() => navigate('/stats/group-standings')}>查看</Button>}
          >
            <p>查看各小組內的積分排名</p>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Card 
            title={<><FireOutlined /> 最佳球隊統計</>}
            extra={<Button type="link" onClick={() => navigate('/stats/best-teams')}>查看</Button>}
          >
            <p>分析最佳進攻和防守球隊，可自選比賽範圍</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatsOverview;