(function globalSetup(global, undef) {
    'use strict';

    var rootModule = '*',
        separator = '", "',
        slash = '/',
        object = {},
        hasOwn = object.hasOwnProperty,
        SourceManager, LoaderManager;

    /**
     * @access private
     * 
     * @memberof JAR
     * @inner
     * 
     * @param {Object} object
     * @param {String} prop
     * 
     * @return {Boolean}
     */
    function hasOwnProp(object, prop) {
        return hasOwn.call(object, prop);
    }

    /**
     * @access private
     *
     * @namespace SourceManager
     * 
     * @memberof JAR
     * @inner
     */
    SourceManager = (function sourceManagerSetup() {
        var doc = global.document,
            head = doc.getElementsByTagName('head')[0],
            scripts = {},
            styleSheets = {},
            createStyleSheet;

        /**
         * @access private
         * 
         * @memberof JAR~SourceManager
         * @inner
         * 
         * @param {String} path
         * 
         * @return {HTMLLinkElement}
         */
        createStyleSheet = (doc.createStyleSheet ? function(path) {
            return doc.createStyleSheet(path).owningElement;
        } : function() {
            return doc.createElement('link');
        });

        return {
            /**
             * @access public
             * 
             * @memberof JAR~SourceManager
             * 
             * @return {HTMLCollection}
             */
            getScripts: function() {
                return doc.getElementsByTagName('script');
            },
            /**
             * @access public
             * 
             * @memberof JAR~SourceManager
             * 
             * @param {String} moduleName
             * @param {String} path
             */
            addScript: function(moduleName, path) {
                var script = doc.createElement('script');

                head.appendChild(script);

                script.id = moduleName;
                script.type = 'text/javascript';
                script.src = path;
                script.async = true;

                scripts[moduleName] = script;
            },
            /**
             * @access public
             * 
             * @memberof JAR~SourceManager
             * 
             * @param {String} moduleName
             * 
             * @return {Boolean}
             */
            findScript: function(moduleName) {
                var script = (doc.currentScript && doc.currentScript.id === moduleName) ? doc.currentScript : doc.getElementById(moduleName),
                    foundScript = !! script;

                if (foundScript) {
                    script.id += ':loaded';
                }

                return foundScript;
            },
            /**
             * @access public
             * 
             * @memberof JAR~SourceManager
             * 
             * @param {String} moduleName
             * 
             * @return {String} path
             */
            removeScript: function(moduleName) {
                var script = scripts[moduleName],
                    path = script.src;

                head.removeChild(script);

                delete scripts[moduleName];

                return path;
            },
            /**
             * @access public
             * 
             * @memberof JAR~SourceManager
             * 
             * @param {String} moduleName
             * @param {String} path
             */
            addStyleSheet: function(moduleName, path) {
                var styleSheet;

                path = path;
                styleSheet = createStyleSheet(path);

                head.insertBefore(styleSheet, head.firstChild);

                styleSheet.id = 'css:' + moduleName;
                styleSheet.setAttribute('type', 'text/css');
                styleSheet.setAttribute('rel', 'stylesheet');
                styleSheet.setAttribute('href', path);
                styleSheets[moduleName] = styleSheet;
            },
            /**
             * @access public
             * 
             * @memberof JAR~SourceManager
             * 
             * @param {String} moduleName
             * 
             * @return {String}
             */
            removeStyleSheet: function(moduleName) {
                var styleSheet = styleSheets[moduleName],
                    path = styleSheet.href;

                head.removeChild(styleSheet);
                delete styleSheets[moduleName];

                return path;
            }
        };
    })();

    /**
     * @access private
     * 
     * @namespace LoaderManager
     * 
     * @memberof JAR
     * @inner
     */
    LoaderManager = (function loaderSetup() {
        var loaders = {},
            loaderConfig = {
                checkCircularDeps: false,

                createDependencyURLList: false,

                context: 'default',

                modules: {
                    '*': {
                        cache: false,

                        minified: false,

                        versionSuffix: '',

                        timeout: 5
                    }
                }
            },
            loaderCoreModules = {},
            rBundleRequest = /\.\*$/,
            rLeadingDot = /^\./,
            interceptors = {},

            // moduleQueue indices
            QUEUE_SUCCESS = 0,
            QUEUE_ERROR = 1,

            // Loader message indices
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_ABORTED = 0,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_ALREADY_LOADED = 1,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_ALREADY_LOADING = 2,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_FOUND = 3,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_LOADED = 4,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_LOADING = 5,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_NOT_DEFINED = 6,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_BUNDLE_REQUESTED = 7,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_CIRCULAR_DEPENDENCIES_FOUND = 8,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_DEPENDENCIES_FOUND = 9,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_DEPENDENCY_FOUND = 10,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_INTERCEPTION_ERROR = 11,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_ALREADY_LOADED = 12,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_ALREADY_LOADED_MANUAL = 13,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_ALREADY_LOADING = 14,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_ALREADY_REGISTERED = 15,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_LOADED = 16,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_LOADED_MANUAL = 17,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_LOADING = 18,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_NAME_INVALID = 19,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_RECOVERING = 20,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_REGISTERING = 21,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_REQUESTED = 22,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_SUBSCRIBED = 23,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_MODULE_PUBLISHED = 24,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MSG_TIMEOUT = 25,

            // Module states
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_WAITING = 1,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_LOADING = 2,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_LOADED = 3,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_REGISTERED = 4,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_LOADED_MANUAL = 5,

            // Bundle states
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_BUNDLE_WAITING = 0,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_BUNDLE_LOADING = 1,
            /**
             * @access private
             * 
             * @const {Number}
             * 
             * @memberof JAR~LoaderManager
             * @inner
             */
            MODULE_BUNDLE_LOADED = 2,
            Module, loaderManagerLogMessage;

        Module = (function moduleSetup() {
            /**
             * @access private
             *
             * @constructor Module
             * 
             * @memberof JAR~LoaderManager
             * @inner
             * 
             * @param {JAR~LoaderManager~Loader} loader
             * @param {String} moduleName
             */
            function Module(loader, moduleName) {
                var module = this,
                    options = module.options = {},
                    implicitDependency = loaderManagerGetImplicitDependencyName(moduleName),
                    pathParts = moduleName.split('.'),
                    fileName = options.fileName = pathParts.pop(),
                    firstLetterFileName = fileName.charAt(0);

                module.name = moduleName;
                module.bundleName = loaderManagerGetBundleName(moduleName);
                module.loader = loader;
                module.depsQueue = [];
                module.bundleQueue = [];

                module.dep = implicitDependency;
                module.deps = [];
                module.bundle = [];

                if (firstLetterFileName === firstLetterFileName.toLowerCase()) {
                    pathParts.push(fileName);
                }

                options.dirPath = pathParts.join(slash) + slash;

                module.state = MODULE_WAITING;
                module.bundleState = MODULE_BUNDLE_WAITING;

                module.interceptorData = {};
                module.interceptorDeps = [];
            }

            Module.prototype = {
                /**
                 * @access public
                 *
                 * @alias JAR~LoaderManager~Module
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                constructor: Module,
                /**
                 * @access public
                 * 
                 * @type {Number}
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                depsCounter: 0,
                /**
                 * @access public
                 * 
                 * @type {Number}
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                bundleCounter: 0,
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} state
                 * 
                 * @return {Boolean}
                 */
                isState: function(state) {
                    return this.state === state;
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} state
                 */
                setState: function(state) {
                    this.state = state;
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @return {Boolean}
                 */
                isRegistered: function() {
                    return this.isState(MODULE_REGISTERED) || this.isState(MODULE_LOADED) || this.isState(MODULE_LOADED_MANUAL);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} bundleState
                 * 
                 * @return {Boolean}
                 */
                isBundleState: function(bundleState) {
                    return this.bundleState === bundleState;
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} bundleState
                 */
                setBundleState: function(bundleState) {
                    this.bundleState = bundleState;
                },
                /**
                 * @access public
                 * 
                 * @memberof Module#
                 * 
                 * @param {Number} messageType
                 * @param {Object} values
                 */
                log: function(messageType, values) {
                    loaderManagerLogMessage(this.name, messageType, values);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} messageType
                 * @param {Object} values
                 */
                logBundle: function(messageType, values) {
                    loaderManagerLogMessage(this.bundleName, messageType, values);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @return {Array}
                 */
                getAllDeps: function() {
                    var module = this,
                        implicitDependency = module.dep,
                        dependencies = (module.deps || []).concat(module.interceptorDeps);

                    implicitDependency && dependencies.unshift(implicitDependency);

                    return dependencies;
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {String} fileType
                 * 
                 * @return {String}
                 */
                getFullPath: function(fileType) {
                    var module = this,
                        fullPath = [module.getConfig('baseUrl'), module.getConfig('dirPath'), module.getConfig('fileName')];

                    if (fileType == 'js') {
                        fullPath.push(module.getConfig('versionSuffix'), module.getConfig('minified'));
                    }

                    fullPath.push('.', fileType, module.getConfig('cache') ? '' : '?_=' + new Date().getTime());

                    return fullPath.join('');
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {String} option
                 * @param {String} skipUntil
                 * 
                 * @return {*}
                 */
                getConfig: function(option, skipUntil) {
                    return LoaderManager.getModuleConfig(this.name, option, skipUntil) || this.options[option];
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                depsLoaded: function() {
                    var module = this;

                    if (module.isRegistered() && !module.isState(MODULE_LOADED)) {
                        module.init();

                        module.setState(MODULE_LOADED);
                        module.log(MSG_MODULE_LOADED);
                        module.notify();
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                bundleLoaded: function() {
                    var module = this;

                    if (!module.isBundleState(MODULE_BUNDLE_LOADED)) {
                        module.setBundleState(MODULE_BUNDLE_LOADED);

                        module.logBundle(module.bundle.length ? MSG_BUNDLE_LOADED : MSG_BUNDLE_NOT_DEFINED);

                        module.notify(true);
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Array<string>} moduleNames
                 * @param {Boolean} asBundle
                 */
                listenFor: function(moduleNames, asBundle) {
                    var module = this,
                        loader = module.loader,
                        logAbortSuffix = asBundle ? 'Bundle' : '',
                        log = 'log' + logAbortSuffix,
                        abort = 'abort' + logAbortSuffix,
                        moduleCount = moduleNames.length,
                        System = loader.getSystem();

                    if (moduleCount && !module.setLoadedIfReady(moduleCount, asBundle)) {
                        module[log](MSG_MODULE_SUBSCRIBED, {
                            subs: moduleNames.join(separator)
                        });

                        loader.listenFor(module.getName(asBundle), moduleNames, function onModuleLoaded(publishingModuleName, data) {
                            module[log](MSG_MODULE_PUBLISHED, {
                                pub: publishingModuleName
                            });

                            if (System.isSet(data)) {
                                module.interceptorData[publishingModuleName] = data;
                            }

                            module.setLoadedIfReady(-1, asBundle);
                        }, function onModuleAborted() {
                            module[abort]();
                        });
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} count
                 * @param {Boolean} forBundle
                 * 
                 * @return {Boolean}
                 */
                setLoadedIfReady: function(count, forBundle) {
                    var module = this,
                        moduleDepsBundlePrefix = forBundle ? 'bundle' : 'deps',
                        moduleCounter = moduleDepsBundlePrefix + 'Counter',
                        loaded = moduleDepsBundlePrefix + 'Loaded',
                        isReady;

                    module[moduleCounter] += count;
                    isReady = !module[moduleCounter];

                    if (isReady) {
                        module[loaded]();
                    }

                    return isReady;
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                load: function() {
                    var module = this;

                    module.manageImplicitDep();

                    module.log(MSG_MODULE_LOADING);

                    module.setState(MODULE_LOADING);

                    module.timeoutID = global.setTimeout(function abortModule() {
                        module.abort();
                    }, module.getConfig('timeout') * 1000);

                    SourceManager.addScript(module.loader.context + ':' + module.name, module.getFullPath('js'));
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @return {Boolean}
                 */
                findRecover: function() {
                    var module = this,
                        foundRecover = module.getConfig('recover', module.nextRecover),
                        recoverModuleName, nextRecoverModule;

                    if (foundRecover) {
                        recoverModuleName = foundRecover.restrict;

                        // This is a recover on a higher level
                        if (recoverModuleName !== module.name) {
                            // extract the next recovermodule
                            nextRecoverModule = module.loader.getModule(recoverModuleName).dep;
                            nextRecoverModule && (module.nextRecover = nextRecoverModule.bundleName);

                            // Only recover this module
                            foundRecover.restrict = module.name;
                        }

                        LoaderManager.setModuleConfig(foundRecover);

                        // Restore module recover assoziation
                        foundRecover.restrict = recoverModuleName;

                        module.log(MSG_MODULE_RECOVERING);

                        module.load();
                    }
                    else {
                        delete module.nextRecover;
                    }

                    return !!foundRecover;
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Boolean} silent
                 */
                abort: function(silent) {
                    var module = this,
                        emptyQueue = false;

                    if (module.isState(MODULE_LOADING)) {
                        if (!silent) {
                            module.log(MSG_TIMEOUT, {
                                path: SourceManager.removeScript(module.loader.context + ':' + module.name),
                                sec: module.getConfig('timeout')
                            });

                            module.setState(MODULE_WAITING);

                            emptyQueue = !module.findRecover();
                        }
                    }
                    else if (module.isState(MODULE_REGISTERED) || module.isState(MODULE_LOADED_MANUAL)) {
                        emptyQueue = true;
                    }

                    if (emptyQueue) {
                        module.dequeue(QUEUE_ERROR);
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                abortBundle: function() {
                    var module = this;

                    if (module.isBundleState(MODULE_BUNDLE_LOADING)) {
                        module.logBundle(MSG_BUNDLE_ABORTED);

                        module.setBundleState(MODULE_BUNDLE_WAITING);
                        module.dequeue(QUEUE_ERROR, true);
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Boolean} forBundle
                 * 
                 * @return {String}
                 */
                getName: function(forBundle) {
                    return this[forBundle ? 'bundleName' : 'name'];
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Boolean} forBundle
                 * 
                 * @return {Array}
                 */
                getQueue: function(forBundle) {
                    return this[(forBundle ? 'bundle' : 'deps') + 'Queue'];
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Function} callback
                 * @param {Function} errback
                 * @param {Boolean} enqueueBundle
                 */
                enqueue: function(callback, errback, enqueueBundle) {
                    this.getQueue(enqueueBundle).push([callback, errback]);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} queueType
                 * @param {Boolean} dequeueBundle
                 */
                dequeue: function(queueType, dequeueBundle) {
                    var module = this,
                        name = module.getName(dequeueBundle),
                        queue = module.getQueue(dequeueBundle),
                        System = module.loader.getSystem(),
                        callback;

                    while (queue.length) {
                        callback = queue.shift()[queueType];

                        if (System.isFunction(callback)) {
                            callback(name);
                        }
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Function} factory
                 */
                register: function(factory) {
                    var module = this,
                        moduleState;

                    module.factory = factory || Object;

                    module.log(MSG_MODULE_REGISTERING);

                    if (module.isState(MODULE_LOADING)) {
                        global.clearTimeout(module.timeoutID);
                        moduleState = MODULE_REGISTERED;
                    }
                    else {
                        module.log(MSG_MODULE_LOADED_MANUAL);

                        moduleState = MODULE_LOADED_MANUAL;
                    }

                    module.setState(moduleState);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Array} bundle
                 */
                linkBundle: function(bundle) {
                    var module = this;

                    module.bundle = bundle = LoaderManager.normalize(bundle, module.name, true);

                    if (bundle.length) {
                        module.logBundle(MSG_BUNDLE_FOUND, {
                            bundle: bundle.join(separator)
                        });
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Array} dependencies
                 */
                linkDeps: function(dependencies) {
                    var module = this;

                    module.deps = dependencies = LoaderManager.normalize(dependencies, module.name);

                    if (dependencies.length) {
                        module.log(MSG_DEPENDENCIES_FOUND, {
                            deps: dependencies.join(separator)
                        });

                        module.listenFor(dependencies);
                    }
                    else {
                        module.setLoadedIfReady(0);
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Number} autoRegisterLevel
                 */
                manageImplicitDep: function(autoRegisterLevel) {
                    var module = this,
                        loader = module.loader,
                        implicitDependency = module.dep;

                    if (implicitDependency) {
                        if (autoRegisterLevel > 0) {
                            loader.getModule(implicitDependency).abort(true);

                            loader.register({
                                MID: implicitDependency,
                                autoRegLvl: --autoRegisterLevel
                            });
                        }
                        else if (module.isState(MODULE_LOADED_MANUAL) || module.isState(MODULE_WAITING)) {
                            module.log(MSG_DEPENDENCY_FOUND, {
                                dep: implicitDependency
                            });

                            module.listenFor([implicitDependency]);
                        }
                    }
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @param {Boolean} notifyBundle
                 */
                notify: function(notifyBundle) {
                    var module = this;

                    loaderConfig.createDependencyURLList && module.loader.pushModule(module.getName(notifyBundle));

                    module.dequeue(QUEUE_SUCCESS, notifyBundle);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 */
                init: function() {
                    var module = this,
                        loader = module.loader,
                        moduleName = module.name,
                        factory = module.factory,
                        implicitDependency = module.dep,
                        parentRef = (implicitDependency ? loader.getModule(implicitDependency) : loader).ref;

                    loader.setCurrentModuleName(moduleName);

                    module.ref = parentRef[module.options.fileName] = factory.apply(parentRef, module.getDepRefs()) || {};

                    loader.setCurrentModuleName(rootModule);
                },
                /**
                 * @access public
                 * 
                 * @memberof JAR~LoaderManager~Module#
                 * 
                 * @return {Array}
                 */
                getDepRefs: function() {
                    var module = this,
                        loader = module.loader,
                        dependencies = module.deps,
                        depLen = dependencies.length,
                        depIndex = 0,
                        depRefs = [],
                        System = loader.getSystem(),
                        data, dependencyName;

                    for (; depIndex < depLen; depIndex++) {
                        dependencyName = dependencies[depIndex];
                        data = module.interceptorData[dependencyName];
                        depRefs.push(System.isSet(data) ? data : loader.getModule(dependencyName).ref);
                    }

                    return depRefs;
                }
            };

            return Module;
        })();

        /**
         * @access private
         * 
         * @function
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} moduleName
         * @param {Number} messageType
         * @param {Object} values
         */
        loaderManagerLogMessage = (function loaderManagerLogMessageSetup() {
            var messageTemplates = [],
                messageTypes = {},
                module = 'module',
                bundle = 'bundle',
                requested = '${what} requested',
                startLoad = 'started loading ${what}',
                endLoad = 'finished loading ${what}',
                attemptedTo = 'attempted to ',
                attemptLoad = attemptedTo + 'load ${what} but ${why}',
                already = 'is already ',
                alreadyLoading = already + 'loading',
                alreadyLoaded = already + 'loaded',
                attemptLoadModule = replaceModule(attemptLoad),
                attemptLoadBundle = replaceBundle(attemptLoad),
                abortedLoading = 'aborted loading ${what}',
                loaderManagerLogger;

            /**
             * 
             * @param {String} message
             * @param {String} what
             * 
             * @return {String}
             */
            function replaceWhat(message, what) {
                return message.replace('${what}', what + ' "${mod}"');
            }

            /**
             * 
             * @param {String} message
             * 
             * @return {String}
             */
            function replaceModule(message) {
                return replaceWhat(message, module);
            }

            /**
             * 
             * @param {String} message
             * 
             * @return {String}
             */
            function replaceBundle(message) {
                return replaceWhat(message, bundle);
            }

            /**
             * 
             * @param {String} message
             * @param {String} why
             * 
             * @return {String}
             */
            function replaceWhy(message, why) {
                return message.replace('${why}', why);
            }

            /**
             * 
             * @param {String} message
             * 
             * @return {String}
             */
            function replaceAlreadyLoaded(message) {
                return replaceWhy(message, alreadyLoaded);
            }

            /**
             * 
             * @param {String} message
             * 
             * @return {String}
             */
            function replaceAlreadyLoading(message) {
                return replaceWhy(message, alreadyLoading);
            }

            /**
             * 
             * @param {Array<number>} messages
             * @param {String} logLevel
             */
            function setLogLevelForMessageTypes(messages, logLevel) {
                var messageIndex = 0,
                    messagesLen = messages.length;

                for (; messageIndex < messagesLen; messageIndex++) {
                    messageTypes[messages[messageIndex]] = logLevel;
                }
            }

            setLogLevelForMessageTypes([
            MSG_BUNDLE_FOUND,
            MSG_BUNDLE_LOADED,
            MSG_BUNDLE_LOADING,
            MSG_BUNDLE_REQUESTED,
            MSG_DEPENDENCIES_FOUND,
            MSG_DEPENDENCY_FOUND,
            MSG_MODULE_LOADED,
            MSG_MODULE_LOADED_MANUAL,
            MSG_MODULE_LOADING,
            MSG_MODULE_PUBLISHED,
            MSG_MODULE_RECOVERING,
            MSG_MODULE_REGISTERING,
            MSG_MODULE_REQUESTED,
            MSG_MODULE_SUBSCRIBED], 'info');

            setLogLevelForMessageTypes([
            MSG_BUNDLE_ABORTED,
            MSG_CIRCULAR_DEPENDENCIES_FOUND,
            MSG_INTERCEPTION_ERROR,
            MSG_MODULE_NAME_INVALID,
            MSG_TIMEOUT], 'error');

            setLogLevelForMessageTypes([
            MSG_BUNDLE_ALREADY_LOADED,
            MSG_BUNDLE_ALREADY_LOADING,
            MSG_BUNDLE_NOT_DEFINED,
            MSG_MODULE_ALREADY_LOADED,
            MSG_MODULE_ALREADY_LOADED_MANUAL,
            MSG_MODULE_ALREADY_LOADING,
            MSG_MODULE_ALREADY_REGISTERED], 'warn');

            messageTemplates[MSG_BUNDLE_ABORTED] = replaceBundle(abortedLoading);
            messageTemplates[MSG_BUNDLE_ALREADY_LOADED] = replaceAlreadyLoaded(attemptLoadBundle);
            messageTemplates[MSG_BUNDLE_ALREADY_LOADING] = replaceAlreadyLoading(attemptLoadBundle);
            messageTemplates[MSG_BUNDLE_FOUND] = replaceBundle('found bundlemodules "${bundle}" for ${what}');
            messageTemplates[MSG_BUNDLE_LOADED] = replaceBundle(endLoad);
            messageTemplates[MSG_BUNDLE_LOADING] = replaceBundle(startLoad);
            messageTemplates[MSG_BUNDLE_NOT_DEFINED] = replaceWhy(attemptLoadBundle, 'bundle is not defined');
            messageTemplates[MSG_BUNDLE_REQUESTED] = replaceBundle(requested);

            messageTemplates[MSG_CIRCULAR_DEPENDENCIES_FOUND] = replaceModule('found circular dependencies "${deps}" for ${what}');

            messageTemplates[MSG_DEPENDENCIES_FOUND] = replaceModule('found explicit dependencies "${deps}" for ${what}');
            messageTemplates[MSG_DEPENDENCY_FOUND] = replaceModule('found implicit dependency "${dep}" for ${what}');

            messageTemplates[MSG_INTERCEPTION_ERROR] = replaceModule('error in interception of ${what}');

            messageTemplates[MSG_MODULE_ALREADY_LOADED] = replaceAlreadyLoaded(attemptLoadModule);
            messageTemplates[MSG_MODULE_ALREADY_LOADED_MANUAL] = replaceAlreadyLoaded(attemptLoadModule) + ' manual';
            messageTemplates[MSG_MODULE_ALREADY_LOADING] = replaceAlreadyLoading(attemptLoadModule);

            messageTemplates[MSG_MODULE_ALREADY_REGISTERED] = replaceWhy(replaceModule(attemptedTo + 'register ${what} but ${why}'), already + 'registered');

            messageTemplates[MSG_MODULE_LOADED] = replaceModule(endLoad);
            messageTemplates[MSG_MODULE_LOADED_MANUAL] = replaceModule('${what} was loaded manual');
            messageTemplates[MSG_MODULE_LOADING] = replaceModule(startLoad);

            messageTemplates[MSG_MODULE_NAME_INVALID] = '"${mod}" is no valid modulename';
            messageTemplates[MSG_MODULE_PUBLISHED] = '"${pub}" published to "${mod}"';
            messageTemplates[MSG_MODULE_RECOVERING] = replaceModule('${what} tries to recover...');
            messageTemplates[MSG_MODULE_REGISTERING] = replaceModule('registering ${what}...');
            messageTemplates[MSG_MODULE_REQUESTED] = replaceModule(requested);
            messageTemplates[MSG_MODULE_SUBSCRIBED] = replaceModule('"${mod}" subscribed to "${subs}"');

            messageTemplates[MSG_TIMEOUT] = replaceModule(abortedLoading) + ' after ${sec} second(s) - module may not be available on path "${path}"';

            function loaderManagerLogMessage(moduleName, messageType, values) {
                var Logger = LoaderManager.getModuleRef('System.Logger'),
                    level = messageTypes[messageType] || 'error';

                if (Logger) {
                    values = values || {};
                    values.mod = moduleName;

                    if (!loaderManagerLogger) {
                        loaderManagerLogger = new Logger('Loader', {
                            tpl: messageTemplates
                        });
                    }

                    loaderManagerLogger[level](messageType, values);
                }
            }

            return loaderManagerLogMessage;
        })();

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @return {JAR~LoaderManager~Loader}
         */
        function loaderManagerGetCurrentLoader() {
            return loaders[loaderConfig.context];
        }

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} moduleName
         * 
         * @return {String}
         */
        function loaderManagerGetImplicitDependencyName(moduleName) {
            return moduleName.substr(0, moduleName.lastIndexOf('.'));
        }

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} moduleName
         * 
         * @return {String}
         */
        function loaderManagerExtractBundleModuleName(moduleName) {
            return moduleName.split('.*')[0];
        }

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} moduleName
         * 
         * @return {String}
         */
        function loaderManagerGetBundleName(moduleName) {
            return moduleName + '.*';
        }

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} moduleName
         * 
         * @return {Boolean}
         */
        function loaderManagerIsBundleRequest(moduleName) {
            return rBundleRequest.test(moduleName);
        }

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} moduleName
         * 
         * @return {Object}
         */
        function loaderManagerGetInterceptor(moduleName) {
            var interceptor, parts, interceptorType;

            for (interceptorType in interceptors) {
                if (hasOwnProp(interceptors, interceptorType) && moduleName.indexOf(interceptorType) > -1) {
                    parts = moduleName.split(interceptorType);

                    interceptor = {
                        originalModuleName: moduleName,

                        intercept: interceptors[interceptorType],

                        moduleName: parts[0],

                        data: parts[1]
                    };

                    break;
                }
            }

            return interceptor || {
                moduleName: moduleName
            };
        }

        /**
         * @access private
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} listeningModuleName
         * @param {function(string, string)} callback
         * @param {function(string)} errback
         * @param {Object} interceptor
         * 
         * @return {function(string)}
         */
        function loaderManagerCreateListener(listeningModuleName, callback, errback, interceptor) {
            return function interceptionListener(moduleName) {
                var loader = loaderManagerGetCurrentLoader(),
                    listeningModule = loader.getModule(listeningModuleName),
                    interceptorDeps = listeningModule.interceptorDeps,
                    interceptedModuleName = interceptor.originalModuleName,
                    System = loader.getSystem();

                interceptor.intercept({
                    listener: listeningModuleName,

                    module: loader.getModuleRef(moduleName),

                    data: interceptor.data,

                    $import: LoaderManager.$importLazy,

                    $importAndLink: function(moduleNames, callback, errback, progressback) {
                        moduleNames = LoaderManager.normalize(moduleNames);

                        interceptorDeps.push.apply(interceptorDeps, moduleNames);

                        LoaderManager.$importLazy(moduleNames, callback, errback, progressback);
                    },

                    onSuccess: function(data) {
                        callback(interceptedModuleName, data);
                    },

                    onError: function(error) {
                        if (!error) {
                            error = MSG_INTERCEPTION_ERROR;
                        }
                        else if (System.isA(error, Error)) {
                            error = error.message;
                        }

                        loaderManagerLogMessage(interceptedModuleName, error);

                        errback(interceptedModuleName);
                    }
                });
            };
        }

        /**
         * @access private
         * 
         * @constructor Loader
         * 
         * @memberof JAR~LoaderManager
         * @inner
         * 
         * @param {String} context
         */
        function Loader(context) {
            var loader = this;

            loader.context = context;
            loader.currentModuleName = rootModule;
            loader.modules = {};
            loader.ref = {};
        }

        Loader.prototype = {
            /**
             * @access public
             *
             * @alias JAR~LoaderManager~Loader
             * 
             * @memberof JAR~LoaderManager~Loader#
             */
            constructor: Loader,
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             */
            init: function() {
                var loader = this;

                loader.resetModulesURLList();

                loader.registerCore();
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             */
            setCurrentModuleName: function(moduleName) {
                this.currentModuleName = moduleName;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @return {String}
             */
            getCurrentModuleName: function() {
                return this.currentModuleName;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             *
             * @return {Object}
             */
            getSystem: function() {
                return this.getModuleRef('System');
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             *
             * @return {*}
             */
            getModuleRef: function(moduleName) {
                return this.getModule(moduleName).ref;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             *
             * @return {JAR~LoaderManager~Module}
             */
            getModule: function(moduleName) {
                var loader = this;

                if (loaderManagerIsBundleRequest(moduleName)) {
                    moduleName = loaderManagerExtractBundleModuleName(moduleName);
                }
                else {
                    moduleName = loaderManagerGetInterceptor(moduleName).moduleName;
                }

                return loader.modules[moduleName] || loader.createModule(moduleName);
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             *
             * @return {JAR~LoaderManager~Module}
             */
            createModule: function(moduleName) {
                var loader = this,
                    module = loader.modules[moduleName] = new Module(loader, moduleName);

                return module;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             */
            registerCore: function() {
                var loader = this,
                    moduleName, coreModule, properties;

                for (moduleName in loaderCoreModules) {
                    if (hasOwnProp(loaderCoreModules, moduleName)) {
                        coreModule = loaderCoreModules[moduleName];
                        properties = coreModule[0] || {};
                        properties.MID = moduleName;
                        loader.register(properties, coreModule[1]);
                    }
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {Object<string, *>} properties
             * @param {function():*} factory
             */
            register: function(properties, factory) {
                var loader = this,
                    moduleName = properties.MID,
                    module = loader.getModule(moduleName);

                if (!module.isRegistered()) {
                    module.register(factory);

                    if (properties.styles) {
                        SourceManager.addStyleSheet(moduleName, module.getFullPath('css'));
                    }

                    module.linkBundle(properties.bundle);

                    module.linkDeps(properties.deps);

                    module.manageImplicitDep(properties.autoRegLvl);

                    if (loader.checkForCircularDeps(moduleName)) {
                        module.abort();
                    }
                }
                else {
                    module.log(MSG_MODULE_ALREADY_REGISTERED);
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             * 
             * @return {Boolean}
             */
            checkForCircularDeps: function(moduleName) {
                var loader = this,
                    module = loader.getModule(moduleName),
                    hasCircularDependency = false,
                    circularDependencies;

                if (loaderConfig.checkCircularDeps) {
                    circularDependencies = loader.findCircularDeps(moduleName);
                    hasCircularDependency = !! circularDependencies.length;

                    if (hasCircularDependency) {
                        module.log(MSG_CIRCULAR_DEPENDENCIES_FOUND, {
                            deps: circularDependencies.join(separator)
                        });
                    }
                }

                return hasCircularDependency;
            },
            // TODO is there a more performant way to check for circular dependencies?
            // for now turned of in production but can be enabled over JAR.configure('checkCircularDeps', true)
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             * @param {Object} traversedModules
             * 
             * @return {Array}
             */
            findCircularDeps: function(moduleName, traversedModules) {
                var loader = this,
                    module = loader.getModule(moduleName),
                    dependencies = module.getAllDeps(),
                    depLen = dependencies.length,
                    depIndex = 0,
                    circularDependencies = [];

                moduleName = module.name;
                traversedModules = traversedModules || {};

                if (moduleName in traversedModules) {
                    circularDependencies = [moduleName];
                }
                else {
                    traversedModules[moduleName] = true;

                    for (; depIndex < depLen; depIndex++) {
                        circularDependencies = loader.findCircularDeps(dependencies[depIndex], traversedModules);

                        if (circularDependencies.length) {
                            circularDependencies.unshift(moduleName);
                            break;
                        }
                    }

                    delete traversedModules[moduleName];
                }

                return circularDependencies;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} listeningModuleName
             * @param {Array<string>} moduleNames
             * @param {function(string)} callback
             * @param {function(string)} errback
             */
            listenFor: function(listeningModuleName, moduleNames, callback, errback) {
                var loader = this,
                    moduleCount = moduleNames.length,
                    moduleIndex = 0,
                    moduleName, module, isBundleRequest, interceptor, onModuleLoaded;

                for (; moduleIndex < moduleCount; moduleIndex++) {
                    moduleName = moduleNames[moduleIndex];

                    isBundleRequest = loaderManagerIsBundleRequest(moduleName);

                    interceptor = loaderManagerGetInterceptor(moduleName);

                    onModuleLoaded = interceptor.intercept ? loaderManagerCreateListener(listeningModuleName, callback, errback, interceptor) : callback;
                    moduleName = interceptor.moduleName;

                    module = loader.$import(moduleName);

                    if (!module.isState(MODULE_LOADED) || (isBundleRequest && !module.isBundleState(MODULE_BUNDLE_LOADED))) {
                        module.enqueue(onModuleLoaded, errback, isBundleRequest);
                    }
                    else {
                        onModuleLoaded(moduleName);
                    }
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             * 
             * @return {JAR~LoaderManager~Module}
             */
            $import: function(moduleName) {
                return this['$import' + (loaderManagerIsBundleRequest(moduleName) ? 'Bundle' : 'Module')](moduleName);
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             * 
             * @return {JAR~LoaderManager~Module}
             */
            $importModule: function(moduleName) {
                var loader = this,
                    module = loader.getModule(moduleName),
                    messageType;

                module.log(MSG_MODULE_REQUESTED);

                if (module.isState(MODULE_WAITING)) {
                    module.load();
                }
                else {
                    messageType = module.isState(MODULE_LOADED) ? MSG_MODULE_ALREADY_LOADED : module.isState(MODULE_LOADED_MANUAL) ? MSG_MODULE_ALREADY_LOADED_MANUAL : MSG_MODULE_ALREADY_LOADING;

                    module.log(messageType);
                }

                return module;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} bundleName
             * 
             * @return {JAR~LoaderManager~Module}
             */
            $importBundle: function(bundleName) {
                var loader = this,
                    module = loader.getModule(bundleName),
                    messageType;

                module.logBundle(MSG_BUNDLE_REQUESTED);

                if (module.isBundleState(MODULE_BUNDLE_WAITING)) {
                    module.setBundleState(MODULE_BUNDLE_LOADING);

                    loader.listenFor(bundleName, [module.name], function onModuleLoaded() {
                        module.listenFor(module.bundle, true);
                    }, function onAbort() {
                        module.abortBundle();
                    });

                    messageType = MSG_BUNDLE_LOADING;
                }
                else {
                    messageType = module.isBundleState(MODULE_BUNDLE_LOADED) ? MSG_BUNDLE_ALREADY_LOADED : MSG_BUNDLE_ALREADY_LOADING;
                }

                module.logBundle(messageType);

                return module;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {Array} modules
             */
            pushModules: function(modules) {
                var moduleIndex = 0,
                    moduleCount;

                moduleCount = modules ? modules.length : 0;

                for (; moduleIndex < moduleCount; moduleIndex++) {
                    this.pushModule(modules[moduleIndex]);
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             * 
             * @param {String} moduleName
             */
            pushModule: function(moduleName) {
                var loader = this,
                    module = loader.getModule(moduleName),
                    sortedModules = loader.sorted,
                    isBundleRequested = loaderManagerIsBundleRequest(moduleName),
                    dependencies = module.getAllDeps();

                moduleName = module.name;

                if (module.isState(MODULE_LOADED)) {
                    if (!hasOwnProp(sortedModules, moduleName)) {
                        loader.pushModules(dependencies);

                        loader.list.push(module.getFullPath('js'));
                        sortedModules[moduleName] = true;
                    }

                    if (isBundleRequested) {
                        loader.pushModules(module.bundle);
                    }
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager~Loader#
             */
            resetModulesURLList: function() {
                var loader = this,
                    moduleName;

                loader.list = [];
                loader.sorted = {};

                for (moduleName in loaderCoreModules) {
                    if (hasOwnProp(loaderCoreModules, moduleName)) {
                        loader.sorted[moduleName] = true;
                    }
                }
            }
        };

        return {
            /**
             * @access public
             * 
             * @function
             * @memberof JAR~LoaderManager
             * 
             * @param {(String|Array|Object)} modules
             * @param {String} referenceModule
             * @param {Boolean} isRelative
             * 
             * @return {Array<string>}
             */
            normalize: (function loaderManagerNormalizeSetup() {
                /**
                 *
                 * @param {Array} modules
                 * @param {String} referenceModule
                 * @param {Boolean} isRelative
                 * 
                 * @return {Array<string>}
                 */
                function normalizeArray(modules, referenceModule, isRelative) {
                    var normalizedModules = [],
                        moduleIndex = 0,
                        moduleCount = modules.length;

                    for (; moduleIndex < moduleCount; moduleIndex++) {
                        normalizedModules = normalizedModules.concat(normalize(modules[moduleIndex], referenceModule, isRelative));
                    }

                    return normalizedModules;
                }

                /**
                 *
                 * @param {Object} modules
                 * @param {String} referenceModule
                 * @param {Boolean} isRelative
                 * 
                 * @return {Array<string>}
                 */
                function normalizeObject(modules, referenceModule, isRelative) {
                    var normalizedModules = [],
                        tmpReferenceModule;

                    for (tmpReferenceModule in modules) {
                        if (hasOwnProp(modules, tmpReferenceModule)) {
                            normalizedModules = normalizedModules.concat(normalize(modules[tmpReferenceModule], tmpReferenceModule, true));
                        }
                    }

                    return normalizeArray(normalizedModules, referenceModule, isRelative);
                }

                /**
                 *
                 * @param {String} moduleName
                 * @param {String} referenceModule
                 * @param {Boolean} isRelative
                 *
                 * @return {Array<string>}
                 */
                function normalizeString(moduleName, referenceModule, isRelative) {
                    var normalizedModules = [];

                    if (!isRelative) {
                        while (referenceModule && rLeadingDot.test(moduleName)) {
                            moduleName = moduleName.replace(rLeadingDot, '');
                            referenceModule = loaderManagerGetImplicitDependencyName(referenceModule) || undef;
                            isRelative = !! referenceModule;
                        }
                    }

                    if (isRelative) {
                        moduleName = buildAbsoluteModuleName(moduleName, referenceModule);
                    }

                    if (!moduleName || (!isRelative && rLeadingDot.test(moduleName))) {
                        loaderManagerLogMessage(moduleName, MSG_MODULE_NAME_INVALID);
                    }
                    else {
                        normalizedModules = [moduleName];
                    }

                    return normalizedModules;
                }

                /**
                 *
                 * @param {String} moduleName
                 * @param {String} referenceModule
                 *
                 * @return {String}
                 */
                function buildAbsoluteModuleName(moduleName, referenceModule) {
                    var dot = '.';

                    if (!moduleName || moduleName === dot) {
                        moduleName = dot = '';
                    }
                    else if (!referenceModule.replace(/\./g, '') || !loaderManagerGetInterceptor(moduleName).moduleName) {
                        dot = '';
                    }

                    return referenceModule + dot + moduleName;
                }

                /**
                 *
                 * @param {(String|Object|Array)} modules
                 * @param {String} referenceModule
                 * @param {Boolean} isRelative
                 *
                 * @return {Array<string>}
                 */
                function normalize(modules, referenceModule, isRelative) {
                    var System, normalizer;

                    if (modules) {
                        if (referenceModule === 'System') {
                            normalizer = modules.toString() === modules ? normalizeString : normalizeArray;
                        }
                        else {
                            System = LoaderManager.getSystem();

                            if (System.isObject(modules)) {
                                normalizer = normalizeObject;
                            }
                            else if (System.isArray(modules)) {
                                normalizer = normalizeArray;
                            }
                            else if (System.isString(modules)) {
                                normalizer = normalizeString;
                            }
                        }
                    }

                    return normalizer ? normalizer(modules, referenceModule, isRelative) : [];
                }

                return normalize;
            })(),
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {String} option
             * @param {*} value
             * 
             * @return {*}
             */
            setConfig: function(option, value) {
                loaderConfig[option] = value;

                return value;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {String} context
             * 
             * @return {String}
             */
            setContext: function(context) {
                loaderConfig.context = context;

                if (!hasOwnProp(loaders, context)) {
                    loaders[context] = new Loader(context);
                    loaders[context].init();
                }

                return context;
            },
            /**
             * @access public
             * 
             * @function
             * @memberof JAR~LoaderManager
             * 
             * @param {(Object|Array)} moduleConfigs
             * 
             * @return {Object}
             */
            setModuleConfig: (function moduleConfigSetterSetup() {
                var stringCheck = 'String',
                    objectCheck = 'Object',
                    booleanCheck = 'Boolean',
                    rEndSlash = /\/$/,
                    propertyDefinitions = {
                        baseUrl: {
                            check: stringCheck,

                            transform: addEndSlashTransForm
                        },

                        cache: {
                            check: booleanCheck,
                            /**
                             * @param {Boolean} cache
                             * 
                             * @return {Boolean}
                             */
                            transform: function cacheTransform(cache) {
                                return !!cache;
                            }
                        },

                        config: {
                            check: objectCheck,
                            /**
                             * @param {Object} config
                             * @param {String} moduleName
                             * 
                             * @return {Object}
                             */
                            transform: function(config, moduleName) {
                                var oldModuleConfig = loaderConfig.modules,
                                    oldConfig = oldModuleConfig[moduleName].config || {},
                                    option;

                                for (option in config) {
                                    if (hasOwnProp(config, option)) {
                                        oldConfig[option] = config[option];
                                    }
                                }

                                return oldConfig;
                            }
                        },

                        dirPath: {
                            check: stringCheck,

                            transform: addEndSlashTransForm
                        },

                        fileName: {
                            check: stringCheck
                        },

                        minified: {
                            check: booleanCheck,
                            /**
                             * @param {Boolean} loadMin
                             * 
                             * @return {String}
                             */
                            transform: function minTransform(loadMin) {
                                return loadMin ? '.min' : '';
                            }
                        },

                        recover: {
                            check: objectCheck,
                            /**
                             * @param {Object} recoverConfig
                             * @param {String} moduleName
                             * 
                             * @return {Object}
                             */
                            transform: function recoverTransform(recoverConfig, moduleName) {
                                var recover = {},
                                    option;

                                // create a copy of the recover-config
                                // because it should update for every module independendly
                                for (option in recoverConfig) {
                                    if (hasOwnProp(recoverConfig, option)) {
                                        (recover[option] = recoverConfig[option]);
                                    }
                                }

                                recover.restrict = moduleName;
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
                        },

                        timeout: {
                            check: 'Number',
                            /**
                             * @param {Number} timeout
                             * 
                             * @return {Number}
                             */
                            transform: function timeoutTransform(timeout) {
                                var minTimeout = 0.5;

                                timeout = Number(timeout);

                                return minTimeout > timeout ? minTimeout : timeout;
                            }
                        },

                        versionSuffix: {
                            check: stringCheck
                        }
                    };

                /**
                 * @param {String} path
                 * 
                 * @return {String}
                 */
                function addEndSlashTransForm(path) {
                    return (!path || rEndSlash.test(path)) ? path : path + slash;
                }

                /**
                 * @param {Object} moduleConfig
                 * @param {String} moduleName
                 * @param {String} property
                 * @param {*} propertyValue
                 */
                function setProperty(moduleConfig, moduleName, property, propertyValue) {
                    var System = LoaderManager.getSystem(),
                        propertyDefinition = propertyDefinitions[property],
                        propertyTransform = propertyDefinition.transform,
                        propertyCheck = 'is' + propertyDefinition.check;

                    if (System[propertyCheck](propertyValue)) {
                        moduleConfig[property] = propertyTransform ? propertyTransform(propertyValue, moduleName) : propertyValue;
                    }
                    else if (System.isNull(propertyValue)) {
                        delete moduleConfig[property];
                    }
                }

                function loaderManagerSetModuleConfig(moduleConfigs) {
                    var System = LoaderManager.getSystem(),
                        oldModuleConfigs = loaderConfig.modules,
                        configIndex = 0,
                        property, moduleConfigsLen, oldModuleConfig, modules, moduleName, moduleIndex, moduleCount;

                    if (System.isArray(moduleConfigs)) {
                        moduleConfigsLen = moduleConfigs.length;

                        for (; configIndex < moduleConfigsLen; configIndex++) {
                            loaderManagerSetModuleConfig(moduleConfigs[configIndex], oldModuleConfigs);
                        }
                    }
                    else if (System.isObject(moduleConfigs)) {
                        modules = LoaderManager.normalize(moduleConfigs.restrict || rootModule);
                        moduleCount = modules.length;

                        for (moduleIndex = 0; moduleIndex < moduleCount; moduleIndex++) {
                            moduleName = modules[moduleIndex];
                            oldModuleConfig = oldModuleConfigs[moduleName] = oldModuleConfigs[moduleName] || {};

                            for (property in propertyDefinitions) {
                                hasOwnProp(propertyDefinitions, property) && setProperty(oldModuleConfig, moduleName, property, moduleConfigs[property]);
                            }
                        }
                    }

                    return oldModuleConfigs;
                }

                return loaderManagerSetModuleConfig;
            })(),
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {String} moduleName
             * @param {Object} properties
             * @param {function()} factory
             */
            addCoreModule: function(moduleName, properties, factory) {
                loaderCoreModules[moduleName] = [properties, factory];
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {String} interceptorType
             * @param {function(object)} interceptor
             */
            addInterceptor: function(interceptorType, interceptor) {
                if (!hasOwnProp(interceptors, interceptorType)) {
                    interceptors[interceptorType] = interceptor;
                }

                return interceptors;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @return {String}
             */
            getCurrentModuleName: function() {
                return loaderManagerGetCurrentLoader().getCurrentModuleName();
            },
            /**
             * <p>Computes an array of all the loaded modules
             * in the order they are dependending on each other.
             * This method can be used to create a custom build
             * preferable with grunt and phantomjs.</p>
             *
             * <p>It is possible to recompute the list.
             * This is only for aesthetics.
             * Even without recomputation the list will still be valid.</p>
             * 
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {Function(array)} loadedCallback
             * @param {Boolean} forceRecompute
             */
            getModulesURLList: function(loadedCallback, forceRecompute) {
                var loader = loaderManagerGetCurrentLoader(),
                    loaderModules = loader.modules,
                    modulesToLoad = [],
                    moduleName;

                for (moduleName in loaderModules) {
                    if (hasOwnProp(loaderModules, moduleName) && loaderModules[moduleName].isState(MODULE_LOADING)) {
                        modulesToLoad.push(moduleName);
                    }
                }

                if (modulesToLoad.length) {
                    LoaderManager.$importLazy(modulesToLoad, function() {
                        LoaderManager.getModulesURLList(loadedCallback, forceRecompute);
                    });
                }
                else {
                    if (forceRecompute || !(loaderConfig.createDependencyURLList || loader.list.length)) {
                        loader.resetModulesURLList();

                        for (moduleName in loaderModules) {
                            hasOwnProp(loaderModules, moduleName) && loader.pushModule(moduleName);
                        }
                    }

                    loadedCallback(loader.list);
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {String} moduleName
             * @param {String} option
             * @param {String} skipUntil
             * 
             * @return {*}
             */
            getModuleConfig: function loaderManagerGetModuleConfig(moduleName, option, skipUntil) {
                var System = LoaderManager.getSystem(),
                    moduleConfigs = loaderConfig.modules,
                    nextLevel = moduleName,
                    skip = false,
                    result;

                do {
                    if (!skip && moduleConfigs[moduleName]) {
                        result = moduleConfigs[moduleName][option];
                    }

                    if (nextLevel) {
                        moduleName = loaderManagerGetBundleName(nextLevel);
                        nextLevel = loaderManagerGetImplicitDependencyName(nextLevel);
                    }
                    else {
                        moduleName = moduleName !== rootModule ? rootModule : undef;
                    }

                    if (skipUntil) {
                        skip = skipUntil !== moduleName;
                        skip || (skipUntil = undef);
                    }

                } while (!System.isSet(result) && moduleName);

                return result;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {String} moduleName
             * 
             * @return {*}
             */
            getModuleRef: function(moduleName) {
                return loaderManagerGetCurrentLoader().getModuleRef(moduleName);
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @return {Object}
             */
            getSystem: function() {
                return loaderManagerGetCurrentLoader().getSystem();
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @return {Object}
             */
            getRoot: function() {
                return loaderManagerGetCurrentLoader().ref;
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {(Object|Array|String)} moduleNames
             * @param {function(...*)} callback
             * @param {function(string)} errback
             * @param {function(string)} progressback
             */
            $importLazy: function(moduleNames, callback, errback, progressback) {
                var loader = loaderManagerGetCurrentLoader(),
                    System = loader.getSystem(),
                    refs = [],
                    refsIndexLookUp = {},
                    moduleIndex = 0,
                    ref, counter, moduleCount;

                moduleNames = LoaderManager.normalize(moduleNames);
                counter = moduleCount = moduleNames.length;

                for (; moduleIndex < moduleCount; moduleIndex++) {
                    refsIndexLookUp[moduleNames[moduleIndex]] = moduleIndex;
                }

                System.isFunction(progressback) || (progressback = undef);

                loader.listenFor(rootModule, moduleNames, function publishLazy(moduleName, data) {
                    ref = System.isSet(data) ? data : loader.getModuleRef(moduleName);
                    refs[refsIndexLookUp[moduleName]] = ref;

                    counter--;

                    progressback && progressback(ref, Number((1 - counter / moduleCount).toFixed(2)));

                    counter || callback.apply(null, refs);
                }, errback);
            },
            /**
             * @access public
             * 
             * @memberof JAR~LoaderManager
             * 
             * @param {Object} properties
             * @param {function()} factory
             */
            register: function(properties, factory) {
                var defaultContext = loaderConfig.context,
                    loaderContext, loader;

                if (!SourceManager.findScript(defaultContext + ':' + properties.MID)) {
                    for (loaderContext in loaders) {
                        if (hasOwnProp(loaders, loaderContext) && SourceManager.findScript(loaderContext + ':' + properties.MID)) {
                            LoaderManager.setContext(loaderContext);
                        }
                    }
                }

                loader = loaderManagerGetCurrentLoader();

                loader.register(properties, factory);

                if (loader !== loaders[defaultContext]) {
                    LoaderManager.setContext(defaultContext);
                }
            }
        };
    })();

    LoaderManager.addInterceptor('!', function pluginInterceptor(options) {
        var moduleRef = options.module,
            errback = options.onError;

        delete options.module;

        if (LoaderManager.getSystem().isFunction(moduleRef.$plugIn)) {
            moduleRef.$plugIn(options);
        }
        else {
            errback('could not call method "$plugIn" on module "${mod}"');
        }
    });

    LoaderManager.addCoreModule('System', {
        bundle: ['HtmlDebugger', 'Logger']
    }, function systemSetup() {
        var types = 'Null Undefined String Number Boolean Array Arguments Object Function Date RegExp'.split(' '),
            nothing = null,
            typesLen = types.length,
            typeLookup = {},
            toString = object.toString,
            typeIndex = 0,
            isArgs, System;

        /**
         * @access public
         * 
         * @namespace System
         */
        System = {
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {*} value
             * 
             * @return {String}
             */
            getType: function getType(value) {
                var type;

                if (System.isSet(value)) {
                    if (value.nodeType === 1 || value.nodeType === 9) {
                        type = 'element';
                    }
                    else {
                        type = typeLookup[toString.call(value)];

                        if (type === 'number') {
                            if (isNaN(value)) {
                                type = 'nan';
                            }
                            else if (!isFinite(value)) {
                                type = 'infinity';
                            }
                        }
                    }
                }
                else {
                    type = String(value);
                }

                return type || typeof value;
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {*} value
             * @param {*} compareValue
             * 
             * @return {Boolean}
             */
            isEqual: function(value, compareValue) {
                return value === compareValue;
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {*} value
             * 
             * @return {Boolean}
             */
            isSet: function(value) {
                return value != nothing;
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {*} value
             * 
             * @return {Boolean}
             */
            isArrayLike: function(value) {
                return System.isArray(value) || System.isArguments(value);
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {*} value
             * 
             * @return {Boolean}
             */
            isDefined: function(value) {
                return !System.isUndefined(value);
            },
            /**
             * @access public
             * 
             * @function
             * @memberof System
             * 
             * @param {*} value
             * 
             * @return {Boolean}
             */
            isInteger: Number.isInteger || function(value) {
                return System.isNumber(value) && parseInt(value, 10) === value;
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {*} value
             * 
             * @return {Boolean}
             */
            isNaN: function(value) {
                return global.isNaN(value) && value !== value;
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {Object} instance
             * @param {(Function|Array<function>)} Class
             * 
             * @return {Boolean}
             */
            isA: function(instance, Class) {
                var isA = false,
                    classIndex = 0,
                    classLen = Class.length;

                if (System.isArray(Class)) {
                    for (; classIndex < classLen; classIndex++) {
                        isA = System.isA(instance, Class[classIndex]);

                        if (isA) {
                            break;
                        }
                    }
                }
                else {
                    isA = instance instanceof Class;
                }

                return isA;
            },
            /**
             * @access public
             * 
             * @memberof System
             * 
             * @param {Object} pluginRequest
             */
            $plugIn: function(pluginRequest) {
                pluginRequest.onSuccess(function configGetter(option) {
                    var config = LoaderManager.getModuleConfig(pluginRequest.listener, 'config');

                    return System.isObject(config) && hasOwnProp(config, option) ? config[option] : undef;
                });
            }
        };

        /**
         * @access public
         * 
         * @function isNull
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isUndefined
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isString
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isNumber
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isBoolean
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isArray
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isObject
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isFunction
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isDate
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access public
         * 
         * @function isRegExp
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */

        /**
         * @access private
         * 
         * @memberof System
         * @inner
         * 
         * @param {String} typeDef
         * 
         * @return {function(*):boolean}
         */
        function typeTestSetup(typeDef) {
            var nativeTypeTest = global[typeDef] && global[typeDef]['is' + typeDef];

            typeLookup['[object ' + typeDef + ']'] = typeDef = typeDef.toLowerCase();

            return nativeTypeTest || function typeTest(value) {
                return System.getType(value) === typeDef;
            };
        }

        for (; typeIndex < typesLen; typeIndex++) {
            System['is' + types[typeIndex]] = typeTestSetup(types[typeIndex]);
        }

        isArgs = System.isArguments;

        /**
         * @access public
         * 
         * @memberof System
         * 
         * @param {*} value
         * 
         * @return {Boolean}
         */
        System.isArguments = function(value) {
            var isArguments = false,
                length;

            if (value) {
                length = value.length;
                isArguments = isArgs(value) || (System.isNumber(length) && length === 0 || (length > 0 && ((length - 1) in value)));
            }

            return isArguments;
        };

        return System;
    });

    LoaderManager.addCoreModule('System.Logger', {
        deps: '.!'
    }, function systemLoggerSetup(config) {
        var System = this,
            debuggers = {},
            stdLevels = 'log info debug warn error'.split(' '),
            stdLevelsLen = stdLevels.length,
            levelIndex = 0,
            rTemplateKey = /\$\{(.*?)\}/g,
            baseLogger;

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         */
        function noop() {}

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {Array} match
         * @param {String} key
         * 
         * @return {String}
         */
        function formatLog(match, key) {
            return formatLog.values[key] || 'UNKNOWN';
        }

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {(String|Number)} levelOrPriority
         * 
         * @return {Number}
         */
        function getPriority(levelOrPriority) {
            var logLevels = Logger.logLevels,
                priority = logLevels.ALL;

            if (System.isString(levelOrPriority) && hasOwnProp(logLevels, (levelOrPriority = levelOrPriority.toUpperCase()))) {
                priority = logLevels[levelOrPriority];
            }
            else if (System.isNumber(levelOrPriority)) {
                priority = levelOrPriority;
            }

            return priority;
        }

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {Boolean} debug
         * @param {String} level
         * @param {String} context
         * 
         * @return {Boolean}
         */
        function isDebuggingEnabled(debug, level, context) {
            return debug && comparePriority(level) && compareDebugContext(context);
        }

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {String} level
         * 
         * @return {Boolean}
         */
        function comparePriority(level) {
            return getPriority(level) >= getPriority(config('level'));
        }

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {String} context
         * 
         * @return {Boolean}
         */
        function compareDebugContext(context) {
            var debugContext = config('context'),
                includeContext, excludeContext;

            if (System.isObject(debugContext)) {
                includeContext = debugContext.include;
                excludeContext = debugContext.exclude;
            }
            else {
                includeContext = debugContext;
            }

            return includeContext ? inContextList(context, includeContext) : excludeContext ? !inContextList(context, excludeContext) : true;
        }

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {String} level
         * @param {(Array|String)} contextList
         * 
         * @return {Boolean}
         */
        function inContextList(context, contextList) {
            var contextDelimiter = ',';

            if (System.isArray(contextList)) {
                contextList = contextList.join(contextDelimiter);
            }

            contextList = contextDelimiter + contextList + contextDelimiter;

            return contextList.indexOf(contextDelimiter + context + contextDelimiter) > -1;
        }

        /**
         * @access private
         * 
         * @memberof System.Logger
         * @inner
         * 
         * @param {String} mode
         * 
         * @return {Object}
         */
        function getActiveDebugger(mode) {
            return debuggers[mode] || debuggers.console;
        }

        /**
         * @access public
         * 
         * @memberof System
         * 
         * @class Logger
         * 
         * @param {String} logContext
         * @param {Object} options
         */
        function Logger(logContext, options) {
            var logger = this;

            logger.context = logContext || 'Default';

            logger.options = options || {};
            logger.options.tpl = logger.options.tpl || {};
        }

        /**
         * @access private
         * 
         * @memberof System.Logger#
         * 
         * @param {String} level
         * @param {*} data
         * @param {(Object|Array)} values
         */
        Logger.prototype._out = function(level, data, values) {
            var logger = this,
                context = logger.context,
                options = logger.options,
                currentDebugger = getActiveDebugger(options.mode || config('mode')),
                output = currentDebugger[level] || currentDebugger.log;

            if (isDebuggingEnabled(options.debug || config('debug'), level, context) && System.isFunction(output)) {
                data = options.tpl[data] || data;

                if (System.isString(data) && (System.isObject(values) || System.isArray(values))) {
                    formatLog.values = values;

                    data = data.replace(rTemplateKey, formatLog);

                    formatLog.values = null;
                }

                output.call(currentDebugger, data, context);
            }
        };
        /**
         * @access public
         * 
         * @memberof System.Logger
         * 
         * @type {Object<string, number>}
         */
        Logger.logLevels = {
            ALL: -Infinity
        };

        /**
         * @access public
         * 
         * @memberof System.Logger
         * 
         * @param {String} level
         * @param {Number} priority
         */
        Logger.addLogLevel = function(level, priority) {
            var levelConst = level.toUpperCase();

            if (!hasOwnProp(Logger.logLevels, levelConst)) {
                Logger.logLevels[levelConst] = System.isNumber(priority) ? priority : Logger.logLevels.ALL;

                Logger.prototype[level] = function loggerFn(data, values) {
                    this._out(level, data, values);
                };

                Logger[level] = function staticLoggerFn(data, values) {
                    baseLogger[level](data, values);
                };

                Logger[level + 'WithContext'] = function staticLoggerFnWithContext(context, data, values) {
                    new Logger(context)[level](data, values);
                };
            }
        };

        /**
         * @access public
         * 
         * @memberof System.Logger
         *
         * @param {Object} options
         * 
         * @return {System.Logger}
         */
        Logger.forCurrentModule = function(options) {
            var logContext = LoaderManager.getCurrentModuleName();

            return logContext === rootModule ? baseLogger : new Logger(logContext, options);
        };

        /**
         * @access public
         * 
         * @memberof System.Logger
         *
         * @param {Object} pluginRequest
         */
        Logger.$plugIn = function(pluginRequest) {
            var data = pluginRequest.data.split(':');

            pluginRequest.$importAndLink(data[1], function(Debugger) {
                Logger.addDebugger(data[0], Debugger.setup);

                pluginRequest.onSuccess(Logger);
            }, pluginRequest.onError);
        };

        /**
         * @access public
         * 
         * @memberof System.Logger
         *
         * @param {String} mode
         * @param {Function} debuggerSetup
         */
        Logger.addDebugger = function(mode, debuggerSetup) {
            var modeConfig = mode + 'Config';

            if (!hasOwnProp(debuggers, mode) && System.isFunction(debuggerSetup)) {
                debuggers[mode] = debuggerSetup(function(option) {
                    return (config(modeConfig) || {})[option];
                });
            }
        };

        baseLogger = new Logger('JAR');

        for (; levelIndex < stdLevelsLen; levelIndex++) {
            Logger.addLogLevel(stdLevels[levelIndex], (levelIndex + 1) * 10);
        }

        Logger.addDebugger('console', function consoleDebuggerSetup(config) {
            var console = global.console,
                canUseGroups = console && console.group && console.groupEnd,
                pseudoConsole = {},
                levelIndex = 0,
                method,
                lastLogContext;

            for (; levelIndex < stdLevelsLen; levelIndex++) {
                method = stdLevels[levelIndex];
                pseudoConsole[method] = console ? forwardConsole(console[method] ? method : stdLevels[0]) : noop;
            }

            function forwardConsole(method) {
                return function log(data, logContext) {
                    var useGroups = canUseGroups && config('groupByContext'),
                        logContextChanged = lastLogContext !== logContext;

                    if (useGroups && logContextChanged && lastLogContext) {
                        global.console.groupEnd(lastLogContext);
                    }

                    if (method === 'error' && config('throwError')) {
                        throw new Error(logContext + ' - ' + data);
                    }

                    if (useGroups) {
                        if (logContextChanged) {
                            global.console.group(logContext);

                            lastLogContext = logContext;
                        }

                        global.console[method](data);
                    }
                    else {
                        global.console[method]('[' + logContext + ']', data);
                    }
                };
            }

            return pseudoConsole;
        });

        return Logger;
    });

    LoaderManager.addCoreModule('jar', {
        bundle: ['async.*', 'feature.*', 'html.*', 'lang.*', 'util.*']
    }, function() {
        /**
         * @namespace jar
         * 
         * @borrows LoaderManager.getModuleRef as use
         * @borrows LoaderManager.$importLazy as $importLazy
         * @borrows LoaderManager.getCurrentModuleName as getCurrentModuleName
         */
        var jar = {
            /**
             * @access public
             * 
             * @memberof jar
             *
             * @param {(Object|Array|String)} moduleNames
             *
             * @return {Array}
             */
            useAll: function(moduleNames) {
                var moduleIndex = 0,
                    refs = [],
                    moduleCount;

                moduleNames = LoaderManager.normalize(moduleNames);
                moduleCount = moduleNames.length;

                for (; moduleIndex < moduleCount; moduleIndex++) {
                    refs.push(jar.use(moduleNames[moduleIndex]));
                }

                return refs;
            },

            use: LoaderManager.getModuleRef,

            $importLazy: LoaderManager.$importLazy,

            getCurrentModuleName: LoaderManager.getCurrentModuleName
        };

        return jar;
    });

    LoaderManager.setContext('default');

    global.JAR = (function jarSetup() {
        var previousJAR = global.JAR,
            moduleNamesQueue = [],
            configurators = {},
            configs = {
                bundle: [],
                environment: undef,
                environments: {},
                globalAccess: false,
                supressErrors: false
            },
            JAR;

        /**
         * @namespace JAR
         * 
         * @borrows LoaderManager.register as register
         * @borrows LoaderManager.getModulesURLList as getModulesURLList
         */
        JAR = {
            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @param {function():undefined} main
             * @param {function(string):undefined} onAbort
             */
            main: function(main, onAbort) {
                var System = LoaderManager.getSystem(),
                    root = LoaderManager.getRoot();

                if (moduleNamesQueue.length) {
                    LoaderManager.$importLazy(moduleNamesQueue, onImport, System.isFunction(onAbort) ? onAbort : globalErrback);
                }
                else {
                    onImport();
                }

                function onImport() {
                    var Logger = LoaderManager.getModuleRef('System.Logger');

                    if (configs.supressErrors) {
                        try {
                            Logger.log('start executing main...');
                            main.apply(root, arguments);
                        }
                        catch (e) {
                            Logger.error((e.stack || e.message || '\n\tError in JavaScript-code: ' + e) + '\nexiting...', 'error');
                        }
                        finally {
                            Logger.log('...done executing main');
                        }
                    }
                    else {
                        main.apply(root, arguments);
                    }
                }

                moduleNamesQueue.length = 0;
            },
            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @param {(String|Object|Array)} moduleData
             */
            $import: function(moduleData) {
                moduleNamesQueue = moduleNamesQueue.concat(moduleData === rootModule ? configs.bundle : moduleData);
            },
            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @param {String} moduleName
             * @param {(Array|Function)} bundle
             * @param {Function|Undefined} factory
             */
            $export: function(moduleName, bundle, factory) {
                var System = LoaderManager.getSystem(),
                    normalizedModules = LoaderManager.normalize(moduleNamesQueue, moduleName);

                if (System.isFunction(bundle)) {
                    factory = bundle;
                    bundle = undef;
                }

                LoaderManager.register({
                    MID: moduleName,
                    deps: moduleNamesQueue,
                    bundle: bundle
                }, function() {
                    var modules = {},
                        index = 0,
                        modulesCount = normalizedModules.length;

                    for (; index < modulesCount; index++) {
                        modules[index] = modules[normalizedModules[index]] = arguments[index];
                    }

                    return factory.call(this, modules);
                });

                moduleNamesQueue.length = 0;
            },

            register: LoaderManager.register,

            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @param {(Object|String)} config
             * @param {(Function)} configurator
             */
            addConfigurator: function(config, configurator) {
                var System = LoaderManager.getSystem(),
                    option;

                if (System.isString(config) && !hasOwnProp(configurators, config) && System.isFunction(configurator)) {
                    configurators[config] = configurator;
                }
                else if (System.isObject(config)) {
                    for (option in config) {
                        hasOwnProp(config, option) && JAR.addConfigurator(option, config[option]);
                    }
                }
            },
            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @param {(Object|String)} config
             * @param {*} value
             */
            configure: function(config, value) {
                var System = LoaderManager.getSystem(),
                    option, configurator;

                if (System.isString(config)) {
                    configurator = configurators[config];

                    configs[config] = System.isFunction(configurator) ? configurator(value, configs[config], System) : value;
                }
                else if (System.isObject(config)) {
                    for (option in config) {
                        hasOwnProp(config, option) && JAR.configure(option, config[option]);
                    }
                }
            },

            getModulesURLList: LoaderManager.getModulesURLList,
            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @return {Object}
             */
            noConflict: function() {
                global.JAR = previousJAR;

                return JAR;
            },
            /**
             * @access public
             * 
             * @memberof JAR
             * 
             * @type {String}
             */
            version: '0.2.0'
        };

        /**
         * @access private
         * 
         * @memberof JAR
         * @inner
         * 
         * @param {String} abortedModuleName
         */
        function globalErrback(abortedModuleName) {
            LoaderManager.getModuleRef('System.Logger').error('Import of "' + abortedModuleName + '" failed!');
        }

        /**
         * @access private
         * 
         * @memberof JAR
         * @inner
         * 
         * @param {Boolean} expose
         */
        function exposeModulesGlobal(expose) {
            if (expose) {
                JAR.mods = LoaderManager.getRoot();
            }
        }

        /**
         * @access private
         * 
         * @memberof JAR
         * @inner
         */
        function bootstrapJAR() {
            var baseUrl = './',
                scripts = SourceManager.getScripts(),
                scriptCount = scripts.length - 1,
                bootstrapConfig = global.jarconfig || {},
                bootstrapModules = bootstrapConfig.modules,
                mainScript;

            for (; scriptCount > -1; scriptCount--) {
                mainScript = scripts[scriptCount].getAttribute('data-main');

                if (mainScript) {
                    baseUrl = mainScript.substring(0, mainScript.lastIndexOf(slash)) || baseUrl;
                    break;
                }
            }

            if (mainScript && !bootstrapConfig.main) {
                bootstrapConfig.main = mainScript;
            }

            if (!LoaderManager.getSystem().isArray(bootstrapModules)) {
                bootstrapModules = bootstrapConfig.modules = bootstrapModules ? [bootstrapModules] : [];
            }

            bootstrapModules.unshift({
                baseUrl: baseUrl
            });

            JAR.configure(bootstrapConfig);
        }

        JAR.addConfigurator({
            debugging: function(debugConfig, oldDebugConfig, System) {
                if (!System.isObject(debugConfig)) {
                    debugConfig = {
                        debug: debugConfig
                    };
                }

                JAR.configure('modules', {
                    restrict: 'System.Logger',

                    config: debugConfig
                });
            },
            /**
             * 
             * @param {Boolean} makeGlobal
             * @param {Boolean} isGlobal
             * 
             * @return {Boolean}
             */
            globalAccess: function(makeGlobal, isGlobal) {
                if (makeGlobal) {
                    exposeModulesGlobal(!isGlobal);
                }
                else {
                    delete JAR.mods;
                }

                return !!makeGlobal;
            },
            /**
             * 
             * @param {String} mainScript
             * @param {String} oldMainScript
             * 
             * @return {String}
             */
            main: function(mainScript, oldMainScript) {
                return oldMainScript || (mainScript && SourceManager.addScript('main', mainScript + '.js'));
            },
            /**
             *
             * @param {Object} environments
             * @param {Object} oldEnvironments
             *
             * @return {Object<string, function>}
             */
            environments: function(newEnvironments, oldEnvironments) {
                var environment;

                for (environment in newEnvironments) {
                    if (hasOwnProp(newEnvironments, environment)) {
                        oldEnvironments[environment] = newEnvironments[environment];
                    }
                }

                return oldEnvironments;
            },
            /**
             *
             * @param {String} environment
             * @param {String} oldEnvironment
             *
             * @return {String}
             */
            environment: function(newEnvironment, oldEnvironment, System) {
                var envCallback = configs.environments[newEnvironment];

                if (newEnvironment !== oldEnvironment && System.isFunction(envCallback)) {
                    envCallback();
                }

                return newEnvironment;
            },
            /**
             * @param {(Object|Array)} newModuleConfigs
             * 
             * @return {Object}
             */
            modules: function(newModuleConfigs) {
                return LoaderManager.setModuleConfig(newModuleConfigs);
            },

            context: function(newContext, oldContext) {
                if (newContext !== oldContext) {
                    newContext = LoaderManager.setContext(newContext);

                    exposeModulesGlobal(configs.globalAccess);
                }

                return newContext;
            },
            /**
             * @param {Boolean} checkCircularDeps
             * 
             * @return {Boolean}
             */
            checkCircularDeps: function(checkCircularDeps) {
                return LoaderManager.setConfig('checkCircularDeps', checkCircularDeps);
            },
            /**
             * @param {Boolean} createDependencyURLList
             * 
             * @return {Boolean}
             */
            createDependencyURLList: function(createDependencyURLList) {
                return LoaderManager.setConfig('createDependencyURLList', createDependencyURLList);
            },
            /**
             * @param {Object} newInterceptors
             * @param {Object} oldInterceptors
             * @param {Object} System
             * 
             * @return {Object}
             */
            interceptors: function(newInterceptors, oldInterceptors, System) {
                var interceptorType;

                if (System.isObject(newInterceptors)) {
                    for (interceptorType in newInterceptors) {
                        if (hasOwnProp(newInterceptors, interceptorType)) {
                            oldInterceptors = LoaderManager.addInterceptor(interceptorType, newInterceptors[interceptorType]);
                        }
                    }
                }

                return oldInterceptors;
            }
        });

        /*defaultConfig.environments = {
            production: function() {
                JAR.configure({
                    modules: {
                        minified: true
                    },
                    
                    debugging: true,

                    globalAccess: false
                });
            },

            development: function() {
                JAR.configure({
                    modules: {
                        minified: false
                    },
                    
                    debugging: true,

                    globalAccess: true
                });
            }
        };*/
        
        bootstrapJAR();

        return JAR;
    })();

})(this);