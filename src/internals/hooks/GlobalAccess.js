JARS.internal('hooks/GlobalAccess', function globalAccessHookSetup(getInternal) {
    'use strict';

    var ModulesRegistry = getInternal('ModulesRegistry'),
        GlobalAccess;

    /**
     * @param {JARS.internals.GlobalConfig} globalConfig
     * @param {boolean} makeGlobal
     *
     * @return {boolean}
     */
    GlobalAccess = function(globalConfig, makeGlobal) {
        if (makeGlobal) {
            JARS.mods = ModulesRegistry.getRoot().ref;
            JARS.internals = getInternal('InternalsManager');
        }
        else {
            delete JARS.mods;
            delete JARS.internals;
        }

        return !!makeGlobal;
    };

    return GlobalAccess;
});
