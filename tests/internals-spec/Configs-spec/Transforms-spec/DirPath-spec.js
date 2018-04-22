JARS.module('internals-spec.Configs-spec.Transforms-spec.DirPath-spec').$import(['*!Registries/Internals']).$export(function(InternalsRegistry) {
    'use strict';

    var expect = chai.expect,
        PathTransform = InternalsRegistry.get('Configs/Transforms/Path');

    describe('Configs/Transforms/DirPath()', function() {
        var DirPathTransform = InternalsRegistry.get('Configs/Transforms/DirPath');

        it('should point at `Configs/Transforms/Path`', function() {
            expect(DirPathTransform).to.equal(PathTransform);
        });
    });
});
