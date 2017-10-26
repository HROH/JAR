JARS.internal('LogWrap', function logWrapSetup(InternalsManager) {
    'use strict';

    var getInternal = InternalsManager.get,
        System = getInternal('System');

    /**
     * @class
     *
     * @memberof JARS.internals
     *
     * @param {string} loggerContext
     */
    function LogWrap(loggerContext) {
        this._context = loggerContext;
    }

    getInternal('Utils').arrayEach(['debug', 'error', 'info', 'warn'], function addForward(methodName) {
        LogWrap.prototype[methodName] = function(message, values) {
            var SystemLogger = System.Logger;

            if (SystemLogger) {
                SystemLogger[methodName + 'WithContext'](this._context, message, values);
            }
        };
    });

    /**
     * @method JARS.internals.LogWrap#debug
     *
     * @param {string} message
     * @param {Object} [values]
     */

    /**
     * @method JARS.internals.LogWrap#error
     *
     * @param {string} message
     * @param {Object} [values]
     */

    /**
     * @method JARS.internals.LogWrap#info
     *
     * @param {string} message
     * @param {Object} [values]
     */

    /**
     * @method JARS.internals.LogWrap#warn
     *
     * @param {string} message
     * @param {Object} [values]
     */

    return LogWrap;
});