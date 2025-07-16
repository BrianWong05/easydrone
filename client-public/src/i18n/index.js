import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Load translation using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language
    fallbackLng: 'zh-TW',
    
    // Available languages
    supportedLngs: ['zh-TW', 'zh-CN', 'en', 'pt-PT'],
    
    // Debug mode (set to false in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      
      // Cache user language
      caches: ['localStorage'],
      
      // Optional: exclude certain languages from detection
      excludeCacheFor: ['cimode'],
    },
    
    // Backend options
    backend: {
      // Path to load resources from
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Namespaces
    ns: ['common', 'tournament', 'team', 'match', 'group', 'athlete', 'stats', 'public'],
    defaultNS: 'common',
    
    // Interpolation options
    interpolation: {
      // React already does escaping
      escapeValue: false,
    },
    
    // React options
    react: {
      // Wait for all namespaces to be loaded before rendering
      wait: true,
      // Use Suspense for loading
      useSuspense: true,
    },
    
    // Pluralization
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Missing key handling
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation: ${lng}.${ns}.${key}`);
      }
    },
  });

export default i18n;