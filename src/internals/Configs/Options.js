JARS.internal('Configs/Options', function(getInternal) {
    'use strict';

    var PublicConfig = getInternal('Configs/Public'),
        OptionsResolver = getInternal('Resolvers/Options'),
        Transforms = getInternal('Configs/Transforms'),
        ObjectHelper = getInternal('Helpers/Object'),
        create = ObjectHelper.create,
        hasOwnProp = ObjectHelper.hasOwnProp,
        each = ObjectHelper.each,
        isBundle = getInternal('Resolvers/Bundle').isBundle,
        isNull = getInternal('Types/Validators').isNull;

    /**
     * @class
     *
     * @memberof JARS~internals.Configs
     */
    function Options() {
        this.config = new PublicConfig();
    }

    /**
     * @param {JARS~internals.Configs.Options} parentOptions
     *
     * @return {JARS~internals.Configs.Options}
     */
    Options.childOf = function(parentOptions) {
        var childOptions = create(Options, parentOptions);

        childOptions.config = PublicConfig.childOf(parentOptions.config);

        return childOptions;
    };

    /**
     * @param {JARS~internals.Subjects~Subject} subject
     *
     * @return {JARS~internals.Configs.Options}
     */
    Options.getDefault = function(subject) {
        var defaultOptions = new Options();

        isBundle(subject.name) || Options.transformAndUpdate(defaultOptions, OptionsResolver(subject.name), subject);

        return defaultOptions;
    };

    /**
     * @param {JARS~internals.Configs.Options} options
     * @param {Object} newOptions
     * @param {JARS~internals.Subjects~Subject} subject
     */
    Options.transformAndUpdate = function(options, newOptions, subject) {
        each(newOptions, function updateConfig(value, option) {
            if (hasOwnProp(Transforms, option)) {
                updateOption(options, option, transformOption(option, value, subject));
            }
        });
    };

    /**
     * @memberof JARS~internals.Configs.Options
     * @inner
     *
     * @param {string} option
     * @param {*} value
     * @param {JARS~internals.Subjects~Subject} subject
     *
     * @return {*}
     */
    function transformOption(option, value, subject) {
        return Transforms[option](value, subject);
    }

    /**
     * @memberof JARS~internals.Configs.Options
     * @inner
     *
     * @param {JARS~internals.Configs.Options} options
     * @param {string} option
     * @param {*} value
     */
    function updateOption(options, option, value) {
        if (isNull(value)) {
            delete options[option];
        }
        else {
            options[option] = value;
        }
    }

    return Options;
});
