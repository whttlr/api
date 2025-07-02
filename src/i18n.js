/**
 * Internationalization (i18n) setup
 * Basic i18n functionality for the CNC API
 */

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize i18next
i18next
  .use(Backend)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: false,
    
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },
    
    ns: ['messages'],
    defaultNS: 'messages',
    
    interpolation: {
      escapeValue: false, // not needed for server side
    },
  });

export default i18next;