import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { BarChartOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const GroupStandings = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BarChartOutlined /> 小組積分榜
      </Title>
      
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>查看積分榜選項</Title>
        <Paragraph>
          您可以選擇查看單個小組的詳細積分榜，或查看所有小組的積分榜總覽。
        </Paragraph>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card 
            hoverable
            onClick={() => navigate('/stats/overall')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Meta
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🏆 總排名榜 (所有隊伍)</span>
                  <ArrowRightOutlined />
                </div>
              }
              description="查看所有隊伍的總排名，不分小組，包含詳細統計和頂級表現者"
            />
          </Card>
          
          <Card 
            hoverable
            onClick={() => navigate('/stats/all-groups')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Meta
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📊 所有小組積分榜總覽</span>
                  <ArrowRightOutlined />
                </div>
              }
              description="查看所有小組的積分榜，按小組分類顯示排名對比"
            />
          </Card>
          
          <Card 
            hoverable
            onClick={() => navigate('/groups')}
            style={{ cursor: 'pointer' }}
          >
            <Card.Meta
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🎯 單個小組詳細積分榜</span>
                  <ArrowRightOutlined />
                </div>
              }
              description="選擇特定小組查看詳細的積分榜、隊伍信息和比賽記錄"
            />
          </Card>
        </Space>
      </Card>

      <Card>
        <Title level={4}>積分規則說明</Title>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>勝利：</strong> 3分</li>
          <li><strong>平局：</strong> 1分</li>
          <li><strong>失敗：</strong> 0分</li>
        </ul>
        
        <Title level={4} style={{ marginTop: '16px' }}>排名規則</Title>
        <ol style={{ paddingLeft: '20px' }}>
          <li>積分高者排名靠前</li>
          <li>積分相同時，淨勝球多者排名靠前</li>
          <li>淨勝球相同時，進球數多者排名靠前</li>
        </ol>
      </Card>
    </div>
  );
};

export default GroupStandings;