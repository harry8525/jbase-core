/// Copyright (C) Microsoft Corporation. All rights reserved.

/// <summary>
/// The ImageLoader utility loads images in background IMG elements, and calls a callback when an image is successfully
/// loaded. If the image fails to load, no callback is made. Up to 10 simultaneous images will be attempted to be loaded
/// at a time.
/// </summary>

(function ()
{
    var WorkMonitor = Shared.WorkMonitor;

    var c_maxSimultaneousImages = 10;
    var c_traceCategory = "ImageLoader";
    var c_retryPerImage = 3;
    var c_durationsOfRetries = [5000, 15000, 30000];

    Trace.register(c_traceCategory, { isEnabled: false });

    var c_retryParamName = "retryid";

    defineNamespace(
        "Shared.ImageLoader",
        {
            _loadedUrls: {},
            _imageStates: {},
            _urlQueue: [],
            _loadAttempts: 0,
            _loadRetryAttempts: 0,
            _loadSuccess: 0,
            _loadError: 0,
            _loadAbort: 0,
            _loadPending: 0,

            loadImagePromise: function (url, imgElement)
            {
                /// <summary>Loads a given an image, returns a promise that represents the operation.</summary>
                /// <param name="url" type="String">Url of image.</param>
                /// <param name="imgElement" type="HTMLElement">Image element.</param>
                /// <returns type="Shared.RetriablePromise">Image loading promise.</returns>

                var urlToLoad = url;
                var _this = this;
                var attempt = 0;
                var trace;

                var promise = new Shared.RetriablePromise(
                    function execute(complete, error)
                    {
                        if (++attempt === 1)
                        {
                            trace = Trace.log("Loading image: " + url, c_traceCategory);
                        }
                        else
                        {
                            Trace.logTo(trace, "Retrying image (attempt: " + attempt + ", pending: " + _this._loadPending + ")", c_traceCategory);
                        }
                        _this.loadImage(urlToLoad, imgElement, complete, error, (attempt > 1));
                    },
                    function cancel()
                    {
                        var imageState = _this._imageStates[url];

                        // If the url is still in the queue, decrease the refcount.
                        if (imageState)
                        {
                            imageState.references--;
                            if (!imageState.references)
                            {
                                // There are no more references, remove it from the queue.
                                delete _this._imageStates[url];
                            }
                        }
                    },
                    c_retryPerImage, /* Times to retry */
                    c_durationsOfRetries, /* Durations to wait until retrying. */
                    null /* All errors except cancels and exceptions are retriable, default behavior. */
                );

                promise.then(
                    function onComplete()
                    {
                        Trace.logTo(trace, "Complete", c_traceCategory);
                    },
                    function onError()
                    {
                        Trace.logTo(trace, "Error", c_traceCategory);
                    }
                );

                WorkMonitor.monitorPromise([WorkMonitor.StandardTags.Network, WorkMonitor.StandardTags.Network_Image], promise);

                return promise;
            },

            loadImage: function (url, imgElement, onComplete, onError, forceDownload)
            {
                /// <summary>
                /// Loads the given url in an image element and calls onComplete(url) when done. If the image has been
                /// successfully viewed before in this session, onComplete will be called immediately.
                /// </summary>
                /// <param name="url" type="String">Url of image.</param>
                /// <param name="onComplete" type="String, HTMLElement -> void">Function to call when the image is done loading.</param>

                var _this = this;

                imgElement = imgElement || ce("img");

                if (_this._loadedUrls[url])
                {
                    imgElement.src = url;
                    onComplete(url, imgElement);
                }
                else
                {
                    var imageState = _this._imageStates[url];

                    if (!imageState)
                    {
                        forceDownload && _this._loadRetryAttempts++;

                        imageState = _this._imageStates[url] = {
                            url: url,
                            elements: [imgElement],
                            callbacks: [],
                            errorCallbacks: [],
                            references: 1,
                            forceDownload: forceDownload
                        };
                        onComplete && imageState.callbacks.push(onComplete);
                        onError && imageState.errorCallbacks.push(onError);

                        _this._urlQueue.push(url);
                        _this.processQueue();
                    }
                    else
                    {
                        imageState.elements.push(imgElement);
                        imageState.references++;

                        onComplete && imageState.callbacks.push(onComplete);
                        onError && imageState.errorCallbacks.push(onError);
                        imageState.forceDownload = imageState.forceDownload || forceDownload;
                    }

                }
            },

            isIdle: function ()
            {
                /// <summary>Returns true if there are no images loading.</summary>
                /// <returns type="Boolean">Idle state.</returns>

                return (this._loadPending === 0);
            },

            isLoaded: function (url)
            {
                return !!this._loadedUrls[url];
            },

            isDomainAccessible: function (url, callback)
            {
                /// <summary>
                /// Overrideable method to return true is the url's domain is accessible. This gives flexibility to delay
                /// an image to start loading until a domain has been authenticated.
                /// 
                /// If overridden, once a domain is available, call this.processQueue() to reprocess any images pending.
                /// </summary>
                /// <param name="url" type="String">URL of the image</param>
                /// <param name="callback" type="*" optional="true">Function to callback when the image is available</param>
                /// <returns type="Boolean">True if domain in url is accessible.</returns>

                return true;
            },

            onError: function (url)
            {
                /// <summary>This method can be overridden, and will be called whenever an image fails to load.</summary>
            },

            processQueue: function ()
            {
                /// <summary>
                /// Processes the image queue. Does nothing unless there are pending images and we are not at max
                /// simultaneous image load capacity.
                /// </summary>

                var i = 0;
                var _this = this;

                while (i < _this._urlQueue.length && _this._loadPending < c_maxSimultaneousImages)
                {
                    if (Shared.ImageLoader.isDomainAccessible(_this._urlQueue[i]))
                    {

                        // first in first out.
                        var /* @type(String) */url = _this._urlQueue.shift();
                        var imageEntry = _this._imageStates[url];

                        // Only load the image if we have an entry.
                        if (imageEntry)
                        {
                            var image = imageEntry.elements[0];
                            var uniqueUrl = url;

                            _this._addImageEventHandlers(image);

                            if (imageEntry.forceDownload)
                            {
                                uniqueUrl += ((url.indexOf("?") == -1) ? "?" : "&") + c_retryParamName + "=" + Math.random();
                            }

                            _this._loadAttempts++;
                            _this._loadPending++;

                            image.s = url;
                            image.src = uniqueUrl;
                        }
                    }
                    else
                    {
                        i++;
                    }
                }
            },

            _addImageEventHandlers: function (image)
            {
                /// <summary>Creates an image to be used to load stuff.</summary>
                /// <returns type="HTMLElement">Image element.</returns>

                this.addElementListener(image, "load", this._onImageLoad);
                this.addElementListener(image, "error", this._onImageError);
                this.addElementListener(image, "abort", this._onImageAbort);

                return image;
            },

            _removeImageEventHandlers: function (image)
            {
                this.removeElementListener(image, "load", this._onImageLoad);
                this.removeElementListener(image, "error", this._onImageError);
                this.removeElementListener(image, "abort", this._onImageAbort);
            },

            _onImageLoad: function (ev, errorCode)
            {
                /// <summary>Called when an image is loaded.</summary>
                /// <param name="ev" type="*">Event args.</param>
                /// <param name="errorCode" type="Number" optional="true">Optional error code, where 1 = error, and 2 = abort.</param>

                var _this = this;
                var image = ev.currentTarget;
                var url = image.s;
                var imageEntry = _this._imageStates[url];

                _this._removeImageEventHandlers(image);
                _this._loadPending--;

                if (imageEntry)
                {
                    if (!errorCode)
                    {
                        _this._loadSuccess++;

                        _this._loadedUrls[url] = true;

                        for (i = 0; i < imageEntry.callbacks.length; i++)
                        {
                            try
                            {
                                (i > 0) && (imageEntry.elements[i].src = url);
                                imageEntry.callbacks[i](url, imageEntry.elements[i]);
                            }
                            catch (/* @type(Error) */e)
                            {
                                Debug.fail("Tried to call a callback after successfully loading an image and an exception was thrown:" + e);
                            }
                        }
                    }
                    else if (errorCode === 1)
                    {
                        for (i = 0; i < imageEntry.errorCallbacks.length; i++)
                        {
                            imageEntry.errorCallbacks[i](url);
                        }

                        Shared.ImageLoader.onError(url);
                    }

                    delete _this._imageStates[url];
                }

                this.processQueue();
            },

            _onImageError: function (ev)
            {
                /// <summary>Called when an image failed to load.</summary>

                this._loadError++;

                this._onImageLoad(ev, 1);
            },

            _onImageAbort: function (ev)
            {
                /// <summary>Called when an image loading was aborted.</summary>

                this._loadAbort++;

                this._onImageLoad(ev, 2);
            }

        });

    mix(Shared.ImageLoader, Shared.ElementEventing);
})();
