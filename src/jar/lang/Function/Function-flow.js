JAR.register({
    MID: 'jar.lang.Function.Function-flow',
    deps: ['..', '..Array::from', '..Object!derive']
}, function(lang, fromArgs, Obj) {
    'use strict';

    var FunctionCopy = this,
        fromFunction = FunctionCopy.from,
        apply = FunctionCopy.apply,
        defaultRegulatorOptions = {
            leading: true,
            
            trailing: true
        };

    lang.extendNativeType('Function', {
        debounce: function(ms, immediate) {
            return createRegulatorFunction(this, ms, {
                leading: immediate,

                trailing: !immediate
            }, true);
        },

        throttle: function(ms, options) {
            return createRegulatorFunction(this, ms, options || defaultRegulatorOptions);
        },

        delay: function(ms) {
            var fn = this;

            return fromFunction(function delayedFn() {
                var context = this,
                    args = fromArgs(arguments);

                window.setTimeout(function() {
                    fn.apply(context, args);
                }, ms);
            });
        }
    });

    /**
     *
     * @param {Function} fn
     * @param {Number} msClosed
     * @param {Object} options
     * @param {Boolean} resetOnCall
     * 
     * @return {Function}
     */
    function createRegulatorFunction(fn, msClosed, options, resetOnCall) {
        var closed = false,
            lastArgs, timeoutID, context;

        if (!(options.leading || options.trailing)) {
            options = defaultRegulatorOptions;
        }

        function open() {
            closed = false;

            if (lastArgs && options.trailing) {
                apply(fn, context, lastArgs);
                context = lastArgs = null;
            }
        }

        return fromFunction(function regulatorFn() {
            context = this;
            timeoutID = closed;

            if (resetOnCall || !closed) {
                closed = window.setTimeout(open, msClosed);
            }

            if (timeoutID || !options.leading) {
                resetOnCall && window.clearTimeout(timeoutID);
                lastArgs = arguments;
            }
            else {
                apply(fn, context, arguments);
            }
        }, fn.arity || fn.length);
    }

    return Obj.extract(FunctionCopy, ['debounce', 'throttle', 'delay']);
});