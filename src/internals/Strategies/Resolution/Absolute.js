JARS.internal('Strategies/Resolution/Absolute', function(getInternal) {
    'use strict';

    var VersionResolutionStrategy = getInternal('Strategies/Resolution/Version'),
        RelativeResolver = getInternal('Resolvers/Relative'),
        MSG_ABSOLUTE_RESOLUTION_ERROR = 'a module can not be resolved beyond the root';

    /**
     * @memberof JARS~internals.Strategies.Resolution
     *
     * @param {JARS~internals.Subjects.Module} baseModule
     * @param {string} moduleName
     *
     * @return {string}
     */
    function Absolute(baseModule, moduleName) {
        return (baseModule.isRoot || RelativeResolver(moduleName)) ? {
            error: MSG_ABSOLUTE_RESOLUTION_ERROR
        } : VersionResolutionStrategy(baseModule, moduleName);
    }

    return Absolute;
});
