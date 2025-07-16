import React from 'react';
import { Select } from 'antd';
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
    },
    {
      code: 'pt-PT',
      name: 'Português'
    }
  ];

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="flex items-center space-x-2" style={style}>
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
    </div>
  );
};

export default LanguageSwitcher;