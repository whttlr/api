import i18n from 'i18next';
import Backend from 'i18next-fs-backend';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

i18n
  .use(Backend)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false, // Reduced verbosity - only enable for development
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json')
    },
    ns: ['messages'],
    defaultNS: 'messages',
    
    // Reduce console warnings
    saveMissing: false,
    missingKeyHandler: false,
    
    // Improve performance and reduce warnings
    interpolation: {
      escapeValue: false // React already escapes values
    },
    
    // Reduce initialization warnings
    initImmediate: false,
    
    // Handle missing translations gracefully
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false
  });

export default i18n;