import no from './no.json';
import en from './en.json';

const translations = { no, en };

export function detectLanguage() {
  const stored = localStorage.getItem('language');
  if (stored) return stored;
  const browserLang = navigator.language?.substring(0, 2);
  return browserLang === 'no' || browserLang === 'nb' || browserLang === 'nn' ? 'no' : 'en';
}

export function t(key, lang) {
  const language = lang || detectLanguage();
  return translations[language]?.[key] || translations['no']?.[key] || key;
}

export function setLanguage(lang) {
  localStorage.setItem('language', lang);
}

export function getLanguage() {
  return detectLanguage();
}
