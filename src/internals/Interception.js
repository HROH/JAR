JARS.internal('Interception', function interceptionSetup(InternalsManager) {
    'use strict';

    var Resolver = InternalsManager.get('Resolver'),
        MSG_INTERCEPTION_ERROR = 'error in interception of this module by interceptor "${type}" with data "${data}"';

    /**
     * @class
     *
     * @memberof JARS.internals
     *
     * @param {JARS.internals.Module} listeningModule
     * @param {JARS.internals.InterceptionManager.InterceptionInfo} interceptionInfo
     * @param {JARS.internals.ModuleQueue.SuccessCallback} onSuccess
     * @param {JARS.internals.ModuleQueue.FailCallback} onFail
     */
    function Interception(listeningModule, interceptionInfo, onSuccess, onFail) {
        var interception = this,
            interceptedModuleName = interceptionInfo.moduleName + interceptionInfo.type + interceptionInfo.data;

        interception.listeningModule = listeningModule;
        interception.info = interceptionInfo;

        interception.success = function(data) {
            onSuccess(interceptedModuleName, data);
        };

        interception.fail = function(error) {
            listeningModule.loader.getModule(interceptionInfo.moduleName).logger.error(error || MSG_INTERCEPTION_ERROR, interceptionInfo);

            onFail(interceptedModuleName);
        };
    }

    Interception.prototype = {
        constructor: Interception,
        /**
         * @param {string} fileType
         *
         * @return {string}
         */
        getFilePath: function(fileType) {
            var listeningModule = this.listeningModule;

            return !listeningModule.isRoot() && listeningModule.getFullPath(fileType);
        },
        /**
         * @param {JARS.internals.ModuleDependencies.Declaration} moduleNames
         * @param {JARS.internals.LoaderQueue.ModulesLoadedCallback} onModulesLoaded
         * @param {JARS.internals.ModuleQueue.FailCallback} onModuleAborted
         * @param {JARS.internals.LoaderQueue.ModuleLoadedCallback} onModuleLoaded
         */
        $importAndLink: function(moduleNames, onModulesLoaded, onModuleAborted, onModuleLoaded) {
            var listeningModule = this.listeningModule;

            moduleNames = Resolver.resolve(this.info.moduleName, moduleNames);

            if (!listeningModule.isRoot()) {
                listeningModule.deps.requestAndLink(moduleNames, onModulesLoaded, onModuleAborted, onModuleLoaded);
            }
            else {
                listeningModule.loader.$import(moduleNames, onModulesLoaded, onModuleAborted, onModuleLoaded);
            }
        },
    };

    return Interception;
});
