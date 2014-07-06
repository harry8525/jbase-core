(function ()
{
    /// <summary>
    /// The DataContext base class provides a host in which you can set members and it will auto push
    /// child member change events up to the instance. (So you could have member1 and member2 firing change
    /// events, and listen to either change at a root level.)
    /// </summary>

    var s_dataContextId = 0;

    defineClass(
        "JBase.DataContext",
        /* @constructor */function (object)
        {
            /// <summary>The data context constructor.</summary>
            /// <param name="object" type="*" optional="true">The object to initialize the data context with</param>

            this.__dataContextId = s_dataContextId++;
            this.isDisposed = false;

            // Reset then set data
            this.reset();

            // Set the object in the constructor
            this.setData(object);

        },
        {
            /// <summary>This lets us know its a data context object.</summary>
            __isDataContext: true,
            __isObservable: true,
            __isAutoDisposable: true,

            onDispose: /* @static_cast(*) */null,

            initialize: /* @bind(JBase.DataContext) */ function ()
            {
                /// <summary>Guarantees that initialize will be available; subclasses can assume it is there. Gets called by the owner.</summary>
            },

            dispose: /* @bind(JBase.DataContext) */function ()
            {
                /// <summary>Disposes the data context.</summary>

                if (!this.isDisposed)
                {
                    this.isDisposed = true;

                    for (var i in this)
                    {
                        if (this.hasOwnProperty(i))
                        {
                            var object = this[i];

                            object && object.removeRef && object.removeRef();
                        }
                    }

                    this.onDispose && this.onDispose();
                }
            },

            reset: /* @bind(JBase.DataContext) */function ()
            {
                /// <summary>This resets the data context, this will also be called in the constructor.</summary>
            },

            setData: /* @bind(JBase.DataContext) */function (object, shouldFireChange)
            {
                /// <summary>Sets the members within the dataContext, auto hooks up change events to objects.</summary>
                /// <param name="object" type="Object">Object to shallow extend.</param>
                /// <param name="shouldFireChange" type="Boolean" optional="true">This will force the change event to fire or suppress it if provided.</param>

                var hasChanged = false;

                for (var i in object)
                {
                    if (object.hasOwnProperty(i))
                    {
                        var oldValue = this[i];
                        var newValue = object[i];

                        if (oldValue != newValue)
                        {
                            if (oldValue)
                            {
                                oldValue.__isObservable && this.removeChangeListener(oldValue);

                                oldValue.removeRef && oldValue.removeRef();
                            }

                            this[i] = newValue;
                            hasChanged = true;

                            if (newValue)
                            {
                                newValue.__isObservable && this.addChangeListener(newValue, this.change);

                                newValue.addRef && newValue.addRef();
                            }
                        }
                    }
                }

                // Change if data has changed and we're not 
                if ((shouldFireChange !== false && hasChanged) || shouldFireChange)
                {
                    this.change();
                }

                return hasChanged;
            },

            change: /* @bind(JBase.DataContext) */ function(ev)
            {
                /// <summary>This fires the change event on this instance.</summary>
                /// <param name="ev" type="Object" optional="true">Event args.</param>

                change(this, ev);
            }
        },
    /* statics: */null,
        Shared.ObjectEventing,
        JBase.RefCountable,
        Shared.Resourcable
    );
})();