/*global BaseCatalogModel, BaseProductModel, CategoryModel, SubcategoryModel, asyncComputed */
// Admin Catalog
var hashHistorySaved = false;
var hashHistory = [window.location.hash];
var productCatalogViewModel = false;

function FederatedSkusGridModel(data) {
    GridModel.call(this, data);
}


function OptionGroupOptionsGridModel(data) {
    // Extend the grid model
    GridModel.call(this, data);
}

function ProductModel (options) {
    var product = this;

    BaseProductModel.call(this, options);

    // New Sellers
    this.newSellers = ko.observableArray([]);

    this.hasNewSeller = function (sellerName) {
        return product.newSellers.indexOf(sellerName) > -1;
    };

    this.pricingTabInitialized = ko.observable(false);
    this.pricingDataLoaded = ko.observable(false);
    this.productPreviewInitialized = ko.observable(false);

    this.optionGroupNeedsConfirm = ko.observable(false);

    this.addThumbnail = function (thumbnailReference, fileName) {

        // Create the new thumbnail object with appropriate observables
        var newThumbnail = {
            id: ko.observable(0),
            sortOrder: ko.observable(product.thumbnails().length),
            fileName: ko.observable(fileName),
            itemState: ko.observable('CREATE'),
            fileDataUrl: ko.observable(thumbnailReference),
            mediumURL: ko.observable(thumbnailReference),
            smallURL: ko.observable(thumbnailReference),
            selected: ko.observable()
        };

        // Collect the selected observable
        product.thumbnailSelectedObservables.push(newThumbnail.selected);

        // Include it in the array
        product.thumbnails.push(newThumbnail);

        // Select it
        product.selectThumbnail(newThumbnail);
    };

    this.addThumbnailAsURI = function (thumbnailReference, sku) {
        // Create the new thumbnail object with appropriate observables
        var newThumbnail = {
            id: ko.observable(0),
            sortOrder: ko.observable(product.thumbnails().length),
            fileName: ko.observable(),
            itemState: ko.observable('CREATE'),
            fileDataUrl: ko.observable(),
            mediumURL: ko.observable(),
            smallURL: ko.observable(),
            selected: ko.observable(),
            sku: ko.observable(sku)
        };

        var postData = { fileUrl: encodeURI(thumbnailReference) };

        $.ajax({
            type: "POST",
            url: productCatalogViewModel.endPoints.imageToData,
            data: JSON.stringify(postData),
            contentType: 'application/json',
            success: function (objData) {
                if (objData && objData.isSuccessful) {
                    if (objData.fileUrl) {
                        newThumbnail.fileName(objData.fileUrl.substring(objData.fileUrl.lastIndexOf('/')+1));
                        newThumbnail.mediumURL(objData.fileUrl);
                        newThumbnail.smallURL(objData.fileUrl);
                    }
                    if (objData.dataUrl) {
                        newThumbnail.fileDataUrl(objData.dataUrl);
                    }
                }
            },
            dataType: 'json'
        })
        .fail(function (data, textStatus, xhr) {
            // Set error observables, which will fire error modal
            productCatalogViewModel.errorTitle("Image Convert Error");
            productCatalogViewModel.errorMessage(textStatus);
        });

        // Collect the selected observable
        product.thumbnailSelectedObservables.push(newThumbnail.selected);

        // Include it in the array
        product.thumbnails.push(newThumbnail);

        // Select it
        product.selectThumbnail(newThumbnail);
    };

    this.moveThumbnailPrimaryPosition = function (thumbnail) {
        // Remove the thumbnail from its position and put it first
        product.thumbnails.unshift(product.thumbnails.remove(thumbnail)[0]);
    };

    this.removeThumbnail = function (thumbnail) {

        // If there are multiple thumbnails
        if (product.thumbnails().length > 1) {
            var indexOfRemovingThumbnail = thumbnail.sortOrder(),
                indexToSelect;

            // Find the previous or next thumbnail
            if (indexOfRemovingThumbnail > 0) {
                indexToSelect = indexOfRemovingThumbnail - 1;
            } else {
                indexToSelect = indexOfRemovingThumbnail + 1;
            }

            // And select it
            product.selectThumbnail(product.thumbnails.slice(indexToSelect, indexToSelect + 1)[0]);

        } else {
            // The thumbnail that's about to be removed is the only thumbnail,
            // so nullify selectedThumbnail
            product.selectedThumbnail(null);
        }

        if (thumbnail.itemState() === 'CREATE') {
            // If it's just been created, we can completely get rid of it, since it hasn't been save yet
            product.thumbnails.remove(thumbnail);
        } else {
            // If it had been saved before, mark its item state, and move it to the end of the array
            thumbnail.itemState('DELETE');
            product.thumbnails.push(product.thumbnails.remove(thumbnail)[0]);
        }
    };

    // Attributes

    this.addAttribute = function () {
        this.attributes.push({
            id: ko.observable(0),
            attId: ko.observable(''),
            itemState: ko.observable('CREATE'),
            name: ko.observable('')
        });
    };

    this.removeAttribute = function (attribute) {
        if (attribute.itemState() === 'CREATE') {
            // If it's just been created, we can completely get rid of it, since it hasn't been save yet
            product.attributes.remove(attribute);
        } else {
            // If it had been saved before, mark its item state, and move it to the end of the array
            attribute.itemState('DELETE');
            product.attributes.push(product.attributes.remove(attribute)[0]);
        }
    };

    // Availability

    this.currentAvailabilityObject = ko.observable();
    this.currentAvailabilityObjectType = ko.observable();
    this.currentAvailabilityObjectIndex = ko.observable();
    this.currentAvailabilityObjectInvalidItems = ko.observableArray();

    this.availabilityTypes = ko.observableArray();

    this.setCurrentAvailabilityObjectType = function(availabilityObjectType, index) {

        if (availabilityObjectType === 'new') {
            product.currentAvailabilityObjectType(availabilityObjectType);

            product.currentAvailabilityObject({
                typeId: ko.observable(),
                items: ko.observableArray(),
                itemsText: ko.observable(),
                itemState: ko.observable("CREATE"),
                productId: ko.observable(product.id)
            });
        }
        else {
            product.currentAvailabilityObjectType('edit');
            product.currentAvailabilityObjectIndex(index);

            product.currentAvailabilityObject({
                typeId: ko.observable(availabilityObjectType.typeId()),
                items: ko.observableArray(availabilityObjectType.items()),
                itemsText: ko.observable(),
                itemState: ko.observable(availabilityObjectType.itemState()),
                productId: ko.observable(product.id)
            });
        }

        var currentAvailabilityObject = product.currentAvailabilityObject();

        product.currentAvailabilityObject().typeName = ko.computed(function() {
            var availabilityOption = _.find(product.availabilityTypes(), function(availabilityType) {
                return availabilityType.id === currentAvailabilityObject.typeId();
            });

            if (availabilityOption) {
                return availabilityOption.name;
            }
            else {
                return undefined;
            }
        });

    };

    // SKUs

    this.newSKUName = ko.observable();

    // Checkes to see if new sku name matches any of the existing ones for the product
    this.disableNewSKUName = ko.computed(function () {
        if (product.newSKUName() && product.newSKUName().trim()) {
            return _.contains(product.existingSKUNames(), product.newSKUName().toLowerCase().trim());
        } else {
            return true;
        }
    });

    this.newSKUAttributeAttrId = ko.observable();
    this.newSKUAttributeKey = ko.observable();
    this.newSKUAttributeValue = ko.observable();

    this.editSKUAttributeAttrId = ko.observable();
    this.editSKUAttributeKey = ko.observable();
    this.editSKUAttributeValue = ko.observable();
    this.editSKUAttributeKeyNeedsConfirm = ko.observable(false);

    this.federatedSkusGridInitialized = ko.observable(false);

    this.instantiateFederatedSkusGrid = function () {

        // If the grid hasn't been set up yet, set it up
        if (!product.federatedSkusGridInitialized()) {

            product.federatedSkusGrid = new FederatedSkusGridModel();

            product.federatedSkusGrid.rows.subscribe(function (newRows) {
                if (newRows.length && product.existingSKUNames().length) {
                    $.each(newRows, function (i, row) {
                        $.each(product.existingSKUNames(), function (j, existingSKU) {
                            if (MetTel.Utils.stricmp(row.data().SKU, existingSKU)) {
                                row.disableRow(true);
                                return false;
                            }
                        });
                    });
                }
            });

            // This will load in the data to set up the grid initially (columns, etc) without rows
            // and prevent an ajax call since we already have that data
            product.federatedSkusGrid.storedGridData(product.federatedSkusInitialData);
        } else {
            product.federatedSkusGrid.rowsUnfiltered.removeAll();
            product.federatedSkusGrid.recalculateHeight();
        }

        product.federatedSkusGridInitialized(true);
    };

    this.resetFederatedSkusGrid = function () {
        productCatalogViewModel.federatedSKUSearch('');
        product.federatedSkusGrid.clearSelectedRows();
        product.federatedSkusGrid.gridParametersModel.addQueryParams({'search': productCatalogViewModel.federatedSKUSearch()});
        product.federatedSkusGrid.storedGridData(product.federatedSkusInitialData); // Load initial stored data with zero rows
    };

    // Enable adding federated skus if the grid has been setup and rows have been selected
    this.enableAddFederatedSKUs = ko.computed(function () {
        if (product.federatedSkusGridInitialized()) {
            return product.federatedSkusGrid.selectedRows().length;
        } else {
            return false;
        }
    });

    // Option Groups
    this.newOptionGroupTitle = ko.observable();
    this.newOptionGroupType = ko.observable('multiple choice');
    this.newOptionGroupTypeId = ko.observable(1);
    this.newOptionGroupTypeId.subscribe(function (newValue) {
        product.newOptionGroupType(product.returnOptionGroupTypeFromId(newValue));
    });
    this.newOptionGroupRequired = ko.observable(false);
    this.newOptionGroupHidden = ko.observable(false);
    this.newOptionGroupMiniCatalog = ko.observable(false);
    this.newOptionGroupShowInSubProducts = ko.observable(false);
    this.newOptionGroupCategory = ko.observable();
    this.newOptionGroupSubcategory = ko.observable();
    this.newOptionGroupQuantityType = ko.observable();
    this.newOptionGroupState = ko.observable('CREATE');

    this.newOptionGroupQuantityDisable = ko.computed(function () {
        if (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4 || product.newOptionGroupState() !== 'CREATE') {
            return true;
        } else if (product.newOptionGroupShowInSubProducts()) {
            product.newOptionGroupQuantityType(product.optionQuantityTypes()[0]);
            return true;
        }
        else {
            return false;
        }
    });

    this.newOptionGroupQuantityDisable.extend({ notify: 'always' });

    this.newOptionGroupQuantityDisable.subscribe(function(newValue) {
        if (newValue && (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4)) {
            product.newOptionGroupQuantityType(null);
        }
    });

    this.newOptionGroupRequiredDisable = ko.computed(function () {
        if (product.newOptionGroupTypeId() === 4 || product.newOptionGroupHidden()) {
            product.newOptionGroupRequired(false);
            return true;
        } else {
            return false;
        }
    });

    this.newOptionGroupHiddenDisable = ko.computed(function () {
        if (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4 || product.newOptionGroupRequired() || product.newOptionGroupMiniCatalog() || product.newOptionGroupShowInSubProducts()) {
            product.newOptionGroupHidden(false);
            return true;
        } else {
            return false;
        }
    });

    this.newOptionGroupMiniCatalogDisable = ko.computed(function () {
        if (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4 || product.newOptionGroupHidden()) {
            product.newOptionGroupMiniCatalog(false);
            return true;
        } else {
            return false;
        }
    });

    this.newOptionGroupSubProductsDisable = ko.computed(function () {
        if (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4 || product.newOptionGroupHidden() || (product.newOptionGroupQuantityType() && product.newOptionGroupQuantityType().id !== 1)) {
            product.newOptionGroupShowInSubProducts(false);
            return true;
        } else {
            return false;
        }
    });

    // enabling/disabling the 'save' button for option groups
    this.newOptionGroupValid = ko.computed(function() {
        var flgStatus = false;

        if (product.newOptionGroupTitle()) {
            if (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4) {
                return true;
            }
            else {
                if (product.newOptionGroupCategory() && product.newOptionGroupSubcategory() && product.newOptionGroupQuantityType()) {
                    return true;
                }
            }
        }

        return flgStatus;
    });

    // Disable the dropdowns if the option group is not mult choice / checkbox OR if it has been saved already
    this.newOptionGroupCategoryDisable = ko.computed(function () {
        return (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4 || product.newOptionGroupState() !== 'CREATE');
    });
    this.newOptionGroupSubcategoryDisable = ko.computed(function () {
        return (product.newOptionGroupTypeId() === 3 || product.newOptionGroupTypeId() === 4 || product.newOptionGroupState() !== 'CREATE' || !product.newOptionGroupCategory());
    });

    // if we are disabling the category dropdowns, reset them too
    this.newOptionGroupCategoryDisable.subscribe(function (newValue) {
        if (newValue === true) {
            product.newOptionGroupCategory(null);
            product.newOptionGroupSubcategory(null);
        }
    });

    // For the selected category of the new option group
    // returns all of its subcategories except the current parent subcategory of the product
    this.newOptionGroupSubcategoryOptions = ko.computed(function () {
        if (product.newOptionGroupCategory() && product.newOptionGroupCategory().subcategories()) {
            return _.filter(product.newOptionGroupCategory().subcategories(), function (subcategory) {
                return subcategory.id !== product.parentSubcategoryId();
            });
        }
        else {
            return [];
        }
    });

    this.populateEditableOptions = function (optionGroup) {
        var selectedCategory,
            selectedSubcategory,
            selectedQuantityType;

        if (optionGroup.optionGroupTypeId() === 1 || optionGroup.optionGroupTypeId() === 2) {
            // Find the category and subcategory models that match the selected IDs
            $.each(productCatalogViewModel.categories(), function (i, categoryModel) {
                if (optionGroup.categoryId() === categoryModel.id) {
                    selectedCategory = categoryModel;
                }
            });
            $.each(selectedCategory.subcategories(), function (i, subcategoryModel) {
                if (optionGroup.subcategoryId() === subcategoryModel.id) {
                    selectedSubcategory = subcategoryModel;
                    optionGroup.previouslySelectedSubcategory = subcategoryModel;
                }
            });

            selectedQuantityType = _.find(productCatalogViewModel.activeProduct().optionQuantityTypes(), function(quantityType) {
                return quantityType.id === optionGroup.quantityTypeId();
            });
            optionGroup.previouslySelectedQuantityType = selectedQuantityType;

            // Store item state for newOptionGroupCategoryDisable
            product.newOptionGroupState(optionGroup.itemState());
        }

        product.newOptionGroupTitle(optionGroup.title());
        product.newOptionGroupTypeId(optionGroup.optionGroupTypeId());
        product.newOptionGroupRequired(optionGroup.required ? optionGroup.required() : false);
        product.newOptionGroupHidden(optionGroup.hidden ? optionGroup.hidden() : false);
        product.newOptionGroupMiniCatalog(optionGroup.miniCatalog ? optionGroup.miniCatalog() : false);
        product.newOptionGroupShowInSubProducts(optionGroup.showInSubProducts ? optionGroup.showInSubProducts() : false);
        product.newOptionGroupCategory(selectedCategory);
        product.newOptionGroupSubcategory(selectedSubcategory);
        product.newOptionGroupQuantityType(selectedQuantityType);
    };

    this.editOptionGroup = function (optionGroup) {

        // Update the option group
        optionGroup.title(product.newOptionGroupTitle());
        optionGroup.optionGroupType(product.newOptionGroupType());
        optionGroup.optionGroupTypeId(product.newOptionGroupTypeId());

        if (optionGroup.optionGroupTypeId() === 1 || optionGroup.optionGroupTypeId() === 2) {
            optionGroup.hidden(product.newOptionGroupHidden());
            optionGroup.showInSubProducts(product.newOptionGroupShowInSubProducts());

            // If the selected subcategory has changed, reset all category info
            if (optionGroup.previouslySelectedSubcategory.id !== product.newOptionGroupSubcategory().id) {
                optionGroup.categoryId(product.newOptionGroupCategory().id);
                optionGroup.categoryName(product.newOptionGroupCategory().name);
                optionGroup.subcategoryId(product.newOptionGroupSubcategory().id);
                optionGroup.subcategoryName(product.newOptionGroupSubcategory().name());
                // And delete all the products from the previous subcategory
                if (optionGroup.products().length) {
                    optionGroup.products([]);
                }
            }

            // If the quantity type changes, update it
            if (optionGroup.previouslySelectedQuantityType.id !== product.newOptionGroupQuantityType().id) {
                optionGroup.quantityTypeId(product.newOptionGroupQuantityType().id);
                optionGroup.quantityTypeName(product.newOptionGroupQuantityType().name);
            }
        }

        if (optionGroup.optionGroupTypeId() !== 3 && optionGroup.optionGroupTypeId() !== 4) {
            optionGroup.miniCatalog(product.newOptionGroupMiniCatalog());
        }

        if (optionGroup.optionGroupTypeId() !== 4) {
            optionGroup.required(product.newOptionGroupRequired());
        }

        // Update its item state, unless its item state is create
        if (optionGroup.itemState() !== 'CREATE') {
            optionGroup.itemState('UPDATE');
        }
    };

    // Reset the fields in the form
    this.resetNewOptionGroup = function () {
        product.newOptionGroupTitle(null);
        product.newOptionGroupTypeId(1);
        product.newOptionGroupRequired(false);
        product.newOptionGroupHidden(false);
        product.newOptionGroupMiniCatalog(false);
        product.newOptionGroupShowInSubProducts(false);
        product.newOptionGroupCategory(null);
        product.newOptionGroupSubcategory(null);
        product.newOptionGroupQuantityType(null);
        product.newOptionGroupState('CREATE');
    };

    this.addNewOptionGroup = function () {

        // Create the new option group object
        var newOptionGroup = {
            id: ko.observable(0),
            title: ko.observable(product.newOptionGroupTitle()),
            optionGroupType: ko.observable(product.newOptionGroupType()),
            optionGroupTypeId: ko.observable(product.newOptionGroupTypeId()),
            itemState: ko.observable('CREATE'),
            sortOrder: ko.observable(product.viewableCustomOptions().length),
            custom: true
        };

        if (!product.newOptionGroupCategoryDisable()) {
            newOptionGroup.categoryId = ko.observable(product.newOptionGroupCategory().id);
            newOptionGroup.categoryName = ko.observable(product.newOptionGroupCategory().name);
            newOptionGroup.subcategoryId = ko.observable(product.newOptionGroupSubcategory().id);
            newOptionGroup.subcategoryName = ko.observable(product.newOptionGroupSubcategory().name());
            newOptionGroup.quantityTypeId = ko.observable(product.newOptionGroupQuantityType().id);
            newOptionGroup.quantityTypeName = ko.observable(product.newOptionGroupQuantityType().name);
            newOptionGroup.products = ko.observableArray([]);
            newOptionGroup.rows = ko.computed(function () {
                return _.filter(newOptionGroup.products(), function (row) {
                    return row.itemState() !== 'DELETE';
                });
            });

            newOptionGroup.updatePricingGroups = function (removedOptions, optionGroup) {
                var existingOption = removedOptions[0];
                var customOptionName = false;

                if (typeof ko.utils.unwrapObservable(optionGroup.title) !== "undefined") {
                    customOptionName = ko.utils.unwrapObservable(optionGroup.title);
                }

                if (customOptionName) {
                    $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                        if (!seller) {
                            return;
                        }
                        if (seller.itemState() === 'DELETE') {
                            return;
                        }
                        $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ipg, pricingGroup) {
                            if (!pricingGroup) {
                                return;
                            }
                            if (pricingGroup.itemState() === 'DELETE') {
                                return;
                            }
                            $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                if (!option) {
                                    return;
                                }
                                if (typeof option.itemState === "undefined") {
                                    return;
                                }
                                if (option.itemState() === 'DELETE') {
                                    return;
                                }
                                if (ko.utils.unwrapObservable(option.type) === 'OPTIONS' && MetTel.Utils.stricmp(customOptionName, option.name)) {

                                    var newArrayWithoutDeleted = [];

                                    $.each(ko.utils.unwrapObservable(option.selectedValues), function (isv, selectedValue) {
                                        if (!selectedValue) {
                                            return;
                                        }
                                        // preserve selected values excluding the deleted one
                                        if (ko.utils.unwrapObservable(existingOption.refProductId) !== ko.utils.unwrapObservable(selectedValue.value)) {
                                            newArrayWithoutDeleted.push(selectedValue);
                                        }
                                        // if the deleted option was selected, mark the pricing group
                                        else {
                                            pricingGroup.externallyModified(true);
                                        }
                                    });

                                    // update the selected values
                                    option.selectedValues(newArrayWithoutDeleted);

                                    // if there are no more selected values
                                    if (!newArrayWithoutDeleted.length) {
                                        // mark any pre-existing options to be deleted
                                        if (option.itemState() !== 'CREATE') {
                                            option.itemState('DELETE');
                                        }
                                        // remove any new options
                                        else {
                                            // for pre-existing pricing groups
                                            if (MetTel.Utils.isObservableArray(pricingGroup.options)) {
                                                pricingGroup.options.remove(option);
                                            }
                                            // for unsaved pricing groups
                                            else {
                                                pricingGroup.options(_.without(pricingGroup.options(), option));
                                            }
                                        }
                                        pricingGroup.externallyModified(true);
                                    }
                                }
                            });
                        });
                    });
                } else {
                    console.log('Could not find matching custom option for refProductId: ' + ko.utils.unwrapObservable(existingOption.refProductId));
                }
            };

            // Delete options functionality
            newOptionGroup.deleteOption = function (option) {
                newOptionGroup.products.remove(option);
            };

            // Update the options in the option group based on the selected options from the grid
            newOptionGroup.updateOptions = function (selectedRows) {

                if (!selectedRows) { return false; }

                // First capture all existing options that are not selected

                var noLongerSelected = [];

                $.each(newOptionGroup.products(), function (i, existingOption) {

                    var doesNotMatch = true;

                    // Compare it to the newly selected rows
                    $.each(selectedRows, function (j, selectedOption) {

                        if (existingOption.refProductId() === selectedOption.data().ProductID) {

                            // If it does match one of the newly selected rows,
                            // mark it to not be removed
                            doesNotMatch = false;
                            return false;
                        }
                    });

                    // If it's not selected,
                    // and if it's not newly created
                    if (doesNotMatch) {
                        noLongerSelected.push(existingOption);
                    }
                });

                // Build new objects from the selected options
                newOptionGroup.updatePricingGroups(noLongerSelected, newOptionGroup);

                // Build new objects from the selected options

                var newOptions = [];

                $.each(selectedRows, function (i, selectedOption) {

                    var newOption = {
                            id: ko.observable(0),
                            refProductId: ko.observable(selectedOption.data().ProductID),
                            optionGroupId: ko.observable(newOptionGroup.id()),
                            name: ko.observable(selectedOption.data().Name),
                            type: ko.observable(selectedOption.data().Type),
                            sortOrder: ko.observable(),
                            itemState: ko.observable('CREATE')
                        };

                    // Add the option to the array
                    newOptions.push(newOption);
                });

                // Overwrite all existing products with the new ones
                newOptionGroup.products(newOptions);
            };
        }

        newOptionGroup.required = ko.observable(product.newOptionGroupRequired());
        newOptionGroup.hidden = ko.observable(product.newOptionGroupHidden());
        newOptionGroup.miniCatalog = ko.observable(product.newOptionGroupMiniCatalog());

        if (product.newOptionGroupTypeId() === 1 || product.newOptionGroupTypeId() === 2) {
            newOptionGroup.showInSubProducts = ko.observable(product.newOptionGroupShowInSubProducts());
        }

        if (product.newOptionGroupTypeId() === 3) {
            newOptionGroup.rowsText = ko.observable(3);
            newOptionGroup.maximumCharacters = ko.observable(500);
        }

        if (product.newOptionGroupTypeId() === 4) {
            newOptionGroup.text = ko.observable('');
        }

        // Send it to the array
        product.customOptions.push(newOptionGroup);
    };

    this.optionsGridInitialized = ko.observable(false);

    this.instantiateOptionsGrid = function (optionGroup) {

        // If the grid hasn't been set up yet, set it up
        if (!product.optionsGridInitialized()) {

            product.optionsGrid = new OptionGroupOptionsGridModel();

            // don't want rows able to be checked until all have been loaded
            var objPendingRequest = product.optionsGrid.pendingRequest.subscribe(function(newValue) {
                if (newValue === false) {
                    product.optionsGrid.pendingRequest(true);
                }
            });

            product.optionsGrid.completeEvent = function() {
                // Select the rows that were options already before the modal was opened
                if (product.optionsGrid.rows().length) {
                    $.each(optionGroup.rows(), function (i, option) {
                        $.each(product.optionsGrid.rows(), function (j, rowModel) {
                            if (option.refProductId() === rowModel.data().ProductID) {
                                rowModel.selected(true);
                            }
                        });
                    });
                }
                objPendingRequest.dispose();
                product.optionsGrid.pendingRequest(false);
            };
        }

        product.optionsGrid.gridParametersModel.addQueryParams({subcategoryId: optionGroup.subcategoryId()});

        product.optionsGridInitialized(true);
    };

    this.clearOptionsGrid = function () {

        // Clear existing rows in the grid
        product.optionsGrid.rowsUnfiltered.removeAll();

        // Clear existing filters in the grid
        product.optionsGrid.clearFilters();
        product.optionsGrid.dropdownFilters.removeAll();

        // Clear observables related to sorting by column
        product.optionsGrid.clearSelectedColumn();

        // Clear the checkboxes for the rows
        product.optionsGrid.clearSelectedRows();

        product.optionsGridInitialized(false);
    };


    /**
     * Return an array of errors (missing SKU values) for a particular
     * SKU name. Used for display purposes.
     *
     * @param {String} skuName
     * @return {Array}
     */
    this.SKUErrorsForSKU = function (skuName) {
        // First get all of the checked items.
        var skus = product.skus(),
            checkedItems = [],
            errors = [];

        $.each(skus, function (i, sku) {
            if (sku.itemState() === "DELETE") {
                return;
            }
            var attributes = sku.attributes();

            $.each(attributes, function (i, attribute) {
                if (attribute.selected()) {
                    checkedItems.push(attribute.key());
                }
            });
        });

        checkedItems = _.uniq(checkedItems);

        // Now report the errors for the requested SKU.
        $.each(skus, function (i, sku) {
            if (sku.itemState() === "DELETE") {
                return;
            }
            if (sku.sku() === skuName) {
                $.each(checkedItems, function (i, checkedItem) {
                    var attributes = sku.attributes(),
                        checkedItemOK = false;

                    $.each(attributes, function (i, attribute) {
                        if ((MetTel.Utils.stricmp(attribute.key(), checkedItem)) && attribute.selected()) {
                            checkedItemOK = true;
                        }
                    });

                    if (!checkedItemOK) {
                        errors.push(checkedItem);
                    }
                });
            }
        });

        return errors;
    };

    /**
     * Synchronize checkboxes across all SKUs for the
     * current product.
     *
     * @param {Object} sku (the current SKU)
     * @return void
     */
    this.UpdateCheckboxes = function (sku) {
        $.each(sku.attributes(), function (i, attr) {
            $.each(product.skus(), function (i, pSku) {
                if (pSku.itemState() === "DELETE") {
                    return;
                }
                if (pSku.sku() !== sku.sku()) {
                    $.each(pSku.attributes(), function (i, pAttr) {
                        if (MetTel.Utils.stricmp(pAttr.key, attr.key)) {
                            pAttr.selected(attr.selected());
                        }
                    });
                }
            });
        });
    };


    /**
     * Used when a SKU attribute is deleted. Uncheck all the
     * associated checkboxes so the product is not in error.
     *
     * @param {Attribute} attr
     * @return null
     */
    this.UncheckCheckboxes = function (attr) {
        $.each(product.skus(), function (i, pSku) {
            if (pSku.itemState() === "DELETE") {
                return;
            }
            $.each(pSku.attributes(), function (i, pAttr) {
                if (MetTel.Utils.stricmp(pAttr.key, attr.key)) {
                    pAttr.selected(false);
                }
            });
        });
    };


    this.oldCheckboxObservableAttr = ko.observable();
    this.oldCheckboxObservable = ko.observable('');
    this.oldCheckboxValue = false;


    /**
     * Verifies there's only one SKU and no custom options.
     *
     * @return {Boolean}
     */
    this.updateSingleSku = ko.observable(0);
    this.singleSku = ko.computed(function () {
        var skuCount = 0,
            customOptionsCount = 0,
            templateOptionsCount = 0,
            firstSku = false,
            update = product.updateSingleSku(),
            i;

        for (i = 0; i < product.skus().length; i++) {
            if (product.skus()[i].itemState() !== 'DELETE') {
                skuCount++;

                if (!firstSku) {
                    firstSku = product.skus()[i].sku();
                }
            }
        }

        if (product.customOptions) {
            for (i = 0; i < product.customOptions().length; i++) {
                if (product.customOptions()[i].itemState() !== 'DELETE') {
                    customOptionsCount++;
                }
            }
        }

        if (product.templateOptions) {
            for (i = 0; i < product.templateOptions().length; i++) {
                if (product.templateOptions()[i].itemState() !== 'DELETE') {
                    templateOptionsCount++;
                }
            }
        }

        if (skuCount === 1 && customOptionsCount === 0 && templateOptionsCount === 0) {
            return firstSku;
        }

        return false;
    });

    this.availabilityDisabled = function (pricingGroup) {
        return ko.computed(function () {
            var skuCount = 0,
                customOptionsCount = 0,
                templateOptionsCount = 0,
                pricingOptionsCount = 0,
                update = product.updateSingleSku(),
                pg = ko.utils.unwrapObservable(pricingGroup),
                i;

            /**
             * If the product itself has no skus or custom options
             * then there's no availability.
             */
            for (i = 0; i < product.skus().length; i++) {
                if (product.skus()[i].itemState() !== 'DELETE') {
                    skuCount++;
                }
            }

            if (product.customOptions) {
                for (i = 0; i < product.customOptions().length; i++) {
                    if (product.customOptions()[i].itemState() !== 'DELETE') {
                        customOptionsCount++;
                    }
                }
            }

            if (product.templateOptions) {
                for (i = 0; i < product.templateOptions().length; i++) {
                    if (product.templateOptions()[i].itemState() !== 'DELETE') {
                        templateOptionsCount++;
                    }
                }
            }

            if (skuCount === 0 && customOptionsCount === 0 && templateOptionsCount === 0) {
                pricingGroup.available(false);
                return true;
            }

            if (skuCount === 1) {
                return false;
            }

            /**
             * Otherwise we have to check the pricing group to see if any options are selected.
             */
            if ((skuCount > 0 && customOptionsCount > 0) || (skuCount > 0 && templateOptionsCount > 0)) {
                for (i = 0; i < pg.options().length; i++) {
                    if (pg.options()[i].itemState() !== 'DELETE') {
                        pricingOptionsCount++;
                    }
                }

                if (pricingOptionsCount === 0) {
                    pricingGroup.available(false);
                    return true;
                }
            }

            return false;
        });
    };

    // Pricing Groups
    this.seller = ko.observable();
    this.currentSelected = ko.observable();
    this.currentSelectedSeller = ko.observable();
    this.selectedSellerPricingTypes = ko.observableArray();
    this.selectedSellerApis = ko.observableArray();

    this.pricingGroupSelected = ko.observable();

    this.selectItem = function (self, site) {
        // Clear currently selected seller, before we reset the selectedSellerApis
        // otherwise the api drowdowns will reset
        self.currentSelected(null);
        self.currentSelectedSeller(null);

        $.each(productCatalogViewModel.allSellers(), function (i, seller) {
            if (site.sellerId() === seller.id) {

                // Create the list of seller-specific pricing types
                // The api pricing type will be included only if the corresponding seller has APIs
                var keepApi = false,
                    availableTypes = [];
                if (seller.apis && seller.apis.length) {
                    keepApi = true;
                }
                $.each(productCatalogViewModel.pricingTypes(), function (k, pricingType) {
                    if (pricingType.id !== 'API' || keepApi) {
                        availableTypes.push(pricingType);
                    }
                });
                product.selectedSellerPricingTypes(availableTypes);

                // Set the selectable apis based on the selected seller
                product.selectedSellerApis(seller.apis);
                return false;
            }
        });
        // Select the seller
        self.currentSelected(site.name());
        self.currentSelectedSeller(site);
    };

    /**
     * Returns the current seller name.
     *
     * @return {Observable}
     */
    this.currentSellerName = ko.computed(function ( ) {
        if (!product.productDataLoaded()) { return false; }

        if (product.sellers && product.sellers()) {

            var seller = _.filter(product.sellers(), function (it) {
                return it.name() === product.currentSelected();
            });

            if (!seller || !seller[0]) { return []; }

            return seller[0].name();
        }
    });

    /**
     * Returns the current seller name.
     *
     * @return {Observable}
     */
    this.currentSeller = ko.computed(function ( ) {
        if (!product.productDataLoaded()) { return false; }

        if (product.sellers && product.sellers()) {

            var seller = _.filter(product.sellers(), function (it) {
                return it.name() === product.currentSelected();
            });

            if (!seller || !seller[0]) { return []; }

            return {'name': seller[0].name(), 'id': seller[0].sellerId()};
        }

        return {'name': '', 'id': 0};
    });

    this.dummySellerCodesInitialized = ko.observable(false);


    /**
     * Return all pricing groups for the current seller.
     *
     * @return {Observable}
     */
    this.getPricingGroups = ko.computed(function () {

        if (!product.productDataLoaded()) { return false; }

        if (product.sellers && product.sellers()) {

            var seller = _.filter(product.sellers(), function (it) {
                return it.name() === product.currentSelected();
            });

            if (!seller || !seller[0]) { return []; }

            return seller[0].pricingGroups();
        }
    });


    /**
     * Takes a POJO and creates a pricing group object out of
     * observables.
     *
     * @param {Object} group
     */
    this.addPricingGroup = function (group) {
        var seller = _.filter(product.sellers(), function (it) {
            return it.name() === product.currentSelected();
        });

        if (!seller || !seller[0]) { return false; }

        var pricingGroup = {
            apiId: ko.observable(group.apiId),
            available: ko.observable(group.available),
            id: ko.observable(group.id),
            interestRate: ko.observable(group.interestRate),
            options: ko.observable(group.options),
            oneTimeTerm: ko.observable(group.oneTimeTerm),
            price: ko.observable(group.price),
            pricingType: ko.observable(group.pricingType),
            term: ko.observable(group.term),
            itemState: ko.observable(group.itemState),
            externallyModified: ko.observable(group.externallyModified)
        };

        // for quantity number inputs so the numbers don't get converted to strings
        pricingGroup.interestRateInterceptor = ko.computed({
            read: function() {
                return (pricingGroup.interestRate() * 100).toFixed(0);
            },
            write: function(newValue) {
                var parsedValue = parseFloat(newValue) / 100;
                pricingGroup.interestRate(isNaN(parsedValue) ? newValue : parsedValue);
            }
        });

        var pricingGroups = seller[0].pricingGroups();
        pricingGroups.push(pricingGroup);

        seller[0].pricingGroups(pricingGroups);
    };

    this.rackRateTooltip = function (trigger) {
        trigger = '[for=' + $(trigger).attr('for') + ']';
        $(trigger).mettelTooltip({
            position: "top",
            hoverDelay: 1000
        });
    };


    // Save

    this.saveSuccessful = ko.observable(false);

    this.prepProductForSave = function (product) {

        // Strip all the functions from the object
        MetTel.Utils.crawlDeleteFunctions(product);

        // Any attributes that didn't come from the json, update their id to be 0
        if (product.attributes) {
            $.each(product.attributes, function (i, attribute) {
                if (attribute.attId === "") {
                    attribute.attId = 0;
                }
            });
        }

        if (product.skus) {
            $.each(product.skus, function (i, sku) {
                if (sku.attributes) {
                    $.each(sku.attributes, function (i, attribute) {
                        // Update item state based on whether or not the selected value has changed
                        if (attribute.itemState !== "CREATE" && attribute.itemState !== "DELETE") {
                            if (attribute.originalSelectedValue !== attribute.selected) {
                                attribute.itemState = "UPDATE";
                            }
                        }
                    });
                }
            });
        }

        // Smash all template option group options into one array
        if (product.templateOptions) {
            product.templateOptionProducts = [];

            $.each(product.templateOptions, function (i, optionGroup) {
                if (optionGroup.products) {
                    $.each(optionGroup.products, function (j, option) {
                        product.templateOptionProducts.push(option);
                    });
                }
            });
        }
    };

    this.saveProduct = function () {

        productCatalogViewModel.productCatalogLoading(true);

        var postProductUrl,
            unmappedProduct = ko.mapping.toJS(product.mappedProduct);

        product.prepProductForSave(unmappedProduct);

        // Determine url based on if it's an existing product or a new one
        if (product.id()) {
            postProductUrl = options.productCatalogModel.endPoints.updateProductData;
        } else if (options.parent) {
            postProductUrl = options.productCatalogModel.endPoints.createProductData;
        }

        $.ajax({
            type: "POST",
            url: postProductUrl,
            data: JSON.stringify(unmappedProduct),
            contentType: 'application/json',
            success: function (newProductObj) {

                options.productCatalogModel.deactivateProduct();

                product.buildProduct(newProductObj);

                options.productCatalogModel.activeProduct(product);

                productCatalogViewModel.productCatalogLoading(false);

                // Fire success message modal
                product.saveSuccessful(true);

            },
            dataType: 'json'
        })
        .fail(function (data, textStatus, xhr) {
            // error logic

            console.group();
            console.log("Error Saving");
            console.log("data", data);
            console.log("textStatus", textStatus);
            console.log("xhr", xhr);
            console.groupEnd();

            productCatalogViewModel.productCatalogLoading(false);

            // Set error observables, which will fire error modal
            var strError = data.responseJSON ? data.responseJSON.message : "Server error";

            productCatalogViewModel.errorTitle("Save Product Error");
            productCatalogViewModel.errorMessage(strError);

        });

        if (hashHistorySaved) {
            location.href = hashHistorySaved;
            hashHistorySaved = false;
        }
    };

    this.hasSeller = function (sellerName) {
        for (var i = 0; i < product.sellers().length; i++) {
            if (product.sellers()[i].name() === sellerName) {
                return true;
            }
        }
        return false;
    };

    this.productIsDirty = function ( ) {
        var i = 0, j = 0, k = 0;

        if (product.itemState() !== 'NOCHANGE') {
            return true;
        }

        // Check Attributes
        for (i = 0; i < product.attributes().length; i++) {
            if (product.attributes()[i].itemState() !== 'NOCHANGE') {
                return true;
            }
        }

        // Check Thumbnails
        for (i = 0; i < product.thumbnails().length; i++) {
            if (product.thumbnails()[i].itemState() !== 'NOCHANGE') {
                return true;
            }
        }

        // Check Availability
        for (i = 0; i < product.availability().length; i++) {
            if (product.availability()[i].itemState() !== 'NOCHANGE') {
                return true;
            }
        }

        // Check Custom Options
        for (i = 0; i < product.customOptions().length; i++) {
            if (product.customOptions()[i].itemState() !== 'NOCHANGE') {
                return true;
            }

            if (typeof product.customOptions()[i].products === 'function') {
                for (j = 0; j < product.customOptions()[i].products().length; j++) {
                    if (product.customOptions()[i].products()[j].itemState() !== 'NOCHANGE') {
                        return true;
                    }
                }
            }

            if (typeof product.customOptions()[i].rows === 'function') {
                for (j = 0; j < product.customOptions()[i].rows().length; j++) {
                    if (product.customOptions()[i].rows()[j].itemState() !== 'NOCHANGE') {
                        return true;
                    }
                }
            }
        }


        // Check Template Options
        for (i = 0; i < product.templateOptions().length; i++) {
            if (product.templateOptions()[i].itemState() !== 'NOCHANGE') {
                return true;
            }

            if (typeof product.templateOptions()[i].products === 'function') {
                for (j = 0; j < product.templateOptions()[i].products().length; j++) {
                    if (product.templateOptions()[i].products()[j].itemState() !== 'NOCHANGE') {
                        return true;
                    }
                }
            }

            if (typeof product.templateOptions()[i].rows === 'function') {
                for (j = 0; j < product.templateOptions()[i].rows().length; j++) {
                    if (product.templateOptions()[i].rows()[j].itemState() !== 'NOCHANGE') {
                        return true;
                    }
                }
            }
        }

        // Check Sellers
        for (i = 0; i < product.sellers().length; i++) {
            if (product.sellers()[i].itemState() !== 'NOCHANGE') {
                return true;
            }

            if (typeof product.sellers()[i].pricingGroups === 'function') {
                for (j = 0; j < product.sellers()[i].pricingGroups().length; j++) {
                    if (product.sellers()[i].pricingGroups()[j].itemState() !== 'NOCHANGE') {
                        return true;
                    }

                    if (typeof product.sellers()[i].pricingGroups()[j].options === 'function') {
                        for (k = 0; k < product.sellers()[i].pricingGroups()[j].options().length; k++) {
                            if (product.sellers()[i].pricingGroups()[j].options()[k].itemState() !== 'NOCHANGE') {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        // Check SKUs
        for (i = 0; i < product.skus().length; i++) {
            if (product.skus()[i].itemState() !== 'NOCHANGE') {
                return true;
            }

            if (typeof product.skus()[i].attributes === 'function') {
                for (j = 0; j < product.skus()[i].attributes().length; j++) {
                    if (product.skus()[i].attributes()[j].itemState() !== 'NOCHANGE') {
                        return true;
                    }
                }
            }
        }



        return false;
    };

    // Admin-specific product properties/functionality
    if (this.buildProduct) {
        this.buildProduct.finalize = function () {

            // Availability
            if (product.availability && !product.isTemplate()) {

                $.getJSON(options.productCatalogModel.endPoints.availabilityTypes, function (data) {
                    if (product.availabilityTypes) {
                        product.availabilityTypes(data);
                    }
                });

                product.viewableAvailabilityEntries = ko.computed(function() {
                    return _.filter(product.availability(), function (entry) {
                        return entry.itemState() !== "DELETE";
                    });
                });
            }

            // SKUs
            if (product.skus) {

                product.isSKUDuplicate = function (sku) {
                    var dupFlag = false;

                    $.each(product.skus(), function (i, comparisonSKU) {

                        // Check this sku for deleted
                        if (sku.itemState() !== 'DELETE') {

                            // Only check the comparison sku if it's not deleted
                            if (sku.itemState() !== 'DELETE') {

                                // Don't compare it against itself
                                if (sku.sku !== comparisonSKU.sku) {

                                    // Compare the checked attributes here
                                    if (sku.checkedAttrsString()) {

                                        // Finally check if (case insensitive) checked attributes are the same
                                        if (sku.checkedAttrsString() && comparisonSKU.checkedAttrsString()) {
                                            if (MetTel.Utils.stricmp(sku.checkedAttrsString(), comparisonSKU.checkedAttrsString())) {
                                                dupFlag = true;
                                                return false;
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            // Stop checking if this sku is deleted
                            return false;
                        }
                    });

                    return dupFlag;
                };

                /**
                 * Returns whether or not a given attribute affects any pricing groups.
                 * Used to determine whether or not unchecking this attribute will
                 * break anything.
                 *
                 * @param {Attribute} attribute
                 * @return {Boolean}
                 */
                product.attributeAffectsPricingGroups = function (attr) {
                    var pgsAffected = false,
                        product = productCatalogViewModel.activeProduct();

                    $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                        if (ko.utils.unwrapObservable(seller.itemState) === 'DELETE') {
                            return;
                        }
                        $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                            if (ko.utils.unwrapObservable(pricingGroup.itemState) === 'DELETE') {
                                return;
                            }
                            $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                if (ko.utils.unwrapObservable(option.itemState) === 'DELETE') {
                                    return;
                                }
                                if (MetTel.Utils.stricmp(option.name, attr.key())) {
                                    $.each(ko.utils.unwrapObservable(option.selectedValues), function (iv, value) {
                                        if (ko.utils.unwrapObservable(value.itemState) === 'DELETE') {
                                            return;
                                        }
                                        pgsAffected = true;
                                    });
                                }
                            });
                        });
                    });

                    return pgsAffected;
                };


                /**
                 * Determine whether other SKUs have an instance of this
                 * SKU attribute.
                 *
                 * @param {Attribute} attr
                 * @return {Boolean}
                 */
                product.otherSKUsHaveThisAttribute = function (attr) {
                    var otherSKUsHaveIt = 0,
                        product = productCatalogViewModel.activeProduct();

                    $.each(ko.utils.unwrapObservable(product.skus), function (is, sku) {
                        if (!sku) {
                            return;
                        }
                        $.each(ko.utils.unwrapObservable(sku.attributes), function (ia, attribute) {
                            if (!attribute) {
                                return;
                            }

                            if (MetTel.Utils.stricmp(attribute.key, attr.key)) {
                                otherSKUsHaveIt++;
                            }
                        });
                    });

                    return (otherSKUsHaveIt-1) > 0;
                };

                // A whole lot of logic to make sure that SKU check boxes
                // Actually update each other when clicked. Best way I could
                // find to solve it was this system of nested subscribes.
                //
                // The switch() statements are probably redundant, but I
                // was anticipating having to handle more than just 'added'
                // for status.
                product.skus.subscribe(
                    function (changes) {
                        $.each(changes, function (i, skuObj) {
                            var sku = skuObj.value;
                            switch(skuObj.status) {
                                case "added":
                                    sku.attributes.subscribe(
                                        function (changes) {
                                            $.each(changes, function (i, attrObj) {
                                                var attr = attrObj.value;
                                                switch (attrObj.status) {
                                                    case "added":
                                                        attr.selected.subscribe(function (checked) {
                                                            product.UpdateCheckboxes(sku);
                                                        });
                                                        break;
                                                }
                                            });
                                        },
                                        null,
                                        'arrayChange'
                                    );
                                    break;
                            }
                        });
                    },
                    null,
                    'arrayChange'
                );
                $.each(product.skus(), function (i, sku) {
                    sku.attributes.subscribe(
                        function (changes) {
                            $.each(changes, function (i, attrObj) {
                                var attr = attrObj.value;
                                switch (attrObj.status) {
                                    case "added":
                                        attr.selected.subscribe(function (checked) {
                                            product.UpdateCheckboxes(sku);
                                        });
                                        break;
                                }
                            });
                        },
                        null,
                        'arrayChange'
                    );

                    $.each(sku.attributes(), function (i, attr) {
                        attr.selected.subscribe(function (checked) {
                            product.UpdateCheckboxes(sku);
                        });

                        attr.originalSelectedValue = attr.selected();  // For comparison later for itemState
                    });

                    sku.duplicate = ko.computed(function () {
                        return product.isSKUDuplicate(sku);
                    });

                });

                product.duplicateSKUs = ko.computed(function () {
                    var flag = false;
                    $.each(product.viewableSKUs(), function (i, sku) {
                        if (sku.duplicate()) {
                            flag = true;
                            return false;
                        }
                    });
                    return flag;
                });

                // Watches all SKUs associated with available pricing groups for attribute errors
                product.availableSKUAttributeError = ko.computed(function () {
                    var flag = false,
                        stopCheck = false;
                    // Iterate over pricing groups
                    $.each(product.sellers(), function (i, seller) {
                        if (stopCheck) { return false; }
                        $.each(seller.pricingGroups(), function (j, pricingGroup) {
                            if (stopCheck) { return false; }
                            // Check if the pricing group is available
                            if (pricingGroup.available()) {
                                $.each(product.viewableSKUs(), function (k, sku) {
                                    // Check its associated SKUs for errors
                                    if (product.skuMatchesPricingGroup(sku, pricingGroup)) {
                                        // If an error is found, stop checking
                                        if (product.SKUErrorsForSKU(sku.sku()).length) {
                                            flag = true;
                                            stopCheck = true;
                                            return false;
                                        }
                                    }
                                });
                            }
                        });
                    });
                    return flag;
                });

                // Watches the three possible sku criterion for the purchasable toggle:
                // sku(s) exist, there are no duplicates, and there are no attribute errors
                product.skuErrorAffectingPurchasable = ko.computed(function () {
                    return (
                        !product.viewableSKUs().length ||
                        product.duplicateSKUs() ||
                        product.availableSKUAttributeError()
                    );
                });
            }

            // Custom Options
            if (product.customOptions) {
                $.each(product.customOptions(), function (i, optionGroup) {

                    optionGroup.updatePricingGroups = function (removedOptions) {
                        // Update the pricing groups
                        $.each(removedOptions, function (i_n, existingOption) {

                            var customOptionName = false;

                            $.each(ko.utils.unwrapObservable(product.customOptions), function (ic, customOption) {
                                $.each(ko.utils.unwrapObservable(customOption.products), function (ip, product) {
                                    if (ko.utils.unwrapObservable(product.refProductId) === ko.utils.unwrapObservable(existingOption.refProductId)) {
                                        customOptionName = ko.utils.unwrapObservable(customOption.title);
                                        return;
                                    }
                                });

                                if (customOptionName) {
                                    return;
                                }
                            });

                            if (customOptionName) {
                                $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                                    if (!seller) {
                                        return;
                                    }
                                    if (seller.itemState() === 'DELETE') {
                                        return;
                                    }
                                    $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ipg, pricingGroup) {
                                        if (!pricingGroup) {
                                            return;
                                        }
                                        if (pricingGroup.itemState() === 'DELETE') {
                                            return;
                                        }
                                        $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                            if (!option) {
                                                return;
                                            }
                                            if (option.itemState() === 'DELETE') {
                                                return;
                                            }
                                            if (ko.utils.unwrapObservable(option.type) === 'OPTIONS' && MetTel.Utils.stricmp(customOptionName, option.name)) {

                                                var newArrayWithoutDeleted = [];

                                                $.each(ko.utils.unwrapObservable(option.selectedValues), function (isv, selectedValue) {
                                                    if (!selectedValue) {
                                                        return;
                                                    }
                                                    if (String(ko.utils.unwrapObservable(existingOption.refProductId)) !== String(ko.utils.unwrapObservable(selectedValue.value))) {
                                                        newArrayWithoutDeleted.push(selectedValue);
                                                    } else {
                                                        pricingGroup.externallyModified(true);
                                                    }
                                                });

                                                option.selectedValues(newArrayWithoutDeleted);

                                                if (!newArrayWithoutDeleted.length) {
                                                    if (option.itemState() !== 'CREATE') {
                                                        option.itemState('DELETE');
                                                    } else {
                                                        pricingGroup.options.remove(option);
                                                    }
                                                    pricingGroup.externallyModified(true);
                                                }
                                            }
                                        });
                                    });
                                });
                            } else {
                                console.log('Could not find matching custom option for refProductId: ' + ko.utils.unwrapObservable(existingOption.refProductId));
                            }
                        });

                    };

                    optionGroup.deleteOption = function (option) {
                        if (option) {
                            if (option.itemState() === 'CREATE') {
                                // If it's just been created, we can completely get rid of it, since it hasn't been save yet
                                optionGroup.products.remove(option);
                            } else {
                                // If it had been saved before, mark its item state appropriately
                                option.itemState('DELETE');
                            }
                        }

                        if (!product.isTemplate()) {
                            optionGroup.updatePricingGroups([option]);
                        }
                    };

                    // Update the options in the option group based on the selected options from the grid
                    optionGroup.updateOptions = function (selectedRows) {

                        if (!selectedRows) { return false; }

                        // First capture all existing options that are not selected

                        var noLongerSelected = [];

                        $.each(optionGroup.products(), function (i, existingOption) {

                            var doesNotMatch = true;

                            // Compare it to the newly selected rows
                            $.each(selectedRows, function (j, selectedOption) {

                                if (existingOption.refProductId() === selectedOption.data().ProductID) {

                                    // If it does match one of the newly selected rows,
                                    // mark it to not be removed
                                    doesNotMatch = false;
                                    return false;
                                }
                            });

                            // If it's not selected,
                            // and if it's not newly created
                            if (doesNotMatch) {

                                // Mark it as deleted and store it
                                existingOption.itemState('DELETE');
                                noLongerSelected.push(existingOption);
                            }
                        });

                        // Build new objects from the selected options
                        optionGroup.updatePricingGroups(noLongerSelected);

                        // Build/recreate all selected (new and old) options
                        var newOptions = [];

                        $.each(selectedRows, function (i, selectedOption) {

                            var newOption;

                            // Compare it to the existing options
                            $.each(optionGroup.products(), function (j, existingOption) {

                                // If it does match one of the existing options,
                                // reuse the existing option object
                                if (selectedOption.data().ProductID === existingOption.refProductId()) {
                                    newOption = existingOption;
                                    return false;
                                }
                            });

                            // If we're reusing the existing option object
                            if (newOption) {

                                // Check if it's already marked as new,
                                // meaning it still hasn't been save yet
                                // If so, don't change it
                                if (newOption.itemState() !== 'CREATE') {

                                    // If not, clear its item state
                                    newOption.itemState('');
                                }
                            } else {

                                // If it doesn't have an existing object, create one
                                newOption = {
                                    id: ko.observable(0),
                                    refProductId: ko.observable(selectedOption.data().ProductID),
                                    optionGroupId: ko.observable(optionGroup.id()),
                                    name: ko.observable(selectedOption.data().Name),
                                    type: ko.observable(selectedOption.data().Type),
                                    sortOrder: ko.observable(),
                                    itemState: ko.observable('CREATE')
                                };
                            }

                            // Add the option to the array
                            newOptions.push(newOption);
                        });

                        // Overwrite all existing products with the new ones
                        optionGroup.products(newOptions);

                        // Add the no longer selected options back into products at the end
                        $.each(noLongerSelected, function (i, option) {
                            optionGroup.products.push(option);
                        });

                        if (!product.isTemplate() && noLongerSelected.length) {
                            var specIds = noLongerSelected.map(function (o) {
                                return ko.utils.unwrapObservable(o.refProductId);
                            }).join(',');

                            if (productCatalogViewModel.endPoints.removeTemplateOptionSpec && specIds) {
                                $.get(productCatalogViewModel.endPoints.removeTemplateOptionSpec + '?templateOptionId=' + optionGroup.id() + '&templateOptionSpecIds=' + specIds, function (data) {
                                    if (!data.complete) {
                                        console.log('An error occurred.');
                                    }
                                });
                            }
                        }
                    };

                    if (optionGroup.products) {

                        // Store original sort order
                        $.each(optionGroup.products(), function (i, product) {
                            product.originalSortOrder = product.sortOrder();
                        });

                        // Returns the products that haven't been deleted
                        optionGroup.rows = ko.computed(function () {
                            return _.filter(optionGroup.products(), function (row) {
                                return row.itemState() !== 'DELETE';
                            });
                        });
                    }

                    if (optionGroup.optionGroupTypeId() === 3) {
                        // Store all pertinent original properties
                        optionGroup.originalRequired = optionGroup.required();
                        optionGroup.originalTitle = optionGroup.title();
                        optionGroup.originalRowsText = Number(optionGroup.rowsText());
                        optionGroup.originalMaximumCharacters = Number(optionGroup.maximumCharacters());

                        // Watch those properties to see if any change
                        optionGroup.maintainItemState = ko.computed(function () {
                            if (
                                optionGroup.originalRequired !== optionGroup.required() ||
                                optionGroup.originalTitle !== optionGroup.title() ||
                                optionGroup.originalRowsText !== Number(optionGroup.rowsText()) ||
                                optionGroup.originalMaximumCharacters !== Number(optionGroup.maximumCharacters())
                            ) {
                                optionGroup.itemState('UPDATE');
                            } else {
                                optionGroup.itemState('NOCHANGE');
                            }
                        });
                    }

                    if (optionGroup.optionGroupTypeId() === 4) {
                        // Store all pertinent original properties
                        optionGroup.originalTitle = optionGroup.title();
                        optionGroup.originalText = optionGroup.text();

                        // Watch those properties to see if any change
                        optionGroup.maintainItemState = ko.computed(function () {
                            if (
                                optionGroup.originalTitle !== optionGroup.title() ||
                                optionGroup.originalText !== optionGroup.text()
                            ) {
                                optionGroup.itemState('UPDATE');
                            } else {
                                optionGroup.itemState('NOCHANGE');
                            }
                        });
                    }
                });
            }

            // Purchasable
            if (product.purchasable) {

                product.purchasableDisabled = ko.computed(function () {
                    // If product type is blank, must be on
                    if (!product.productType()) {
                        // If it's about to be disabled and it's in the 'yes' position, toggled to 'no' before disabling
                        if (product.purchasable()) {
                            product.purchasable(false);
                        }

                        // Disable it
                        return true;
                    }

                    // Checks the 5 criteria for being purchasable:
                    // name, sku (at least one exists and there are no errors), availability, available pricing group
                    if (
                        !product.name() ||
                        product.skuErrorAffectingPurchasable() ||
                        !product.viewableAvailabilityEntries().length ||
                        !product.pricingGroupAvailable()
                    ) {

                        // If it's about to be disabled and it's in the 'yes' position, toggled to 'no' before disabling
                        if (product.purchasable()) {
                            product.purchasable(false);
                        }

                        // Disable it
                        return true;
                    } else {
                        // Enable it
                        return false;
                    }
                });
            }

            // Pricing
            if (product.sellers && product.sellers()) {

                if (product.sellers()[0]) {
                    product.currentSelected(product.sellers()[0].name());
                    product.currentSelectedSeller(product.sellers()[0]);
                    product.selectItem(product, product.sellers()[0]);
                }

                $.each(product.sellers(), function (i, seller) {
                    // update "rack" radio button observable if a seller is set to rack
                    if (seller.rack() === true) {
                        product.seller(seller.name());
                    }

                    if (seller.pricingGroups()) {
                        $.each(seller.pricingGroups(), function (j, pricingGroup) {

                            // Store all pertinent original properties
                            pricingGroup.originalAvailable = pricingGroup.available();
                            pricingGroup.originalPricingType = pricingGroup.pricingType();
                            pricingGroup.originalPrice = pricingGroup.price();
                            pricingGroup.originalTerm = pricingGroup.term();
                            pricingGroup.originalInterestRate = pricingGroup.interestRate();

                            pricingGroup.interestRateInterceptor = ko.computed({
                                read: function() {
                                    return (pricingGroup.interestRate() * 100).toFixed(0);
                                },
                                write: function(newValue) {
                                    var parsedValue = parseFloat(newValue) / 100;
                                    pricingGroup.interestRate(isNaN(parsedValue) ? newValue : parsedValue);
                                }
                            });

                            pricingGroup.originalApiId = pricingGroup.apiId();
                            pricingGroup.originalOneTimeTerm = pricingGroup.oneTimeTerm();

                            if (typeof pricingGroup.externallyModified === "undefined") {
                                pricingGroup.externallyModified = ko.observable(false);
                            }

                            // Watch those properties to see if any change
                            pricingGroup.maintainItemState = ko.computed(function () {
                                if (
                                    pricingGroup.originalAvailable !== pricingGroup.available() ||
                                    pricingGroup.originalPricingType !== pricingGroup.pricingType() ||
                                    pricingGroup.originalPrice !== pricingGroup.price() ||
                                    pricingGroup.originalTerm !== pricingGroup.term() ||
                                    pricingGroup.originalInterestRate !== pricingGroup.interestRate() ||
                                    pricingGroup.originalApiId !== pricingGroup.apiId() ||
                                    pricingGroup.originalOneTimeTerm !== pricingGroup.oneTimeTerm()
                                ) {
                                    pricingGroup.itemState('UPDATE');
                                } else {
                                    pricingGroup.itemState('NOCHANGE');
                                }
                            });
                        });
                    }

                    // update "rack" to be tied to radio button value
                    seller.rack = ko.computed(function() {
                        return seller.name() === product.seller();
                    });

                    seller.rack.subscribe(function(value) {
                        seller.itemState("UPDATE");
                    });

                });
            }

            // Saving
            product.disableSave = ko.computed(function () {
                return (!product.name() || !product.productType());
            });

            // Views
            product.pricingTabInitialized = ko.observable(false);
            product.productPreviewInitialized = ko.observable(false);
        };
    }

    this.sellerCodeHasSku = function (codes, sku) {
        for (var i = 0; i < codes().length; i++) {
            if (ko.utils.unwrapObservable(codes()[i]().sku) === ko.utils.unwrapObservable(sku)) {
                return ko.utils.unwrapObservable(codes()[i]);
            }
        }

        return ko.observable({
            sku: ko.observable(''),
            order: ko.observable(''),
            billing: ko.observable('')
        });
    };

    //OVerrides
}

function ProductCatalogModel () {
    // Extend ProductCatalogModel with BaseCatalogModel
    var productCatalog = this;
    productCatalogViewModel = this;

    BaseCatalogModel.call(this);

    productCatalog.ProductTypes = function () {
        var productTypes = this;

        productTypes.loaded = ko.observable(false);
        productTypes.selection = ko.observable('');
        productTypes.types = ko.observableArray([]);

        productTypes.load = function () {
            $.get(productCatalogViewModel.endPoints.productTypes).done(function (data) {
                productTypes.types(data);
                productTypes.loaded(true);
            });
        };

        productTypes.load();
    };

    // Add a new category with its first subcategory
    this.addNewCategory = function () {

        this.contentLoading(true);

        var url = productCatalog.endPoints.postNewCategory + productCatalog.queryString();

        // Post new category
        $.post(url, {
            categoryName: productCatalog.newCategoryName(),
            subcategoryName: productCatalog.newSubcategoryName()
        }, function (response) {

            if (response.categoryId && response.subcategoryId && response.products) {

                // Build new category model
                var newCategory = new CategoryModel(productCatalog, {
                    id: response.categoryId,
                    name: productCatalog.newCategoryName(),
                    visible: true,
                    subcategories: [
                        {
                            id: response.subcategoryId,
                            name: productCatalog.newSubcategoryName(),
                            visible: true
                        }
                    ]
                }, productCatalog.endPoints, productCatalog.queryString(), response.products);

                // Add its selected observable to the array
                productCatalog.selectedObservables.push(newCategory.selected);

                // Initialize the new category
                newCategory.init();

                // Add the new subcategory to the array
                productCatalog.categories.push(newCategory);

                // Select the new subcategory
                productCatalog.falsifyCategorySelectedObservables();
                newCategory.selected(true);
                newCategory.subcategories()[0].selected(true);

                // Reset new name observables
                productCatalog.newCategoryName('');
                productCatalog.newSubcategoryName('');

                // Close the modal
                if (productCatalog.addNewCategoryCallback) {
                    productCatalog.addNewCategoryCallback();
                }
            } else {
                productCatalog.addCategoryUnsuccessful(true);
            }

            productCatalog.contentLoading(false);

        }, 'json')
            .fail(function () {
                productCatalog.addCategoryUnsuccessful(true);
                productCatalog.contentLoading(false);
            });
    };


    /**
     * Used by the Add Federated SKUs (Add from CNet) dialog. Render the additional attributes when a row's
     * disclosure triangle is clicked.
     *
     * @param {HTMLElement} $placeholder
     * @param {Object} rowData
     * @return void
     */
    this.handleExpandedRow = function ($placeholder, rowData) {
        // $placeholder is a div with classname mettel-expanded-grid-row-content that is added into a new table row when the twisty is clicked
        // rowData is the RowModel object, which will contain all the fields for this row

        var attributes = JSON.parse(rowData.Attributes);

        var $attributeTable = $('<div></div>').addClass('mettel-federated-sku-attributes-container'),
            $attributeList = $('<ol></ol>').addClass('mettel-federated-sku-attributes-list');

        $attributeTable.append($attributeList);

        for (var key in attributes) {
            var $attributeKey = $('<div></div>').addClass('mettel-federated-sku-attribute-key'),
                $attributeKeyInner = $('<div></div>').addClass('mettel-federated-sku-attribute-key-inner').text(key),
                $attributeValue = $('<div></div>').addClass('mettel-federated-sku-attribute-value').text(attributes[key]),
                $attributeRow = $('<li></li>').addClass('mettel-federated-sku-attribute');

            $attributeKey.append($attributeKeyInner);
            $attributeRow.append($attributeKey);
            $attributeRow.append($attributeValue);

            $attributeList.append($attributeRow);
        }

        $placeholder.empty().append($attributeTable);
    };


    this.pricingGroupCheckedOptions = {
        "skus": {},
        "customOptions" : {},
        "templateOptions": {}
    };

    /**
     * Returns a boolean indicating whether all of the requested values
     * are checked in the dummy pricing group.
     *
     * @param {String} name (the name of the category)
     * @param {Array} choices (An array of values to check)
     * @return {Boolean}
     */
    this.allValuesChecked = function (name, choices) {
        var product = productCatalog.activeProduct();
        if (typeof product === 'undefined' || product === null) {
            return false;
        }

        if (!(productCatalogViewModel.dummyPricingGroup() && productCatalogViewModel.dummyPricingGroup().options)) {
            return false;
        }
        var dummyPricingGroupOptions = productCatalogViewModel.dummyPricingGroup().options();

        for (var i = 0; i < dummyPricingGroupOptions.length; i++) {
            if (dummyPricingGroupOptions[i].hasOwnProperty('itemState') && dummyPricingGroupOptions[i].itemState() === 'DELETE') {
                continue;
            }
            if (MetTel.Utils.stricmp(dummyPricingGroupOptions[i].name(), name)) {
                // choices.length - 1 to account for all.
                return dummyPricingGroupOptions[i].selectedValues().length === (choices.length-1);
            }
        }

        return false;
    };


    this.dummyPricingGroup = ko.observable();


    /**
     * Transforms the complex data structures of SKUs, custom options, and template options
     * into a flat data structure that can easily be consumed by the template. Also wires
     * that structure to a dummyPricingGroup that can be optionally persisted back to the
     * product model, or discarded if necessary.
     *
     * Used by the add to pricing group modal.
     *
     * @return {Observable}
     */
    this.pricingGroupOptions = ko.computed(function () {
        var optionsArray = [];

        var product = productCatalog.activeProduct();
        if (typeof product === 'undefined' || product === null) {
            return [];
        }

        if (!(productCatalogViewModel.dummyPricingGroup() && productCatalogViewModel.dummyPricingGroup().options)) {
            return [];
        }
        var dummyPricingGroupOptions = productCatalogViewModel.dummyPricingGroup().options();
        var optionGroupIndex = 0;

        // Get the available SKU keys and all their values
        var attributeMap = {};
        var skus = product.skus();

        $.each(skus, function (i, sku) {
            var attributes = sku.attributes();

            $.each(attributes, function (i, attribute) {
                if (attribute.itemState() === 'DELETE') {
                    return;
                }
                var aKeyLc = attribute.key().toLowerCase(),
                    aValueLc = attribute.value().toLowerCase();

                if (!attribute.selected()) {
                    return;
                }

                if (!attributeMap.hasOwnProperty(aKeyLc)) {
                    attributeMap[aKeyLc] = [];
                }
                attributeMap[aKeyLc].push({
                    'id': 0,
                    'itemId': attribute.attrId(),
                    'value': aValueLc,
                    'name': aValueLc,
                    'itemState': ko.observable('CREATE')
                });

                if (!(productCatalog.pricingGroupCheckedOptions.skus[aKeyLc])) {
                    productCatalog.pricingGroupCheckedOptions.skus[aKeyLc] = {};
                }

                var pricingOptionChecked = productCatalogViewModel.pricingGroupHasOptionChecked(productCatalogViewModel.dummyPricingGroup(), aKeyLc, aValueLc);
                productCatalog.pricingGroupCheckedOptions.skus[aKeyLc][aValueLc] = ko.observable(pricingOptionChecked);

                productCatalog.pricingGroupCheckedOptions.skus[aKeyLc][aValueLc].subscribe(function (newValue, oldValue) {
                    for (var j = 0; j < dummyPricingGroupOptions.length; j++) {

                        if (MetTel.Utils.stricmp(dummyPricingGroupOptions[j].name(), aKeyLc)) {
                            if (newValue === true) {
                                dummyPricingGroupOptions[j].selectedValues(_.union(dummyPricingGroupOptions[j].selectedValues(), [{
                                    'id': 0,
                                    'itemId': attribute.attrId(),
                                    'value': aValueLc,
                                    'name': aValueLc,
                                    'itemState': ko.observable('CREATE')
                                }]));

                                if (dummyPricingGroupOptions[j].hasOwnProperty('itemState') && dummyPricingGroupOptions[j].itemState() === 'DELETE') {
                                    dummyPricingGroupOptions[j].itemState('UPDATE');
                                }

                                return;
                            } else {
                                for (var k = 0; k < dummyPricingGroupOptions[j].selectedValues().length; k++) {
                                    if (MetTel.Utils.stricmp(dummyPricingGroupOptions[j].selectedValues()[k].value, aValueLc)) {
                                        dummyPricingGroupOptions[j].selectedValues.splice(k,1);
                                        break;
                                    }
                                }
                                /*
                                */
                                if (dummyPricingGroupOptions[j].selectedValues().length === 0) {
                                    if (dummyPricingGroupOptions[j].hasOwnProperty('itemState') && dummyPricingGroupOptions[j].itemState() !== 'CREATE') {
                                        dummyPricingGroupOptions[j].itemState('DELETE');
                                    } else {
                                        dummyPricingGroupOptions.splice(j,1);
                                    }
                                }
                                return;
                            }
                        }
                    }

                    // If we made it this far, then the category doesn't exist.
                    if (newValue === true) {
                        dummyPricingGroupOptions.push({
                            name: ko.observable(aKeyLc),
                            type: 'ATTRIBUTES',
                            id: attribute.id() || 0,
                            selectedValues: ko.observableArray([{
                                'id': 0,
                                'itemId': attribute.attrId(),
                                'value': aValueLc,
                                'name': aValueLc,
                                'itemState': ko.observable('CREATE')
                            }])
                        });
                    }
                });
            });

        });

        for (var key in attributeMap) {
            var allChoices = attributeMap[key];
            attributeMap[key] = [];

            /*jshint -W083 */
            $.each(allChoices, function (i, o) {
                var exists = false;
                for (var idx = 0; idx < attributeMap[key].length; idx++) {
                    if (MetTel.Utils.stricmp(attributeMap[key][idx].name, o.name)) {
                        exists = true;
                    }
                }
                if (!exists) {
                    attributeMap[key].push(o);
                }
            });

            // Get the checked items for this key.
            var count = 0;

            /*jshint -W083 */
            $.each(dummyPricingGroupOptions, function (i, selectedOption) {
                if (MetTel.Utils.stricmp(selectedOption.name(), key)) {
                    $.each(selectedOption.selectedValues(), function (isv, selectedValue) {
                        if (typeof selectedValue.itemState !== 'function' || selectedValue.itemState() !== 'DELETE') {
                            count++;
                        }
                    });
                }
            });

            optionsArray.push({
                name: key,
                originalName: key,
                choices: _.union([{'name': 'All', 'id': -1, 'value': 'All', 'itemId': -1}], attributeMap[key]),
                count: count,
                type: 'skus',
                index: optionGroupIndex++,
                itemState: ko.observable('NOCHANGE')
            });
        }

        // Custom Options

        var customOptions = product.customOptions();

        $.each(customOptions, function (i, optionGroup) {
            if (optionGroup.itemState() === 'DELETE') {
                return;
            }
            var choices = [];
            if (optionGroup.optionGroupTypeId() === 3 || optionGroup.optionGroupTypeId() === 4) {
                return;
            }
            $.each(optionGroup.rows(), function (i, row) {

                if (!(productCatalog.pricingGroupCheckedOptions.customOptions['Custom ' + optionGroup.title()])) {
                    productCatalog.pricingGroupCheckedOptions.customOptions['Custom ' + optionGroup.title()] = {};
                }

                var pricingOptionChecked = productCatalogViewModel.pricingGroupHasOptionChecked(productCatalogViewModel.dummyPricingGroup(), optionGroup.title(), ko.utils.unwrapObservable(row.refProductId) || 0);
                productCatalog.pricingGroupCheckedOptions.customOptions['Custom ' + optionGroup.title()][row.name()] = ko.observable(pricingOptionChecked);

                productCatalog.pricingGroupCheckedOptions.customOptions['Custom ' + optionGroup.title()][row.name()].subscribe(function (newValue, oldValue) {
                    for (var j = 0; j < dummyPricingGroupOptions.length; j++) {

                        if (MetTel.Utils.stricmp(dummyPricingGroupOptions[j].name(), optionGroup.title())) {
                            if (newValue === true) {
                                dummyPricingGroupOptions[j].selectedValues(_.union(dummyPricingGroupOptions[j].selectedValues(), [{
                                    'id': 0,
                                    'itemId': row.id(),
                                    'value': ko.utils.unwrapObservable(row.refProductId) || 0,
                                    'name': row.name(),
                                    'itemState': ko.observable('CREATE')
                                }]));

                                if (dummyPricingGroupOptions[j].hasOwnProperty('itemState') && dummyPricingGroupOptions[j].itemState() === 'DELETE') {
                                    dummyPricingGroupOptions[j].itemState('UPDATE');
                                }

                                return;
                            } else {
                                for (var k = 0; k < dummyPricingGroupOptions[j].selectedValues().length; k++) {
                                    if (parseInt(ko.utils.unwrapObservable(dummyPricingGroupOptions[j].selectedValues()[k].value), 10) === parseInt(row.refProductId(), 10)) {
                                        dummyPricingGroupOptions[j].selectedValues.splice(k,1);
                                    }
                                }


                                if (dummyPricingGroupOptions[j].selectedValues().length === 0) {
                                    if (dummyPricingGroupOptions[j].hasOwnProperty('itemState') && dummyPricingGroupOptions[j].itemState() !== 'CREATE') {
                                        dummyPricingGroupOptions[j].itemState('DELETE');
                                    } else {
                                        dummyPricingGroupOptions.splice(j,1);
                                    }
                                }
                                return;
                            }
                        }
                    }

                    // If we made it this far, then the category doesn't exist.
                    if (newValue === true) {
                        dummyPricingGroupOptions.push({
                            name: ko.observable(optionGroup.title()),
                            id: optionGroup.id() || 0,
                            type: 'OPTIONS',
                            selectedValues: ko.observableArray([{
                                'id': 0,
                                'itemId': row.id(),
                                'value': ko.utils.unwrapObservable(row.refProductId) || 0,
                                'name': row.name(),
                                'itemState': ko.observable('CREATE')
                            }])
                        });
                    }
                });


                choices.push({
                    'id': 0,
                    'itemId': row.id(),
                    'value': ko.utils.unwrapObservable(row.refProductId) || 0,
                    'name': row.name(),
                    'itemState': ko.observable('CREATE')
                });
            });

            // Get the checked items for this key.
            var count = 0;

            /*jshint -W083 */
            $.each(dummyPricingGroupOptions, function (i, selectedOption) {
                if (MetTel.Utils.stricmp(selectedOption.name(), optionGroup.title())) {
                    $.each(selectedOption.selectedValues(), function (isv, selectedValue) {
                        if (typeof selectedValue.itemState !== 'function' || selectedValue.itemState() !== 'DELETE') {
                            count++;
                        }
                    });
                }
            });

            optionsArray.push({
                name: 'Custom ' + optionGroup.title(),
                originalName: optionGroup.title(),
                choices: _.union([{'name': 'All', 'id': -1, 'value': 'All', 'itemId': -1}], choices),
                count: count,
                type: 'customOptions',
                index: optionGroupIndex++,
                itemState: ko.observable(optionGroup.itemState())
            });
        });


        // Template Options

        if (product.templateOptions) {

            var templateOptions = product.templateOptions();

            $.each(templateOptions, function (i, optionGroup) {
                if (optionGroup.itemState() === 'DELETE') {
                    return;
                }
                var choices = [];
                if (optionGroup.optionGroupTypeId() === 3 || optionGroup.optionGroupTypeId() === 4) {
                    return;
                }
                $.each(optionGroup.rows(), function (i, row) {

                    if (row.hidden() === true) {
                        return;
                    }

                    if (!(productCatalog.pricingGroupCheckedOptions.templateOptions['Template ' + optionGroup.title()])) {
                        productCatalog.pricingGroupCheckedOptions.templateOptions['Template ' + optionGroup.title()] = {};
                    }

                    var pricingOptionChecked = productCatalogViewModel.pricingGroupHasOptionChecked(productCatalogViewModel.dummyPricingGroup(), optionGroup.title(), ko.utils.unwrapObservable(row.refProductId) || 0);
                    productCatalog.pricingGroupCheckedOptions.templateOptions['Template ' + optionGroup.title()][row.name()] = ko.observable(pricingOptionChecked);

                    productCatalog.pricingGroupCheckedOptions.templateOptions['Template ' + optionGroup.title()][row.name()].subscribe(function (newValue, oldValue) {
                        for (var j = 0; j < dummyPricingGroupOptions.length; j++) {

                            if (MetTel.Utils.stricmp(dummyPricingGroupOptions[j].name(), optionGroup.title())) {
                                if (newValue === true) {
                                    dummyPricingGroupOptions[j].selectedValues(_.union(dummyPricingGroupOptions[j].selectedValues(), [{
                                        'id': 0,
                                        'itemId': row.id(),
                                        'value': ko.utils.unwrapObservable(row.refProductId) || 0,
                                        'name': row.name(),
                                        'itemState': ko.observable('CREATE')
                                    }]));

                                    if (dummyPricingGroupOptions[j].hasOwnProperty('itemState') && dummyPricingGroupOptions[j].itemState() === 'DELETE') {
                                        dummyPricingGroupOptions[j].itemState('UPDATE');
                                    }

                                    return;
                                } else {
                                    for (var k = 0; k < dummyPricingGroupOptions[j].selectedValues().length; k++) {
                                        if (parseInt(ko.utils.unwrapObservable(dummyPricingGroupOptions[j].selectedValues()[k].value), 10) === parseInt(ko.utils.unwrapObservable(row.refProductId), 10) || 0) {
                                            dummyPricingGroupOptions[j].selectedValues.splice(k,1);
                                        }
                                    }


                                    if (dummyPricingGroupOptions[j].selectedValues().length === 0) {
                                        if (dummyPricingGroupOptions[j].hasOwnProperty('itemState') && dummyPricingGroupOptions[j].itemState() !== 'CREATE') {
                                            dummyPricingGroupOptions[j].itemState('DELETE');
                                        } else {
                                            dummyPricingGroupOptions.splice(j,1);
                                        }
                                    }
                                    return;
                                }
                            }
                        }

                        // If we made it this far, then the category doesn't exist.
                        if (newValue === true) {
                            dummyPricingGroupOptions.push({
                                name: ko.observable(optionGroup.title()),
                                type: 'OPTIONS',
                                id: optionGroup.id() || 0,
                                selectedValues: ko.observableArray([{
                                    'id': 0,
                                    'itemId': row.id(),
                                    'value': ko.utils.unwrapObservable(row.refProductId) || 0,
                                    'name': row.name(),
                                    'itemState': ko.observable('CREATE')
                                }])
                            });
                        }
                    });

                    choices.push({
                        'id': 0,
                        'itemId': row.id(),
                        'value': ko.utils.unwrapObservable(row.refProductId) || 0,
                        'name': row.name(),
                        'itemState': ko.observable('CREATE')
                    });
                });

                // Get the checked items for this key.
                var count = 0;

                /*jshint -W083 */
                $.each(dummyPricingGroupOptions, function (i, selectedOption) {
                    if (MetTel.Utils.stricmp(selectedOption.name(), optionGroup.title())) {
                        $.each(selectedOption.selectedValues(), function (isv, selectedValue) {
                            if (typeof selectedValue.itemState !== 'function' || selectedValue.itemState() !== 'DELETE') {
                                count++;
                            }
                        });
                    }
                });

                optionsArray.push({
                    name: 'Template ' + optionGroup.title(),
                    originalName: optionGroup.title(),
                    choices: _.union([{'name': 'All', 'id': -1, 'value': 'All', 'itemId': -1}], choices),
                    count: count,
                    type: 'templateOptions',
                    index: optionGroupIndex++,
                    itemState: ko.observable(optionGroup.itemState())
                });
            });

        }
        productCatalogViewModel.activeProduct().pricingDataLoaded(true);
        return optionsArray;

    }).extend({notify:'always'});


    /**
     * Used by the Add Federated SKUs (Add from CNet) dialog. Render the additional attributes when a row's
     * disclosure triangle is clicked.
     *
     * @param {HTMLElement} $placeholder
     * @param {Object} rowData
     * @return void
     */
    this.handleExpandedRow = function ($placeholder, rowData) {
        // $placeholder is a div with classname mettel-expanded-grid-row-content that is added into a new table row when the twisty is clicked
        // rowData is the RowModel object, which will contain all the fields for this row

        var attributes = JSON.parse(rowData.Attributes);

        var $attributeTable = $('<div></div>').addClass('mettel-federated-sku-attributes-container'),
            $attributeList = $('<ol></ol>').addClass('mettel-federated-sku-attributes-list');

        $attributeTable.append($attributeList);

        for (var key in attributes) {
            var $attributeKey = $('<div></div>').addClass('mettel-federated-sku-attribute-key'),
                $attributeKeyInner = $('<div></div>').addClass('mettel-federated-sku-attribute-key-inner').text(key),
                $attributeValue = $('<div></div>').addClass('mettel-federated-sku-attribute-value').text(attributes[key]),
                $attributeRow = $('<li></li>').addClass('mettel-federated-sku-attribute');

            $attributeKey.append($attributeKeyInner);
            $attributeRow.append($attributeKey);
            $attributeRow.append($attributeValue);

            $attributeList.append($attributeRow);
        }

        $placeholder.empty().append($attributeTable);
    };


    this.pricingGroupCheckedOptions = {
        "skus": {},
        "customOptions" : {},
        "templateOptions": {}
    };


    /**
     * Returns whether or not a specific option is checked in the current pricing group.
     *
     * @param {Object} group
     * @param {String} name
     * @param {Observable) value
     */
    this.pricingGroupHasOptionChecked = function (group, option, value) {
        for (var i = 0; i < group.options().length; i++) {
            var selectedValues = group.options()[i].selectedValues();
            if (MetTel.Utils.stricmp(group.options()[i].name(), option)) {
                for (var j = 0; j < selectedValues.length; j++) {
                    if (MetTel.Utils.stricmp(selectedValues[j].value, value)) {
                        return true;
                    }
                }
            }

        }

        return false;
    };


    /**
     * Returns a boolean indicating whether all of the requested values
     * are checked in the dummy pricing group.
     *
     * @param {String} name (the name of the category)
     * @param {Array} choices (An array of values to check)
     * @return {Boolean}
     */
    this.allValuesChecked = function (name, choices) {
        var product = productCatalog.activeProduct();
        if (typeof product === 'undefined' || product === null) {
            return false;
        }

        if (!(productCatalogViewModel.dummyPricingGroup() && productCatalogViewModel.dummyPricingGroup().options)) {
            return false;
        }
        var dummyPricingGroupOptions = productCatalogViewModel.dummyPricingGroup().options();

        for (var i = 0; i < dummyPricingGroupOptions.length; i++) {
            if (dummyPricingGroupOptions[i].hasOwnProperty('itemState') && dummyPricingGroupOptions[i].itemState() === 'DELETE') {
                continue;
            }
            if (MetTel.Utils.stricmp(dummyPricingGroupOptions[i].name(), name)) {
                // choices.length - 1 to account for all.
                return dummyPricingGroupOptions[i].selectedValues().length === (choices.length-1);
            }
        }

        return false;
    };


    /**
     * Handles the 'Add All' master checkbox click. Generally adds a list of
     * selected values into the dummy pricing group.
     *
     * @param {String} name (the category, e.g. Colors)
     * @param {Array} options (an array of selected values)
     * @return void
     */
    this.addToPricingGroupOptions = function (name, options, type) {
        var product = productCatalog.activeProduct();
        if (typeof product === 'undefined' || product === null) {
            return false;
        }

        if (!(productCatalogViewModel.dummyPricingGroup() && productCatalogViewModel.dummyPricingGroup().options)) {
            return [];
        }
        var dummyPricingGroupOptions = productCatalogViewModel.dummyPricingGroup().options();

        options.shift();
        for (var i = 0; i < dummyPricingGroupOptions.length; i++) {
            if (MetTel.Utils.stricmp(dummyPricingGroupOptions[i].name(), name)) {
                dummyPricingGroupOptions[i].selectedValues(options);
                if (dummyPricingGroupOptions[i].itemState() !== 'CREATE') {
                    dummyPricingGroupOptions[i].itemState('UPDATE');
                }
                return;
            }
        }
        dummyPricingGroupOptions.push({
            name: ko.observable(name),
            type: type === 'SKUS' ? 'ATTRIBUTES' : 'OPTIONS',
            selectedValues: ko.observableArray(options),
            itemState: ko.observable('CREATE')
        });
    };

    this.removeAllFromPricingGroupOptions = function (name) {
        var product = productCatalog.activeProduct();
        if (typeof product === 'undefined' || product === null) {
            return false;
        }

        if (!(productCatalogViewModel.dummyPricingGroup() && productCatalogViewModel.dummyPricingGroup().options)) {
            return [];
        }
        var dummyPricingGroupOptions = productCatalogViewModel.dummyPricingGroup().options();
        for (var i = 0; i < dummyPricingGroupOptions.length; i++) {
            if (dummyPricingGroupOptions[i].hasOwnProperty('itemState') && dummyPricingGroupOptions[i].itemState() === 'DELETE') {
                continue;
            }
            if (MetTel.Utils.stricmp(dummyPricingGroupOptions[i].name(), name)) {
                if (dummyPricingGroupOptions[i].itemState() === 'CREATE') {
                    dummyPricingGroupOptions.splice(i, 1);
                } else {
                    dummyPricingGroupOptions[i].itemState('DELETE');
                    dummyPricingGroupOptions[i].selectedValues([]);
                }
                return;
            }
        }
    };


    /**
     * Checks whether the dummy pricing group is valid, per the rules laid out
     * in the spec.
     *
     * -> Every required field must have a selected value.
     * -> Pricing group must have at least one unique category
     *    Unique meaning it has an option checked that no other group has.
     *
     * @return {Boolean}
     */
    this.dummyPricingGroupInvalid = function () {

        if (!productCatalogViewModel.activeProduct())  {
            return false;
        }

        if (! productCatalogViewModel.hasOwnProperty('activeProduct'))  {
            return false;
        }

        if (typeof productCatalogViewModel.dummyPricingGroup() === 'undefined') {
            return false;
        }

        var uniqueCategories = {};
        var sellers = productCatalogViewModel.activeProduct().sellers;
        var dummyOptions = productCatalogViewModel.dummyPricingGroup().options();

        // Check for missing required options.

        var skus = productCatalogViewModel.activeProduct().skus();

        for (var a = 0; a < skus.length; a++) {
            var attributes = skus[a].attributes();

            for (var b = 0; b < attributes.length; b++) {
                if (attributes[b].selected()) {

                    var valueOK = false;
                    for (var c = 0; c < dummyOptions.length; c++) {
                        if (MetTel.Utils.stricmp(dummyOptions[c].name(), attributes[b].key()) && dummyOptions[c].selectedValues().length > 0 ) {
                            valueOK = true;
                        }
                    }

                    if (!valueOK) {
                        return 'Missing required option ' + attributes[b].key() + '.';
                    }
                }
            }
        }

        // Check for duplicate pricing group
        // Nested loops ftw

        for (var i = 0; i < dummyOptions.length; i++) {
            var option = dummyOptions[i];
            if (! uniqueCategories.hasOwnProperty(option.name())) {
                uniqueCategories[option.name()] = true; // Unique by default. Sweet!
            }

            for (var j = 0; j < option.selectedValues().length; j++) {
                var selectedValue = option.selectedValues()[j];

                for (var k = 0; k < productCatalogViewModel.activeProduct().sellers().length; k++) {
                    var seller = productCatalogViewModel.activeProduct().sellers()[k];

                    for (var l = 0; l < seller.pricingGroups().length; l++) {
                        var pricingGroup = seller.pricingGroups()[l];

                        if (pricingGroup !== productCatalogViewModel.activeProduct().pricingGroupSelected()) {
                            for (var m = 0; m < pricingGroup.options().length; m++) {
                                var pgOption = pricingGroup.options()[m];

                                for (var n = 0; n < pgOption.selectedValues().length; n++) {
                                    if (pgOption.selectedValues()[n].value === selectedValue) {
                                        uniqueCategories[option.name()] = false;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        var uniques = [];

        for (var key in uniqueCategories) {
            uniques.push(uniqueCategories[key]);
        }

        if (uniques.length && uniques.every(function (o) { return !o; })) {
            return "Cannot duplicate existing pricing group.";
        }

        return false;
    };
}


ko.bindingHandlers.productCatalog = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        productCatalogViewModel = viewModel;

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.queryParams(options.queryParams);
        }

        // Load product types
        productCatalogViewModel.productTypes = new productCatalogViewModel.ProductTypes();

        // Load sellers
        $.getJSON(viewModel.endPoints.sellers, function (data) {
            viewModel.allSellers(data);
        });

        viewModel.updateLocation = function (state) {
            if (state.hasOwnProperty('category')) {
                if (state.hasOwnProperty('subcategory')) {
                    this.loadCategory(state.category, state.subcategory);
                } else {
                    this.loadCategory(state.category);
                }
                $('.mettel-product-catalog-menu > *').trigger('mouseout');
            } else if (state.hasOwnProperty('product')) {
                this.loadProduct(state.product);
                setTimeout(function ( ){
                if (state.hasOwnProperty("tab")) {
                    this.loadTab(state.tab);
                }}.bind(this), 500);
            } else {
                this.initializeState();
            }
        };

        viewModel.lookupSubcategory = function (subcategories, subcategoryId) {
            for(var i = 0; i < subcategories.length; i++) {
                if (subcategories[i].id === parseInt(subcategoryId, 10)) {
                    return i;
                }
            }
            return 0;
        };

        viewModel.lookupCategoryFromSubcategory = function ( subcategoryId )
        {
            var categories = this.categories();
            for (var i = 0; i < categories.length; i++) {
                var subcategories = categories[i].subcategories();
                for (var j = 0; j < subcategories.length; j++) {
                    if (subcategories[j].id === subcategoryId) {
                        return categories[i].id;
                    }
                }
            }

            return null;
        };

        viewModel.loadCategory = function (categoryId, subcategoryId, dontLoad) {
            var categories = this.categories();

            $.each(categories, function (index, category) {
                if (category.id === parseInt(categoryId, 10)) {

                    // If the category's first subcategory isn't already selected
                    this.falsifyCategorySelectedObservables();

                    category.selected(true);

                    if (dontLoad) {
                        category.subcategories()[this.lookupSubcategory(category.subcategories(), subcategoryId)].dontInit(true);
                    }

                    category.subcategories()[this.lookupSubcategory(category.subcategories(), subcategoryId)].selected(true);

                } else {
                    category.selected(false);
                }
            }.bind(this));

            // category id 1 is always wireless. until we add a property on each category for default view, this is how we are defaulting wireless to thumbnail view
            if (typeof productCatalogViewModel !== 'undefined') {
                if (categoryId === '1') {
                    productCatalogViewModel.thumbnailView(true);
                }
            }
        };

        viewModel.loadProduct = function (productId) {
            productCatalogViewModel.productCatalogLoading(true);

            this.activeSubcategory(null);

            var currentProduct = new ProductModel({
                productCatalogModel: this,
                productId: productId
            });

            currentProduct.getProductData(function ( ) {
                // Load the appropriate category for this product.
                var subcategoryId = currentProduct.parentSubcategoryId();
                var categoryId = this.lookupCategoryFromSubcategory(subcategoryId);
                if (categoryId !== null)
                {
                    this.loadCategory(categoryId, subcategoryId, true);
                } else {
                    console.log("Error: Subcategory " + subcategoryId + " does not exist.");
                }

            }.bind(this));
        };

        viewModel.loadTab = function (tabIndex) {
            $(".mettel-product-tab-container .mettel-tab-item:eq(" + tabIndex + ") .mettel-link").click();
        };

        viewModel.initializeState = function ( ) {
            this.falsifyCategorySelectedObservables();
            this.activeSubcategory(null);
            this.deactivateProduct();
        };


        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'product-catalog',
                data: viewModel
            }
        }, bindingContext);

        return {controlsDescendantBindings: true};
    }
};


ko.bindingHandlers.productSaveConfirmationModal = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $modal = $(element),
            modalOptions = {
                initCallback: function () {
                    var $overlay = $modal.closest('.mettel-modal-overlay');
                    $overlay.attr('data-mettel-class', 'product-modal');
                },
                close: function () {
                    viewModel.saveSuccessful(false);
                }
            };

        if (viewModel.saveSuccessful()) {
            $modal.modalWindow(modalOptions);
        }
    }
};


ko.bindingHandlers.updateItemOrderAndState = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var index = valueAccessor()(),
            item = viewModel;

        // Only need to update if the item has a sort order
        // and confirm it's not a template option
        if (item.sortOrder && !bindingContext.$parent.fromTemplate) {

            // Update sort order based on its position in the foreach
            item.sortOrder(index);

            // Update the item state if necessary
            if (item.itemState() !== 'DELETE' && item.itemState() !== 'CREATE') {

                if (item.sortOrder() !== item.originalSortOrder) {
                    item.itemState('UPDATE');
                } else if (!item.fileDataUrl) { // For thumbnails, if the image has been edited, don't mark as NOCHANGE
                    item.itemState('NOCHANGE');
                }
            }
        }
    }
};

ko.bindingHandlers.addProductImgInput = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $input = $(element),
            triggerAddThumbnail = function (dataURL, fileName) {
                viewModel.addThumbnail(dataURL, fileName);
            };

        $input.on('focus', function() {
            $(this).parent().addClass('mettel-add-product-image-container-focused');
        });

        $input.on('blur', function() {
            $(this).parent().removeClass('mettel-add-product-image-container-focused');
        });

        // When the user chooses an image to upload
        $input.change(function (e) {
            MetTel.Utils.extractNewImage(e, this, triggerAddThumbnail);
        });
    }
};

ko.bindingHandlers.editProductImgInput = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $input = $(element),
            vmThumbnail = viewModel,
            triggerEditThumbnail = function (dataURL, fileName) {
                vmThumbnail.editThumbnail(dataURL, fileName);
            };

        // When the user chooses an image to upload
        $input.change(function (e) {
            MetTel.Utils.extractNewImage(e, this, triggerEditThumbnail);
        });
    }
};

ko.bindingHandlers.deleteAttributeModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            attribute = viewModel,
            productModel = bindingContext.$parent,
            $modal = $element.next('[data-mettel-class="product-delete-attribute-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-attribute-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-attribute-delete"]');

        $element.click(function () {

            // Open the modal with focus on the confirm button
            $modal.modalWindow();
            $confirm.focus();
        });

        $confirm.click(function () {
            // Remove the attribute and close the modal
            productModel.removeAttribute(attribute);
            $modal.modalWindow('close');
        });

        $cancel.click(function () {
            // Only close the modal
            $modal.modalWindow('close');
        });
    }
};

ko.bindingHandlers.addProductAttribute = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            productModel = viewModel;

        $element.click(function () {

            // Add a new attribute
            productModel.addAttribute();

            // Find the input for that new attribute and give it focus
            var $lastInput = $element.prev('[data-mettel-class="product-attribute"]').find('.mettel-search-input');
            $lastInput.focus();
        });
    }
};

ko.bindingHandlers.purchasableTooltipController = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $indicator = $(element),
            $tooltip = $indicator.children('[data-mettel-class="product-purchasable-requirements-tooltip"]');

        $indicator.on({
            'mouseenter': function () {
                $tooltip.show();
            },
            'mouseleave': function () {
                $tooltip.hide();
            }
        });
    }
};

ko.bindingHandlers.availabilityEntryModal = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $modal = $(element),
            $addItemsButton = $modal.find('[data-mettel-class="add-availability-items"]'),
            $formInner = $modal.find('[data-mettel-class="availability-form-inner"]'),
            $okButton = $modal.find('[data-mettel-class="save-availability-entry"]'),
            $typesSelect = $modal.find('[data-mettel-class="availability-type"]'),
            vmAvailabilityOption = viewModel,
            vmProduct = bindingContext.$parent,
            vmProductCatalog = bindingContext.$root,
            value = valueAccessor(),
            valueUnwrapped = ko.unwrap(value),
            modalOptions = {};

        // Fixes a bug where the <form> element disappears from the markup
        // because it's initially in the markup inside another <form> element
        modalOptions.initCallback = function () {
             if (!$formInner.parent('[data-mettel-class="new-availability-entry-form"]').length) {
                 $formInner.wrap('<form data-mettel-class="new-availability-entry-form"></form>');
             }

            // when modal is loaded, the type is not yet set
            setTimeout(function() {
                $.uniform.update($typesSelect);
            },
            1);
        };

        modalOptions.close = function () {
            vmProduct.currentAvailabilityObject(undefined);
            $modal.parents('.mettel-modal-overlay').remove();
        };

        $modal.modalWindow(modalOptions);

        // BP-2946, check to see if the availability option already exists
        var optionAlreadyExists = function (strItem) {
            var upperCaseOptions = vmAvailabilityOption.items().map(function (option) {
                return option.toUpperCase();
            });
            var exists = upperCaseOptions.indexOf(strItem.toUpperCase()) > -1;
            if (exists) {
                return true;
            }

            _.each(vmProduct.availability(), function (availability) {
                if (exists) {
                    return;
                }
                if (availability.itemState() !== "DELETE" && availability.typeId() === vmAvailabilityOption.typeId()) {
                    var upperCaseOptions = availability.items().map(function (option) {
                        return option.toUpperCase();
                    });
                    exists = upperCaseOptions.indexOf(strItem.toUpperCase()) > -1;
                }
            });

            return exists;
        };

        $addItemsButton.click(function(e) {
            e.preventDefault();  // Prevent form submission

            // convert comma separated list into array
            var arrItems = vmAvailabilityOption.itemsText().split(',');

            // add each item
            _.each(arrItems, function(item) {
                var strItem = item.trim();

                if (strItem !== "" && !optionAlreadyExists(strItem)) { // BP-2946, adds only when the option does not exist
                    vmAvailabilityOption.items.push(strItem);
                }
            });

            // empty out the text field
            vmAvailabilityOption.itemsText('');
        });

        $okButton.click(function (e) {
            e.preventDefault();  // Prevent form submission

            var postURL = vmProductCatalog.endPoints.validateAvailibility,
                jsAvailabilityOption = ko.mapping.toJS(vmAvailabilityOption),
                jsAvailabilityOptionItemsArray = jsAvailabilityOption.items, //Save items array before request
                strToSend = JSON.stringify(jsAvailabilityOption); // prep the object to send

            // check validity of availability by posting to server
            $.ajax({
                type: "POST",
                url: postURL,
                data: strToSend,
                contentType: 'application/json',
                success: function (returnedObj) {
                    // Populate values (action returns boolean array with the same size)
                    for(var i = 0; i < returnedObj.length; i++) {
                        returnedObj[i].value = jsAvailabilityOptionItemsArray[i];
                    }

                    var arrSorted = _.sortBy(returnedObj, 'isValid'), // invalid items to the front
                        arrItems = vmAvailabilityOption.items,
                        arrInvalidItems = vmProduct.currentAvailabilityObjectInvalidItems;

                    arrInvalidItems.removeAll();

                    // push any invalid items into our array
                    _.each(arrSorted, function(item) {
                        if (item.isValid === false) {
                            arrInvalidItems.push(item.value);
                        }
                    });

                    // if no invalid items, save to the model and close the modal
                    if (arrInvalidItems().length === 0) {

                        var strCurrentAvailabilityObjectType = vmProduct.currentAvailabilityObjectType();

                        // creating new availability entry
                        if (strCurrentAvailabilityObjectType === 'new') {
                            vmProduct.availability.push(vmAvailabilityOption);
                        }
                        // editing existing availability entry
                        else {
                            vmAvailabilityOption.itemState('UPDATE');
                            vmProduct.availability.replace(vmProduct.availability()[vmProduct.currentAvailabilityObjectIndex()], vmAvailabilityOption);
                        }

                        $modal.modalWindow('close', modalOptions);
                    }
                    // if there are invalid items, add them all to the model and keep the modal open
                    else {
                        arrItems.removeAll();
                        arrItems(_.pluck(arrSorted, 'value'));
                    }

                },
                dataType: 'json'
            })
            .fail(function (data, textStatus, xhr) {
                // error logic

                console.group();
                console.log("Error sending");
                console.log("data", data);
                console.log("textStatus", textStatus);
                console.log("xhr", xhr);
                console.groupEnd();

                productCatalogViewModel.productCatalogLoading(false);
            });
        });
    }
};


ko.bindingHandlers.newOptionGroupModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $addButton = $(element),
            $modal = $addButton.next('[data-mettel-class="product-add-option-group-modal"]'),
            $formInner = $modal.find('[data-mettel-class="new-option-group-form-inner"]'),
            $okButton = $modal.find('[data-mettel-class="save-new-option-group"]'),
            product = viewModel,
            modalOptions = {};

        // Fixes a bug where the <form> element disappears from the markup
        // because it's initially in the markup inside another <form> element
        modalOptions.initCallback = function () {
            if (!$formInner.parent('[data-mettel-class="new-option-group-form"]').length) {
                $formInner.wrap('<form data-mettel-class="new-option-group-form"></form>');
                var $overlay = $modal.closest('.mettel-modal-overlay');
                $overlay.attr('data-mettel-class', 'product-modal');
            }
        };

        modalOptions.close = function () {
            product.resetNewOptionGroup();
        };

        $addButton.click(function () {
            $modal.modalWindow(modalOptions);

            // Select multiple choice initially
            var $typeInputToSelect = $modal.find('#mettel-new-option-group-radio-multiple-choice');
            $typeInputToSelect.prop( "checked", true );
        });

        $okButton.click(function (e) {
            e.preventDefault();  // Prevent form submission
            product.addNewOptionGroup();
            $modal.modalWindow('close', modalOptions);
        });
    }
};

ko.bindingHandlers.editOptionGroupModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $editButton = $(element),
            $modal = $editButton.next('[data-mettel-class="edit-option-group-modal"]'),
            $formInner = $modal.find('[data-mettel-class="new-option-group-form-inner"]'),
            $okButton = $modal.find('[data-mettel-class="save-new-option-group"]'),
            optionGroup = viewModel,
            product = bindingContext.$parent,
            modalOptions = {};

        // Fixes a bug where the <form> element disappears from the markup
        // because it's initially in the markup inside another <form> element
        modalOptions.initCallback = function () {
            if (!$formInner.parent('[data-mettel-class="new-option-group-form"]').length) {
                $formInner.wrap('<form data-mettel-class="new-option-group-form"></form>');
            }
        };

        modalOptions.close = function () {
            product.resetNewOptionGroup();
        };

        $editButton.click(function () {

            product.populateEditableOptions(optionGroup);

            // Check correct type and update the combo boxes
            var typeInputId = '#edit-option-group-radio-' + product.returnOptionGroupTypeFromId(optionGroup.optionGroupTypeId()).replace(' ', '-'),
                $typeInputToSelect = $modal.find(typeInputId),
                $categorySelect = $modal.find('#edit-option-group-category'),
                $subcategorySelect = $modal.find('#edit-option-group-subcategory'),
                $quantitySelect = $modal.find('#edit-option-group-quantity');

            $typeInputToSelect.prop( "checked", true );
            $.uniform.update($categorySelect[0]);
            $.uniform.update($subcategorySelect[0]);
            $.uniform.update($quantitySelect[0]);

            $modal.modalWindow(modalOptions);
        });

        $okButton.click(function (e) {
            e.preventDefault();  // Prevent form submission
            product.editOptionGroup(optionGroup);
            $modal.modalWindow('close', modalOptions);
        });
    }
};

ko.bindingHandlers.deleteOptionGroupModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            optionGroup = viewModel,
            $modal = $element.next('[data-mettel-class="delete-option-group-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-option-group-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-option-group-delete"]');

        $element.click(function () {

            // Open the modal with focus on the confirm button
            $modal.modalWindow();
            $confirm.focus();
        });

        $confirm.click(function () {
            var product = productCatalogViewModel.activeProduct();

            // Set the option group state to 'DELETE' and close the modal
            optionGroup.itemState('DELETE');

            // Go remove it from the pricing groups
            if (product.isTemplate()) {
                $.post(
                    productCatalogViewModel.endPoints.removeTemplateOption,
                    {
                        productId: product.id(),
                        templateOptionId: optionGroup.id()
                    }
                );
            } else {
                $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                    if (!seller) {
                        return;
                    }
                    if (seller.itemState() === 'DELETE') {
                        return;
                    }
                    $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ipg, pricingGroup) {
                        var pg = pricingGroup;
                        if (!pricingGroup) {
                            return;
                        }
                        if (pricingGroup.itemState() === 'DELETE') {
                            return;
                        }
                        $.each(ko.utils.unwrapObservable(pricingGroup.options) , function (io, option) {
                            if (!option) {
                                return;
                            }
                            if (option.itemState() === 'DELETE') {
                                return;
                            }
                            if (ko.utils.unwrapObservable(option.type) === 'OPTIONS' && MetTel.Utils.stricmp(optionGroup.title, option.name)) {
                                pricingGroup.externallyModified(true);
                                option.itemState('DELETE');
                            }
                        });
                    });
                });
            }

            product.updateSingleSku(product.updateSingleSku()+1);
            $modal.modalWindow('close');
        });

        $cancel.click(function () {
            // Only close the modal
            $modal.modalWindow('close');
        });
    }
};

ko.bindingHandlers.updateOptionGroupRowsModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            optionGroup = viewModel,
            product = bindingContext.$parent,
            $modal = $element.siblings('[data-mettel-class="option-group-options-modal"]'),
            $formInner = $modal.find('[data-mettel-class="option-group-options-form-inner"]'),
            $submit,
            $confirm,
            modalOptions = {
                close: function () {
                    product.clearOptionsGrid();
                }
            };

        // Fixes a bug where the <form> element disappears from the markup
        // because it's initially in the markup inside another <form> element
        modalOptions.initCallback = function () {
            if (!$formInner.parent('[data-mettel-class="option-group-options-form"]').length) {
                $formInner.wrap('<form data-mettel-class="option-group-options-form"></form>');
            }
        };

        $element.click(function () {
            product.optionGroupNeedsConfirm(false);
            $modal.modalWindow(modalOptions);
            product.instantiateOptionsGrid(optionGroup);

            function applyChanges () {
                var selectedRows = product.optionsGrid.selectedRows();

                $.each(optionGroup.products(), function (i, existingOption) {

                    var doesNotMatch = true;

                    // Compare it to the newly selected rows
                    $.each(selectedRows, function (j, selectedOption) {

                        if (existingOption.refProductId() === selectedOption.data().ProductID) {

                            // If it does match one of the newly selected rows,
                            // mark it to not be removed
                            doesNotMatch = false;
                            return false;
                        }
                    });

                    // If it's not selected,
                    // and if it's not newly created
                    if (doesNotMatch && existingOption.itemState() !== 'CREATE') {

                        // Mark it as deleted and store it
                        existingOption.itemState('DELETE');
                    }
                });

                optionGroup.updateOptions(product.optionsGrid.selectedRows());
                $modal.modalWindow('close', modalOptions);
            }

            // Keeping this code in the element click handler
            // because the confirm button is removed from DOM when the modal is closed
            $submit = $modal.find('[data-mettel-class="option-group-options-submit"]');
            $confirm = $modal.find('[data-mettel-class="option-group-options-confirm"]');
            $submit.click(function (e) {
                var selectedRows = product.optionsGrid.selectedRows(),
                    pgsAffected = false;
                e.preventDefault();  // Prevent form submission

                // Generate a list of removed checkboxes
                if (!selectedRows) { return false; }

                // First capture all existing options that are not selected
                var noLongerSelected = [];

                $.each(optionGroup.products(), function (i, existingOption) {

                    var doesNotMatch = true;

                    // Compare it to the newly selected rows
                    $.each(selectedRows, function (j, selectedOption) {

                        if (existingOption.refProductId() === selectedOption.data().ProductID) {

                            // If it does match one of the newly selected rows,
                            // mark it to not be removed
                            doesNotMatch = false;
                            return false;
                        }
                    });

                    // If it's not selected,
                    // and if it's not newly created
                    if (doesNotMatch) {

                        // Mark it as deleted and store it
                        noLongerSelected.push(existingOption);
                    }
                });

                if (!product.isTemplate()) {
                    // Check that list against pricing groups
                    $.each(noLongerSelected, function (i_n, existingOption) {
                        var customOptionName = false;

                        $.each(ko.utils.unwrapObservable(product.customOptions), function (ic, customOption) {
                            $.each(ko.utils.unwrapObservable(customOption.products), function (ip, product) {
                                if (ko.utils.unwrapObservable(product.refProductId) === ko.utils.unwrapObservable(existingOption.refProductId)) {
                                    customOptionName = ko.utils.unwrapObservable(customOption.title);
                                    return;
                                }
                            });

                            if (customOptionName) {
                                return;
                            }
                        });

                        if (customOptionName) {
                            $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                                if (!seller) {
                                    return;
                                }
                                if (seller.itemState() === 'DELETE') {
                                    return;
                                }
                                $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ipg, pricingGroup) {
                                    if (!pricingGroup) {
                                        return;
                                    }
                                    if (pricingGroup.itemState() === 'DELETE') {
                                        return;
                                    }
                                    $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                        if (!option) {
                                            return;
                                        }
                                        if (option.itemState() === 'DELETE') {
                                            return;
                                        }
                                        if (ko.utils.unwrapObservable(option.type) === 'OPTIONS' && MetTel.Utils.stricmp(customOptionName, option.name)) {
                                            $.each(ko.utils.unwrapObservable(option.selectedValues), function (isv, selectedValue) {
                                                if (!selectedValue) {
                                                    return;
                                                }
                                                if (selectedValue.itemState() === 'DELETE') {
                                                    return;
                                                }
                                                if (ko.utils.unwrapObservable(existingOption.refProductId) === ko.utils.unwrapObservable(selectedValue.value)) {
                                                    pgsAffected = true;
                                                }
                                            });
                                        }
                                    });
                                });
                            });
                        } else {
                            console.log('Could not find matching custom option for refProductId: ' + ko.utils.unwrapObservable(existingOption.refProductId));
                        }
                    });


                    // Pop a confirmation
                    if (pgsAffected) {
                        product.optionGroupNeedsConfirm(true);
                    } else {
                        applyChanges();
                    }
                } else {
                    var specIds = noLongerSelected.map(function (o) {
                        return ko.utils.unwrapObservable(o.refProductId);
                    }).join(',');

                    // $.get(productCatalogViewModel.endPoints.testRemoveTemplateOptionSpec + '?templateOptionId=' + optionGroup.id() + '&templateOptionSpecIds=' + specIds, function (data) {
                    //     if (data.affectsPricingGroups) {
                    //         product.optionGroupNeedsConfirm(true);
                    //     } else {
                    //         applyChanges();
                    //     }
                    // });
                    // TODO: coordinate with Stephen on new service call to determine if template options affect pricing groups
                    applyChanges();
                }

            });

            $confirm.click(function (e) {
                e.preventDefault();
                applyChanges();
            });
        });
    }
};

ko.bindingHandlers.deleteOptionGroupRowModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            optionGroupRow = viewModel,
            optionGroup = bindingContext.$parent,
            $modal = $element.next('[data-mettel-class="delete-option-group-row-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-option-group-row-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-option-group-row-delete"]');

        $element.click(function () {

            // Open the modal with focus on the confirm button
            $modal.modalWindow();
            $confirm.focus();
        });

        $confirm.click(function () {
            var product = productCatalogViewModel.activeProduct();
            optionGroup.deleteOption(optionGroupRow);

            if (product.isTemplate()) {
                $.post(
                    productCatalogViewModel.endPoints.removeTemplateOptionSpec,
                    {
                        productId: product.id(),
                        templateOptionId: optionGroup.id(),
                        templateOptionSpecId: optionGroupRow.refProductId()
                    }
                );
            } else {
                optionGroup.updatePricingGroups([optionGroupRow], optionGroup);
            }

            $modal.modalWindow('close');
        });

        $cancel.click(function () {
            // Only close the modal
            $modal.modalWindow('close');
        });
    }
};


/**
 * Set the pricing tab initialized observable to true so the template can render.
 *
 * It's false by default for performance reasons.
 */
ko.bindingHandlers.initializePricingTab = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            product = viewModel;

        $element.click(function (e) {
            var currentSelected = product.currentSelected();

            product.currentSelected("");
            product.currentSelected(currentSelected);

            product.pricingTabInitialized(true);
            product.updateSingleSku(product.updateSingleSku()+1);

            /*product.pricingDataLoaded(false);*/
        });
    }
};


/**
 * Show the Add Federated SKUS (Add from CNet) dialog
 */
ko.bindingHandlers.addFederatedSKUs = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            product = viewModel,
            $modal = $element.parent().find('[data-mettel-class="add-federated-skus-modal"]'),
            $formInner = $modal.find('[data-mettel-class="federated-sku-form-inner"]'),
            $searchInput = $modal.find('[data-mettel-class="federated-sku-search-input"]'),
            $addToProduct = $modal.find('[data-mettel-class="modal-add-federated-sku-add"]'),
            $backButton = $modal.find('[data-mettel-class="modal-add-federated-sku-back"]'),
            modalOptions = {};

        // Fixes a bug where the <form> element disappears from the markup
        // because it's initially in the markup inside another <form> element
        modalOptions.initCallback = function () {
            if (!$formInner.parent('[data-mettel-class="new-sku-form"]').length) {
                $formInner.wrap('<form data-mettel-class="new-sku-form"></form>');
            }

            product.instantiateFederatedSkusGrid();
        };


        /**
         * Main click handler. Shows the dialog and sets the search input focus.
         *
         * @return void
         */
        $element.click(function () {

            $modal.modalWindow(modalOptions);

            $searchInput.focus();
        });

        /**
         * Handles the back button click
         *
         * @param {Event} e
         * @return void
         */
        $backButton.click(function (e) {
            e.preventDefault();

            // If the user has searched, reset the grid
            if (productCatalogViewModel.federatedSKUSearch()) {
                product.resetFederatedSkusGrid();
            }

            $modal.modalWindow('close', modalOptions);
        });

        /**
         * Add to product click handler.
         *
         * Iterate over all the selected rows and create a new custom
         * SKU for each one.
         *
         * @param {Event} e
         * @return void
         */
        $addToProduct.click(function (e) {
            e.preventDefault();

            var selectedSkus = productCatalogViewModel.activeProduct().federatedSkusGrid.selectedRows();

            $.each(selectedSkus, function (i, sku) {
                // Extract the attribute map
                var skuAttributes = JSON.parse(sku.data().Attributes);

                if (sku.data().ImageURLList) {
                    var imageURLs = sku.data().ImageURLList.split(',');

                    $.each(imageURLs, function (i, o) {
                        product.addThumbnailAsURI(o.trim(), sku.data().SKU);
                    });
                }

                // Create the new SKU
                var newSKU = {
                    "id": ko.observable(0),
                    "sku": ko.observable(sku.data().SKU),
                    "itemState": ko.observable('CREATE'),
                    "attributes": ko.observableArray([]),
                    "checkedAttrsString": ko.observable(),
                    "fromCnet": ko.observable(true)
                };

                newSKU.duplicate = ko.computed(function () {
                    return product.isSKUDuplicate(newSKU);
                });

                var attributes = newSKU.attributes();

                // Iterate over the base attributes and add them.
                for (var key in skuAttributes) {
                    var newAttribute = {
                        "id": ko.observable(0),
                        "attrId": ko.observable(0),
                        "key": ko.observable(key),
                        "value": ko.observable(skuAttributes[key]),
                        "selected": ko.observable(false),
                        "itemState": ko.observable('CREATE')
                    };

                    attributes.push(newAttribute);
                }

                newSKU.attributes(attributes);

                // Save
                var SKUs = product.skus();
                SKUs.push(newSKU);
                product.skus(SKUs);

                // Fix the checkboxes
                if (product.skus().length > 0) {
                    product.UpdateCheckboxes(product.skus()[0]);
                }
            });

            // Reset the grid.
            product.resetFederatedSkusGrid();

            $modal.modalWindow('close', modalOptions);
        });
    }
};


/**
 * Add a custom SKU from a dialog.
 */
ko.bindingHandlers.addCustomSKU = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            product = viewModel,
            $modal = $('[data-mettel-class="add-custom-sku-modal"]'),
            $formInner = $modal.find('[data-mettel-class="new-sku-form-inner"]'),
            $confirm = $modal.find('[data-mettel-class="modal-add-sku-add"]'),
            modalOptions = {};

        // Fixes a bug where the <form> element disappears from the markup
        // because it's initially in the markup inside another <form> element
        modalOptions.initCallback = function () {
            if (!$formInner.parent('[data-mettel-class="new-sku-form"]').length) {
                $formInner.wrap('<form data-mettel-class="new-sku-form"></form>');
                var $overlay = $modal.closest('.mettel-modal-overlay');
                $overlay.attr('data-mettel-class', 'product-modal');
            }
        };

        modalOptions.close = function () {
            // Clear input on close
            product.newSKUName("");
        };

        $element.click(function () {
            $modal.modalWindow(modalOptions);
        });

        $confirm.click(function (e) {

            e.preventDefault();  // Prevent form submission

            var newSKU = {
                "id": ko.observable(0),
                "sku": ko.observable(product.newSKUName()),
                "name": ko.observable(product.newSKUName()),
                "itemState": ko.observable('CREATE'),
                "attributes": ko.observableArray([]),
                "checkedAttrsString": ko.observable()
            };

            newSKU.duplicate = ko.computed(function () {
                return product.isSKUDuplicate(newSKU);
            });

            var SKUs = product.skus();
            SKUs.push(newSKU);
            product.skus(SKUs);

            $modal.modalWindow('close', modalOptions);
        });
    }
};


/**
 * Clone (duplicate) custom SKU.
 */
ko.bindingHandlers.cloneCustomSKU = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            sku = viewModel,
            product = bindingContext.$parent,
            $modal = $element.parent().find('[data-mettel-class="clone-custom-sku-modal"]'),
            $formInner = $modal.find('[data-mettel-class="new-sku-form-inner"]'),
            $confirm = $modal.find('[data-mettel-class="modal-sku-submit"]'),
            modalOptions = {};

        modalOptions.initCallback = function () {
            // Fixes a bug where the <form> element disappears from the markup
            // because it's initially in the markup inside another <form> element
            if (!$formInner.parent('[data-mettel-class="new-sku-form"]').length) {
                $formInner.wrap('<form data-mettel-class="new-sku-form"></form>');
            }

            // Every time the modal opens, reset the value in the input to be the current sku name
            product.newSKUName(sku.sku());
        };

        modalOptions.close = function () {
            // Clear input on close
            product.newSKUName("");
        };

        $element.click(function () {
            $modal.modalWindow(modalOptions);
        });

        $confirm.click(function (e) {

            e.preventDefault();  // Prevent form submission

            // Create the 'new' SKU
            var newSKU = {
                "id": ko.observable(0),
                "sku": ko.observable(product.newSKUName()),
                "name": ko.observable(product.newSKUName()),
                "itemState": ko.observable('CREATE'),
                "attributes": ko.observableArray([]),
                "checkedAttrsString": ko.observable(),
                "SKUErrors": sku.SKUErrors
            };

            newSKU.duplicate = ko.computed(function () {
                return product.isSKUDuplicate(newSKU);
            });

            // Copy all the attributes.
            var attrs = sku.attributes();
            var newAttrs = [];

            for (var i = 0; i < attrs.length; i++) {
                var attr = {
                    "id": ko.observable(0),
                    "attrId": ko.observable(attrs[i]['attrId']()),
                    "key": ko.observable(attrs[i]['key']()),
                    "value": ko.observable(attrs[i]['value']()),
                    "selected": ko.observable(attrs[i]['selected']()),
                    "itemState": ko.observable('CREATE')
                };

                newAttrs.push(attr);
            }

            newSKU.attributes(newAttrs);

            $.each(newSKU.attributes(), function (i, attr) {
                attr.selected.subscribe(function (checked) {
                    productCatalogViewModel.activeProduct().UpdateCheckboxes(newSKU);
                });
                attr.originalSelectedValue = attr.selected();  // For comparison later for itemState
            });

            newSKU.duplicate = ko.computed(function () {
                return product.isSKUDuplicate(newSKU);
            });

            // Add the new SKU
            var SKUs = product.skus();
            SKUs.push(newSKU);
            product.skus(SKUs);

            $modal.modalWindow('close', modalOptions);
        });
    }
};


/**
 * Edit a custom SKU
 */
ko.bindingHandlers.editCustomSKU = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            sku = viewModel,
            product = bindingContext.$parent,
            $modal = $element.parent().find('[data-mettel-class="edit-custom-sku-modal"]'),
            $formInner = $modal.find('[data-mettel-class="new-sku-form-inner"]'),
            $confirm = $modal.find('[data-mettel-class="modal-sku-submit"]'),
            modalOptions = {};

        modalOptions.initCallback = function () {
            // Fixes a bug where the <form> element disappears from the markup
            // because it's initially in the markup inside another <form> element
            if (!$formInner.parent('[data-mettel-class="new-sku-form"]').length) {
                $formInner.wrap('<form data-mettel-class="new-sku-form"></form>');
            }

            // Every time the modal opens, reset the value in the input to be the current sku name
            product.newSKUName(sku.sku());
        };

        modalOptions.close = function () {
            // Clear input on close
            product.newSKUName("");
        };

        $element.click(function () {
            $modal.modalWindow(modalOptions);
        });

        $confirm.click(function (e) {

            e.preventDefault();  // Prevent form submission

            sku.sku(product.newSKUName());
            $modal.modalWindow('close', modalOptions);
        });
    }
};


/**
 * Delete custom SKU
 */
ko.bindingHandlers.deleteCustomSKU = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            sku = viewModel,
            $modal = $element.parent().find('[data-mettel-class="delete-sku-group-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-sku-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-sku-delete"]');

        $element.click(function () {
            $modal.modalWindow();
            $confirm.focus();
        });

        $confirm.click(function () {
            // If it's a new element and we haven't saved the product yet, we can
            // safely just delete it. Otherwise the server already knows about it,
            // so we have to mark it as DELETE.
            if (sku.itemState() === "CREATE") {
                var product = bindingContext.$parent;
                var skus = product.skus();

                for (var i = 0; i < skus.length; i++) {
                    if (skus[i] === sku) {
                        skus.splice(i, 1);
                        break;
                    }
                }

                product.skus(skus);
            } else {
                sku.itemState("DELETE");
            }

            // Walk the SKU Attributes one by one, removing any attributes not present on other SKUs
            // from the affected pricing groups.
            $.each(ko.utils.unwrapObservable(sku.attributes), function (ia, attribute) {
                var attributeKeyExists = false,
                    attributeValueExists = false;
                if (!attribute) {
                    return;
                }
                if (attribute.itemState() === 'DELETE') {
                    return;
                }

                attribute.itemState('DELETE');

                // Walk all the skus
                $.each(ko.utils.unwrapObservable(productCatalogViewModel.activeProduct().skus), function (ips, pSku) {
                    if (!pSku) {
                        return;
                    }
                    if (pSku.itemState() === 'DELETE') {
                        return;
                    }
                    if (ko.utils.unwrapObservable(pSku.sku) !== ko.utils.unwrapObservable(sku.sku)) {
                        $.each(ko.utils.unwrapObservable(pSku.attributes), function (ipa, pAttribute) {
                            if (!pAttribute) {
                                return;
                            }
                            if (pAttribute.itemState() === 'DELETE') {
                                return;
                            }
                            if (MetTel.Utils.stricmp(pAttribute.key, attribute.key)) {
                                attributeKeyExists = true;

                                if (MetTel.Utils.stricmp(pAttribute.value, attribute.value)) {
                                    attributeValueExists = true;
                                }
                            }
                        });
                    }
                });

                if (!attributeKeyExists || !attributeValueExists) {
                    // Go remove this attribute from any related pricing groups
                    $.each(ko.utils.unwrapObservable(productCatalogViewModel.activeProduct().sellers), function (is, seller) {
                        if (!seller) {
                            return;
                        }
                        if (seller.itemState() === 'DELETE') {
                            return;
                        }
                        $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                            if (!pricingGroup) {
                                return;
                            }
                            if (pricingGroup.itemState() === 'DELETE') {
                                return;
                            }
                            $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                if (!option) {
                                    return;
                                }
                                if (typeof option.itemState === "undefined") {
                                    return;
                                }
                                if (option.itemState() === 'DELETE') {
                                    return;
                                }

                                if (MetTel.Utils.stricmp(option.name, attribute.key)) {
                                    if (!attributeKeyExists) {

                                        // If the whole key doesn't exist, wipe out it and all of its selected values.
                                        option.itemState('DELETE');
                                        $.each(ko.utils.unwrapObservable(option.selectedValues), function (isv, selectedValue) {
                                            if (!selectedValue) {
                                                return;
                                            }
                                            if (typeof selectedValue.itemState !== 'function') {
                                                selectedValue.itemState = ko.observable('CREATE');
                                            }
                                            selectedValue.itemState('DELETE');

                                            pricingGroup.externallyModified(true);
                                        });
                                    } else if (!attributeValueExists) {

                                        // Otherwise if the value doesn't exist, delete the associated selectedValue.
                                        $.each(ko.utils.unwrapObservable(option.selectedValues), function (isv, selectedValue) {
                                            if (!selectedValue) {
                                                return;
                                            }
                                            if (typeof selectedValue.itemState !== 'function') {
                                                selectedValue.itemState = ko.observable('CREATE');
                                            }
                                            if (selectedValue.itemState() === 'DELETE') {
                                                return;
                                            }
                                            if (MetTel.Utils.stricmp(selectedValue.value, attribute.value)) {
                                                selectedValue.itemState('DELETE');
                                                pricingGroup.externallyModified(true);
                                            }
                                        });
                                    }
                                }
                            });
                        });
                    });
                }
            });

            // if the sku came from cnet, delete its thumbnails
            if (typeof sku.fromCnet !== "undefined") {
                _.each(productCatalogViewModel.activeProduct().thumbnails(), function(thumbnail) {
                    // only skus that come from cnet will have a .sku()
                    if (typeof thumbnail.sku !== "undefined") {
                        if (MetTel.Utils.stricmp(thumbnail.sku(), sku.sku())) {
                            thumbnail.itemState("DELETE");
                        }
                    }
                });
            }

            productCatalogViewModel.activeProduct().updateSingleSku(productCatalogViewModel.activeProduct().updateSingleSku()+1);
            $modal.modalWindow('close');
        });

        $cancel.click(function () {
            $modal.modalWindow('close');
        });
    }
};


/**
 * Add new SKU Attribute.
 */
ko.bindingHandlers.addSKUAttribute = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            sku = viewModel,
            product = bindingContext.$parent,
            $modal = $('.mettel-sku-groups-container').find('.mettel-product-add-sku-attribute-modal'),
            $formInner = $modal.find('[data-mettel-class="sku-attribute-form-inner"]'),
            $confirm = $modal.find('[data-mettel-class="modal-sku-attribute-submit"]'),
            modalOptions = {};

        modalOptions.initCallback = function () {
            // Fixes a bug where the <form> element disappears from the markup
            // because it's initially in the markup inside another <form> element
            if (!$formInner.parent('[data-mettel-class="sku-attribute-form"]').length) {
                $formInner.wrap('<form data-mettel-class="sku-attribute-form"></form>');
            }
        };

        $element.click(function () {
            $modal.modalWindow(modalOptions);
            product.newSKUAttributeAttrId(null);
            product.newSKUAttributeKey("");
            product.newSKUAttributeValue("");

            $confirm.unbind('click');
            $confirm.click(function (e) {

                e.preventDefault();  // Prevent form submission

                var newAttribute = {
                    "id": ko.observable(0),
                    "attrId": ko.observable(product.newSKUAttributeAttrId() ? product.newSKUAttributeAttrId() : 0),
                    "key": ko.observable(product.newSKUAttributeKey()),
                    "value": ko.observable(product.newSKUAttributeValue()),
                    "selected": ko.observable(false),
                    "itemState": ko.observable('CREATE')
                };

                var attributes = sku.attributes();
                attributes.push(newAttribute);
                sku.attributes(attributes);

                $modal.modalWindow('close');
            });
        });
    }
};


/**
 * Edit SKU Attribute
 */
ko.bindingHandlers.editSKUAttribute = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            attribute = viewModel,
            attrSku = bindingContext.$parents[0].sku(),
            product = bindingContext.$parents[1],
            $modal = $('.mettel-sku-groups-container').find('.mettel-product-edit-sku-attribute-modal'),
            $formInner = $modal.find('[data-mettel-class="sku-attribute-form-inner"]'),
            $confirm = $modal.find('[data-mettel-class="modal-sku-attribute-submit"]'),
            $confirmConfirm = $modal.find('[data-mettel-class="modal-sku-attribute-confirm-submit"]'),
            modalOptions = {};

        attribute.sku = ko.observable(attrSku);

        modalOptions.initCallback = function () {
            // Fixes a bug where the <form> element disappears from the markup
            // because it's initially in the markup inside another <form> element
            if (!$formInner.parent('[data-mettel-class="sku-attribute-form"]').length) {
                $formInner.wrap('<form data-mettel-class="sku-attribute-form"></form>');
            }
        };

        $element.click(function () {
            $modal.modalWindow(modalOptions);
            product.editSKUAttributeAttrId(attribute.attrId());
            product.editSKUAttributeKey(attribute.key());
            product.editSKUAttributeValue(attribute.value());
            product.editSKUAttributeKeyNeedsConfirm(false);

            $confirm.unbind('click');

            function applyChanges() {
                // Update the pricing groups
                if (attribute.value() !== product.editSKUAttributeValue()) {
                    $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                        $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                            $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                if (MetTel.Utils.stricmp(option.name, product.editSKUAttributeKey)) {
                                    $.each(ko.utils.unwrapObservable(option.selectedValues), function (iv, value) {
                                        if (MetTel.Utils.stricmp(value.value, attribute.value)) {
                                            if (!ko.isObservable(value.value)) {
                                                value.value = ko.observable(value.value);
                                            }
                                            if (!ko.isObservable(value.name)) {
                                                value.name = ko.observable(value.name);
                                            }
                                            value.value(product.editSKUAttributeValue());
                                            value.name(product.editSKUAttributeValue());
                                        }
                                    });
                                }
                            });
                        });
                    });
                }

                for (var i = 0; i < product.skus().length; i++) {
                    if (MetTel.Utils.stricmp(product.skus()[i].sku(), attribute.sku())) {
                        var sku = product.skus()[i];

                        if (sku.itemState() !== 'CREATE') {
                            sku.itemState('UPDATE');
                        }

                        product.UpdateCheckboxes(sku);
                    }
                }

                attribute['attrId'](product.editSKUAttributeAttrId() ? product.editSKUAttributeAttrId() : 0);
                attribute['key'](product.editSKUAttributeKey());
                attribute['value'](product.editSKUAttributeValue());
                if (attribute.itemState() !== "CREATE") {
                    attribute.itemState("UPDATE");
                }


                $modal.modalWindow('close');
            }

            $confirm.click(function (e) {

                e.preventDefault();  // Prevent form submission

                // Confirm key change
                if (attribute.key() !== product.editSKUAttributeKey()) {
                    // Check to see if any pricing groups are affected
                    $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                        $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                            $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                                if (MetTel.Utils.stricmp(option.name, attribute.key)) {
                                    product.editSKUAttributeKeyNeedsConfirm(true);
                                }
                            });
                        });
                    });
                }

                // Wait until confirmation
                if (product.editSKUAttributeKeyNeedsConfirm()) {
                    return;
                }

                applyChanges();
            });

            $confirmConfirm.click(function (e) {
                e.preventDefault();

                applyChanges();
            });
        });
    }
};


/**
 * Delete SKU Attribute
 */
ko.bindingHandlers.deleteSKUAttribute = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            attribute = viewModel,
            $modal = $element.parent().find('[data-mettel-class="delete-sku-attribute-row-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-sku-attribute-row-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-sku-attribute-row-delete"]');

        $element.click(function () {
            $modal.modalWindow();
            $confirm.focus();
        });

        function applyChanges() {
            var sku = bindingContext.$parent,
                attributes = sku.attributes(),
                product = productCatalogViewModel.activeProduct();

            if (attribute.hasOwnProperty('itemState')) {
                attribute.itemState('DELETE');
            } else {
                attribute.itemState = ko.observable('DELETE');
            }

            product.UncheckCheckboxes(attribute);

            sku.attributes(attributes);

            // Update the affected pricing groups
            $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                if (!seller) {
                    return;
                }
                if (seller.itemState() === 'DELETE') {
                    return;
                }
                $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                    if (!pricingGroup) {
                        return;
                    }
                    if (pricingGroup.itemState() === 'DELETE') {
                        return;
                    }
                    $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                        if (!option) {
                            return;
                        }
                        if (option.itemState() === 'DELETE') {
                            return;
                        }
                        if (MetTel.Utils.stricmp(option.name, attribute.key)) {
                            option.itemState('DELETE');

                            $.each(ko.utils.unwrapObservable(option.selectedValues), function (isv, selectedValue) {
                                if (MetTel.Utils.stricmp(selectedValue.value, attribute.value)) {
                                    if (typeof selectedValue.itemState !== 'function') {
                                        selectedValue.itemState = ko.observable('CREATE');
                                    }
                                    selectedValue.itemState('DELETE');
                                }
                            });

                            // Mark the pricing group
                            pricingGroup.externallyModified(true);
                        }
                    });
                });
            });

        }

        $confirm.click(function () {
            applyChanges();

            $modal.modalWindow('close');
        });

        $cancel.click(function () {
            $modal.modalWindow('close');
        });
    }
};



ko.bindingHandlers.deleteAvailabilityEntryModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.parent().find('[data-mettel-class="delete-availability-entry-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-availability-entry-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-availability-entry-delete"]'),
            availabilityEntry = viewModel,
            product = bindingContext.$parent;

        $element.click(function () {
            $modal.modalWindow();
            $confirm.focus();
        });

        $confirm.click(function () {
            availabilityEntry.itemState('DELETE');
            $modal.modalWindow('close');
        });

        $cancel.click(function () {
            $modal.modalWindow('close');
        });
    }
};


/**
 * Handle button click for federated SKU (Add from CNet) search
 */
ko.bindingHandlers.runFederatedSKUSearch = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).click(function (e) {
            e.preventDefault();

            productCatalogViewModel.activeProduct().federatedSkusGrid.configureGrid(
                'federated-skus',
                {
                    getGridData: productCatalogViewModel.endPoints.federatedSkus
                },
                {
                    search: productCatalogViewModel.federatedSKUSearch()
                },
                false
            );
        });
    }
};


/**
 * Handle enter key for federated SKU (Add from CNet) search.
 */
ko.bindingHandlers.runFederatedSKUSearchKeyDown = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).keydown(function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();

                productCatalogViewModel.activeProduct().federatedSkusGrid.configureGrid(
                    'federated-skus',
                    {
                        getGridData: productCatalogViewModel.endPoints.federatedSkus
                    },
                    {
                        search: productCatalogViewModel.federatedSKUSearch()
                    },
                    false
                );

            }
        });
    }
};


/**
 * Push a new (blank) pricing group into the list
 */
ko.bindingHandlers.addPricingGroup = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        /**
         * Click handler
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();
            productCatalogViewModel.activeProduct().addPricingGroup(
                {
                    apiId: 0,
                    available: false,
                    id: 0,
                    itemState: 'CREATE',
                    interestRate: 0,
                    options: ko.observableArray(),
                    price: 0,
                    term: '',
                    externallyModified: false,
                    oneTimeTerm : ''
                }
            );
        });
    }
};


/**
 * Show the Add to Pricing Group modal.
 */
ko.bindingHandlers.selectPricingOptions = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            pricingGroup = viewModel,
            $modal = $element.parent().find('[data-mettel-class="product-select-pricing-options-modal"]'),
            $formInner = $modal.find('[data-mettel-class="pricing-options-form-inner"]'),
            $ok = $modal.find('[data-mettel-class="modal-confirm-pricing-options"]');

        /**
         * Create a dummy pricing group to edit (so we can back out changes if necessary)
         * and show the modal.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (pg, e) {
            e.preventDefault();

            // Populate dummy pricing group...
            productCatalogViewModel.activeProduct().pricingGroupSelected(pg);
            productCatalogViewModel.dummyPricingGroup(ko.mapping.fromJS(ko.mapping.toJS(productCatalogViewModel.activeProduct().pricingGroupSelected())));
            productCatalogViewModel.pricingGroupTab(0);
            $modal.modalWindow();
        }.bind(this, pricingGroup));


        /**
         * Persist the dummy pricing group back to the product and close the modal.
         *
         * @param {Event} e
         * @return void
         */
        $ok.click(function (e) {
            var currentSelected = productCatalogViewModel.activeProduct().currentSelected();

            e.preventDefault();

            // Mark any new items as CREATE and any existing items as UPDATE.
            $.each(productCatalogViewModel.dummyPricingGroup().options(), function (i,o) {
                if (!o.hasOwnProperty('itemState')) {
                    o.itemState = ko.observable('CREATE');
                } else if (o.itemState() === 'NOCHANGE') {
                    o.itemState('UPDATE');
                }
            });

            productCatalogViewModel.activeProduct().pricingGroupSelected().options(productCatalogViewModel.dummyPricingGroup().options());
            productCatalogViewModel.activeProduct().pricingGroupSelected.valueHasMutated();

            productCatalogViewModel.activeProduct().updateSingleSku(productCatalogViewModel.activeProduct().updateSingleSku()+1);

            productCatalogViewModel.activeProduct().currentSelected("");
            productCatalogViewModel.activeProduct().currentSelected(currentSelected);



            $modal.modalWindow('close');
        });
    }
};

ko.bindingHandlers.mettelPricingOptions = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        /**
         * Refresh the view.
         *
         * @return void
         */
        var refresh = function ( ) {
            productCatalogViewModel.dummyPricingGroup.valueHasMutated();
        };

        $element.on('click', '[data-mettel-class="pricing-options-row"]', function ( ){
            var $this = $(this);

            $element.find('[data-mettel-class="pricing-options-row"]').removeClass('mettel-state-selected');
            $this.addClass('mettel-state-selected');

            productCatalogViewModel.pricingGroupTab($this.index());
        });

        // Refresh whenever a checkbox is clicked.
        $element.closest('.mettel-modal-dialog').on('click', '.mettel-checkbox-label', function () {
            setTimeout(refresh, 500);
        });

        // Check all checkboxes in a group when the first one ('All') is clicked.
        $element.closest('.mettel-modal-dialog').on('click', '.mettel-pricing-option-group-list li:first-child .mettel-pricing-group-item-checkbox',
            function (e) {
                e.preventDefault();
                var $this = this;

                var option = JSON.parse($($this.closest('.mettel-pricing-option-group')).attr('data-option'));
                var choices = option.choices;

                if ($(e.currentTarget).find('input').is(':checked')) {
                    productCatalogViewModel.removeAllFromPricingGroupOptions(option.originalName);
                } else {
                    productCatalogViewModel.addToPricingGroupOptions(option.originalName, choices, option.type.toUpperCase());
                }

                refresh();
            }
        );
    }
};


/**
 * Initialize and show the 'Add New Sellers' modal.
 */
ko.bindingHandlers.addNewSeller = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.parent().find('[data-mettel-class="product-add-new-seller-modal"]'),
            $addSellerConfirm = $modal.find('[data-mettel-class="modal-add-new-sellers-confirm"]'),
            $copyFrom = $modal.find('[data-mettel-class="modal-add-new-sellers-copy-from-dropdown"]');


        /**
         * Click handler for the 'Add Sellers' button.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();

            // newSellers should be a blank array.
            productCatalogViewModel.activeProduct().newSellers([]);

            $modal.modalWindow();
        });


        /**
         * Take the newSellersArray and create a seller object for each. Add them to the
         * sellers object on the product.
         *
         * @param {Event e}
         * @return void
         */
        $addSellerConfirm.click(function (e) {
            e.preventDefault();
            var allSellers = productCatalogViewModel.allSellers();
            var newSellers = productCatalogViewModel.activeProduct().newSellers();

            $.each(newSellers, function (i, newSellerName) {
                $.each(allSellers, function (i, seller) {
                    if (seller.name === newSellerName) {
                        var templateSeller = seller;

                        var pricingGroups = [];

                        // Get the pricing groups to copy from...
                        if ($copyFrom.val() !== -1) {
                            var existingSellers = productCatalogViewModel.activeProduct().sellers();

                            $.each(existingSellers, function (i, existingSeller) {
                                if (existingSeller.name() === $copyFrom.val()) {

                                    $.each(existingSeller.pricingGroups(), function (j, existingPricingGroup) {
                                        // do not copy API pricing groups since they are unique to the seller
                                        if (existingPricingGroup.pricingType() !== "API") {
                                            pricingGroups.push(ko.mapping.fromJS(ko.mapping.toJS(existingPricingGroup)));
                                        }
                                    });

                                }
                            });

                            $.each(pricingGroups, function (i, pricingGroup) {
                                pricingGroup.id(0); // Set the ID to 0 for item state
                                pricingGroup.itemState = ko.observable('CREATE');
                            });
                        }

                        var newSeller = {
                            id: ko.observable(0),
                            sellerId: ko.observable(templateSeller.id),
                            itemState: ko.observable('CREATE'),
                            name: ko.observable(templateSeller.name),
                            pricingGroups: ko.observableArray(pricingGroups)
                        };

                        // set "rack" to be tied to radio button value
                        newSeller.rack = ko.computed(function() {
                            if (productCatalogViewModel.activeProduct()) {
                                return newSeller.name() === productCatalogViewModel.activeProduct().seller();
                            }
                            else {
                                return false;
                            }
                        });

                        newSeller.rack.subscribe(function(value) {
                            newSeller.itemState("UPDATE");
                        });

                        if (templateSeller.hasOwnProperty('logoURL')) {
                            newSeller.logoURL = ko.observable(templateSeller.logoURL);
                        }

                        productCatalogViewModel.activeProduct().sellers.push(newSeller);
                    }
                });
            });

            // Reset newSellers back to a blank array.
            productCatalogViewModel.activeProduct().newSellers([]);

            $modal.modalWindow('close');
        });
    }
};


/**
 * Adds a seller to the newSellers list.
 */
ko.bindingHandlers.toggleAddSeller = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            sellerName = $element.attr('data-seller-name'),
            newSellers = productCatalogViewModel.activeProduct().newSellers;


        /**
         * Click handler for the seller button.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();


            // Don't add disabled sellers.
            if ($element.hasClass('disabled')) {
                return;
            }

            // Uncheck new sellers. We can't remove saved sellers from here,
            // but we can remove unsaved sellers.
            if (newSellers().indexOf(sellerName) > -1) {
                newSellers(_.without(newSellers(), sellerName));
            } else {
                newSellers.push(sellerName);
            }
        });
    }
};


/**
 * Handles the business of populating and showing the Seller Codes modal, as well as
 * saving them back to the model. We use a set of dummy billing codes on the productCatalogView
 * Model so that we can safely back out our changes if need be.
 */
ko.bindingHandlers.setCodesForSeller = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
        $modal = $element.parent().find('[data-mettel-class="product-set-codes-modal"]'),
        $done = $modal.find('[data-mettel-class="product-set-codes-modal-ok"]');

        $element.click(function (e) {
            e.preventDefault();

            var product = productCatalogViewModel.activeProduct(), bc, key;
            // Make sure billingCodes are wired up.
            // Need to factor out some duplicate code or use the mapping library.
            if (typeof product.sellerCodes === 'function') {
                var hasSeller = false;
                for (var i = 0; i < product.sellerCodes().length; i++) {
                    if (!ko.isObservable(product.sellerCodes()[i])) {
                        product.sellerCodes()[i] = ko.observable(product.sellerCodes()[i]);
                        product.sellerCodes()[i]().codes = ko.observable(product.sellerCodes()[i]().codes);
                    }
                    if (product.sellerCodes()[i]().seller() === product.currentSellerName()) {
                        bc = product.sellerCodes()[i]();
                        product.dummySellerCodes = ko.observable({
                            seller: ko.observable(bc.seller()),
                            sellerId: ko.observable(bc.sellerId()),
                            codes: ko.observableArray([]),
                            itemState: ko.observable('CREATE')
                        });
                        if (ko.isObservable(ko.utils.unwrapObservable(bc.codes))) {
                            bc.codes = bc.codes();
                        }

                        for (var j = 0; j < bc.codes().length; j++) {
                            product.dummySellerCodes().codes.push(ko.observable({
                                sku: ko.observable(ko.utils.unwrapObservable(bc.codes()[j]).sku()),
                                order: ko.observable(ko.utils.unwrapObservable(bc.codes()[j]).order().join(',')),
                                billing: ko.observable(ko.utils.unwrapObservable(bc.codes()[j]).billing().join(','))
                            }));
                        }
                        hasSeller = true;
                    }
                }
                if (!hasSeller) {
                    var billingCodes = ko.observable({
                        seller: ko.observable(product.currentSeller().name),
                        sellerId: ko.observable(product.currentSeller().id),
                        codes: ko.observableArray([]),
                        itemState: ko.observable('CREATE')
                    });

                    product.sellerCodes().push(billingCodes);
                    bc = billingCodes();
                    product.dummySellerCodes = ko.observable({
                        seller: ko.observable(bc.seller()),
                        sellerId: ko.observable(bc.sellerId()),
                        codes: ko.observableArray([])
                    });
                    for (key in bc.codes()) {

                        for (var l = 0; l < bc.codes().length; l++) {
                            product.dummySellerCodes().codes.push(ko.observable({
                                sku: ko.observable(bc.codes()[l]().sku()),
                                order: ko.observable(bc.codes()[l]().order().join(',')),
                                billing: ko.observable(bc.codes()[l]().billing().join(','))
                            }));
                        }
                    }
                }
            } else {
                var codes = ko.observable({
                    seller: ko.observable(product.currentSeller().name),
                    sellerId: ko.observable(product.currentSeller().id),
                    codes: ko.observableArray([])
                });

                product.sellerCodes = ko.observableArray([codes]);
                bc = codes();
                product.dummySellerCodes = ko.observable({
                    seller: ko.observable(bc.seller()),
                    sellerId: ko.observable(bc.sellerId()),
                    codes: ko.observableArray([]),
                    itemState: ko.observable('CREATE')
                });

                for (var m = 0; m < bc.codes().length; m++) {
                    product.dummySellerCodes().codes.push(ko.observable({
                        sku: ko.observable(bc.codes()[m]().sku()),
                        order: ko.observable(bc.codes()[m]().order().join(',')),
                        billing: ko.observable(bc.codes()[m]().billing().join(','))
                    }));
                }

            }
            $.each(product.skus(), function (i, sku) {
                var hasSku = false;
                for (var k = 0; k < product.dummySellerCodes().codes().length; k++) {
                    if (ko.utils.unwrapObservable(product.dummySellerCodes().codes()[k]().sku) === sku.sku()) {
                        hasSku = true;
                        break;
                    }
                }

                if (!hasSku) {
                    product.dummySellerCodes().codes.push(ko.observable({
                        sku: sku.sku(),
                        billing: ko.observable(''),
                        order: ko.observable('')
                    }));
                }
            });

            product.dummySellerCodesInitialized(true);

            $modal.modalWindow();
        });

        $done.click(function (e) {
            e.preventDefault();

            var product = productCatalogViewModel.activeProduct();

            // Persist
            $.each(product.sellerCodes(), function (i, billingCode) {
                if (billingCode().seller() === product.currentSellerName()) {

                    billingCode({
                        seller: ko.observable(product.dummySellerCodes().seller()),
                        sellerId: ko.observable(product.dummySellerCodes().sellerId()),
                        codes: ko.observableArray([]),
                        itemState: ko.observable(product.dummySellerCodes().hasOwnProperty('itemState') ? product.dummySellerCodes().itemState() : 'CREATE')
                    });

                    for (var n = 0; n < product.dummySellerCodes().codes().length; n++) {
                        billingCode().codes.push(ko.observable({
                            sku: ko.observable(ko.utils.unwrapObservable(product.dummySellerCodes().codes()[n]().sku)),
                            order: ko.observableArray(product.dummySellerCodes().codes()[n]().order().split(',')),
                            billing: ko.observableArray(product.dummySellerCodes().codes()[n]().billing().split(','))
                        }));
                    }
                }
            });

            product.dummySellerCodesInitialized(false);

            $modal.modalWindow('close');
        });
    }
};


ko.bindingHandlers.rememberSKUAttrCheckbox = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var attribute = viewModel,
            selected = valueAccessor(),
            $element = $(element),
            product = productCatalogViewModel.activeProduct();

        $element.mousedown(function (e) {
            product.oldCheckboxObservable = selected;
            product.oldCheckboxObservableAttr = attribute;
            product.oldCheckboxValue = selected();

            setTimeout(function () {
                if (product.attributeAffectsPricingGroups(attribute)) {
                    $('[data-mettel-class="confirm-sku-attribute-uncheck"]').modalWindow({
                        close: function () {
                            var product = productCatalogViewModel.activeProduct();

                            product.oldCheckboxObservable(product.oldCheckboxValue);
                            $('[data-mettel-class="confirm-sku-attribute-uncheck"]').modalWindow('close');
                        }
                    });
                }
            },100);
        });
    }
};


ko.bindingHandlers.confirmSKUAttributeUncheck = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).click(function (e) {
            var product = productCatalogViewModel.activeProduct();
            e.preventDefault();

            $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                    $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, option) {
                        if (MetTel.Utils.stricmp(option.name, product.oldCheckboxObservableAttr.key)) {
                            option.itemState('DELETE');

                            $.each(option.selectedValues, function (isv, selectedValue) {
                                if (!selectedValue) {
                                    return;
                                }
                                if (typeof selectedValue.itemState !== 'function') {
                                    selectedValue.itemState = ko.observable('CREATE');
                                }
                                selectedValue.itemState('DELETE');
                            });

                            // Mark the pricing group
                            pricingGroup.externallyModified(true);
                        }
                    });
                });
            });

            $('[data-mettel-class="confirm-sku-attribute-uncheck"]').modalWindow('close');
        });
    }
};


ko.bindingHandlers.cancelSKUAttributeUncheck = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        $(element).click(function (e) {
            var product = productCatalogViewModel.activeProduct();
            e.preventDefault();

            product.oldCheckboxObservable(product.oldCheckboxValue);
            $('[data-mettel-class="confirm-sku-attribute-uncheck"]').modalWindow('close');
        });
    }
};

ko.bindingHandlers.handleHideTemplateOption = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            product = productCatalogViewModel.activeProduct(),
            option = viewModel,
            $confirmModal = $('[data-mettel-class="confirm-hide-template-option"]'),
            $confirm = $confirmModal.find('[data-mettel-class="modal-confirm-hide-template-option"]'),
            $cancel = $confirmModal.find('[data-mettel-class="modal-cancel-hide-template-option"]');

        $element.click(function (e) {
            var templateOptionName = false,
                pgAffected = false;

            if (option.hidden()) {
                // Step 1: Figure out what the parent title is...
                $.each(ko.utils.unwrapObservable(product.templateOptions), function (ito, templateOption) {
                    if (!templateOption) {
                        return;
                    }
                    $.each(ko.utils.unwrapObservable(templateOption.rows), function (ir, row) {
                        if (!row) {
                            return;
                        }
                        if (ko.utils.unwrapObservable(row.refProductId) === ko.utils.unwrapObservable(option.refProductId)) {
                            templateOptionName = templateOption.title();
                            return;
                        }
                    });
                    if (templateOptionName) {
                        return;
                    }
                });

                if (templateOptionName) {
                    $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                        if (!seller) {
                            return;
                        }
                        if (seller.itemState() === 'DELETE') {
                            return;
                        }
                        $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                            if (!pricingGroup) {
                                return;
                            }
                            if (pricingGroup.itemState() === 'DELETE') {
                                return;
                            }
                            $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, pricingOption) {
                                if (!pricingOption) {
                                    return;
                                }
                                if (pricingOption.itemState() === 'DELETE') {
                                    return;
                                }
                                if (MetTel.Utils.stricmp(pricingOption.name, templateOptionName)) {
                                    $.each(ko.utils.unwrapObservable(pricingOption.selectedValues), function (isv, selectedValue) {
                                        if (!selectedValue) {
                                            return;
                                        }
                                        if (MetTel.Utils.stricmp(selectedValue.name, option.name)) {
                                            pgAffected = true;
                                        }
                                    });
                                }
                            });
                        });
                    });
                } else {
                    console.log('Could not find template option for refProductId: ' + option.refProductId);
                }

                if (pgAffected) {
                    $confirmModal.modalWindow();

                    $confirm.unbind('click');
                    $confirm.click(function (e) {
                        // Step 1: Figure out what the parent title is...
                        $.each(ko.utils.unwrapObservable(product.templateOptions), function (ito, templateOption) {
                            if (!templateOption) {
                                return;
                            }
                            $.each(ko.utils.unwrapObservable(templateOption.rows), function (ir, row) {
                                if (!row) {
                                    return;
                                }
                                if (ko.utils.unwrapObservable(row.refProductId) === ko.utils.unwrapObservable(option.refProductId)) {
                                    templateOptionName = templateOption.title();
                                    return;
                                }
                            });
                            if (templateOptionName) {
                                return;
                            }
                        });

                        if (templateOptionName) {
                            $.each(ko.utils.unwrapObservable(product.sellers), function (is, seller) {
                                if (!seller) {
                                    return;
                                }
                                if (seller.itemState() === 'DELETE') {
                                    return;
                                }
                                $.each(ko.utils.unwrapObservable(seller.pricingGroups), function (ip, pricingGroup) {
                                    if (!pricingGroup) {
                                        return;
                                    }
                                    if (pricingGroup.itemState() === 'DELETE') {
                                        return;
                                    }
                                    $.each(ko.utils.unwrapObservable(pricingGroup.options), function (io, pricingOption) {
                                        if (!pricingOption) {
                                            return;
                                        }
                                        if (pricingOption.itemState() === 'DELETE') {
                                            return;
                                        }
                                        if (MetTel.Utils.stricmp(pricingOption.name, templateOptionName)) {

                                            var newArrayWithoutHidden = [];

                                            $.each(ko.utils.unwrapObservable(pricingOption.selectedValues), function (isv, selectedValue) {
                                                if (!selectedValue) {
                                                    return;
                                                }
                                                if (!MetTel.Utils.stricmp(selectedValue.name, option.name)) {
                                                    newArrayWithoutHidden.push(selectedValue);
                                                } else {
                                                    pricingGroup.externallyModified(true);
                                                }
                                            });

                                            pricingOption.selectedValues(newArrayWithoutHidden);

                                            if (!newArrayWithoutHidden.length) {
                                                if (pricingOption.itemState() !== 'CREATE') {
                                                    pricingOption.itemState('DELETE');
                                                } else {
                                                    pricingGroup.options.remove(pricingOption);
                                                }
                                                pricingGroup.externallyModified(true);
                                            }
                                        }
                                    });
                                });
                            });
                        } else {
                            console.log('Could not find template option for refProductId: ' + option.refProductId);
                        }
                        $confirmModal.modalWindow('close');
                    });

                    $cancel.unbind('click');
                    $cancel.click(function (e) {
                        option.hidden(false);
                        $confirmModal.modalWindow('close');
                    });
                    $confirmModal.find('.mettel-close-button').one('click', function () {
                        option.hidden(false);
                    });
                }
            }
        });
    }
};

ko.bindingHandlers.subsectionKeyboardFocusStates = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            strSelectors = '.mettel-product-subsection-item-edit, .mettel-product-subsection-item-delete, .mettel-product-subsection-item-clone, .mettel-row-edit, .mettel-row-delete';

        $element.find(strSelectors).on('focus', function() {
            $element.addClass('mettel-admin-catalog-subsection-row-focused');
        });

        $element.find(strSelectors).on('blur', function() {
            $element.removeClass('mettel-admin-catalog-subsection-row-focused');
        });
    }
};

/**
 * Hides the preview pane.
 */
ko.bindingHandlers.exitProductPreview = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            vmProduct = viewModel;

        /**
         * Click handler for the exit preview button.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();

            // stop live pricing when preview is closed
            vmProduct.stopWatchingChoices();

            $('[data-mettel-class="product-preview"]').hide();

            // Why not? Disable preview rendering for performance.
            productCatalogViewModel.activeProduct().productPreviewInitialized(false);
            productCatalogViewModel.activeProduct().previewPricingOptionsGridInitialized(false);
        });
    }
};
