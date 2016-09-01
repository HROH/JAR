JARS.internal('ExternalBootstrapper', function externalBootstrapperSetup(InternalsManager) {
    'use strict';

    var getInternal = InternalsManager.get,
        Loader = getInternal('Loader'),
        ConfigsManager = getInternal('ConfigsManager'),
        JARS_MAIN_LOGCONTEXT = 'JARS:main',
        moduleNamesQueue = [],
        mainLogger, ExternalBootstrapper;

    ExternalBootstrapper = {
        $import: function(modules) {
            moduleNamesQueue = moduleNamesQueue.concat(modules);
        },

        main: function(main, onAbort) {
            var moduleNames = moduleNamesQueue;

            moduleNamesQueue = [];

            // TODO when mainLogger is defined skip this Loader.$import call
            Loader.$import('System.*', function setupMainLogger(System) {
                mainLogger = mainLogger || new System.Logger(JARS_MAIN_LOGCONTEXT);

                bootstrapMain(System, moduleNames, main, onAbort);
            });
        }
    };

    function bootstrapMain(System, moduleNames, main, onAbort) {
        if (System.isFunction(main)) {
            if (moduleNames.length) {
                Loader.$import(moduleNames, onImport, System.isFunction(onAbort) ? onAbort : defaultOnAbort);
            }
            else {
                onImport();
            }
        }
        else {
            mainLogger.error('No main function provided');
        }

        function onImport() {
            var root = Loader.getRoot();

            if (ConfigsManager.get('supressErrors')) {
                try {
                    mainLogger.log('Start executing main...');
                    main.apply(root, arguments);
                }
                catch (e) {
                    mainLogger.error((e.stack || e.message || '\n\tError in JavaScript-code: ' + e) + '\nexiting...');
                }
                finally {
                    mainLogger.log('...done executing main');
                }
            }
            else {
                main.apply(root, arguments);
            }
        }
    }

    function defaultOnAbort(abortedModuleName) {
        mainLogger.error('Import of "${0}" failed!', [abortedModuleName]);
    }

    return ExternalBootstrapper;
});