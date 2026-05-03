import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LANGUAGES = [
  { code: 'ru', label: 'РУС', fullName: 'Русский', flag: '🇷🇺' },
  { code: 'kz', label: 'ҚАЗ', fullName: 'Қазақша', flag: '🇰🇿' },
  { code: 'en', label: 'ENG', fullName: 'English',  flag: '🇬🇧' },
];

export default function LanguageSwitcher({ variant = 'dropdown' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  // Закрыть при клике вне компонента
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  // Вариант: три кнопки рядом (для мобильной шапки или настроек)
  if (variant === 'pills') {
    return (
      <div className="lang-pills" role="group" aria-label="Выбор языка">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            className={`lang-pill ${i18n.language === lang.code ? 'active' : ''}`}
            onClick={() => changeLanguage(lang.code)}
            aria-pressed={i18n.language === lang.code}
            title={lang.fullName}
          >
            {lang.label}
          </button>
        ))}
      </div>
    );
  }

  // Вариант по умолчанию: выпадающий список
  return (
    <div className="lang-switcher" ref={ref}>
      <button
        className="lang-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Язык: ${current.fullName}`}
      >
        <span className="lang-flag" aria-hidden="true">{current.flag}</span>
        <span className="lang-code">{current.label}</span>
        <svg
          className={`lang-chevron ${open ? 'open' : ''}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul className="lang-dropdown" role="listbox" aria-label="Список языков">
          {LANGUAGES.map(lang => (
            <li
              key={lang.code}
              role="option"
              aria-selected={i18n.language === lang.code}
              className={`lang-option ${i18n.language === lang.code ? 'selected' : ''}`}
              onClick={() => changeLanguage(lang.code)}
              onKeyDown={(e) => e.key === 'Enter' && changeLanguage(lang.code)}
              tabIndex={0}
            >
              <span className="lang-flag" aria-hidden="true">{lang.flag}</span>
              <span className="lang-option-name">{lang.fullName}</span>
              {i18n.language === lang.code && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
