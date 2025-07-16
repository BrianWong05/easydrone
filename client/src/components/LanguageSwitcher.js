import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const LanguageSwitcher = ({ size = 'default', style = {} }) => {
  const { i18n } = useTranslation();

  const languages = [
    {
      code: 'zh-TW',
      name: '繁體中文'
    },
    {
      code: 'zh-CN',
      name: '简体中文'
    },
    {
      code: 'en',
      name: 'English'
    }
  ];

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
  };


  return (
    <Space style={style}>
      <GlobalOutlined />
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        size={size}
        style={{ minWidth: 120 }}
        dropdownMatchSelectWidth={false}
      >
        {languages.map(language => (
          <Option key={language.code} value={language.code}>
            {language.name}
          </Option>
        ))}
      </Select>
    </Space>
  );
};

export default LanguageSwitcher;