JARS.internal('Handlers/Subjects/Module', function(getInternal) {
    'use strict';

    var AutoAborter = getInternal('Helpers/AutoAborter'),
        PathResolver = getInternal('Resolvers/Path'),
        loadSource = getInternal('SourceManager').load;

    /**
     * @memberof JARS~internals.Handlers.Subjects
     *
     * @implements {JARS~internals.Handlers.Subjects~Completion}
     *
     * @param {JARS~internals.Subjects.Subject} subject
     */
    function Module(subject) {
        this._subject = subject;
    }

    Module.prototype.onCompleted = function() {
        var path = PathResolver(this._subject);

        AutoAborter.setup(this._subject, path);
        loadSource(path);
    };

    return Module;
});
