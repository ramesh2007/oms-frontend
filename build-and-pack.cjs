const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Starting HalaMama cPanel Deployment Packaging ===');

const stagingDir = path.join(__dirname, 'build-staging');
const zipFile = path.join(__dirname, 'halamama-cpanel-deployment.zip');
const distZipFile = path.join(__dirname, 'halamama-cpanel-dist-only.zip');

const ignoreList = [
  'node_modules',
  '.git',
  '.tanstack',
  'build-staging',
  'halamama-cpanel-deployment.zip',
  'halamama-cpanel-dist-only.zip',
  'order-management-deployment.zip',
  'route-my-order-deployment.zip',
  '.env',
  '.DS_Store',
  'Thumbs.db'
];

function shouldIgnore(name) {
  return ignoreList.includes(name);
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (shouldIgnore(path.basename(src))) return;
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    if (shouldIgnore(path.basename(src))) return;
    fs.copyFileSync(src, dest);
  }
}

try {
  // Step 1: Build the Admin Dashboard
  console.log('\n[1/5] Building Admin Dashboard...');
  execSync('npm run build', { stdio: 'inherit' });

  // Step 2: Build the RouteMyOrder App
  console.log('\n[2/5] Building RouteMyOrder Application...');
  execSync('npm run build', { cwd: path.join(__dirname, 'route-my-order'), stdio: 'inherit' });

  // Step 3: Merge RouteMyOrder Build into Admin Dashboard Build
  console.log('\n[3/5] Merging build outputs...');
  const mainDist = path.join(__dirname, 'dist');
  const rmoDistTarget = path.join(mainDist, 'route-my-order');
  const rmoDistSrc = path.join(__dirname, 'route-my-order', 'dist');

  if (fs.existsSync(rmoDistTarget)) {
    fs.rmSync(rmoDistTarget, { recursive: true, force: true });
  }
  
  // Recursively copy RMO build to dist/route-my-order
  fs.mkdirSync(rmoDistTarget, { recursive: true });
  const copyDir = (src, dest) => {
    fs.readdirSync(src).forEach(child => {
      const srcPath = path.join(src, child);
      const destPath = path.join(dest, child);
      if (fs.statSync(srcPath).isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  };
  copyDir(rmoDistSrc, rmoDistTarget);
  console.log('Merged RouteMyOrder into dist/route-my-order/');

  // Ensure .htaccess exists in mainDist
  const htaccessSrc = path.join(__dirname, 'public', '.htaccess');
  const htaccessDest = path.join(mainDist, '.htaccess');
  if (fs.existsSync(htaccessSrc)) {
    fs.copyFileSync(htaccessSrc, htaccessDest);
    console.log('Copied .htaccess to dist/.htaccess');
  }

  // Step 4: Prepare Staging Area
  console.log('\n[4/5] Preparing staging directory...');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // Copy workspace to staging (ignores node_modules, etc.)
  copyRecursive(__dirname, stagingDir);

  // Copy the final combined dist folder to staging explicitly
  const stagingDist = path.join(stagingDir, 'dist');
  if (fs.existsSync(stagingDist)) {
    fs.rmSync(stagingDist, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDist, { recursive: true });
  copyDir(mainDist, stagingDist);
  console.log('Staging area prepared.');

  // Helper function for cross-platform compression
  function compressFolder(sourceDir, targetZip) {
    if (fs.existsSync(targetZip)) {
      fs.unlinkSync(targetZip);
    }
    if (process.platform === 'win32') {
      const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${targetZip}' -Force"`;
      execSync(psCommand, { stdio: 'inherit' });
    } else {
      execSync(`zip -r -q "${targetZip}" .`, { cwd: sourceDir, stdio: 'inherit' });
    }
  }

  // Step 5: Compress to ZIP
  console.log('\n[5/5] Compressing staging directory to ZIP file...');
  compressFolder(stagingDir, zipFile);
  console.log(`Successfully generated full package: ${zipFile}`);

  // Compress only the dist folder
  console.log('\nCompressing compiled dist directory to ZIP file...');
  compressFolder(mainDist, distZipFile);
  console.log(`Successfully generated dist-only package: ${distZipFile}`);

  // Clean up
  console.log('\nCleaning up staging directory...');
  fs.rmSync(stagingDir, { recursive: true, force: true });
  console.log('Cleanup complete.');
  console.log('\n=== Package Prepared for cPanel Deployment ===');

} catch (err) {
  console.error('\n*** ERROR DURING PACKAGING ***');
  console.error(err);
  // Clean up staging directory if error occurs
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  process.exit(1);
}
