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
  // TEMPORARILY DISABLED: EAS Build doesn't support MusicKit entitlements
  // Will re-enable when we can build with Xcode locally
  // config = withEntitlementsPlist(config, (config) => {
  //   config.modResults['com.apple.developer.media-library-access'] = true;
  //   config.modResults['com.apple.developer.musickit'] = [
  //     'media.com.timilehin.mixtape.musickit'
  //   ];
  //   return config;
  // });

  return config;
};

module.exports = withMusicKit;