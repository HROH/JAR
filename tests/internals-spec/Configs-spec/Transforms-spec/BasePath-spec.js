JARS.module('internals-spec.Configs-spec.Transforms-spec.BasePath-spec').$import(['*!Registries/Internals']).$export(function(InternalsRegistry) {
    'use strict';

    var expect = chai.expect,
        PathTransform = InternalsRegistry.get('Configs/Transforms/Path');

    describe('Configs/Transforms/BasePath()', function() {
        var BasePathTransform = InternalsRegistry.get('Configs/Transforms/BasePath');

        it('should point at `Configs/Transforms/Path`', function() {
            expect(BasePathTransform).to.equal(PathTransform);
        });
    });
});
