JARS.internal('Processors/Module', function(getInternal) {
    'use strict';

    var AutoAborter = getInternal('Helpers/AutoAborter'),
        PathResolver = getInternal('Resolvers/Path'),
        loadSource = getInternal('SourceManager').load;

    /**
     * @class
     *
     * @memberof JARS~internals.Processors
     *
     * @param {JARS~internals.Subjects.Module}
     */
    function Module(module) {
        this.module = module;
    }

    Module.prototype = {
        constructor: Module,
        /**
         * @method
         */
        load: function() {
            var module = this.module,
                path = PathResolver(module);

            if (module.state.setLoading()) {

                AutoAborter.setup(module, path);

                loadSource(path);
            }
        },
        /**
         * @param {JARS~internals.Handlers.Request#onModulesLoaded} registerCallback
         */
        register: function(registerCallback) {
            var module = this.module;

            if (module.state.setRegistered()) {
                AutoAborter.clear(module);

                module.deps.request(registerCallback);
            }
        }
    };

    return Module;
});
