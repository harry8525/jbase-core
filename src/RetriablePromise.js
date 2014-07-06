(function ()
{
    /// <summary>
    /// Retriable promise implementation, which will execute the onExecute callback until it succeeds, or we have
    /// no retry attempts left. Once we're out of retries, the promise will be considered errored out.
    /// </summary>

    defineSubClass(
        "Shared.RetriablePromise",
        Shared.Promise,
        /* @constructor */ function (onExecute, onCancel, maxRetries, retryDurations, onIsRetriable)
        {
            /// <summary>Retriable promise constructor.</summary>
            /// <param name="onExecute" type="Function">Function callback that will be executed immediately to start the promise.</param>
            /// <param name="onCancel" type="Function">Function callback that will be executed if the promise is canceled.</param>
            /// <param name="maxRetries" type="Number">Max number of attempts before the promise will give up and error.</param>
            /// <param name="retryDurations" type="Array" optional="true">An array of millsecond durations that will be used per retry.</param>
            /// <param name="onIsRetriable" type="Function" optional="true">A callback function that will be executed with error callback arguments and is expected to return true if the error is retriable.</param>

            this._maxRetries = maxRetries;
            this._retryIndex = 0;
            this._retryDurations = retryDurations;
            this._onIsRetriable = onIsRetriable;

            this._executePromiseWithRetry();
        },
        {
            _executePromise: function ()
            { 
                /// <summary>Overriding the base default promise execution so that we can control retrying execute if it fails.</summary>
            },

            _executePromiseWithRetry: function ()
            {
                /// <summary>Executes the onExecute callback and manages retries.</summary>

                var _this = /* @static_cast(Shared.RetriablePromise) */ this;
                var promise = new Shared.Promise(_this._onExecute, _this._onCancel);


                // At _this point, we've started the work and the promise instance is either executing, pass, or fail.

                promise.then(
                    _this._complete,
                    function onError()
                    {
                        var isRetriable = _this._onIsRetriable ? _this._onIsRetriable.apply(_this, arguments) : true;

                        if (isRetriable && _this._retryIndex < _this._maxRetries)
                        {
                            if (!_this._retryDurations)
                            {
                                _this._executePromiseWithRetry();
                            }
                            else
                            {
                                var duration = _this._retryDurations[_this._retryIndex % _this._retryDurations.length];

                                Shared.Promise.timeout(duration).then(bind(_this, _this._executePromiseWithRetry), _this._onCancel);
                            }

                            // retry.
                            _this._retryIndex++;
                        }
                        else
                        {
                            _this._error.apply(_this, arguments);
                        }
                    });
            }
        });

})();
