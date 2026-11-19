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

// Основной код языка без региона и без «технических» вариантов: 'en-US' → 'en'. Единая точка для
// всего, что передаёт язык наружу (например, серверу AI-ассистента), чтобы не зависеть от того, что
// именно вернул детектор (i18n.language может быть и 'en-US').
export const currentLang = () => (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0];

// Язык документа и заголовок вкладки следуют языку интерфейса: <html lang> нужен скринридерам,
// переводчику браузера и подбору шрифтов — иначе английский интерфейс объявлял бы себя русским.
// Код казахского в приложении — 'kz' (нестандартный, ISO — 'kk', см. TD-018); для HTML-атрибута
// отдаём корректный BCP-47 'kk', не меняя внутренний код и сохранённые у пользователей значения.
const HTML_LANG = { ru: 'ru', en: 'en', kz: 'kk' };
const applyDocumentLanguage = () => {
  const lng = currentLang();
  document.documentElement.lang = HTML_LANG[lng] || lng;
  document.title = i18n.t('meta.title');
};
i18n.on('languageChanged', applyDocumentLanguage);
applyDocumentLanguage();

export default i18n;
