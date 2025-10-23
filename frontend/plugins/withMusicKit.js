const {
  withXcodeProject,
  withInfoPlist,
  withEntitlementsPlist
} = require('@expo/config-plugins');

/**
 * Expo config plugin to add native MusicKit support
 * Adds frameworks, entitlements, and Info.plist entries for Apple Music
 */
const withMusicKit = (config, options = {}) => {
  const { developerTeamId } = options;

  // Add MusicKit frameworks
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Add MusicKit framework
    xcodeProject.addFramework('MusicKit.framework', {
      weak: true,
      sign: false,
    });

    // Add MediaPlayer framework
    xcodeProject.addFramework('MediaPlayer.framework', {
      weak: true,
      sign: false,
    });

    return config;
  });

  // Add Apple Music usage description to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSAppleMusicUsageDescription =
      config.modResults.NSAppleMusicUsageDescription ||
      'This app uses Apple Music to let you share and discover music in real-time broadcasts.';

    return config;
  });

  // Add MusicKit entitlements
  config = withEntitlementsPlist(config, (config) => {
    // Media library access entitlement
    config.modResults['com.apple.developer.media-library-access'] = true;

    // MusicKit entitlement with Team ID
    if (developerTeamId) {
      config.modResults['com.apple.developer.musickit'] = [
        `${developerTeamId}.${config.ios?.bundleIdentifier || 'com.mobilemixtape.app'}`
      ];
    }

    return config;
  });

  return config;
};

module.exports = withMusicKit;