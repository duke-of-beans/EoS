/**
 * Purpose: Build scripts to create single executable distributions
 * Dependencies: pkg, ncc, Node.js fs
 * API: Run via npm scripts to create platform-specific executables
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

class SauronBuilder {
  constructor() {
    this.version = '1.0.0';
    this.outputDir = './dist';
    this.platforms = {
      win: 'node18-win-x64',
      mac: 'node18-macos-x64',
      linux: 'node18-linux-x64'
    };
  }

  /**
   * Main build process
   */
  async build(platform = 'all') {
    try {
      console.log('🔨 Starting Eye of Sauron build process...');

      await this.prepareBuild();
      await this.bundleResources();

      if (platform === 'all') {
        await this.buildAllPlatforms();
      } else {
        await this.buildPlatform(platform);
      }

      await this.createInstallers();
      await this.generateChecksums();

      console.log('✅ Build complete! Check ./dist folder');

    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Prepare build environment
   */
  async prepareBuild() {
    console.log('📁 Preparing build directory...');

    // Clean and create dist directory
    try {
      await fs.rm(this.outputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, ignore
    }

    await fs.mkdir(this.outputDir, { recursive: true });

    // Verify required files exist
    const requiredFiles = [
      'standalone-launcher.js',
      'eye-of-sauron-dashboard.html',
      'sauron-cli.js',
      'core/EyeOfSauronOmniscient.js',
      'package.json'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    console.log('✅ Build environment ready');
  }

  /**
   * Bundle resources into the executable
   */
  async bundleResources() {
    console.log('📦 Bundling resources...');

    // Create bundle configuration
    const bundleConfig = {
      entry: './standalone-launcher.js',
      assets: [
        'eye-of-sauron-dashboard.html',
        'ui/**/*',
        'src/render/**/*',
        'config/**/*'
      ],
      target: 'node18'
    };

    // Write bundle config
    await fs.writeFile(
      './bundle.config.json',
      JSON.stringify(bundleConfig, null, 2)
    );

    console.log('✅ Resources bundled');
  }

  /**
   * Build for all platforms
   */
  async buildAllPlatforms() {
    console.log('🌐 Building for all platforms...');

    for (const [platform, target] of Object.entries(this.platforms)) {
      await this.buildPlatform(platform);
    }
  }

  /**
   * Build for specific platform
   */
  async buildPlatform(platform) {
    const target = this.platforms[platform];
    if (!target) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    console.log(`🔨 Building for ${platform}...`);

    const outputName = this.getOutputName(platform);
    const outputPath = path.join(this.outputDir, outputName);

    try {
      // Build with pkg
      const pkgCommand = `npx pkg standalone-launcher.js --targets ${target} --output ${outputPath}`;
      await execAsync(pkgCommand);

      // Verify output file exists
      await fs.access(outputPath);

      // Get file size
      const stats = await fs.stat(outputPath);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(1);

      console.log(`✅ ${platform} build complete: ${outputName} (${sizeInMB}MB)`);

    } catch (error) {
      throw new Error(`Failed to build ${platform}: ${error.message}`);
    }
  }

  /**
   * Create installers for each platform
   */
  async createInstallers() {
    console.log('📦 Creating installers...');

    // Windows installer (NSIS script)
    await this.createWindowsInstaller();

    // macOS installer (DMG creation script)
    await this.createMacInstaller();

    // Linux installer (AppImage or .deb)
    await this.createLinuxInstaller();

    console.log('✅ Installers created');
  }

  /**
   * Create Windows installer script
   */
  async createWindowsInstaller() {
    const nsisScript = `
!define APP_NAME "Eye of Sauron"
!define APP_VERSION "${this.version}"
!define APP_PUBLISHER "Sauron Technologies"
!define APP_EXE "sauron-win.exe"

Name "\${APP_NAME}"
OutFile "Eye-of-Sauron-Setup-\${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES\\Eye of Sauron"

Section "Install"
  SetOutPath $INSTDIR
  File "sauron-win.exe"

  CreateDirectory "$SMPROGRAMS\\Eye of Sauron"
  CreateShortCut "$SMPROGRAMS\\Eye of Sauron\\Eye of Sauron.lnk" "$INSTDIR\\sauron-win.exe"
  CreateShortCut "$DESKTOP\\Eye of Sauron.lnk" "$INSTDIR\\sauron-win.exe"

  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\EyeOfSauron" "DisplayName" "\${APP_NAME}"
  WriteRegStr HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\EyeOfSauron" "UninstallString" "$INSTDIR\\Uninstall.exe"

  WriteUninstaller "$INSTDIR\\Uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\\sauron-win.exe"
  Delete "$INSTDIR\\Uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\\Eye of Sauron\\Eye of Sauron.lnk"
  RMDir "$SMPROGRAMS\\Eye of Sauron"
  Delete "$DESKTOP\\Eye of Sauron.lnk"

  DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\EyeOfSauron"
SectionEnd
`;

    await fs.writeFile(path.join(this.outputDir, 'installer.nsi'), nsisScript);
  }

  /**
   * Create macOS installer script
   */
  async createMacInstaller() {
    const macScript = `#!/bin/bash
# macOS DMG Creator for Eye of Sauron

APP_NAME="Eye of Sauron"
APP_VERSION="${this.version}"
DMG_NAME="Eye-of-Sauron-\${APP_VERSION}.dmg"

# Create app bundle structure
mkdir -p "\${APP_NAME}.app/Contents/MacOS"
mkdir -p "\${APP_NAME}.app/Contents/Resources"

# Copy executable
cp sauron-mac "\${APP_NAME}.app/Contents/MacOS/sauron"

# Create Info.plist
cat > "\${APP_NAME}.app/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>sauron</string>
    <key>CFBundleIdentifier</key>
    <string>com.sauron.eyeofsauron</string>
    <key>CFBundleName</key>
    <string>\${APP_NAME}</string>
    <key>CFBundleVersion</key>
    <string>\${APP_VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>\${APP_VERSION}</string>
</dict>
</plist>
EOF

# Create DMG
hdiutil create -volname "\${APP_NAME}" -srcfolder "\${APP_NAME}.app" -ov -format UDZO "\${DMG_NAME}"

echo "macOS installer created: \${DMG_NAME}"
`;

    await fs.writeFile(path.join(this.outputDir, 'create-mac-installer.sh'), macScript);
    await execAsync(`chmod +x ${path.join(this.outputDir, 'create-mac-installer.sh')}`);
  }

  /**
   * Create Linux installer script
   */
  async createLinuxInstaller() {
    const linuxScript = `#!/bin/bash
# Linux installer for Eye of Sauron

APP_NAME="eye-of-sauron"
APP_VERSION="${this.version}"
INSTALL_DIR="/opt/eye-of-sauron"

echo "Installing Eye of Sauron v\${APP_VERSION}..."

# Create installation directory
sudo mkdir -p "\${INSTALL_DIR}"

# Copy executable
sudo cp sauron-linux "\${INSTALL_DIR}/sauron"
sudo chmod +x "\${INSTALL_DIR}/sauron"

# Create symlink for global access
sudo ln -sf "\${INSTALL_DIR}/sauron" /usr/local/bin/sauron

# Create desktop entry
cat > ~/.local/share/applications/eye-of-sauron.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Eye of Sauron
Comment=All-seeing code analysis framework
Exec=/usr/local/bin/sauron
Icon=\${INSTALL_DIR}/icon.png
Terminal=false
Categories=Development;
EOF

echo "Installation complete!"
echo "Run 'sauron' to start the application"
`;

    await fs.writeFile(path.join(this.outputDir, 'install-linux.sh'), linuxScript);
    await execAsync(`chmod +x ${path.join(this.outputDir, 'install-linux.sh')}`);
  }

  /**
   * Generate checksums for all files
   */
  async generateChecksums() {
    console.log('🔐 Generating checksums...');

    const checksums = [];
    const files = await fs.readdir(this.outputDir);

    for (const file of files) {
      if (file.endsWith('.exe') || file.endsWith('-mac') || file.endsWith('-linux')) {
        const filePath = path.join(this.outputDir, file);
        const { createHash } = await import('crypto');
        const hash = createHash('sha256');
        const content = await fs.readFile(filePath);
        hash.update(content);
        const checksum = hash.digest('hex');

        checksums.push(`${checksum}  ${file}`);
      }
    }

    await fs.writeFile(
      path.join(this.outputDir, 'SHA256SUMS'),
      checksums.join('\n') + '\n'
    );

    console.log('✅ Checksums generated');
  }

  /**
   * Get output filename for platform
   */
  getOutputName(platform) {
    switch (platform) {
      case 'win':
        return 'sauron-win.exe';
      case 'mac':
        return 'sauron-mac';
      case 'linux':
        return 'sauron-linux';
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }
}

// Export for use in npm scripts
export { SauronBuilder };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const platform = process.argv[2] || 'all';
  const builder = new SauronBuilder();
  builder.build(platform);
}