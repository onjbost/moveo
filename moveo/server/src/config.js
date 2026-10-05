import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// In Home Assistant the add-on options live in /data/options.json.
// In local development we fall back to ./data and environment variables.
const dataDir = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : path.resolve('data'));
const here = path.dirname(fileURLToPath(import.meta.url));

let options = {};
const optionsFile = path.join(dataDir, 'options.json');
if (fs.existsSync(optionsFile)) {
  try {
    options = JSON.parse(fs.readFileSync(optionsFile, 'utf8'));
  } catch (err) {
    console.error('Impossibile leggere options.json:', err.message);
  }
}

const pick = (envName, optName, fallback) => {
  const env = process.env[envName];
  if (env !== undefined && env !== '') return env;
  const opt = options[optName];
  if (opt !== undefined && opt !== null && opt !== '') return opt;
  return fallback;
};

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const bool = (v) => v === true || v === 'true' || v === '1';

export const config = {
  dataDir,
  contentDir: process.env.CONTENT_DIR || path.resolve(here, '../content'),
  port: Number(pick('PORT', 'port', 8788)),
  password: String(pick('MOVEO_PASSWORD', 'password', '')),
  noAuth: process.env.MOVEO_NO_AUTH === '1',
  /** Public address of Moveo: used in the links written into Calendary and in notifications. */
  publicUrl: String(pick('PUBLIC_URL', 'public_url', 'https://moveo.gattucciocloud.it')).replace(/\/$/, ''),
  timezone: String(pick('TZ_OVERRIDE', 'timezone', process.env.TZ || 'Europe/Rome')),
  calendary: {
    /** Internal address: inside Home Assistant the local add-on is reachable as local-calendary. */
    url: String(pick('CALENDARY_URL', 'calendary_url', 'http://local-calendary:8787')).replace(/\/$/, ''),
    token: String(pick('CALENDARY_TOKEN', 'calendary_token', '')),
    calendarName: String(pick('CALENDARY_CALENDAR', 'calendary_calendar', 'Allenamento')),
    /** Public address of Calendary, for the links (and single sign-on) from Moveo to Calendary. */
    publicUrl: String(pick('CALENDARY_PUBLIC_URL', 'calendary_public_url', 'https://calendary.gattucciocloud.it')).replace(/\/$/, ''),
    push: bool(pick('CALENDARY_PUSH', 'calendary_push', true)),
  },
  // Program generator: same OpenAI-compatible endpoint as Calendary's assistant (Gemini by default).
  ai: {
    baseUrl: String(pick('AI_BASE_URL', 'ai_base_url', 'https://generativelanguage.googleapis.com/v1beta/openai')).replace(/\/$/, ''),
    apiKey: String(pick('AI_API_KEY', 'ai_api_key', '')),
    model: String(pick('AI_MODEL', 'ai_model', 'gemini-2.5-flash')),
    fallbackModels: list(pick('AI_FALLBACK_MODELS', 'ai_fallback_models', 'gemini-2.5-flash-lite')),
  },
  // Optional: lists the videos of a YouTube playlist (titles, durations). Without it the plan is built by hand.
  youtube: {
    apiKey: String(pick('YOUTUBE_API_KEY', 'youtube_api_key', '')),
  },
  ha: {
    /** Provided by the Supervisor when the add-on declares homeassistant_api: true. */
    token: process.env.SUPERVISOR_TOKEN || '',
    url: process.env.HA_URL || 'http://supervisor/core',
    /** e.g. "mobile_app_pixel_8, mobile_app_galaxy_tab" (without the "notify." prefix) */
    notifyServices: list(pick('HA_NOTIFY', 'ha_notify_services', '')).map((s) => s.replace(/^notify\./, '')),
    sensors: bool(pick('HA_SENSORS', 'ha_sensors', true)),
  },
};

// Every date computation on the server (plans, break slots) uses local time.
process.env.TZ = config.timezone;
