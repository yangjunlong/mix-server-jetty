/**
 * xpage-server-jetty
 *
 * a jetty server
 *
 * @see  https://github.com/fex-team/fis-command-server/blob/master/lib/java.js
 * 
 * @author  Yang,junlong at 2016-03-17 18:42:17 build.
 * @version $Id$
 */

var child_process = require('child_process');
var spawn = child_process.spawn;

var jetty = module.exports;

var jetty_jar = './jetty.jar';

// start jetty server
jetty.start = function(option, callback) {
	var timeout = Math.max(option.timeout * 1000, 5000); 
	delete option.timeout;

	var errMsg = 'xpage-server fails to start at port [' + option.port + '], error: ';

	var args = [
        '-Dorg.apache.jasper.compiler.disablejsr199=true',
        //'-Djava.nio.channels.spi.SelectorProvider=sun.nio.ch.PollSelectorProvider',
        '-jar', jetty_jar
    ];

    var ready = false;
    var log = '';

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
        if(chunk.indexOf('Started SelectChannelConnector@') > 0 
                || chunk.indexOf('Started SslSocketConnector@') > 0){
            ready = true;
            process.stdout.write(' at port [' + option.port + ']\n');

            callback && callback(chunk);

            setTimeout(function(){
                var protocol = option.https ? "https" : "http"; 
                xpage.server.open(protocol + '://127.0.0.1' + (option.port == 80 ? '/' : ':' + option.port + '/'), function(){
                    process.exit();
                });
            }, 200);
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
            fis.log.error(errMsg);
        }
    });

    // start server error
    server.on('error', function(err){
        try { 
        	process.kill(server.pid, 'SIGKILL'); 
        } catch(e){

        }
        fis.log.error(err);
    });

    server.unref();

    fis.util.write(xpage.server.getPidFile(), server.pid);

    // start server timeout error
    setTimeout(function(){
        process.stdout.write(' fail\n');
        if(log) console.log(log);
        fis.log.error(errMsg + 'timeout');
    }, timeout);
};
