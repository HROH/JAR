JARS.internal('RelativeResolutionStrategy', function relativeResolutionStrategySetup(getInternal) {
    'use strict';

    var isRelative = getInternal('ResolutionHelpers').isRelative,
        AbsoluteResolutionStrategy = getInternal('AbsoluteResolutionStrategy');

    /**
     * @memberof JARS.internals
     *
     * @param {JARS.internals.Module} baseModule
     * @param {string} moduleName
     *
     * @return {string}
     */
    function RelativeResolutionStrategy(baseModule, moduleName) {
        return ((!baseModule.isRoot && isRelative(moduleName)) ?
            RelativeResolutionStrategy(baseModule.deps.parent, moduleName.substr(1)) :
            AbsoluteResolutionStrategy(baseModule, moduleName));
    }

    return RelativeResolutionStrategy;
});
