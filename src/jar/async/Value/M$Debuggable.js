JAR.module('jar.async.Value.M$Debuggable').$import({
    System: [
        '::isA',
        'Logger'
    ],
    'jar.lang': [
        'Mixin',
        'Object'
    ]
}).$export(function(isA, Logger, Mixin, Obj) {
    'use strict';

    var debuggedValues = {},
        M$Debuggable,
        MSG_VALUE_UPDATE = 'Got update for ${hash} with value ${val}',
        MSG_VALUE_ERROR = 'Got error for ${hash} with message ${msg}',
        MSG_VALUE_FREEZE = 'Froze ${hash}';

    M$Debuggable = new Mixin('Debuggable', {
        debug: function(customLogger) {
            var logger = isA(customLogger, Logger) ? customLogger : this.Class.logger,
                hash = this.getHash(),
                data = {
                    hash: hash
                },
                subscriptionID;

            if (!debuggedValues[hash]) {
                subscriptionID = this.subscribe({
                    update: function(newValue) {
                        logger.log(MSG_VALUE_UPDATE, Obj.extend({
                            val: newValue
                        }, data));
                    },

                    error: function(newError) {
                        logger.error(MSG_VALUE_ERROR, Obj.extend({
                            msg: newError.message
                        }, data));
                    },

                    freeze: function() {
                        logger.log(MSG_VALUE_FREEZE, Obj.copy(data));
                    }
                });

                subscriptionID && (debuggedValues[hash] = subscriptionID);
            }

            return this;
        },

        undebug: function() {
            var hash = this.getHash(),
                subscription = debuggedValues[hash];

            delete debuggedValues[hash];

            return this.unsubscribe(subscription);
        }
    }, {
        classes: [this]
    });

    return M$Debuggable;
});