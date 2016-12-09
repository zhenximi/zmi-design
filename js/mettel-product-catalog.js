/*global BaseCatalogModel, BaseProductModel, CategoryModel, SubcategoryModel, SteppedWorkflowModel, vmSteppedWorkflow, AddressDialogModel, section, field, showAllFormErrors, SiteJS */
/*jshint latedef: nofunc */

// Consumer Catalog
var hashHistorySaved = false;
var hashHistory = [window.location.hash.replace(/[^#=\w\s]/gi, "")]; // sanitize
var productCatalogViewModel = false;
var customerOrderViewModel = false;

var shippingTotalCost = 0;

// object should already be observable
var makeChildrenObservables = function (object) {
    if (!ko.isObservable(object)) {
        return;
    }

    // Loop through its children
    for (var child in object()) {
        if (!ko.isObservable(object()[child])) {
            object()[child] = ko.observable(object()[child]);
        }
        makeChildrenObservables(object()[child]);
    }
};

function CustomerCatalogSteppedWorkflowModel(options) {
    (SteppedWorkflowModel.bind(this, options))();

    var self = this;

    this.reset = function () {
        // Reset hash on new page load

        if ($.deparam.fragment().hasOwnProperty('ticketId')) {
            if (!customerOrderViewModel.modifyOrder) {
                var originalTicketId = $.deparam.fragment().ticketId,
                    strippedTicketId = MetTel.Utils.replaceAllButNumbers(originalTicketId);

                customerOrderViewModel.loadExistingOrder(strippedTicketId);
                window.location = '#ticketId=' + strippedTicketId;
                vmSteppedWorkflow.goToStepById('confirmation');
            }
        } else {
            window.location = '#';
            if (typeof customerOrderViewModel.modifyOrder === 'undefined') {
                vmSteppedWorkflow.goToStepById('items');
            }
        }
    };

    self.setHierarchies = function () {
        if (customerOrderViewModel.orderDetails && customerOrderViewModel.orderDetails.Sections()) {
            _.each(customerOrderViewModel.orderDetails.Sections(), function (section) {
                _.each(section.Fields(), function (field) {
                    if (MetTel.Utils.stricmp(field.ID, "Hierarchy") === true) {
                        field.Value(field.CustomTemplateModel().hierarchyValue());
                    }
                });
            });
        }
    };

    this.activeStep.subscribe(function (newValue) {
        var result;

        if (newValue === 'items') {
            productCatalogViewModel.customerCatalogItemsVisible(true);
            productCatalogViewModel.init();
        } else {
            productCatalogViewModel.customerCatalogItemsVisible(false);
        }

        // Fixing BP-3222: Hierarchies, when modified using the hierarchy select box model, need to be extracted
        // from the field's CustomTemplateModel and set to the field's Value property accordingly
        // see self.setHierarchies
        self.setHierarchies();

        if (newValue === 'details') {
            // set the catalog back to 'start' for scenario where user navigates backwards to step 2
            productCatalogViewModel.viewMenuStart();

            // cache address, since we'll need to re-fetch if it changes
            var newAddress = false;

            if (customerOrderViewModel.cachedAddressId() !== customerOrderViewModel.addressDialogVm().addressId()) {
                newAddress = true;
                customerOrderViewModel.cachedAddressId(customerOrderViewModel.addressDialogVm().addressId());
            }

            // remove notes if user removes products for which categoryform data was already fetched
            // crawl through each subCategoryId in the subcategoryDetails object
            for (var subCategoryId in customerOrderViewModel.subcategoryDetails) {
                // if the subCategoryId is not present in uniqueSubcategories,
                // that means it was removed so we don't need its details anymore
                // also checking isNaN so we don't remove ko.validation properties (errors, isValid, etc.)
                if (_.contains(customerOrderViewModel.uniqueSubcategories(), parseInt(subCategoryId, 10)) === false && isNaN(subCategoryId) === false) {
                    delete customerOrderViewModel.subcategoryDetails[subCategoryId];
                    customerOrderViewModel.subcategoryDetailsErrors = [];
                }
                // if the subcategory is present, notes were already fetched, so if there are child sections,
                // check to see if any items of that subcategory have been added or removed since note fetch
                // if so, we need to re-fetch
                // TODO: clean this up to be smarter, so we don't have to blow away all notes
                else {
                    var numSubCategoryId = parseInt(subCategoryId, 10),
                        numChildSections = customerOrderViewModel.subcategoryDetails[numSubCategoryId].Sections()[0].ChildSections().length,
                        numItems = customerOrderViewModel.itemsBySubcategory(numSubCategoryId).length;

                    // console.log("subcat", numSubCategoryId);
                    // console.log("number of childsections for this subcat", numChildSections);
                    // console.log("number of items for this subcat", numItems);

                    if (numChildSections > 0 && numItems !== numChildSections) {
                        delete customerOrderViewModel.subcategoryDetails[subCategoryId];
                        customerOrderViewModel.subcategoryDetailsErrors = [];
                    }
                }
            }

            var arrAllSubCats = customerOrderViewModel.uniqueSubcategories();

            if (customerOrderViewModel.modifyOrder) {
                arrAllSubCats = _.uniq(arrAllSubCats.concat(customerOrderViewModel.uniqueServiceSubcategories()));
            }

            // determine which subcategory details have not been fetched yet
            var arrSubcategoryIdsToFetch = _.filter(arrAllSubCats, function (subcategory) {
                return typeof customerOrderViewModel.subcategoryDetails[subcategory] === "undefined";
            });

            // we need to call the service if the address has changed, or if order details or any subcategory details have not been fetched
            if (newAddress === true || customerOrderViewModel.orderDetails.initialized() === false || arrSubcategoryIdsToFetch.length > 0) {

                var addressString;

                // For addressId, check query params first, then the address view model
                var addressId = MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().addressId);

                if (addressId) {
                    addressString = addressId;
                } else if (typeof customerOrderViewModel.addressDialogVm === 'function') {
                    if (typeof (customerOrderViewModel.addressDialogVm().addressId()) !== 'undefined') {
                        addressString = customerOrderViewModel.addressDialogVm().addressId();
                    }
                }

                var getCategoryUrl = '';

                getCategoryUrl += productCatalogViewModel.endPoints.getCategoryForm +
                    '?category=' + customerOrderViewModel.ticketCategory +
                    '&clientId=' + productCatalogViewModel.queryParams().clientId +
                    '&subcategoryIds=' + arrSubcategoryIdsToFetch.join();

                if (addressString) {
                    getCategoryUrl += '&addressId=' + addressString;
                }

                var generateRequest = function () {
                    var request = [];
                    var subCategories = {};

                    // for modify service 'other' modificatios only, use services
                    if (typeof customerOrderViewModel.modifyOrder !== 'undefined' && customerOrderViewModel.modificationType() === 3) {
                        _.each(customerOrderViewModel.services(), function (item) {
                            if (subCategories[item.SubCategoryID] == null) {
                                subCategories[item.SubCategoryID] = [];
                            }
                            subCategories[item.SubCategoryID].push({ SectionName: item.WTN });
                        });
                    }
                    else {
                        _.each(customerOrderViewModel.items(), function (item) {
                            if (subCategories[item.subcategoryId()] == null) {
                                subCategories[item.subcategoryId()] = [];
                            }
                            subCategories[item.subcategoryId()].push({ SectionName: item.WTN ? item.WTN : item.product().originalName });
                        });
                    }

                    for (var key in subCategories) {
                        request.push({
                            subCategoryId: key,
                            items: subCategories[key]
                        });
                    }
                    return request;
                };

                $.ajax({
                    type: "POST",
                    url: getCategoryUrl,
                    data: JSON.stringify(generateRequest()),
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    success: function (response) {

                        // split up sections since they're handled differently
                        var arrTicketSections = [],
                            arrSubcategorySections = [];

                        for (var i = 0; i < response.Sections.length; i++) {
                            var sectionModel = response.Sections[i];

                            if (sectionModel.UserData === null) {
                                arrTicketSections.push(sectionModel);
                            }
                            else {
                                arrSubcategorySections.push(sectionModel);
                            }
                        }

                        // handle subcategory options
                        if (arrSubcategoryIdsToFetch.length > 0) {
                            customerOrderViewModel.subcategoryDetailsLoaded(false);

                            _.each(arrSubcategorySections, function (sectionModel) {
                                var subcategoryId = sectionModel.UserData.SubCategoryId;

                                customerOrderViewModel.subcategoryDetails[subcategoryId] = {
                                    "FormID": ko.observable(),
                                    "UserData": ko.observable(),
                                    "Errors": ko.observableArray([]),
                                    "Sections": ko.observableArray([]),
                                    "initialized": ko.observable(false)
                                };

                                var newSubcategorySection = new section(sectionModel);

                                /*jshint -W055 */
                                customerOrderViewModel.subcategoryDetails[subcategoryId].Sections.push(newSubcategorySection);

                                // do not validate custom fields
                                _.each(newSubcategorySection.Fields(), function (field) {
                                    if (MetTel.Utils.stricmp(field.InputType(), "Custom") === false) {
                                        customerOrderViewModel.subcategoryDetailsErrors.push(field);
                                    }
                                });

                                // child section validation
                                _.each(newSubcategorySection.ChildSections(), function (section) {
                                    // ko.validation.group(section);
                                    _.each(section.Fields(), function (field) {
                                        if (MetTel.Utils.stricmp(field.InputType(), "Custom") === false) {
                                            customerOrderViewModel.subcategoryDetailsErrors.push(field);
                                        }
                                    });
                                });

                            });
                        }

                        // validation
                        var subcategoryResult = ko.validation.group(customerOrderViewModel.subcategoryDetailsErrors);
                        subcategoryResult.showAllMessages();

                        // only do this once, since ticketCategory does not ever change
                        if (customerOrderViewModel.orderDetails.initialized() === false) {
                            // initial setup
                            customerOrderViewModel.orderDetails.Sections([]);
                            customerOrderViewModel.billingDetails.Sections([]);

                            // pushing into the ViewModel
                            _.each(arrTicketSections, function (sectionModel) {
                                var newSection = new section(sectionModel);
                                customerOrderViewModel.orderDetails.Sections.push(newSection);
                                customerOrderViewModel.billingDetails.Sections.push(new section(sectionModel));

                                // do not validate custom fields
                                _.each(newSection.Fields(), function (field) {
                                    if (MetTel.Utils.stricmp(field.DisplayName, "Hierarchy") === false) {
                                        customerOrderViewModel.orderDetailsErrors.push(field);
                                    }
                                });
                                _.each(newSection.Fields(), function (field) {
                                    if (MetTel.Utils.stricmp(field.DisplayName, "Hierarchy") === false) {
                                        customerOrderViewModel.billingDetailsErrors.push(field);
                                    }
                                });
                            });

                            if (customerOrderViewModel.showNewWorkflow()) {
                                customerOrderViewModel.billingDetails.Sections()[0].SectionName("Billing Details");
                            }

                            // validation
                            var orderResult = ko.validation.group(customerOrderViewModel.orderDetailsErrors);
                            orderResult.showAllMessages();

                            customerOrderViewModel.orderDetails.initialized(true);
                            customerOrderViewModel.billingDetails.initialized(true);
                        }
                    }
                })
                .done(function () {
                    customerOrderViewModel.splitBillingDetails();
                    customerOrderViewModel.subcategoryDetailsLoaded(true);
                });
            }
        }

        if (newValue === 'authorization') {
            result = ko.validation.group(customerOrderViewModel.ticketAuth);

            if (!customerOrderViewModel.ticketAuth.isValid()) {
                result.showAllMessages();
            }
        }

        if (newValue === 'contact') {
            if (customerOrderViewModel.ticketContact.initialized() === false) {
                if (customerOrderViewModel.addressDialogVm().addressId()) {
                    customerOrderViewModel.ticketContact.loadSiteContact();
                }
            }

            result = ko.validation.group(customerOrderViewModel.ticketContact);

            if (!customerOrderViewModel.ticketContact.isValid()) {
                result.showAllMessages();
            }

            customerOrderViewModel.ticketContact.initialized(true);

        }

        customerOrderViewModel.page(newValue);
    });

    this.nextStepFocus = function() {
        vmSteppedWorkflow.nextStep();

        var step = vmSteppedWorkflow.activeStep();
        if (step === 'details') {
            // wait till dynamic notes return before finding the appropriate element
            var subcatDetailsSubscription = customerOrderViewModel.subcategoryDetailsLoaded.subscribe(function(newValue) {
                if (newValue) {
                    $('[data-mettel-class="customer-order-container"]').find(MetTel.Variables.focusableSelectors).first().focus();
                    subcatDetailsSubscription.dispose();
                }
            });
        } else {
            $('[data-mettel-class="customer-order-container"]').find(MetTel.Variables.focusableSelectors).first().focus();
        }
    };

    $(function () {
        this.reset();
    }.bind(this));
}

function CartItem(options) {
    var cartItem = this,
        parent = cartItem.parent = options.parent,
        parentQty = options.quantity,
        cartItemIndex = options.index;
    cartItem.options = options;

    // model data
    cartItem.sku = options.sku;
    cartItem.skuObject = ko.observable(options.skuObject);

    cartItem.product = ko.observable(options.product);
    cartItem.quantity = ko.observable(1);

    cartItem.subcategoryId = ko.observable(options.subcategoryId);
    cartItem.status = ko.observable(options.status || 'PENDING');
    cartItem.contractId = ko.observable(options.orderModelData ? options.orderModelData.contractId : 0);
    cartItem.activity = ko.observable(options.activity || 'ADD');

    cartItem.sellerId = ko.observable(parent.sellerId());
    cartItem.sellerName = ko.observable(parent.sellerName());
    cartItem.sellerLogoURL = ko.observable(parent.sellerLogoURL());

    cartItem.oneTimePriceTotal = ko.observable();
    cartItem.oneTimePriceBase = ko.observable();

    cartItem.monthlyPriceTotal = ko.observable();
    cartItem.monthlyPriceBase = ko.observable();

    cartItem.pricingGroupId = ko.observable(options.orderModelData ? options.orderModelData.pricingGroupId : 0);
    cartItem.termsId = ko.observable(options.orderModelData ? options.orderModelData.termsId : 0);
    cartItem.interestRate = ko.observable(options.orderModelData ? options.orderModelData.interestRate : 0);
    cartItem.priceSource = ko.observable(options.orderModelData ? options.orderModelData.priceSource : '');

    cartItem.attributes = ko.observable(parent.attributes());
    cartItem.attributesObject =  ko.observable(parent.attributesObject());

    cartItem.subPricing = ko.observableArray();
    cartItem.subItems = ko.observableArray();

    cartItem.freeTextEntries = ko.observableArray(options.freeTextEntries);

    cartItem.noPricing = ko.observable(parent.noPricing());

    // for modified service
    if (options.modifiedOrderData) {
        cartItem.WTN = options.modifiedOrderData.line.WTN;
        cartItem.InventoryID = options.modifiedOrderData.line.InventoryID;
        cartItem.SubCategoryID = options.modifiedOrderData.line.SubCategoryID;
    }

    // Pricing / Sub Pricing
    if (parentQty > 1) {

        // calculate base sku prices
        cartItem.oneTimePriceBase(parent.oneTimePriceBase() / parentQty);
        cartItem.monthlyPriceBase(parent.monthlyPriceBase() / parentQty);

        var splitSubPricing = [],
            splitSubSkus = [],
            newOneTimeTotal = cartItem.oneTimePriceBase(),
            newMonthlyTotal = cartItem.monthlyPriceBase();

        // split up sub pricing and determine total prices
        $.each(options.orderModelData.subPricing, function(i, optGroup) {

            var splitOptGroup = {
                title: optGroup.title,
                choices: []
            };

            $.each(optGroup.choices, function(j, subProduct) {

                var splitSubProduct = {
                    name: subProduct.name,
                    sku: subProduct.sku,
                    quantity: subProduct.quantity,
                    quantityTypeId: subProduct.quantityTypeId,
                    monthly: subProduct.monthly,
                    oneTime: subProduct.oneTime,
                    checkedAttributes: subProduct.checkedAttributes,
                    checkedAttributesString: subProduct.checkedAttributesString,
                    subPricing: []
                };

                // split up the sub pricing
                if (subProduct.quantityTypeId === 3 && subProduct.quantity % parentQty > 0) {
                    // quantity is specified different than parent and not divisible evenly by parent quantity

                    var remainder = subProduct.quantity % parentQty,
                        newSubProductQty = Math.floor(subProduct.quantity / parentQty),
                        pricePerQtyMonthly = subProduct.monthly / subProduct.quantity,
                        pricePerQtyOneTime = subProduct.oneTime / subProduct.quantity;

                    // get rid of the remainder choices one by one in the first few item(s)
                    if (cartItemIndex < remainder) {
                        newSubProductQty += 1;
                    }

                    splitSubProduct.quantity = newSubProductQty;
                    splitSubProduct.monthly = pricePerQtyMonthly * newSubProductQty;
                    splitSubProduct.oneTime = pricePerQtyOneTime * newSubProductQty;

                } else {
                    // quantity is evenly divisible

                    splitSubProduct.quantity /= parentQty;
                    splitSubProduct.monthly /= parentQty;
                    splitSubProduct.oneTime /= parentQty;
                }

                // Adjust the total prices based on the sub pricing
                newOneTimeTotal += splitSubProduct.oneTime;
                newMonthlyTotal += splitSubProduct.monthly;

                if (splitSubProduct.quantity > 0) {

                    // split the sub sub pricing
                    $.each(subProduct.subPricing || [], function(k, subOptGroup) {

                        var splitSubOptGroup = {
                            title: subOptGroup.title,
                            choices: []
                        };

                        $.each(subOptGroup.choices, function(l, subSubProduct) {

                            var splitSubSubProduct = {
                                name: subSubProduct.name,
                                sku: subSubProduct.sku,
                                quantity: splitSubProduct.quantity, // equal to its parent (sub product) quantity
                                quantityTypeId: subSubProduct.quantityTypeId,
                                monthly: splitSubProduct.quantity * (subSubProduct.monthly / subSubProduct.quantity), // its new quantity times price per sub sub item
                                oneTime: splitSubProduct.quantity * (subSubProduct.oneTime / subSubProduct.quantity), // its new quantity times price per sub sub item
                                checkedAttributes: subSubProduct.checkedAttributes,
                                checkedAttributesString: subSubProduct.checkedAttributesString
                            };

                            if (splitSubSubProduct.quantity > 0) {

                                // Adjust the total prices based on the sub sub pricing
                                newOneTimeTotal += splitSubSubProduct.oneTime;
                                newMonthlyTotal += splitSubSubProduct.monthly;

                                splitSubOptGroup.choices.push(splitSubSubProduct);
                            }
                        });

                        if (splitSubOptGroup.choices.length) {
                            splitSubProduct.subPricing.push(splitSubOptGroup);
                        }
                    });

                    splitOptGroup.choices.push(splitSubProduct);
                }
            });

            if (splitOptGroup.choices.length) {
                splitSubPricing.push(splitOptGroup);
            }
        });

        // split up sub skus so sub items are split
        $.each(options.subSkus, function(i, subSku) {
            var subSkuCopy = $.extend({}, subSku);

            if (subSku.quantityTypeId === 3 && subSku.quantity % parentQty > 0) {
                // quantity is specified different than parent and not divisible evenly by parent quantity

                var remainder = subSku.quantity % parentQty,
                    newSubSkuQty = Math.floor(subSku.quantity / parentQty);

                // get rid of the remainder choices one by one in the first few item(s)
                if (cartItemIndex < remainder) {
                    newSubSkuQty += 1;
                }

                subSkuCopy.quantity = newSubSkuQty;
            } else {
                // quantity is evenly divisible

                subSkuCopy.quantity /= parentQty;
            }

            if (subSkuCopy.quantity > 0) {

                // split sub sub sku quantities by making them match the quantity of their parent (sub sku)
                if (subSkuCopy.subSkus && subSkuCopy.subSkus.length) {
                    $.each(subSkuCopy.subSkus, function(j, subSubSku) {
                        subSubSku.quantity = subSkuCopy.quantity;
                    });
                }

                splitSubSkus.push(subSkuCopy);
            }
        });

        cartItem.subPricing(splitSubPricing);
        cartItem.oneTimePriceTotal(newOneTimeTotal);
        cartItem.monthlyPriceTotal(newMonthlyTotal);
        cartItem.subItems(customerOrderViewModel.createSubItems(splitSubSkus, options.orderModelData, (options.modifiedOrderData && options.modifiedOrderData.oldItems ? options.modifiedOrderData.oldItems : false), splitSubPricing));

    } else {

        // parent item group contains only this cart item, so pricing / sub pricing will be same as parent
        cartItem.subPricing(parent.subPricing());
        cartItem.oneTimePriceTotal(parent.oneTimePriceTotal());
        cartItem.oneTimePriceBase(parent.oneTimePriceBase());
        cartItem.monthlyPriceTotal(parent.monthlyPriceTotal());
        cartItem.monthlyPriceBase(parent.monthlyPriceBase());
        cartItem.subItems(parent.subItems());
    }
}

function ItemGroup(options) {
    var itemGroup = this;
    itemGroup.options = options;

    // model data
    itemGroup.items = ko.observableArray([]);

    itemGroup.sku = options.sku;
    itemGroup.skuObject = ko.observable(options.skuObject);

    itemGroup.product = ko.observable(options.product);
    itemGroup.quantity = ko.observable(options.quantity);

    itemGroup.sellerId = ko.observable(options.orderModelData ? options.orderModelData.Id : customerOrderViewModel.modifiedSellerId()); // not needed in UI
    itemGroup.sellerName = ko.observable(options.orderModelData ? options.orderModelData.Name : customerOrderViewModel.modifiedSellerName());
    itemGroup.sellerLogoURL = ko.observable(options.orderModelData ? options.orderModelData.LogoURL : customerOrderViewModel.modifiedSellerLogoURL());

    itemGroup.oneTimePriceTotal = ko.observable(options.orderModelData ? options.orderModelData.OneTime : 0);
    itemGroup.oneTimePriceBase = ko.observable(options.orderModelData ? options.orderModelData.OneTime : 0);
    itemGroup.oneTimePricePerUnit = ko.observable(options.orderModelData ? options.orderModelData.OneTime / options.quantity : 0);

    itemGroup.monthlyPriceTotal = ko.observable(options.orderModelData ? options.orderModelData.Monthly : 0);
    itemGroup.monthlyPriceBase = ko.observable(options.orderModelData ? options.orderModelData.Monthly : 0);
    itemGroup.monthlyPricePerUnit = ko.observable(options.orderModelData ? options.orderModelData.Monthly / options.quantity : 0);

    itemGroup.attributes = ko.observable('');
    itemGroup.attributesObject =  ko.observable({});

    itemGroup.subPricing = ko.observableArray(options.orderModelData ? options.orderModelData.subPricing : []);
    itemGroup.subItems = ko.observableArray(customerOrderViewModel.createSubItems(options.subSkus, options.orderModelData, (options.modifiedOrderData && options.modifiedOrderData.oldItems ? options.modifiedOrderData.oldItems : false), options.orderModelData ? options.orderModelData.subPricing : []));

    itemGroup.freeTextEntries = ko.observableArray(options.freeTextEntries);

    itemGroup.noPricing = ko.observable(options.orderModelData ? (MetTel.Utils.stricmp(options.orderModelData.Status, 'valid') === false) : true);

    // Create a string of the checked attributes for the itemGroup
    $.each(options.previewGroupOptions, function (i, o) {
        if (o.type === 'skus') {
            itemGroup.attributes(i === 0 ? o.previewSelectedChoice() : itemGroup.attributes() + ', ' + o.previewSelectedChoice());
        }
    });

    // Pass all (checked and unchecked) sku attributes to the cart item
    $.each(ko.mapping.toJS(options.skuObject.attributes), function(i, attribute) {
        itemGroup.attributesObject()[attribute.key] = attribute.value;
    });

    // Add provider name attribute
    itemGroup.attributesObject().p_providerName = options.orderModelData && options.orderModelData.APIPricing ? options.orderModelData.APIPricing.ProviderName : '';

    var shippingTotalCost = 0,
        shippingOvernightCost = null,
        shippingStandardCost = null;

    // Here is where the base sku price is adjusted by subtracting any subPricing from it
    // because we initially just set it equal to the total price
    if (itemGroup.subPricing()) {
        $.each(itemGroup.subPricing(), function (i, group) {
            if (group.choices) {
                $.each(group.choices, function (j, choice) {

                    var createCheckedAttrString = function(checkedAttrs) {
                        var string = "";
                        $.each(checkedAttrs || [], function (attrIndex, attr) {
                            string = (attrIndex === 0 ? attr.value : string + ', ' + attr.value);
                        });
                        return string;
                    };

                    // Process shipping costs
                    if (group.title && group.title.toLowerCase().indexOf('shipping') > -1) {
                        shippingTotalCost += choice.oneTime;

                        // Add to overnight shipping
                        if (choice.sku === 'STANDARDSHIP') {
                            if (shippingStandardCost === null) {
                                shippingStandardCost = 0;
                            }
                            shippingStandardCost += choice.oneTime;
                        } else {
                            if (shippingOvernightCost === null) {
                                shippingOvernightCost = 0;
                            }
                            shippingOvernightCost += choice.oneTime;
                        }
                    }

                    // Adjust the base sku prices based on the sub-pricing
                    itemGroup.oneTimePriceBase(itemGroup.oneTimePriceBase() - choice.oneTime);
                    itemGroup.monthlyPriceBase(itemGroup.monthlyPriceBase() - choice.monthly);

                    // Create a string of the checked attributes for the sub-product
                    choice.checkedAttributesString = createCheckedAttrString(choice.checkedAttributes);

                    // and sub-sub-products
                    if (choice.subPricing && choice.subPricing.length) {
                        $.each(choice.subPricing, function(k, subGroup) {
                            if (subGroup.choices && subGroup.choices.length) {
                                $.each(subGroup.choices, function(l, subChoice) {

                                    itemGroup.oneTimePriceBase(itemGroup.oneTimePriceBase() - subChoice.oneTime);
                                    itemGroup.monthlyPriceBase(itemGroup.monthlyPriceBase() - subChoice.monthly);

                                    subChoice.checkedAttributesString = createCheckedAttrString(subChoice.checkedAttributes);
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    // Create cart items

    var cartItemOptions = $.extend(true, {}, options);
    cartItemOptions.parent = itemGroup;

    for (var i = 0; i < options.quantity; i++) {
        cartItemOptions.index = i;
        var newCartItem = new CartItem(cartItemOptions);

        itemGroup.items.push(newCartItem);
        customerOrderViewModel.items.push(newCartItem);
    }
}

function CustomerOrderModel(options) {
    var self = this;

    if (typeof SiteJS !== 'undefined') {
        SiteJS.DisableGeneralLoading();
        SiteJS.HideGeneralLoading();
    }

    // Saving default address
    this.missingAddress = ko.observable();
    this.saveAddressAsDefault = ko.observable(false);
    this.enableSaveAddressAsDefault = ko.computed(function() {
        return (!self.missingAddress());
    });

    // this is for New Account / Edit Account / AHC types
    // which follow a different data model than catalog / modify service
    this.differentDataModel = ko.observable(false);
    this.legacyTicket = ko.observable(false);
    this.customTicket = ko.observable(false);

    this.showItemInfo = ko.observable(true);

    this.noPricingMessage = ko.observable('Quote');
    this.noPricingSubMessage = ko.observable('-');
    this.noPricingWarning = ko.observable('The total prices above do not include all selected items. We will contact you with full cost after order is placed.');

    this.orderStatus = ko.observable();
    this.orderError = ko.observable(false);

    this.page = ko.observable();
    this.addressDialogVm = ko.observable();
    this.showAddress = ko.observable(true);

    this.showSteppedWorkflow = ko.computed(function() {
        return (!productCatalogViewModel.retrievedOrder() &&
            self.page() !== 'items' &&
            self.page() !== 'confirmation');
    });

    this.cachedAddressId = ko.observable();

    this.orderNeedsApproval = ko.observable();
    this.orderNeedsApprovalMessage = ko.observable();
    this.draftStatus = ko.observable();

    this.disableSubmitButton = ko.observable(false);

    this.splitBillingDetails = function () {
        // Only separate billingDetails for orders who have this feature enabled
        if (this.showNewWorkflow()) {
            /*
            * NOTE:
            * orderDetails object contains fields that now should belong to the 'Billing Options' section. The block above
            * clones two identical objects to orderDetails and billingDetails. Block bellow strips "Bank Account Number", "Sub Account" and "Hierarchy" from
            * orderDetails, and all other properties from billingDetails.
            *
            * @Sam: This should probably be done on the API level, and separated into two respective sections. Then this code will become obsolete and removed.
            */
            var filter = function (sections, filters, inclusive) {
                _.each(sections(), function (sct) {
                    _.each(sct.Fields(), function (field, index) {
                        if ((inclusive && filters.indexOf(field.ID) > -1) || (!inclusive && filters.indexOf(field.ID) === -1)) {
                            sct.Fields.splice(index, 1);
                        }
                    });
                });
            };

            // List of fields that for whitelist and blacklist, depending on the object
            var filters = ["BAN", "SubAccount", "Hierarchy"];

            // Due to weird situation with knockout, this filter must be repeated twice as in the first iteration, first observable doesn't get detected
            for (var i = 0; i < 2; i++) {
                filter(customerOrderViewModel.billingDetails.Sections, filters, false);
                filter(customerOrderViewModel.orderDetails.Sections, filters, true);
            }
        }
    };

    this.orderDetails = {
        "FormID": ko.observable(),
        "UserData": ko.observable(),
        "Errors": ko.observableArray([]),
        "Sections": ko.observableArray([]),
        "initialized": ko.observable(false)
    };
    this.orderDetailsErrors = [];

    // TODO/FIXME (by Semir): Think about this. Maybe ask Sam to split this on the API level
    this.billingDetails = {
        "FormID": ko.observable(),
        "UserData": ko.observable(),
        "Errors": ko.observableArray([]),
        "Sections": ko.observableArray([]),
        "initialized": ko.observable(false)
    };
    this.billingDetailsErrors = [];

    // Show new workflow for New Order only (for now)
    this.showNewWorkflowFor = ["010"];

    this.init = function () {
        var addressId = MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().addressId),
            ticketContactId = self.dirId = MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().dirId);

        // for the catalog, pass this through
        if (typeof productCatalogViewModel.queryParams() !== 'undefined' && productCatalogViewModel.queryParams().ticketCategory) {
            this.ticketCategory = productCatalogViewModel.queryParams().ticketCategory;
        }

        this.addressDialogVm(new AddressDialogModel({ addressLabelText: "Address",createUnverifiedAddress:false }));

        this.addressDialogVm().city = ko.observable();
        this.addressDialogVm().state = ko.observable();
        this.addressDialogVm().errorMessage = ko.observable();

        if (this.ticketCategory) {
            // get category definition
            $.getJSON(productCatalogViewModel.endPoints.getCategoryDefinition + '?category=' + customerOrderViewModel.ticketCategory, function (data) {
                self.ticketAuth.authNotes(data.AuthorizationNotes);
            });
        }

        self.showNewWorkflow = ko.observable(self.showNewWorkflowFor.indexOf(self.ticketCategory) !== -1);
        self.splitBillingDetails();

        this.disablePreviousButton = ko.computed(function () {
            var flgStatus = false;

            if (self.page() === "review") {
                if (MetTel.Utils.stricmp(customerOrderViewModel.orderNeedsApprovalMessage(), "Approve")) {
                    flgStatus = true;
                }
            }
            else if (self.page() === "confirmation") {
                flgStatus = true;
            }

            return flgStatus;
        });

        this.disableNextButton = ko.computed(function () {
            var flgStatus = false;
            if (self.page() === "items") {
                if (self.items().length === 0) {
                    flgStatus = true;
                }
            }
            else if (self.page() === "details") {
                if (!self.detailsReady()) {
                    flgStatus = true;
                }
            }
            else if (self.page() === "authorization") {
                if (!self.ticketAuth.isValid()) {
                    flgStatus = true;
                }
            }
            else if (self.page() === "contact") {
                if (self.ticketContact.initialized()) {
                    if (!self.ticketContact.isValid()) {
                        flgStatus = true;
                    }
                }
                if (self.shippingVisible() && !self.shippingOptions.loaded() && self.shippingOptions.addressEntered()) {
                    flgStatus = true;
                }
            }
            else if (self.page() === "confirmation") {
                flgStatus = true;
            }

            return flgStatus;
        });

        if (addressId) {
            // Populate the Address
            this.addressDialogVm().loadAddress(addressId, productCatalogViewModel.queryParams().clientId);
            customerOrderViewModel.missingAddress(false);
        }
        else if (productCatalogViewModel.retrievedOrder() === false) {
            customerOrderViewModel.getAddress();
        }
        else {
            customerOrderViewModel.showAddress(false);
        }

        if (ticketContactId) {
            $.get(productCatalogViewModel.endPoints.getTicketContact, { dirId: ticketContactId }, function (response) {
                if (response) {
                    customerOrderViewModel.ticketContact.sameContact(false);
                    customerOrderViewModel.ticketContact.ticketContactEmail(response.Email);
                    customerOrderViewModel.ticketContact.ticketContactId = ticketContactId;
                    customerOrderViewModel.ticketContact.ticketContactName(response.FirstName + " " + response.LastName);
                    customerOrderViewModel.ticketContact.ticketContactPhone(response.Phone);

                }
            });
        }
    };

    this.getAddress = function() {

        var loadDefaultAddress = function() {
            //customerOrderViewModel.addressDialogVm().loadAddress(productCatalogViewModel.defaultAddressId, productCatalogViewModel.queryParams().clientId);
            productCatalogViewModel.productCatalogLoading(false);
            customerOrderViewModel.missingAddress(true);
        };

        var addressParams = {
            clientId: productCatalogViewModel.queryParams().clientId
        };

        if (customerOrderViewModel.dirId) {
            addressParams.dirId = customerOrderViewModel.dirId;
        }

        $.get(productCatalogViewModel.endPoints.getClientAddress, addressParams, function (response) {
            if (response && response !== 0) {
                customerOrderViewModel.addressDialogVm().loadAddress(response, productCatalogViewModel.queryParams().clientId);
                customerOrderViewModel.missingAddress(false);
            }
            else {
                loadDefaultAddress();
            }
        })
        .fail(function() {
            loadDefaultAddress();
        });
    };

    this.items = ko.observableArray([]);

    this.itemGroups = ko.observableArray([]);

    this.addToCart = function(product, productSku, quantity, orderModelData, subSkus, modifiedOrderData) {

        if (!productSku) {
            console.log("No valid SKU selected.");
            return;
        }

        var options = productCatalogViewModel.previewGroupOptions();

        // Capture free text entries
        var freeTextEntries = [];
        $.each(productCatalogViewModel.previewGroupOptions(), function (i, group) {
            if (group.configuration === 3) {
                freeTextEntries.push(group);
            }
        });

        var itemGroupOptions = {
                sku: productSku,
                skuObject: productCatalogViewModel.activeProduct().previewSelectedSku(),
                subcategoryId: productCatalogViewModel.activeProduct().parentSubcategoryId(),
                product: product,
                quantity: quantity,
                orderModelData: orderModelData,
                freeTextEntries: freeTextEntries,
                previewGroupOptions: options,
                subSkus: subSkus,
                modifiedOrderData: modifiedOrderData
            },
            itemGroup = new ItemGroup(itemGroupOptions);

        customerOrderViewModel.itemGroups.push(itemGroup);
    };

    this.createSubItems = function(newSkus, orderModelData, oldItems, subPricing) {
        var oldItemsMap = {},
            newItemsMap = {},
            subItems = [];

        if (oldItems) {
            // map old items
            $.each(oldItems, function(i, item) {
                oldItemsMap[item.skuId] = item;
            });
        }

        // create new items and map them
        $.each(newSkus, function(i, sku) {
            var skuId = sku.id || sku.skuId;

            // find matching choice
            var matchingChoice;
            $.each(subPricing || [], function(j, optionGroup) {
                if (matchingChoice) {
                    return false;
                }
                $.each(optionGroup.choices, function(k, choice) {
                    if (choice.sku === sku.sku) {
                        matchingChoice = choice;
                        return false;
                    }
                });
            });

            newItemsMap[skuId] = {
                'sku': ko.observable(sku.sku),
                'skuId': ko.observable(skuId),
                'quantity': ko.observable(sku.quantity),
                'status': ko.observable('PENDING'),
                'activity': ko.observable('ADD'),  // default to 'ADD'
                'parentFingerPrint': ko.observable(sku.hasOwnProperty('parentFingerPrint') ? sku.parentFingerPrint : ''),
                'parentConfigType': ko.observable(sku.hasOwnProperty('parentConfigType') ? sku.parentConfigType : ''),
                'fingerPrint': ko.observable(sku.hasOwnProperty('fingerPrint') ? sku.fingerPrint : ''),
                'sellerId': ko.observable(orderModelData ? orderModelData.Id : customerOrderViewModel.modifiedSellerId()),
                'contractId': ko.observable(orderModelData ? orderModelData.contractId : 0),
                'attributes': ko.observable(sku.attributesMap),
                'optionGroupSlugified': ko.observable(sku.optionGroupSlugified),
                'subCategoryId': sku.subcategoryId,
                'productName': sku.productName ? sku.productName : sku.name,
                'monthlyPrice': matchingChoice ? matchingChoice.monthly: 0,
                'oneTimePrice': matchingChoice ? matchingChoice.oneTime: 0
            };

            // create sub sub items
            if (sku.subSkus && sku.subSkus.length) {
                newItemsMap[skuId].subItems = ko.observableArray(customerOrderViewModel.createSubItems(sku.subSkus, orderModelData, (oldItemsMap[skuId] && oldItemsMap[skuId].subItems ? oldItemsMap[skuId].subItems : false), matchingChoice ? matchingChoice.subPricing : []));
            }
        });

        // add all new items to the combined array
        // and indicate if they existed from the previous order ('NOCHANGE')
        $.each(newItemsMap, function(skuId, subItem) {
            if (oldItemsMap[skuId]) {
                subItem.activity('NOCHANGE');
            }
            subItems.push(subItem);
        });

        if (oldItems) {
            // if there are any old items that aren't in the new items
            // mark them to be removed and add them to the combined array
            $.each(oldItemsMap, function(skuId, subItem) {
                if (!newItemsMap[skuId]) {
                    subItem.activity = 'REMOVE';
                    subItems.push(subItem);
                }
            });
        }

        return subItems;
    };

    this.missingPricing = ko.computed(function () {
        var missing = false;

        if (_.find(self.items(), function (item) {
                if (typeof item.noPricing !== 'undefined') {
                    return item.noPricing() === true;
                }
            })) {
            missing = true;
        }
        return missing;
    });

    this.uniqueSubcategories = ko.computed(function () {
        var subcategories = [],
            items = this.items();

        $.each(items, function (i, item) {
            if (item.subcategoryId() !== "") {
                subcategories.push(item.subcategoryId());
            }
        });

        return _.uniq(subcategories);
    }.bind(this));

    this.itemsBySubcategory = function (subCatId) {
        var products = [],
            items = customerOrderViewModel.items();

        $.each(items, function (i, item) {
            if (item.subcategoryId() === subCatId) {
                products.push(item);
            }
        });

        return products;
    };

    this.itemsGroupedByProductName = function (subCatId) {
        var object = _.groupBy(this.itemsBySubcategory(subCatId), function(item) {
                return item.product().name();
            }),
            array = [],
            index = 0;

        for (var key in object) {

            var group = {
                'name': key,
                'items': object[key]
            };

            /*jshint -W083 */
            _.each(group.items, function(item) {
                item.index = ko.observable(index);
                index++;
            });


            array.push(group);
        }

        return array;
    }.bind(this);

    this.subcategoryDetails = {};
    this.subcategoryDetailsErrors = [];
    this.subcategoryDetailsLoaded = ko.observable(false);

    this.detailsReady = ko.computed(function() {
        return self.orderDetails.initialized() && self.subcategoryDetailsLoaded();
    });

    this.callApprovalService = function () {
        var dirId = null;
        if (this.ticketContact && this.ticketContact.ticketContactId) {
            dirId = this.ticketContact.ticketContactId;
        }
        $.getJSON(productCatalogViewModel.endPoints.getApprovalRule, {
            category: customerOrderViewModel.ticketCategory,
            dirId: dirId
        }, function (data) {
            if (data !== null && MetTel.Utils.stricmp(data.ApprovalType, 'Never')) {
                customerOrderViewModel.orderNeedsApproval(false);

                // custom message for modify service
                if (typeof customerOrderViewModel.modifyOrder !== 'undefined' && typeof customerOrderViewModel.submitLabel !== 'undefined') {
                    customerOrderViewModel.orderNeedsApprovalMessage(customerOrderViewModel.submitLabel());
                }
                else {
                    customerOrderViewModel.orderNeedsApprovalMessage("Place Order");
                }
            } else {
                customerOrderViewModel.orderNeedsApproval(true);
                // custom message for modify service
                if (typeof customerOrderViewModel.modifyOrder !== 'undefined' && typeof customerOrderViewModel.submitForApprovalLabel !== 'undefined') {
                    customerOrderViewModel.orderNeedsApprovalMessage(customerOrderViewModel.submitForApprovalLabel());
                }
                else {
                    customerOrderViewModel.orderNeedsApprovalMessage("Place Order for Approval");
                }
            }

            if (customerOrderViewModel.orderNeedsApproval() === false && MetTel.Utils.stricmp(customerOrderViewModel.draftStatus(), "In Review")) {
                customerOrderViewModel.orderNeedsApprovalMessage("Approve");

                customerOrderViewModel.page('review');
                vmSteppedWorkflow.activeStep('review');
            }
        });
    };

    this.orderDetailsFor = function (subcategoryId) {
        if (customerOrderViewModel.subcategoryDetails[subcategoryId]) {
            return customerOrderViewModel.subcategoryDetails[subcategoryId];
        }
    };

    this.loadExistingOrder = function (ticketId) {
        productCatalogViewModel.retrievedOrder(true);
        productCatalogViewModel.productCatalogLoading(true);

        $.getJSON(productCatalogViewModel.endPoints.retrieveOrder + '?clientId=' + productCatalogViewModel.queryParams().clientId + '&ticketId=' + ticketId, function (data) {
            var result;

            customerOrderViewModel.existingOrder = true;

            // for vladimir's tickets
            // check data here to look for some distinguishing parameter
            // if it is present, we won't do any of this logic
            // instead in the template, we'll check this property and render an iframe to a different url
            // which should hopefully work for both the review screen and ticket details screen
            if (data === null) {
                customerOrderViewModel.differentDataModel(true);
            }
            else if (MetTel.Utils.stricmp(data.source, 'Max')) {
                customerOrderViewModel.legacyTicket(true);
                productCatalogViewModel.productCatalogLoading(false);
            }
            else if (MetTel.Utils.stricmp(data.source, 'Custom')) {
                customerOrderViewModel.customTicket(true);
                productCatalogViewModel.productCatalogLoading(false);
            }
            else {
                // Populate shipping options from saved data
                // NOTE: In future, we might support multiple shipping options. For now we don't.
                // Therefore we consider only the first element of the array.
                if (data.shippingOptions && data.shippingOptions.length > 0) {
                    self.shippingOptions.text(data.shippingOptions[0].MethodName);
                    self.shippingTotal(data.shippingOptions[0].totalCharge);
                    self.shippingVisible(true);
                } else {
                    self.shippingVisible(false);
                }

                // For modify service and ticket overview
                if (!customerOrderViewModel.ticketCategory) {
                    customerOrderViewModel.ticketCategory = data.category;
                }

                if (data.TicketId) {
                    customerOrderViewModel.TicketId = data.TicketId;
                }

                customerOrderViewModel.draftStatus(data.DraftStatus);
                // Populate the Address
                customerOrderViewModel.addressDialogVm().loadAddress(data.addressId, productCatalogViewModel.queryParams().clientId);

                var objInterval = setInterval(function () {
                    if (customerOrderViewModel.addressDialogVm().addressId() !== undefined || data.addressId === 0) {
                        clearInterval(objInterval);

                        // Populate the Cart
                        productCatalogViewModel.init(); // todo: might not need this

                        customerOrderViewModel.itemsDataRetrieved = {};

                        $.each(data.items, function (i, item) {

                            if (item.productId === 0) {
                                customerOrderViewModel.showItemInfo(false);
                            }

                            var cartItem = {},
                                attributesString = '';

                            cartItem.activity = ko.observable(item.activity);
                            cartItem.notes = ko.observable(item.notes);
                            cartItem.sku = ko.observable(item.sku);
                            cartItem.skuObject = ko.observable({
                                'id': ko.observable(item.skuId),
                                'sku': ko.observable(item.sku),
                                'itemState': ko.observable('NOCHANGE'),
                                'attributes': ko.observableArray([])
                            });
                            cartItem.attributesObject = ko.observable(item.attributes);
                            cartItem.attributes = ko.observable(); // checked attributes string will be populated once we get the product data

                            var monthlyTotal = item.monthlyPrice,
                                oneTimeTotal = item.oneTimePrice;
                            // Here is where the total price is adjusted by adding any subPricing to it
                            // because we initially just set it equal to the base price coming from the server,
                            // which we're assuming is the base sku price
                            if (item.subPricing) {
                                $.each(item.subPricing, function (i, group) {
                                    if (group.choices) {
                                        $.each(group.choices, function (j, choice) {
                                            // Adjust the total price based on the sub-pricing
                                            monthlyTotal += choice.monthly;
                                            oneTimeTotal += choice.oneTime;

                                            // Adjust for sub-sub-pricing if it exists
                                            if (choice.subPricing && choice.subPricing.length) {
                                                $.each(choice.subPricing, function(k, subGroup) {
                                                    if (subGroup.choices && subGroup.choices.length) {
                                                        $.each(subGroup.choices, function(l, subChoice) {
                                                            monthlyTotal += subChoice.monthly;
                                                            oneTimeTotal += subChoice.oneTime;
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }

                            cartItem.description = ko.observable();
                            cartItem.WTN = ko.observable(item.wtn);
                            cartItem.InventoryID = ko.observable(item.inventoryId);
                            cartItem.thumbnails = ko.observable();
                            cartItem.subcategoryId = ko.observable(item.subCategoryId);
                            cartItem.contractId = ko.observable(item.contractId);
                            cartItem.monthlyPriceBase = ko.observable(item.monthlyPrice);
                            cartItem.oneTimePriceBase = ko.observable(item.oneTimePrice);
                            cartItem.monthlyPriceTotal = ko.observable(monthlyTotal);
                            cartItem.monthlyPricePerUnit = ko.observable(monthlyTotal / item.quantity);
                            cartItem.oneTimePriceTotal = ko.observable(oneTimeTotal);
                            cartItem.oneTimePricePerUnit = ko.observable(oneTimeTotal / item.quantity);
                            cartItem.quantity = ko.observable(item.quantity);
                            cartItem.pricingGroupId = ko.observable(item.pricingGroupId);
                            cartItem.termsId = ko.observable(item.termsId);
                            cartItem.interestRate = ko.observable(item.interestRate);
                            cartItem.priceSource = ko.observable(item.priceSource);
                            cartItem.sellerId = ko.observable(item.sellerId);
                            cartItem.sellerLogoURL = ko.observable(item.sellerLogoURL);
                            cartItem.sellerName = ko.observable(item.sellerName);
                            cartItem.subPricing = ko.observable(item.subPricing);
                            cartItem.noPricing = ko.observable(typeof item.noPricing === 'undefined' ? false : item.noPricing);

                            if (item.text) {
                                cartItem.freeTextEntries = ko.observable(item.text.map(function (text) {
                                    return {
                                        'originalName': text.fieldName,
                                        'text': text.value,
                                        'itemState': ko.observable('NOCHANGE'),
                                        'configuration': text.configuration,
                                        'index': text.index,
                                        'maxLength': text.maxLength,
                                        'name': text.name,
                                        'rows': text.rows,
                                        'type': text.type
                                    };
                                }));

                                $.each(cartItem.freeTextEntries(), function (j, text) {
                                    text.itemState = ko.observable(text.itemState);
                                    text.text = ko.observable(text.text);
                                });
                            }
                            else {
                                cartItem.freeTextEntries = ko.observable([]);
                            }

                            // attach to cart item
                            cartItem.product = ko.observable();

                            var storedProduct = customerOrderViewModel.itemsDataRetrieved[item.productId];

                            if (!storedProduct) {
                                // call data

                                var productModel = {
                                    productDataLoaded: ko.observable(false)
                                };

                                // attach to cart item
                                cartItem.product(productModel);

                                // store new product
                                customerOrderViewModel.itemsDataRetrieved[item.productId] = productModel;

                                // fetch
                                if (item.productId) {
                                    var productUrl = productCatalogViewModel.endPoints.getSimpleProductData + '?id=' + item.productId;

                                    $.getJSON(productUrl, function (data) {

                                        // update product model with mapped data
                                        $.extend(productModel, ko.mapping.fromJS(data));

                                        productModel.productDataLoaded(true);
                                    });
                                }

                            } else {
                                // data has already been called for this id, so used stored product
                                cartItem.product(storedProduct);
                            }

                            // when ready, populate data for specifications modal and the checked attributes string
                            cartItem.product().productDataLoaded.subscribe(function (newValue) {

                                if (newValue && typeof cartItem.product().skus === 'function') {
                                    $.each(cartItem.product().skus(), function (j, sku) {
                                        if (cartItem.skuObject().id() === sku.id()) {
                                            cartItem.skuObject().attributes(sku.attributes());
                                            return false;
                                        }
                                    });
                                }

                                cartItem.attributes(productCatalogViewModel.checkedAttrsForSKU(cartItem.sku(), cartItem.product().skus()));
                            });

                            cartItem.subItems = ko.mapping.fromJS(item.subItems);

                            _.each(cartItem.subItems(), function(subItem) {
                                if (subItem.installDate() !== null) {
                                    if (subItem.parentFingerPrint().toLowerCase().indexOf('custominternationalplans') >= 0) {
                                        customerOrderViewModel.internationalPlanCutOffDate = ko.observable(subItem.installDate());
                                    }
                                    else if (subItem.parentFingerPrint().toLowerCase().indexOf('templateplans') >= 0) {
                                        customerOrderViewModel.domesticPlanCutOffDate = ko.observable(subItem.installDate());
                                    }
                                }
                            });

                            customerOrderViewModel.items.push(cartItem);
                        });

                        var objInterval2 = setInterval(function () {
                            if (data.items.length === customerOrderViewModel.items().length) {
                                // do the stuff
                                clearInterval(objInterval2);

                                $.each(data.subCategoryNotes, function (k, subcategory) {
                                    var subcategoryId = subcategory.subCategoryId;

                                    customerOrderViewModel.subcategoryDetails[subcategoryId] = {
                                        "FormID": ko.observable(),
                                        "UserData": ko.observable(),
                                        "Errors": ko.observableArray([]),
                                        "Sections": ko.observableArray([])
                                    };

                                    $.each(subcategory.notes, function (l, note) {
                                        var sectionModel = {};
                                        sectionModel.SectionName = note.sectionName;
                                        sectionModel.Fields = [];

                                        $.each(note.fields, function (m, field) {
                                            var fieldModel = {};

                                            fieldModel.DisplayName = field.displayName;
                                            fieldModel.DisplayText = field.noteText;
                                            fieldModel.Value = field.noteValue;
                                            fieldModel.ID = field.noteType;

                                            sectionModel.Fields[m] = fieldModel;
                                        });

                                        if (customerOrderViewModel.itemsBySubcategory(subcategoryId).length) {
                                            sectionModel.ChildSections = [];

                                            _.each(customerOrderViewModel.itemsBySubcategory(subcategoryId), function(item) {

                                                item.product().productDataLoaded.subscribe(function(newValue) {
                                                    var childSectionModel = {};
                                                    childSectionModel.SectionName = item.product().name();
                                                    childSectionModel.Fields = [];

                                                    $.each(item.notes(), function (m, newField) {
                                                        var fieldModel = {};

                                                        fieldModel.DisplayName = newField.displayName;
                                                        fieldModel.DisplayText = newField.noteText;
                                                        fieldModel.Value = newField.noteValue;
                                                        fieldModel.ID = newField.noteType;
                                                        fieldModel.ShowLabel = true;
                                                        fieldModel.Validators = [];

                                                        childSectionModel.Fields[m] = new field(fieldModel);
                                                    });

                                                    customerOrderViewModel.subcategoryDetails[subcategoryId].Sections()[0].ChildSections.push(childSectionModel);
                                                });
                                            });
                                        }

                                        customerOrderViewModel.subcategoryDetails[subcategoryId].Sections.push(new section(sectionModel));
                                    });

                                });

                                customerOrderViewModel.subcategoryDetailsLoaded(true);

                                customerOrderViewModel.ticketContact.accessHours(data.contact.accessHours);
                                customerOrderViewModel.ticketContact.sameContact(data.contact.sameContact);
                                customerOrderViewModel.ticketContact.siteContactEmail(data.contact.siteContactEmail);
                                customerOrderViewModel.ticketContact.siteContactId = ko.observable(data.contact.siteContactId);
                                customerOrderViewModel.ticketContact.siteContactName(data.contact.siteContactName);
                                customerOrderViewModel.ticketContact.siteContactPhone(data.contact.siteContactPhone);
                                customerOrderViewModel.ticketContact.siteContactPhoneExtension(data.contact.siteContactPhoneExtension);
                                customerOrderViewModel.ticketContact.subscribedEmail(data.contact.subscribedEmail);
                                customerOrderViewModel.ticketContact.suggestSiteContactName = ko.observable(data.contact.suggestSiteContactName);
                                customerOrderViewModel.ticketContact.suggestTicketContactName = ko.observable(data.contact.suggestTicketContactName);
                                customerOrderViewModel.ticketContact.ticketContactEmail(data.contact.ticketContactEmail);
                                customerOrderViewModel.ticketContact.ticketContactId = ko.observable(data.contact.ticketContactId);
                                customerOrderViewModel.ticketContact.ticketContactName(data.contact.ticketContactName);
                                customerOrderViewModel.ticketContact.ticketContactPhone(data.contact.ticketContactPhone);
                                customerOrderViewModel.ticketContact.ticketContactPhoneExtension(data.contact.ticketContactPhoneExtension);
                                customerOrderViewModel.ticketContact.initialized(true);

                                var objInterval3 = setInterval(function () {
                                    if (customerOrderViewModel.ticketContact.siteContactId !== 0) {

                                        customerOrderViewModel.orderStatus = ko.observable({
                                            'orderID': ko.observable(ticketId)
                                        });

                                        productCatalogViewModel.productCatalogLoading(false);
                                        clearInterval(objInterval3);
                                    }
                                },
                                100);

                            }
                        },
                        100);

                        // Populate the ticket authorization
                        customerOrderViewModel.ticketAuth = {
                            'authNotes': ko.observable(data.authorization.authNotes)
                        };

                        // Populate the notes
                        customerOrderViewModel.orderDetails.initialized(true);

                        customerOrderViewModel.showNewWorkflow = ko.observable(customerOrderViewModel.showNewWorkflowFor.indexOf(customerOrderViewModel.ticketCategory) !== -1);

                        if (customerOrderViewModel.showNewWorkflow()) {
                            customerOrderViewModel.splitBillingDetails();
                        }

                        $.each(data.notes, function (k, note) {
                            var sectionModel = {};
                            sectionModel.SectionName = note.sectionName;
                            sectionModel.Fields = [];

                            if (note.fields !== null) {
                                $.each(note.fields, function (m, field) {
                                    var fieldModel = {};

                                    fieldModel.DisplayName = field.displayName;
                                    fieldModel.DisplayText = field.noteText;
                                    fieldModel.Value = field.noteValue;
                                    fieldModel.ID = field.noteType;
                                    sectionModel.Fields[m] = fieldModel;
                                });
                            }

                            customerOrderViewModel.orderDetails.Sections.push(new section(sectionModel));
                            customerOrderViewModel.billingDetails.Sections.push(new section(sectionModel));
                        });

                        customerOrderViewModel.billingDetails.Sections()[0].SectionName("Billing Details");
                        if (customerOrderViewModel.showNewWorkflow()) {
                            customerOrderViewModel.splitBillingDetails();
                        }

                        // call approval service
                        customerOrderViewModel.callApprovalService();
                    }
                },
                100);

            }
        });
    };

    this.removeCartItem = function (item) {
        _.each(item.items(), function(item) {
            customerOrderViewModel.items.remove(item);
        });

        customerOrderViewModel.itemGroups.remove(item);
    };

    this.reconstructingProduct = ko.observable();

    this.reconstructProduct = function (mappedItem) {
        self.reconstructingProduct(true);

        var item = ko.mapping.toJS(mappedItem);

        productCatalogViewModel.loadProduct(item.product.id);

        // Let the product load first.
        var objInterval = setInterval(function () {
            if (typeof productCatalogViewModel.activeProduct() !== 'undefined' && productCatalogViewModel.productCatalogLoading() === false) {
                clearInterval(objInterval);

                var product = productCatalogViewModel.activeProduct();
                product.previewPricingOptionsSelectedQuantity(item.quantity);
                product.previewPricingOptionsGridInitialized(false);

                // Start with the SKUs
                var attributes = item.skuObject.attributes;

                // select appropriate options to match the sku
                for (var i = 0; i < attributes.length; i++) {

                    // break this iteration if this attribute is not selected
                    if (attributes[i].hasOwnProperty('selected') && attributes[i].selected === false) { continue; }

                    var formatKey = attributes[i].key.replace(/(\W|_)+/g, '').toLowerCase();
                    var formatValue = attributes[i].value.replace(/(\W|_)+/g, '').toLowerCase();
                    var forString = (attributes[i].key + attributes[i].value).replace(/[^a-z0-9 ]/gi,'').replace(/ /g,'_').toLowerCase();

                    var input = $('[for="' + forString + '"] input');

                    // radio button
                    if (input.length > 0) {
                        input[0].click();
                    }
                    // select
                    if (input.length === 0) {
                        /*jshint -W083 */
                        var thisAttr = _.find(productCatalogViewModel.previewGroupOptions(), function(option) {
                            if (typeof option.nameSlugified !== 'undefined') {
                                return option.nameSlugified === formatKey;
                            }
                        });

                        if (thisAttr) {
                            thisAttr.previewSelectedChoice(formatValue);
                        }
                    }
                }

                // after the sku values have been selected, hide the groups for skus only for modify service flow 2
                if (customerOrderViewModel.modifyOrder) {
                    if (customerOrderViewModel.modificationType() === 2) {
                        $('.mettel-product-preview-option-group-skus').hide();
                    }
                }

                // Then the Sub Item options
                for (var j = 0; j < item.subItems.length; j++) {
                    if (item.subItems[j].hasOwnProperty('parentFingerPrint')) {
                        var $matchingInput = $('[for="' + item.subItems[j].parentFingerPrint + '"] input'), // corresponding radio or checkbox for the subItem
                            matchingOptionGroup, // corresponding parent option group for the subItem
                            thisChoice;

                        /*jshint -W083 */
                        matchingOptionGroup = _.find(productCatalogViewModel.previewGroupOptions(), function(option) {
                            if (typeof option.nameSlugified !== 'undefined' && typeof item.subItems[j].optionGroupSlugified !== 'undefined') {
                                return option.nameSlugified === item.subItems[j].optionGroupSlugified;
                            }
                        });

                        // corresponding radio button or checkbox exists
                        if ($matchingInput.length > 0 && !$matchingInput.is(':checked')) {
                            $matchingInput[0].click();
                        }

                        // either a dropdown or we haven't found a corresponding radio/checkbox
                        if ($matchingInput.length === 0) {
                            if (matchingOptionGroup && matchingOptionGroup.previewSelectedChoice) {
                                // if it's a dropdown, select the first choice
                                if (matchingOptionGroup.choices().length > 5) {
                                    matchingOptionGroup.previewSelectedChoice(item.subItems[j].productName);
                                }
                                // if not a dropdown
                                else {
                                    // find and select the first option
                                    var firstOptionName = matchingOptionGroup.choices()[0].choice,
                                        $firstOptionInput = $('input[value="' + firstOptionName + '"]');

                                    if ($firstOptionInput.length > 0 && !$firstOptionInput.is(':checked')) {
                                        $firstOptionInput[0].click();
                                    }
                                }
                            }
                        }

                        // sub-option selection
                        if (item.subItems[j].hasOwnProperty('fingerPrint') && matchingOptionGroup) {
                            if (matchingOptionGroup.configuration === 1) {
                                thisChoice = ko.unwrap(matchingOptionGroup.previewSelectedChoiceObject);
                            }
                            else if (matchingOptionGroup.configuration === 2) {
                                thisChoice = _.find(matchingOptionGroup.choices(), function(choice) {
                                    return choice.choice === item.subItems[j].productName;
                                });
                            }

                            if (typeof thisChoice !== 'undefined') {
                                if (typeof thisChoice.subsLoaded !== 'undefined') {
                                    var subItem = item.subItems[j];

                                    var populateSubSubOptions = function(subItem, thisChoice) {

                                        thisChoice.subsLoaded.subscribe(function(newValue) {
                                            if (newValue) {
                                                setTimeout(function() {

                                                    var subInput = $('[for="' + subItem.fingerPrint + '"] input');

                                                    if (subInput.length > 0) {
                                                        subInput[0].click();
                                                    }
                                                    // select
                                                    if (subInput.length === 0) {
                                                        var thisSubOption = _.find(thisChoice.subOptions(), function(subOption) {
                                                            return subOption.id === subItem.skuId;
                                                        });

                                                        if (thisSubOption) {
                                                            thisChoice.subProductSelection(thisSubOption.sku);
                                                        }

                                                    }

                                                    // sub-sub-options
                                                    if (subItem.subItems) {
                                                        _.each(subItem.subItems, function(subSubItem) {
                                                            var thisSubSubOptionGroup,
                                                                thisSubSubOptionIndex;

                                                            _.each(thisChoice.subOptionGroups(), function(subOptionGroup) {
                                                                var tempSubSubOptionIndex = -1;

                                                                _.each(subOptionGroup.products(), function(product, index) {
                                                                    //account for 'none' options
                                                                    if (product.sku) {
                                                                        if (subSubItem.skuId === product.sku.id()) {
                                                                            tempSubSubOptionIndex = index;
                                                                        }
                                                                    }
                                                                });

                                                                if (tempSubSubOptionIndex >= 0) {
                                                                    thisSubSubOptionIndex = tempSubSubOptionIndex;
                                                                    thisSubSubOptionGroup = subOptionGroup;
                                                                }
                                                            });

                                                            // select radio buttons and selects
                                                            if (thisSubSubOptionGroup.optionGroupTypeId() === 1) {
                                                                thisSubSubOptionGroup.subSubProductSelection(thisSubSubOptionGroup.products()[thisSubSubOptionIndex]);
                                                            }
                                                            // populate checkboxes
                                                            else if (thisSubSubOptionGroup.optionGroupTypeId() === 2) {
                                                                thisSubSubOptionGroup.products()[thisSubSubOptionIndex].selected(true);
                                                            }
                                                        });
                                                    }
                                                }, 0);
                                            }
                                        });
                                    };

                                    populateSubSubOptions(subItem, thisChoice);

                                }
                            }
                        }
                    }
                }

                // Free Text Fields
                if (item.freeTextEntries) {
                    $.each(item.freeTextEntries, function (i, text) {
                        $('.mettel-product-preview-option-group:eq(' + text.index + ') textarea').val(text.text);
                    });
                }

                // after reconstruct product, look for the two specifc options
                if (typeof customerOrderViewModel.domesticPlanCutOffDate !== 'undefined' || typeof customerOrderViewModel.internationalPlanCutOffDate !== 'undefined' ) {
                        _.each(productCatalogViewModel.previewGroupOptions(), function(option) {
                            if (typeof option.nameSlugified !== 'undefined') {
                                var identifier = option.nameSlugified.replace('custom-', '');
                                    identifier = identifier.replace('template-', '');

                                if (identifier === 'plans' || identifier === 'international-plans') {
                                    option.originalChoice = ko.observable(option.previewSelectedChoice());

                                }
                            }
                        });
                    }

                self.reconstructingProduct(false);
            }
        }, 100);
    };

    this.modifyCartItem = function (item) {

        // Leave read only view
        productCatalogViewModel.readOnlyProduct(null);

        // Close cart/pricing
        productCatalogViewModel.viewCart(false);
        productCatalogViewModel.viewPricing(false);

        this.reconstructProduct(item);

        this.removeCartItem(item);
    };

    this.quantityTotal = ko.observable();
    this.monthlyTotal = ko.observable();
    this.oneTimeTotal = ko.observable();
    this.shippingTotal = ko.observable(0);
    this.oneTimeSubTotal = ko.observable();
    this.monthlySubTotal = ko.observable();
    this.shippingWeightTotal = ko.observable();
    this.shippingVisible = ko.observable();

    /*
    * NOTE:
    * I was told that shipping weight total for the order should be calculated recursively. I'm not sure if there's any other path to check for the
    * calculation, other than attributes and attributesObject.
    */
    this.calculateShippingWeightForProduct = function (product) {
        if (product.options && product.options.orderModelData && product.options.orderModelData.shippingInfo) {
            self.shippingWeightTotal(self.shippingWeightTotal() + parseFloat(product.options.orderModelData.shippingInfo.weight));
        }

        if (product.subItems) {
            $.each(product.subItems(), function (i, subItem) {
                self.calculateShippingWeightForProduct(subItem);
            });
        }
    };

    this.updateCartTotals = ko.computed(function () {
        var quantityTotal = 0,
            monthlyTotal = 0,
            oneTimeTotal = 0;

        self.shippingWeightTotal(0);
        if (!self.existingOrder) {
            self.shippingVisible(false);
        }

        $.each(self.items(), function (i, product) {
            quantityTotal += product.quantity();
            monthlyTotal += product.monthlyPriceTotal();
            oneTimeTotal += product.oneTimePriceTotal();

            self.calculateShippingWeightForProduct(product);

            if (!self.existingOrder && product.options && product.options.orderModelData.hasShipping === true) {
                self.shippingVisible(true);
            }
        });

        self.quantityTotal(quantityTotal);
        self.monthlyTotal(monthlyTotal);
        self.oneTimeTotal(oneTimeTotal + self.shippingTotal());
        self.oneTimeSubTotal(oneTimeTotal);
    }, self);

    this.endPoints = productCatalogViewModel.endPoints;

    var TicketContact = function () {
        var contact = this;

        contact.initialized = ko.observable(false);
        contact.sameContact = ko.observable(true);
        contact.siteContactId = 0;
        contact.ticketContactId = 0;
        contact.siteContactName = ko.observable().extend({ required: true });
        contact.suggestSiteContactName = "";
        contact.suggestTicketContactName = "";
        contact.siteContactName.subscribe(function (value) {
            if (contact.suggestSiteContactName && value !== contact.suggestSiteContactName) {
                contact.siteContactId = 0;
            }
        });

        contact.siteContactPhone = ko.observable().extend({
            required: true, pattern: {
                message: 'This field must be a valid phone number.',
                params: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
            }
        });
        contact.siteContactPhoneExtension = ko.observable();
        contact.siteContactEmail = ko.observable().extend({ required: true, email: true });
        contact.ticketContactName = ko.observable().extend({
                validation: {
                    validator: function (val) {
                        if (!contact.sameContact()) {
                            return val;
                        }
                        return true;
                    },
                    message: 'Ticket Contact Name is required.'
                }
            }
        );
        contact.ticketContactName.subscribe(function (value) {
            if (contact.suggestTicketContactName && value !== contact.suggestTicketContactName) {
                contact.ticketContactId = 0;
            }
        });
        contact.ticketContactPhoneExtension = ko.observable();
        contact.ticketContactPhone = ko.observable().extend({
            pattern: {
                message: 'This field must be a valid phone number.',
                params: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
            }
        }).extend({
                validation: {
                    validator: function (val) {
                        if (!contact.sameContact()) {
                            return val;
                        }
                        return true;
                    },
                    message: 'Ticket Contact Phone is required.'
                }
            }
        );
        contact.ticketContactEmail = ko.observable().extend({ email: true }).extend({
                validation: {
                    validator: function (val) {
                        if (!contact.sameContact()) {
                            return val;
                        }
                        return true;
                    },
                    message: 'Ticket Contact Email is required.'
                }
            }
        );
        contact.accessHours = ko.observable("MONDAY|ALL DAY,TUESDAY|ALL DAY,WEDNESDAY|ALL DAY,THURSDAY|ALL DAY,FRIDAY|ALL DAY,SATURDAY|NOT AVAILABLE");
        contact.subscribedEmail = ko.observable(true);
        contact.selectSiteContact = function (data) {
            contact.suggestSiteContactName = data.Text;
            contact.siteContactId = data.valueObject.DirID;
            contact.siteContactPhone(data.valueObject.Phone);
            contact.siteContactPhoneExtension(data.valueObject.Extension);
            contact.siteContactEmail(data.valueObject.Email);
        };
        contact.selectTicketContact = function (data) {
            contact.suggestTicketContactName = data.Text;
            contact.ticketContactId = data.valueObject.DirID;
            contact.ticketContactPhone(data.valueObject.Phone);
            contact.ticketContactPhoneExtension(data.valueObject.Extension);
            contact.ticketContactEmail(data.valueObject.Email);
        };
        contact.loadSiteAccessHours = function () {
            $.get("/api/address/getsiteaccesshours", { clientId: productCatalogViewModel.queryParams().clientId, addressId: self.addressDialogVm().addressId() }, function (response) {
                contact.accessHours(response);
            });
        };
        contact.saveSiteAccessHours = function () {
            $.post("/api/address/savesiteaccesshours", { clientId: productCatalogViewModel.queryParams().clientId, addressId: self.addressDialogVm().addressId(), hours: contact.accessHours() }, function (response) {

            });
        };
        contact.loadSiteContact = function () {
            var loadDefaultContact = function () {
                $.get(productCatalogViewModel.endPoints.getDefaultContact, function (response) {
                    contact.siteContactName(response.FirstName + " " + response.LastName);
                    contact.siteContactId = response.DirID;//have to set after site contact name
                    contact.siteContactPhone(response.Phone);
                    contact.siteContactPhoneExtension(response.Extension);
                    contact.siteContactEmail(response.Email);
                });
            };

            $.get(productCatalogViewModel.endPoints.getSiteContacts, { clientId: productCatalogViewModel.queryParams().clientId, addressId: self.addressDialogVm().addressId() }, function (response) {
                if (response && response.length > 0) {
                    contact.siteContactName(response[0].FirstName + " " + response[0].LastName);
                    contact.siteContactId = response[0].DirID;//have to set after site contact name
                    contact.siteContactPhone(response[0].Phone);
                    contact.siteContactPhoneExtension(response[0].Extension);
                    contact.siteContactEmail(response[0].Email);
                } else {
                    loadDefaultContact();
                }
            });
        };


        contact.load = function () {
            contact.loadSiteAccessHours();
            contact.loadSiteContact();
        };
        contact.loadEditModel = function (model, review) {
            contact.sameContact(model.SameContact);
            if (!model.SameContact) {
                contact.ticketContactId = model.TicketContactId;
                contact.ticketContactEmail(model.TicketContactEmail);
                contact.ticketContactName(model.TicketContactName);
                contact.ticketContactPhone(model.TicketContactPhone);
                contact.ticketContactPhoneExtension(model.TicketContactPhoneExtension);
            }
            if (model.Notes["TAT"]) {
                contact.accessHours(model.Notes["TAT"]);
            } else {
                contact.loadSiteAccessHours();
            }
            contact.subscribedEmail(model.Subscribed);
            if (model.SiteContactId || model.SiteContactName) {
                contact.siteContactId = model.SiteContactId;
                contact.siteContactName(model.SiteContactName);
                contact.siteContactPhone(model.SiteContactPhone);
                contact.siteContactPhoneExtension(model.SiteContactPhoneExtension);
                contact.siteContactEmail(model.SiteContactEmail);
            } else {
                contact.loadSiteContact();
            }

            ko.mapping.fromJS(contact, null, review);
        };
    };

    this.ticketContact = new TicketContact();

    var ShippingOptions = function (defaultValue) {
        var shipping = this;

        shipping.choice = ko.observable(defaultValue);
        shipping.text = ko.observable();
        shipping.options = ko.observableArray([]);
        shipping.loaded = ko.observable(false);
        shipping.addressEntered = ko.observable(false);
        shipping.current = ko.observable();

        shipping.data = null;
        shipping.toAddress = ko.observable();
        shipping.toAddressId = ko.observable();
        shipping.fromAddressId = ko.observable();

        shipping.choice.subscribe(function (value) {
            // Find the cost for the selected option
            $.each(shipping.data.ShippingOptions, function (i, v) {
                if (v.Method.Code === value) {
                    self.shippingTotal(v.TotalCharge);
                    shipping.text(v.Method.Name);
                    shipping.current(v);
                    return;
                }
            });
        });

        shipping.attachListener = function () {
            var listen = null;

            if (!self.shippingVisible()) {
                return;
            }

            _.each(self.uniqueSubcategories(), function (subId) {
                var details = self.orderDetailsFor(subId);
                if (listen === null) {
                    _.each(details.Sections()[0].Fields(), function (field) {
                        if (field.ID === 'ShippingAddress') {
                            listen = field;
                        }
                    });
                }
            });

            if (listen) {
                listen.Value.subscribe(function (value) {
                    shipping.addressEntered(true);
                    shipping.load();
                });
            }
        };

        // Loads shipping quotes
        shipping.load = function () {
            var addr, details;

            // Read order details
            for (var d in self.uniqueSubcategories()) {
                if (self.uniqueSubcategories().hasOwnProperty(d)) {
                    details = self.orderDetailsFor(self.uniqueSubcategories()[d]);

                    // Find a section with Shipping Address field (it can be only one per order)
                    if (details && details.Sections) {
                        for (var s in details.Sections()) {
                            if (details.Sections().hasOwnProperty(s)) {
                                var sect = details.Sections()[s];
                                if (sect) {
                                    for (var f in sect.Fields()) {
                                        if (sect.Fields().hasOwnProperty(f)) {
                                            var field = sect.Fields()[f];

                                            if (field.ID === 'ShippingAddress') {
                                                addr = field;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Parse the address information from a single line string in following format:
            // {Address}\n\r{City}, {State} {Zip}
            //
            // Since the address line from order details is parsed *after* rigorous validation from the earlier steps, this code
            // doesn't make any assumptions about the address sanity.
            var line = addr.DisplayText(),
                addressLine = line.split('\n\r'),
                city = addressLine[1].split(','),
                state = city[1].trim().split(' ');

            addressLine = addressLine[0];
            city = city[0].trim();
            var zip = state[1];
            state = state[0];
            var country = 'US'; // TODO/FIXME (by Semir): Learn more about this, I didn't find a way to get the country code

            // Check subproducts (TOOD/FIX) recursive
            // Store the address ID of the toAddress (might come handy for the API if they want to read the address themselves)
            shipping.toAddressId(addr.Value());
            shipping.toAddress(addr.DisplayText());
            shipping.fromAddressId(self.addressDialogVm().addressId());

            // Create request structure for the API (TODO: Convert to IDs when API accepts it)
            // When creating following request, error occurrs:
            // server error (500):/api/address/ShippingMethod An exception has been raised as a result of client data.
            /*var request = {
                ShipFromAddress: {
                    AddressId: shipping.fromAddressId()
                },
                ShipToAddress: {
                    AddressId: shipping.toAddressId()
                },
                Weight: self.shippingWeightTotal()
            };*/

            // Create request structure for the API (TODO: Convert to IDs when API accepts it)
            var request = {
                ShipFromAddress: {
                    AddressLines: [
                        self.addressDialogVm().validatedAddress().Address1
                    ],
                    City: self.addressDialogVm().validatedAddress().City,
                    State: self.addressDialogVm().validatedAddress().State,
                    Zip: self.addressDialogVm().validatedAddress().Zip,
                    Country: 'US'
                },
                ShipToAddress: {
                    AddressLines: [
                        addressLine
                    ],
                    City: city,
                    State: state,
                    Zip: zip,
                    Country: country
                },
                Weight: self.shippingWeightTotal()
            };

            // Make a call to API to get the shipping quotes
            $.ajax({
                type: "post",
                url: "/api/address/ShippingMethod",
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data: JSON.stringify(request)
            }).done(function (data) {
                shipping.data = data;
                shipping.options(data.ShippingOptions);
                shipping.choice(data.ShippingOptions[0].Method.Code);

                setTimeout(function () {
                    shipping.loaded(true);
                }, 100);
            });
        };
    };

    this.shippingOptions = new ShippingOptions();

    var TicketAuth = function () {
        var auth = this;
        auth.authNotes = ko.observable();
    };

    this.ticketAuth = new TicketAuth();

    this.detailsFormDirty = ko.observable(false);

    this.validateAddressField = function (validate) {
        // If errors exist, do not advance, but with following exceptions (Temporary logic here)
        for (var f in customerOrderViewModel.subcategoryDetailsErrors) {
            var field = customerOrderViewModel.subcategoryDetailsErrors[f];
            if (field.ID === 'ShippingAddress') {
                field.validateField(validate);
                break;
            }
        }
    };

    this.orderDetailsNext = function () {
        if (self.page() === 'details') {
            self.validateAddressField(false);
        }

        if (!customerOrderViewModel.orderDetailsErrors.isValid() || !customerOrderViewModel.subcategoryDetailsErrors.isValid()) {
            customerOrderViewModel.detailsFormDirty(true);
            showAllFormErrors('.mettel-customer-catalog-details-form');
        } else {
            if (self.page() === 'details') {
                this.validateAddressField(true);
                self.shippingOptions.attachListener();
            }
            vmSteppedWorkflow.nextStep();
        }
    };

    this.goToItems = function() {
        vmSteppedWorkflow.goToStepById('items');
        if (self.modifyOrder) {
            if (self.originalOrderItem) {
                self.reconstructProduct(self.originalOrderItem);
            } else {
                productCatalogViewModel.selectCategoryOnUpdate();
            }
        }
    };
}

ko.bindingHandlers.steppedNavPrev = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.click(function (e) {
            e.preventDefault();
            vmSteppedWorkflow.previousStep();
            $('[data-mettel-class="customer-order-container"]').find(MetTel.Variables.focusableSelectors).first().focus();
        });
    }
};

ko.bindingHandlers.steppedNavNext = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.click(function (e) {
            e.preventDefault();

            if (customerOrderViewModel.page() === 'contact') {
                if (!customerOrderViewModel.shippingVisible()) {
                    vmSteppedWorkflow.nextStepFocus();
                    return;
                }

                if (!customerOrderViewModel.subcategoryDetailsErrors.isValid()) {
                    customerOrderViewModel.detailsFormDirty(true);
                    showAllFormErrors('.mettel-customer-catalog-details-form');
                } else {
                    vmSteppedWorkflow.nextStepFocus();
                }
            } else {
                vmSteppedWorkflow.nextStepFocus();
            }
        });
    }
};

function ProductModel(options) {
    var product = this;
    var mappedProduct;


    (BaseProductModel.bind(this, options))();
}

function CustomerCatalogModel() {
    // Extend ProductCatalogModel with BaseCatalogModel
    var productCatalog = this;
    productCatalogViewModel = this;

    (BaseCatalogModel.bind(this))();

    this.initialized = ko.observable();

    this.viewCart = ko.observable(false);
    this.viewPricing = ko.observable(false);

    this.customerCatalogItemsVisible = ko.observable(false);

    // Hold the cart item to show in read only view
    this.readOnlyProduct = ko.observable();

    this.productIsDirty = function () {
        return false;
    };

    // Clicking on an item in the cart will show the read only view
    this.viewProductReadOnly = function (item) {
        productCatalog.activeSubcategory(null);
        item.product().previewPricingOptionsGridInitialized(true);
        productCatalogViewModel.activeProduct(item.product());
        productCatalog.readOnlyProduct(item);
    };

    this.viewMenuStart = function () {
        // Close the cart
        this.viewCart(false);
        this.viewPricing(false);
        // Update the hash
        window.location.hash = "#";
        // Unset read only product
        this.activeProduct(null);
        this.readOnlyProduct(null);
    };
}


ko.bindingHandlers.customerCatalog = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        productCatalogViewModel = viewModel;

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.queryParams(options.queryParams);
            viewModel.defaultAddressId = options.defaultAddressId ? options.defaultAddressId : 227513; // if no default address id is specified, use MetTel's
        }

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
                setTimeout(function () {
                    if (state.hasOwnProperty("tab")) {
                        this.loadTab(state.tab);
                    }
                }.bind(this), 500);
            } else if (!customerOrderViewModel.modifyOrder || customerOrderViewModel.modificationType() !== 2) { // don't initialize for modType 2 because it has an active product
                this.initializeState();
            }
        };

        viewModel.lookupSubcategory = function (subcategories, subcategoryId) {
            for (var i = 0; i < subcategories.length; i++) {
                if (subcategories[i].id === parseInt(subcategoryId, 10)) {
                    return i;
                }
            }
            return 0;
        };

        viewModel.lookupCategoryFromSubcategory = function (subcategoryId) {
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

            currentProduct.getProductData(function () {

                // Load the appropriate category for this product.
                var subcategoryId = currentProduct.parentSubcategoryId();
                var categoryId = this.lookupCategoryFromSubcategory(subcategoryId);
                if (categoryId !== null) {
                    this.loadCategory(categoryId, subcategoryId, true);
                } else {
                    console.log("Error: Subcategory " + subcategoryId + " does not exist.");
                }

            }.bind(this));
        };

        viewModel.loadTab = function (tabIndex) {
            $(".mettel-product-tab-container .mettel-tab-item:eq(" + tabIndex + ") .mettel-link").click();
        };

        viewModel.initializeState = function () {
            this.falsifyCategorySelectedObservables();
            this.activeSubcategory(null);
            this.deactivateProduct();
            if (this.mostPopularInitialized()) {
                this.mostPopular.recalculateHeight();
            }
        };

        viewModel.initialized(true);

        ko.applyBindingsToNode(element, {
            template: {
                name: 'customer-catalog',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.cancelSteppedWorkflow = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $('[data-mettel-class="stepped-workflow-cancel-confirmation"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-unsaved-changes-discard"]'),
            $cancel = $modal.find('[data-mettel-class="modal-confirm-unsaved-changes-cancel"]');

        $element.click(function (e) {
            e.preventDefault();

            $modal.modalWindow();
        });

        $confirm.click(function (e) {
            e.preventDefault();

            if (typeof productCatalogViewModel.endPoints.cancelUrl === "undefined") {
                window.location.reload();
            }
            else {
                window.location = productCatalogViewModel.endPoints.cancelUrl;
            }
        });

        $cancel.click(function (e) {
            e.preventDefault();

            $modal.modalWindow('close');
        });
    }
};

/*
 for modify service, if a checkbox option has "no change" enabled
 we need to detect as soon as a change is made
 */
ko.bindingHandlers.watchSubOptions = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            value = valueAccessor();

        if (value()) {
            $element.on('change', 'input[type="checkbox"]', function() {
                viewModel.optionsUnchanged(false);
            });
        }

    }
};

ko.bindingHandlers.customerOrder = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'customer-order', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.clearCatalogPageModals = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $page = $(element).closest('[data-mettel-class="page"]');

        viewModel.page.subscribe(function () {
            var $modals = $page.children('.mettel-modal-overlay');
            $modals.remove();
        });
    }
};

ko.bindingHandlers.toggleViewCart = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $cartButton = $(element),
            vmCustomerCatalog = bindingContext.$parent,
            inputs = $('.mettel-shopping-cart').find('input, select, textarea, a, button:not(.mettel-view-shopping-cart-button)');

        $cartButton.click(function () {

            // If in read only view
            if (vmCustomerCatalog.readOnlyProduct()) {
                // Go back to start menu in addition to closing cart
                vmCustomerCatalog.viewMenuStart();
            } else {
                if (vmCustomerCatalog.viewPricing()) {
                    vmCustomerCatalog.viewPricing(false);
                }
                vmCustomerCatalog.viewCart(!vmCustomerCatalog.viewCart());
            }
        });

        $(inputs).attr( { 'tabindex': -1 } );

        vmCustomerCatalog.viewCart.subscribe(function(newValue) {
            var tabindex = newValue ? 0 : -1;

            $(inputs).attr( { 'tabindex': tabindex } );
        });
    }
};

ko.bindingHandlers.toggleViewPricing = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $pricingButton = $(element),
            vmCustomerCatalog = bindingContext.$parent;

        $pricingButton.click(function () {
            vmCustomerCatalog.viewPricing(!vmCustomerCatalog.viewPricing());
        });
    }
};

ko.bindingHandlers.removeFromCart = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $removeButton = $(element),
            item = valueAccessor(),
            vmCustomerCatalog = bindingContext.$parents[1],
            $modal = $('[data-mettel-class="confirm-remove-item-from-cart-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-delete"]'),
            $cancel = $modal.find('[data-mettel-class="modal-cancel-delete"]');

        $removeButton.click(function () {
            $modal.modalWindow();

            $confirm.click(function () {
                customerOrderViewModel.removeCartItem(item);
                vmCustomerCatalog.viewMenuStart();
                $modal.modalWindow('close');
            });

            $cancel.click(function () {
                $modal.modalWindow('close');
            });
        });
    }
};

ko.bindingHandlers.itemTooltip = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $tooltipTrigger = $(element);

        setTimeout(function () {
                $tooltipTrigger.mettelTooltip({
                    position: "right",
                    hoverDelay: 100
                });
            },
            1);
    }
};

ko.bindingHandlers.optionTooltip = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $tooltipTrigger = $(element);

        // when modal is loaded, the type is not yet set
        setTimeout(function () {
            $tooltipTrigger.mettelTooltip({
                position: "right",
                hoverDelay: 100
            });
        },
        1);
    }
};

ko.bindingHandlers.configureNewAddressDialog = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $flyout = $element.prev(),
            $cancel = $flyout.find('[data-mettel-class="new-address-dialog-cancel"]'),
            $apply = $flyout.find('[data-mettel-class="new-address-dialog-apply"]'),
            $inputs = $flyout.find(MetTel.Variables.focusableSelectors),
            flyoutOptions = {
                event: 'click',
                position: 'bottom',
                customTabbing: true,
                additionalOverlayClass: 'mettel-new-address-missing-address-overlay'
            },
            objOriginalAddress,
            saveAsDefaultValueAtOpen;

        flyoutOptions.open = function() {

            if (event) {
                event.preventDefault();
            }

            saveAsDefaultValueAtOpen = customerOrderViewModel.saveAddressAsDefault();

            if (customerOrderViewModel.missingAddress() === false) {
                $('.mettel-page').find('.mettel-new-address-missing-address-overlay').removeClass('mettel-new-address-missing-address-overlay');

                objOriginalAddress = {
                    address: customerOrderViewModel.addressDialogVm().validatedAddress().Address1,
                    city: customerOrderViewModel.addressDialogVm().validatedAddress().City,
                    state: customerOrderViewModel.addressDialogVm().validatedAddress().State,
                    zip: customerOrderViewModel.addressDialogVm().validatedAddress().Zip,
                    id: customerOrderViewModel.addressDialogVm().addressId()
                };

                customerOrderViewModel.addressDialogVm().city(objOriginalAddress.city);
                customerOrderViewModel.addressDialogVm().state(objOriginalAddress.state);
            }
            else {
                customerOrderViewModel.addressDialogVm().address('');
                customerOrderViewModel.addressDialogVm().city('');
                customerOrderViewModel.addressDialogVm().state('');
                customerOrderViewModel.addressDialogVm().zipCode('');

                customerOrderViewModel.saveAddressAsDefault(true);

                objOriginalAddress = {
                    id: 0
                };
                this.cancel = $.noop();
                $('.mettel-new-address-missing-address-overlay').off('click');
            }

            $flyout.find('.mettel-input').first().focus().select();
        };

        flyoutOptions.cancel = function() {

            customerOrderViewModel.addressDialogVm().validatedAddress({
                Address1: objOriginalAddress.address,
                City: objOriginalAddress.city,
                State: objOriginalAddress.state,
                Zip: objOriginalAddress.zip
            });

            customerOrderViewModel.addressDialogVm().address(objOriginalAddress.address);
            customerOrderViewModel.addressDialogVm().zipCode(objOriginalAddress.zip);
            customerOrderViewModel.addressDialogVm().isValidated(true);

            if (saveAsDefaultValueAtOpen !== customerOrderViewModel.saveAddressAsDefault()) {
                customerOrderViewModel.saveAddressAsDefault(saveAsDefaultValueAtOpen);
            }
        };

        flyoutOptions.flyout = $flyout;

        $element.mettelFlyout(flyoutOptions);

        // get rid of subscription which watches the zip code and does service calls
        customerOrderViewModel.addressDialogVm().zipCodeSubscription.dispose();
        customerOrderViewModel.addressDialogVm().computedAddress.dispose();

        $cancel.on('click', function() {
            $element.mettelFlyout('cancel', flyoutOptions);
        });

        $apply.on('click', function() {
            var zipCode;

            if (customerOrderViewModel.addressDialogVm().country() === 'USA') {
                zipCode = customerOrderViewModel.addressDialogVm().zipCode().substring(0, 5); // remove +4 from zip
            } else if (customerOrderViewModel.addressDialogVm().country() === 'Canada') {
                zipCode = customerOrderViewModel.addressDialogVm().zipCode().replace(' ', '');
            } else {
                zipCode = customerOrderViewModel.addressDialogVm().zipCode();
            }

            var address = {
                address1: customerOrderViewModel.addressDialogVm().address(),
                city: customerOrderViewModel.addressDialogVm().city(),
                state: customerOrderViewModel.addressDialogVm().state(),
                zipCode: zipCode
            };

            var validationResult = customerOrderViewModel.addressDialogVm().validateAddress(address);
            var validatedAddress = validationResult.address;

            if (validatedAddress) {
                customerOrderViewModel.addressDialogVm().isValidated(true);
                customerOrderViewModel.addressDialogVm().errorMessage('');

                customerOrderViewModel.addressDialogVm().addressId(validatedAddress.AddressID);

                customerOrderViewModel.addressDialogVm().validatedAddress({
                    Address1: validatedAddress.Address1,
                    City: validatedAddress.City,
                    State: validatedAddress.State,
                    Zip: validatedAddress.Zip
                });

                customerOrderViewModel.addressDialogVm().address(validatedAddress.Address1);
                customerOrderViewModel.addressDialogVm().zipCode(validatedAddress.Zip);

                // if address has changed, redirect to Items homepage
                if (validatedAddress.AddressID !== objOriginalAddress.id || (customerOrderViewModel.saveAddressAsDefault() && !saveAsDefaultValueAtOpen)) {

                    // update url search string to include new address id
                    var baseUrl = window.location.pathname,
                        search = window.location.search,
                        newSearch = search.replace(/(addressId=)[^\&]+/, '$1' + validatedAddress.AddressID);
                    window.history.pushState('', '', baseUrl + newSearch);

                    productCatalogViewModel.viewMenuStart();
                    productCatalogViewModel.activeSubcategory(null);
                    productCatalogViewModel.init(true); // passing true here will cause menu call to include saveAsDefault param
                }

                $element.mettelFlyout('close', flyoutOptions);

                customerOrderViewModel.missingAddress(false);
            }
            else {
                customerOrderViewModel.addressDialogVm().errorMessage(validationResult.error ? validationResult.error : 'Address is incorrect.');
                customerOrderViewModel.addressDialogVm().isValidated(false);
            }
        });

        var addressSubscription = customerOrderViewModel.missingAddress.subscribe(function(newValue) {
            if (newValue === true) {
                $('.mettel-order-address-action').click();
                addressSubscription.dispose();
            }
        });
    }
};

ko.bindingHandlers.submitErrorModal = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $modal = $(element),
            flgError = ko.unwrap(valueAccessor()),
            vmCustomerCatalog = bindingContext.$parents[1],
            $cancel = $modal.find('[data-mettel-class="modal-cancel"]'),
            modalOptions = {};

        if (flgError === true) {
            modalOptions.close = function () {
                viewModel.orderError(false);
            };

            $modal.modalWindow(modalOptions);
        }

        $cancel.click(function () {
            $modal.modalWindow('close', modalOptions);
        });
    }
};

var validateItem;

// dynamic item level notes for Details step
ko.bindingHandlers.configureChildNotePanels = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        // hide all forms besides the first
        _.each($element.find('.mettel-catalog-item-notes-fields:not(:first)'), function(element) {
            $(element).hide();
        });

        // put active class on the first header
        $element.find('.mettel-catalog-item-notes-header:first').addClass('mettel-active');

        // handle clicking headers
        _.each($element.find('.mettel-catalog-item-notes-header'), function(element) {
            $(element).on('click', function() {
                // hide all forms and remove active class from headers
                $element.find('.mettel-catalog-item-notes-fields').hide();
                $element.find('.mettel-catalog-item-notes-header').removeClass('mettel-active');

                // "select" the active header and form
                $(this).addClass('mettel-active');
                $(this).parent().next().show();
            });
        });

        validateItem = function(element) {
            var indicator = $(element).parent().prev().find('.mettel-catalog-item-notes-section-validation').children()[0],
                errors = $(element).find('.mettel-error-message:not(:empty)');

            if (errors.length === 0) {
                $(indicator).removeClass('mettel-item-notes-incomplete');
                $(indicator).addClass('mettel-item-notes-complete');
                $($(indicator).children()[0]).text('complete');
            }
            else {
                $(indicator).addClass('mettel-item-notes-incomplete');
                $(indicator).removeClass('mettel-item-notes-complete');
                $($(indicator).children()[0]).text('incomplete');
            }
        };

        _.each($element.find('.mettel-catalog-item-notes-field-group'), function(element) {
            // initial validation
            validateItem(element);

            // validation on field blur
            $(element).on("blur", "select, input, textarea", function() {
                validateItem(element);
            });

        });
    }
};

// Apply To All button wiring up for dynamic item level notes for Details step
ko.bindingHandlers.wireApplyToAll = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            field = viewModel,
            section = bindingContext.$parents[1],
            product = bindingContext.$parents[2];

        $element.on('click', function() {
            var filteredSections = _.filter(product, function(childSection) {
                return childSection.SectionName() === section.name;
            });

            _.each(filteredSections, function(section) {
                var otherField = _.find(section.Fields(), function(thisField) {
                    return thisField.ID === field.ID;
                });

                if (otherField) {
                    otherField.Value(field.Value());

                    for (var i = 0; i < otherField.ChildFields().length; i++) {
                        otherField.ChildFields()[i].Value(field.ChildFields()[i].Value());
                    }
                }

                _.each($($($element).parents('.mettel-catalog-item-notes')).find('.mettel-catalog-item-notes-field-group'), function(group) {
                    validateItem(group);
                });
            });
        });
    }
};

ko.bindingHandlers.submitOrder = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $submitButton = $(element);

        if (typeof viewModel.orderNeedsApproval() === 'undefined') {
            viewModel.callApprovalService();
        }

        $submitButton.click(function (e) {
            e.preventDefault();
            viewModel.disableSubmitButton(true);

            var order = {
                'submit': true,
                'TicketId': customerOrderViewModel.TicketId || '',
                'clientId': productCatalogViewModel.queryParams().clientId,
                'category': customerOrderViewModel.ticketCategory,
                'addressId': customerOrderViewModel.addressDialogVm().addressId() || 0,
                'items': [],
                'notes': [],
                'subCategoryNotes': [],
                'contact': {
                    'accessHours': customerOrderViewModel.ticketContact.accessHours(),
                    'sameContact': customerOrderViewModel.ticketContact.sameContact(),
                    'siteContactEmail': customerOrderViewModel.ticketContact.siteContactEmail(),
                    'siteContactId': customerOrderViewModel.ticketContact.siteContactId,
                    'siteContactName': customerOrderViewModel.ticketContact.siteContactName(),
                    'siteContactPhone': customerOrderViewModel.ticketContact.siteContactPhone(),
                    'siteContactPhoneExtension': customerOrderViewModel.ticketContact.siteContactPhoneExtension(),
                    'subscribedEmail': customerOrderViewModel.ticketContact.subscribedEmail(),
                    'ticketContactEmail': customerOrderViewModel.ticketContact.ticketContactEmail(),
                    'ticketContactId': customerOrderViewModel.ticketContact.ticketContactId,
                    'ticketContactName': customerOrderViewModel.ticketContact.ticketContactName(),
                    'ticketContactPhone': customerOrderViewModel.ticketContact.ticketContactPhone(),
                    'ticketContactPhoneExtension': customerOrderViewModel.ticketContact.ticketContactPhoneExtension()
                },
                'authorization': {
                    'authNotes': customerOrderViewModel.ticketAuth.authNotes()
                }
            };

            // If there's a shipping associated with the order (only for orders that have one or more
            // product types equaling to "GOODS" type)
            if (customerOrderViewModel.shippingVisible()) {
                order.shippingOptions = [{
                    totalCharge: customerOrderViewModel.shippingOptions.current().TotalCharge,
                    MethodName: customerOrderViewModel.shippingOptions.current().Method.Name,
                    MethodCode: customerOrderViewModel.shippingOptions.current().Method.Code,
                    packageTypeName: customerOrderViewModel.shippingOptions.current().PackageType.Name,
                    packageTypeCode: customerOrderViewModel.shippingOptions.current().PackageType.Code,
                    shipFromAddressId: customerOrderViewModel.shippingOptions.fromAddressId(),
                    shipToAddressId: customerOrderViewModel.shippingOptions.toAddressId()
                }];
            }

            if (customerOrderViewModel.modifyOrder) {
                order.services = customerOrderViewModel.services();
            }

            /**
             * Items
             */
            $.each(customerOrderViewModel.items(), function (i, item) {
                if (customerOrderViewModel.modifyOrder && typeof customerOrderViewModel.modificationType !== 'undefined' && customerOrderViewModel.modificationType() === 3) {
                    order.items.push({
                        'WTN': item.WTN(),
                        'InventoryID': item.InventoryID(),
                        'SubCategoryID': item.SubCategoryID()
                    });
                }
                else {
                    var currentItem = {
                        'WTN': ko.unwrap(item.WTN),
                        'InventoryID': ko.unwrap(item.InventoryID),
                        'SubCategoryID': item.SubCategoryID,
                        'skuId': item.skuObject().id(),
                        'sku': item.sku(),
                        'productId': item.product().id(),
                        'productName': item.product().name(),
                        'status': 'PENDING',
                        'sellerId': item.sellerId(),
                        'sellerName': item.sellerName(),
                        'sellerLogoURL': item.sellerLogoURL(),
                        'subCategoryId': item.subcategoryId(),
                        'contractId': item.contractId(),
                        'monthlyPrice': item.monthlyPriceBase(),
                        'oneTimePrice': item.oneTimePriceBase(),
                        'quantity': item.quantity(),
                        'subItems': ko.mapping.toJS(item.subItems),
                        'attributes': item.attributesObject(),
                        'pricingGroupId': item.pricingGroupId(),
                        'termsId': item.termsId(),
                        'interestRate': item.interestRate(),
                        'priceSource': item.priceSource(),
                        'subPricing': ko.mapping.toJS(item.subPricing()),
                        'noPricing': item.noPricing(),
                        'notes': (typeof item.notes !== 'undefined' ? item.notes() : []),
                        'text': item.freeTextEntries().map(function (o) {
                            return {
                                'fieldName': o.originalName,
                                'value': o.text(),
                                'configuration': o.configuration,
                                'index': o.index,
                                'maxLength': o.maxLength,
                                'name': o.name,
                                'rows': o.rows,
                                'type': o.type
                            };
                        })
                    };

                    if (typeof customerOrderViewModel.domesticPlanCutOffDate !== 'undefined' || typeof customerOrderViewModel.internationalPlanCutOffDate !== 'undefined' ) {

                        _.each(currentItem.subItems, function(subItem) {
                            if (typeof subItem.optionGroupSlugified !== 'undefined') {
                                var identifier = subItem.optionGroupSlugified.replace('custom-', '');
                                    identifier = identifier.replace('template-', '');

                                if (identifier === 'plans') {
                                    if (subItem.activity === 'NOCHANGE') {
                                        customerOrderViewModel.domesticPlanCutOffDate(null);
                                    }
                                    subItem.installDate = customerOrderViewModel.domesticPlanCutOffDate();
                                }

                                if (identifier === 'international-plans') {
                                    if (subItem.activity === 'NOCHANGE') {
                                        customerOrderViewModel.domesticPlanCutOffDate(null);
                                    }
                                    subItem.installDate = customerOrderViewModel.internationalPlanCutOffDate();
                                }
                            }
                        });
                    }

                    order.items.push(currentItem);
                }
            });
            /**
             * Sections
             */
            var addChildNote = function (field, notes) {
                $.each(field.ChildFields(), function (i, child) {
                    if (!child.ConditionalValue() || child.isMatchCondition(field)) {
                        notes.push({
                            'noteType': child.ID,
                            'noteValue': child.Value(),
                            'noteText': child.DisplayText(),
                            'displayName': ko.unwrap(child.DisplayName)
                        });
                    }
                    addChildNote(child, notes);
                });
            };

            // Merge billingDetails into orderDetails again
            $.each(customerOrderViewModel.billingDetails.Sections(), function (i, section) {
                $.each(section.Fields(), function (j, field) {
                    customerOrderViewModel.orderDetails.Sections()[i].Fields.push(field);
                });
            });

            $.each(customerOrderViewModel.orderDetails.Sections(), function (i, section) {
                var sectionBlock = {
                    'sectionName': section.SectionName(),
                    'fields': []
                };

                $.each(section.Fields(), function (i, field) {
                    sectionBlock.fields.push({
                        'noteType': field.ID,
                        'noteValue': field.Value(),
                        'noteText': field.DisplayText(),
                        'displayName': ko.unwrap(field.DisplayName)
                    });
                    addChildNote(field, sectionBlock.fields);
                });

                order.notes.push(sectionBlock);
            });

            var arrAllSubCats = customerOrderViewModel.uniqueSubcategories();

            if (customerOrderViewModel.modifyOrder) {
                arrAllSubCats = _.uniq(arrAllSubCats.concat(customerOrderViewModel.uniqueServiceSubcategories()));
            }

            $.each(arrAllSubCats, function (i, subcategory) {
                var details = customerOrderViewModel.subcategoryDetails[subcategory];

                if (details) {
                    var notes = {
                        'subcategoryId': subcategory,
                        'notes': []
                    };

                    $.each(details.Sections(), function (i, section) {
                        var sectionBlock = {
                            'sectionName': section.SectionName(),
                            'fields': []
                        };

                        $.each(section.Fields(), function (i, field) {
                            sectionBlock.fields.push({
                                'noteType': field.ID,
                                'noteValue': field.Value(),
                                'noteText': field.DisplayText(),
                                'displayName': ko.unwrap(field.DisplayName)
                            });
                            addChildNote(field, sectionBlock.fields);
                        });

                        notes.notes.push(sectionBlock);

                        if (section.ChildSections().length > 0) {

                            // gather all items for each subcat
                            var items = _.filter(order.items, function (item) { return item.SubCategoryID === subcategory || item.subCategoryId === subcategory; });

                            if (items.length === section.ChildSections().length) {

                                // attach ChildSection notes to item
                                for (var j = 0; j < section.ChildSections().length; j++) {
                                    /*jshint -W083 */
                                    _.each(section.ChildSections()[j].Fields(), function (field) {
                                        if (!(items[j].notes instanceof Array)) {
                                            items[j].notes = [];
                                        }

                                        var note = {
                                            'noteType': field.ID,
                                            'noteValue': field.Value(),
                                            'noteText': field.DisplayText(),
                                            'displayName': ko.unwrap(field.DisplayName)
                                        };

                                        if (field.ChildFields().length) {
                                            var childFields = [];

                                            _.each(field.ChildFields(), function(childField) {
                                                childFields.push({
                                                    'noteType': childField.ID,
                                                    'noteValue': childField.Value(),
                                                    'noteText': childField.DisplayText(),
                                                    'displayName': ko.unwrap(childField.DisplayName)
                                                });
                                            });

                                            note.childFields = childFields;
                                        }

                                        items[j].notes.push(note);
                                        addChildNote(field, items[j].notes);
                                    });
                                }
                            }
                        }
                    });

                    order.subCategoryNotes.push(notes);
                }
            });

            $.ajax({
                    type: "POST",
                    url: productCatalogViewModel.endPoints.submitOrder,
                    data: JSON.stringify(order),
                    contentType: 'application/json',
                    success: function (response) {

                        customerOrderViewModel.orderStatus({
                            message: ko.observable(response.message),
                            orderID: ko.observable(response.ticketId),
                            status: ko.observable(response.status),
                            type: ko.observable(response.type),
                            completed: ko.observable(false)
                        });

                        if (customerOrderViewModel.orderStatus().orderID()) {
                            customerOrderViewModel.orderError(false);
                            customerOrderViewModel.orderStatus().completed(true);
                            vmSteppedWorkflow.nextStepFocus();
                        }
                        else {
                            customerOrderViewModel.orderError(true);
                            customerOrderViewModel.orderStatus().error(true);
                        }
                        viewModel.disableSubmitButton(false);
                    },
                    dataType: 'json'
                })
                .fail(function (response) {
                    var strError = response.responseJSON ? response.responseJSON.message : "Server error";
                    customerOrderViewModel.orderStatus({
                        message: ko.observable(strError),
                        orderID: ko.observable(),
                        status: ko.observable(1),
                        type: ko.observable(),
                        completed: ko.observable(false)
                    });
                    customerOrderViewModel.orderError(true);
                    viewModel.disableSubmitButton(false);
                });
        });
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var step = vmSteppedWorkflow.activeStep();//update button every step
        viewModel.callApprovalService();
    }
};

setTimeout(function () {
    $(window).bind('hashchange', function () {
        if ($.deparam.fragment().hasOwnProperty('ticketId')) {
            var originalTicketId = $.deparam.fragment().ticketId,
                strippedTicketId = MetTel.Utils.replaceAllButNumbers(originalTicketId);

            if (strippedTicketId.length > 0) {
                if (!customerOrderViewModel.modifyOrder) {
                    customerOrderViewModel.loadExistingOrder(strippedTicketId);
                }
            }
        }
    });
}, 1000);
