JAR.module('jar.async.Value.M$Memorizable').$import([
    '.M$Accumulator',
    '.M$Skippable',
    'jar.lang.Mixin'
]).$export(function(M$Accumulator, M$Skippable, Mixin) {
    'use strict';

    var M$Memorizable = new Mixin('Memorizable', {
        memorizeLast: function(count, fillMemory) {
            var memorizedValue;

            count = count > 0 ? count : 1;

            memorizedValue = this.scan(function(memory, newValue) {
                memory.push(newValue);

                memory.length > count && memory.shift();

                return memory;
            }, []);

            return memorizedValue.skipWhile(function(memory) {
                return fillMemory && memory.length < count;
            });
        },

        memorizeAll: function() {
            return this.memorizeLast(Infinity);
        }
    }, {
        classes: [this],

        depends: [M$Accumulator, M$Skippable]
    });



    return M$Memorizable;
});