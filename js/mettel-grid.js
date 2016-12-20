/*
 * MetTel Grid Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */
/* global MetTel, HierarchyModel */

var CellModel = function(options) {
    this.value = options.value;
    this.column = options.column;
    this.row = options.row;
};

var RowModel = function(row, vmGrid) {
    var rowModel = this;
    this.data = ko.observable(row);
    this.cells = ko.observableArray();

    // only used for grids with checkboxesToSelect
    this.selected = ko.observable(false);

    // only for grids with checkForUpdates
    this.grayOut = ko.observable(false);

    // only for grids with checkForUpdates
    this.newRowHighlight = ko.observable(false);

    var cellModels = ko.utils.arrayMap(vmGrid.columns(), function(column) {

        return new CellModel({
            value: row[column.name],
            column: column,
            row: rowModel
        });
    });

    rowModel.cells.push.apply(rowModel.cells, cellModels);

    if (vmGrid.checkboxesToSelect() === true) {
        // use the selected observable on rows to update GridModel.selectedRows
        rowModel.selected.subscribe(function(value) {
            if (value === true) {
                vmGrid.selectRow(rowModel);
            }
            else {
                vmGrid.selectedRows.remove(rowModel);
            }
        });

        var disableRowValue;

        if (vmGrid.disableRowProperty) {

            disableRowValue = rowModel.data()[vmGrid.disableRowProperty()];

            if (vmGrid.invertDisableRowProperty && vmGrid.invertDisableRowProperty()) {
                disableRowValue = !disableRowValue;
            }
        }

        rowModel.disableRow = ko.observable(disableRowValue);
        rowModel.enableRow = ko.computed(function() {
            return !rowModel.disableRow();
        });
    }

    if (vmGrid.expandableRowsExternalData()) {

        rowModel.storedExpandableRowData = ko.observable();

        rowModel.getExpandableRowData = function ($placeholder) {

            // Check first to see if we already have the data
            if (rowModel.storedExpandableRowData()) {
                // Pass the data into the callback
                if (vmGrid.expandableRowsExternalDataCallback) {
                    vmGrid.expandableRowsExternalDataCallback(rowModel, $placeholder);
                }
            } else {
                var url = vmGrid.endPoints.getExpandableRowData;

                if (vmGrid.expandableRowsExternalDataQueryParams) {

                    // Form the query string
                    var queryString = '?';
                    $.each(vmGrid.expandableRowsExternalDataQueryParams, function (key, value) {
                        queryString += (key + '=' + rowModel.data()[value] + '&');
                    });
                    queryString = queryString.slice(0, -1);
                    url += queryString;
                }

                // Fetch, store, and pass on data
                $.getJSON(url, function (data) {
                    rowModel.storedExpandableRowData(data);
                    if (vmGrid.expandableRowsExternalDataCallback) {
                        vmGrid.expandableRowsExternalDataCallback(rowModel, $placeholder);
                    }
                });
            }
        };
    }
};

var ColumnModel = function(options) {
    var self = this;

    this.internal = options.internal ? options.internal : false;
    this.name = options.name;
    this.label = options.label;
    this.fixed = options.fixed;
    this.originalWidth = options.width;
    this.width = ko.observable(options.width);
    this.align = options.align;
    this.primaryKey = options.primaryKey;
    this.formatter = options.formatter;
    this.sortable = options.sortable !== undefined ? options.sortable : true; // For now we will default all columns as being sortable.
    this.visible = ko.observable(options.visible === undefined ? true : options.visible);
    this.originallyVisible = ko.observable(this.visible()); // necessary for handling deletion of final field group
    this.showSearch = options.showSearch;
    this.searchType = options.searchType;
    this.searchDropDownList = options.searchDropDownList;
    this.searchable = options.searchable || false;
    this.sortType = options.sortType;
    this.merge = options.merge;

    self.setColumnWidth = function(splitScreenHalfWidth) {
        // in order to make sure that columns shown in collapsed view maintain the same width
        // and order regardless of whether we are in collapsed or expanded view,
        // widths passed in for split screen columns are percentages as follows:
        // explicit column width percentages must sum to 95% of the half-width because
        // the chevron column is always 5% of the half-width
        // hidden column width percentages must sum to 100% of the half-width
        self.width((self.originalWidth/100) * splitScreenHalfWidth);
    };
    // enabled to indicate whether a search column in search row in a
    // custom filter dialog is enabled or not
    this.customFilterEnabled = ko.observable(true);
    // selected to indicate whether a search column in search row in a
    // custom filter dialog is selected
    this.customFilterSelected = ko.observable(false);
};

var GroupModel = function(options) {
    var self = this;

    this.availableColumns = ko.observableArray(options.availableColumns);

    this.sortColumns = function(columns) {
        if (columns === undefined) {
            return undefined;
        }

        columns = _.sortBy(columns, function(column) {
            return _.indexOf(self.availableColumns(), column);
        });

        return columns;
    };

    // We will first define the property for columns, then add the subscription to always keep it sorted, then seed it with the columns.
    this.columns = ko.observableArray();

    var columnSortSubscription;

    function columnsChange() {
        // Remove the subscription before sorting, to prevent an infinite loop.  There'll never be a time that columnSortSubscription is not
        // null, but I'm going to be a good programmer and not assume.
        if (columnSortSubscription) {
            columnSortSubscription.dispose();
            columnSortSubscription = null;
        }

        //Force a sort of the array here.
        self.columns.sort(function(left, right) {
            return self.availableColumns.indexOf(left) > self.availableColumns.indexOf(right);
        });

        //Re-subscribe
        columnSortSubscription = self.columns.subscribe(columnsChange);
    }

    columnSortSubscription = this.columns.subscribe(columnsChange);
    if (options.columns) {
        this.columns(options.columns);
    }

    this.label = ko.observable(options.label);
    this.isNew = ko.observable(options.isNew ? options.isNew : false);

    this.selectedColumns = ko.observableArray(options.columns ? ko.utils.arrayMap(options.columns, function(column) {
        return column.name;
    }) : []);

    this.selectedColumns.subscribe(function(newValue) {
        // ensure that only the columns that are identified in newValue are present in self.columns
        var columns = self.columns();

        for (var i = 0; i < columns.length; i++) {
            // Check to see if there is a column name in columns that needs to be removed because it no longer is selected.
            if (_.indexOf(newValue, columns[i].name) === -1) {
                self.columns.remove(columns[i]);
            }
        }

        var selectedColumnNames = ko.utils.arrayMap(self.columns(), function(column) {
            return column.name;
        });

        var getColumnByName = function(columnName) {
            return ko.utils.arrayFirst(self.availableColumns(), function(column) {
                return column.name === columnName;
            });
        };

        // Reusing the variable to create a list of sorted columns
        columns = [];

        for (var j = 0; j < newValue.length; j++) {
            if (_.indexOf(selectedColumnNames, newValue[j]) === -1) {
                columns.push(getColumnByName(newValue[j]));
            }
        }

        ko.utils.arrayPushAll(self.columns, self.sortColumns(columns));

    });
};

var GridParametersModel = function() {
    var self = this;

    this.getGridDataEndPoint = ko.observable();
    this.queryParams = ko.observable();

    this.twoColumnLayout = ko.observable(false);

    this.clientSidePaging = ko.observable(false);

    this.cloneQueryParams = function() {
        return $.extend({}, self.queryParams() ? self.queryParams() : {});  //Cloning the params
    };

    this.addQueryParams = function(params, stopRefresh) {
        this.stopRefresh = stopRefresh;

        var clonedParams = self.cloneQueryParams(),
            keys = _.keys(params);

        _.each(keys, function(key) {
            clonedParams[key] = params[key];
        });

        self.queryParams(clonedParams);
    };

    this.removeQueryParams = function(params, stopRefresh) {
        this.stopRefresh = stopRefresh;

        var clonedParams = self.cloneQueryParams();

        if (_.isArray(params)) {
            _.each(params, function(name) {
                delete clonedParams[name];
            });

            self.queryParams(clonedParams);
        }
        else if (_.isString(params)) {
            delete clonedParams[params];
            self.queryParams(clonedParams);
        }
        else {
            console.log("Invalid removeQueryParam argument", arguments);
        }
    };

    // The server page will be updated on our requests to tell us what the current pages is that are being shown.
    this.serverPage = ko.observable();
    // and total number of pages possible
    this.totalPages = ko.observable();

    // The requested page.
    this.page = ko.observable(1).extend({notify: 'always'});

    this.reset = function() {
        self.page(1); // The page will be reset
        self.serverPage(undefined);
    };

    this.sortColumn = undefined;
    this.sortOrder = undefined;
    this.updateSort = function() {
        self.reset();
    };

    this.search = ko.observable();
    this.searchField = ko.observable();
    this.searchOp = ko.observable();
    this.searchString = ko.observable();
    this.searchFilter = ko.observable();

    this.resetSearch = function() {
        self.search(undefined);
        self.searchField(undefined);
        self.searchOp(undefined);
        self.searchString(undefined);
        self.searchFilter(undefined);
    };


    this.hierarchy = ko.observable();

    this.isValid = function() {
        return !(_.isUndefined(self.getGridDataEndPoint()));
    };

    this.nextPage = function() {
        // Only go to the next page if we know that the current page is equal to the page value.  Current page
        // is updated on server response. Or if client side paging is enabled (always 1st page at the server side).
        // Also, check if the current page number is less than the total possible before increasing
        if (self.clientSidePaging() || (self.serverPage() !== undefined && (self.page() === self.serverPage()) && (self.page() < self.totalPages()))) {
            if (self.clientSidePaging()) {
                self.stopRefresh = true;
            }
            self.page(self.page() + 1);
        }
    };

    this.gridUrl = ko.computed(function() {

        // We must wait for the end point before we'll ever return a URL.
        if (self.getGridDataEndPoint() === undefined) {
            return undefined;
        }

        var queryString = "",
            params = $.extend({}, self.queryParams() ? self.queryParams() : {});  //Cloning the params

        if (self.page()) {
            params.page = self.clientSidePaging() ? 0 : self.page();
        }

        if (self.sortColumn) {
            params.sidx = self.sortColumn;
        }

        if (self.sortOrder) {
            params.sord = self.sortOrder;
        }

        // Mutually exclusive
        if (self.searchField()) {
            params["_search"] = true;
            params.searchField = self.searchField();
            params.searchOper = self.searchOp();
            params.searchString = self.searchString();
        }
        else if (self.searchFilter()) {
            params["_search"] = true;
            params.filters = self.searchFilter();
        }

        if (self.hierarchy() !== undefined) {
            params.hierarchy = self.hierarchy();
        }

        if (params) {
            ko.utils.arrayForEach(_.keys(params), function(key) {
                if (queryString) {
                    queryString += "&";
                }

                queryString += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
            });
        }

        var url = self.getGridDataEndPoint() + (queryString ? "?" + queryString : "");

        if (!self.stopRefresh) {
            // Force notifications except when explicitly told not to when calling addQueryParams / removeQueryParams
            self.gridUrl.notifySubscribers();
        }

        return url;

    }).extend({throttle: 250});
};

var GridActionModel = function(options) {
    options = options ? options : {};

    var self = this;

    this.enabled = ko.observable(options.enabled !== undefined ? options.enabled : false);

    this.action = ko.observable(options.action);

    this.execute = function() {
        var func = self.action();
        if (func) {
            func.apply(self, arguments);
        }
    };

    this.config = ko.observable({});
};

var GridActionsModel = function(options) {

    var self = this;

    this.viewModel = options.viewModel;

    this._delete = new GridActionModel();

    this.add = new GridActionModel();

    this.edit = new GridActionModel();

    this.select = new GridActionModel();

    this.download = new GridActionModel({
        action: function() {
            window.open(this.config().excelExportUrl);
        }
    });

    this.refresh = new GridActionModel({
        action: function() {
            self.viewModel.clearSelectedRows();
            self.viewModel.gridParametersModel.reset();
            self.viewModel.gridParametersModel.resetSearch();

            if (self.viewModel.hierarchyModel()) {
                self.viewModel.hierarchyModel().resetHierarchy();
            }
        }
    });

    this.search = new GridActionModel();
};

var SearchOperatorModel = function(options) {
    this.label = options.label;
    this.value = options.value;
};

var SearchModel = function() {
    var self = this;
    var operators = [
        new SearchOperatorModel({value:'AND', label: 'All'}),
        new SearchOperatorModel({value:'OR', label: 'Any'})
    ];

    this.groupOperators = ko.observableArray();

    // Force existing state to 'reset' itself
    this.resetGroupOperators = function() {
        self.groupOperators.removeAll();
        ko.utils.arrayForEach(operators, function(operator) {
            self.groupOperators.push(operator);
        });
    };

    this.fieldOperators = ko.observableArray([
        new SearchOperatorModel({value: 'eq', label: 'equals'}),
        new SearchOperatorModel({value: 'ne', label: 'does not equal'}),
        new SearchOperatorModel({value: 'lt', label: 'is less than'}),
        new SearchOperatorModel({value: 'le', label: 'is less than or equal to'}),
        new SearchOperatorModel({value: 'gt', label: 'is greater than'}),
        new SearchOperatorModel({value: 'ge', label: 'is greater than or equal to'}),
        new SearchOperatorModel({value: 'bw', label: 'begins with'}),
        new SearchOperatorModel({value: 'bn', label: 'does not begin with'}),
        new SearchOperatorModel({value: 'in', label: 'is in'}),
        new SearchOperatorModel({value: 'ni', label: 'is not in'}),
        new SearchOperatorModel({value: 'ew', label: 'ends with'}),
        new SearchOperatorModel({value: 'en', label: 'does not end with'}),
        new SearchOperatorModel({value: 'cn', label: 'contains'}),
        new SearchOperatorModel({value: 'nc', label: 'does not contain'}),
        new SearchOperatorModel({value: 'nu', label: 'is null'}),
        new SearchOperatorModel({value: 'nn', label: 'is not null'}),
        new SearchOperatorModel({value: 'ov', label: 'is outside the absolute value of'})
    ]);
};

var SearchRowModel = function () {
    var self = this;

    this.column = ko.observable();
    this.operator = ko.observable();
    this.value = ko.observable();
    this.applied = ko.observable(false);
    this.customFilter = ko.observable(true);
    this.mandatory = ko.observable(false);
    this.showAllLabel = ko.observable();
    this.searchTextDisabled = ko.observable(false);
    this.columnlessFilter = ko.observable(false);

    var allSearchOperators = new SearchModel().fieldOperators();

    this.searchOperators = ko.computed(function () {
        if (self.column() && self.column().sortType === 'String') {
            return _.reject(allSearchOperators, function (item) {
                return item.value === 'lt' || item.value === 'le' || item.value === 'gt' || item.value === 'ge' || item.value === 'ov';
            });
        }
        return allSearchOperators;
    });

    this.operator.subscribe(function (operator) {
        var disabled = operator.value === 'nu' || operator.value === 'nn';
        self.searchTextDisabled(disabled);
        if (disabled) {
            self.value(undefined);
        }
    });
};

var GridModel = function(options) {

    options = options ? options : {};

    var self = this;

    // If we already have data for the grid, store it here to prevent the grid's ajax call
    this.storedGridData = ko.observable();

    this.gridName = ko.observable();
    this.autoHideLoadButton = ko.observable(false);

    // These two observables store JSON data to be sent to server in a POST,
    // and also serve as flags to indicate to POST instead of GET,
    // one generic and one for columnless filters
    this.postJSON = ko.observable(false);
    this.postColumnlessFilters = ko.observable(false);

    this.noResultsMessage = ko.observable('There are no rows to display.');

    // Flag used when clearing all grid data and getting new data
    this.resettingGrid = ko.observable(false);

    this.toolbarHeading = ko.observable();

    this.sendCompleteNotification = function(json) {
        ko.postbox.publish('grid.completeEvent.' + self.gridName(), json);
    };

    this.twoColumnLayout = ko.observable(false);

    this.advancedGrid = ko.observable(false);
    this.advancedGrid.subscribe(function(value) {
        self.groupSupportEnabled(value);

        // If the grid hasn't been initialized.  We can set the value of support to be true when it is an advancedGrid and false when not.
        // Once initialized, the server controls this value.  We are still thinking about this code.  We need to know are advancedGrids typically going to have groups or not.
        if (!self.initialized()) {
            self.showGridControls(value);
            self.supportGroups(value);
        }
    });

    this.infiniteScrolling = ko.observable(false);

    this.supportsInfiniteScrolling = ko.computed(function() {
        return self.advancedGrid() || self.infiniteScrolling();
    });

    this.showGrid = ko.observable(true);  // Allow us to show and hide the rows.

    this.showGridControls = ko.observable(false);

    this.frozenHeader = ko.observable(false);

    this.renderChunksCount = ko.observable(10);

    this.checkboxesToSelect = ko.observable(false);
    this.checkboxPosition = ko.observable();
    this.disableRowProperty = ko.observable();
    this.invertDisableRowProperty = ko.observable();

    this.pivotMenu = ko.observable();
    this.pivotMenuOptionEventTrigger = function (option, row) {
        if (typeof this.pivotMenuOptionEvent === 'function') {
            this.pivotMenuOptionEvent(option, row, this);
        }
    };

    this.expandableRows = ko.observable(false);
    this.expandableRowsExternalData = ko.observable(false);

    // this controls whether to show .mettel-grid-fixed-head
    this.supportsFrozenHeader = ko.computed(function() {
        return self.advancedGrid() || self.frozenHeader();
    });

    this.fixedHeight = ko.observable();

    this.loadButtons = ko.observable();
    this.showLoadAll = ko.observable();

    this.supportsLoadButtons = ko.computed(function() {
        return self.loadButtons() !== undefined;
    });

    this.showLoader = ko.observable(false);

    this.splitScreenCollapsed = ko.observable(true);

    this.splitScreenCollapsed.subscribe(function(newValue) {
        _.each(self.splitScreenHiddenColumns(), function(column) {
            if (column.visible !== undefined) {
                column.visible(!(column.visible()));
            }
        });

        // For Flex fallback support
        var $columnOneContainer = $('.mettel-column-one-container');
        if (newValue) {
            $columnOneContainer.removeClass('single-screen');
        } else {
            $columnOneContainer.addClass('single-screen');
        }

    });

    this.splitScreenHiddenColumns = ko.observableArray();
    this.splitScreenHalfWidth = ko.observable();

    this.loadAllLimit = ko.observable();

    this.isProductsGrid = ko.observable(false);

    this.loadMore = function() {
        // for now, this should only be available for simple grids,
        // as advanced grids use infinite scrolling
        if (this.advancedGrid() === false) {
            this.gridParametersModel.nextPage();
        }
    };

    this.loadAll = function() {
        // for now, this should only be available for simple grids,
        // as advanced grids use infinite scrolling
        if (this.advancedGrid() === false) {
            // remove all rows since we will now be fetching all
            this.rowsUnfiltered.removeAll();
            this.gridParametersModel.page(0);
        }
    };

    // this controls whether grid height is calculated and updated on resize
    this.supportsFixedHeight = ko.computed(function() {
        return self.supportsFrozenHeader() || self.fixedHeight();
    });

    this.saveGridSettingEndPoint = ko.observable();

    this.gridParametersModel = new GridParametersModel();

    this.gridParametersModel.gridUrl.subscribe(function() {
        if (!self.gridParametersModel.stopRefresh) {
            self.loadData();
        } else {
            self.gridParametersModel.stopRefresh = false;
        }
    });

    // -------- Notification Updating grid -------------
    // When true, grid will check if the data was changed before updating the UI
    this.checkForUpdates = ko.observable(false);

    // During update this will be true to let loadData know that grid is updating
    this.gridIsUpdating = ko.observable(false);

    // New rows count found during updating
    this.newRowsCount = ko.observable(0);

    // Header refresh button
    this.showRefreshButton = ko.observable(false);

    // Row grouping
    this.supportRowGrouping = ko.observable(false);
    this.rowGroupField = ko.observable();
    this.rowGroupMinHeight = ko.observable(0);  // Units are rows
    this.dummyRowHeight = ko.observable(0);     // Units are pixels

    // Striping
    this.striping = ko.observable(false);

    this.configureGrid = function(gridName, endPoints, queryParams, twoColumnLayout, postJSON) {
        self.endPoints = endPoints;
        self.gridName(gridName);
        self.saveGridSettingEndPoint(endPoints.saveGridSetting);
        // if grid enpoint url is present in model, override that in the grid definition
        if (_.isUndefined(self.gridParametersModel.getGridDataEndPoint())) {
            self.gridParametersModel.getGridDataEndPoint(endPoints.getGridData);
        }

        // if queryParams are present in model, extend/override those in the grid definition
        if (!_.isUndefined(self.gridParametersModel.queryParams())) {
            self.gridParametersModel.addQueryParams(queryParams);
            $.extend(queryParams, self.gridParametersModel.queryParams());
        }

        if (queryParams) {
            self.gridParametersModel.addQueryParams(queryParams);
        }

        self.twoColumnLayout(twoColumnLayout);

        if (postJSON) {
            // Store JSON for POST
            self.postJSON(postJSON);
        }
    };

    this.initialized = ko.observable(false);

    // wait until grid is initialized to calculate height
    this.initialized.subscribe(function (newValue) {
        if (newValue === true) {
            self.recalculateHeight();
        }
    });

    this.rowCount = ko.observableArray(0);
    this.rowsUnfiltered = ko.observableArray();

    // update deepest selected node with rowcount returned from server
    this.rowCountHandler = function(count) {
        if (this.hierarchyModel()) {
            var latestCount = _.last(this.hierarchyModel().selectedNodes());
            if (latestCount) {
                latestCount.rowCount(count);
            }
        }
    };

    // update rowcount even if it has not changed
    this.rowCount.extend({ notify: 'always' });

    this.rowCount.subscribe(function(count) {
        self["rowCountHandler"](count);
    });

    this.rowFilter = ko.observable();
    this.rows = ko.computed(function(){
        if (self.rowFilter()) {
            return ko.utils.arrayFilter(self.rowsUnfiltered(), self.rowFilter());
        }
        else {
            if (self.checkForUpdates()) {
                return self.rowsUnfiltered().slice(0, self.options.queryParams.rows * self.gridParametersModel.page());
            } else {
                return self.rowsUnfiltered();
            }
        }
    });

    this.setUpEnabledRows = function () {
        self.enabledRows = ko.computed(function () {
            return _.filter(self.rows(), function (row) {
                return row.disableRow() === false;
            });
        });
    };

    this.columns = ko.observableArray();

    this.primaryKey = ko.computed(function() {
        var foundKey = _.find(self.columns(), function(column) {
            return column.primaryKey === true;
        });
        if (foundKey !== undefined) {
            return foundKey.name;
        }
    });

    this.explicitColumns = ko.observableArray();

    this.supportsSplitScreen = ko.computed(function() {
        return self.splitScreenHiddenColumns().length > 0 && self.explicitColumns().length > 0;
    });

    this.groups = ko.observableArray();
    this.groupView = ko.observable(false);
    this.scrollingView = ko.computed(function() {
        return !self.groupView();
    });
    this.toggleGridView = function() {
        self.groupView(!self.groupView());
    };

    this.groupSupportEnabled = ko.observable(false);
    this.supportGroups = ko.observable(false);
    this.supportGroups.subscribe(function(value) {
        self.groupView(value);
    });

    this.pendingRequest = ko.observable(false);

    this.selectedColumn = ko.observable();
    this.selectedColumn.subscribe(function(value) {
        if (value) {
            self.gridParametersModel.sortColumn = value.name;
        }
        else {
            self.gridParametersModel.sortColumn = undefined;
        }
    });

    this.selectedColumnSortDirection = ko.observable();
    this.selectedColumnSortDirection.subscribe(function(value) {
        self.gridParametersModel.sortOrder = value;
    });

    this.gridTypeAheadMultiselectModel = ko.observable();
    this.gridTypeAheadMultiselect = ko.observable(false);

    this.supportsMultiselect = ko.observable(false);
    this.selectedRows = ko.observableArray();

    this.selectedRow = ko.computed({
        read: function() {
            return self.selectedRows().length > 0 ? self.selectedRows()[0] : undefined;
        },
        write: function (value) {
            // Disable highlighting on selection
            value.newRowHighlight(false);
            if (self.supportsMultiselect()) {
                // If the row was already selected, we will unselect it in this case.
                var selectedRow = ko.utils.arrayFirst(self.selectedRows(), function(row) {
                    return row === value;
                });

                if (selectedRow) {
                    self.selectedRows.remove(value);
                }
                else {
                    self.selectedRows.push(value);
                }
            }
            else {
                // Push the value in as the selected row.
                if (self.selectedRows().length === 0) {
                    if (self.checkboxesToSelect() === true) {
                        value.selected(true);
                    }

                    self.selectedRows.push(value);
                }
                else if (self.selectedRows()[0] !== value) {
                    // Only update the selected rows if it is a different value.
                    self.clearSelectedRows();
                    if (self.checkboxesToSelect() === true) {
                        value.selected(true);
                    }
                    else {
                        self.selectedRows.push(value);
                    }
                }
            }
        }
    });

    this.selectedPrimaryKey = ko.computed(function() {
        if (self.selectedRow() !== undefined) {
            if (self.selectedRow().data() !== undefined) {
                var strPrimaryKeyData;

                if (self.primaryKey() !== undefined) {
                    var strPrimaryKey = self.primaryKey();
                    strPrimaryKeyData = self.selectedRow().data()[strPrimaryKey];
                }
                else {
                    strPrimaryKeyData = self.selectedRow().data()["Ticket"];
                }
                return strPrimaryKeyData;
            }
        }
    });

    this.actions = ko.observable(new GridActionsModel({viewModel: self}));

    this.groupInEditState = ko.observable();

    this.customHeaderTemplates = ko.observable();
    this.customColumnTemplates = ko.observable();

    this.headerSettings = ko.observable();

    // -----------Smart Search -------------
    this.searchOptions = ko.observable(new SearchModel());
    this.searchGroupOperator = ko.observable();
    this.searchRows = ko.observableArray();

    this.activeSearchRows = ko.computed(function() {
        return _.filter(self.searchRows(), function(row) {
            return row.applied() === true;
        });
    });

    this.unappliedSearchRows = ko.computed(function() {
        return _.filter(self.searchRows(), function(row) {
            return row.customFilter() === "unapplied";
        });
    });

    this.customSearchRows = ko.computed(function() {
        return _.filter(self.searchRows(), function(row) {
            return row.customFilter() === true;
        });
    });

    this.defaultSearchRows = ko.computed(function() {
        return _.filter(self.searchRows(), function(row) {
            return row.customFilter() === false;
        });
    });

    this.mandatorySearchRows = ko.computed(function() {
        return _.filter(self.searchRows(), function(row) {
            return row.mandatory() === true;
        });
    });

    this.hasMandatorySearchRows = ko.computed(function() {
        return self.mandatorySearchRows().length > 0;
    });

    this.showFilterBar = ko.observable(false);

    this.toggleFilterBar = function() {
        self.showFilterBar(!(self.showFilterBar()));
        self.recalculateHeight();
    };

    // this is used to open the 'custom filter' modal
    this.popSearch = function() {
        // pop the modal
        self.showSearch(self);
    };

    this.showSearch = ko.observable();
    // this.showSearch.extend({ notify: 'always' });
    this.showSearch.subscribe(function(value){
        self.resetSearch();
    });

    this.addSearchRow = function() {
        self.searchRows.push(new SearchRowModel());
    };

    // clicking the minus ("-") in the custom filter modal
    // should not actually remove the row until 'Go' is clicked
    this.unApplySearchRow = function(item) {
        if (item.applied() === true) {
            item.customFilter("unapplied");
        }
        else {
            self.searchRows.remove(item);
        }
    };

    this.removeSearchRow = function(item) {
        self.searchRows.remove(item);
    };

    this.toggleFilters = ko.observableArray();
    this.setToggleFilter = function (filter, value, operator, dummyColumn) {
        if (filter.change === undefined) {
            self.addFilter(filter, value, operator, dummyColumn);
        }
        // if a change handler was specified, call it with the selected option
        else {
            var selectedOption = _.find(filter.options, function (option) {
                return option.value === value;
            });
            if ($.isFunction(filter.change)) {
                filter.change(selectedOption);
            }
            if ($.isFunction(self[filter.change])) {
                self[filter.change].call(self, selectedOption);
            }
            self.addFilter(filter, value, operator, dummyColumn);
        }
    };

    this.dropdownFilters = ko.observableArray();
    this.setDropdownFilter = function(filter) {
        // using the value, get the option
        var activeOption = _.find(filter.options, function(option) {
            return option.value === filter.activeValue();
        });

        // get the operator from the option
        var activeOperator = activeOption.op;

        if (filter.change === undefined) {
            self.addFilter(filter, filter.activeValue(), activeOperator);
        }
        // if a change handler was specified, call it with the selected option
        else {
            if ($.isFunction(filter.change)) {
                filter.change(activeOption);
            }
            if ($.isFunction(self[filter.change])) {
                self[filter.change].call(self, activeOption);
            }
        self.addFilter(filter, filter.activeValue(), activeOperator);
        }
    };

    this.defaultFilters = ko.computed(function() {
        return self.dropdownFilters().concat(self.toggleFilters());
    });

    // used to determine when filters have been set initially
    this.hasPresetFilters = ko.observable(false);

    this.resetDefaultFilter = function(thisFilter) {
        var searchRow = thisFilter.searchRow();

        if (searchRow.mandatory() === false) {

            if (thisFilter !== undefined) {

                self.removeSearchRow(searchRow);
                thisFilter.activeValue('');
                thisFilter.searchRow(undefined);

                // when removing via the narrow bar, call the change handler if there is one
                if ($.isFunction(thisFilter.change)) {
                    thisFilter.change(thisFilter.activeValue());
                }
                if ($.isFunction(self[thisFilter.change])) {
                    self[thisFilter.change].call(self, thisFilter.activeValue());
                }

            }
        }
    };

    this.resetDefaultFilters = function() {
        _.each(self.defaultFilters(), function(filter) {
            if (filter.searchRow() !== undefined) {
                self.resetDefaultFilter(filter);
            }
        });
    };

    this.addFilter = function(filter, value, operator, dummyColumn) {
        // find this filter's column
        var objColumn = _.find(self.columns(), function(column) {
            return column.name === filter.column;
        });

        var fieldOperator, vmSearchRow;

        // if dummyColumn exists, then we're setting an initial default filter from the config
        // so we don't have the column model yet
        if (objColumn === undefined && dummyColumn) {
            objColumn = dummyColumn;
        }

        // for columnless filters
        if (objColumn === undefined && filter.columnlessFilter) {
            objColumn = {
                name: filter.column
            };
        }

        // provided we found a valid column...
        if (objColumn !== undefined) {

            // if the value has a string value, apply the toggle filter
            if (value !== '') {

                if (operator === undefined) {
                    operator = 'eq';
                }

                fieldOperator = _.find(self.searchOptions().fieldOperators(), function(fieldOperator) {
                    return fieldOperator.value === operator;
                });

                vmSearchRow = new SearchRowModel();
                vmSearchRow.value(value);
                vmSearchRow.operator(fieldOperator);
                vmSearchRow.column(objColumn);
                vmSearchRow.customFilter(false);
                vmSearchRow.showAllLabel(filter.showAllLabel);
                vmSearchRow.columnlessFilter(filter.columnlessFilter || false);

                // if the filter is disabled, the searchRow is mandatory
                vmSearchRow.mandatory(filter.disabled());

                // if the filter has been set by default, set
                // applied to true so it shows in the narrow bar
                if (self.initialized() === false) {
                    vmSearchRow.applied(true);
                }

                // if this a 'single search', we know to just remove everything
                if (self.actions().search.config().showMultiSearch === false) {
                    self.searchRows.removeAll();
                    self.resetDefaultFilters();
                }

                // if this toggle filter is already set, remove its old searchRow
                if (filter.searchRow() !== undefined) {
                    self.searchRows.remove(filter.searchRow());
                }

                // set the new values
                filter.activeValue(value);
                filter.searchRow(vmSearchRow);

                // push the searchRow
                self.searchRows.push(vmSearchRow);

                // If the grid has been initialized already, execute the search.
                // This will not be the case for any filters set by default.
                // In that case, we will assume the filtered dataset has already been
                // passed down, so there is no need to re-query the server.
                // unless dummyColumn exists, then we're setting an initial default filter from the config
                if (self.initialized() === true || dummyColumn) {
                    // new skipInUrl option for DropdownFilters allows filters to be shown
                    // in the narrow bar without actually updating the URL
                    if (filter.skipInUrl) {
                        vmSearchRow.applied(true);
                    }
                    else {
                        self.executeSearch();
                    }
                }

            }
            // if the value is the empty string, remove the toggle filter
            else {
                if (filter.searchRow() !== undefined) {
                    self.removeFilter(filter.searchRow());
                }
            }
        }
        // if we did not find a valid column, this is a MetTel-implemented "pseudo-filter",
        // so it gets special treatment
        else {

            var activeLabel = value;

            if (operator === undefined) {
                operator = 'eq';
            }

            fieldOperator = _.find(self.searchOptions().fieldOperators(), function (fieldOperator) {
                return fieldOperator.value === operator;
            });

            var activeOption = _.find(filter.options, function (option) {
                return option.value === filter.activeValue();
            });

            // if this toggle filter is already set, remove its old searchRow
            if (filter.searchRow() !== undefined) {
                self.searchRows.remove(filter.searchRow());
            }

            if (activeOption !== undefined) {
                if (activeOption.label !== undefined) {
                    activeLabel = activeOption.label;
                }
            }

            filter.activeValue(value);

            // "default value" case
            if (value === "") {
                filter.searchRow(undefined);
            }
            else {
                vmSearchRow = new SearchRowModel();
                vmSearchRow.value(activeLabel);
                vmSearchRow.operator(fieldOperator);
                vmSearchRow.column(filter.column);
                vmSearchRow.customFilter(false);
                vmSearchRow.showAllLabel(filter.showAllLabel);
                vmSearchRow.applied(true);
                vmSearchRow.mandatory(filter.disabled());
                filter.searchRow(vmSearchRow);
                self.searchRows.push(vmSearchRow);
            }
        }
    };

    this.clearFilters = function() {
        self.resetSearch(true);

        // if filters are configured on the initial load of data,
        // we have to manually re-load our dataset, because the
        // gridUrl won't change to trigger the data re-load
        if (self.hasPresetFilters() === true) {
            self.hasPresetFilters(false);
            self.loadData();
        }

        self.recalculateHeight();
    };

    this.removeFilter = function(searchRow) {
        // find the filter based off of the searchRow that was passed
        var thisFilter = _.find(self.defaultFilters(), function(filter) {
            return filter.searchRow() === searchRow;
        });

        // if this searchRow belongs to a custom filter, simply remove it
        if (searchRow.customFilter() === true) {
            self.removeSearchRow(searchRow);
        }
        // otherwise it belongs to a 'defaultFilter' and needs to be reset differently
        else {
            self.resetDefaultFilter(thisFilter);
        }

        // if using skipInUrl, don't actually update the grid query params or url
        if (!thisFilter.skipInUrl) {
            // if filters are configured on the initial load of data,
            // we have to manually re-load our dataset, because the
            // gridUrl won't change to trigger the data re-load
            if (self.hasPresetFilters() === true) {
                self.hasPresetFilters(false);
                self.loadData();
            }
            // update the api url and call the server to get the updated dataset
            if (self.activeSearchRows().length === 0) {
                self.resetSearch(true);
                self.clearPostColumnlessFitlers();
            }
            else {
                self.executeSearch();
            }
        }

        self.recalculateHeight();
    };

    this.recalculateHeight = function() {
        ko.postbox.publish("grid.recalculateHeight", "GridModel");
    };

    this.executeSearch = function() {
        // if custom searchRows were 'removed' via the modal,
        // now is the time to really remove them
        _.each(self.unappliedSearchRows(), function(searchRow) {
            self.removeSearchRow(searchRow);
        });

        if (self.actions().search.config().showMultiSearch){

            // set page back to 1
            self.gridParametersModel.reset();

            var filter = {
                "groupOp": self.searchGroupOperator(),
                "rules"  : []
            };

            var columnlessFilters = [];

            ko.utils.arrayForEach(self.searchRows(), function(row){
                if (row.value() !== undefined && row.value() !== '') {
                    row.applied(true);

                    if (!row.columnlessFilter()) {
                        // standard filter
                        var rule = {
                            "field": row.column().name,
                            "op": row.operator().value,
                            "data": row.value()
                        };
                        filter.rules.push(rule);
                    }

                    else {
                        // columnless filter
                        var filterObj = {
                            id: row.column().name,
                            field: row.showAllLabel(),
                            op: row.operator().value,
                            data: row.value()
                        };
                        columnlessFilters.push(filterObj);
                    }
                }
            });

            if (filter.rules.length) {
                self.gridParametersModel.searchFilter(JSON.stringify(filter));
            }

            // make sure standard filters are clear
            else if (self.gridParametersModel.searchField() || self.gridParametersModel.searchFilter()) {
                self.gridParametersModel.resetSearch();
            }

            if (columnlessFilters.length) {
                self.postColumnlessFilters({
                    columnlessFilters: columnlessFilters
                });
            }

            // make sure columnless filters are clear
            else {
                self.clearPostColumnlessFitlers();
            }
        }
        else {
            // set page back to 1
            self.gridParametersModel.reset();

            // when applying a custom filter, remove any 'default' filters
            if (self.defaultSearchRows().length > 0 && self.customSearchRows().length > 0) {
                self.searchRows.remove(function(row) {
                    return row.customFilter() === false;
                });
            }

            var row = self.searchRows()[0];

            // if this is a custom searchRow, reset the toggle filters
            if (row.customFilter() === true) {
                self.resetDefaultFilters();
            }

            row.applied(true);

            if (!row.columnlessFilter()) {
                // standard filter
                self.gridParametersModel.searchField(row.column().name);
                self.gridParametersModel.searchOp(row.operator().value);
                self.gridParametersModel.searchString(row.value());
            }

            else {
                // columnless filter

                // make sure standard filters are clear
                if (self.gridParametersModel.searchField() || self.gridParametersModel.searchFilter()) {
                    self.gridParametersModel.resetSearch();
                }

                self.postColumnlessFilters({
                    columnlessFilters: [
                        {
                            id: row.column().name,
                            field: row.showAllLabel(),
                            op: row.operator().value,
                            data: row.value()
                        }
                    ]
                });
            }
        }
    };

    this.resetSearch = function(forceReset) {
        var url = self.gridParametersModel.gridUrl();

        // explicitly clear the search
        if (forceReset) {
            if (self.hasMandatorySearchRows() === false) {

                // set page back to 1
                self.gridParametersModel.reset();

                self.gridParametersModel.resetSearch();
                self.searchOptions().resetGroupOperators();
                self.searchRows.removeAll();
            }
            else {
                // remove all search rows that are not mandatory
                self.searchRows.remove(function(searchRow) {
                    return searchRow.mandatory() === false;
                });

                self.executeSearch();
            }

            self.resetDefaultFilters();
        }
        // open the custom filter modal
        else {
            if (self.searchRows().length === 0) {
                self.searchOptions().resetGroupOperators();
            }

            if (self.customSearchRows().length === 0) {
                self.addSearchRow();
            }
        }

    };

    this.clearPostColumnlessFitlers = function() {
        if (self.postColumnlessFilters()) {
            self.postColumnlessFilters(null);
        }
    };

    // ------------ Hierarchy --------------
    this.hierarchyModel = ko.observable();

    // If a hierarchyModel is set we are going to monkey patch the selectNode function to provide the view model to
    // help the developer by giving access to the grid model.
    this.hierarchyModel.subscribe(function(model) {
        model.selectNodeHandler = function(root) {
            var latestSelectedNode = _.last(root.selectedNodes());

            self.clearSelectedRows();

            if (latestSelectedNode) {
                self.gridParametersModel.hierarchy(latestSelectedNode.key());
            }
            else {
                self.gridParametersModel.hierarchy(undefined);
            }

            self.gridParametersModel.reset();
        };

        model.mode.subscribe(function () {
            setTimeout(function () {
                self.recalculateHeight();
            }, 1);
        });
    });

    this.enableHierarchyMenu = ko.computed(function() {
       return self.hierarchyModel() !== undefined;
    });

    this.showHierarchyMenu = ko.observable(false);

    this.toggleHierarchy = function() {

       if (self.showHierarchyMenu()) {
           self.showHierarchyMenu(false);
       }
       else {
           if (!self.hierarchyModel().loaded()) {
               var subscription = self.hierarchyModel().loaded.subscribe(function(){
                   subscription.dispose();
                   self.showHierarchyMenu(true);
                   MetTel.Grid.Utils.manageTree();
               });
               self.hierarchyModel().loadHierarchy();
           }
           else {
               self.showHierarchyMenu(true);
               MetTel.Grid.Utils.manageTree();
           }
       }
    };

    // ---------- Quick Filter ---------------
    this.quickFilter = ko.observable();
    this.selectedQuickFilter = ko.observable();
    this.selectedQuickFilter.subscribe(function(value) {
        // On change, we want to update the query params
        var queryParams = self.gridParametersModel.queryParams(),
            val = value[0];

        // reset prior query parameters by removing any values that match what are in the filters
        ko.utils.arrayForEach(self.quickFilters(), function (filter) {
            delete queryParams[_.keys(filter.value)];
        });

        // Add selected value to the query parameters
        var key = _.keys(val)[0];
        if (!_.isUndefined(key)) {
            queryParams[key] = val[key];
        }

        self.gridParametersModel.queryParams(queryParams);
    });


    this.quickFilters = ko.computed(function() {
        if (self.quickFilter()) {

            var selectOptions = self.quickFilter(),
                selectOptionsArray = ko.observableArray();

            ko.utils.arrayForEach(_.keys(selectOptions), function(text) {
                var option = {value:selectOptions[text],text: text};
                selectOptionsArray.push(option);
            });

            return selectOptionsArray();
        }
        else {
            return undefined;
        }
    });
    this.showQuickFilter = ko.computed(function() {
        return self.quickFilter !== undefined;
    });


    this.selectColumn = function(column) {
        if (column.sortable) {
            self.clearSelectedRows();

            var isAlreadySelectedColumn = self.selectedColumn() && self.selectedColumn().name === column.name;

            if (isAlreadySelectedColumn && self.selectedColumnSortDirection() === "asc") {
                // We will flip the order of the column
                self.selectedColumnSortDirection("desc");
            }
            else {
                self.selectedColumnSortDirection("asc");
            }

            self.selectedColumn(column);

            self.gridParametersModel.updateSort();
        }
    };

    /// Clear observables related to sorting by column
    this.clearSelectedColumn = function () {
        if (self.selectedColumn()) {
            self.selectedColumn(undefined);
            self.selectedColumnSortDirection(undefined);
        }
    };

    this.configureSortedColumn = function(column, order) {
        self.selectedColumn(column);
        self.selectedColumnSortDirection(order);
    };

    this.supportsRowSelection = ko.observable(true);
    this.selectRow = function(row) {
        if (self.supportsRowSelection() && !row.data().dummyRow) {
            self.selectedRow(row);
        }
    };

    this.clearSelectedRows = function() {
        if (self.checkboxesToSelect() === true) {
            $.each(self.rows(), function() {
                if (this.selected() !== undefined) {
                    this.selected(false);
                }
            });
        }

        self.selectedRows.removeAll();
    };

    // ------------- FieldGroupComboBox -------------
    this.showFieldGroupComboBox = ko.observable(false);

    this.toggleFieldGroupComboBox = function() {
        self.showFieldGroupComboBox(!self.showFieldGroupComboBox());
    };


    // ------------- Groups -------------
    this.selectedGroup = ko.observable();
    this.visibleColumns = ko.computed(function() {
        return ko.utils.arrayFilter(self.columns(), function(column) {
            return column.visible();
        });
    });

    this.searchableColumns = ko.computed(function() {
        return ko.utils.arrayFilter(self.columns(), function(column) {
            return ((column.internal === false) && (column.visible() === true || column.showSearch === true) && (column.searchable === true));
        });
    });

    this.groupView.subscribe(function(showGroupView){
        // Make columns that fixed + the group columns visible
        // If showGroupView is false, all columns are visible.
        ko.utils.arrayForEach(self.columns(), function(column) {
            if (!showGroupView || column.fixed) {
                // only display columns if they were visible originally
                if (column.originallyVisible() === true) {
                    column.visible(true);
                }
            }
            else {
                if (self.selectedGroup()) {
                    column.visible(self.selectedGroup().columns.indexOf(column) !== -1);
                }
            }
        });
    });

    this.selectGroup = function(group) {
        var updateColumns = function() {
            // Populate visible columns for smart search
            ko.utils.arrayForEach(self.columns(), function(column) {
                if (column.fixed) {
                    column.visible(true);
                }
                else {
                    column.visible(group.columns.indexOf(column) !== -1);
                }
            });
        };

        // Update the visible columns
        updateColumns();

        group.columns.subscribe(updateColumns);

        self.selectedGroup(group);
    };

    this.editGroupModel = function(group) {
        self.groupInEditState(group);
    };

    this.inEditState = ko.computed(function() {
        return self.groupInEditState() !== undefined;
    });

    this.exitEditState = function() {
        var group = self.groupInEditState();

        if (group && group.isNew()) {
            if (group.label().length === 0) {
                self.removeGroup(group);
                return;
            }
        }

        self.saveGroups();
    };

    this.addGroupModel = function() {
        var group = new GroupModel({
            label: "",
            availableColumns: self.availableColumnsForGroup(),
            isNew: true
        });

        var labelSubscription = group.label.subscribe(function(value) {
            labelSubscription.dispose();

            self.selectGroup(group);
        });

        self.groups.push(group);
        self.groupInEditState(group);
    };

    this.removeGroup = function(group) {
        self.groupInEditState(undefined);

        var currentGroupIndex = self.groups.indexOf(group);

        self.groups.remove(group);

        // If there are any groups, select the first one.
        if (self.groups()) {

            if (currentGroupIndex !== 0) {
                currentGroupIndex--;
            }

            var groupToSelect = self.groups()[currentGroupIndex];

            if (groupToSelect) {
                self.selectGroup(groupToSelect);
            }
            else {
                // No groups, flip to scrolling.
                self.groupView(false);
                self.selectedGroup(null);
            }
        }

        self.saveGroups();
    };

    this.saveGroups = function() {
        // Save the groups off.
        var request = {
            ClientID: self.gridParametersModel.queryParams().clientId,
            GridName: self.gridName(),
            ColumnGroups: ko.utils.arrayMap(self.groups(), function(group) {
                return {
                    GroupName: group.label(),
                    Columns: ko.utils.arrayMap(group.columns(), function(column) {
                        return column.name;
                    })
                };
            })
        };

        $.ajax({
            url: self.saveGridSettingEndPoint(),
            type: "POST",
            data: ko.toJSON(request),
            contentType: "application/json",
            success: function () {
                // Identify all groups as now being saved.
                ko.utils.arrayForEach(self.groups(), function(group) {
                    group.isNew(false);
                });
            },
            complete: function () {
                self.groupInEditState(undefined);
            }
        });
    };

    this.availableColumnsForGroup = ko.computed(function() {
        return ko.utils.arrayFilter(self.columns(), function(column) {
            return !column.fixed && !column.internal;
        });
    });

    this.newRows = [];

    this.handleGridData = function (json) {

        if (json.Data === null) {
            return;
        }

        // Initialize the grid properties only once.  After that we just care about the rows.
        if (!self.initialized()) {

            // Row grouping
            if (json.Grouping) {
                this.supportRowGrouping(true);
                this.rowGroupField(json.GroupingSettings.GroupField);
                this.rowGroupMinHeight(json.GroupingSettings.GroupMinHeight || 0);
            }

            var sortedColumns = json.Columns;

            // Add an index to help with sorting.
            for (var i = 0; i < sortedColumns.length; i++) {
                sortedColumns[i].Index = i;
            }

            if (self.groupSupportEnabled()) {
                self.supportGroups(json.SupportColumnGroups);
            }

            // Configure controls/toolbars on grid
            self.actions().search.enabled(json.ToolBarSettings.ShowSearchButton);
            self.actions().search.config({"showMultiSearch": json.ToolBarSettings.MultipleSearch});

            self.actions().add.enabled(json.ToolBarSettings.ShowAddButton);
            self.actions().refresh.enabled(json.ToolBarSettings.ShowRefreshButton);

            self.actions().select.enabled(json.ToolBarSettings.ShowSelectButton);

            // If 'explicitColumns' returns a value, we were explicitly told what columns to use in the grid
            // and the order to show them.
            if (self.explicitColumns().length > 0) {
                // Prune the columns to be just the ones we care about.
                sortedColumns = ko.utils.arrayFilter(sortedColumns, function(column) {
                    return ko.utils.arrayFirst(self.explicitColumns(), function(explicitColumn) {
                        return column.DataField && column.DataField.toLowerCase() === explicitColumn.toLowerCase();
                    });
                });
            }

            // Sort The Columns
            // If the grid is advanced, we will sort the columns to by the putting the frozen columns in the front.

            // If there are explicit columns we will use the order of the columns
            if (self.explicitColumns().length > 0) {

                var lowerCasedExplicitColumns = ko.utils.arrayMap(self.explicitColumns(), function(explicitColumn) {
                    return explicitColumn.toLowerCase();
                });

                sortedColumns.sort(function(x, y) {
                    var xIndex, yIndex;

                    if (x.DataField) {
                        xIndex = _.indexOf(lowerCasedExplicitColumns, x.DataField.toLowerCase());
                    }

                    if (y.DataField) {
                        yIndex = _.indexOf(lowerCasedExplicitColumns, y.DataField.toLowerCase());
                    }

                    return xIndex - yIndex;
                });
            }

            // Sort the frozen column columns (aka fixed) to the front of the array.
            if (self.advancedGrid()) {
                sortedColumns.sort(function(a, b) {
                    if (a.Frozen && b.Frozen) {
                        return a.Index - b.Index;
                    }
                    else if (a.Frozen) {
                        return -1;
                    }
                    else if (b.Frozen) {
                        return 1;
                    }
                    else {
                        return a.Index - b.Index;
                    }
                });
            }

            if (self.expandableRows()) {
                self.columns.push(new ColumnModel({
                    internal: true,
                    name: "_expand",
                    label: "Expand",
                    fixed: true,
                    sortable: false
                }));
            }

            var vmCheckboxColumn;

            if (self.checkboxesToSelect()) {

                var strCheckboxTitle = self.supportsMultiselect() ? "Checkbox" : "Radio Button";

                vmCheckboxColumn = new ColumnModel({
                    internal: true,
                    name: "_checkbox",
                    label: strCheckboxTitle,
                    fixed: true,
                    sortable: false
                });

                if (self.checkboxPosition() !== 'last') {
                    self.columns.push(vmCheckboxColumn);
                }
            }

            if (self.actions().edit.enabled()) {
                self.columns.push(new ColumnModel({
                    internal: true,
                    name: "_edit",
                    label: "Edit",
                    fixed: true,
                    sortable: false
                }));
            }

            if (self.actions()._delete.enabled()) {
                self.columns.push(new ColumnModel({
                    internal: true,
                    name: "_delete",
                    label: "Delete",
                    fixed: true,
                    sortable: false
                }));
            }

            ko.utils.arrayForEach(sortedColumns, function(column) {

                // Note, we are being told if a column is hidden or not, but in our model, we have is a column is visible or not.  Essentially the opposite.
                var visible = column.Hidden === undefined ? true : !(column.Hidden);

                var vmColumn = new ColumnModel({
                    name: column.DataField,
                    label: column.ColumnName,
                    fixed: column.Frozen,
                    formatter: column.Formatter,
                    sortable: column.Sortable,
                    width: column.Width,
                    align: column.Align.toLowerCase(),
                    primaryKey: column.PrimaryKey,
                    visible: visible,
                    searchable: column.Searchable,
                    showSearch: column.ShowSearch,
                    searchType: column.SearchType,
                    searchDropDownList: column.SearchDropDownList,
                    sortType : column.SortType,
                    merge: column.Merge
                });

                self.columns.push(vmColumn);

                if (self.supportsSplitScreen()) {
                    vmColumn.setColumnWidth(self.splitScreenHalfWidth());
                }
            });

            if (self.checkboxPosition() === 'last') {
                self.columns.push(vmCheckboxColumn);
            }

            if (self.pivotMenu()) {
                self.columns.push(new ColumnModel({
                    internal: true,
                    name: "_pivotMenu",
                    label: "Pivot Menu",
                    fixed: true,
                    sortable: false
                }));
            }

            if (self.actions().select.enabled()) {
                var vmColumn = new ColumnModel({
                    internal: true,
                    name: "_select",
                    label: "Select",
                    fixed: true,
                    sortable: false,
                    formatter: ""
                });
                self.columns.push(vmColumn);

                if (self.supportsSplitScreen()) {
                    vmColumn.originalWidth = 5;
                    vmColumn.setColumnWidth(self.splitScreenHalfWidth());
                }
            }

            if (self.supportsSplitScreen() && self.splitScreenHiddenColumns().length > 0) {
                // Prune the columns to be just the ones we care about.
                var hiddenColumns = ko.utils.arrayFilter(self.columns(), function(column) {
                    return ko.utils.arrayFirst(self.splitScreenHiddenColumns(), function(hiddenColumn) {
                        return column.name.toLowerCase() === hiddenColumn.toLowerCase();
                    });
                });

                // make a copy of the string column names for removal
                var arrColumnStrings = self.splitScreenHiddenColumns();

                ko.utils.arrayForEach(hiddenColumns, function(column) {
                    self.splitScreenHiddenColumns.push(column);
                });

                // empty the strings out of the array
                self.splitScreenHiddenColumns.remove(function(item) {
                    return typeof item === "string";
                });
            }

            if (self.supportGroups() && self.groups().length === 0 && json.ColumnGroups !== null && json.ColumnGroups.length > 0) {

                var columnGroups = json.ColumnGroups,
                    groups = [];

                var sortColumnsInGroup = function(columns) {
                    return columns;
                };

                ko.utils.arrayForEach(columnGroups, function(group) {
                    var columns = [];

                    ko.utils.arrayForEach(group.Columns, function(columnName) {
                        ko.utils.arrayForEach(self.columns(), function(column) {
                            if (column.name === columnName) {
                                columns.push(column);
                            }
                        });
                    });

                    groups.push(new GroupModel({
                        label: group.GroupName,
                        columns: sortColumnsInGroup(columns),
                        availableColumns: self.availableColumnsForGroup()
                    }));
                });

                // Push in selected groups
                self.groups.push.apply(self.groups, groups);

                // Select the first group if it exists.
                if (self.supportGroups() && self.groups().length > 0 && self.selectedGroup() === undefined) {
                    self.selectGroup(self.groups()[0]);  // Select the first group.
                }
            }

            // Now that the columns are all set we can update which one we should be showing as being selected.
            if (json.SortName) {
                var getColumnByName = function(columnName) {
                    return ko.utils.arrayFirst(self.columns(), function(column) {
                        return column.name === columnName;
                    });
                };

                var column = getColumnByName(json.SortName);

                if (column) {
                    var sortOrder = json.SortOrder ? json.SortOrder.toLowerCase() : "asc";
                    self.configureSortedColumn(column, sortOrder);
                }
                else {
                    self.configureSortedColumn(undefined, undefined);  // Purposely set the default to be not defined.
                }
            }
            else {
                self.configureSortedColumn(undefined, undefined);  // Purposely set the default to be not defined.
            }

            // apply any filters that are set by default
            _.each(self.defaultFilters(), function(filter) {
                if (filter.activeValue() !== undefined && filter.activeValue() !== '' && !filter.defaultActive) {
                    var activeOption = _.find(filter.options, function(option) {
                        return option.value === filter.activeValue();
                    });

                    if (activeOption !== undefined) {

                        var activeOperator = activeOption.op;

                        self.addFilter(filter, filter.activeValue(), activeOperator);
                        self.hasPresetFilters(true);
                    }
                } else if (filter.defaultActive) {
                    delete filter.defaultActive;
                }
            });

            // if filters are applied initially, set the group operator (to 'AND')
            if (self.defaultFilters().length > 0) {
                self.searchOptions().resetGroupOperators();
            }

        }

        self.actions().download.enabled(json.ToolBarSettings.ExcelExportUrl);
        self.actions().download.config({excelExportUrl: json.ToolBarSettings.ExcelExportUrl});

        // These values can fluctuate as the user filters the grid.
        self.rowCount(json.Data.records);


        if (self.showGrid()) {
            // If the 1st page was requested, blow away all of the rows that exist.
            if (self.gridParametersModel.page() === 1 && !self.checkForUpdates()) {
                // Clear out the pages
                self.rowsUnfiltered.removeAll();
            }

            if (self.supportRowGrouping()) {

                // Storage for previous rows
                var previousRowsData = [];

                // Look through the old rows
                $.each(this.rowsUnfiltered(), function (i, row) {
                    // Check the data to see if it's a dummy row
                    if (!row.data().dummyRow) {
                        // If not, store the data for the row
                        previousRowsData.push(row.data());
                    }
                });

                // Combine the new and old rows (if old rows existed)
                var rowsToGroup = previousRowsData.length ? previousRowsData.concat(json.Data.rows) : json.Data.rows,
                    // And group the rows
                    groupedRows = _.groupBy(rowsToGroup, function (row) { return row[self.rowGroupField()]; }),
                    newGroupedRowModels = [];

                $.each(groupedRows, function (groupName, rows) {

                    var originalGroupLength = rows.length,
                        dummyRowsAmount = self.rowGroupMinHeight() - originalGroupLength;

                    // If it's a positive number, we need dummy rows
                    if (dummyRowsAmount > 0) {

                        // Add the proper amount of dummy rows
                        for (i = 0; i < dummyRowsAmount; i++) {
                            rows.push({ dummyRow: true });
                        }
                    }

                    $.each(rows, function (i, row) {

                        var rowModel = new RowModel(row, self);

                        newGroupedRowModels.push(rowModel);

                        rowModel.groupIndex = i;
                        rowModel.groupLength = rows.length;
                        rowModel.originalGroupLength = originalGroupLength;
                    });
                });

                self.newRows = newGroupedRowModels;

                // remove all rows since we've stored old rows separately in rowsToGroup
                self.rowsUnfiltered.removeAll();

                self.pushData(json);

            } else {
                if (!self.checkForUpdates()) {
                    // Normal grid work
                    self.newRows = ko.utils.arrayMap(json.Data.rows, function(row) {
                        return new RowModel(row, self);
                    });

                    self.pushData(json);
                } else {

                    // Updating grid
                    var keyField = self.options.checkForUpdates.keyField,
                        currentRows = self.rowsUnfiltered();

                    if (!self.gridIsUpdating()) {
                        // Refresh button click
                        self.newRowsCount(0);
                        self.showRefreshButton(false);

                        self.newRows = [];

                        // Constructing Row models and highlighting new rows
                        ko.utils.arrayForEach(json.Data.rows, function (row) {
                            var rowModel = new RowModel(row, self),
                                keyVal = row[keyField],
                                found = false;
                            if (currentRows.length > 0) {
                                for (var i = 0; i < currentRows.length; i++) {
                                    if (keyVal === currentRows[i].data()[keyField]) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    rowModel.newRowHighlight(true);
                                }
                            }
                            self.newRows.push(rowModel);
                        });

                        // when greying out rows and clicking refresh button, remove all rows first and just replace with the new set
                        if (self.checkForUpdates()) {
                            self.rowsUnfiltered.removeAll();
                        }
                        // All rows expected here
                        self.pushData(json);

                    } else {
                        // Background update
                        var requestedRows = [];
                        // Constructing Row models
                        ko.utils.arrayForEach(json.Data.rows, function (newRow) {
                            requestedRows.push(new RowModel(newRow, self));
                        });

                        var hasGrayOutRows = false,
                            tmp = [];
                        for (var y = 0; y < requestedRows.length; y++) {
                            tmp.push(false);
                        }
                        for (var w = 0; w < currentRows.length; w++) {
                            var curRow = currentRows[w],
                                curRowData = curRow.data();
                            var found = false;
                            for (var j = 0; j < requestedRows.length; j++) {
                                var newData = requestedRows[j].data();
                                if (newData[keyField] === curRowData[keyField] && !tmp[j]) {
                                    found = true;
                                    tmp[j] = true;
                                    break;
                                }
                            }
                            // The curRow was not found at the requested data
                            if (!found) {
                                curRow.grayOut(true);
                                hasGrayOutRows = true;
                            }
                        }

                        var newRequestedRows = [];
                        for (var z = 0; z < requestedRows.length; z++) {
                            if (!tmp[z]) {
                                newRequestedRows.push(requestedRows[z]);
                            }
                        }
                        self.newRowsCount(newRequestedRows.length);

                        if (hasGrayOutRows || newRequestedRows.length) {
                            self.showRefreshButton(true);
                        }

                        // Updating is done
                        self.gridIsUpdating(false);
                    }
                    if (self.options.showLoader) {
                        self.showLoader(true);
                    }
                }
            }
        }

        // Capture the page number and and number of total pages from the server.
        self.gridParametersModel.serverPage(Number(json.Data.page));
        self.gridParametersModel.totalPages(Number(json.Data.total));

        if (!self.initialized()) {
            self.initialized(true);
            if (self.hierarchyModel()) {
                self.hierarchyModel().initialRowCount(self.rowCount());
            }
        }

    };

    this.pushData = function(json) {
        if (self.newRows.length) {
            var data = self.newRows.splice(0, self.renderChunksCount());
            setTimeout(function() {
                self.rowsUnfiltered.push.apply(self.rowsUnfiltered, data);
                self.pushData(json);
            }, 0);
        }
        else {
            if (self.completeEvent) {
                self.completeEvent();
            }
            self.sendCompleteNotification(json);
        }
    };

    this.loadData = _.debounce(function() {
        if (!self.gridParametersModel.isValid()) {
            console.error("A grid end point and clientId must be provided prior to loading data.");
            return;
        }

        if (!self.pendingRequest() && self.gridParametersModel.gridUrl()) {

            if (self.storedGridData()) {
                self.handleGridData(self.storedGridData());

                self.storedGridData(null);
            } else {

                // Otherwise, go fetch the data
                self.pendingRequest(true);

                var ajaxConfig = {
                    url: self.gridParametersModel.gridUrl(),
                    complete: function () {
                        self.pendingRequest(false);
                    },
                    success: function (json) {

                        // If filters are passed down, set them up
                        if (json.dropdownFilters) {
                            self.readyInitialFilters(json.dropdownFilters);
                        }

                        // Process the data we've received
                        self.handleGridData(json);
                    }
                };

                // If we have a stored JSON(s), make a POST request, sending the data along
                if (self.postJSON() || self.postColumnlessFilters()) {

                    // combine objects
                    var dataToPost = $.extend({}, self.postJSON(), self.postColumnlessFilters());

                    ajaxConfig.type = 'POST';
                    ajaxConfig.data = JSON.stringify(dataToPost);
                    ajaxConfig.contentType = 'application/json';
                    ajaxConfig.dataType = 'json';
                }

                $.ajax(ajaxConfig);
            }
        }

        if (self.resettingGrid()) {
            self.resettingGrid(false);
        }

    }, 300);

    this.nextPage = function() {
        // Update the grid parameters to the next page.
        self.gridParametersModel.nextPage();
    };

    this.updateGridData = function (notification) {
        // Update only if checkForUpdates is true
        if (!self.checkForUpdates()) {
            return;
        }

        self.gridIsUpdating(true);
        self.showLoader(false);
        self.loadData();
    };

    // Set up the initial filters
    this.readyInitialFilters = function (filters) {

        // Only set up filters once initially
        // Important if filters are coming down with ajax response
        if (this.dropdownFilters().length === 0) {

            _.each(filters, function (filter) {
                // if dynamic options are to be retrieved via a function, call that function
                if ($.isFunction(filter.options)) {
                    var fnTemp = filter.options;

                    // since options may require an ajax call, wait until grid is loaded to set them
                    var fnInterval = setInterval(function () {
                        if (self.initialized() === true) {
                            filter.options = fnTemp();
                            clearInterval(fnInterval);
                        }
                    }, 500);

                    filter.options = [];
                }

                if (typeof filter.options === 'string') {
                    if ($.isFunction(self[filter.options])) {
                        filter.options = self[filter.options].call(self);
                    }
                }

                if (filter.showAllLabel) {
                    filter.options.unshift({label: filter.showAllLabel, value: ''});
                }

                // if an operator has not been specified for an option, use 'equals'
                _.each(filter.options, function (option) {
                    if (option.op === undefined) {
                        option.op = 'eq';
                    }
                });

                var activeValue = filter.activeValue,
                    disabled = filter.disabled;

                if (activeValue === undefined || activeValue === '') {
                    filter.activeValue = ko.observable('');
                }
                else {
                    filter.activeValue = ko.observable(activeValue);
                }

                if (disabled === undefined) {
                    disabled = false;
                }

                filter.disabled = ko.observable(disabled);

                filter.searchRow = ko.observable();
                filter.applied = ko.observable(false); // for catalog only

                self.dropdownFilters.push(filter);
            });
        }
    };
};

var GridTypeAheadMultiselectModel = function(options) {
    var vmTypeahead = new TypeaheadMultiselectModel(options);
    return vmTypeahead;
};

(function( MetTel, $, undefined ) {
    MetTel.Grid = {
        Utils: {
            initGrid: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var $grid = $(element),
                    options = $.extend({}, valueAccessor(), viewModel.gridOptions ? viewModel.gridOptions : {});
                viewModel.options = options;
                // Prepare the grid
                $grid.addClass( "mettel-grid")
                    .addClass("mettel-grid-" + options.gridName.toLowerCase())
                    .attr("data-mettel-grid", options.gridName);

                // Add the grid template
                if (options.isProducts) {
                    ko.applyBindingsToNode(element, { template: { name: 'products-grid', data: viewModel } }, bindingContext);
                } else {
                    ko.applyBindingsToNode(element, {template: {name: 'grid', data: viewModel}}, bindingContext);
                }

                viewModel.columns.subscribe(function(columns) {
                    MetTel.Grid.Utils.manageColumns(element, columns);
                });

                viewModel.inEditState.subscribe(function() {
                    MetTel.Grid.Utils.manageEditState(viewModel);
                });

                viewModel.groupView.subscribe(function() {
                    MetTel.Grid.Utils.manageGridView(viewModel, element);
                });

                viewModel.rows.subscribe(function() {
                    MetTel.Grid.Utils.manageGridView(viewModel, element);
                });

                if (options.postJSON) {
                    viewModel.postJSON(options.postJSON);
                }

                if (options.noResultsMessage) {
                    viewModel.noResultsMessage(options.noResultsMessage);
                }

                if (options.expandableRows) {
                    viewModel.expandableRows(true);
                    $grid.addClass( "mettel-grid-expandable-rows");

                    if (options.expandableRows.expandRowEvent) {
                        viewModel.expandRowEvent = options.expandableRows.expandRowEvent;
                    }

                    if (options.expandableRows.getData) {
                        viewModel.expandableRowsExternalData(true);

                        if (options.expandableRows.getData.callback) {
                            viewModel.expandableRowsExternalDataCallback = options.expandableRows.getData.callback;
                        }

                        if (options.expandableRows.getData.queryParams) {
                            viewModel.expandableRowsExternalDataQueryParams = options.expandableRows.getData.queryParams;
                        }
                    }
                }

                if (options.completeEvent) {
                    if ($.isFunction(options.completeEvent)) {
                        viewModel.completeEvent = options.completeEvent;
                    }
                }

                // allowing simple grids to enable the toolbar
                if (options.showToolbar && viewModel.advancedGrid() === false) {
                    viewModel.showGridControls(options.showToolbar);
                }

                if (options.elementsToSubtract) {
                    viewModel.elementsToSubtract = options.elementsToSubtract;
                }

                if (options.checkboxesToSelect !== undefined) {
                    viewModel.checkboxesToSelect(true);

                    if (options.checkboxesToSelect.checkboxPosition) {
                        viewModel.checkboxPosition(options.checkboxesToSelect.checkboxPosition);
                    }

                    if (options.checkboxesToSelect.disableRowProperty) {
                        viewModel.disableRowProperty(options.checkboxesToSelect.disableRowProperty);

                        viewModel.setUpEnabledRows();
                    }

                    if (options.checkboxesToSelect.invertDisableRowProperty) {
                        viewModel.invertDisableRowProperty(options.checkboxesToSelect.invertDisableRowProperty);
                    }
                }

                if (options.pivotMenu) {
                    viewModel.pivotMenu(true);

                    if (options.pivotMenu.pivotMenuOptionEvent) {
                        viewModel.pivotMenuOptionEvent = options.pivotMenu.pivotMenuOptionEvent;
                    }
                }

                // dropdown filters
                if (options.dropdownFilters) {

                    // Set up the initial filters
                    viewModel.readyInitialFilters(options.dropdownFilters);
                }

                // toggle filters
                if (options.toggleFilters) {
                    _.each(options.toggleFilters, function(filter) {
                        filter.options.unshift({ label: filter.showAllLabel, icon: filter.showAllIcon, value: '' });

                        // if an operator has not been specified for an option, use 'equals'
                        _.each(filter.options, function(option) {
                            if (option.op === undefined) {
                                option.op = 'eq';
                            }
                        });

                        if (filter.label === undefined) {
                            filter.label = filter.column;
                        }

                        var activeValue = filter.activeValue;

                        if (activeValue === undefined || activeValue === '') {
                            filter.activeValue = ko.observable('');
                        }
                        else {
                            filter.activeValue = ko.observable(activeValue);

                            // find the active operator
                            var activeOperator;
                            for (var i = 0; i < filter.options.length; i++) {
                                var option = filter.options[i];
                                if (option.value === activeValue) {
                                    activeOperator = option.op;
                                }
                            }

                            // mark the filter as default active
                            // and wait till we have the endPoint to set the filter
                            filter.defaultActive = true;
                            var endPointSubscription = viewModel.gridParametersModel.getGridDataEndPoint.subscribe(function(newValue) {
                                if (newValue) {
                                    viewModel.setToggleFilter(filter, activeValue, activeOperator, {
                                        name: filter.column,
                                        label: filter.label
                                    });
                                    endPointSubscription.dispose();
                                }
                            });
                        }

                        filter.searchRow = ko.observable();

                        // not allowing mandatory toggle filters for now
                        filter.disabled = ko.observable(false);

                        viewModel.toggleFilters.push(filter);
                    });
                }

                if (options.frozenHeader) {
                    viewModel.frozenHeader(options.frozenHeader);
                }

                if (options.renderChunksCount) {
                    viewModel.renderChunksCount(parseInt(options.renderChunksCount, 10));
                }

                if (options.fixedHeight) {
                    viewModel.fixedHeight(options.fixedHeight);
                }

                if (options.loadButtons) {
                    viewModel.loadButtons(options.loadButtons);

                    if (options.loadButtons.hideLoadAll) {
                        viewModel.showLoadAll(false);
                    } else {
                        viewModel.showLoadAll(true);
                    }
                }

                if (options.showLoader) {
                    viewModel.showLoader(true);
                }

                if (options.loadButtons && options.loadButtons.loadAllLimit) {
                    viewModel.loadAllLimit(options.loadButtons.loadAllLimit);
                }

                if (options.splitScreen && options.splitScreen.hiddenFields) {
                    viewModel.splitScreenHiddenColumns(options.splitScreen.hiddenFields);
                }

                if (options.customHeaderTemplates) {
                    viewModel.customHeaderTemplates(options.customHeaderTemplates);
                }

                if (options.customColumnTemplates) {

                    var templates = options.customColumnTemplates;

                    // Rename the template names to be lower case
                    $.each(templates, function (key) {
                        if (key !== key.toLowerCase()) {
                            templates[key.toLowerCase()] = templates[key];
                            delete templates[key];
                        }
                    });

                    viewModel.customColumnTemplates(templates);
                }

                if (options.isProducts) {
                    viewModel.isProductsGrid(options.isProducts);
                }

                // Load the data into the grid
                viewModel.configureGrid(options.gridName, options.endPoints, options.queryParams, options.twoColumnLayout);


                if (options.columns) {
                    if (options.columns.explicit) {
                        viewModel.explicitColumns.push.apply(viewModel.explicitColumns, options.columns.explicit);
                    }
                }

                if (options.multiselect) {
                    viewModel.supportsMultiselect(options.multiselect);
                }

                if (options.gridTypeAheadMultiselectConfig) {
                    viewModel.multiSelectSearch = ko.observable();
                    options.gridTypeAheadMultiselectConfig.value = viewModel.multiSelectSearch;
                    options.gridTypeAheadMultiselectConfig.viewModel = viewModel;
                    options.gridTypeAheadMultiselectConfig.showToolbar = options.showToolbar ? options.showToolbar : false;
                    viewModel.gridTypeAheadMultiselectModel(new GridTypeAheadMultiselectModel(options.gridTypeAheadMultiselectConfig));
                    viewModel.gridTypeAheadMultiselect(true);

                }

                if (options.rowSelect !== undefined) {
                    viewModel.supportsRowSelection(options.rowSelect);
                }

                if (options.hierarchyConfig) {
                    viewModel.hierarchyModel(new HierarchyModel(options.hierarchyConfig));
                }

                if (options.quickFilter) {
                    viewModel.quickFilter(options.quickFilter);
                }

                if (options.headerSettings) {
                    viewModel.headerSettings(options.headerSettings);
                }

                if (options.actions) {

                    if (options.actions.add) {
                        viewModel.actions().add.action(options.actions.add);
                    }

                    if (options.actions.edit) {
                        viewModel.actions().edit.action(options.actions.edit);
                        viewModel.actions().edit.enabled(true);
                    }

                    if (options.actions['delete']) {
                        viewModel.actions()._delete.action(options.actions['delete']);
                        viewModel.actions()._delete.enabled(true);
                    }

                    if (options.actions.select) {
                        viewModel.actions().select.action(options.actions.select);
                    }
                }

                if (options.checkForUpdates) {
                    viewModel.checkForUpdates(true);
                    viewModel.gridParametersModel.clientSidePaging(true);
                    options.checkForUpdates.subscribe(function (notification) {
                        viewModel.updateGridData(notification);
                    });
                }

                if (options.striping) {
                    viewModel.striping(true);
                }

                MetTel.Grid.Utils.calculateHeight(element);
                MetTel.Grid.Utils.manageGrid(viewModel, element);
                MetTel.Grid.Utils.manageGridFooter(element);
                MetTel.Grid.Utils.manageGridView(viewModel, element);


                // Make the viewModel available to jQuery.
                $grid.data("viewModel", viewModel);
            },
            calculateHeight: function(element){
                // just get the height and cache it in jQuery data
            },
            manageGrid: function(viewModel, element) {
                // Only grids that are advanced, use a frozen header, or use a fixed height use JS to format themselves.
                var $grid = $(element),
                    $page = $grid.parents("[data-mettel-class='page']");

                // handling of checkboxes / radio buttons to select rows
                if (viewModel.checkboxesToSelect()) {
                    $(element).addClass("mettel-grid-checkboxes-to-select");

                    if (viewModel.supportsMultiselect() === false) {
                        $(element).addClass("mettel-grid-radio-buttons-to-select");
                    }
                }

                var $helpDeskContainer;

                if (viewModel.supportsSplitScreen()) {
                    // apply classes for styling
                    // $page.addClass('full-screen');
                    $page.addClass('mettel-two-column-layout');
                    $grid.addClass('mettel-grid-split-screen');

                    // dom manipulation to set up two columns
                    // with column 2 having the knockout context
                    $grid.wrap('<div class="mettel-column-one"></div>');
                    var $columnOne = $grid.parent('.mettel-column-one'),
                        $columnTwoContainer = $grid.find('.mettel-column-two-container');

                    $columnOne.wrap('<div class="mettel-column-container mettel-column-one-container"></div>');

                    var $columnOneContainer = $('.mettel-column-one-container');

                    $columnOneContainer.wrap('<div class="mettel-help-desk-section" data-mettel-class="help-desk-section"></div>');
                    $columnOneContainer.after($columnTwoContainer);

                    $helpDeskContainer = $columnOneContainer.closest('[data-mettel-class="help-desk-section"]');
                }

                if (viewModel.supportsLoadButtons()) {
                    $grid.addClass('mettel-grid-with-load-buttons');
                }

                if (viewModel.fixedHeight()) {
                    var $fixedGridBody = $grid.find("[data-mettel-class='grid-body']");

                    $fixedGridBody.css('height', viewModel.fixedHeight() + 'px');
                }

                if (!viewModel.fixedHeight() && (viewModel.supportsFixedHeight() || viewModel.supportsSplitScreen() || viewModel.supportsLoadButtons())) {
                    // get the height from calculateHeight and set the height of the grid
                    var $gridBody = $grid.find("[data-mettel-class='grid-body']"),
                        windowHeight = $(window).height(),
                        pageHeight,
                        $pageChildren,
                        strElementsToSubtract = '';

                    if (viewModel.isProductsGrid()) {
                        var $listContainer = $grid.children('[data-mettel-class="products-list-container"]');
                    }

                    if (viewModel.elementsToSubtract) {
                        strElementsToSubtract = ', ' + viewModel.elementsToSubtract.join(', ');
                    }

                    var calculateHeights = function() {
                        pageHeight = 0;

                        // Assume the Grid is full screen
                        if(viewModel.twoColumnLayout()){
                            $pageChildren = $grid.parents("[data-mettel-class='two-column-grid']").children(':not(script)');
                        } else {
                            // don't include the actual grid here, we'll traverse its children later
                            $pageChildren = $grid.parents(".mettel-page").find('.mettel-footer, .mettel-header, .mettel-breadcrumbs, #grid_filter, .tab-nav, .federal_banner' + strElementsToSubtract);
                        }

                        // Determines the height of the page sans the grid
                        $pageChildren.each(function() {
                            pageHeight += $(this).filter(':visible').outerHeight();
                        });

                        // traverse grid's visible children, (except grid-body since that is whose height we are calculating)
                        $grid.children(':not(.mettel-grid-body, .mettel-grid-group-builder, .mettel-modal-dialog, .mettel-grid-loading-overlay, [data-mettel-class="products-list-container"], style, .mettel-typeahead-multiselect)').each(function () {
                            pageHeight += $(this).outerHeight();
                        });

                    };

                    var updateHeight = function() {
                        if (viewModel.supportsSplitScreen()) {
                            // get the "half-width", to use later when we dynamically calculate column widths
                            viewModel.splitScreenHalfWidth($helpDeskContainer.width()/2);
                            _.each(viewModel.columns(), function(column) {
                                column.setColumnWidth(viewModel.splitScreenHalfWidth());
                            });

                        }

                        var height;
                        if (viewModel.twoColumnLayout()){
                            height = ( windowHeight - pageHeight ) - 133;
                        }
                        // handles 'frozen header' grids nested within
                        // grids with expandable rows
                        else if ($grid.parents('.mettel-grid').length > 0) {
                            height = 169;
                        }
                        else if (viewModel.fixedHeight()) {
                            height = viewModel.fixedHeight();
                        }
                        else {
                            height = windowHeight - pageHeight;
                        }

                        // don't set height for the grids in the global search
                        // the global search componenet will handle this
                        if ($grid.hasClass('mettel-grid-global-search') === false && !viewModel.isProductsGrid()) {
                            $gridBody.css('height', height + 'px');
                        } else if (viewModel.isProductsGrid()) {
                            // For the products grid, set the container height instead
                            $listContainer.css('height', height + 'px');
                        }
                    };

                    if (viewModel.options.disabledAutoHeight) {
                        updateHeight = function(){};
                    }
                    if (viewModel.options.autoHideLoadButton) {
                        viewModel.autoHideLoadButton(true);
                    }
                    var resizeGrid = function() {
                        windowHeight = $(window).height();
                        updateHeight();
                    };

                    if (viewModel.supportsSplitScreen()) {
                        $helpDeskContainer.resize( _.debounce(resizeGrid, 100) );
                    } else {
                        $(window).resize( _.debounce(resizeGrid, 100) );
                    }

                    // scrollbar handling, only run once we've retrieved data
                    var objSubscription = viewModel.initialized.subscribe(function(value) {
                        // only need to worry about this situation if there's a frozen header
                        if (viewModel.supportsFrozenHeader()) {
                            var numScrollHeight = $gridBody.prop('scrollHeight'),
                                numClientHeight = $gridBody.prop('clientHeight'),
                                $gridHead = $grid.find("[data-mettel-class='grid-fixed-head']");

                            // if there is a scrollbar...
                            if (numScrollHeight > numClientHeight) {
                                // update header styles to account for it
                                $gridHead.addClass('mettel-grid-scrolling');
                            }
                        }

                        // no longer pay attention to 'initialized'
                        objSubscription.dispose();
                    });

                    ko.postbox.subscribe("grid.recalculateHeight", function(newValue) {
                        calculateHeights();
                        updateHeight();
                    });

                    // don't lock the page for nested grids
                    if ($page.find($grid).length && ($grid.parents('.mettel-grid').length === 0)) {
                        $page.addClass('mettel-state-fixed');
                    }

                    // updateHeight();
                }
            },
            manageTree: function(viewModel, element) {
                // Hack to clean up later. Should calc the height of the header/action bar and subtract that from the height of the window.
                var $tree = $("[data-mettel-class='tree']"),
                    windowHeight = $(window).height(),
                    pageHeight = 0;

                var updateHeight = function() {
                    var height = windowHeight - 113;
                    $tree.css('height', height + 'px');
                };

                var resizeTree = function() {
                    windowHeight = $(window).height();
                    updateHeight();
                };

                $(window).resize( _.debounce(resizeTree, 100) );

                updateHeight();

            },
            manageGridFooter: function(element) {

                var $element = $(element),
                    width = 0,
                    $columns = $element.find('[data-mettel-class="column"].mettel-grid-column-fixed');

                ko.utils.arrayForEach($columns, function(column) {
                    width += $(column).width();
                });

                // TODO: Camping on the window resize event for this to work.
                // Really, need to wait for the data to be loaded and/or the DOM to be updated

                var $footer = $element.find('[data-mettel-class="grid-footer"]'),
                    $footerLeft = $element.find('.mettel-grid-footer-left'),
                    $footerRight = $element.find('.mettel-grid-footer-right'),
                    $comboBox = $element.find('.mettel-grid-field-group-combobox'),
                    $comboBoxFieldGroup = $comboBox.find('.mettel-field-group'),
                    gridWidth = $element.width(),
                    leftWidth, rightWidth;

                // This can be replaced with the binding handler
                var calcualateLeftWidth = function() {
                    var $fixedColumns = $element.find('[data-mettel-class="grid-row"]:first .mettel-grid-column-fixed');

                    if( !$element.hasClass('mettel-state-scrolling') ) {

                        leftWidth = 0;

                        var columnWidths = [];

                        $fixedColumns.each(function(){
                            var columnWidth = $(this).outerWidth();
                            leftWidth += columnWidth;
                        });

                        // min-width for the left side of the footer is 350
                        if (leftWidth > 350) {
                            $footerLeft.css( 'width', leftWidth + 'px' );
                        }
                        else {
                            leftWidth = 350;
                        }

                    }

                };

                var calculateRightWidth = function() {
                    rightWidth = gridWidth - leftWidth;
                    $footerRight.css( 'width', rightWidth + 'px' );
                };

                var calculateComboBoxWidth = function() {
                    var $addButton = $('[data-mettel-class="add-field-group"]'),
                        addButtonWidth = $addButton.outerWidth(),
                        comboBoxWidth = rightWidth - addButtonWidth;

                    $comboBoxFieldGroup.css( 'width',  + 'px');
                };

                var toggleFieldGroupControls = function() {

                    var $addButton = $('[data-mettel-class="add-field-group"]'),
                        addButtonWidth = $addButton.outerWidth(),
                        $fieldGroupButtons = $element.find('.mettel-grid-field-group-list .mettel-field-group-button'),
                        elementsWidth = addButtonWidth,
                        $fieldGroupComboBox = $('[data-mettel-class="field-group-combo-box"]');

                    $fieldGroupButtons.each(function(){
                        var width = $(this).outerWidth();
                        elementsWidth += width;
                    });

                    if ( rightWidth >= elementsWidth ) {
                        $footerRight.removeClass('mettel-view-combo-box');
                    } else {
                        var comboBoxWidth = rightWidth - addButtonWidth;
                        $footerRight.addClass('mettel-view-combo-box');
                        $fieldGroupComboBox.css('width', comboBoxWidth + 'px');
                    }

                };

                var updateView = function() {
                    gridWidth = $element.width();
                    calcualateLeftWidth();
                    calculateRightWidth();
                    calculateComboBoxWidth();
                    toggleFieldGroupControls();
                };

                $(window).resize( _.debounce( function() {
                    updateView();
                }, 50));

                updateView();

            },
            manageColumns: function(element, columns) {
                var columnsToMonitor = $(element).data("columnsToMonitor"),
                    $element = $(element);

                if (columnsToMonitor === undefined) {
                    columnsToMonitor = [];
                    $element.data("columnsToMonitor", columnsToMonitor);
                }

                ko.utils.arrayForEach(columnsToMonitor, function(subscription) {
                    subscription.dispose();
                });

                var updateColumn = function(index, column) {
                    columnsToMonitor.push(column.visible.subscribe(function() {
                        $element.toggleClass("mettel-grid-hide-column-" + index, !column.visible());
                        // Set an additional class on the column if the server tells us it's hidden.
                        $element.addClass("mettel-state-hidden-" + index, !column.visible());
                    }));

                    $element.toggleClass("mettel-grid-hide-column-" + index, !column.visible());
                };

                for (var i = 0; i < columns.length; i++) {
                    updateColumn(i, columns[i]);
                }
            },
            manageEditState: function(viewModel) {
                var $overlay = $("[data-mettel-class='grid-overlay']");

                if (viewModel.inEditState()) {
                    if ($overlay.length === 0) {
                        $overlay = $("<div></div>").addClass("mettel-grid-overlay").attr("data-mettel-class", "grid-overlay");
                        $('body').append($overlay);  // Is this the right element ot append the overlay to?
                    }

                    $overlay.click(function() {
                        viewModel.exitEditState();
                        $overlay.remove();
                    });
                }
                else {
                    if ($overlay.length > 0) {
                        $overlay.remove();
                    }
                }
            },
            manageGridView: function(viewModel, element) {
                var $grid = $(element),
                    $gridHeadTable = $grid.find("[data-mettel-class='grid-fixed-head-table']"),
                    $gridHeadCols = $grid.find("[data-mettel-class='grid-head-colgroup']").find('col'),
                    $gridBody = $grid.find("[data-mettel-class='grid-body']"),
                    scrollingClass = 'mettel-state-scrolling';


                $grid.toggleClass(scrollingClass, viewModel.scrollingView() && viewModel.advancedGrid());

                var manageColumnWidths = function() {

                    var $cells = $gridBody.find('[data-mettel-class="grid-row"]:first td'),
                        cellWidths = [];

                    if ($grid.hasClass(scrollingClass)) {
                        $cells.each(function(index){
                            var cellWidth = $(this).outerWidth();
                            cellWidths.push( cellWidth );
                        });

                        $gridHeadCols.each(function(index){
                            $(this).css('width', cellWidths[index] + 'px');
                        });

                    }
                    else {
                        // TODO:  Couldn't this just be $gridHeadCols.attr('style', '');?
                        $gridHeadCols.each(function(index){
                            $(this).attr( 'style', '' );
                        });
                    }
                };

                var manageGridScrolling = function() {
                    manageColumnWidths();
                };

                var syncHeader = function() {
                    var bodyPosition = $gridBody.scrollLeft() * -1;
                    $gridHeadTable.css( 'left', bodyPosition + "px");
                };

                manageGridScrolling();

                $gridBody.scroll( _.throttle( function() {
                    syncHeader();
                }, 15));
            }
        }
    };
}( window.MetTel = window.MetTel || {}, jQuery ));

ko.bindingHandlers.executeSearch = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.on('click', function(e) {
            e.preventDefault();

            // update the gridURL
            viewModel.executeSearch();

            // close the modal
            $element.parents('.mettel-modal-dialog').modalWindow('close');

            // hide the filter bar
            viewModel.showFilterBar(false);

            viewModel.recalculateHeight();
        });
    }
};

ko.bindingHandlers.resetSearch = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.on('click', function(e) {
            e.preventDefault();

            // update the gridURL
            viewModel.resetSearch(true);

            // close the modal
            $element.parents('.mettel-modal-dialog').modalWindow('close');

            // hide the filter bar
            viewModel.showFilterBar(false);

            viewModel.recalculateHeight();
        });
    }
};

ko.bindingHandlers.infiniteScroll = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // Only supported for advanced grids and simple grids who explicitly set infiniteScrolling to true
        if (viewModel.supportsInfiniteScrolling()) {
            var $element = $(element),
                options = valueAccessor(),
                loadFunc = options.loadFunc,
                loadPercentage = options.loadPercentage ? options.loadPercentage : 0.85,
                previousScrollTop = $element.prop('scrollTop');

            viewModel.gridParametersModel.page.subscribe(function(value) {
                // If we are going back to page 1, lets send it back to the top of the page.  We are doing this because the only
                // way we can reset page to 1 again is if it was higher than 2 at some point.
                if (value === 1) {
                    element.scrollTop = 0;
                }
            });

            $element.scroll(_.debounce(function() {
                var scrollHeight = $element.prop('scrollHeight'),
                    scrollTop = $element.prop('scrollTop'),
                    innerHeight = $element.innerHeight(),
                    percentScrolled = (scrollTop + innerHeight) / scrollHeight;

                // if you are scrolling down and have scrolled beyond loadPercentage,
                // trigger the load function that was passed

                if ((previousScrollTop < scrollTop) && (percentScrolled > loadPercentage)) {
                    loadFunc();
                }

                // Update the previous scrollTop position to the current for future evaluation.
                previousScrollTop = scrollTop;

            }, 250));
        }
    }
};


ko.bindingHandlers.columnClass = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // This will be called when the binding is first applied to an element
        // Set up any initial state, event handlers, etc. here
        var column = valueAccessor().column,
            label = column.label ? column.label : column.name,
            indexClass = 'mettel-grid-column-' + valueAccessor().index;

        $(element)
            .addClass( "mettel-grid-column-" + label.replace(/\s+/g, '-').toLowerCase())
            .addClass(indexClass);
    }
};


ko.bindingHandlers.firstGroupColumnClass = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var column = valueAccessor(),
            $element = $(element);

        if (bindingContext.$parents[1].selectedGroup()) {
            $element.toggleClass("mettel-grid-column-first-within-group", bindingContext.$parents[1].selectedGroup().columns()[0] === column);
        }
        else {
            $element.removeClass("mettel-grid-column-first-within-group");
        }
    }
};


ko.bindingHandlers.columnHeaderClass = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // This will be called when the binding is first applied to an element
        // Set up any initial state, event handlers, etc. here
        var column = valueAccessor(),
            $element = $(element);

        if (column.sortable) {
            // If this class exists we can remove it since we will be setting the sort direction shortly.
            $element.removeClass("mettel-grid-column-desc");

            if (column.fixed) {
                $element.addClass("mettel-grid-column-fixed");
            }

            if (bindingContext.$parent.selectedColumn() && (bindingContext.$parent.selectedColumn() === column)) {
                $element.addClass("mettel-grid-column-selected");

                if (bindingContext.$parent.selectedColumnSortDirection() === "desc") {
                    $element.addClass("mettel-grid-column-desc");
                }
            }
            else {
                $element.removeClass("mettel-grid-column-selected");
            }
        } else {
            $element.addClass('mettel-column-not-sortable');
        }
    }
};

ko.bindingHandlers.expandRow = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
            $element = $(element);

        if (value === true) {

            // don't select the row
            $element.keydown(function(e) {
                e.stopPropagation();
            });

            $element.on("click", function(event) {
                // don't select the row
                event.stopPropagation();

                var $button = $(this);
                var $parentRow = $button.parents('.mettel-grid-row');

                // close already-expanded row
                if ($parentRow.hasClass('mettel-state-expanded')) {
                    $parentRow.next().remove();

                    // remove hover handlers
                    $parentRow.off('mouseenter');
                    $parentRow.off('mouseleave');
                }
                // do all the stuff to expand
                else {
                    // viewModel related variables
                    var vmGrid = bindingContext.$parents[2];
                    var vmRow = bindingContext.$parents[1];
                    var numVisibleColumns = vmGrid.visibleColumns().length;
                    var strClassname = "";

                    if (bindingContext.$parents[2].selectedRows.indexOf(vmRow) !== -1) {
                        strClassname = " mettel-grid-row-selected";
                    }

                    // DOM related variables
                    var loaderTemplate = '<div class="mettel-loader"><div class="mettel-loader-inner"><div class="mettel-loading-indicator-container"><div class="mettel-loading-indicator"></div></div><p class="mettel-loading-message">Loading</p></div></div>',
                        strRow = '<tr class="mettel-grid-row mettel-expanded-grid-row' + strClassname + '"><td class="mettel-grid-cell" colspan="' + numVisibleColumns + '"><div class="mettel-expanded-grid-row-content">' + loaderTemplate + '</div></td></tr>';

                    // row insertion
                    $parentRow.after(strRow);

                    // add 'hover' handler here so that parent row gets hover class when expanded row is hovered
                    var $insertedRow = $parentRow.next('.mettel-expanded-grid-row');

                    $insertedRow.on('mouseenter', function() {
                        $parentRow.addClass('mettel-state-hover');
                    });

                    $insertedRow.on('mouseleave', function() {
                        $parentRow.removeClass('mettel-state-hover');
                    });

                    $parentRow.on('mouseenter', function() {
                        $insertedRow.addClass('mettel-state-hover');
                    });

                    $parentRow.on('mouseleave', function() {
                        $insertedRow.removeClass('mettel-state-hover');
                    });

                    var $placeholder = $parentRow.next().find('.mettel-expanded-grid-row-content');

                    if (vmGrid.expandRowEvent && $.isFunction(vmGrid.expandRowEvent)){
                        vmGrid.expandRowEvent($placeholder, vmRow.data());
                    }

                    if (typeof vmRow.getExpandableRowData === 'function' && vmGrid.endPoints.getExpandableRowData){
                        vmRow.getExpandableRowData($placeholder);
                    }
                }

                // twisty styling
                $parentRow.toggleClass('mettel-state-expanded');

            });
        }
    }
};

ko.bindingHandlers.postLoadFocusing = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.find('[data-mettel-class="load-more-button"], [data-mettel-class="load-all-button"]').on('click', function() {
                ko.postbox.subscribe( 'grid.completeEvent.' + viewModel.gridName(), function( newValue ) {
                    $element.prev( '.mettel-grid-body' ).find( 'tbody .mettel-grid-row' ).last().focus();
                });
        });
    }
};

ko.bindingHandlers.rowClass = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var row = valueAccessor(),
            $element = $(element);

        if ($element.hasClass('mettel-state-expanded')) {
            var expandedRow = $element.next('.mettel-expanded-grid-row');
            var $expandedRow = $(expandedRow);
            $expandedRow.toggleClass("mettel-grid-row-selected", bindingContext.$parent.selectedRows.indexOf(row) !== -1);
        }

        $element.toggleClass("mettel-grid-row-selected", bindingContext.$parent.selectedRows.indexOf(row) !== -1);

        // Row Grouping
        if (typeof row.groupIndex !== 'undefined' && typeof row.groupLength !== 'undefined') {
            if (row.groupIndex === 0) {
                $element.addClass('mettel-group-first-row');
            } else if (row.groupIndex + 1 === row.groupLength) {
                $element.addClass('mettel-group-last-row');
            }
        }
    }
};


ko.bindingHandlers.grid = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = $.extend({}, valueAccessor(), viewModel.gridOptions ? viewModel.gridOptions : {});

        // need to set this here, before the infiniteScrolling binding handler runs
        if (options.infiniteScrolling) {
            viewModel.infiniteScrolling(options.infiniteScrolling);
        }

        MetTel.Grid.Utils.initGrid(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);

        $(element).addClass("mettel-grid-simple");

        if (viewModel.supportsFrozenHeader()) {
            $(element).addClass("mettel-grid-frozen-header");
        }
        else if (viewModel.supportsFixedHeight()) {
            $(element).addClass("mettel-grid-fixed-height");
        }

        return { controlsDescendantBindings: true };
    }
};


ko.bindingHandlers.advancedGrid = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        // Inform the model that this is an advancedGrid
        viewModel.advancedGrid(true);

        $(element).addClass("mettel-grid-advanced");

        MetTel.Grid.Utils.initGrid(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        return { controlsDescendantBindings: true };
    }
};


ko.bindingHandlers.gridHeader = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        // Inform the model that this is an advancedGrid
        viewModel.advancedGrid(false);
        viewModel.showGrid(false);
        viewModel.showGridControls(true);

        $(element).addClass("mettel-grid-controls-only");

        MetTel.Grid.Utils.initGrid(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        return { controlsDescendantBindings: true };
    }
};



ko.bindingHandlers.header = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var header = ko.utils.unwrapObservable(valueAccessor());

        if (header === undefined) {
            // do nothing.
        }
        else if (ko.isObservable(header)) {
            // Add the default grid header template
            ko.applyBindingsToNode(element, { template: { name: 'grid-header', data: header() }}, bindingContext);
        }
        else if (_.isString(header)) {
            ko.applyBindingsToNode(element, { template: { name: 'grid-header', data: function() {return header;} }}, bindingContext);
        }
        else if (_.isObject(header)) {
            // Add the specified grid header template
            ko.applyBindingsToNode(element, { template: { name: header.template }}, bindingContext);
        }

        return { controlsDescendantBindings: true };
    }
};


ko.bindingHandlers.columnTemplate = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // Look at the grid parent to see if the column name has a custom template

        var customColumnTemplates = bindingContext.$parents[1].customColumnTemplates(),
            column = valueAccessor(),
            columnTemplate;

        // Add the internal column templates
        if (column.internal) {
            if (column.name === "_edit") {
                columnTemplate = "grid-column-edit-template";
            }
            if (column.name === "_delete") {
                columnTemplate = "grid-column-delete-template";
            }
            if (column.name === "_select") {
                columnTemplate = "grid-column-select-template";
            }
            if (column.name === "_expand") {
                columnTemplate = "grid-column-expand-template";
            }
            if (column.name === "_checkbox") {
                if (bindingContext.$parents[1].supportsMultiselect() === true) {
                    columnTemplate = "grid-column-checkbox-template";
                }
                else {
                    columnTemplate = "grid-column-radio-button-template";
                }
            }
            if (column.name === "_pivotMenu") {
                columnTemplate = "grid-column-pivot-menu-template";
            }
        }
        else if (customColumnTemplates) {
            // Rename the column name to be lower case to match the template name
            var columnName = column.name.toLowerCase();
            columnTemplate = customColumnTemplates[columnName];
        }

        // If the column isn't internal and isn't custom, see if there is a template that links to the formatter.
        if (columnTemplate === undefined) {
            // Some column types will have their own default column template.  Look at the column type.
            if ((column.formatter !== null) && (column.formatter !== undefined)) {
                switch (column.formatter.Type) {
                    case "CurrencyFormatter":
                        columnTemplate = "grid-column-currency-template";
                        break;

                    case "DateFormatter":
                        columnTemplate = "grid-column-date-template";
                        break;

                    case "PhoneFormatter":
                        columnTemplate = "grid-column-phone-template";
                        break;

                    case "DecimalFormatter":
                        columnTemplate = "grid-column-decimal-template";
                        break;

                    case "HTMLFormatter":
                        columnTemplate = "grid-column-html-template";
                        break;

                    default:
                        columnTemplate = "grid-column-default-template";
                }
            }
        }

        // Add the grid template
        ko.applyBindingsToNode(element, { template: { name: columnTemplate, data: bindingContext.$data, as: 'cell' } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};


ko.bindingHandlers.headerTemplate = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // NOTE: Mostly a copy of above columnTemplate
        var column = valueAccessor().column,
            fixedHeader = valueAccessor().fixedHeader;

        // Look at the grid parent to see if the column name has a custom template
        var customHeaderTemplates = bindingContext.$parent.customHeaderTemplates();

        var columnTemplate;
        if (customHeaderTemplates) {
            columnTemplate = customHeaderTemplates[column.name];
        }

        if (column.name === "_checkbox" && bindingContext.$parent.supportsMultiselect() === true) {
            // Some column types will have their own default column template.  Look at the column type.
            columnTemplate = fixedHeader ? 'grid-column-checkbox-all-fixed-template' : 'grid-column-checkbox-all-template';
        }

        if (columnTemplate === undefined) {
            columnTemplate = "grid-header-column-default-template";
        }

        // Add the grid template
        ko.applyBindingsToNode(element, { template: { name: columnTemplate, data: bindingContext.$data, as: 'cell' } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};


ko.bindingHandlers.toggleMenu = {
    update: function(element, valueAccessor) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        var value = valueAccessor(),
            $element = $(element),
            inactiveClass = 'mettel-inactive';

        $element.toggleClass(inactiveClass, ko.unwrap(value));
    }
};

ko.bindingHandlers.positionGroupBuilder = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // Whenever the value subsequently changes, slowly fade the element in or out
        var $element = $(element),
            position = $element.parents("[data-mettel-grid]").find('.mettel-group-selected').offset(),
            value = ko.utils.unwrapObservable(valueAccessor());

        if (value) {
            if (value.isNew()) {
                $element.css( 'right', 0).css('left', '');
            }
            else if (value && position) {
                $element.css( 'left', position.left).css('right', '');
            }
        }
    }
};


ko.bindingHandlers.calculateFixedHeaderWidth = {
    update: function(element, valueAccessor) {
        var $element = $(element),
            value = ko.utils.unwrapObservable(valueAccessor());

        if (value) {
            MetTel.Grid.Utils.manageGridFooter( $element.parents("[data-mettel-grid]") );
        }
    }
};

ko.bindingHandlers.modalWindow = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
            $element = $(element);

        if (value) {
            $element.modalWindow();

            // wire up close button to clear any unapplied custom searchRows
            var $closeButton = $element.find('.mettel-close-button');
            $closeButton.on('click', function() {
                // modal takes 400ms to close, so wait to remove the rows so its not visible to the user
                setTimeout(function(){
                    viewModel.searchRows.remove(function(searchRow) {
                        return searchRow.customFilter() === true && searchRow.applied() === false;
                    });

                    // 're-apply' any custom filters that were removed without applying the new search
                    _.each(viewModel.unappliedSearchRows(), function(searchRow) {
                        if (searchRow.customFilter() === "unapplied") {
                            searchRow.customFilter(true);
                        }
                    });
                }, 400);
            });
        }
    }
};


ko.bindingHandlers.formatPercentage = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        $(element).text(Number(value).toFixed(2) + "%");
    }
};

function formatDecimalOrCurrency(data) {
    var value = data.value;
    var formatOptions = data.column.formatter;
    var decimalPlaces = isNaN(formatOptions.DecimalPlaces = Math.abs(formatOptions.DecimalPlaces)) ? 2 : formatOptions.DecimalPlaces;
    var thousandsSeparator = formatOptions.ThousandsSeparator === undefined ? "," : formatOptions.ThousandsSeparator;
    var negativeIndicator = value < 0 ? "-" : "";
    var i = parseInt(value = Math.abs(+value || 0).toFixed(decimalPlaces), 10) + "";
    var thousandsPlace = (thousandsPlace = i.length) > 3 ? thousandsPlace % 3 : 0;
    var currencyPrefix = formatOptions.Prefix ? formatOptions.Prefix : "";
    var currencySuffix = formatOptions.Suffix ? formatOptions.Suffix : "";

    return negativeIndicator + currencyPrefix + (thousandsPlace ? i.substr(0, thousandsPlace) + thousandsSeparator : "") + i.substr(thousandsPlace).replace(/(\d{3})(?=\d)/g, "$1" + thousandsSeparator) + (decimalPlaces ? "." + Math.abs(value - i).toFixed(decimalPlaces).slice(2) : "") + currencySuffix;
}

ko.bindingHandlers.formatCurrency = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).text(formatDecimalOrCurrency(ko.utils.unwrapObservable(valueAccessor())));
    }
};

ko.bindingHandlers.formatDate = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var data = ko.utils.unwrapObservable(valueAccessor());
        var value = data.value;
        var formatOptions = data.column.formatter;
        var format = formatOptions.newformat;

        if (value) {
            var strDate = moment(value).format(format);
            $(element).text(strDate);
        }
    }
};

ko.bindingHandlers.formatHTML = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var data = ko.utils.unwrapObservable(valueAccessor());
        var value = data.value;

        $(element).html(value);
    }
};

ko.bindingHandlers.formatPhone = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var data = ko.utils.unwrapObservable(valueAccessor());
        var value = data.value;

        if (value !== "") {
            value = data.value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }
        $(element).text(value);
    }
};

ko.bindingHandlers.formatDecimal = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).text(formatDecimalOrCurrency(ko.utils.unwrapObservable(valueAccessor())));
    }
};

ko.bindingHandlers.headerCheckbox = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor(),
            $element = $(element),
            uniformOptions = {
                wrapperClass: 'mettel-checkbox',
                focusClass: 'mettel-checkbox-label-focused'
            },
            clickHandler = function(model, event) {
                $.uniform.update(element);

                var $vmGrid = bindingContext.$parents[1];

                if ($element.prop('checked')) {
                    _.each($vmGrid.rows(), function(row) {
                        if (row.selected() === false) {
                            if ((row.disableRow && !row.disableRow()) || !row.disableRow) {
                                row.selected(true);
                            }
                        }
                    });
                }
                else {
                    $vmGrid.clearSelectedRows();
                }

                $.uniform.update();

                return true;
            };

        if (value && value["class"]) {
            uniformOptions.wrapperClass = value["class"];
        }

        $element.uniform(uniformOptions);

        ko.applyBindingsToNode(element, { click: clickHandler, clickBubble: false}, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.updateCheckbox = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var vmGrid = bindingContext.$parent,
            flgCheckboxes = vmGrid.checkboxesToSelect(),
            $element = $(element),
            value = ko.utils.unwrapObservable(valueAccessor());

        if (flgCheckboxes === true) {
            var domCheckbox = $element.find('.mettel-grid-select-row-checkbox');
            $.uniform.update(domCheckbox);
        }
    }
};

ko.bindingHandlers.checkboxToSelect = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            value = valueAccessor(),
            uniformOptions = {
                wrapperClass: 'mettel-checkbox',
                focusClass: 'mettel-checkbox-label-focused'
            };

        if (value && value["class"]) {
            uniformOptions.wrapperClass = value["class"];
        }

        $element.uniform(uniformOptions);
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $grid = $element.parents('.mettel-grid'),
            $checkbox = $grid.find('.mettel-grid-select-row-checkbox-all');

        if (viewModel.row.selected()) {
            $element.attr("checked", "checked");
        } else {
            $element.removeAttr("checked");
        }

        // handling 'select all' checkbox
        var $vmGrid = bindingContext.$parents[2];

        if ($vmGrid.selectedRows().length === ($vmGrid.disableRowProperty() ? $vmGrid.enabledRows().length : $vmGrid.rows().length)) {  // this.disableRowProperty() // should be enabled .enabledRows().length
            $checkbox.prop('checked', true);
            $.uniform.update($checkbox[0]);
        }
        else {
            $checkbox.prop('checked', false);
            $.uniform.update($checkbox[0]);
        }

    }
};

ko.bindingHandlers.addToggleFilterClass = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // if the toggle filter has an icon
        if (viewModel.icon !== undefined) {
            var $element = $(element),
                $label = $($element.children('span')[0]);

            // add the icon's class
            $element.addClass(viewModel.icon);

            // hide the label
            $label.addClass('mettel-accessible-text');
        }
    }
};

ko.bindingHandlers.sparklineChart = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            options = valueAccessor(),
            valueMin = Math.min.apply(Math, options.array),
            valueMax = Math.max.apply(Math, options.array),
            difference = valueMax - valueMin,
            chartConfig = {
                transitions: false,
                series: [
                    {
                        width: options.sparklineBorder,
                        color: options.sparklineColor,
                        data: options.array,
                        markers: {
                            visible: true,
                            background: options.sparklineDotColor,
                            size: options.sparklineDotSize,
                            border: {
                                color: options.sparklineDotColor
                            }
                        }
                    }
                ],
                tooltip: {
                    visible: false
                },
                categoryAxis: {
                    crosshair: {
                        visible: false
                    },
                    line: {
                        visible: false
                    }
                },
                valueAxis: {
                    color: 'red',
                    line: {
                        visible: false
                    }
                },
                chartArea: {
                    height: 40,
                    margin: 0,
                    width: 130,
                    background: 'transparent'
                },
                plotArea: {
                    margin: 0
                }
            };

        // For graphs with all values equal, apply a min and max to the graph so it centers vertically
        if (difference === 0) {
            chartConfig.valueAxis.min = valueMin - 1;
            chartConfig.valueAxis.max = valueMax + 1;
        }

        $element.addClass('mettel-grid-cell-sparkline');

        $element.kendoSparkline(chartConfig);

    }
};

// if showLoader is true, this will run only initially since grid height is not set yet
ko.bindingHandlers.loaderHeight = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        if (!viewModel.initialized()) {
            var $element = $(element),
                $grid = $element.parent();

            // the grid content will not have loaded yet so the height needs to be manually set
            $grid.css('height', '100%');

            // if the grid controls are on, start the overlay lower
            if (viewModel.showGridControls() === true) {
                var $gridControls = $element.siblings('.mettel-grid-controls'),
                    numGridControlsHeight = $gridControls.outerHeight(),
                    $optionsBar = $element.siblings('.mettel-grid-filter-options-bar'),
                    numOptionsBarHeight = $optionsBar.outerHeight(),
                    $narrowBar = $element.siblings('.mettel-grid-filter-narrow-bar'),
                    numNarrowBarHeight = $narrowBar.outerHeight();

                $element.css('top', numGridControlsHeight + 'px');

                // check filter bar states
                if ($optionsBar.length > 0) {
                    $element.css('top', (numOptionsBarHeight + numGridControlsHeight) + 'px');
                }
                if ($narrowBar.length > 0) {
                    $element.css('top', (numNarrowBarHeight + numGridControlsHeight) + 'px');
                }
            }

            // once content as loaded, we can "un-set" the height
            viewModel.initialized.subscribe(function (value) {
                if (value === true) {
                    $grid.css('height', '');
                }
            });
        }
    }
};

ko.bindingHandlers.scoreBar = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $scoreBar = $element.children('[data-mettel-class="grid-cell-score-bar"]'),
            options = valueAccessor(),
            score = options.score,
            lineColor = options.lineColor,
            lineThickness = options.lineThickness ? options.lineThickness : 6,
            positionValue = (1 - score) * 100 / 2;

        $element.css('height', lineThickness + 'px');

        $scoreBar.css({
            'background-color': lineColor,
            'height': lineThickness + 'px',
            'left': positionValue + '%',
            'right': positionValue + '%'
        });

    }
};

// If you want to create a checkbox within a cell and not bind the cell to a value using knockout, you have to have the event
// click event return true.  Also, since the element is within a cell, it is not typical that you'd want the checkbox to
// "select" the row so we added an event.stopPropagation call as well.  Finally we made the checkbox use uniform and make it
// cleaner in the markup binding to implement.
ko.bindingHandlers.checkboxWithinCell = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor(),
            uniformOptions = {
                wrapperClass: 'mettel-checkbox-alt',
                focusClass: 'mettel-checkbox-label-focused'
            },
            clickHandler = function(model, event) {
                event.stopPropagation();
                $.uniform.update(element);

                return true;
            };


        // Note:  We are using "class" instead of .class due to the fact that IE considers class a keyword.
        if (value && value["class"]) {
            uniformOptions.wrapperClass = value["class"];
        }

        // Initialize the uniform component.
        $(element).uniform(uniformOptions);


        ko.applyBindingsToNode(element, { click: clickHandler, clickBubble: false}, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

// Calculates and sets height for dummy rows in grids with grouped rows
ko.bindingHandlers.dummyRowHeight = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $cell =$(element),
            vmGrid = bindingContext.$parents[1];

        if (vmGrid.dummyRowHeight() === 0) {
            vmGrid.dummyRowHeight($cell.parent().prev().outerHeight());
        }

        $cell.css("height", vmGrid.dummyRowHeight() + "px");
    }
};

// Creates headers attribute with all th cell ids, and correct colspan for refresh td
ko.bindingHandlers.gridRefreshCellAttributes = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $cell = $(element),
            grid = viewModel,
            columns = grid.visibleColumns(),
            suffix = '-' + ko.unwrap(grid.gridName);

        var headers = '';

        if (columns.length) {
            $.each(columns, function(i, column) {
                if (i === 0) {
                    headers += column.name + suffix;
                } else {
                    headers += (' ' + column.name + suffix);
                }
            });

            $cell.attr({
                'headers': headers,
                'colspan': columns.length
            });
        }
    }
};