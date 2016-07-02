JAR.module('jar.async.Value.M$Decidable').$export([
    'System::isObject',
    {
        'jar.lang': [
            'Function::identity',
            'Object!iterate',
            'Mixin'
        ]
    },
    '.M$Forwardable'
]).$export(function(isObject, identity, Obj, Mixin, M$Forwardable) {
    'use strict';

    var M$Decidable = new Mixin('Decidable', {
        decide: function(decider, decisionTable) {
            var decision;

            if (isObject(decider)) {
                decisionTable = decider;
                decider = identity;
            }

            Obj.each(decisionTable, function(decision) {
                // TODO check if already mixed in
                M$Forwardable.mixInto(decision);
            });

            return this.forward({
                update: function makeDecision(forwardedValue, newValue) {
                    var nextDecision = decisionTable[decider(newValue)];

                    if (nextDecision) {
                        if (decision !== nextDecision) {
                            decision && decision.stopForwardingTo(forwardedValue);

                            decision = nextDecision;

                            decision.forwardTo(forwardedValue);
                        }
                    }
                    else {
                        forwardedValue.error(new Error('No decision possible'));
                    }
                }
            });
        }
    }, {
        classes: [this],

        depends: [M$Forwardable]
    });

    return M$Decidable;
});