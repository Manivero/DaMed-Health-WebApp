import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './locales/ru.json';
import en from './locales/en.json';
import kz from './locales/kz.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      kz: { translation: kz },
    },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'en', 'kz'],
    detection: {
      // Сначала смотрим localStorage, потом браузер
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'damed_lang',
    },
    interpolation: {
      escapeValue: false, // React сам экранирует
    },
  });

export default i18n;
