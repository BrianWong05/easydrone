import React from 'react';
import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import zhTW from 'antd/locale/zh_TW';
import enUS from 'antd/locale/en_US';

const LocaleWrapper = ({ children, theme }) => {
  const { i18n } = useTranslation();

  // Map i18n language codes to Ant Design locales
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
    <ConfigProvider 
      locale={getAntdLocale()} 
      theme={theme}
    >
      {children}
    </ConfigProvider>
  );
};

export default LocaleWrapper;