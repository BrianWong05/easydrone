import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div style={{ padding: '50px 0', textAlign: 'center' }}>
      <Result
        status="404"
        title={t('notFound.title')}
        subTitle={t('notFound.subtitle')}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {t('notFound.backHome')}
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;