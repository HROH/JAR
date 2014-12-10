JAR.register({
    MID: 'jar.async',
    deps: '.lang.Array',
    bundle: ['AnimationExecutor', 'Deferred', 'I$Executor', 'Importer', 'Number', 'Promise', 'Request', 'TimeoutExecutor', 'Scheduler', 'Value.*']
}, function(Arr) {
    'use strict';

    var async = {
        wait: function(fn, wait) {
            var args = Arr.from(arguments).slice(2);

            window.setTimeout(function tick() {
                fn.apply(null, args);
            }, Number(wait) || 0);
        }
    };

    return async;
});