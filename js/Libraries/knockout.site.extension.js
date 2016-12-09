ko.validation.init({
    registerExtenders: true,
    messagesOnModified: true,
    insertMessages: false,
    parseInputAttributes: true,
    messageTemplate: null,
    grouping: {
        deep: true
    },
});
var koValidationSettings = {
    clientSideValidation: true,
    trimSpace:true
};
ko.validation.rules['pattern'] = {
    validator: function (val, regex) {
        return !val || val.match(regex) != null && (val.match(regex)[0] == val);
    },
    message: 'Please check this value.'
};
ko.validation.rules['phoneUS'] = {
    validator: function (phoneNumber, validate) {
        if (!phoneNumber) { return true; } // makes it optional, use 'required' rule if it should be required
        if (typeof (phoneNumber) !== 'string') { return false; }
        phoneNumber = phoneNumber.replace(/\s+/g, "");
        return validate && phoneNumber.length > 9 && phoneNumber.match(/^(1-?)?(\([2-9]\d{2}\)|[2-9]\d{2})-?[2-9]\d{2}-?\d{4}$/);
    },
    message: 'Please specify a valid phone number'
};
//ko.validation.rules['email'] = {
//    validator: function (email, validate) {
//        if (!email) { return true; } // makes it optional, use 'required' rule if it should be required
//        if (typeof (email) !== 'string') { return false; }
//        email = email.replace(/\s+/g, "");
//        return validate && email.match(/^\w+([-'+.]*[\w-]+)*@(\w+([-.]?\w+)){1,}\.\w{2,4}$/);
//            ///^[a-zA-Z0-9'_`-]+(?:\.[a-zA-Z0-9'_`-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
//    },
//    message: 'Please specify a valid email address'
//};
ko.bindingHandlers.datepicker = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        //initialize datepicker with some optional options
        var options = allBindingsAccessor().datepickerOptions || {};
        $(element).datepicker(options);

        //handle the field changing
        ko.utils.registerEventHandler(element, "change", function () {
            var observable = valueAccessor();
            //observable($(element).datepicker("getDate"));
            observable($(element).val());
        });

        //handle disposal (if KO removes by the template binding)
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(element).datepicker("destroy");
        });

        // BP-3671
        $(element).onPositionChanged(function (lastOffset, newOffset, elem) {
            $('#ui-datepicker-div').css('top', newOffset.top + elem.outerHeight());
        });

    },
    //update the control when the view model changes
    update: function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor()),
            current = $(element).datepicker("getDate");

        //// KANGRAN MIAO: Reset datepicker if value is null
        if (!value || moment(value).isValid()) {
            $(element).datepicker("setDate", value);
        }
    }
};



ko.loadValidators = function (field, validators) {
    var property = field.Value;
    var condition = field.validateCondition;
    for (var index in validators) {
        var validator = validators[index];
        if (validator.Type == "RequiredValidator") {
            if (field.InputType() == "AutoComplete") {
                property.extend({ required: { onlyIf:condition, message: "Please select a suggestions." } });
            } else {
                property.extend({ required: { onlyIf: condition, message: ko.validation.formatMessage("The {0} field is required.", field.DisplayName) } });
            }
        } else if (validator.Type == "IntegerValidator") {
            property.extend({
                pattern: {
                    message: ko.validation.formatMessage('The {0} field must be a whole number.', field.DisplayName),
                    params: '^[0-9]+$'
                }
            });
        }else if (validator.Type == "LengthValidator") {
            if (validator.MinLength) {
                property.extend({ minLength: { params: validator.MinLength, message: "The field " + field.DisplayName + " must be a string with a minimum length of " + validator.MinLength } });
            }
            if (validator.MaxLength) {
                property.extend({ maxLength: { params: validator.MaxLength, message: "The field " + field.DisplayName + " must be a string with a maximum length of " + validator.MaxLength } });
            }
        } else if (validator.Type == "PhoneNumberValidator") {
            property.extend({ phoneUS: true });
        } else if (validator.Type == "EmailValidator") {
            property.extend({ email: { params: true, message: ko.validation.formatMessage("The {0} field must be a valid Email.", field.DisplayName) } });
        } else if (validator.Type == "DecimalValidator") {
            property.extend({
                pattern: {
                    message: ko.validation.formatMessage('The {0} field must be a number up to 2 decimals.', field.DisplayName),
                    params: '[-+]?[0-9]*\.?[0-9]?[0-9]'
                }
            });
        } else if (validator.Type == "RangeValidator") {
            if (validator.Minimum) {
                property.extend({ min: validator.Minimum });
            }
            if (validator.Maximum) {
                property.extend({ max: validator.Maximum });
            }
        }
        else if (validator.Type == "RegexValidator") {
            property.extend({
                pattern: {
                    message: validator.Message,
                    params: validator.Pattern
                }
            });
        } else if (validator.Type == "CurrentOrFutureDateValidator") {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            property.extend({
                validation: {
                    validator: function (val, aDate) {
                        return moment(val) >= moment(aDate);
                    },
                    message: ko.validation.formatMessage('The {0} must be on or after the current date.', field.DisplayName),
                    params: today
                }
            });
        } else if (validator.Type == "CurrentOrPastDateValidator") {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            property.extend({
                validation: {
                    validator: function (val, aDate) {
                        return moment(val) <= moment(aDate);
                    },
                    message: ko.validation.formatMessage('The {0} must be on or before the current date.', field.DisplayName),
                    params: today
                }
            });
        }
        /* KANGRAN MIAO */
        else if (validator.Type == "FileUploadValidator") {
            property.extend({
                validation: {
                    validator: function (jsonString) {
                        var jsonArray = JSON.parse(jsonString);
                        if (jsonArray == null) {
                            return true;
                        }
                        var legalExtensions = SiteJS.GetLegalFileExtensions();
                        for (var index in jsonArray) {
                            if (jsonArray[index].extension && jsonArray[index].extension.length > 1) {
                                var ext = jsonArray[index].extension.substring(1).toLowerCase();
                                if (legalExtensions.indexOf(ext) >= 0) {
                                    continue;
                                }
                            }
                            return false;
                        }
                        return true;
                    },
                    message: 'The valid format includes: ' + SiteJS.GetLegalFileExtensions().join(', ') + '.'
                }
            }).extend({
                validation: {
                    validator: function (jsonString) {
                        var jsonArray = JSON.parse(jsonString);
                        if (jsonArray == null) {
                            return true;
                        }
                        for (var index in jsonArray) {
                            if (jsonArray[index].size == 0) {
                                return false;
                            }
                        }
                        return true;
                    },
                    message: 'Attachment can not be empty.'
                }
            });
        }
        /* KANGRAN MIAO */
    }
};

var section = function (data) {
    var self = this;
    self.Fields = ko.observableArray([]);
    self.ChildSections = ko.observableArray();
    self.UserData = data.UserData;
    self.SectionName = ko.observable(data.SectionName);
    _.each(data.Fields, function (fieldData) {
        var object = new field(fieldData);
        self.Fields.push(object);
    });
    _.each(data.ChildSections, function (sectionData) {
        var object = new section(sectionData);
        self.ChildSections.push(object);
    });
};
var huntGroupField = function (model) {
    var self = this;
    self.group = ko.observable();
    self.sequence = ko.observable();
    self.name = ko.observable(model.name);
    self.value = ko.computed(function () {

        return (self.group()||"") + (self.group()&&self.sequence()? ":":"") + (self.sequence()||"");
    });
    self.value.subscribe(function () {
        model.value(self.value());
    });
    self.init = function () {
        var value = model.value();
        if (value) {
            self.group(value.substring(0, value.indexOf(":")));
            self.sequence(value.replace(self.group() + ":", ""));
        }
    };
    self.init();

};

/* KANGRAN MIAO */
var fileUploadField = function (model) {
    console.log("fileupload init");
    var self = this;
    self.attachments = ko.observableArray();
    self.convertFileSize = function (bytes) {
        var sizes = [' byte(s)', ' KB', ' MB', ' GB', ' TB'],
            i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
        if (bytes === 0) {
            return '0 KB';
        } else {
            return Math.round(bytes / Math.pow(1024, i), 2) + sizes[i];
        }
    };
    self.updateDisplayText = function () {
        var table = $("<table class = 'dynamic-field-display-text-table'><tr><th>File Name(s)</th><th>Size</th></tr></table>");
        self.attachments().forEach(function (attachment, i) {
            var row = $("<tr>");
            table.append(row);
            row.append("<td>" + attachment.fullFileName + "</td>");
            row.append("<td>" + self.convertFileSize(attachment.size) + "</td>");
        });
        model.text(table.prop('outerHTML'));
    };
    self.updateValue = function () {
        if (self.attachments().length > 0) {
            model.value(JSON.stringify(self.attachments()));
        } else {
            model.value(null);
        }
    };
    self.removeAttachment = function (attachment) {
        self.attachments.remove(attachment);
        self.updateValue();
        self.updateDisplayText();
    };
    self.fileLoaded = function (fileMetaData, uploadData, target) {
        var displayExtension = MetTel.Utils.extractFileExtension(fileMetaData.name.trim());
        var attachment = {
            lastModified: fileMetaData.lastModified,
            fullFileName: fileMetaData.name,
            name: MetTel.Utils.extractFileName(fileMetaData.name.trim()),
            size: fileMetaData.size,
            type: fileMetaData.type,
            extension: displayExtension == null ? fileMetaData.name.trim() : ("." + displayExtension),
            data: uploadData
        };
        // Restrict total length of the filename
        if (attachment.name && attachment.name.length > 18) {
            var length = attachment.name.length;
            attachment.name = attachment.name.substring(0, 9) + '... ...' + attachment.name.substring(length - 4);
        };
        self.attachments.push(attachment);
        // Clear the input in case you want to upload same file twice. otherwise, binding handler won't fire.
        $(target).val('');
        // Stringify attachments
        self.updateValue();
        self.updateDisplayText();
    };
    self.fileProgress = function () { };
    self.fileError = function () { };
    self.load = function () {
        if (model.value()) {
            self.attachments(JSON.parse(model.value()));
        }
    };
    self.load();
};
/* KANGRAN MIAO */

var field = function (fieldModel) {
    var self = this;
    self.ID = fieldModel.ID;
    self.InputType = ko.observable(fieldModel.InputType);
    if (fieldModel.InputType == "CheckBox") {
        self.Value = ko.observable(fieldModel.Value == "True" ? true : false);
    } else {
        self.Value = ko.observable(fieldModel.Value);
    }
    self.Name = fieldModel.Name;
    self.Description = fieldModel.Description;
    self.DisplayName = fieldModel.DisplayName;
    self.DisplayText = ko.observable(fieldModel.DisplayText);
    self.PlaceHolder = ko.observable(fieldModel.PlaceHolder);
    self.Width = ko.observable();
    self.Enable = ko.observable(fieldModel.Enable);
    self.ChildFields = ko.observableArray([]);
    self.SelectList = ko.observableArray(fieldModel.SelectList);
    self.CustomTemplateId = ko.observable(fieldModel.CustomTemplateId);
    self.CustomTemplateModel = ko.observable();
    self.EventSettings = ko.observable(ko.mapping.fromJS(fieldModel.EventSettings));
    self.errorMessage = ko.observable();
    self.validators = ko.observable(fieldModel.Validators);
    self.errors = ko.observable(fieldModel.Errors);
    self.indexInGroup = ko.observable(fieldModel.IndexInGroup ? fieldModel.IndexInGroup : 0);
    self.ShowLabel = ko.observable(fieldModel.ShowLabel);
    self.ConditionalValue = ko.observable(fieldModel.ConditionalValue);
    self.UserData = fieldModel.UserData;
    self.parentValue = null;
    self.uniqueId = _.uniqueId('mettel-dynamic-field-');
    self.validateField = ko.observable(true); // by default validates, set false only if required (e.g., disable validation on initial load)
    self.validateCondition = function () {
        return self.validateField() === true
                    && (!self.ConditionalValue() || self.parentValue && self.ConditionalValue() == self.parentValue());
    };
    self.isMatchCondition = function (parent) {
        var parentValue = parent.Value();
        if (parent.InputType() == "CheckBox") {
            parentValue = (parentValue == true ? "True" : "False");
        }
        return self.ConditionalValue() == parentValue;
    };
    self.blur = function () {
        if (self.Value() && koValidationSettings.trimSpace) {
            self.Value(self.Value().trim());
        }
    };
    self.loadChildFields = function (fieldModel) {
        if (fieldModel.ChildFields) {
            for (var childIndex in fieldModel.ChildFields) {
                var child = new field(fieldModel.ChildFields[childIndex]);
                child.parentValue = self.Value;
                self.ChildFields.push(child);
            }
        }
    };
    self.loadValidators = function (fieldModel) {
        if (self.validators() && koValidationSettings.clientSideValidation) {
            ko.loadValidators(self, self.validators());
        }
    };
    self.loadError = function (fieldModel) {
        if (self.errors() && self.errors().length > 0) {
            self.errorMessage(self.errors[0]);
        }
    };
    self.loadChildFields(fieldModel);
    self.loadValidators(fieldModel);
    self.loadError(fieldModel);
    if (fieldModel.EventSettings) {
        if (fieldModel.EventSettings.AfterLoadJsCallBack) {
            //var fn = window[fieldModel.EventSettings.AfterLoadJsCallBack];
            //if (fn) {
            //    fn(self);
            //}
            executeFunctionByName(fieldModel.EventSettings.AfterLoadJsCallBack, window, self);
        }
    }
};
function executeFunctionByName(functionName, context /*, args */) {
    var args = [].slice.call(arguments).splice(2);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }
    return context[func].apply(context, args);
}
var EventSettingsModel = function () {
    var self = this;
    self.OnClickAdd = ko.observable();
    self.OnClickAddRequest = ko.observable();
    self.OnChangeUpdate = ko.observable();
    self.OnClickDelete = ko.observable();
    self.OnClickDeleteRequest = ko.observable();
}

var DynamicFormModel = function (response) {
    var self = this;
    self.Sections = ko.observableArray([]);
    //self.FormID = ko.observable();
    self.loadModel = function (response) {
        //self.FormID(response.FormID);
        self.Sections([]);
        for (var i = 0; i < response.Sections.length; i++) {
            var sectionModel = response.Sections[i];
            self.Sections.push(new section(sectionModel));
        }
    };
    self.loadModel(response);
};

ko.bindingHandlers.huntGroupInput = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var value = allBindingsAccessor().value;
        var options = allBindingsAccessor().huntGroupInput;
        var model = new huntGroupField({ value: value, name: options.name });
        ko.renderTemplate("field-huntgroup-template", model, {}, element, 'replaceNode');
    }
};

/* KANGRAN MIAO */
ko.bindingHandlers.fileUploadArea = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = allBindingsAccessor().value;
        var options = allBindingsAccessor().fileUploadArea;
        var model = new fileUploadField({ value: value, text: options.text });
        ko.renderTemplate("field-file-upload-template", model, {
            afterRender: function (nodes) {
                // add focus state to labels
                var labels = _.each(nodes, function(node) {
                    if (node.className === 'mettel-notes-container') {
                        var $node = $(node),
                            input = $node.find('.mettel-add-attachment-input'),
                            $input = $(input);

                        $input.on('focus', function() {
                            $node.addClass('mettel-add-attachment-input-focused');
                        });

                        $input.on('blur', function() {
                            $node.removeClass('mettel-add-attachment-input-focused');
                        });

                    }
                });
            }
        }, element, 'replaceNode');
    }
};
/* KANGRAN MIAO */

ko.bindingHandlers.clientSearch = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var options = valueAccessor();
        $(element).clientSearch(options);
    }
};



ko.bindingHandlers.tokenInput = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        //var options = allBindingsAccessor().tokenInput;
        //var data = [];
        //ko.utils.arrayForEach(options.data(), function (item) {
        //    data.push({id:item.Value,name:item.Text});
        //});

        //$(element).tokenInput(data, {
        //    theme: "facebook", preventDuplicates: true, prePopulate: options.value()
        //});
        //handle the field changing
        //ko.utils.registerEventHandler(element, "change", function () {
        //    var observable = valueAccessor();
        //    observable($(element).val());
        //});
    },
    init: function (element, valueAccessor, allBindingsAccessor) {
        var options = allBindingsAccessor().tokenInput;
        var data = ko.utils.unwrapObservable(options.data);
        var value = allBindingsAccessor().value;
        var text = allBindingsAccessor().tokenInput.text;
        var prepopulate = [];
        var updateText = function () {
            if (text) {
                var tokenArray = $(element).tokenInput("get");
                var textArray = [];
                _.each(tokenArray, function (item) {
                    textArray.push(item.Text);
                });
                text(textArray.join("{&}"));
            }
        };
        if (value()) {
            var valueArray = value().split(",");
            for (var i = 0; i < valueArray.length; i++) {
                var t = _.find(data, function (item) { return item.Value == valueArray[i]; });
                if (t) {
                    prepopulate.push({
                        Text: t.Text,
                        Value: valueArray[i]
                    });
                }
            }
        }


        //$(element).tokenInput('destroy');
        $(element).tokenInput(data, {
            theme: "facebook",
            preventDuplicates: true,
            prePopulate: prepopulate,
            tokenValue: 'Value',
            propertyToSearch: 'Text',
            resultsLimit: 15,
            onAdd: function () {
                value($(element).val());
                updateText();
            },
            onDelete: function () {
                value($(element).val());
                updateText();
            },
            enableHTML:true,
            resultsFormatter: function (item) {
                var string = item[this.propertyToSearch];
                if (item["Description"]) {
                    string += "<br />" + item["Description"];
                }
                if (item["AdditionInfo"]) {
                    string += "<br />" + item["AdditionInfo"];
                }
                return "<li>" + (this.enableHTML ? string : _escapeHTML(string)) + "</li>";
            }
        });
        updateText();
    }
};

ko.validation.rules['areSame'] = {
    getValue: function (o) {
        return (typeof o === 'function' ? o() : o);
    },
    validator: function (val, otherField) {
        return val === this.getValue(otherField);
    },
    message: 'Please type the same new password into the Confirm Password Field.'
};
ko.validation.registerExtenders();

ko.bindingHandlers.autocomplete = {
    init: function (element, params) {
        $(element).autocomplete(params());
    },
    update: function (element, params) {
        $(element).autocomplete("option", "source", params().source);
    }
};


ko.bindingHandlers.kendoEditor = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        $(element).kendoEditor({
            tools: [
                "bold",
                "italic",
                "underline",
                "strikethrough",
                "justifyLeft",
                "justifyCenter",
                "justifyRight",
                "justifyFull",
                "insertUnorderedList",
                "insertOrderedList",
                "indent",
                "outdent",
                "createLink",
                "unlink",
                "viewHtml",
                "formatting",
                "cleanFormatting",
                "fontName",
                "fontSize",
                "foreColor",
                "backColor"
            ],
            change: function (e) {
                allBindingsAccessor().value($(element).data("kendoEditor").value());
            }
        });
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var editor = $(element).data("kendoEditor");
        editor.value(allBindingsAccessor().value());
    }
};
ko.bindingHandlers.hierarchySelectBox = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        ko.renderTemplate("hierarchy-select-box-template", accessor, {}, element, 'replaceNode');
    }
};

ko.bindingHandlers.hierarchyDialog = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        ko.renderTemplate("hierarchy-dialog-template", accessor, {}, element, 'replaceNode');
    }
};

ko.bindingHandlers.stopBindings = {
    init: function () {
        return { controlsDescendantBindings: true };
    }
};


ko.bindingHandlers.tabContainer = {
    update: function (element, params) {
        $(element).mettelTabContainer();
    }
};

/** to maintain a static global cache for hierarchies */
var GlobalHierarchyCache = new function () {

    var self = this;

    // hierarchies cache
    self.hierarchyCache = ko.observable({});
    self.hierarchyDataRequestQueue = [];
    self.isHierarchyDataRequestInQueue = function (key) {
        if (self.hierarchyDataRequestQueue && self.hierarchyDataRequestQueue.length) {
            return (self.hierarchyDataRequestQueue.indexOf(key) > -1);
        }
        return false;
    };

    self.removeHierarchyDataRequestFromQueue = function (key) {
        if (self.hierarchyDataRequestQueue && self.hierarchyDataRequestQueue.length) {
            self.hierarchyDataRequestQueue.splice(self.hierarchyDataRequestQueue.indexOf(key), 1);
        }
    };

};

var HierarchySelectBoxModel = function (options) {

    var self = this;

    self.defaults = {
        hierarchyDataUrl: "",
        hierarchyLabelsUrl: "",
        required: false,
        level: 0,
        optionLabel: "ALL",
        selectedHierarchy: "",
        authorizeURL: "/Api/Rights/Authorize/",
        lazyLoad:false
    }

    // merge default config with options (if any)
    self.config = $.extend({}, self.defaults, options);

    // array of the control hierarchies
    self.hierarchies = ko.observableArray();

    // the piped hierarchy string computed value based on current control selection.
    self.hierarchy = ko.computed(function () {
        var value = "";

        var hierarchies = self.hierarchies();
        for (var i = (hierarchies.length - 1) ; i >= 0; i--) {
            if (hierarchies[i].selected()) {
                value = hierarchies[i].selected();
                break;
            }
        }

        return value;
    }).extend({ registerQueryParam: self });

    // array of the clients hierarchy labels
    self.labels = ko.observableArray();

    // the clients hierarchy labels as a piped string
    self.hierarchyLabels = ko.observable();

    // hierarchies cache
    self.hierarchyCache = ko.observable({});

    // reload hierarchy array from piped labels string
    self.hierarchyLabels.subscribe(function () {

        // splitting piped client hierarchy labels into labels array
        self.labels((self.hierarchyLabels()) ? self.hierarchyLabels().trimEnd("|").split("|") : []);

        // create the hierarchy items with a link to parent
        var parent = null;

        for (var i = 0; i < self.labels().length; i++) {

            var label = self.labels()[i];
            if (label) {
                var continueAdding = !(self.config.level && i >= self.config.level);
                if (continueAdding) {
                    var hierarchy = new HierarchyLinkedModel(
                    {
                        name: label,
                        parent: parent,
                        level: i,
                        required: self.config.required,
                        optionLabel: self.config.required ? null : self.config.optionLabel,
                        defaultValue: self.config.selectedHierarchy
                    });
                    self.hierarchies.push(hierarchy);

                    // Store the current hierarchy as a parent for the next level child.
                    parent = hierarchy;
                }
            }
        }

        // triggers the hierarchy data load to cache (if any labels)
        if (self.hierarchies().length > 0) {
            self.hierarchies()[0].loadChildren("root");

        }
    });

    // updates the hierarchy data in cache
    self.updateCache = function (key, callback) {
        $.get(self.config.hierarchyDataUrl,{ key:key,lazyLoad:self.config.lazyLoad }, function (json) {
            var map = GlobalHierarchyCache.hierarchyCache();
            if (!map) {
                map = [];
            }
            // recursivelly put the hierarchy to map
            (function buildHierarchyMap(data) {
                map[data.key] = data;
                if (data.children) {
                    ko.utils.arrayForEach(data.children, function (child) {
                        buildHierarchyMap(child);
                    });
                }
            })(json);
            // update cache
            GlobalHierarchyCache.hierarchyCache(map);
            // pass data back
            callback(map[key]);

            SiteJS.DisableGeneralLoading();
            GlobalHierarchyCache.removeHierarchyDataRequestFromQueue(key);
        });
    };

    // loads the hierarchy control state
    self.load = function (hierarchyLabels) {
        SiteJS.EnableGeneralLoading();
        // reset hierarchy control
        self.hierarchies([]);
        self.hierarchyLabels(undefined);

        if (!hierarchyLabels) {
            // load client labels and trigger hierarchies to rebuild
            $.get(self.config.hierarchyLabelsUrl, function (response) {
                if (response != null) {
                    self.hierarchyLabels(response.Hierarchy);
                }

            });
        } else {
            self.hierarchyLabels(hierarchyLabels);
        }
    };

    self.setHierarchyValues = function(hierarchyValue) {
        if (!hierarchyValue) {
            return;
        }

        var i = 0,
            separatorIndex = hierarchyValue.indexOf("|"),
            hiers = self.hierarchies();

        for (var j = hiers.length - 1; j >= 0; j--) {
            hiers[j].selected(undefined);
        }

        while (separatorIndex > -1) {
            var newVal = hierarchyValue.slice(0, separatorIndex);
            if (hiers[i])
                hiers[i].selected(newVal == "ALL" ? undefined : newVal);

            var nextIndex = hierarchyValue.slice(separatorIndex + 1).indexOf("|");
            separatorIndex = nextIndex == -1 ? -1 : separatorIndex + nextIndex + 1;
            i += 1;
        }

        if (hiers[i])
            hiers[i].selected(hierarchyValue);
    }

    /**
    * Nested view model for managing signle Hierarchy combobox
    * @return {Function} Hierarchy combobox view model function
    */
    var HierarchyLinkedModel = function (data) {

        var me = this;

        me.parent = data.parent;
        me.name = data.name;
        me.level = data.level;
        me.required = data.required;
        me.optionLabel = data.optionLabel;

        me.children = ko.observableArray();

        me.selected = ko.observable(); // This will be a key.
        me.defaultValue = data.defaultValue;
        me.loadChildren = function (key) {

            // reset children
            me.children.removeAll();
            me.selected(undefined);

            // If parent has a selected value, load the hierarchies from cache or add lazy laoder.
            if (key !== undefined) {
                if (GlobalHierarchyCache.isHierarchyDataRequestInQueue(key)) {
                    setTimeout(me.loadChildren, 1000, key);
                    return;
                }
                var hierarchy = GlobalHierarchyCache.hierarchyCache()[key];
                if (hierarchy && !hierarchy.isLazy) {
                    ko.utils.arrayPushAll(me.children, hierarchy.children);

                    me.setDefaultValue();
                } else {
                    GlobalHierarchyCache.hierarchyDataRequestQueue.push(key);
                    self.updateCache(key, function (h) {
                        if (h) {
                            ko.utils.arrayPushAll(me.children, h.children);

                            me.setDefaultValue();
                        }
                    });
                }
            }
        };
        me.setDefaultValue = function () {
            if (me.defaultValue) {
                var selected = me.defaultValue.trimStart('|').trimEnd('|').split('|');
                if (selected.length > me.level) {

                    var value = "";
                    for (var i = 0; i < me.level + 1; i++) {
                        value += selected[i] + "|";
                    }
                    if (me.children().length>0) {
                        for (var i = 0 ; i < me.children().length; i++) {
                            var key = me.children()[i].key;
                            var valueToCompare = value.trimEnd("|").toUpperCase();
                            if (key.toUpperCase() == valueToCompare) {
                                me.selected(key);
                                //console.log("set default " + value.trimEnd("|"));
                                break;
                            }
                        }
                    }
                }
            }
        };
        if (me.parent) {
            // If the parent updates, we want to make sure that the available hierarchies that are in the model are valid.
            me.parent.selected.subscribe(me.loadChildren);
        }
    };

    self.load(self.config.hierarchyLabels);
};

HierarchyDialogModel = function (options) {
    if (!HierarchyDialogModel.dialogId) {
        HierarchyDialogModel.dialogId = 1;
    }

    var self = this;

    /* KANGRAN MIAO */
    self.editable = ko.observable(true);
    /* KANGRAN MIAO */

        self.defaults = {
        loadHierarchySynchronously: false,
        hierarchyStringCaption: "Select Hierarchy",
        hierarchyDataUrl: "",
        hierarchyLabelsUrl: "",
        hierarchyRequired: false,
        hierarchyLevel: 0,
        hierarchyOptionLabel: "ALL",
        selectedHierarchy: "",
        lazyLoad: false
    };

    self.config = $.extend({}, self.defaults, options);

    if (options && typeof options.editable != "undefined") {
        self.editable(options.editable);
    }

    HierarchyDialogModel.dialogId += 1;
    self.elementId = 'hierarchyDialog' + HierarchyDialogModel.dialogId;

    self.hierarchyString = ko.observable(self.config.hierarchyStringCaption);

    self.open = function (onSave) {
        if (!self.editable()) {
            return;
        }
        self.onSave = onSave;
        setHierarchyValues(self.hierarchyValue());
        $('#' + self.elementId).modalWindow();
    }

    self.close = function () {
        $('#' + self.elementId).modalWindow('close');
    }

    self.save = function () {
        self.hierarchyValue(getHierarchyValues());
        $('#' + self.elementId).modalWindow('close');
    }

    self.hierarchySelectBoxModel = new HierarchySelectBoxModel({
        hierarchyDataUrl: self.config.hierarchyDataUrl,
        hierarchyLabelsUrl: self.config.hierarchyLabelsUrl,
        required: self.config.hierarchyRequired,
        level: self.config.hierarchyLevel,
        optionLabel: self.config.hierarchyOptionLabel,
        selectedHierarchy: self.config.selectedHierarchy,
        lazyLoad:self.config.lazyLoad
    });

    self.hierarchyValue = ko.observable();
    if (self.config.selectedHierarchy) {
        self.hierarchyValue(self.config.selectedHierarchy);
    }
    //function updateHierarchyString(hierarchyValue) {
    //  if (hierarchyValue) {
    //      if (hierarchyValue.trim() === "|") {
    //          self.hierarchyString("ALL");
    //      } else {
    //          self.hierarchyString(hierarchyValue.replace(/\|/g, " > "));
    //      }
    //  } else {
    //      self.hierarchyString(self.config.hierarchyStringCaption);
    //      //self.hierarchyString("ALL");
    //  }
    //}

    //self.hierarchyValue.subscribe(function (newValue) {
    //  updateHierarchyString(newValue);
    //});

    function getHierarchyValues() {
        var hierarchyValues = [];

        for (var i = 0; i < self.hierarchySelectBoxModel.hierarchies().length; i++) {
            if (self.hierarchySelectBoxModel.hierarchies()[i].selected()) {
                hierarchyValues[i] = self.hierarchySelectBoxModel.hierarchies()[i].selected();
            }
        }

        return hierarchyValues.length === 0 ? "|" : "|" + hierarchyValues[hierarchyValues.length - 1] + "|";
    }



    function setHierarchyValues(hierarchyValue) {
        if (!hierarchyValue) {
            return;
        }

        var i = 0;
        hierarchyValue = hierarchyValue.trim("|");
        var separatorIndex = hierarchyValue.indexOf("|");

        while (separatorIndex > -1) {
            self.hierarchySelectBoxModel.hierarchies()[i].selected(hierarchyValue.slice(0, separatorIndex));
            var nextIndex = hierarchyValue.slice(separatorIndex + 1).indexOf("|");
            separatorIndex = nextIndex == -1 ? -1 : separatorIndex + nextIndex + 1;
            i += 1;
        }
        self.hierarchySelectBoxModel.hierarchies()[i].selected(hierarchyValue);
    }


}

AddressDialogModel = function (options) {
    if (!AddressDialogModel.dialogId) {
        AddressDialogModel.dialogId = 1;
    }

    var self = this;

    self.defaults = {
        clientId: 0,
        getAddressBaseUrl: '/api/address',
        getCityStateBaseUrl: '/api/address/SelectCityState',
        addressValidationBaseUrl: '/api/address/ValidateAddress',
        addressLabelText: "Service Address",
        createUnverifiedAddress:true
    };

    self.config = $.extend({}, self.defaults, options);

    self.validateAddress = function (val) {

        if (!val.state || !val.city || !val.address1 ||
            !/\S/.test(val.state) || !/\S/.test(val.city) || !/\S/.test(val.address1)) {

            return undefined;
        }

        var url = self.config.addressValidationBaseUrl
            + "?address1=" + encodeURIComponent(val.address1)
            + "&address2=" + encodeURIComponent(val.address2)
            + "&city=" + encodeURIComponent(val.city)
            + "&state=" + encodeURIComponent(val.state)
            + "&zip=" + encodeURIComponent(val.zipCode);
        var response = $.ajax({ type: "GET", url: url, async: false });
        //return response.status === 200 ? response.responseJSON : undefined;
        return response.status === 200
            ? { isValid: true, address: response.responseJSON }
            : { isValid: false, error: response.responseJSON.message }
    }

    self.isValidated = ko.observable(true);

    self.errorType = ko.computed(function () {
        var type = '';

        if (!self.isValidated() && typeof self.errorMessage === 'function') {
            var errorMessage = self.errorMessage();

            switch (true) {
                case errorMessage.search(/street/i) >= 0:
                    type = 'street';
                    break;
                case errorMessage.search(/zip/i) >= 0:
                    type = 'zip';
                    break;
                case errorMessage.search(/city/i) >= 0:
                    type = 'city';
                    break;
                case errorMessage.search(/state/i) >= 0:
                    type = 'state';
                    break;
                case errorMessage.search(/country/i) >= 0:
                    type = 'country';
                    break;
                default:
                    type = 'address';
                    break;
            }
        }

        return type;
    });

    AddressDialogModel.dialogId += 1;
    self.elementId = 'addressDialog' + AddressDialogModel.dialogId;

    self.zipCode = ko.observable();
    self.address = ko.observable();
    self.country = ko.observable();
    self.countryChoices = ko.observableArray(['USA', 'Canada']);
    self.cityStateCountryOptions = ko.observableArray(['Zip Code is required']);
    self.cityStateCountrySelected = ko.observable('Zip Code is required');
    self.addressId = ko.observable();
    self.validatedAddress = ko.observable();
    self.newAddress = ko.observable();
    self.newAddressError = ko.observable();
    self.computedAddress = ko.computed(function () {
        var city = "";
        var state = "";

        if (self.cityStateCountrySelected()) {
            var cityStateValues = self.cityStateCountrySelected().split(",");
            $.each(cityStateValues, function (index, item) { cityStateValues[index] = item.trim(); });

            city = cityStateValues[0];
            state = cityStateValues[1];
        }

        return {
            zipCode: self.zipCode(),
            address1: self.address(),
            city: city,
            state: state
        };
    });
    self.addressDialogTemplateName = ko.observable();
    /////////////
    // validation
    self.zipCode.extend({
        required: {
            params: true,
            message: "Zip Code is required",
            onlyIf: function () { return self.isValidated(); }
        }
    });
    self.address = ko.observable().extend({
        required: {
            params: true,
            message: "Address is required",
            onlyIf: function () { return self.isValidated(); }
        }
    });

    //function transformAddressPropertyNames(address) {
    //  return {
    //      Address1: address.address1,
    //      Zip: address.zipCode,
    //      City: address.city,
    //      State: address.state
    //  }
    //}

    self.computedAddress.extend({
        validation: {
            validator: function (val) {
                if (self.isValidated() === false) {
                    return true;
                }
                if (!val.address1 || !val.city || !val.state || !val.zipCode) {
                    return false;
                }
                if (self.validatedAddress()
                    && val.address1 === self.validatedAddress().Address1
                    && val.zipCode === self.validatedAddress().Zip
                    && val.city.toLowerCase() === self.validatedAddress().City.toLowerCase()
                    && val.state === self.validatedAddress().State) {

                    return true;
                }

                var validationResult = self.validateAddress(val);
                var validatedAddress = validationResult.address;


                this.message = validationResult.error ? validationResult.error : "Address is incorrect";

                if (!validationResult.isValid) {
                    if (self.config.createUnverifiedAddress) {
                        self.openCreateAddressDialog(val);
                    }
                    return false;
                }

                    if (val.address1 === validatedAddress.Address1
                        && val.zipCode === validatedAddress.Zip
                        && val.city.toLowerCase() === validatedAddress.City.toLowerCase()
                        && val.state === validatedAddress.State) {

                        return true;
                    } else {
                        self.openVerifyDialog(validatedAddress);
                        return false;
                    }
            },
            message: "Address is incorrect",
            onlyIf: function () { return self.isValidated(); }
        }
    });

    self.zipCodeSubscription = self.zipCode.subscribe(function (newValue) {
        if (!newValue) {
            return;
        }

        var data = $.ajax({
            type: "GET",
            url: self.config.getCityStateBaseUrl + '?zipCode=' + newValue,
            async: false
        }).responseJSON;

        var newOptions = [];
        $.each(data.cities, function (index, city) {
            newOptions.push(city + ', ' + data.state);
        });
        self.cityStateCountryOptions(newOptions);
    });

    self.openVerifyDialog = function(validatedAddress) {
        self.validatedAddress(validatedAddress);
        self.addressDialogTemplateName('address-confirm-dialog-template');
        $('#' + self.elementId).modalWindow();

    }


    self.openCreateAddressDialog = function (address) {
        self.newAddressError(undefined);
        self.newAddress(address);
        self.addressDialogTemplateName('address-create-dialog-template');
        $('#' + self.elementId).modalWindow();
    }
    //self.open = function (validatedAddress) {
    //  self.validatedAddress(validatedAddress);
    //  self.addressDialogTemplateName('address-confirm-dialog-template');
    //  $('#' + self.elementId).modalWindow();
    //}

    self.close = function () {
        //temp
        var modaltemp = $("#location_addressValidation_dialog");
        if (modaltemp.length > 0) {
            $("#mettel_page").css("position", "inherit");
        }
        $('#' + self.elementId).modalWindow('close');
    }

    self.accept = function () {
        self.address(undefined);
        self.zipCode(undefined);
        self.addressId(self.validatedAddress().AddressID);
        self.address(self.validatedAddress().Address1);
        self.zipCode(self.validatedAddress().Zip);
        selectCityState(self.validatedAddress().City, self.validatedAddress().State);
        //temp
        var modaltemp = $("#location_addressValidation_dialog");
        if (modaltemp.length > 0) {
            $("#mettel_page").css("position", "inherit");
        }
        $('#' + self.elementId).modalWindow('close');
    }

    function selectCityState(city, state) {
        var cityStateString = city + ', ' + state;
        var cityStateFound = false;
        var cityStateOptionsArray = self.cityStateCountryOptions();

        for (var i = 0; i < cityStateOptionsArray.length; i++) {
            if (cityStateOptionsArray[i] == cityStateString) {
                cityStateFound = true;
            }
        }

        if (!cityStateFound) {
            self.cityStateCountryOptions.push(cityStateString);
        }

        self.cityStateCountrySelected(cityStateString);
    }

    self.createAddress = function (address) {
        $.post('/Api/Address/CreateUnverifiedAddress', {
            address1: address.address1,
            city: address.city,
            state: address.state,
            zip: address.zipCode
        },
            function (createdAddress) {
                self.newAddressError(undefined);
                self.validatedAddress(createdAddress);
                self.addressId(self.validatedAddress().AddressID);
                self.address(self.validatedAddress().Address1);
                self.zipCode(self.validatedAddress().Zip);
                selectCityState(self.validatedAddress().City, self.validatedAddress().State);
                $('#' + self.elementId).modalWindow('close');
            }).fail(function (response) {
                self.newAddressError(response.responseJSON.message);
            });

    }

    self.setAddress = function (address, city, state, zip) {
        self.validatedAddress({
            Address1: address,
            City: city,
            State: state,
            Zip: zip
        });
        self.address(address);
        self.zipCode(zip);
        selectCityState(city, state);


    }

    self.loadAddress = function (addressId, clientId) {
        if (!addressId)
            return;

        $.get(self.config.getAddressBaseUrl, { clientId: clientId, addressId: addressId }, function (data) {
            self.addressId(data.AddressID);
            self.validatedAddress(data);
            self.address(data.Address1);
            self.zipCode(data.Zip);

            selectCityState(data.City, data.State);
        });
    }
}


var editHierarchyModal = function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var objNodeParent = bindingContext.$parent;
    var objNode = bindingContext.$data;
    var value = ko.utils.unwrapObservable(valueAccessor());
    var $element = $(element);
    var $rootModel = bindingContext.$root.hierarchyModel ? bindingContext.$root.hierarchyModel() : bindingContext.$root;



    // edit properties modal
    if (value === 'complete') {
        $element.unbind();
        $element.click(function () {
            var $modal = $('.mettel-modal-dialog.mettel-edit-properties');
            var $modalHeader = $modal.find('.mettel-modal-header-text');
            var $content = $modal.find(".mettel-modal-content");
            var $footer = $modal.find('.mettel-modal-footer');
            // populate buttons to footer
            var buttonsHtml = '';
            buttonsHtml += '<div class="mettel-modal-primary-action-button-container">';
            buttonsHtml += '<button class="mettel-primary-button mettel-modal-delete-button" type="button">Delete</button>';
            buttonsHtml += '</div>';
            buttonsHtml += '<div class="mettel-modal-primary-action-button-container">';
            buttonsHtml += '<button class="mettel-primary-button mettel-modal-save-button" type="button">Save</button>';
            buttonsHtml += '</div>';
            $footer.html(buttonsHtml);
            var $saveButton = $modal.find('.mettel-modal-save-button');
            var $deleteButton = $modal.find('.mettel-modal-delete-button');

            // populate content, show field for updating hierarchy title
            $content.html("<form action='null' class='mettel-form mettel-modal-form' method='put'></form>");
            var $form = $modal.find(".mettel-modal-form");
            var strToAppend = '';
            strToAppend += '<fieldset class="mettel-fieldset">';
            strToAppend += '<div class="mettel-form-row">';
            strToAppend += '<label class="mettel-label">Node Value</label>';
            strToAppend += '<input type="text" class="mettel-input" name="newValue" value="' + objNode.title() + '"/>';
            strToAppend += '<input type="hidden" class="mettel-input" name="oldValue" value="' + objNode.title() + '"/>';
            strToAppend += '</div>';
            strToAppend += '</fieldset>';
            $form.html(strToAppend);

            // populate header
            $modalHeader.html('Edit Properties for ' + objNode.title());
            $modal.modalWindow({
                close: function () {
                    // using setTimeout so the content doesn't disappear before the modal closes
                    setTimeout(function () { $modalHeader.empty(); }, 400);
                }
            });
            var newKey = "";
            // bind save hierarchy button
            $saveButton.unbind();
            $saveButton.click(function () {
                var form = $form.serialize();
                console.log(form);
                $.ajax({
                    url: '/api/hierarchy/UpdateHierarchy/' + $rootModel.queryString() + (objNodeParent.key() ? '&key=' + encodeURIComponent(objNodeParent.key()) : ''),
                    type: "PUT",
                    data: form,
                    error: function (data) {
                        var objResponse = data.responseJSON;
                        var newValue = objResponse.title;
                        newKey = objResponse.key;
                        if (objResponse.type === "duplicate") {
                            buttonsHtml = '';
                            buttonsHtml += '<div class="mettel-modal-primary-action-button-container">';
                            buttonsHtml += '<button class="mettel-button mettel-modal-cancel-button" type="button">Cancel</button>';
                            buttonsHtml += '</div>';
                            buttonsHtml += '<div class="mettel-modal-primary-action-button-container">';
                            buttonsHtml += '<button class="mettel-primary-button mettel-modal-merge-button" type="button">Merge</button>';
                            buttonsHtml += '</div>';
                            $footer.html(buttonsHtml);
                            var $mergeButton = $modal.find(".mettel-modal-merge-button");
                            var $cancelButton = $modal.find(".mettel-modal-cancel-button");
                            //if new hierarchy exists, then allow to merge children and delete current node
                            $mergeButton.unbind();
                            $mergeButton.click(function () {
                                $modal.modalWindow('close');
                                if (objNode.children().length > 0) {
                                    getNodeChildrenModal(objNode, objNodeParent, newKey, $rootModel);

                                }
                                else {
                                    //no related objects will be affected, then delete directly
                                    deleteNode(objNode, objNodeParent, "", $rootModel);
                                }

                            });
                            $cancelButton.unbind();
                            $cancelButton.click(function () {
                                $modal.modalWindow('close');
                            });
                            // show duplicate herarchy
                            var strToAppend = '';
                            var $subHeader = $modal.find('.mettel-modal-subheader');
                            $subHeader.html("This element appears to be a duplicate of another element in the hierarchy.");


                            strToAppend += '<div class="mettel-hierarchy-possible-duplicate">';
                            strToAppend += '<ol class="mettel-hierarchy-possible-duplicate-list">';

                            _.each(objResponse.data.duplicates, function (duplicate) {

                                var matcher = new RegExp("(" + newValue + ")", "ig");
                                var dupNode = duplicate.key.toString().replace(matcher, "<strong>$1</strong>");

                                var dupNodeArr = dupNode.trim('|').split('|');
                                strToAppend += '<li class="mettel-delete-duplicate-row">';
                                strToAppend += '    <ul class="mettel-duplicate-tree">';

                                _.each(dupNodeArr, function (d) {
                                    strToAppend += '    <li>';
                                    strToAppend += d;
                                    strToAppend += '    </li>';
                                });

                                strToAppend += '    </ul>';
                                strToAppend += '    </li>';
                                //strToAppend += '    <li class="mettel-delete-duplicate-row" data-mettel-node-key="' + duplicate.key + '">';
                                //strToAppend += dupNode;
                                //strToAppend += '    </li>';
                            });
                            strToAppend += '</ol>';
                            strToAppend += '</div>';

                            $content.html(strToAppend);
                        }
                        else {
                            var $errorModal = $('.mettel-modal-dialog.mettel-server-error');
                            var $errorHeader = $errorModal.find('.mettel-modal-subheader');
                            //show error details from backend
                            if (objResponse.type === "exception") {
                                $errorHeader.html(objResponse.message);
                            }
                            $modal.modalWindow('close');
                            $errorModal.modalWindow();
                        }
                    },
                    success: function (data) {
                        if (data.status === "complete") {
                            objNode.title(data.title);
                            $modal.modalWindow('close');
                        }
                        else {
                            $('.mettel-modal-dialog.mettel-server-error').modalWindow();
                        }
                    }
                });
            });
            //bind delete hierarchy node button, pass mergeHierarchy as empty because user will choose it after showing affected objects count
            $deleteButton.unbind();
            $deleteButton.click(function () {
                getNodeChildrenModal(objNode, objNodeParent, "", $rootModel);
                $modal.modalWindow('close');
            });
        });
    }
        // duplicate modal
    else if (value === 'alert') {
        if (objNode.duplicateEntries().length > 0) {
            $element.unbind();
            $element.click(function () {
                var $modal = $('.mettel-modal-dialog.mettel-duplicate-dialog');
                var $duplicateList = $modal.find('.mettel-hierarchy-possible-duplicate-list');
                var $cancelButton = $modal.find('.mettel-modal-cancel-button');
                var $keepBothButton = $modal.find('.mettel-modal-keep-both');
                //var $subHeader = $modal.find('.mettel-modal-subheader');

                //$subHeader.html("This element appears to be a duplicate of another element in the hierarchy.");

                var strToAppend = '';

                _.each(objNode.duplicateEntries(), function (duplicate) {

                    var matcher = new RegExp("(" + objNode.title() + ")", "ig");
                    var dupNode = duplicate.key.toString().replace(matcher, "<strong>$1</strong>");
                    var dupNodeArr = dupNode.trim('|').split('|');
                    strToAppend += '<li class="mettel-delete-duplicate-row">';
                    strToAppend += '    <ul class="mettel-duplicate-tree">';

                    _.each(dupNodeArr, function (d) {
                        strToAppend += '    <li>';
                        strToAppend += d;
                        strToAppend += '    </li>';
                    });

                    strToAppend += '    </ul>';
                    strToAppend += '    </li>';
                });

                $duplicateList.html(strToAppend);

                $modal.modalWindow();

                $cancelButton.unbind();
                $cancelButton.click(function () {
                    //remove this alert node
                    objNodeParent.children.pop(objNode);
                    $modal.modalWindow('close');
                });
                $keepBothButton.unbind();
                $keepBothButton.click(function () {
                    //ignore duplicates and add hierarchy to database
                    console.log("Add hierarchy, key: " + objNodeParent.key() + ", title: " + objNode.title() + ", and ignoreDuplicates=true");
                    $.ajax({
                        url: '/api/hierarchy/AddHierarchy/' + $rootModel.queryString() + "&ignoreDuplicates=true",
                        type: 'POST',
                        data: {
                            title: objNode.title(),
                            key: objNodeParent.key() //Joy added: key may contain special character which will disturb url
                        },
                        success: function (data) {
                            if (data.status === "complete") {
                                objNode.key(data.key);
                                objNode.status("complete");
                                $modal.modalWindow('close');
                            }
                            else {
                                $('.mettel-modal-dialog.mettel-server-error').modalWindow({
                                    close: function () {
                                        objNodeParent.children.pop(objNode);
                                    }
                                });
                            }

                        },
                        error: function (result) {
                            var objResponse = result.responseJSON;
                            var $errorModal = $('.mettel-modal-dialog.mettel-server-error');
                            var $errorHeader = $errorModal.find('.mettel-modal-subheader');
                            $errorHeader.html(objResponse.message);
                            $errorModal.modalWindow();
                            $modal.modalWindow('close');

                        }
                    });

                });

            });
        }
            // suggestion modal
        else if (objNode.suggestedTitle !== "") {

            $element.unbind();
            $element.click(function () {
                var $modal = $('.mettel-modal-dialog.mettel-new-entry-dialog');
                var $suggestionList = $modal.find('.mettel-hierarchy-entry-rename');

                var $cancelButton = $modal.find('.mettel-modal-cancel-button');

                var strToAppend = '';

                strToAppend += '<div class="mettel-hierarchy-entry-rename-entry">';
                strToAppend += '    <div class="mettel-use-this-name-button-container">';
                strToAppend += '        <button class="mettel-primary-button mettel-original-title">Use This Name</button>';
                strToAppend += '    </div>';
                strToAppend += '    <p class="mettel-hierarchy-entry-rename-entry-value">' + objNode.title() + '</p>';
                strToAppend += '</div>';

                strToAppend += '<div class="mettel-hierarchy-entry-rename-entry">';
                strToAppend += '    <div class="mettel-use-this-name-button-container">';
                strToAppend += '        <button class="mettel-primary-button mettel-suggested-title">Use This Name</button>';
                strToAppend += '    </div>';
                strToAppend += '    <p class="mettel-hierarchy-entry-rename-entry-value">' + objNode.suggestedTitle() + '</p>';
                strToAppend += '</div>';

                $suggestionList.html(strToAppend);

                var $originalTitleButton = $modal.find('.mettel-original-title');
                var $suggestedTitleButton = $modal.find('.mettel-suggested-title');

                $modal.modalWindow();

                $originalTitleButton.click(function () {
                    $modal.modalWindow('close');
                    objNode.status("complete");
                });

                $suggestedTitleButton.click(function () {
                    $.ajax({
                        url: '/api/hierarchy/location/' + objNode.key,
                        type: 'PUT',
                        contentType: "application/json",
                        data: {
                            title: objNode.suggestedTitle()
                        },
                        success: function (data) {
                            $modal.modalWindow('close');

                            objNode.key(data.key);
                            objNode.status("complete");
                            objNode.title(objNode.suggestedTitle());
                            objNode.suggestedTitle("");
                        },
                        error: function (data) {
                            $modal.modalWindow('close');
                            $('.mettel-modal-dialog.mettel-server-error').modalWindow();
                        }
                    });

                });

                $cancelButton.click(function () {
                    $modal.modalWindow('close');
                });
            });
        }
    }
}

var deleteNode = function (node, parent, mergeHierarchy, hierarchyModal) {
    //var node = this;
    if (mergeHierarchy) {
        console.log("Delete Hierarchy, key: " + parent.key() + " and title: " + node.title() + " and merge children to hierarchy: " + mergeHierarchy);
    }
    else {
        console.log("Delete Hierarchy, key: " + parent.key() + " and title: " + node.title() + " and no children merged.");
    }
    $.ajax({
        url: '/api/hierarchy/DeleteHierarchy/' + hierarchyModal.queryString(),
        type: 'DELETE',
        data: {
            title: node.title(),
            destinationHierarchy: mergeHierarchy,
            key: parent.key() //Joy added: key may contain special character which will disturb url
        },
        success: function () {
            // delete the selected node as long as it does not have children
            if (!mergeHierarchy) {
                node.children([]);
                var removed = parent.children.remove(function (n) {
                    return (n.key() === node.key());
                });
            }
            else {
                //after merging children nodes, reload hierarchy tree
                console.log("Reload Hierarchy Data.");
                hierarchyModal.init('adminHierarchyData');
            }
        },
        error: function (data) {
            var objResponse = data.responseJSON;
            var $errorModal = $('.mettel-modal-dialog.mettel-server-error');
            var $errorHeader = $errorModal.find('.mettel-modal-subheader');
            //show error details from backend
            if (objResponse.type === "exception") {
                $errorHeader.html(objResponse.message);
                $errorModal.modalWindow();
            }
            else if (objResponse.type === "moveObjectsException")
            {
                getNodeChildrenModal(node, parent, "", hierarchyModal);
            }
        }
    });
}
var getNodeChildrenModal = function (node, parent, mergeHierarchy, hierarchyModal) {
    //var node = this;
    //get children of current node

    if (node.hasObject() == true) {
        var objectsCount = 0;
        //caculate the total count of related objects
        objectsCount = node.getRelatedObjectsCount();
        var $childrenNodeModal = $('.mettel-modal-dialog.mettel-delete-with-children');
        var $childrenNodeModalDetails = $childrenNodeModal.find(".mettel-modal-subheader-details");
        var $proceedButton = $childrenNodeModal.find(".mettel-modal-next-button");
        var $cancelButton = $childrenNodeModal.find(".mettel-modal-cancel-button");
        var childrenNodeModalHtml = "Deleting this node with affect " + objectsCount + " objects. Do you want to proceed?";
        $childrenNodeModalDetails.html(childrenNodeModalHtml);
        //$childrenNodeModal.modalWindow();
        setTimeout(function () { $childrenNodeModal.modalWindow(); }, 100);

        $proceedButton.unbind();
        $proceedButton.click(function () {
            //will need reload hierarchy tree after update/delete

            if (!mergeHierarchy) {
                showHierarchySelectBox(node, parent, hierarchyModal);
                $childrenNodeModal.modalWindow('close');
            }
            else {
                deleteNode(node, parent, mergeHierarchy, hierarchyModal);
            }

        });

        $cancelButton.unbind();
        $cancelButton.click(function () {
            //close modal
            $childrenNodeModal.modalWindow("close");
        });

    }
    else { //no related objects will be affected, then delete directly
        deleteNode(node, parent, mergeHierarchy, hierarchyModal);
    }
};

var showHierarchySelectBox = function (node, parent, hierarchyModal) {
    //var node = this;
    var $modal = $('.mettel-modal-dialog.mettel-delete-choose-hierarchy-node');
    var $content = $modal.find('.mettel-modal-content-details');
    var $errorMsg = $modal.find('.mettel-modal-content-error');
    var $nextButton = $modal.find(".mettel-modal-next-button");
    var $cancelButton = $modal.find(".mettel-modal-cancel-button");

    $content.html("<div id ='hierarchy-select-box' data-bind ='hierarchySelectBox:model'></div>");
    var $selectBox = $modal.find("#hierarchy-select-box");

    var config = {
        hierarchyDataUrl: "/Api/Hierarchy/GetAllHierarchiesTree" + hierarchyModal.queryString() + "&excludeHierarchy=" + node.key(),
        hierarchyLabelsUrl: "/api/hierarchy/getclienthierarchy" + hierarchyModal.queryString(),
        required: true,
        level: 0,
        optionLabel: "ALL",
        selectedHierarchy: parent.key()
    };
    var hierarchySelectBox = new HierarchySelectBoxModel(config);
    var model = {
        model: hierarchySelectBox
    };
    $selectBox.unbind();
    ko.applyBindings(model, $selectBox[0]);

    //$modal.modalWindow();
    setTimeout(function () { $modal.modalWindow(); }, 100);
    $nextButton.unbind();
    $nextButton.click(function () {
        $errorMsg.html("");
        //check levels
        deleteNode(node, parent, hierarchySelectBox.hierarchy(), hierarchyModal);
        $modal.modalWindow('close');
    });
    $cancelButton.unbind();
    $cancelButton.click(function () {
        $modal.modalWindow("close");
    });
};



var AccessHoursDays = [{
    key: "Su",
    desc: "Sunday",
    value:"SUNDAY"
}, {
    key: "M",
    desc: "Monday",
    value:"MONDAY"
}, {
    key: "Tu",
    desc: "Tuesday",
    value:"TUESDAY"
}, {
    key: "W",
    desc: "Wednesday",
    value:"WEDNESDAY"
}, {
    key: "Th",
    desc: "Thursday",
    value:"THURSDAY"
}, {
    key: "F",
    desc: "Friday",
    value:"FRIDAY"
}, {
    key: "Sa",
    desc: "Saturday",
    value:"SATURDAY"
}
];

var AccessHoursModel = function (binding) {
    var self = this;
    self.items = ko.observableArray();
    self.values = ko.observableArray();
    self.editVisible = ko.observable(false);
    self.setValue = function () {
        self.editing(true);
        var value = "";
        ko.utils.arrayForEach(self.values(), function (row) {

            var time = "";
            if (row.allDay()) {
                time = "ALL DAY";
            } else if (row.periods().length == 0) {
                time = "NOT AVAILABLE";
            } else {
                ko.utils.arrayForEach(row.periods(), function (srow) {
                    time += srow.time.replace(/ /g, "") + " ";
                });
                time = time.trimEnd(" ");
            }
            value += row.day.value + "|" + time + ",";
        });
        self.finalValue(value.trimEnd(","));
        self.editing(false);
    };
    self.id = ko.observable();
    self.edit = function () {
        if(self.id()){
            $("#" + self.id()).modal({title:self.title()});
        } else {
            throw new Error("id is required.");
        }
        self.showEdit();
    };
    self.showEdit = function () {
        var values = {};
        self.items([]);
        ko.utils.arrayForEach(self.values(), function (row) {
            if (row.allDay()) {
                if (!values["allday"]) {
                    values["allday"] = [];
                }
                values["allday"].push(row);
            } else if (row.periods().length > 0) {
                ko.utils.arrayForEach(row.periods(), function (time) {
                    if (!values[time.time]) {
                        values[time.time] = [];
                    }
                    values[time.time].push(row);
                });
            }
        });
        for (var key in values) {
            var model = new AccessHoursItemModel();
            if (key == "allday") {
                model.allDay(true);
            } else {
                var times = key.replace(/ /g, "").split("-");
                var from = times[0];
                var to = times[1];
                model.from(self.formatTime(from));
                model.to(self.formatTime(to));
            }
            ko.utils.arrayForEach(values[key], function (row) {
                var day = model.findDay(row.day);
                day.selected(true);
            });
            self.items.push(model);
        }
    };
    self.saveEdit = function () {
        ko.utils.arrayForEach(self.values(), function (row) {
            row.periods([]);
        });
        var updated = [];
        ko.utils.arrayForEach(self.items(), function (row) {
            for (var i = 0; i < row.days().length; i++) {
                var day = row.days()[i];
                var value = self.findValue(day.day);
                var u = false;
                if (updated.indexOf(value) < 0) {
                    updated.push(value);
                    value.periods([]);
                    value.allDay(false);
                } else {
                    u = true;
                }
                if (day.selected()) {
                    if (!u) {
                        if (row.allDay()) {
                            value.allDay(true);
                        } else {
                            value.periods.push({
                                time: row.from() + " - " + row.to()
                            });
                        }
                    } else {
                        if (!value.allDay()) {
                            if (row.allDay()) {
                                value.allDay(true);
                                value.periods([]);
                            } else {
                                value.periods.push({
                                    time: row.from() + " - " + row.to()
                                });
                            }
                        }
                    }
                }
            }
        });
        self.setValue();
    };

    self.title = ko.observable();
    self.add = function () {
        self.items.push(new AccessHoursItemModel());
    };
    self.remove = function (data) {
        self.items.remove(data);
    };
    self.editable = ko.observable(true);
    self.save = function () {
        self.saveEdit();
        $("#" + self.id()).modal("close");
    };
    self.findValue = function (day) {
        for (var i = 0; i < self.values().length; i++) {
            var value = self.values()[i];
            if (value.day == day) {
                return value;
            }
        }
    };
    self.finalValue = ko.observable();
    self.findDay = function (desc,value) {
        for (var i = 0; i < AccessHoursDays.length; i++) {
            if (desc && AccessHoursDays[i].desc == desc) {
                return AccessHoursDays[i];
            } else if (value && AccessHoursDays[i].value == value) {
                return AccessHoursDays[i];
            }
        }
    };
    self.formatTime = function (time) {
        return time.replace("AM", " AM").replace("PM", " PM").replace("-", " - ");
    }
    self.load = function () {
        self.values([]);
        for (i = 0; i < AccessHoursDays.length; i++) {
            self.values.push({
                periods: ko.observableArray(),
                day: AccessHoursDays[i],
                allDay: ko.observable(false)
            });
        }
        if (self.finalValue()) {
            var values = self.finalValue().split(",");
            ko.utils.arrayForEach(values, function (row) {
                var dayAndTime = row.split("|");
                var day = self.findDay(null, dayAndTime[0]);
                var value = self.findValue(day);
                value.allDay(dayAndTime[1] == "ALL DAY");
                value.periods(function () {
                    if (dayAndTime[1] == "NOT AVAILABLE") {
                        return [];
                    }
                    else {
                        var periods = [];
                        var times = dayAndTime[1].split(" ");
                        ko.utils.arrayForEach(times, function (time) {
                            periods.push({ time: self.formatTime(time) });
                        });
                        return periods;
                    }
                }());
            });
        }
    };
    self.editing = ko.observable(false);
}

var AccessHoursItemModel = function () {
    var self = this;

    self.days = ko.observableArray();
    self.allDay = ko.observable(false);
    self.from = ko.observable();
    self.to = ko.observable();
    self.hours = function () {
        var h = [];
        for (var i = 0; i < 24; i++) {
            if (i == 12) {
                h.push("12 PM");
            } else if (i == 0) {
                h.push("12 AM");
            } else if(i <12){
                h.push(i + " AM");
            } else {
                h.push((i - 12) + " PM");
            }
        }
        return h;
    }();
    self.load = function () {
        for (i = 0; i < AccessHoursDays.length; i++) {
            self.days.push({
                selected: ko.observable(false),
                day: AccessHoursDays[i]
            });
        }
    };
    self.findDay = function (day) {
        for (var i = 0; i < self.days().length; i++) {
            var d = self.days()[i];
            if (d.day == day) {
                return d;
            }
        }
    }
    self.load();
};
var PreAuthorizeHoursModel = function() {
    var self = this;
    self.loading = ko.observable(false);
    self.preAuth = ko.observable("true");
    self.preAuthHours = ko.observable()

    self.finalValue = ko.observable();

    self.preAuth.subscribe(function (value) {
        if (!self.loading()) {
            if (value === "true") {
                self.finalValue(self.preAuthHours());
            } else {
                self.finalValue(0);
            }
        }
    });
    self.preAuthHours.subscribe(function (value) {
        if (!self.loading()) {
            self.finalValue(value);
        }
    });
    self.load = function () {
        self.loading(true);
        self.finalValue.extend({
            validation: {
                validator : function(val) {
                    if (self.preAuth() == "true" && (!val || !(val > 0))) {
                        return false;
                    }
                    return true;
                },
                message: 'Hours field is required and must be a positive number.'
            }
        });
        if (self.finalValue()) {
            var value = self.finalValue();
            if (value > 0) {
                self.preAuth("true");
                self.preAuthHours(value);
            } else {
                self.preAuth("false");
            }
        }
        self.loading(false);
    };
}
ko.bindingHandlers.accessHours = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();

        var template = 'access-hours-template';

        if (allBindingsAccessor().accessHours.template) {
            template = allBindingsAccessor().accessHours.template;
        }

        var model = new AccessHoursModel();
        var id = $(element).attr('id');
        if (!id) {
            id = "access_hours_" +(new Date()).getMilliseconds();
            $(element).attr('id', id);
        }
        model.id(id);
        model.title(allBindingsAccessor().accessHours.title);

        if (allBindingsAccessor().accessHours.editable != undefined && allBindingsAccessor().accessHours.editable == false) {
            model.editable(false);
        }
        model.finalValue = allBindingsAccessor().value;
        model.finalValue.subscribe(function () {
            if (!model.editing()) {
                model.load();
            }
        });
        model.load();
        var templateId = allBindingsAccessor().accessHours.templateId ? allBindingsAccessor().accessHours.templateId: template;
        ko.renderTemplate(templateId, model, { }, element, 'replaceNode');
    }
};
ko.bindingHandlers.preAuthorizeHours = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        var template = 'field-preauthorizehours-template';
        var text = allBindingsAccessor().preAuthorizeHours.text;
        var model;

        // only setup the model once, and store it for if we come back to the page
        if (!viewModel.preauthorizeHoursModel) {
            model = viewModel.preauthorizeHoursModel = new PreAuthorizeHoursModel();
            model.finalValue = allBindingsAccessor().value;
            model.finalValue.subscribe(function (value) {
                text(value != '0' ? 'Yes, up to ' + value + ' hours' : 'No');
            });
            model.load();
        } else {
            model = viewModel.preauthorizeHoursModel
        }

        ko.renderTemplate(template, model, { }, element, 'replaceNode');
    }
};
ko.bindingHandlers.addressDialog = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var accessor = valueAccessor();
        var model = new AddressDialogModel({ addressLabelText: allBindingsAccessor().addressDialog.label });
        model.addressId = allBindingsAccessor().value;
        var text = allBindingsAccessor().addressDialog.text;
        model.validatedAddress.subscribe(function (value) {
            if (text) {
                if (value) {
                    text((value.Address1 ? value.Address1 : "") + "\n\r" +
                        (value.City ? value.City + ", " : "") + (value.State ? value.State + " " : "") + (value.Zip ? value.Zip : ""));
                } else {
                    text("");
                }
            }
        });
        if (model.addressId()) {
            model.loadAddress(model.addressId(), 0);
        }
        var templateId = 'address-dialog-template';
        ko.renderTemplate(templateId, model, {}, element, 'replaceNode');
    }
};
ko.bindingHandlers.addressId = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var addressId = allBindingsAccessor().addressId;
        var templateId = 'address-display-template';
        var model = {
            address: ko.observable(),
            city: ko.observable(),
            state: ko.observable(),
            zip: ko.observable()
        };
        if (addressId) {
            $.get("/api/address/", { addressId: addressId}, function (response) {
                model.address(response.Address1);
                model.city(response.City);
                model.state(response.State);
                model.zip(response.Zip);
            });
        }
        ko.renderTemplate(templateId, model, {}, element, 'replaceNode');
    }
};
ko.bindingHandlers.addressObject = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var response = allBindingsAccessor().addressObject();
        var templateId = 'address-display-template';
        var model = {
            address: ko.observable(),
            city: ko.observable(),
            state: ko.observable(),
            zip: ko.observable()
        };
        if (response) {
            model.address(response.Address1);
            model.city(response.City);
            model.state(response.State);
            model.zip(response.Zip);
        }
        ko.renderTemplate(templateId, model, {}, element, 'replaceNode');
    }
};
ko.bindingHandlers.dropDownList = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = allBindingsAccessor().value;
        ko.unwrap(value());
        var displayText = allBindingsAccessor().dropDownList.text;
        if (value()) {
            displayText($(element).find("option:selected").text());
        }
    }
};
ko.bindingHandlers.checkBox = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = allBindingsAccessor().value;

        var displayText = allBindingsAccessor().checkBox.text;
        displayText(value()?"Yes":"No");
    }
};

// Form Element Optional Indicators

var isFormElementRequired = function (validators) {
    var required = false;
    $.each(validators, function (i, validator) {
        if (validator.Type && validator.Type === 'RequiredValidator') {
            required = true;
            return false;
        }
    });
    return required;
};

ko.bindingHandlers.showOptionalPlaceholder = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            inputType = ko.unwrap(valueAccessor().InputType),
            validators = ko.unwrap(valueAccessor().validators),
            optional = !isFormElementRequired(validators),
            appropriateType = (inputType === "TextBox" || inputType === "TextArea" || inputType === "DatePicker");

        if (optional && appropriateType) {
            $element.attr('placeholder', 'Optional');
        }
    }
};

ko.bindingHandlers.showOptionalLabel = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            inputType = ko.unwrap(valueAccessor().InputType),
            validators = ko.unwrap(valueAccessor().validators),
            optional = !isFormElementRequired(validators),
            appropriateType = (inputType === "FileUpload" || inputType === "HuntGroup" || inputType === "Address");

        if (optional && appropriateType) {
            $element.show();
        }
    }
};

// Form Error Message

var showAllFormErrors = function (formSelectors) {
    var $errorMessages;

    if (typeof formSelectors === "string") {
        // Just one form selector, so find it and its errors
        var $form = $(formSelectors);
        $errorMessages = $form.find('.mettel-error-message');

    } else if (typeof formSelectors === "object") {
        // Array of selectors, so find them all
        var $forms = $();
        $.each(formSelectors, function (i, formSelector) {
            $forms = $forms.add(formSelector);
        });
        $errorMessages = $forms.find('.mettel-error-message');

    } else {
        // No selector (or invalid), so find all errors on the page
        $errorMessages = $('.mettel-error-message');
    }

    $.each($errorMessages, function (i, errorMessage) {
        var $errorMessage = $(errorMessage);
        if ($errorMessage.text() !== '') {
            $errorMessage.show();
        }
    });
};

ko.bindingHandlers.showFormError = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $errorMessage = $(element),
            $formElement = $errorMessage.prev('.mettel-form-row').find('input, select');

        // Only check for errors after the form element has been blurred
        $formElement.on('blur', function () {
            // If there are errors, show them
            if ($errorMessage.text() !== '') {
                $errorMessage.show();
            }
        });
    }
};

ko.validation.rules['address'] = {
    validator: function (val, baseValidationUrl) {

        if (!val.state || !val.city || !val.address1 || !/\S/.test(val.state) || !/\S/.test(val.city) || !/\S/.test(val.address1)) {
            return false;
        }

        var url = baseValidationUrl
            + "?address1=" + val.address1
            + "&address2=" + val.address2
            + "&city=" + val.city
            + "&state=" + val.state
            + "&zip=" + val.zipCode;
        var responce = $.ajax({ type: "GET", url: url, async: false });
        return responce.status === 200;
    },
    message: "Address is not valid"
};
ko.bindingHandlers.typeAheadExtension = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var displayText = allBindingsAccessor().value;
        var value = allBindingsAccessor().typeAhead.selectedValue;
        value.extend({
            validation: {
                validator: function (val) {
                    if (displayText()) {
                        return val;
                    }
                    return true;
                },
                message: 'Please select a suggestions.'
            }
        });
    }
};
ko.validation.registerExtenders();




var MultiScrollingSelectorModel = function (config) {
    var self = this;
    MultiScrollingUnselectedItems = [];
    self.settings = {
        dataUrl: "",
        selectedIds: [],
        unselectedItems:[]
    };
    if (config) {
        $.extend(self.settings, config);
    }
    self.list = ko.observable();

    self.init = function () {
        if (self.settings.dataUrl) {
            $.get(self.settings.dataUrl, function (response) {
                var list = new MultiScrollingSelectorList(self.settings);
                _.each(response, function (itemData) {
                    var item = new MultiScrollingSelectorListItem(itemData);
                    list.items.push(item);
                });
                self.list(list);
            });
        }
    };
    self.getSelectedItems = function () {
        var items = [];
        var list = self;
        while (list.list() != null) {
            list = list.list();
        }
        _.each(list.items(), function (item) {
            if (item.checked()) {
                items.push(item);
            }
        })
        return items;
    };
    self.getUnselectedItems = function () {
        return self.settings.unselectedItems;
    };
    self.init();
}
var MultiScrollingSelectorList = function (config) {
    var self = this;
    self.parentConfig = config;
    self.settings = {
        selectedIds: []
    };
    if(config){
        $.extend(self.settings,config);
    }
    self.selectedItem = ko.observable();
    self.selectedItem.subscribe(function (value) {
        if (!value) {
            self.list(null);
        }
    });
    self.items = ko.observableArray();
    self.list = ko.observable();
    self.select = function (item) {
        self.selectedItem(null);
        if (item.children() && item.children().length > 0) {
            var list = new MultiScrollingSelectorList(self.settings);
            _.each(item.children(), function (subItemData) {
                var subItem = new MultiScrollingSelectorListItem(subItemData);
                if (!subItem.children() || subItem.children().length == 0) {
                    subItem.checkable(true);
                    if (self.settings.selectedIds.length > 0 && _.find(self.settings.selectedIds,function(id){return id == subItem.id() })) {
                        subItem.checked(true);
                        subItem.checked.subscribe(function (value) {
                            if (!value) {
                                self.parentConfig.unselectedItems.push(subItem);
                            }
                        });
                    }
                }
                list.items.push(subItem);
            });
            self.list(list);
            self.selectedItem(item);
        } else {
            item.checked(!item.checked());
        }
    };
};
var MultiScrollingSelectorListItem = function (data) {
    var self = this;
    self.name = ko.observable();
    self.id = ko.observable();
    self.subtitle = ko.observable();
    self.children = ko.observableArray();
    self.checkable = ko.observable();
    self.checked = ko.observable();
    if (data) {
        ko.mapping.fromJS(data, null, self);
    }
};
ko.bindingHandlers.gridHoverMenu = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $element = $(element);
        var menuAreaSelector = valueAccessor();
        var $menu = $element.find(menuAreaSelector);


        var autoMoveUp = function (element) {
            var windowHeight = $(window).height();
            var top = $(element).find(".mettel-icon-action-menu").offset().top;
            var height = $(element).find(".context-menu-container").height();
            var bottomDistance = windowHeight - top - 60;

            if (height > bottomDistance) {
                $(element).find(".context-menu-container").offset({
                    top: windowHeight - height - 38
                });
            } else {
                $(element).find(".context-menu-container").offset({
                    top: top
                });
            }




        };


        $element.on('mouseover', function (e) {
            e.stopPropagation();
            $menu.show();
            autoMoveUp($element);
        });

        $element.on('mouseout', function (e) {
            e.stopPropagation();
            $menu.hide();
        });


    }
};
ko.bindingHandlers.formDisabled = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);
        var value = allBindingsAccessor().formDisabled;
        if (value) {
            setInterval(function () {
                if ($(element).is('input, select, textarea, button')) {
                    $(element).attr("disabled", "disabled");
                }

                $(element).find("input").attr("disabled", "disabled");
                $(element).find("button").attr("disabled", "disabled");
                $(element).find("select").attr("disabled", "disabled");
                $(element).find("textarea").attr("disabled", "disabled");
            }, 1000);
        }
    }
};
ko.bindingHandlers.chosen = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = allBindingsAccessor().value;
        var $element = $(element);
        var config = allBindingsAccessor().chosen;
        $element.chosen(config);
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var selectList = ko.utils.unwrapObservable(allBindingsAccessor().options);
        var value = ko.utils.unwrapObservable(allBindingsAccessor().value);
        var $element = $(element);
        var config = allBindingsAccessor().chosen;
        //$element.chosen("destroy");
        //$element.chosen(config);
        $element.trigger("chosen:updated");
    }
};

var UserImageModel = function () {
    var self = this;
    self.config = null;

    self.imageUrl = ko.observable();
    self.imageName = ko.observable();

    self.open = function (config) {
        self.config = config;

        self.imageName('');
        self.imageUrl(config.image != '' ? '/images/user/' + config.width + 'x' + config.height + '/' + config.image : '/images/mettel-user-default-photo.png');
        $('#updatePhoto').modal({ title: 'AVATAR FOR ' + config.name, });

    };

    self.save = function () {
        var uploadUrl = "/api/user/uploadPhoto?assignToDirId=" + self.config.dirId;
        var $form = $("#user_photo_form");
        if (SiteJS.IsIE()) {
            $form.attr("action", uploadUrl);
            $form.submit();
            return;
        }
        $.ajax({
            type: 'POST',
            url: uploadUrl,
            data: new FormData($form[0]),
            cache: false,
            contentType: false,
            processData: false,
            success: function (response) {
                if (self.config.callback) {
                    self.config.callback(response);
                }
                self.imageName('');
                $("#updatePhoto").modal("close");
            },
            error: function (response) {
                SiteJS.showError("Error", response.responseJSON.message);
            },
        });
    }
}

var userImageModel = new UserImageModel();
$(function () {
    var userPhotoModal = $("#updatePhoto")[0];
    if (userPhotoModal) {
        ko.applyBindings(userImageModel, userPhotoModal);
    }
});

var ChangeSettingsModel = function () {
    var self = this;

    self.config = null;
    self.alternatingGridRows = ko.observable(false);
    self.spoilerOpened = ko.observable(false);

    self.open = function (config) {
        self.config = config;
        self.alternatingGridRows(config.alternatingGridRows);
        $('#settingsDialog').modal({ title: 'CHANGE SETTINGS' });
    };

    self.save = function () {
        $.post(
                "/api/user/SaveGlobalUserSettings",
                { AlternatingGridRows: self.alternatingGridRows() },
                function (response) {
                    $("#settingsDialog").modal("close");
                })
            .fail(
                function (response) {
                    SiteJS.showError("Error", response.responseJSON.message);
                });
    }
}

var changeSettingsModel = new ChangeSettingsModel();
$(function () {
    var changeSettingsModal = $("#settingsDialog")[0];
    if (changeSettingsModal) {
        ko.applyBindings(changeSettingsModel, changeSettingsModal);
    }
});

// to tell that a text box only accepts numeric inputs
ko.bindingHandlers.numeric = {
    init: function (element, valueAccessor) {
        var elem = $(element);
        var k;
        // little trick just in case you want to use this:
        $('<span></span>').insertAfter(elem);
        var $dText = $(elem).next('span').hide();
        // Really cross-browser key event handler
        function Key(e) {
            if (!e.which && ((e.charCode ||
            e.charCode === 0) ? e.charCode : e.keyCode)) {
                e.which = e.charCode || e.keyCode;
            } return e.which;
        }
        return $(elem).each(function () {
            $(this).keydown(function (e) {
                k = Key(e);
                return (
                // Allow CTRL+V , backspace, tab, delete, arrows,
                // numbers and keypad numbers ONLY
                (k == 86 && e.ctrlKey) || (k == 224 && e.metaKey) || k == 8 || k == 9 || k == 46 || (k >= 37 && k <= 40 && k !== 32)
                    || (k >= 48 && k <= 57) || (k >= 96 && k <= 105)
                    || (k == 188 || k == 190 || k == 110) /* Allow . */
                    || (k >= 35 && k <= 39) /* Allow Home, End key */
                    || (k == 67 && e.ctrlKey) /* Allow CTRL+C */
                 );
            }).keyup(function (e) {
                var value = this.value.replace(/\s+/, '-');
                // Check if pasted content is Number
                if (isNaN(value)) {
                    // re-add stored digits if CTRL+V have non digits chars
                    $(this).val($dText.text());
                } else { // store digits only of easy access
                    $dText.empty().append(value);
                }
            });
        });
    }
};

// to bind <option> attribute(s) within <select>
ko.bindingHandlers.optionsBind = {
    preprocess: function (value, key, addBinding) {
        addBinding('optionsAfterRender', 'function(option, item) { ko.bindingHandlers.optionsBind.applyBindings(option, item, ' + value + ') }');
    },
    applyBindings: function (option, item, bindings) {
        if (item !== undefined) {
            option.setAttribute('data-bind', bindings);
            ko.applyBindings(ko.contextFor(option).createChildContext(item), option);
        }
    }
};

ko.bindingHandlers.fieldTooltip = {
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
var VideoBarModal = function (isManager, type) {
    var self = this;
    self.loading = ko.observable();

    self.allVideos = ko.observableArray();
    self.editable = isManager == null ? false : isManager;
    self.expanded = ko.observable(false);
    self.addModelOn = ko.observable(false);
    self.videoOn = ko.observable(false);
    self.backOn = ko.observable(false);
    self.type = (!type ? "customer" : "employee");
    self.loaded = false;
    self.loadAll = function (callback) {
        if (self.allVideos().length == 0) {
            self.allVideos.removeAll();
            self.loading("Loading Video...");
            $.get("/api/media/album", function (json) {

                //check whether this album should be rendered
                var wait = [];
                _.each(json.data, function (album) {
                    var strs = album.uri.split("/");
                    var albumId = strs[strs.length - 1];
                    var types = album.description == null ? "" : album.description.toLowerCase().replace(",", " ");
                    if (types != "") {
                        wait.push(self.loadAlbumVideo(albumId, types));
                    }
                });
                $.when.apply($, wait).done(function () {

                    if (callback) {
                        callback();
                    }
                });
            }).fail(function () {
                self.loading("No Video.");
            });
        }
    }
    self.loadAlbumVideo = function (albumId, types) {
        return $.get("/api/media/video", { albumId: albumId }, function (json) {
            _.each(json.data, function (video) {
                var strs = video.uri.split("/");
                var videoId = strs[strs.length - 1];

                var pictureId = -1;
                if (video.pictures.uri != null) {
                    var strs = video.pictures.uri.split("/");
                    pictureId = strs[strs.length - 1];
                }
                strs = video.name.split("-");
                var name = strs[strs.length - 1];

                var newObject = {
                    videoId: videoId,
                    pictureId: pictureId,
                    name: name,
                    types: types,
                    displayOrder: ko.observable(),
                    added: ko.observable()
                };
                newObject.added.subscribe(function (newValue) {
                    if (self.loaded) {
                        newObject.displayOrder(1000);
                        self.save();
                        //if (!newValue) {

                        //}
                    }
                })
                self.allVideos.push(newObject);
            });

        });
    }
    self.save = function () {
        var url = window.location.pathname.trimEnd("/").toLowerCase();
        data = [];
        _.each(_.filter(self.allVideos(), function (item) {
            return item.added();
        }), function (video) {
            //if (!video.displayOrder()) {
            //    video.displayOrder(1000);
            //}
            data.push({
                page: encodeURIComponent(url),
                name: video.name,
                videoId: video.videoId,
                pictureId: video.pictureId,
                videoUrl: encodeURIComponent("https://player.vimeo.com/video/" + video.videoId + "?badge=0&autopause=0&player_id=0"),
                pictureUrl: encodeURIComponent("https://i.vimeocdn.com/video/" + video.pictureId + "_200x150.jpg?r=pad"),
                displayOrder: video.displayOrder()
            });
        });
        $.ajax({
            type: "post",
            url: "/Api/media/saveVideos",
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify({ page: encodeURIComponent(url), data: data })
        }).done(function (response) {
            //SiteJS.Dialog(response);
        });
    }
    self.videos = ko.computed(function () {
        var allVideos = _.filter(self.allVideos(), function (item) {
            return item.added();
        });
        var result = [];
        validIds = [];
        if (self.editable) {
            validIds = allVideos;
        } else {
            _.each(allVideos, function (video) {
                if (video.types.indexOf(self.type) > -1) {
                    validIds.push(video);
                }
            });
        }
        result = validIds;
        result.sort(function (a, b) {
            return a.displayOrder() - b.displayOrder();
        });
        for (var i = 0; i < result.length; i++) {
            result[i].displayOrder(i * 2);
        }
        return result;
    });
    self.load = function () {
        var page = window.location.pathname.trimEnd("/").toLowerCase();
        self.loadAll(function () {
            $.get("/Api/media/loadVideo", { page: encodeURIComponent(page) }, function (json) {
                _.each(self.allVideos(), function (item) {
                    var foundIndex = _.map(json, function (data) { return data.videoId; }).indexOf(item.videoId);
                    if (foundIndex > -1) {
                        item.added(true);
                        item.displayOrder(json[foundIndex].displayOrder);
                    } else {
                        item.added(false);
                    }
                });
                if (self.videos().length > 0) {
                    self.loading("");
                    $('.mettel-video-thumbnail')[0].focus();
                } else {
                    self.loading("No Video.")
                    $('.menu-close-toggle').focus();
                }
                self.loaded = true;
            });
        });
    }

    self.expanded.subscribe(function (value) {
        if (value) {
            self.load();
        }
        else {
            setTimeout(function () {
                $('.menu-open-toggle').focus();
            },
            0);
        }
    });
}

var VideoAddModal = function (barModal, videoModal) {
    var self = this;
    self.barModal = barModal;
    self.videoModal = videoModal;
}


var VideoModal = function () {
    var self = this;
    self.name = ko.observable();
    self.videoId = ko.observable();
}

// BP-3671
jQuery.fn.onPositionChanged = function (trigger, millis) {
    if (millis == null) millis = 100;
    var o = $(this[0]); // our jquery object
    if (o.length < 1) return o;

    var lastPos = null;
    var lastOff = null;
    setInterval(function () {
        if (o == null || o.length < 1) return o; // abort if element is non existend eny more
        if (!o.is(':focus')) return o; // only trigger if the element is in focus
        if (lastPos == null) lastPos = o.position();
        if (lastOff == null) lastOff = o.offset();
        var newPos = o.position();
        var newOff = o.offset();
        if (lastPos.top != newPos.top || lastPos.left != newPos.left) {
            $(this).trigger('onPositionChanged', { lastPos: lastPos, newPos: newPos });
            if (typeof (trigger) == "function") trigger(lastPos, newPos, o);
            lastPos = o.position();
        }
        if (lastOff.top != newOff.top || lastOff.left != newOff.left) {
            $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff });
            if (typeof (trigger) == "function") trigger(lastOff, newOff, o);
            lastOff = o.offset();
        }
    }, millis);

    return o;
};
