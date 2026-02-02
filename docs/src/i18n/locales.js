/**
 * Pulse Documentation - Supported Locales
 * Using inline SVG flags for cross-platform compatibility (Windows doesn't render emoji flags)
 */

// SVG flag templates (16x12 viewBox for consistent sizing)
const flags = {
  // UK - Union Jack (simplified)
  en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="20" height="12">
    <rect fill="#012169" width="60" height="30"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/>
    <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/>
  </svg>`,
  // France - Blue White Red
  fr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="20" height="12">
    <rect fill="#002395" width="1" height="2"/>
    <rect fill="#fff" x="1" width="1" height="2"/>
    <rect fill="#ED2939" x="2" width="1" height="2"/>
  </svg>`,
  // Spain - Red Yellow Red with coat of arms hint
  es: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="20" height="12">
    <rect fill="#AA151B" width="3" height="2"/>
    <rect fill="#F1BF00" y="0.5" width="3" height="1"/>
  </svg>`,
  // Germany - Black Red Yellow
  de: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3" width="20" height="12">
    <rect fill="#000" width="5" height="1"/>
    <rect fill="#D00" y="1" width="5" height="1"/>
    <rect fill="#FFCE00" y="2" width="5" height="1"/>
  </svg>`,
  // Japan - White with red circle
  ja: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="20" height="12">
    <rect fill="#fff" width="3" height="2"/>
    <circle fill="#BC002D" cx="1.5" cy="1" r="0.6"/>
  </svg>`,
  // Brazil - Green with yellow diamond
  pt: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" width="20" height="12">
    <rect fill="#009B3A" width="20" height="14"/>
    <polygon fill="#FEDF00" points="10,1 19,7 10,13 1,7"/>
    <circle fill="#002776" cx="10" cy="7" r="3"/>
  </svg>`,
  // Iceland - Blue with red/white cross
  is: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 18" width="20" height="12">
    <rect fill="#02529C" width="25" height="18"/>
    <rect fill="#fff" x="7" width="4" height="18"/>
    <rect fill="#fff" y="7" width="25" height="4"/>
    <rect fill="#DC1E35" x="8" width="2" height="18"/>
    <rect fill="#DC1E35" y="8" width="25" height="2"/>
  </svg>`,
  // Esperanto - Green with star
  eo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width="20" height="12">
    <rect fill="#009B48" width="3" height="2"/>
    <polygon fill="#fff" points="1.5,0.2 1.65,0.7 1.2,0.45 1.8,0.45 1.35,0.7" transform="translate(0, 0.15)"/>
  </svg>`
};

export const locales = {
  en: { name: 'English', flag: flags.en, dir: 'ltr' },
  fr: { name: 'Français', flag: flags.fr, dir: 'ltr' },
  es: { name: 'Español', flag: flags.es, dir: 'ltr' },
  de: { name: 'Deutsch', flag: flags.de, dir: 'ltr' },
  ja: { name: '日本語', flag: flags.ja, dir: 'ltr' },
  pt: { name: 'Português', flag: flags.pt, dir: 'ltr' },
  is: { name: 'Íslenska', flag: flags.is, dir: 'ltr' },
  eo: { name: 'Esperanto', flag: flags.eo, dir: 'ltr' }
};

export const defaultLocale = 'en';

export const localeKeys = Object.keys(locales);

/**
 * Check if a string is a valid locale code
 */
export function isValidLocale(code) {
  return code in locales;
}
