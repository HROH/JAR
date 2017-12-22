JARS.internal('GlobalConfigHooks/Modules', function modulesHookSetup(getInternal) {
    'use strict';

    var ModulesRegistry = getInternal('ModulesRegistry'),
        resolveDeps = getInternal('Resolvers/Dependencies').resolveDeps,
        isBundle = getInternal('Resolvers/Bundle').isBundle,
        arrayEach = getInternal('Utils').arrayEach,
        Modules;

    /**
     * @method
     *
     * @memberof JARS.internals.GlobalConfigHooks
     *
     * @param {JARS.internals.GlobalConfig} globalConfig
     * @param {Object} config
     */
    Modules = function(globalConfig, config) {
        var rootModule = ModulesRegistry.getRoot();

        if(config.restrict) {
            arrayEach(resolveDeps(rootModule, config.restrict), function updateConfig(moduleName) {
                var module = ModulesRegistry.get(moduleName);

                (isBundle(moduleName) ? module.bundle : module).config.update(config);
            });
        }
        else {
            rootModule.config.update(config);
        }
    };

    return Modules;
});
