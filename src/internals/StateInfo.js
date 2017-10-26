JARS.internal('StateInfo', function stateInfoSetup(InternalsManager) {
    'use strict';

    var Utils = InternalsManager.get('Utils'),
        arrayEach = Utils.arrayEach,
        objectMerge = Utils.objectMerge,
        defaultLogMethods = {
            attempt: 'warn',

            done: 'info'
        },
        loadLogMethods = {
            attempt: 'info'
        },
        waiting, loading, registered, loaded, aborted;

    /**
     * @class
     *
     * @memberof JARS.internals
     *
     * @param {string} stateText
     * @param {Object} logMethods
     */
    function StateInfo(stateText, logMethods) {
        var stateInfo = this;

        logMethods || (logMethods = {});

        stateInfo.text = stateText;
        stateInfo.methods = objectMerge(objectMerge({}, defaultLogMethods), logMethods);
    }

    /**
     * @return {JARS.internals.StateInfo}
     */
    StateInfo.initial = function() {
        return waiting;
    };

    /**
     * @param {function(JARS.internals.StateInfo)} callback
     */
    StateInfo.each = function(callback) {
        arrayEach([waiting, loading, registered, loaded, aborted], callback);
    };

    StateInfo.prototype = {
        constructor: StateInfo,
        /**
         * @param {JARS.internals.StateInfo} nextStateInfo
         *
         * @return {boolean}
         */
        hasNext: function(nextStateInfo) {
            return this._next.indexOf(nextStateInfo) > -1;
        },
        /**
         * @param {JARS.internals.StateInfo[]} nextStateInfos
         */
        setNext: function(nextStateInfos) {
            this._next = nextStateInfos;
        }
    };

    waiting = new StateInfo('waiting');

    loading = new StateInfo('loading', loadLogMethods);

    registered = new StateInfo('registered');

    loaded = new StateInfo('loaded', loadLogMethods);

    aborted = new StateInfo('aborted', {
        done: 'error'
    });

    waiting.setNext([loading, registered]);
    loading.setNext([registered, aborted]);
    registered.setNext([loaded, aborted]);
    loaded.setNext([waiting]);
    aborted.setNext([waiting]);

    return StateInfo;
});