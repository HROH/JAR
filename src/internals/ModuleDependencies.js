JARS.internal('ModuleDependencies', function moduleDependenciesSetup(InternalsManager) {
    'use strict';

    var utils = InternalsManager.get('utils'),
        hasOwnProp = utils.hasOwnProp,
        arrayEach = utils.arrayEach,
        Resolver = InternalsManager.get('Resolver'),
        ModuleLogger = InternalsManager.get('ModuleLogger'),
        LoaderQueue = InternalsManager.get('LoaderQueue'),
        SEPERATOR = '", "',
        FOUND = 'found ',
        FOR_MODULE = ' for module',
        MSG_DEPENDENCY_FOUND = ModuleLogger.addDebug(createFoundMessage('implicit dependency "${dep}"')),
        MSG_DEPENDENCIES_FOUND = ModuleLogger.addDebug(createFoundMessage('explicit dependencie(s) "${deps}"')),
        MSG_CIRCULAR_DEPENDENCIES_FOUND = ModuleLogger.addError(createFoundMessage('circular dependencies "${deps}"'));

    /**
     * @access public
     *
     * @constructor ModuleDependencies
     *
     * @memberof JARS
     * @inner
     *
     * @param {JARS~Module} module
     */
    function ModuleDependencies(module) {
        var moduleDependencies = this;

        moduleDependencies._module = module;
        moduleDependencies._deps = [];

        moduleDependencies._interceptorDeps = [];
    }

    ModuleDependencies.prototype = {
        /**
         * @access public
         *
         * @alias JARS~ModuleDependencies
         *
         * @memberof JARS~ModuleDependencies#
         */
        constructor: ModuleDependencies,

        _hasParent: function() {
            return !this.getParent().isRoot();
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         *
         * @return {JARS~Module}
         */
        getParent: function() {
            var moduleDependencies = this,
                module = moduleDependencies._module;

            return moduleDependencies._parent || (moduleDependencies._parent = module.loader.getModule(Resolver.getImplicitDependencyName(module.name) || Resolver.getRootName()));
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         *
         * @return {String}
         */
        getParentName: function() {
            return this.getParent().name;
        },

        exist: function() {
            return !!this._deps.length;
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         *
         * @param {Boolean} getDynamic
         *
         * @return {String[]}
         */
        getAll: function(getDynamic) {
            var moduleDependencies = this,
                dependencies = moduleDependencies._deps;

            getDynamic && (dependencies = dependencies.concat(moduleDependencies._interceptorDeps));
            moduleDependencies._hasParent() && (dependencies = [moduleDependencies.getParentName()].concat(dependencies));

            return dependencies;
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         *
         * @param {JARS~Module~DependencyDefinition} dependencies
         */
        add: function(dependencies) {
            var moduleDependencies = this;

            moduleDependencies._deps = moduleDependencies._deps.concat(Resolver.resolve(dependencies, moduleDependencies._module.name));
        },

        requestAndLink: function(interceptorDependencies, callback, errback, progressback) {
            var moduleDependencies = this;

            moduleDependencies._interceptorDeps = moduleDependencies._interceptorDeps.concat(interceptorDependencies);

            new LoaderQueue(moduleDependencies._module, false, callback, progressback, errback).loadModules(interceptorDependencies);
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         */
        request: function() {
            var moduleDependencies = this,
                module = moduleDependencies._module,
                state = module.state,
                logger = module.logger,
                dependencies = moduleDependencies._deps;

            if (dependencies.length) {
                logger.log(MSG_DEPENDENCIES_FOUND, {deps: dependencies.join(SEPERATOR)});
            }

            if (moduleDependencies._hasParent()) {
                logger.log(MSG_DEPENDENCY_FOUND, {dep: moduleDependencies.getParentName()});
            }

            new LoaderQueue(module, false, function onModulesLoaded(refs) {
                var parent = moduleDependencies.getParent();

                if (state.isRegistered() && !state.isLoaded()) {
                    parent.isRoot() && refs.unshift(parent.ref);
                    module.init(refs);

                    state.setLoaded();
                    module.queue.notify();
                }
            }).loadModules(moduleDependencies.getAll());
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         *
         * @return {Boolean}
         */
        hasCircular: function() {
            var moduleDependencies = this,
                module = moduleDependencies._module,
                hasCircularDependencies = false,
                circularDependencies;

            if (module.config.get('checkCircularDeps')) {
                circularDependencies = moduleDependencies.getCircular();
                hasCircularDependencies = !! circularDependencies.length;
            }

            hasCircularDependencies && module.logger.log(MSG_CIRCULAR_DEPENDENCIES_FOUND, {deps: circularDependencies.join(SEPERATOR)});

            return hasCircularDependencies;
        },
        /**
         * @access public
         *
         * @memberof JARS~ModuleDependencies#
         *
         * @param {Object<String, Boolean>} [traversedModules]
         *
         * @return {Array}
         */
        getCircular: function(traversedModules) {
            var moduleDependencies = this,
                moduleName = moduleDependencies._module.name,
                dependencies = moduleDependencies.getAll(true),
                circularDependencies = [];

            traversedModules = traversedModules || {};

            if (hasOwnProp(traversedModules, moduleName)) {
                circularDependencies = [moduleName];
            }
            else {
                traversedModules[moduleName] = true;

                arrayEach(dependencies, function findCircularDeps(dependencyName) {
                    circularDependencies = module.loader.getModule(dependencyName).deps.getCircular(traversedModules);

                    if (circularDependencies.length) {
                        circularDependencies.unshift(moduleName);

                        return true;
                    }
                });

                delete traversedModules[moduleName];
            }

            return circularDependencies;
        }
    };

    function createFoundMessage(message) {
        return FOUND + message + FOR_MODULE;
    }

    return ModuleDependencies;
});
