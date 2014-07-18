var path  = require('path'),
    spawn = require('child_process').spawn,
    module_home = path.join(__dirname, '..');

if (process.getuid && process.getuid() === 0 && process.platform !== 'win32') {
    process.env.HOME = path.join(module_home, 'bower_home');
}

spawn(path.join('node_modules', '.bin', 'bower'), ['install', '--config.interactive=false', '--allow-root'], {cwd: module_home, stdio: 'inherit'});