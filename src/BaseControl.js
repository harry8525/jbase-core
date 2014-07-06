(function ()
{
    /// <summary>
    /// The BaseControl class provides a base class for all controls to subclass from.
    ///
    /// The base control should be subclassed like such:
    ///
    /// defineSubClass(
    ///    "JBase.UI.Repeater",
    ///    JBase.UI.BaseControl,
    ///    function() { /* constructor */ },
    ///    { /* members */ });
    ///
    /// A control represents an entity that manages the presentation of a ui component. It is responsible
    /// for producing markup for the control as a string, binding/unbinding events, and keeping the DOM updated
    /// when data changes.
    ///
    /// A control has the following lifetime:
    ///
    ///    1. Fresh instantiated control - the control is not active but the constructor has been initialized.
    ///       At this point the caller can call control.setDataContext(object) to set the control's data context
    ///       to the object it expects, and control.renderHtml() to render the control's markup.
    ///
    ///    2. Activation - once the control's markup is in the dom, the caller can call control.activate() to
    ///       initialize it. The control will find the base element in the DOM associated with the instance
    ///       and assign it to the control.element property. This control is then considered "active" and at this
    ///       point the DOM should be kept up to date when its data changes. If the control uses a JBase template,
    ///       bind statements will automatically be updated when change events on the dataContext are fired.
    ///
    ///    3. Deactivation - when the control no longer needs to be used, the caller can call control.deactivate()
    ///       to release event bindings and cease DOM updates. At this point, you can still called .activate() to
    ///       reactivate the control and have the DOM automatically updated to the correct state.
    ///
    ///    4. Disposed - when the control will no longer used and won't be reactivated, the caller should call
    ///       control.dispose() to dispose of the control.
    ///
    /// When you implement a subclass and want to return markup, the base class will automatically call certain
    /// methods when the control state changes. You can optionally implement these methods in your control:
    ///
    /// onRenderHtml() - If your control renders markup, you should return that markup as a string. If you use a
    ///                  JBase template, this method will be generated for you at compile time.
    ///
    /// onActivate() - Called when the control has been activated.
    ///
    /// onDeactivate() - Called when the control has been deactivated.
    ///
    /// onDispose() - Called when the control has been disposed. If the control is active, it will first be deactivated.
    ///
    /// Controls can have child controls, which can be added and removed via addChild/removeChild, which will
    /// add the child to the children collection, and will automatically forward activate/deactivate/dispose calls.
    ///
    /// </summary>

    var _instanceCount = 0;
    var _controlCount = 0;

    defineClass(
        "JBase.UI.BaseControl",
        function ()
        {
            /// <summary>The BaseControl constructor, initializes instanced variables.</summary>

            // mix in default properties to this instance.
            mix(this, {
                automationType: this["__fullName"],
                children: [],
                _dataContextChangeCount: 0,
                parent: /* @static_cast(JBase.UI.BaseControl) */null,
                __instanceId: _instanceCount++,
                __lastValues: [],
                __subElementsByIndex: null,
                __dataContextHasChanged: false,
                __isProcessingChange: false,
                __renderFrameUpdates: {},
                __onRenderFrameUpdateCallback: bind(this, this._onRenderFrameUpdate)
            });
        },
        { // prototype (and default non-instanced settings.)

            /// <field type="Boolean">Automation type for the control.</field>
            automationType: /* @static_cast(String) */null,

            /// <field type="Boolean">Automation id for the control instance, provided by the control.</field>
            automationId: /* @static_cast(String) */null,

            apiIdBase: /* @static_cast(String) */null,

            /// <field type="Boolean">Determines if the control is in an initialized state or not.</field>
            isInitialized: false,

            /// <field type="Boolean">Determines if the control is in an active state or not.</field>
            isActive: false,

            /// <field type="Boolean">Determines if the control has been disposed or not.</field>
            isDisposed: false,

            /// <field type="Boolean">Type of element that the base class will automatically create.</field>
            baseTag: "div",

            /// <field type="constructor">The base data context type.</field>
            baseDataContextType: JBase.DataContext,

            /// <field type="String">CSS class to inject for the root element in addition to the default c-ClassName style.</field>
            baseClass: '',

            /// <field type="String">The base style to inject into the control.</field>
            baseStyle: '',

            /// <field type="HTMLElement">Element reference.</field>
            element: /* @static_cast(HTMLElement) */null,

            /// <field type="JBase.DataContext">Data Context reference.</field>
            dataContext: /* @static_cast(*) */null,

            /// <field type="String">The id for the control.</field>
            id: /* @static_cast(String) */null,

            /// <field type="String">The name for the control.</field>
            controlName: /* @static_cast(String) */null,

            /// <field type="String">The sutraLabel for the control.</field>
            sutraLabel: /* @static_cast(String) */null,

            /// <field type="void -> void">This is called when the control is initialized.</field>
            onInitialize: /* @static_cast(*) */null,

            /// <field type="JBase.DataContext -> void">This is called when the data context change.</field>
            onDataContextChanged: /* @static_cast(*) */null,

            /// <field type="void -> void">This is called when the control is activated.</field>
            onActivate: /* @static_cast(*) */null,

            /// <field type="void -> void">This is called when the control is deactivated.</field>
            onDeactivate: /* @static_cast(*) */null,

            /// <field type="void -> void">This is called when the control is disposed.</field>
            onDispose: /* @static_cast(*) */null,

            /// <field type="void -> void">This is called when the control is resized.</field>
            onResize: /* @static_cast(*) */null,

            /// <field type="Array">The annotations generated by the compile time html translation.</field>
            __annotations: /* @static_cast(Array) */null,

            /// <field type="Array">The bindings used for updating the control.</field>
            __bindings: /* @static_cast(Array) */null,

            /// <field type="Array">The state exposed on the control for testing.</field>
            __state: /* @static_cast(Array) */null,

            /// <field type="Object">The sub controls that should be intialized during intialize.</field>
            __subControls: /* @static_cast(Object) */null,

            /// <field type="Boolean">This is true if we have already disposed.</field>
            _hasDisposed: /* @static_cast(Boolean) */false,

            setDataContext: /* @bind(JBase.UI.BaseControl) */function (dataContext, forceUpdate)
            {
                /// <summary>Set the dataContext to an object instance.</summary>
                /// <param name="dataContext">Data context object.</param>
                /// <param name="forceUpdate" type="Boolean" optional="true">Treat the dataContext as a new object, even if it's the same.</param>

                if (dataContext)
                {
                    // Test if we are overriding the existing data context, with another data context instance
                    if (dataContext.__isDataContext)
                    {
                        // Check if its the same one or we are in a case were we never created one
                        if (!this.dataContext || dataContext !== this.dataContext)
                        {
                            // unbind if necessary.
                            if (this.dataContext)
                            {
                                /* @disable(0092) */
                                this.onDataContextChanged && this.removeChangeListener(this.dataContext);
                                /* @restore(0092) */

                                this.dataContext.removeRef();

                                // Disconnect parent reference.
                                if (this.dataContext.parent === this)
                                {
                                    this.dataContext.parent = null;
                                }
                            }

                            this.dataContext = dataContext;
                            this.dataContext.addRef();

                            // Connect parent reference for resource resolution.
                            if (!this.dataContext.parent)
                            {
                                this.dataContext.parent = this;
                            }

                            // bind if necessary.
                            if (/* @static_cast(Boolean) */this.onDataContextChanged && /* @static_cast(Boolean) */this.dataContext)
                            {
                                this.addChangeListener(this.dataContext, this.change);
                            }

                            this.change();
                        }
                        else if (forceUpdate) // we still need co call change if force update was called
                        {
                            this.change();
                        }
                    }
                    else // We have just an object that is not a data context
                    {
                        this._createDataContextIfNull();

                        this.dataContext.setData(dataContext, forceUpdate);
                    }
                }
                else // null was passed in so reset the data context
                {
                    this._createDataContextIfNull();
                    this.dataContext.reset();

                    // Assume we're clearing so call change on the dataContext.
                    this.dataContext.change();
                }
            },

            renderHtml: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Render the control as html. To provide your own implementation, implement onRenderHtml instead of replacing this.</summary>
                /// <returns type="String">Returns the html to render as a string.</returns>

                var _this = this;

                Debug.assert(!this.isActive, "An active control is being rerendered. This will overwrite element references and cause bugs. Make sure this control is deactivated first.");

                this.apiIdBase && Qos.start(this.apiIdBase + "_" + "RenderHtml");

                (!_this.isInitialized) && _this.initialize();

                // Generate an id if one isn't already provided.
                /* @disable(0092) */
                _this.controlName = _this.controlName || _this.__className;
                /* @restore(0092) */

                _this.id = _this.id || (_this.controlName + '-' + _controlCount++);

                // It is assumed _this we don't need to update bindings after render is called.
                _this.__dataContextHasChanged && _this.change(true);

                _this._clearElementReferences();

                var result = _this.baseTag ? _this.onRenderHtml() : '';

                this.apiIdBase && Qos.end();

                return result;
            },

            onRenderHtml: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>
                /// This is the default onRenderHtml implmentation (this can be overidden)
                /// </summary>
                /// <returns type="String">The generated html markup for this control</returns>

                return this.defaultRenderHtml('');
            },

            defaultRenderHtml: /* @bind(JBase.UI.BaseControl) */function (html)
            {
                /// <summary>
                /// This is the default onRenderHtml implmentation, it accepts a html is a param so other controls can call this method in override scenarios
                /// </summary>
                /// <param name="html" type="String">Html to insert into the default render html implmentation</param>
                /// <returns type="String">The generated html markup for this control</returns>

                return '<' + this.baseTag + ' id="' + this.id + '_0" class="c-' + this.controlName + (this.baseClass ? " " + this.baseClass : "") + '"' + (this.baseStyle ? (' style="' + this.baseStyle + '"') : "") + (this.sutraLabel ? sutraAttribute(this.sutraLabel) : "") + '>' + (html ? html : '') + '</' + this.baseTag + '>';
            },

            initialize: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Initializes the control if it has not been done already.</summary>

                if (!this.isInitialized)
                {
                    this.isInitialized = true;

                    // Create sub controls
                    var subControls = this.__subControls;

                    if (subControls)
                    {
                        for (var x in subControls)
                        {
                            this[x] = this.createChild(subControls[x]);
                        }
                    }

                    // Call on initialize
                    this.onInitialize && this.onInitialize();
                }
            },

            activate: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Activates the control. To provide your own implementation, implement onActivate instead of replacing this.</summary>

                var _this = this;

                Debug.assert(!_this.isDisposed, "A control was activated after being disposed.");

                if (!_this.isDisposed)
                {
                    var i;
                    var count = _this.children ? _this.children.length : 0;

                    (!this.isInitialized) && _this.initialize();

                    for (i = 0; i < count; i++)
                    {
                        var child = _this.children[i];
                        child.activate && child.activate();
                    }

                    if (!_this.isActive)
                    {
                        this.apiIdBase && Qos.start(this.apiIdBase + "_" + "Activate");

                        _this._findSubElementsAndAddUserActions();

                        if (!_this.element && /* @static_cast(Boolean) */_this.baseTag)
                        {
                            _this.element = _this.__subElementsByIndex[0] || byId(_this.id + '_0');
                        }

                        /* @disable(0092) */
                        Debug.assert(!_this.baseTag || !!_this.element, "The element for the control \"" + _this.__className + "\" was not found in the DOM upon activation.");
                        /* @restore(0092) */

                        if (_this.element)
                        {
                            _this.element.control = _this.element.control || _this;
                        }

                        _this.isActive = true;

                        _this.onActivate && _this.onActivate(_this.dataContext, _this.subElements);

                        _this.__dataContextHasChanged && _this.change();

                        this.apiIdBase && Qos.end();
                    }
                }
            },

            resize: /* @bind(JBase.UI.BaseControl) */function ()
            {
                var _this = this;

                this.apiIdBase && Qos.start(this.apiIdBase + "_" + "Resize");

                var i;
                var count;

                if (_this.isActive)
                {
                    count = _this.children.length;
                    for (i = 0; i < count; i++)
                    {
                        var child = _this.children[i];

                        child.resize && child.resize();
                    }

                    // We need to do this on the next render frame since the style has not been applied yet
                    if (_this.onResize)
                    {
                        // Do on end of resize
                        _this.doOnEndOfRenderFrame('BaseControl.onResize', function ()
                        {
                            if (_this.isActive)
                            {
                                _this.onResize();
                            }
                        });
                    }
                }

                this.apiIdBase && Qos.end();
            },

            deactivate: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Activates the control. To provide your own implementation, implement onDeactivate instead of replacing this.</summary>

                var _this = this;
                var i;
                var count = _this.children ? this.children.length : 0;

                for (i = 0; i < count; i++)
                {
                    var child = _this.children[i];

                    child.deactivate && child.deactivate();
                }

                if (_this.isActive)
                {
                    this.apiIdBase && Qos.start(this.apiIdBase + "_" + "Deactivate");

                    _this.isActive = false;
                    _this.clearElementListeners();

                    _this.onDeactivate && _this.onDeactivate();

                    // See if we had any pending updates
                    // if we did mark the dirty bit
                    for (var x in _this.__renderFrameUpdates)
                    {
                        _this.__dataContextHasChanged = true;
                        break;
                    }

                    // clean the render frame updates
                    _this.__renderFrameUpdates = {};

                    this.apiIdBase && Qos.end();
                }
            },

            dispose: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Disposes the control (and deactivates if active.) To provide your own implementation, implement onDispose instead of replacing this.</summary>

                var _this = this;
                var count = _this.children ? _this.children.length : 0;

                for (var i = 0; i < count; i++)
                {
                    var child = _this.children[i];

                    child.dispose && child.dispose();
                }

                if (!_this._hasDisposed)
                {
                    _this._hasDisposed = true;
                    _this.isDisposed = true;

                    this.apiIdBase && Qos.start(this.apiIdBase + "_" + "Dispose");

                    _this.isActive && _this.deactivate();
                    _this.onDispose && _this.onDispose();

                    _this._clearElementReferences();

                    if (_this.dataContext)
                    {
                        // Dont call set data context to null since that will reset the data context and 
                        // the base control should not do that since it does not own the data context.
                        _this.removeChangeListener(_this.dataContext);
                        _this.dataContext.removeRef();
                        _this.dataContext = null;
                    }

                    _this.parent = null;
                    _this.children = [];

                    this.apiIdBase && Qos.end();
                }
            },

            asyncDispose: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Asynchronously disposes the control.</summary>

                var _this = this;
                var i;
                var count;

                if (!_this.isDisposed)
                {
                    _this.isDisposed = true;

                    // Delay dispose children.
                    count = _this.children.length;
                    for (i = 0; i < count; i++)
                    {
                        var child = _this.children[i];

                        child.asyncDispose && child.asyncDispose();
                    }

                    JBase.autoDispose(_this);

                    _this.parent = null;
                    _this.children = [];
                }
            },

            createChild: /* @bind(JBase.UI.BaseControl) */function (controlType, options, dataContext)
            {
                /// <summary>Simple helper to create a control, mix in options and add it as a child.</summary>
                /// <param name="controlType" type="*">Control constructor.</param>
                /// <param name="options" type="Object" optional="true">Optional property bag to mix in.</param>
                /// <param name="dataContext" type="JBase.DataContext" optional="true">Data context object to set.</param>
                /// <returns>Instance of control.</returns>

                var childControl = new controlType();

                /* @disable(0157) */
                options && mix(childControl, options);
                /* @restore(0157) */
                dataContext && childControl.setDataContext(dataContext);
                this.addChild(childControl);

                return childControl;
            },

            addChild: /* @bind(JBase.UI.BaseControl) */function (childControl)
            {
                /// <summary>Adds a child control to the control's children collection and sets its parent value to this for event bubbling.</summary>
                /// <param name="childControl">Child control.</param>
                /// <returns>Instance of control.</returns>

                this.children.push(childControl);
                childControl.parent = this;

                return childControl;
            },

            removeChild: /* @bind(JBase.UI.BaseControl) */function (childControl, childIndex)
            {
                /// <summary>Removes a child control.</summary>
                /// <param name="childControl">Child control.</param>
                /// <param name="childIndex" type="Number" optional="true">Index of control. If not provided, will use indexOf to find it (which can be slow.)</param>
                /// <returns>Instance of control.</returns>

                childIndex = (childIndex === undefined) ? this.children.indexOf(childControl) : childIndex;

                if (childIndex !== -1)
                {
                    this.children.splice(childIndex, 1);
                    childControl.parent = null;
                }

                return childControl;
            },

            clearChildren: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Disposes and removes all child controls.</summary>

                var childCount = this.children ? this.children.length : 0;

                for (var i = 0; i < childCount; i++)
                {
                    var child = this.children[i];

                    child.dispose && child.dispose();
                    child.parent = null;
                }

                this.children.length = 0;
            },

            change: /* @bind(JBase.UI.BaseControl) */function (forceUpdate)
            {
                /// <summary>
                /// Triggers the onDataContextChanged method if the control is active. (If the control isn't active, the dataContext will be marked
                /// as changed so that onDataContextChanged will be called when it becomes active.)
                /// </summary>
                /// <param type="Boolean" name="forceUpdate" optional="true">This will force an update, even if the item is not active</param>

                var _this = this;

                if (!_this.isDisposed)
                {
                    _this.apiIdBase && Qos.start(this.apiIdBase + "_" + "Change");

                    if (_this.isActive || forceUpdate)
                    {
                        _this.__dataContextHasChanged = true;

                        // Only allow the first one in. If we re-enter, we'll mark a change and we'll re-call onDataContextChanged after we've
                        // unwound the stack. This prevents scenarios where re-entrance can be unexpected and cause states to change out of order.
                        if (!_this.__isProcessingChange)
                        {
                            var cyclesLeft = 5;

                            _this.__isProcessingChange = true;

                            try
                            {
                                while (cyclesLeft > 0 && _this.__dataContextHasChanged)
                                {
                                    cyclesLeft--;

                                    _this.__dataContextHasChanged = false;

                                    _this.onDataContextChanged && _this.onDataContextChanged(_this.dataContext);

                                    _this._updateBindings();
                                }
                            }
                            finally
                            {
                                _this.__isProcessingChange = false;
                            }

                            Debug.assert(cyclesLeft > 0, "Got into a redundant update dataContext change cycle.");
                        }
                    }
                    else
                    {
                        _this.__dataContextHasChanged = true;
                    }

                    this.apiIdBase && Qos.end();
                }
            },

            getControlInstanceId: /* @bind(JBase.UI.BaseControl) */function (id)
            {
                /// <summary>
                /// This generate a control instance specific id
                /// </summary>
                /// <param name="id" type="String">The id to subclass the control specific id</param>
                /// <returns type="String">The control instance specific id</param>

                /* @disable(0092) */
                return this.__fullName + this.id + '_' + id + '_' + this.__instanceId;
                /* @restore(0092) */
            },

            doOnRenderFrame: /* @bind(JBase.UI.BaseControl) */function (id, callback, hideOnRenderFrameFromLog)
            {
                /// <summary>
                /// This will call the passed callback at the next render frame, if the guid is already registered it will
                /// overwrite that callback with the passed one
                /// </summary>
                /// <param name="id" type="String">The id for the current callback</param>
                /// <param name="callback" type="void -> void">The callback to call on render frame</param>
                /// <param name="hideOnRenderFrameFromLog" type="Boolean" optional="true">This is true if we should hide this call from the trace logs (this is to stop infinite log scenarios, aka trace window render frame calls)</param>

                var _this = this;

                doOnRenderFrame(this.getControlInstanceId(id), function () { _this.isActive && callback.apply(_this, arguments); }, hideOnRenderFrameFromLog);
            },

            doOnRenderFrameEveryXFrames: /* @bind(JBase.UI.BaseControl) */function (id, callback, everyXFramesCount, hideOnRenderFrameFromLog)
            {
                /// <summary>
                /// This will call the passed callback every X render frames, if the guid is already registered it will
                /// overwrite that callback with the passed one
                /// </summary>
                /// <param name="id" type="String">The id for the current callback</param>
                /// <param name="callback" type="void -> void">The callback to call on render frame</param>
                /// <param name="everyXFramesCount" type="Number">The number of render frames before the callback is called</param>
                /// <param name="hideOnRenderFrameFromLog" type="Boolean" optional="true">This is true if we should hide this call from the trace logs (this is to stop infinite log scenarios, aka trace window render frame calls)</param>

                var _this = this;

                doOnRenderFrameEveryXFrames(this.getControlInstanceId(id), function () { _this.isActive && callback.apply(_this, arguments); }, everyXFramesCount, hideOnRenderFrameFromLog);
            },

            stopDoOnRenderFrame: /* @bind(JBase.UI.BaseControl) */function (id)
            {
                /// <summary>
                /// This will stop the call at the next render frame
                /// </summary>
                /// <param name="id" type="String">The id for the render frame call</param>

                stopDoOnRenderFrame(this.getControlInstanceId(id));
            },

            doOnEndOfRenderFrame: /* @bind(JBase.UI.BaseControl) */function (id, callback, hideOnRenderFrameFromLog)
            {
                /// <summary>
                /// This will call the passed callback at the end of the next render frame, if the guid is already registered it will
                /// overwrite that callback with the passed one
                /// </summary>
                /// <param name="id" type="String">The id for the current callback</param>
                /// <param name="callback" type="void -> void">The callback to call on the end of render frame</param>
                /// <param name="hideOnRenderFrameFromLog" type="Boolean" optional="true">This is true if we should hide this call from the trace logs (this is to stop infinite log scenarios, aka trace window render frame calls)</param>

                var _this = this;
                doOnEndOfRenderFrame(this.getControlInstanceId(id), function ()
                {
                    if (_this.isActive)
                    {
                        callback.apply(_this, arguments);
                    }
                }, hideOnRenderFrameFromLog);
            },

            stopDoOnEndOfRenderFrame: /* @bind(JBase.UI.BaseControl) */function (id)
            {
                /// <summary>
                /// This will stop the call at the next end of the render frame
                /// </summary>
                /// <param name="id" type="String">The id for the end of the render frame call</param>

                stopDoOnEndOfRenderFrame(this.getControlInstanceId(id));
            },

            _createDataContextIfNull: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>This creates the data context if its null.</summary>

                // We dont have a data context so create one
                if (!this.dataContext)
                {
                    this.dataContext = new this.baseDataContextType();
                    this.dataContext.parent = this;
                    this.dataContext.addRef();
                    this.dataContext.initialize();

                    // bind if necessary.
                    if (/* @static_cast(Boolean) */this.onDataContextChanged && /* @static_cast(Boolean) */this.dataContext)
                    {
                        this.addChangeListener(this.dataContext, this.change);
                    }

                    // We have a new data context so we must execute the on data context change
                    this.__dataContextHasChanged = true;
                }
            },

            _clearElementReferences: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Clears all references between the element and the control. Called during dispose scenarios.</summary>

                var _this = this;

                if (_this.element)
                {
                    _this.element.control = null;
                    _this.element = null;
                    _this.subElements = {};
                    _this.__subElementsByIndex = null;
                }
            },

            _findSubElementsAndAddUserActions: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Finds the sub elements within the control as defined by annotations provided by a JBase template and adds user actions.</summary>

                var _this = this;

                if (!_this.__subElementsByIndex && /* @static_cast(Boolean) */_this.baseTag)
                {
                    var prefix = _this.id + "_";
                    var index = 0;
                    var child;
                    var annotationCount = _this.__annotations ? _this.__annotations.length : 0;

                    _this.__subElementsByIndex = [];
                    _this.__userActions = [];
                    _this.subElements = {};

                    for (var i = 0; i < annotationCount; i++)
                    {
                        var annotation = _this.__annotations[i];
                        var id = this.id + "_" + annotation.id;
                        var element = byId(id);

                        /* @disable(0092) */
                        Debug.assert(element, "The sub element (id=" + id + ") was referred to in the template but wasn't found at activation time. There may be a rendering bug in the control: " + _this.__fullName);
                        /* @restore(0092) */

                        _this.__subElementsByIndex[annotation.id] = element;

                        if (annotation.childId)
                        {
                            _this.subElements[annotation.childId] = element;
                        }

                        var userActions = annotation.userActions;

                        // Wire up user actions if they are there
                        if (userActions)
                        {
                            for (var x in userActions)
                            {
                                var func = this[userActions[x]];

                                this.addElementListener(element, x, func);

                                // Cache user action for fast reactivation
                                this.__userActions.push({
                                    element: element,
                                    userAction: x,
                                    func: func
                                });
                            }
                        }
                    }
                }
                else if (this.__userActions)
                {
                    // We need to add user actions every time
                    var userActionsCache = this.__userActions;

                    for (var j = 0; j < userActionsCache.length; j++)
                    {
                        var userAction = userActionsCache[j];
                        this.addElementListener(userAction.element, userAction.userAction, userAction.func);
                    }
                }
            },

            _getControlState: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>
                /// This returns the control's state.
                /// </summary>
                /// <returns type="*">The control's state.</returns>

                var returnValue = {};

                if (this.__bindings)
                {
                    var bindingCount = this.__bindings.length;
                    var bindings = this.__bindings;

                    for (var i = 0; i < bindingCount; i++)
                    {
                        var sourceProperty = bindings[i].sourceProperty;
                        returnValue[sourceProperty] = this[sourceProperty];
                    }
                }

                if (this.__state)
                {
                    var stateCount = this.__state.length;
                    var state = this.__state;

                    for (var x = 0; x < stateCount; x++)
                    {
                        var stateProperty = state[x];
                        returnValue[stateProperty] = this[stateProperty];
                    }
                }

                return returnValue;
            },

            _updateBindings: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>Updates JBase template bindings defined for the control. If not active, will mark a flag to update later.</summary>

                var _this = this;

                if (_this.__bindings)
                {
                    if (_this.isActive)
                    {
                        var bindingCount = _this.__bindings.length;
                        var bindings = _this.__bindings;
                        var subElementsByIndex = _this.__subElementsByIndex;
                        var hasUpdates = false;

                        // We need to reset the updates since we dont update the last values until render frame
                        _this.__renderFrameUpdates = {};

                        for (var i = 0; i < bindingCount; i++)
                        {
                            var binding = bindings[i];
                            var element = subElementsByIndex[binding.id];

                            /* @disable(0092) */
                            Debug.assert(!!element, "Attempting to update the binding of sub element " + binding.id + " for control \"" + _this.__className + "\"");
                            /* @restore(0092) */

                            if (element)
                            {
                                var lastValue = _this.__lastValues[i] = (_this.__lastValues[i] === undefined) ? binding.handler.get(element, binding.destinationProperty) : _this.__lastValues[i];
                                var currentValue = _this[binding.sourceProperty];

                                // Normalize types to match last value.
                                switch (typeof lastValue)
                                {
                                    case "string":
                                        currentValue = currentValue || "";
                                        break;
                                    case "boolean":
                                        currentValue = !!currentValue;
                                        break;
                                    case "number":
                                        currentValue = Number(currentValue || 0);
                                        break;
                                }

                                if (currentValue != lastValue)
                                {
                                    _this.__renderFrameUpdates[i] = {
                                        element: element,
                                        newValue: currentValue
                                    };

                                    hasUpdates = true;
                                }
                            }
                        }

                        // Schedules a on render frame
                        /* @disable(0092) */
                        hasUpdates && /* @static_cast(Boolean) */_this.doOnRenderFrame('_renderFrameUpdates', _this.__onRenderFrameUpdateCallback, _this.suppressBaseControlTracing);
                        /* @restore(0092) */

                        _this.__shouldUpdateBindings = false;
                    }
                    else
                    {
                        _this.__shouldUpdateBindings = true;
                    }
                }
            },

            _onRenderFrameUpdate: /* @bind(JBase.UI.BaseControl) */function ()
            {
                /// <summary>
                /// This does the render frame update
                /// </summary>

                for (var x in this.__renderFrameUpdates)
                {
                    var binding = this.__bindings[x];
                    var renderFrameUpdate = this.__renderFrameUpdates[x];

                    binding.handler.set(renderFrameUpdate.element, binding.destinationProperty, renderFrameUpdate.newValue);
                    this.__lastValues[x] = renderFrameUpdate.newValue;
                }

                // reset the update values
                this.__renderFrameUpdates = {};
            }
        },
    /* statics: */null,
        Shared.ElementEventing,
        Shared.ObjectEventing,
        Shared.Async,
        Shared.Resourcable);

    var c_bindingTypes = ["attr", "className", "css"];
    var c_booleanAttrBinding = {
        get: function (element, name)
        {
            /// <summary>Gets an attribute value from an element.</summary>
            /// <param name="element" type="HTMLElement">Element in question.</param>
            /// <param name="name" type="String">Attribute to get.</param>
            /// <returns type="Boolean">Attribute value.</returns>

            return (element.getAttribute(name) === "true");
        },
        set: function (element, name, value)
        {
            /// <summary>Sets an attribute value on an element.</summary>
            /// <param name="element" type="HTMLElement">Element in question.</param>
            /// <param name="name" type="String">Attribute to set.</param>
            /// <param name="value" type="Boolean">Value to set.</param>

            element.setAttribute(name, typeof value === "string" ? value : String(!!value));
        }
    };

    var c_bindingHandlers = {
        /// <summary>Binding handlers that get and set properties for the various data binding sources.</summary>

        "attr": {
            get: function (element, name)
            {
                /// <summary>Gets an attribute value from an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Attribute to get.</param>
                /// <returns type="String">Attribute value.</returns>

                return element.getAttribute(name);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets an attribute value on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Attribute to set.</param>
                /// <param name="value" type="Boolean">Value to set.</param>

                if (value !== null && value !== undefined && value !== false)
                {
                    element.setAttribute(name, String(value));
                } else
                {
                    element.removeAttribute(name);
                }
            }
        },
        "attr.style": {
            get: function (element, name)
            {
                /// <summary>Gets the style attribute value on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Attribute to set.</param>
                /// <returns type="String">Attribute value.</returns>

                return element.style.cssText;
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the style attribute value on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Attribute to set.</param>
                /// <param name="value" type="String">Value to set.</param>

                element.style.cssText = value;
            }
        },
        "attr.class": {
            get: function (element, name)
            {
                /// <summary>Gets the class attribute value on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Attribute to set.</param>
                /// <returns type="String">Attribute value.</returns>

                return element.className;
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the class attribute value on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Attribute to set.</param>
                /// <param name="value" type="String">Value to set.</param>

                element.className = value;
            }
        },
        "attr.checked": {
            get: function (element, name)
            {
                /// <summary>Gets the checked state of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <returns type="Boolean">Checked state.</returns>

                return (element.getAttribute(name) === "checked");
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the checked state on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <param name="value" type="Boolean">Value to set.</param>

                element.checked = !!value;
            }
        },
        "attr.aria-expanded": c_booleanAttrBinding,
        "attr.aria-selected": c_booleanAttrBinding,
        "attr.aria-checked": c_booleanAttrBinding,
        "attr.aria-pressed": c_booleanAttrBinding,
        "attr.disabled": {
            get: function (element, name)
            {
                /// <summary>Gets the disabled state of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <returns type="Boolean">Disabled state.</returns>

                return (element.getAttribute(name) === "disabled");
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the disabled state on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <param name="value" type="Boolean">Value to set.</param>

                element.disabled = !!value;
            }
        },
        "attr.html": {
            get: function (element)
            {
                /// <summary>Gets the html value of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <returns type="String">Html content.</returns>

                return getHtml(element);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the html content of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <param name="value" type="String">Value to set.</param>

                setHtml(element, value);
            }
        },
        "attr.text": {
            get: function (element)
            {
                /// <summary>Gets the text value of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <returns type="String">Text content.</returns>

                return getText(element);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the text value on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Ignored.</param>
                /// <param name="value" type="Boolean">Value to set.</param>

                setText(element, value);
            }

        },
        "className": {
            get: function (element, name)
            {
                /// <summary>Gets the class state of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Class name.</param>
                /// <returns type="Boolean">True is the class exists.</returns>

                return hasClass(element, name);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets the class state of an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Class name.</param>
                /// <param name="value" type="Boolean">True is the class should exist.</param>

                toggleClass(element, name, value);
            }
        },
        "css": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="String">Value of style property (not computed to avoid a perf penalty.)</returns>

                return element.style[name];
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style[name] = value;
            }
        },
        "css.display": {
            get: function (element, name)
            {
                return element.style[name] !== "none";
            },
            set: function (element, name, value)
            {
                element.style[name] = (!!value) ? "block" : "none";
            }
        },
        "css.display.inline": {
            get: function (element, name)
            {
                return element.style.display !== "none";
            },
            set: function (element, name, value)
            {
                element.style.display = (!!value) ? "inline" : "none";
            }
        },
        "css.display.inlineBlock": {
            get: function (element, name)
            {
                return element.style.display !== "none";
            },
            set: function (element, name, value)
            {
                element.style.display = (!!value) ? "inline-block" : "none";
            }
        },
        "css.visibility": {
            get: function (element, name)
            {
                return element.style[name] === "visible";
            },
            set: function (element, name, value)
            {
                element.style[name] = (!!value) ? "visible" : "hidden";
            }
        },
        "css.width.px": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="Number">Value of style property (not computed to avoid a perf penalty.)</returns>

                return parseInt(element.style.width);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style.width = value + 'px';
            }
        },
        "css.height.px": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="Number">Value of style property (not computed to avoid a perf penalty.)</returns>

                return parseInt(element.style.height);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style.height = value + 'px';
            }
        },
        "css.left.px": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="Number">Value of style property (not computed to avoid a perf penalty.)</returns>

                return parseInt(element.style.left);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style.left = value + 'px';
            }
        },
        "css.right.px": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="Number">Value of style property (not computed to avoid a perf penalty.)</returns>

                return parseInt(element.style.right);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style.right = value + 'px';
            }
        },
        "css.top.px": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="Number">Value of style property (not computed to avoid a perf penalty.)</returns>

                return parseInt(element.style.top);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style.top = value + 'px';
            }
        },
        "css.bottom.px": {
            get: function (element, name)
            {
                /// <summary>Gets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <returns type="Number">Value of style property (not computed to avoid a perf penalty.)</returns>

                return parseInt(element.style.bottom);
            },
            set: function (element, name, value)
            {
                /// <summary>Sets a css style on an element.</summary>
                /// <param name="element" type="HTMLElement">Element in question.</param>
                /// <param name="name" type="String">Style property name.</param>
                /// <param name="value" type="String">String value of style property.</param>

                element.style.bottom = value + 'px';
            }
        }
    };

    window.processAnnotations = function (className, annotations, state, subControls)
    {
        /// <summary>This helper is called by the output generated from a compiled JBase template to annotate the control.</summary>
        /// <param name="className" type="*">Name of the control class to apply the annotations and sutra label to.</param>
        /// <param name="annotations" type="Array">Annotations object containing binding definitions and child ids.</param>
        /// <param name="state" type="Array">The list of values that should be extracted in get control state.</param>
        /// <param name="subControls" type="Object">The list of sub controls to create during initialize.</param>

        var annotationCount = annotations.length;
        var count;
        var bindings = className.prototype.__bindings = [];

        className.prototype.__state = state;
        className.prototype.__subControls = subControls;

        className.prototype.__annotations = annotations;

        for (var i = 0; i < annotationCount; i++)
        {
            var annotation = annotations[i];
            var bindingCount = c_bindingTypes.length;

            for (var bindingTypeIndex = 0; bindingTypeIndex < bindingCount; bindingTypeIndex++)
            {
                var bindingType = c_bindingTypes[bindingTypeIndex];
                var array = annotation[bindingType];

                count = array ? array.length : 0;
                for (var j = 1; j < count; j += 2)
                {
                    var sourceProperty = array[j];
                    var destinationProperty = array[j - 1];

                    bindings.push({
                        id: annotation.id,
                        handler: c_bindingHandlers[bindingType + "." + destinationProperty] || c_bindingHandlers[bindingType],
                        sourceProperty: sourceProperty,
                        destinationProperty: destinationProperty
                    });
                }
            }
        }
    };
})();
