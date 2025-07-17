import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Option } = Select;

const LanguageSwitcher = ({ size = 'default', className = '' }) => {
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
    },
    {
      code: 'pt-PT',
      name: 'Português'
    }
  ];

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <Space className={`flex items-center ${className}`}>
      <GlobalOutlined className="text-gray-600" />
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        size={size}
        className="min-w-[120px]"
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