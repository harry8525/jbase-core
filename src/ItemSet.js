(function ()
{
    // We set this as 1 so we wait at least a minimum granularity of setTimeout before allowing invalidate
    // to be called again.
    var c_invalidateThrottleDelay = 1;
    var c_maxInvalidateThrottleDelay = 2000;

    defineClass(
        "Shared.ItemSet",
        function ()
        {
            /// <summary>
            /// ItemSet represents a collection class that exposes basic methods for accessing a collection of items.
            /// The collection can be filtered via a filter method.
            /// </summary>

            this._filters = {
                "hiddenItems": hiddenItemsFilter
            };

            this.clear();
        },
        {
            defaultGroupName: "Default",
            groupings: /* @static_cast(Array) */null,
            invalidateOnItemChanges: true,

            _childCount: 0,
            _materializedCount: 0,
            _isDisposed: false,

            dispose: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>Marks the set as disposed.</summary>

                if (!this._isDisposed)
                {
                    this.clear();
                    this._filters = {};
                    this._isDisposed = true;
                }
            },

            hasPendingRequests: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>Returns true if the set has pending requests.</summary>
                /// <returns type="Boolean">True if there are pending requests.</returns>

                return false;
            },

            load: /* @bind(Shared.ItemSet) */function (items, startIndex, totalCount)
            {
                /// <summary>Loads an array of items.</summary>
                /// <param name="startIndex" type="Number" optional="true">Start index.</param>
                /// <param name="totalCount" type="Number" optional="true">What the set count should be set to.</param>

                var _this = this;

                startIndex = startIndex || 0;
                totalCount = totalCount || items.length;

                _this.setCount(totalCount);

                for (var i = 0; i < items.length; i++)
                {
                    _this.set(i + startIndex, items[i]);
                }
            },

            clear: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>
                /// Clears the collection.
                /// </summary>

                var _this = this;

                _this._filteredCount = 0;
                _this._filteredIndexToActualIndex = {};
                _this._keyToFilteredIndex = {};

                _this._childCount = 0;
                // Clean up listeners if there are any on the subitems.
                /* @disable(0092) */
                if (_this._indexToItem)
                {
                    for (var x in _this._indexToItem)
                    {
                        _this.set(x, null);
                    }
                }
                /* @restore(0092) */

                Debug.assert(_this._materializedCount === 0, "ItemSet::_materializedCount wasn't 0 after a clear.");

                _this._indexToItem = {};
                _this._keyToIndex = {};

                _this._requiresFilter = false;
            },

            peek: /* @bind(Shared.ItemSet) */function (index, useUnfilteredIndex)
            {
                /// <summary>
                /// Peeks at the item at the specified index. By default just calls "get", but subclasses can override the behaviors such that get would
                /// trigger a server fetch while peek wouldn't.
                /// </summary>
                /// <param name="index" type="Number">Index of item.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">If specified as true, will treat the index as an unfiltered index.</param>
                /// <returns type="Shared.IBaseItem">Item at the given index.</returns>

                return this.get(index, useUnfilteredIndex);
            },

            get: /* @bind(Shared.ItemSet) */function (index, useUnfilteredIndex)
            {
                /// <summary>
                /// Gets the item at the specified index.
                /// Note: use setFiltersEnabled to disable filtering if necessary.
                /// </summary>
                /// <param name="index" type="Number">Index of item.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">If specified as true, will treat the index as an unfiltered index.</param>
                /// <returns type="Shared.IBaseItem">Item at the given index.</returns>

                var _this = this;

                // Update the filtered set. This will no-op if its unnecessary.
                _this._updateFilteredSet(useUnfilteredIndex);

                (!useUnfilteredIndex) && /* @static_cast(Boolean) */(index = _this._filteredIndexToActualIndex[index]);

                return this._indexToItem[index];
            },

            getByKey: /* @bind(Shared.ItemSet) */function (key, useUnfilteredIndex)
            {
                /// <summary>
                /// Gets the item in the collection that has the specified key. If the items don't have key properties
                /// or they haven't been populated in the set, this won't work very well.
                /// </summary>
                /// <param name="key" type="String">Item to be set.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">If specified as true, will  return the item even if it's filtered.</param>
                /// <returns type="Shared.IBaseItem">Item at the given index.</returns>

                var _this = this;

                // Update the filtered set. This will no-op if its unnecessary.
                _this._updateFilteredSet(useUnfilteredIndex);

                // The key lives at a particular index, but that index may vary based on whether filtering is enabled or not.
                var index = useUnfilteredIndex ? _this._keyToIndex[key] : _this._filteredIndexToActualIndex[_this._keyToFilteredIndex[key]];

                return this._indexToItem[index];
            },

            set: /* @bind(Shared.ItemSet) */function (index, item)
            {
                /// <summary>
                /// Sets the item as the specified index. This index is always the unfiltered index, regardless of whether
                /// filtering is enabled or not.
                /// </summary>
                /// <param name="index" type="Number">Unfiltered index of the item.</param>
                /// <param name="item" type="Shared.IBaseItem">Item to be set.</param>
                /// <returns type="Boolean">Whether the item at the given index changed as a result of setting.</returns>

                var _this = this;
                var itemChanged = false;

                var currentItem = /* @static_cast(Shared.IBaseItem) */_this._indexToItem[index];

                if (currentItem != item)
                {
                    _this._removeItemEvents(currentItem);

                    itemChanged = true;

                    _this._indexToItem[index] = item;

                    if (item)
                    {
                        /* @disable(0092) */
                        item.key && (_this._keyToIndex[item.key] = index);
                        /* @restore(0092) */
                        _this._childCount = Math.max(_this._childCount, index + 1);

                        _this._addItemEvents(item);
                    }

                    if (!currentItem && /* @static_cast(Boolean) */item)
                    {
                        _this._materializedCount++;
                    }
                    else if (/* @static_cast(Boolean) */currentItem && !item)
                    {
                        _this._materializedCount--;
                    }

                    _this._requiresFilter = true;
                }

                return itemChanged;
            },

            insert: /* @bind(Shared.ItemSet) */function (index, item, useUnfilteredIndex)
            {
                /// <summary>
                /// Inserts an item at the beginning of the set.
                /// </summary>
                /// <param name="index" type="Number">Unfiltered index of the item.</param>
                /// <param name="item" type="Shared.IBaseItem">Item to be set.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true"></param>

                this.insertWithGroupHint(index, item, true, useUnfilteredIndex);
            },

            insertWithGroupHint: /* @bind(Shared.ItemSet) */function (index, item, preferAfter, useUnfilteredIndex)
            {
                /// <summary>
                /// Inserts an item at the beginning of the set.
                /// </summary>
                /// <param name="index" type="Number">Unfiltered index of the item.</param>
                /// <param name="item" type="Shared.IBaseItem">Item to be set.</param>
                /// <param name="preferAfter" type="Boolean" optional="true">This specifies if we should should prefer the group after when we insert at a group boundry.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true"></param>

                var _this = this;

                // Update the filtered set. This will no-op if its unnecessary.
                _this._updateFilteredSet(useUnfilteredIndex);

                // resolve index.
                !useUnfilteredIndex && /* @static_cast(Boolean) */(index = (index < _this._filteredCount) ? _this._filteredIndexToActualIndex[index] : _this._childCount);

                // cap index within bounds.
                index = Math.max(0, Math.min(index, _this._childCount));

                Debug.assert(index >= 0, "ItemSet::insert - index was less than 0!");

                // Track item we're potentially replacing. Set the place to null, so that we don't unbind from change events.
                var /* @type(Shared.IBaseItem) */currentItem = _this._indexToItem[index];
                _this._indexToItem[index] = null;

                // Clean up groups
                if (_this.groupings)
                {
                    var groupings = _this.groupings;

                    for (var i = 0; i < groupings.length; i++)
                    {
                        var realGrouping = (/* @static_cast(Shared.IBaseItemGroupCollection) */groupings[i]).itemGroups;

                        for (var x = 0; x < realGrouping.length; x++)
                        {
                            var group = /* @static_cast(Shared.IBaseItemGroup) */realGrouping[x];

                            var endIndex = group.startIndex + group.count - 1;

                            // If you at a group boundary we add it to the next group
                            if (preferAfter)
                            {
                                // We prefer the group after for insert
                                if (endIndex >= index)
                                {
                                    group.startIndex > index && /* @static_cast(Boolean) */group.startIndex++;

                                    // we found the group the item was in
                                    if (group.startIndex <= index)
                                    {
                                        group.count++;
                                    }
                                }
                                else if (index == _this._childCount && endIndex + 1 == _this._childCount)
                                {
                                    // we are inserting at the end
                                    // and we are the last group
                                    group.count++;
                                }
                            }
                            else
                            {
                                // We prefer the group before for insert
                                if (endIndex + 1 >= index)
                                {
                                    // increment the start index as long as its not the first index
                                    if ((group.startIndex == index && group.startIndex != 0) ||
                                        group.startIndex > index)
                                    {
                                        group.startIndex++;
                                    }

                                    // we found the group the item was in
                                    if (group.startIndex <= index)
                                    {
                                        group.count++;
                                    }
                                }
                            }
                        }
                    }
                }

                // set new item in that location. This will bind to the new item's change events.
                _this.set(index, item);

                // Now while we have an item to move, move it to the next slot.
                while (currentItem)
                {
                    var nextItem = _this._indexToItem[++index];
                    _this._indexToItem[index] = currentItem;

                    // Update the key index
                    _this._keyToIndex[currentItem.key] = index;
                    currentItem = nextItem;

                    (index == _this._childCount) && /* @static_cast(Boolean) */(_this._childCount++);
                }

                _this._requiresFilter = true;
            },

            add: /* @bind(Shared.ItemSet) */function (item)
            {
                /// <summary>
                /// Adds an item to the end of the set.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to be set.</param>

                var _this = this;

                _this.insert(_this._childCount, item, true);
            },

            peekIndexOf: /* @bind(Shared.ItemSet) */function (item, useUnfilteredIndex)
            {
                /// <summary>
                /// Gets the filtered index of an item.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to get the filtered index of.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">If true specifies to return the unfiltered index.</param>
                /// <returns type="Number">Index of item or -1 if the item doesn't exist in the collection.</returns>

                return this.indexOf(item, useUnfilteredIndex, true);
            },

            indexOf: /* @bind(Shared.ItemSet) */function (item, useUnfilteredIndex, skipFetch)
            {
                /// <summary>
                /// Gets the filtered index of an item.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to get the filtered index of.</param>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">If true specifies to return the unfiltered index.</param>
                /// <param name="skipFetch" type="Boolean" optional="true">Skips fetching the index from the server if we don't know it.</param>
                /// <returns type="Number">Index of item or -1 if the item doesn't exist in the collection.</returns>

                Debug.assert(item, "ItemSet::indexOf - item was null.");
                Debug.assert(item.key, "ItemSet::indexOf - item didn't have a key.");

                var _this = this;
                var index;

                _this._updateFilteredSet(useUnfilteredIndex);

                index = useUnfilteredIndex ? _this._keyToIndex[item.key] : _this._keyToFilteredIndex[item.key];

                if (index === undefined)
                {
                    index = -1;
                }

                return index;
            },

            removeAt: /* @bind(Shared.ItemSet) */function (index, useUnfilteredIndex)
            {
                /// <summary>
                /// Removes an item at the specified index.
                /// </summary>
                /// <param name="index" type="Number">Unfiltered index of item.</param>       
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">If true specifies to return the unfiltered index.</param>

                var _this = this;

                // Update the filtered set. This will no-op if its unnecessary.
                _this._updateFilteredSet(useUnfilteredIndex);

                // resolve index.
                (!useUnfilteredIndex) && /* @static_cast(Boolean) */(index = _this._filteredIndexToActualIndex[index]);

                // clear up the item.
                var item = /* @static_cast(Shared.IBaseItem)*/_this._indexToItem[index];

                if (item)
                {
                    _this._removeItemEvents(item);

                    delete _this._keyToIndex[item.key];

                    _this._materializedCount--;
                }

                // Clean up groupings
                if (_this.groupings)
                {
                    var groupings = _this.groupings;

                    for (var i = 0; i < groupings.length; i++)
                    {
                        var realGrouping = (/* @static_cast(Shared.IBaseItemGroupCollection) */groupings[i]).itemGroups;

                        for (var x = 0; x < realGrouping.length; x++)
                        {
                            var group = /* @static_cast(Shared.IBaseItemGroup) */realGrouping[x];

                            var endIndex = group.startIndex + group.count - 1;

                            if (endIndex >= index)
                            {
                                // we found the group the item was in
                                if (group.startIndex <= index)
                                {
                                    group.count--;

                                    if (group.count == 0)
                                    {
                                        // The group is empty now so remove it
                                        realGrouping.splice(x, 1);
                                        x--;
                                    }
                                }
                                else
                                {
                                    // we found a group after the removed item
                                    group.startIndex--;
                                }
                            }
                        }
                    }
                }

                var maxIndex = _this._childCount - 1;

                while (index < maxIndex)
                {
                    item = _this._indexToItem[index + 1];

                    if (item)
                    {
                        _this._keyToIndex[item.key] = index;
                    }

                    _this._indexToItem[index] = item;

                    index++;
                }

                // delete the last item and reduce child count.
                delete _this._indexToItem[_this._childCount - 1];
                _this._childCount--;

                _this._requiresFilter = true;
            },

            remove: /* @bind(Shared.ItemSet) */function (item)
            {
                /// <summary>
                /// Removes a specific item.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to remove from the collection.</param>       

                var _this = this;
                var index = _this.indexOf(item, true);

                if (index != -1)
                {
                    _this.removeAt(index, true);
                }
            },
            
            move: /* @bind(Shared.ItemSet) */function (item, newIndex, preferAfter)
            {
                /// <summary>
                /// Moves a specific item to a new index.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to remove from the collection.</param>       
                /// <param name="newIndex" type="Number">New unfiltered index of item.</param>   
                /// <param name="preferAfter" type="Boolean" optional="true">This specifies if we should should prefer the group after when we insert at a group boundary.</param>
                /// <returns type="Number">The index of the item before the move</returns>

                var _this = this;
                var index = _this.indexOf(item, true);
               
                if (index != -1 && index != newIndex)
                {
                    _this.removeAt(index, true);

                    // If we are moving the item 'down' more than a single position in list, we need to
                    // subtract one from the new index to account for the fact that we just removed the item from earlier in the list.
                    newIndex -= (newIndex -1 > index ? 1 : 0);
                   
                    _this.insertWithGroupHint(newIndex, item, preferAfter);
                }

                return index;
            },
            
            invalidate: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>
                /// Fires a change event on the set.
                /// </summary>

                var _this = this;

                _this._requiresFilter = true;

                _this.throttle(
                    getId(_this) + "-invalidate",
                    c_invalidateThrottleDelay,
                    c_maxInvalidateThrottleDelay,
                    function ()
                    {
                        if (!_this._isDisposed)
                        {
                            change(_this);
                        }
                    },
                    true);
            },

            getCount: /* @bind(Shared.ItemSet) */function (useUnfilteredIndex)
            {
                /// <summary>
                /// Gets the filtered item count.
                /// </summary>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true">Use unfiltered index.</param>
                /// <returns type="Number">The filtered item count.</returns>

                var _this = this;

                _this._updateFilteredSet(useUnfilteredIndex);

                return useUnfilteredIndex ? _this._childCount : _this._filteredCount;
            },

            getMaterializedCount: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>Gets the materialized count.</summary>
                /// <returns type="Number">Materialized count.</returns>

                return this._materializedCount;
            },

            getGroupings: /* @bind(Shared.ItemSet) */function (useUnfilteredGroupings)
            {
                /// <summary>
                /// Gets the groupings array.
                /// </summary>
                /// <param type="Boolean" optional="true">This is true if we should return the unfiltered group data</param>

                var _this = this;

                /* @disable(0092) */
                var groupings = _this.groupings;

                var returnValue;

                // We need materialized items, since set count could effect the groupings
                if (!groupings || !this._materializedCount)
                {
                    // short circuit and just evaluate the counts
                    var count = _this.getCount(useUnfilteredGroupings);

                    returnValue = (count > 0 || useUnfilteredGroupings) ? [
                    {
                        name: _this.defaultGroupName,
                        itemGroups: [
                        {
                            groupingId: "other",
                            startIndex: 0,
                            endIndex: count - 1,
                            count: count
                        }]
                    }] : _this._filteredGroups;
                    /* @restore(0092) */
                }
                else
                {
                    _this._updateFilteredSet(useUnfilteredGroupings);

                    if (useUnfilteredGroupings)
                    {
                        // fix up the groupings to have an end index
                        for (var x = 0; x < groupings.length; x++)
                        {
                            var realGrouping = (/* @static_cast(Shared.IBaseItemGroupCollection) */groupings[x]).itemGroups;
                            for (var i = 0; i < realGrouping.length; i++)
                            {
                                var group = /* @static_cast(Shared.IBaseItemGroup) */groupings[i];
                                group.endIndex = group.startIndex + group.count - 1;
                            }
                        }

                        returnValue = groupings;
                    }
                    else
                    {
                        returnValue = _this._filteredGroups;
                    }
                }

                return returnValue;
            },

            setCount: /* @bind(Shared.ItemSet) */function (count)
            {
                /// <summary>
                /// Sets the unfiltered item count and clears the collection. Used for virtualization scenarios.
                /// </summary>

                var _this = this;

                if (_this._childCount != count)
                {
                    _this.clear();
                    _this._childCount = _this._filteredCount = count;
                    _this._requiresFilter = true;
                }
            },

            setFilter: /* @bind(Shared.ItemSet) */function (filterId, filterCallback)
            {
                /// <summary>
                /// Sets the unfiltered item count and clears the collection. Used for virtualization scenarios.
                /// </summary>
                /// <param name="id" type="String">Id of the filter.</param>
                /// <param name="filterCallback" type="Function" optional="true">
                /// Set array of filter callbacks. Callbacks mus take an IBaseItem as input, and return true if item is visible. If not provided,
                /// it will clear the filter.
                ///</param>

                var _this = this;

                if (filterCallback)
                {
                    _this._filters[filterId] = filterCallback;
                }
                else
                {
                    delete _this._filters[filterId];
                }

                _this._requiresFilter = true;
            },

            toArray: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>Returns an array containing the items in the filtered set.</summary>
                /// <returns type="Array">Array of items.</returns>

                var array = [];
                var itemCount = this.getCount();

                for (var i = 0; i < itemCount; i++)
                {
                    array.push(this.get(i));
                }

                return array;
            },

            _updateFilteredSet: /* @bind(Shared.ItemSet) */function (useUnfilteredIndex)
            {
                /// <summary>
                /// Updates the filtered set if necessary.
                /// </summary>
                /// <param name="useUnfilteredIndex" type="Boolean" optional="true"></param>

                var _this = this;

                if (_this._requiresFilter && !useUnfilteredIndex)
                {
                    _this._filteredGroups = [];
                    _this._filteredIndexToActualIndex = {};
                    _this._keyToFilteredIndex = {};

                    var x;
                    var actualIndex = 0;
                    var childCount = _this._childCount;
                    var filters = _this._filters;

                    var /* @type(Array) */currentRealGrouping;
                    var /* @type(Array) */currentRealGroupingIndex;
                    var /* @type(Array) */currentFilteredGrouping;

                    // Setup the current real group
                    if (/* @static_cast(Boolean) */_this.groupings && /* @static_cast(Boolean) */_this.groupings.length)
                    {
                        currentRealGrouping = [];
                        currentRealGroupingIndex = [];
                        currentFilteredGrouping = [];

                        for (x = 0; x < _this.groupings.length; x++)
                        {
                            var group = /* @static_cast(Shared.IBaseItemGroupCollection) */_this.groupings[x];

                            if (group.itemGroups.length)
                            {
                                var grouping = group.itemGroups[0];
                                var initialFilteredItemGroups = [];

                                // If the first itemGroup has a count of zero and we have additional groups, we'll add the first itemGroup
                                // here to simplify our filtering logic.
                                if (grouping.count === 0 && group.itemGroups.length > 1)
                                {
                                    initialFilteredItemGroups = [grouping];
                                    grouping = group.itemGroups[1];
                                    currentRealGroupingIndex.push(1);
                                }
                                else
                                {
                                    currentRealGroupingIndex.push(0);
                                }

                                currentRealGrouping.push(grouping);

                                // Fix up the end index
                                grouping.endIndex = grouping.startIndex + grouping.count - 1;

                                currentFilteredGrouping.push({
                                    groupingId: grouping.groupingId,
                                    name: grouping.name,
                                    data: grouping.data,
                                    startIndex: 0,
                                    endIndex: 0,
                                    count: 0
                                });

                                _this._filteredGroups.push({
                                    name: group.name,
                                    itemGroups: initialFilteredItemGroups
                                });
                            }
                        }
                    }

                    // We need to execute the loop's body even in the case when no items are returned
                    for (_this._filteredCount = 0; actualIndex < childCount || (childCount === 0 && actualIndex === 0); actualIndex++)
                    {
                        var item = /* @static_cast(Shared.IBaseItem) */_this._indexToItem[actualIndex];

                        var itemVisible = childCount > 0;

                        if (itemVisible)
                        {
                            for (var filterId in filters)
                            {
                                itemVisible = filters[filterId](item, _this);

                                if (!itemVisible)
                                {
                                    break;
                                }
                            }
                        }

                        if (itemVisible)
                        {
                            _this._filteredIndexToActualIndex[_this._filteredCount] = actualIndex;

                            /* @static_cast(Boolean) */item && /* @static_cast(Boolean) */item.key && /* @static_cast(Boolean) */(_this._keyToFilteredIndex[item.key] = _this._filteredCount);

                            // Update groups end index and count
                            if (currentRealGrouping)
                            {
                                for (x = 0; x < _this.groupings.length && x < currentFilteredGrouping.length; x++)
                                {
                                    (/* @static_cast(Shared.IBaseItemGroup) */currentFilteredGrouping[x]).count++;
                                }
                            }

                            _this._filteredCount++;
                        }

                        // We are past the end of the current filtered group
                        if (currentRealGrouping)
                        {
                            for (x = 0; x < _this.groupings.length && x < currentRealGrouping.length; x++)
                            {
                                var realGrouping = /* @static_cast(Shared.IBaseItemGroup) */currentRealGrouping[x];

                                if ((/* @static_cast(Boolean) */realGrouping && actualIndex == realGrouping.endIndex) || childCount == 0)
                                {
                                    var realFilteredGrouping = currentFilteredGrouping[x];

                                    // See if the current filtered group acutally had items
                                    // and if so put it in the filtered group list
                                    if (realFilteredGrouping.count > 0 || childCount == 0)
                                    {
                                        // Update the end index
                                        realFilteredGrouping.endIndex = realFilteredGrouping.startIndex + realFilteredGrouping.count - 1;
                                        _this._filteredGroups[x].itemGroups.push(realFilteredGrouping);
                                    }

                                    // get the next real group
                                    realGrouping = currentRealGrouping[x] = (/* @static_cast(Shared.IBaseItemGroupCollection) */_this.groupings[x]).itemGroups[++currentRealGroupingIndex[x]];

                                    // Fix up the end index
                                    /* @static_cast(Boolean) */realGrouping && /* @static_cast(Boolean) */(realGrouping.endIndex = realGrouping.startIndex + realGrouping.count - 1);

                                    var endIndex = _this._filteredCount;

                                    // Create the new filtered group
                                    currentFilteredGrouping[x] = {
                                        groupingId: realGrouping ? realGrouping.groupingId : 'other',
                                        mergeUp: realGrouping ? realGrouping.mergeUp : null,
                                        mergeDown: realGrouping ? realGrouping.mergeDown : null,
                                        name: realGrouping ? realGrouping.name : null,
                                        data: realGrouping ? realGrouping.data : null,
                                        startIndex: endIndex,
                                        count: 0
                                    };
                                }
                            }
                        }
                    }

                    _this._requiresFilter = false;
                }
            },

            _addItemEvents: /* @bind(Shared.ItemSet) */function (item)
            {
                var _this = this;

                if (/* @static_cast(Boolean) */item && _this.invalidateOnItemChanges)
                {
                    /* @disable(0092) */
                    item.addRef && item.addRef();
                    /* @restore(0092) */

                    _this.addObjectListener(item, "change", _this._onChildChanged);
                    _this.addObjectListener(item, "removeItem", _this._onChildRemoved);
                    _this.addObjectListener(item, "dispose", _this._onChildDisposed);
                }
            },

            _removeItemEvents: /* @bind(Shared.ItemSet) */function (item)
            {
                var _this = this;

                if (/* @static_cast(Boolean) */item && _this.invalidateOnItemChanges)
                {
                    /* @disable(0092) */
                    item.removeRef && item.removeRef();
                    /* @restore(0092) */

                    // clean up listeners
                    _this.removeObjectListener(item, "change");
                    _this.removeObjectListener(item, "removeItem");
                    _this.removeObjectListener(item, "dispose");
                }
            },

            _onChildChanged: /* @bind(Shared.ItemSet) */function ()
            {
                /// <summary>
                /// The handles the invalidate event from an item.
                /// </summary>

                this.invalidate();
            },

            _onChildRemoved: /* @bind(Shared.ItemSet) */function (item)
            {
                /// <summary>
                /// This handles the remove item event on an item.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to remove from the collection.</param>

                this.remove(item);
            },

            _onChildDisposed: /* @bind(Shared.ItemSet) */function (item)
            {
                /// <summary>
                /// When an item is disposed, it fires an event to indicate it's being disposed. We need to remove references to the item to clean up.
                /// </summary>
                /// <param name="item" type="Shared.IBaseItem">Item to remove from the collection.</param>

                var index = (!!item && !!item.key) ? this._keyToIndex[item.key] : -1;

                (index >= 0) && this.set(index, null);
            },

            // This is observable since it fires the correct change event
            __isObservable: true
        },
        { /* Statics */ },
        Shared.ObjectEventing,
        Shared.Async);

    function hiddenItemsFilter(item)
    {
        /// <summary>
        /// Filters out hidden items. Returns false only if the item has an isVisible property explicitly set to false.
        /// </summary>
        /// <param name="item" type="Shared.IBaseItem">Item to compare.</param>
        /// <returns type="Boolean">True if visible or visibility can't be determined.</returns>

        return (!item || item.isVisible === undefined || item.isVisible);
    }

})();
