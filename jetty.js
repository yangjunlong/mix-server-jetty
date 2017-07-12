/**
 * mix-server-jetty (a jetty server)
 * this is default server
 * 
 * @usage
 * var server = mix.require('server', 'jetty');
 * server.start();
 *
 * @see  https://github.com/fex-team/fis-command-server/blob/master/lib/java.js
 * 
 * @author  Yang,junlong at 2016-03-17 18:42:17 build.
 * @version $Id$
 */

var child_process = require('child_process');
var spawn = child_process.spawn;

// jetty server extends mix.server
var jetty = module.exports = mix.server.derive(function(options) {
    this.options = options;
},{
    start: function(options, callback) {
        var type = options.type;

        switch (type) {
            case 'php':
                this.startPHP(options, callback);
                break;
            default:
                this.startJava(options, callback);
                break;
        }
    },
    startPHP: function(options, callback) {
        var that = this;
        that.checkJavaEnable(options, function(java, options) {
            if (java) {
                that.checkPHPEnable(options, function(php, options) {
                    if (php) {
                        start(options, callback);
                    }
                });
            }
        })
    },
    startJava: function(options, callback) {
        this.checkJavaEnable(options, function(java, options) {
            if (java) {
                // java
                delete options.php_exec;
                start(options, callback);
            }
        })
    }
}).factory();

function start (options, callback) {
    var jetty_jar = './jetty.jar';
    var timeout = Math.max(options.timeout * 1000, 5000); 
    delete options.timeout;

    var errMsg = 'mix-server fails to start at port [' + options.port + '], error: ';

    var args = [
        '-Dorg.apache.jasper.compiler.disablejsr199=true',
        // '-Djava.nio.channels.spi.SelectorProvider=sun.nio.ch.PollSelectorProvider',
        '-jar', jetty_jar
    ];

    var ready = false;
    var log = '';

    mix.util.map(options, function(value, key){
        args.push('--' + key, String(value));
    });
    
    // start child process (java&jetty)
    var server = spawn('java', args, { cwd : __dirname, detached: true });

    // start callback
    server.stderr.on('data', function(chunk){
        //console.log(chunk.toString('utf8'));
        if(ready) {
            return;
        }
        chunk = chunk.toString('utf8');
        log += chunk;
        process.stdout.write('.');
        if(chunk.indexOf('Started SelectChannelConnector@') > 0 || chunk.indexOf('Started SslSocketConnector@') > 0){
            ready = true;
            process.stdout.write(' at port [' + options.port + ']\n');

            callback && callback(server, options);

        } else if(chunk.indexOf('Exception') > 0) {
            process.stdout.write(' fail\n');
            try { 
                process.kill(server.pid, 'SIGKILL'); 
            } catch(e){

            }
            var match = chunk.match(/exception:?\s+([^\r\n]+)/i);
            if(match){
                errMsg += match[1];
            } else {
                errMsg += 'unknown';
            }
            console.log(log);
            mix.log.error(errMsg);
        }
    });

    // start server error
    server.on('error', function(err){
        try { 
            process.kill(server.pid, 'SIGKILL'); 
        } catch(e){

        }
        mix.log.error(err);
    });

    server.unref();

    // start server timeout error
    setTimeout(function(){
        process.stdout.write(' fail\n');
        if(log) console.log(log);
        mix.log.error(errMsg + 'timeout');
    }, timeout);
}
