/**
 * @module LogLevels
 */
JARS.module('System.LogLevels').$import(['*!Registries/Internals', '.::isNumber', '.::isString']).$export(function(InternalsRegistry, isNumber, isString) {
    'use strict';

    var each = InternalsRegistry.get('Helpers/Array').each,
        hasOwnProp = InternalsRegistry.get('Helpers/Object').hasOwnProp,
        DEFAULT_LOGLEVELS = 'log debug info warn error'.split(' '),
        definedLevels = [],
        LogLevels;

    /**
     * @namespace
     *
     * @memberof module:System
     *
     * @alias module:LogLevels
     */
    LogLevels = {
        /**
         * @type {number}
         */
        ALL: -Infinity,
        /**
         * @param {string} level
         * @param {number} priority
         */
        add: function(level, priority) {
            if (!hasLevelPriority(level)) {
                definedLevels.push(level);

                setLevelPriority(level, priority);
            }
        },
        /**
         * @param {JARS~internals.Helpers.Array~Callback} callback
         */
        each: function(callback) {
            each(definedLevels, callback);
        },
        /**
         * @param {string} level
         *
         * @return {number}
         */
        getPriority: function(level) {
            return hasLevelPriority(level) ? getLevelPriority(level) : LogLevels.ALL;
        },
        /**
         * @param {string} level
         * @param {string} requiredLevel
         *
         * @return {boolean}
         */
        comparePriority: function(level, requiredLevel) {
            return LogLevels.getPriority(level) >= LogLevels.getPriority(requiredLevel);
        }
    };

    each(DEFAULT_LOGLEVELS, function addLevel(stdLevel, levelIndex) {
        LogLevels.add(stdLevel, (levelIndex + 1) * 10);
    });

    /**
     * @memberof module:LogLevels
     * @inner
     *
     * @param {string} level
     *
     * @return {boolean}
     */
    function hasLevelPriority(level) {
        return isString(level) && hasOwnProp(LogLevels, level.toUpperCase());
    }

    /**
     * @memberof module:LogLevels
     * @inner
     *
     * @param {string} level
     *
     * @return {number}
     */
    function getLevelPriority(level) {
        return LogLevels[level.toUpperCase()];
    }
    /**
     * @memberof module:LogLevels
     * @inner
     *
     * @param {string} level
     * @return {number}
     */
    function setLevelPriority(level, priority) {
        LogLevels[level.toUpperCase()] = isNumber(priority) ? priority : LogLevels.ALL;
    }

    return LogLevels;
});
