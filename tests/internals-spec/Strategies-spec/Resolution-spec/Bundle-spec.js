JARS.module('internals-spec.Strategies-spec.Resolution-spec.Bundle-spec').$import(['*!Registries/Internals']).$export(function(InternalsRegistry) {
    'use strict';

    var expect = chai.expect,
        SubjectsRegistry = InternalsRegistry.get('Registries/Subjects');

    describe('Strategies/Resolution/Bundle()', function() {
        var BundleResolutionStrategy = InternalsRegistry.get('Strategies/Resolution/Bundle');

        describe('given a bundle', function() {
            var testBundle = SubjectsRegistry.get('test.*');

            it('should resolve a bundle dependency module', function() {
                expect(BundleResolutionStrategy(testBundle, 'a')).to.deep.equal({
                    name: 'test.a'
                });
            });

            it('should fail to resolve a bundle dependency module when it is relative', function() {
                expect(BundleResolutionStrategy(testBundle, '.a')).to.deep.equal({
                    error: 'a bundle module is already relative to the base module by default'
                });
            });

            it('should fail to resolve a bundle dependency module when it is versioned', function() {
                expect(BundleResolutionStrategy(testBundle, 'a@1.0.0')).to.deep.equal({
                    error: 'a version must only be added to the base module'
                });
            });
        });

        describe('given a versioned bundle', function() {
            var testBundle = SubjectsRegistry.get('test.*@1.0.0');

            it('should resolve a bundle dependency module', function() {
                expect(BundleResolutionStrategy(testBundle, 'a')).to.deep.equal({
                    name: 'test.a@1.0.0'
                });
            });

            it('should fail to resolve a bundle dependency module when it is relative', function() {
                expect(BundleResolutionStrategy(testBundle, '.a')).to.deep.equal({
                    error: 'a bundle module is already relative to the base module by default'
                });
            });

            it('should fail to resolve a bundle dependency module when it is versioned', function() {
                expect(BundleResolutionStrategy(testBundle, 'a@1.0.0')).to.deep.equal({
                    error: 'a version must only be added to the base module'
                });
            });
        });
    });
});