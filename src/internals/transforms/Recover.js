JARS.internal('transforms/Recover', function recoverTransformSetup(InternalsManager) {
    'use strict';

    var objectMerge = InternalsManager.get('Utils').objectMerge,
        Recover;

    /**
     * @memberof JARS.internals
     */
    Recover = {
        type: 'object',
        /**
         * @param {object} recoverConfig
         * @param {(JARS.internals.Module|JARS.internals.Bundle)} [moduleOrBundle]
         *
         * @return {object}
         */
        transform: function(recoverConfig, moduleOrBundle) {
            // create a copy of the recover-config
            // because it should update for every module independently
            var recover = objectMerge({}, recoverConfig);

            recover.restrict = moduleOrBundle.name;
            // if no next recover-config is given set it explicitly
            // this is important because the recoverflow is as follows:
            // - if the module has a recover-config, use it to update its config
            // - if it has no recover-config look for it in a higher bundle-config
            // - if such a config is found, update the config for the module
            // - when the module-config is updated, options will always be overwritten but never deleted
            // So if the module has a recover-config that doesn't get replaced
            // it may repeatedly try to recover with this config
            recover.recover || (recover.recover = null);

            return recover;
        }
    };

    return Recover;
});