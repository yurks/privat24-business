var path  = require('path'),
    spawn = require('child_process').spawn,
    module_home = path.join(__dirname, '..'),
    spawn_args = [path.join('node_modules', '.bin', 'bower'), 'install', '--config.interactive=false', '--allow-root'];

if (process.platform === 'win32') {
    spawn_args.unshift('/c');
    spawn_args.unshift('cmd');
} else if (!!process.env.npm_config_global) {
    // if installing globally with `sudo npm -g`
    // then bower can't get access to its cache located in user profile
    // because it running with root permissions
    process.env.HOME = path.join(module_home, 'bower_home');
}

spawn(spawn_args.shift(), spawn_args, {cwd: module_home, stdio: 'inherit'});
