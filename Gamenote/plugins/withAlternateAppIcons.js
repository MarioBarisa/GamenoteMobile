const { withDangerousMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const ICONS = [
  { file: 'GamenoteIcon-iOS-Default-1024x1024@1x.png', appearances: null },
  { file: 'GamenoteIcon-iOS-ClearLight-1024x1024@1x.png', appearances: [{ appearance: 'luminosity', value: 'light' }] },
  { file: 'GamenoteIcon-iOS-ClearDark-1024x1024@1x.png', appearances: [{ appearance: 'luminosity', value: 'dark' }] },
  { file: 'GamenoteIcon-iOS-TintedLight-1024x1024@1x.png', appearances: [{ appearance: 'luminosity', value: 'tinted' }] },
];

module.exports = function withAlternateAppIcons(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosDir = config.modRequest.platformProjectRoot;
      const assetsDir = path.join(projectRoot, 'assets', 'gamenote', 'icons');
      const appIconDir = path.join(iosDir, 'Gamenote', 'Images.xcassets', 'AppIcon.appiconset');

      if (!fs.existsSync(appIconDir)) {
        fs.mkdirSync(appIconDir, { recursive: true });
      }

      const images = [];

      for (const icon of ICONS) {
        const src = path.join(assetsDir, icon.file);
        const dest = path.join(appIconDir, icon.file);

        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }

        const entry = {
          filename: icon.file,
          idiom: 'universal',
          platform: 'ios',
          size: '1024x1024',
          scale: '1x',
        };

        if (icon.appearances) {
          entry.appearances = icon.appearances;
        }

        images.push(entry);
      }

      const contentsPath = path.join(appIconDir, 'Contents.json');
      const contents = {
        images,
        info: {
          author: 'xcode',
          version: 1,
        },
      };

      fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));

      return config;
    },
  ]);
};
