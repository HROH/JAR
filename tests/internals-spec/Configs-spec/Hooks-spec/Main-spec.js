JARS.module('internals-spec.Configs-spec.Hooks-spec.Main-spec').$import(['*!Registries/Internals']).$export(function(InternalsRegistry) {
    'use strict';

    var expect = chai.expect;

    describe('Configs/Hooks/Main()', function() {
        var MainHook = InternalsRegistry.get('Configs/Hooks/Main');

        it('should be a function', function() {
            expect(MainHook).to.be.a('function');
        });
    });
});
