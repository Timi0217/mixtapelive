import Constants from 'expo-constants';

// Get environment variables from app.json extra field or from process.env in development
const getEnvVariable = (key, defaultValue) => {
  // In Expo, environment variables are stored in Constants.expoConfig.extra or Constants.manifest.extra
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  return extra[key] || process.env[key] || defaultValue;
};

// Environment configuration
export const config = {
  // API Configuration
  API_BASE_URL: getEnvVariable('API_BASE_URL', 
    __DEV__ ? 'http://localhost:3000/api' : 'https://carefree-love-production-2e42.up.railway.app/api'
  ),
  
  // App Configuration  
  APP_ENV: getEnvVariable('APP_ENV', __DEV__ ? 'development' : 'production'),
  
  // Feature Flags
  ENABLE_DEBUG_LOGS: getEnvVariable('ENABLE_DEBUG_LOGS', false),
  
  // Deep Link Configuration
  DEEP_LINK_SCHEME: getEnvVariable('DEEP_LINK_SCHEME', 'mixtape'),
};

// Log configuration in development only
if (__DEV__) {
  console.log('Frontend Environment Configuration:', {
    API_BASE_URL: config.API_BASE_URL,
    APP_ENV: config.APP_ENV,
    ENABLE_DEBUG_LOGS: config.ENABLE_DEBUG_LOGS,
    DEEP_LINK_SCHEME: config.DEEP_LINK_SCHEME,
  });
}

export default config;
