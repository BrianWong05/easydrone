import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import App from './App';
import './index.css';
import './i18n';

const AppWithLocale = () => {
  const { i18n } = useTranslation();
  
  const getAntdLocale = () => {
    switch (i18n.language) {
      case 'en':
        return enUS;
      case 'zh-TW':
      default:
        return zhTW;
    }
  };

  return (
    <ConfigProvider locale={getAntdLocale()}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithLocale />
  </React.StrictMode>
);