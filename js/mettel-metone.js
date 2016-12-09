/*
 * MetTel Collapsible Row Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */


(function ($) {

    var methods = {
        init: function(options) {
            var $collabsibleRow    = $(this),
                trigger            = '[data-mettel-class="expandable-trigger"]',
                visibleClass       = 'mettel-state-visible',
                expandedClass      = 'mettel-state-expanded';

            $collabsibleRow.each(function(){

                var $triggers          = $collabsibleRow.find( $(trigger) ),
                    $expandableContent = $collabsibleRow.find( $('[data-mettel-class="expandable-content"]') );

                $triggers.each(function(){
                    var $this    = $(this),
                        $content = $this.nextUntil(trigger);

                    $this.click(function(){
                        $this.toggleClass(expandedClass);
                        $content.toggleClass(visibleClass);
                    });

                });

            });

        }
    };

    $.fn.mettelCollapsibleRow = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelCollapsibleRow');
        }

    };

})(jQuery);

/*
 * MetTel Fixed Header Component
 *
 * Arguments:
 *  options
 *      bufferSections - Helps determine where header is frozen
 *      scrollContainer - container that is scrolled
 *
 */


(function($) {

    var methods = {
        init: function(options, element) {

            if (!(options && options.scrollContainer && options.bufferSections)) {
                return false;
            }

            var $container = $(element);
            var fixedElementWidth, verticalBuffer, padding, width, windowHeight, sectionVerticalOffset, noteListContainerHeight, browserWindowHeight;
            var $fixedElement = $container.find('[data-id="fixed-element"]');
            var $fixedElements = $container.find('[data-id="fixed-element-section"], [data-id="fixed-element"]');
            var $fixedElementSection = $container.find('[data-id="fixed-element-section"]');
            var fixedClass = "mettel-fixed-element";
            var $pageFooter = $('.mettel-footer');
            var footerHeight = parseInt($($pageFooter).outerHeight(), 10);
            var $noteListContainer = $(".mettel-ticket-note-list-container");
            var $elementsToWatch = $(options.elementsToWatch);

            var fixHeader = function(e, watchedElementResized) {
                /* figure out where the container is vertically */
                var verticalLocation = $container.offset().top - $(window).scrollTop();
                browserWindowHeight = verticalBuffer = padding = width = windowHeight = sectionVerticalOffset = noteListContainerHeight = 0;

                /* the fixed top sections provide the distance from top of window to
                 help us determine where to vertically fix the div
                 */
                $(options.bufferSections).each(function(item, value){
                    verticalBuffer += parseInt($(value).height(), 10);
                    width = parseInt($(value).width(), 10);
                });

                browserWindowHeight = (parseInt($(window).outerHeight(), 10));

                /* we don't want anything to get fixed if notes container is too short,
                otherwise we'll lose scroll bar and we'll get odd behaviors
                 */
                noteListContainerHeight = parseInt($($noteListContainer).outerHeight(), 10);
                if(browserWindowHeight > (verticalBuffer + footerHeight + noteListContainerHeight)) {
                    return false;
                }

                /* position:fixed the div when it gets above the bottom of the vertical buffer*/
                if ((parseInt(verticalLocation, 10) < verticalBuffer) && (!$fixedElementSection.hasClass(fixedClass) || watchedElementResized)) {

                    /* position:fixed the section header */
                    $($fixedElement).each(function(){
                        padding = parseInt($(this).height(), 10);
                        $(this).css("top", verticalBuffer + "px");
                    });

                    $($fixedElements).toggleClass(fixedClass, true);

                    /* visble div should be window height - top vertical height and then make sure nothing gets
                    hidden underneath the footer. window - top buffer - footer height buffer = div height
                     */
                    windowHeight = browserWindowHeight - verticalBuffer - footerHeight;
                    sectionVerticalOffset = parseInt($($fixedElement).outerHeight(), 10);
                    /* due to fixed element, widths need to be set in case notification panel is opened */
                    fixedElementWidth = parseInt((0.495 * parseInt($(".mettel-notes-container").width(), 10)),10) + 7 + 'px';

                    /* set the height of the div and the location of it relative to top*/
                    $($fixedElementSection).css({
                        "height": windowHeight + "px",
                        "top": sectionVerticalOffset + verticalBuffer + "px",
                        "overflow-y":"scroll",
                        "overflow-x": "scroll",
                        "width": fixedElementWidth
                    });

                    $($fixedElementSection).find("." + fixedClass).css({
                        "width": fixedElementWidth
                    });
                }
                else if ((parseInt(verticalLocation, 10) > verticalBuffer) && ($fixedElementSection.hasClass(fixedClass))) {

                    /* unset position:fixed for section header and div section*/
                    $($fixedElements).toggleClass(fixedClass, false);
                    $($fixedElementSection).css({
                        "height": "auto",
                        "top": "auto",
                        "overflow-y":"auto",
                        "overflow-x": "auto"
                    });

                    $($fixedElementSection).find("." + fixedClass).css({
                        "width": "initial"
                    });

                }

            };

            $(options.scrollContainer).on("scroll resize", fixHeader);

            $elementsToWatch.resize(function(e) {
                fixHeader(e, true);
            });
        }

    };

    $.fn.fixedHeader = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.fixedHeader');
        }

    };

})(jQuery);

/*
 * MetTel Flyout Component
 */


(function($) {

    var methods = {
        init: function(options) {

            var $toggle = $(this),
                $flyout = $toggle.next('[data-mettel-class~="flyout"]'),
                activeClass = 'mettel-state-active',
                overlayClass = 'mettel-flyout-overlay',
                event = options.event ? options.event : 'click',  // default to click
                customTabbing = options.customTabbing ? options.customTabbing : false, // default to no custom tabbing
                additionalOverlayClass = options.additionalOverlayClass ? options.additionalOverlayClass : undefined;

            // If the flyoutTrigger custom binding is used and bindings are needed in the flyout,
            // putting the flyout first will allow its bindings to run before it's moved to the page container
            if (!$flyout.length) {
                $flyout = $toggle.prev('[data-mettel-class~="flyout"]');
            }

            var $focusableElements = $flyout.find(MetTel.Variables.focusableSelectors),
                $firstFocusableEl = $focusableElements.first(),
                $lastFocusableEl = $focusableElements.last(),
                hasFocusElements = $focusableElements.length ? true : false;

            if (hasFocusElements) {
                $focusableElements.attr({ 'tabindex': -1 });
            }

            var $container = $('[data-mettel-class="page"]');

            if (!$container.length) {
                $container = $('body');
            }

            $flyout.detach().appendTo($container);

            var showOverlay = function() {
                    methods.calculatePosition($toggle, $flyout, options);
                    $flyout.addClass(activeClass);
                    $toggle.addClass(activeClass);

                    if (event === 'click') {
                        var $div = $('<div />').appendTo('.mettel-page');
                        $div.addClass(overlayClass);

                        if (additionalOverlayClass) {
                            $div.addClass(additionalOverlayClass);
                        }

                        $div.on('click', function() {
                            hideOverlay();
                        });
                    }

                    if (hasFocusElements) {
                        $focusableElements.attr({ 'tabindex': 0 });
                    }
                },
                hideOverlay = function() {
                    $flyout.removeClass(activeClass);
                    $toggle.removeClass(activeClass);

                    if (event === 'click') {
                        $('.' + overlayClass).remove();
                    }

                    if (methods.cancel) {
                        options.flyout = $flyout;
                        options.activeClass = activeClass;
                        options.overlayClass = overlayClass;
                        methods.cancel.call(this, options);
                    }

                    if (hasFocusElements) {
                        $focusableElements.attr({ 'tabindex': -1 });
                    }
                };

            // mouse events

            if (event === 'click') {

                $toggle.addClass('mettel-toggle-clickable');

                $toggle.on({
                    'click': function() {

                        if (!$toggle.hasClass(activeClass)) {

                            showOverlay();

                            if (options.open) {
                                options.open();
                            }

                        }
                        else {
                            hideOverlay();
                        }
                    }
                });

            } else if (event === 'hover') {

                $toggle.addClass('mettel-toggle-hoverable');

                var $toggleAndFlyout = $toggle.add($flyout);

                $toggleAndFlyout.on({
                    'mouseenter': function() {
                        showOverlay();
                    },
                    'mouseleave': function() {
                        hideOverlay();
                    }
                });
            }

            // keyboard events

            if (!customTabbing) {

                $toggle.keydown(function(e) {
                    e.stopPropagation();

                    if (e.keyCode === 13 || e.keyCode === 32) {
                        // for enter or space, toggle flyout
                        if ($toggle.hasClass(activeClass)) {
                            hideOverlay();
                        } else {
                            showOverlay();
                        }

                    } else if (hasFocusElements && e.keyCode === 9 && !e.shiftKey) {
                        // for forward tabbing, if flyout is showing, go to first element
                        if ($toggle.hasClass(activeClass)) {
                            e.preventDefault();
                            $firstFocusableEl.focus();
                        }
                    }
                });

                if (hasFocusElements) {

                    $firstFocusableEl.keydown(function(e) {
                        // if back tabbing from first, got to toggle
                        if (e.keyCode === 9 && e.shiftKey) {
                            e.preventDefault();
                            $toggle.focus();
                            hideOverlay();
                        }
                    });

                    $lastFocusableEl.keydown(function(e) {
                        // if forward tabbing from last, go to next focusable element and hide overlay
                        if (e.keyCode === 9 && !e.shiftKey) {
                            e.preventDefault();
                            $toggle.focus();
                            hideOverlay();

                            var $tabbables = $(':tabbable'),
                                toggleIndex = $tabbables.index($toggle),
                                nextIndex = 0;

                            if (toggleIndex + 1 < $tabbables.length) {
                                nextIndex = toggleIndex + 1;
                            }

                            $tabbables.eq(nextIndex).focus();
                        }
                    });
                }
            }
        },

        calculatePosition: function($toggle, $flyout, options) {
            var triggerX = $toggle.offset().left,
                triggerY = $toggle.offset().top,
                triggerHeight = $toggle.outerHeight(),
                triggerWidth = $toggle.outerWidth(),
                pageWidth = $('[data-mettel-class="page"]').outerWidth(),
                leftMenu = $('[data-mettel-class="mettel-navigation"]'),
                leftMenuWidth = leftMenu.length && leftMenu.css('left').match(/px$/) ? leftMenu.outerWidth() : 0,
                position = options && options.position ? options.position : "bottom";

            $flyout.addClass('mettel-' + position);

            switch (position) {
                case "top":
                    $flyout
                        .css({
                            top: triggerY - $flyout.outerHeight(true)
                        });
                    break;
                case "right":
                    $flyout
                        .css({
                            left: triggerX + triggerWidth
                        });
                    break;
                case "bottom":
                    $flyout
                        .css({
                            top: triggerY + triggerHeight
                        });
                    break;
                case "left":
                    $flyout
                        .css({
                            left: triggerX - $flyout.outerWidth(true)
                        });
                    break;
                case "bottom-left":
                    $flyout
                        .css({
                            top: triggerY + triggerHeight
                        })
                        .css({
                            right: pageWidth + leftMenuWidth - (triggerX + triggerWidth)
                        });
                    break;
            }

            if (position === 'top' || position === 'bottom') {
                $flyout.css({
                    left: triggerX
                });
            } else if (position === 'left' || position === 'right') {
                $flyout.css({
                    top: triggerY
                });
            }
        },

        cancel: function(options) {
            methods.close.call(this, options);

            // Call the cancel handler if one exists.
            if (options.cancel) {
                options.cancel();
            }
        },

        close: function(options) {
            var $toggle = $(this),
                $flyout = options.flyout,
                $focusableElements = $flyout.find(MetTel.Variables.focusableSelectors),
                hasFocusElements = $focusableElements.length ? true : false,
                activeClass = options.activeClass ? options.activeClass : 'mettel-state-active',
                overlayClass = options.overlayClass ? options.overlayClass : 'mettel-flyout-overlay',
                event = options.event ? options.event : 'click';  // default to click

            $flyout.removeClass(activeClass);
            $toggle.removeClass(activeClass);

            if (hasFocusElements) {
                $focusableElements.attr({ 'tabindex': -1 });
            }

            if (event === 'click') {
                $('.' + overlayClass).remove();
            }
        }
    };

    $.fn.mettelFlyout = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelFlyout');
        }
    };

})(jQuery);

/*
 * MetTel Header User Settings Menu
 */

(function ($) {

    var methods = {

        init: function(options) {
            // IE10 doesnt read the conditional elements in IE10, but IE supports this feature we can check against to add a class to the HTML.
            var isIE10 = window.navigator.msPointerEnabled;
            if (isIE10) {
               $('html').addClass('lt-ie11');
            }

            var $globalHeader = $('[data-mettel-class="mettel-header"]');

            $globalHeader.each(function(){

                var $this                   = $(this),
                    $userSettings           = $this.find('[data-mettel-class="mettel-user-settings"]'),
                    $userTrigger            = $this.find('[data-mettel-class="mettel-user-trigger"]'),
                    $userSettingOption      = $this.find('[data-mettel-class="mettel-user-setting-option"]'),
                    $userSettingSubOption   = $this.find('[data-mettel-class="mettel-user-setting-option-sub"]'),
                    $userSettingSubMenu     = $this.find('[data-mettel-class="mettel-user-settings-submenu"]'),
                    $overlayCloseTrigger    = $this.find('[data-mettel-class="mettel-dropdown-close-trigger"]'),
                    overlayActive           = 'mettel-overlay-active',
                    userSettingsActive      = 'active',
                    selectedClass           = 'selected',
                    // var boolean to prevent being able to open the user settings when search is open
                    settingVar              = true;

                $userTrigger.click(function(){
                    // check the boolean to see if this should run or not, only runs when true
                    if (settingVar){
                        var $this = $(this);

                        $userSettings.toggleClass(userSettingsActive);
                        $overlayCloseTrigger.addClass(overlayActive);
                    }
                    // reset boolean to true so you can toggle the user settings open and close
                    settingVar = true;
                });

                $userSettingOption.click(function(){
                    var $this = $(this);

                    $userSettings.removeClass(userSettingsActive);

                    $userSettingOption.removeClass(selectedClass);
                    $userSettingSubOption.removeClass(selectedClass);
                    $this.addClass(selectedClass);

                    $overlayCloseTrigger.removeClass(overlayActive);
                    $userSettingSubMenu.removeClass(overlayActive);
                });

                $userSettingSubOption.click(function () {
                    var $this = $(this);
                    $userSettingOption.removeClass(selectedClass);

                    $this.toggleClass(selectedClass);
                    $userSettingSubMenu.toggleClass(overlayActive);
                });

                $overlayCloseTrigger.click(function(){
                    if ( !$userSettings.is(":hidden") ) {
                        $userSettings.removeClass(userSettingsActive);
                    }
                    $overlayCloseTrigger.removeClass(overlayActive);
                });
            });
        }
    };

    $.fn.mettelGlobalSearch = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelGlobalSearch');
        }

    };

})(jQuery);

/* global Modernizr: true */

/*
 * MetTel Loading Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */


(function ($) {

    var methods = {
        init: function(options) {

            var $loader           = $(this),
                indicators        = 5,
                indicatorTemplate = '<span class="mettel-loader-indicator"></span>';

            // Append the dots - using a var so the number could eventually be configurable
            for (var i = 0; i < indicators; i++ ) {
                $loader.append(indicatorTemplate);
            }

            function jqueryAnimate() {

                var $indicator    = $('.mettel-loader-indicator'),
                    lastIndicator = $indicator.length - 1;

                // Need to set opacity to 0 first to avoid a flash of full opacity dots
                $indicator.css('opacity', '0').each(function(i){

                    var $this = $(this),
                        delay = 250 * i,
                        speed = 500;

                    $this.delay(delay).animate({opacity: '1'}, speed, function() {
                        $this.animate({opacity: '0'}, function(){
                            if( i === lastIndicator ) {
                                jqueryAnimate();
                            }
                        });
                    });

                });

            }

            if( !Modernizr.cssanimations ) {
                jqueryAnimate();
            }

        }
    };

    $.fn.mettelLoader = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelLoader');
        }

    };

})(jQuery);

/*
 * MetTel Modal Dialog Box Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */
// ModalWindow jQuery Plugin
(function ($) {

    var focusedElementBeforeModal;

    var methods = {
        init: function(options) {
            var $body = $('body'),
                $page = $body.children('[data-mettel-class="page"]'),
                $modalWindow = $(this),
                strIdMarker = ($modalWindow.attr('id') === undefined) ? "" : " " + $modalWindow.attr('id') + "-marker",
                // Anytime the close button is located throughout, the first() instance is used since it's necessary
                // to ensure child modals aren't impacted by attached events
                $closeButton = $modalWindow.find(".mettel-close-button").first(),
                closeModal = _.bind(
                    function() {
                        // Close any child windows then close this instance
                        _.each($modalWindow.find('.mettel-modal-dialog'), function(childModal){
                            methods.close.call(childModal, options);
                        });
                        methods.close.call(this, options);
                    }, this);

            // Store the element that was focused before the modal opened
            focusedElementBeforeModal = $(':focus');

            // If the modal window isn't already wrapped, move it to the page and wrap it
            if ($modalWindow.parent('.mettel-modal-dialog-container').length === 0) {

                if ($modalWindow.hasClass("full-screen")) {
                    var $pageInner = $page.children('[data-mettel-class="page-inner"]');
                    $modalWindow.appendTo($pageInner);
                    $modalWindow.wrap('<div class="mettel-modal-overlay"><div class="mettel-modal-dialog-container' + strIdMarker + ' mettel-modal-dialog-container-full-screen"></div></div>');
                } else {
                    $modalWindow.appendTo($page);
                    $modalWindow.wrap('<div class="mettel-modal-overlay"><div class="mettel-modal-overlay-inner"><div class="mettel-modal-dialog-container' + strIdMarker + '"></div></div></div>');
                }
            }

            // Find its overlay
            var $overlay = $modalWindow.closest('.mettel-modal-overlay');

            if ($closeButton.length === 0) {
                $closeButton = $('<button class="mettel-close-button mettel-icon-close-alt"><span class="mettel-accessible-text">Close</span></button>').appendTo($modalWindow.find('.mettel-modal-header').first());
            }

            // Register close modal events
            $closeButton.click(closeModal);

            $body.addClass('mettel-prevent-scroll');
            $page.addClass('mettel-modal-open');

            $overlay.show();
            $modalWindow.show();

            $overlay.bind("touchmove", false);

            $closeButton.focus();

            if (options && options.initCallback) {
                options.initCallback();
            }

            return this;
        },
        close: function(options) {
            options = options ? options : {};

            var $body = $('body'),
                $page = $body.children('[data-mettel-class="page"]'),
                $modalWindow = $(this),
                $overlay = $modalWindow.closest('.mettel-modal-overlay'),
                $scrollbar = $('.mettel-modal-content.scrollable'),
                $closeButton = $modalWindow.find(".mettel-close-button").first();

            $modalWindow.hide();
            $overlay.hide();
            $scrollbar.removeClass('mettel-scrollbar');
            $closeButton.off();

            // If there is more then one open modalWindow
            // Some of the following code was supplied by MetTel.
            if ($($body.find('.mettel-modal-dialog[style*="display: block"]')).length <=1 ) {
                $body.removeClass("mettel-prevent-scroll");
                $page.removeClass('mettel-modal-open');
            }

            // Return focus to where it was before opening the modal
            if (focusedElementBeforeModal) {
                focusedElementBeforeModal.focus();
            }

            // Call the close handler if one exists.
            if (options.close) {
                options.close();
            }
        }
    };

    $.fn.modalWindow = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettel.modalWindow');
        }

    };

})(jQuery);

/*
 * MetTel Radio Button Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */


(function ($) {

    var methods = {
        init: function(options) {

            $.each($(this), function(index, value){

                var $label = $(value),
                    $container = $label.find('[data-mettel-class="radio-container"]'),
                    $radio = $label.find('[data-mettel-class="radio"]'),
                    name = $radio.attr('name'),
                    $form = $label.closest('[data-mettel-class="form"]'),
                    $radios = $form.find('[data-mettel-class="radio"][name="' + name + '"]');

                if ($radio.val() === $radios.val()) {
                    $container.addClass('mettel-state-checked');
                }

                $label.on('click', function (e) {
                    var $selectedRadio = $form.find('[data-mettel-class="radio"][name="' + name + '"]:checked');

                    $radios.each(function () {
                        var $button = $(this);

                        if ($button.prop('checked')) {
                            $button.closest('[data-mettel-class="radio-container"]').addClass('mettel-state-checked');
                        }
                        else {
                            $button.closest('[data-mettel-class="radio-container"]').removeClass('mettel-state-checked');
                        }
                    });

                });

            });
        }
    };

    $.fn.mettelRadio = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelRadio');
        }

    };

})(jQuery);

/*
 * MetTel Resizable Columns
 *
 * Arguments:
 *  options
 *      draggableElement
 *      columnRightElement
 *      containerElement
 *      maxWidthColumnRight
 *      minWidthColumnRight
 *      minWidthColumnLeft
 *
 */

(function($) {

    var methods = {
        init: function(options) {

            var self = this;

            if(!options || !options.draggableElement || !options.columnLeftElement || !options.columnRightElement || !options.containerElement) {
                return false;
            }

            self.draggableElement = options.draggableElement;
            self.columnRightElement = options.columnRightElement;
            self.columnLeftElement = options.columnLeftElement;
            self.containerElement = options.containerElement;
            self.maxWidthColumnRight = options.maxWidthColumnRight ? parseInt(options.maxWidthColumnRight, 10) + 'px' : '400px';
            self.minWidthColumnRight = options.minWidthColumnRight ? parseInt(options.minWidthColumnRight, 10) + 'px' : '200px';
            self.minWidthColumnLeft = options.minWidthColumnLeft ? parseInt(options.minWidthColumnLeft, 10) + 'px' : '300px';

            function resizerObj(resizerID, mousemove, cursor) {

                var resizer = $(resizerID)[0];
                $(resizerID).css("cursor", cursor);
                resizer.mousemove = mousemove;

                resizer.onmousedown = function() {
                    console.log('mouse down');
                    $(self.containerElement).on('mousemove', function(event) {
                        resizer.doDrag(event);
                    });
                    $(self.containerElement).on('mouseup', function(event) {
                        resizer.stopDrag(event);
                    });
                };

                resizer.doDrag = function(event) {
                    if (event.which !== 1) {
                        resizer.stopDrag();
                        return;
                    }
                    resizer.mousemove(event);
                };

                resizer.stopDrag = function() {
                    $(self.containerElement).off('mousemove');
                    $(self.containerElement).off('mouseup');
                };
            }

            function resizeColumns(resizerID, mousemove) {
                resizerObj(resizerID, mousemove, "col-resize");
            }

            function resize(x) {

                var containerWidth = $(self.columnRightElement).parent().innerWidth(),
                    container = $(self.containerElement),
                    offset = container.offset();

                var rightWidth = containerWidth + offset.left - x + 'px';
                var leftWidth = containerWidth - parseInt(rightWidth, 10) - $(self.draggableElement).width() + 'px';

                if(parseInt(rightWidth, 10) > parseInt(self.maxWidthColumnRight, 10)) {
                    $(self.columnRightElement).css("width", self.maxWidthColumnRight);
                } else if(parseInt(rightWidth, 10) < parseInt(self.minWidthColumnRight, 10)) {
                    $(self.columnRightElement).css("width", self.minWidthColumnRight);
                } else {
                    if(parseInt(leftWidth, 10) > parseInt(self.minWidthColumnLeft, 10)) {
                        $(self.columnRightElement).css("width", rightWidth);
                        $(self.columnLeftElement).css("width", leftWidth);
                    }
                }
            }

            resizeColumns(self.draggableElement, function(event) {
                resize(event.pageX);
            });

            //initialize
            resize($(self.draggableElement)[0].offsetLeft);

        }
    };

    $.fn.resizableColumns = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettel.resizableColumns');
        }

    };

})(jQuery);

/*
 * MetTel Right-size columns
 *
 * Arguments:
 *  options

 *
 */

(function ($) {

    var methods = {
        init: function (options) {

            if (!options || !options.scrollableColumns) {
                return false;
            }

            var self = this;
            var windowHeight = 0;

            self.scrollableColumns = options.scrollableColumns.length ? options.scrollableColumns : [];

            function resizeColumns() {

                windowHeight = window.innerHeight - parseInt($(".mettel-header").height(), 10) - parseInt($(".mettel-footer").height(), 10);

                for (var i = 0; i < self.scrollableColumns.length; i++) {

                    $(".mettel-dashboard-columns").css("height", windowHeight + 'px');

                    if (parseInt($(self.scrollableColumns[i]).height(), 10) > windowHeight) {
                        $(self.scrollableColumns[i]).css({
                            "height": windowHeight + "px",
                            "overflow-y": "auto"
                        });
                    } else {
                        $(self.scrollableColumns[i]).toggleClass("mettel-stretch", true);
                        $(self.scrollableColumns[i]).css({
                            "height": "initial",
                            "overflow-y": "auto"
                        });
                    }
                }
            }

            function removeFlex() {
                for (var i = 0; i < self.scrollableColumns.length; i++) {
                    $(self.scrollableColumns[i]).toggleClass("mettel-stretch", false);
                    $(self.scrollableColumns[i]).css({
                        "height": "auto",
                        "overflow-y": "auto"
                    });
                }
            }

            removeFlex();
            resizeColumns();

            var resizeTimer;

            $(window).on("resize", function () {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function() {
                    removeFlex();
                    _.delay(resizeColumns, 10);
                }, 100);
            });

        }
    };

    $.fn.rightsizeColumns = function (method) {
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettel.rightsizeColumns');
        }

    };

})(jQuery);

/*
 * MetTel Scrolling Selector Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */


(function ($) {

    var $deleteButton = $('.mettel-scrolling-selector-delete-button');

    $deleteButton.click(function(e){
        e.stopPropagation();
    });

    var methods = {
        init: function(options) {

            options = options ? options : {};

            // defaults to single select option
            var multiSelect = options.multiSelect ? options.multiSelect : false;

            var deleteOption = options.deleteOption ? options.deleteOption : false;

            var required = options.required ? options.required : false;

            var defaultValue = options.defaultValue ? options.defaultValue : false;

            // If a default value is assigned, on page load find its input
            // and mark it checked, and add the selected class
            if (required && defaultValue) {
                var $radioList = $(this).find('[type="radio"]');
                $.each($radioList, function (i, radio) {
                    var $radio = $(radio),
                        $radioLabel = $radio.closest('.mettel-scrolling-selector-inner');
                    if ($radio.val() === defaultValue) {
                        radio.checked = true;
                        $radioLabel.addClass('mettel-state-selected');
                    }
                });
            }

            var $scrollingSelector = $(this);

            if (multiSelect) {
                $scrollingSelector.addClass('mettel-multi-select');
            }

            if (deleteOption === false) {
                $scrollingSelector.addClass('no-delete-option');
            }

            $scrollingSelector.on('click', '.mettel-scrolling-selector-inner', function(e) {

                var $clickedLink = $(this);

                // adding check mark for multi select
                if (multiSelect) {
                    $clickedLink.toggleClass('checked');
                }
                // for single select, deselect the other selected links within this scrolling selector
                else {
                    $scrollingSelector.find('.mettel-scrolling-selector-inner.mettel-state-selected').not($clickedLink).removeClass('mettel-state-selected');
                }

                if (!required) {
                    // For multi select and single select without required attribute
                    $clickedLink.toggleClass('mettel-state-selected');
                    // For single select without required attribute only, if the radio was already checked
                    if (!multiSelect && !$clickedLink.hasClass('mettel-state-selected')) {
                        // Un-check the radio
                        $(this).find('[type="radio"]')[0].checked = false;
                    }
                } else {
                    // For single select with required attribute
                    $clickedLink.addClass('mettel-state-selected');
                }

            });
        }
    };

    $.fn.mettelScrollingSelector = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelScrollingSelector');
        }

    };

})(jQuery);

/*
 * MetTel Tab Container Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */

(function ($) {

    var methods = {
        init: function(options) {

            var $tabBar = $(this);

            $tabBar.each(function(){

                var $this       = $(this),
                    $triggers   = $this.find('[data-mettel-class="tab-item"]'),
                    activeClass = 'mettel-state-active',
                    callbacks   = $.Callbacks();

                $triggers.each(function(){

                    $(this).click(function(event){

                        var $trigger   = $(this),
                            fnName     = $trigger.attr('data-mettel-function'),
                            fn         = window[fnName](arguments),
                            $activeTab = $this.find('.' + activeClass);

                        // IE doesn't support preventDefault so we do an if statement to check and if it's IE well use the returnValue method.
                        if (event.preventDefault) {
                            event.preventDefault();
                        } else {
                            event.returnValue = false;
                        }

                        $activeTab.removeClass(activeClass);
                        $trigger.addClass(activeClass);

                        callbacks.add( fn );
                        callbacks.fire();
                        callbacks.remove( fn );

                    });

                });

            });
        }
    };

    $.fn.mettelTabBar = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelTabBar');
        }

    };

})(jQuery);

/*
 * MetTel Tab Container Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */

(function ($) {

    var methods = {
        init: function(options) {

            var $tabContainers = $(this);

            $tabContainers.each(function(){

                var $tabContainer = $(this),
                    $triggers     = $tabContainer.find('[data-mettel-class="tab-trigger"]'),
                    $contents     = $tabContainer.find('[data-mettel-class="tab-content"]'),
                    activeClass   = 'mettel-state-active';

                $triggers.each(function(){

                    $(this).click(function(event){

                        var index      = $(this).index(),
                            $activeTab = $contents.filter('.' + activeClass),
                            $activeTrigger = $triggers.filter('.' + activeClass);


                        // IE doesn't support preventDefault so we do an if statement to check and if it's IE well use the returnValue method.
                        if (event.preventDefault) {
                            event.preventDefault();
                        } else {
                            event.returnValue = false;
                        }

                        $activeTab.removeClass(activeClass);
                        $activeTrigger.removeClass(activeClass);
                        $(this).addClass(activeClass);
                        var $tab = $contents.eq(index).addClass(activeClass);

                        $tabContainer.trigger('tabActivate', $tab);
                    });

                });

            });
        }
    };

    $.fn.mettelTabContainer = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelTabContainer');
        }

    };

})(jQuery);

/*
 * MetTel Tooltip Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */


(function ($) {

    var methods = {
        init: function(options) {

            var $trigger        = $(this),
                $tooltip        = $trigger.next('[data-mettel-class="tooltip"]'),
                hoverDelay      = options && options.hoverDelay ? options.hoverDelay : 0,
                hover;

            // If the tooltipTrigger custom binding is used and bindings are needed in the tooltip,
            // putting the tooltip first will allow its bindings to run before it's moved to the page container
            if (!$tooltip.length) {
                $tooltip = $trigger.prev('[data-mettel-class="tooltip"]');
            }

            var $container = $('[data-mettel-class="page"]');

            if (!$container.length) {
                $container = $('body');
            }

            $tooltip.detach().appendTo($container);

            $trigger.on({
                'mouseenter': function() {
                    methods.calculatePosition($trigger, $tooltip, options);

                    hover = setTimeout(function(){
                        $tooltip.addClass('mettel-state-active');
                    }, hoverDelay);
                },
                'mouseleave': function() {
                    clearTimeout(hover);
                    $tooltip.removeClass('mettel-state-active');
                }
            });

            if (options && options.tooltipHoverable) {

                $tooltip.on({
                    'mouseenter': function() {
                        $tooltip.addClass('mettel-state-active');
                    },
                    'mouseleave': function() {
                        $tooltip.removeClass('mettel-state-active');
                    }
                });
            }
        },

        calculatePosition: function($trigger, $tooltip, options) {
            var triggerX        = $trigger.offset().left,
                triggerY        = $trigger.offset().top,
                triggerHeight   = $trigger.outerHeight(),
                triggerWidth    = $trigger.outerWidth(),
                position        = options && options.position ? options.position : "bottom",
                //used to keep items from floating off of right side of screen, particularly the notifications tooltip
                offsetLeft      = options && options.offsetLeft ? options.offsetLeft : 0;

            $tooltip.addClass('mettel-' + position);

            switch(position) {
                case "top":
                    $tooltip
                        .css({
                            top: triggerY - $tooltip.outerHeight(true)
                        });
                    break;
                case "right":
                    $tooltip
                        .css({
                            left: triggerX + triggerWidth
                        });
                    break;
                case "bottom":
                    $tooltip
                        .css({
                            top: triggerY + triggerHeight
                        });
                    break;
                case "left":
                    $tooltip
                        .css({
                            left: triggerX - $tooltip.outerWidth(true)
                        });
                    break;
            }

            if (position === 'top' || position === 'bottom') {
                $tooltip.css({
                    left: triggerX + offsetLeft + (triggerWidth / 2),
                    marginLeft: ($tooltip.outerWidth() / 2) * -1
                });
            } else if (position === 'left' || position === 'right') {
                $tooltip.css({
                    top: triggerY + (triggerHeight / 2),
                    marginTop: ($tooltip.outerHeight() / 2) * -1
                });
            }
        }
    };

    $.fn.mettelTooltip = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelTooltip');
        }

    };

})(jQuery);

/*
 * MetTel Tree View Component
 *
 * Arguments:
 *  options
 *      option - description.
 *
 */


(function ($) {

    var methods = {
        init: function(options) {

            var $tree        = $(this),
                $triggers    = $tree.find('[data-mettel-class="tree-trigger"]'),
                subitemClass = 'mettel-tree-subitems',
                visibleClass = 'mettel-state-expanded',
                $subitemList  =  $('.mettel-tree-item-text');

            $triggers.each(function(){
                var $this = $(this),
                    $row = $this.parent().parent();

                $this.click(function(event){
                    $row.toggleClass('mettel-state-expanded');
                });

            });

            $subitemList.each(function(){
                var $this        = $(this),
                    itemSelected = 'mettel-state-selected';

                $this.click(function(event){
                    $subitemList.removeClass(itemSelected);
                    $this.addClass(itemSelected);
                });
            });
        }
    };

    $.fn.mettelTree = function(method) {
        // Method calling logic
        if (methods[method]) {
            return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        else {
            $.error('Method ' + method + ' does not exist on jQuery.mettelTree');
        }

    };

})(jQuery);

function AccountBarModel(options) {
    options = options ? options : {};
    var self = this;

    this.accountId = ko.observable();
    this.accountLabel = ko.observable();
    this.accountNumber = ko.observable();
    this.primaryServiceAddress = ko.observable();
    this.hierarchyBreadcrumbs = ko.observableArray();
    this.due = ko.observable();
    this.lastInvoice = ko.observable();
    this.lastInvoiceId = ko.observable();
    this.balanceForward = ko.observable();
    this.newCharges = ko.observable();
    this.amountDue = ko.observable();
    this.notes = ko.observableArray();

    this.expanded = ko.observable(false);
    this.toggleExpanded = function() {
        self.expanded(!self.expanded());
    };

    this.newNote = ko.observable();

    // Fire the custom callback to edit the account label
    this.triggerEditAccountLabel = function (accountId) {
        self.editAccountLabel(accountId);
    };

    self.init = function () {
        // Get account bar data
        $.getJSON(self.endPoints.getAccountBarData, function (data) {
            self.accountId(data.accountId);
            self.accountLabel(data.accountLabel);
            self.accountNumber(data.accountNumber);
            self.primaryServiceAddress(data.primaryServiceAddress);
            self.hierarchyBreadcrumbs(data.hierarchyBreadcrumbs);
            self.due(data.due);
            self.lastInvoice(data.lastInvoice);
            self.lastInvoiceId(data.lastInvoiceId);
            self.balanceForward(data.balanceForward);
            self.newCharges(data.newCharges);
            self.amountDue(data.amountDue);
            self.notes(data.notes);
        });
    };
}

ko.bindingHandlers.downloadLastInvoice = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);
        $element.click('on', function () {
            if (viewModel.endPoints.downloadInvoice) {
                window.open(viewModel.endPoints.downloadInvoice + '&invoiceId=' + viewModel.lastInvoiceId());
            }
        });
    }
};

ko.bindingHandlers.addNote = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.click('on', function() {
            $(".mettel-new-note-modal").modalWindow();
        });
    }
};

ko.bindingHandlers.saveNote = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.click('on', function() {
            if (viewModel.endPoints.saveNote && viewModel.newNote()) {
                $.post(viewModel.endPoints.saveNote, { notes: viewModel.newNote() }, function () {
                    viewModel.newNote("");
                    $(".mettel-new-note-modal").modalWindow("close");
                    viewModel.init();
                });
            } else {
                console.log("require save note endpoint or notes");
            }
        });
    }
};

ko.bindingHandlers.accountBar = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.editAccountLabel = options.editAccountLabel;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'account-bar', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};
ko.bindingHandlers.actionButtons = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor(),
            model = {};

        model.actionsAreArray = ko.observable(true);
        model.actionsActive = ko.observable(false);
        model.value = allBindingsAccessor().value;
        model.activeSelected = ko.observable().extend({
            notify: 'always'
        });

        // Set the activeSelected id
        model.setActive = function(id) {
            model.activeSelected(id);
        };

        // Whenever the active selected changes, update value of passed in observable
        model.activeSelected.subscribe(function(newValue){
            model.value(newValue);
        });

        //If array/object
        if(accessor.actions && (typeof accessor.actions === 'object')) {
            // Sort out which action is the default
            model.actions = [];
            $.each(accessor.actions, function(i, action) {
                if(action.id === accessor.default) {
                    model.defaultAction = action;
                } else {
                    model.actions.push(action);
                }
            });
        } else {
            //If string, then we may only want to display string
            model.actionsAreArray(false);
            model.customMessage = accessor.customMessage;
        }

        ko.renderTemplate("action-buttons-template", model, {}, element, 'replaceNode');
    }
};
function BillDetailsModel() {
    var self = this;

    // Boolean indicating whether or not the page data has been loaded for first time
    this.initializedData = ko.observable(false);

    // Boolean indicating whether or not chart has been rendered for the first time - for chart animations
    this.initializedChart = ko.observable(false);

    // Holds all chart data
    this.chartData = ko.observable();

    // List of past filters
    this.pastFilters = ko.observableArray([
        {
            "id": 3,
            "label": "Prior 3 Months"
        },
        {
            "id": 6,
            "label": "Prior 6 Months"
        },
        {
            "id": 9,
            "label": "Prior 9 Months"
        }
    ]);

    // Active past filter defaulted to 3 months
    this.activePastFilter = ko.observable(3);

    // Value of all features checkbox
    this.allFeaturesFilter = ko.observable(true);

    // List of feature filters
    this.featureFilters = ko.observableArray();

    // List of all active feature filters
    this.activeFeatureFilters = ko.observableArray();

    // When All Features checkbox value changes
    self.allFeaturesFilter.subscribe(function (newValue) {

        if (newValue) {
            // If its new value is true, set all feature filters to active
            ko.utils.arrayForEach(self.featureFilters(), function (filter) {
                filter.active(true);
            });
        } else if (self.activeFeatureFilters().length === self.featureFilters().length) {
            // If its new value is false and all of the individual feature filters are active, inactivate all of them
            ko.utils.arrayForEach(self.featureFilters(), function (filter) {
                filter.active(false);
            });
        }

    });

    // When any feature changes to/from active
    this.activeFeatures = ko.computed(function () {

        var activeFilters = [];

        // Create a new array of active filters
        ko.utils.arrayForEach(self.featureFilters(), function (filter) {
            if (filter.active()) {
                activeFilters.push(filter);
            }
        });

        // Set the observable array
        self.activeFeatureFilters(activeFilters);

        // If all filters are active
        if (activeFilters.length === self.featureFilters().length) {
            // Check the All checkbox
            self.allFeaturesFilter(true);
        } else if (activeFilters.length < self.featureFilters().length) {
            // If not, uncheck the All checkbox
            self.allFeaturesFilter(false);
        }

    });

    // Get bill details data for the first time
    this.init = function () {

        // Show loader
        self.ajaxResponded(false);

        // Add filter id to query params
        self.addQueryParams({ past: self.activePastFilter() });

        // Set url with query params
        var url = self.endPoints.getBillDetailsData + self.queryString();

        // Go fetch the call performance data
        $.getJSON(url, function (data) {

            // Hide loader
            self.ajaxResponded(true);

            if (!self.initializedData()) {

                // Set list of feature filters from data and add an active observable to each
                // But during the first call
                $.each(data.features, function (i, feature) {
                    var featureFilter = {};

                    featureFilter.label = feature.label;
                    featureFilter.active = ko.observable(true);
                    featureFilter.id = i + 1;

                    self.featureFilters.push(featureFilter);
                });

                // Data initialized
                self.initializedData(true);

            }

            // Set main chart data
            self.chartData(data);
        });

    };

    // Anytime a different past filter is selected, run the initial data call with the new filter params
    self.activePastFilter.subscribe(function () {
        self.init();
    });

}

ko.bindingHandlers.billDetails = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        MetTel.DashboardBaseModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'bill-details',
                data: viewModel
            }
        }, bindingContext);

        return {controlsDescendantBindings: true};
    }
};

ko.bindingHandlers.billDetailsChart = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        if (valueAccessor()()) {

            var $element = $(element),
                chartData = valueAccessor()(),
                monthsWithYear = chartData.months,
                months = [],
                features = chartData.features,
                featureFilters = bindingContext.$parent.featureFilters(),
                activeFeatureFilters = bindingContext.$parent.activeFeatureFilters(),
                initialized = bindingContext.$parent.initializedChart(),
                chartConfig = {},
                gap,
                grayColor = '#999',
                featureColors = ['#2686E6', '#94D574', '#FF754A', '#FFCB2F', '#CD67E9'],
                featureColorsSecondary = ['#6DADEE', '#B8E2A2', '#FFA385', '#FFDB67', '#DE97F0'];

            if (monthsWithYear) {

                $.each(monthsWithYear, function (i, month) {
                    var breakPosition = month.indexOf(' ');

                    month = month.slice(0, breakPosition);
                    months.push(month);
                });

                var currentMonth = _.last(months);

                // Adjust gaps between months depending on how many columns are showing
                var columnsAmount = months.length * activeFeatureFilters.length;

                if (columnsAmount <= 10) {
                    gap = 6;
                } else if (columnsAmount > 10 && columnsAmount <= 20) {
                    gap = 5;
                } else if (columnsAmount > 20 && columnsAmount <= 30) {
                    gap = 4;
                } else if (columnsAmount > 30 && columnsAmount <= 40) {
                    gap = 3;
                } else if (columnsAmount > 40 && columnsAmount <= 50) {
                    gap = 2;
                }

                // If comparing six or nine months, display short names of months
                if (months.length > 4) {
                    var shortMonth,
                        shortMonths = [];
                    $.each(months, function (i, month) {
                        shortMonth = month.slice(0, 3);
                        shortMonths.push(shortMonth);
                    });
                    months = shortMonths;
                    currentMonth = _.last(months);
                }

                if (features) {

                    chartConfig = {
                        legend: {
                            visible: false
                        },
                        chartArea: {
                            background: 'transparent',
                            margin: 0,
                            height: 300
                        },
                        transitions: !initialized,
                        seriesDefaults: {
                            type: 'column',
                            spacing: 0,
                            gap: gap,
                            overlay: {
                                gradient: 'none'
                            },
                            border: {
                                width: 0
                            }
                        },
                        series: [],
                        valueAxis: {
                            labels: {
                                font: '12px ProximaNovaRegular, sans-serif',
                                color: grayColor,
                                template: '#= MetTel.Utils.truncateCurrency(value) #',
                                margin: {
                                    right: 10
                                }
                            },
                            majorGridLines: {
                                visible: false
                            },
                            min: 0,
                            line: {
                                width: 0
                            }
                        },
                        categoryAxis: {
                            labels: {
                                font: '12px ProximaNovaRegular, sans-serif',
                                color: grayColor
                            },
                            majorGridLines: {
                                visible: false
                            },
                            categories: months,
                            axisCrossingValue: months.length,
                            line: {
                                width: 0
                            }
                        }
                    };

                    $.each(featureFilters, function (i, filter) {

                        var feature = features[i];

                        if (filter.active()) {

                            // Check to see if the feature has data or subfeatures
                            if (feature.data) {

                                // Add it to the chart config
                                chartConfig.series.push({
                                    data: feature.data,
                                    stack: feature.label,
                                    name: feature.label,
                                    color: featureColors[i],
                                    tooltip: {
                                        visible: true,
                                        background: 'transparent',
                                        border: {
                                            width: 0
                                        },
                                        template: '<div class="mettel-bill-details-tooltip mettel-right"><div class="mettel-tooltip-bubble"><span class="mettel-bill-details-tooltip-feature">#= series.name #</span><span class="mettel-bill-details-tooltip-value">#= MetTel.Utils.formatCurrency(value) #</span></div></div>'
                                    }
                                });

                            } else if (feature.subFeatures) {

                                var subFeatures = feature.subFeatures;

                                $.each(subFeatures, function (j, subFeature) {

                                    var subfeatureColor;

                                    if (j % 2 === 0) {
                                        subfeatureColor = featureColors[i];
                                    } else {
                                        subfeatureColor = featureColorsSecondary[i];
                                    }

                                    // Add it to the chart config
                                    chartConfig.series.push({
                                        data: subFeature.data,
                                        field: 'value',
                                        stack: feature.label,
                                        name: subFeature.label,
                                        color: subfeatureColor,
                                        tooltip: {
                                            visible: true,
                                            background: 'transparent',
                                            border: {
                                                width: 0
                                            },
                                            template: '<div class="mettel-bill-details-tooltip mettel-right"><div class="mettel-tooltip-bubble"><span class="mettel-bill-details-tooltip-feature">#= series.name #</span><span class="mettel-bill-details-tooltip-value">#= MetTel.Utils.formatCurrency(value) # (#= numeral(dataItem.ratio).format("0%") #)</span></div></div>'
                                        }
                                    });

                                });

                            }
                        }

                    });

                    // If all features are unchecked
                    if (features && activeFeatureFilters.length === 0) {

                        // Add empty data so category axis doesn't break
                        chartConfig.series.push({
                            data: []
                        });

                        // Just show 0 on the axis
                        chartConfig.valueAxis.max = 1;
                        chartConfig.valueAxis.majorUnit = 2;

                    }

                    var initializeChart = function () {

                        // Initialize chart with config options
                        $element.kendoChart(chartConfig);

                        // Separate styling for current month label
                        $('text:contains("' + currentMonth + '")').attr('fill', '#333').css('font-family', 'ProximaNovaSemiBold');

                    };

                    initializeChart();

                    bindingContext.$parent.initializedChart(true);

                    // Instead of repeatedly rerendering the graph while the window is being resized,
                    // delay the rerendering till after resize is done
                    var rerenderGraph = _.debounce(function () {
                        initializeChart();
                    }, 500);
                    $(window).resize(rerenderGraph);
                }

            }

        }

    }
};

ko.bindingHandlers.currentMonthYear = {
    // Set text of element to display current month and year
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        if (valueAccessor()()) {

            var $element = $(element),
                months = valueAccessor()().months,
                currentMonth = _.last(months);

            $element.text(currentMonth);

        }
    }
};

function BillingModel() {
    var self = this;

    // Boolean indicating whether or not the page data has been loaded for first time
    this.initializedData = ko.observable(false);

    // Booleans indicating whether or not charts have been rendered for the first time - for chart animations
    this.initializedMainChart = ko.observable(false);
    this.initializedSecondaryChart = ko.observable(false);

    // Initial query params before filters are set
    this.initialQueryParams = ko.observable();

    // The region filter id
    this.activeRegionFilter = ko.observable();

    // Set the region filter
    this.setActiveRegionFilter = function (filter) {
        self.activeRegionFilter(filter);
    };

    // The list of region filters
    this.regionFilters = ko.observableArray();

    // Region filter pagination vars, functions, computeds
    this.regionCurrentPage = ko.observable(1);
    this.regionPageSize = ko.observable(10);

    this.regionPageCount = ko.computed(function() {
        return Math.ceil(self.regionFilters().length / self.regionPageSize());
    });

    this.regionLowerLimit = ko.computed(function() {
        return (((self.regionCurrentPage() - 1) * self.regionPageSize() + 1));
    });

    this.regionUpperLimit = ko.computed(function() {
        return (self.regionCurrentPage() * self.regionPageSize());
    });

    this.regionPagingResults = ko.computed(function() {
        return self.regionFilters().slice(self.regionLowerLimit() - 1, self.regionUpperLimit());
    });

    this.pageDown = function() {
        if (self.regionCurrentPage() !== 1) {
            self.regionCurrentPage(self.regionCurrentPage() - 1);
            self.setActiveRegionFilter(self.regionFilters()[self.regionLowerLimit() - 1].id);
        }
    };

    this.pageUp = function() {
        if (self.regionCurrentPage() !== self.regionPageCount()) {
            self.regionCurrentPage(self.regionCurrentPage() + 1);
            self.setActiveRegionFilter(self.regionFilters()[self.regionLowerLimit() - 1].id);
        }
    };

    // The current compare year id
    this.activeCompareYearFilter = ko.observable();

    // The list of compare years
    this.compareYearFilters = ko.observableArray();

    // This variable holds the category axis labels
    this.categoryAxis = ko.observable();

    // This holds the async'd value of the chart data since computed functions don't do async very well
    this.chartData = ko.observable();

    // The list of metrics
    this.metrics = ko.observableArray();

    // The data to build the cost per line graph
    this.costPerLine = ko.observable();

    // This is the variable that holds the chart specific data
    ko.computed(function () {

        if (this.activeRegionFilter() && this.activeCompareYearFilter()) {
            // If an active region filter and year filter are set...

            // Show loader
            self.ajaxResponded(false);

            // Add filter ids to query params
            self.addQueryParams({ year: self.activeCompareYearFilter() });
            self.addQueryParams({ region: self.activeRegionFilter() });

            // Set url with filter params
            var url = self.endPoints.getBillingChartData + self.queryString();

            console.log('Fetch for chart data: ' + url);
            // Then fetch the chart data with year and region params
            $.getJSON(url, function (data) {

                // Hide loader
                self.ajaxResponded(true);

                // Data initialized
                self.initializedData(true);

                self.chartData(data);
                if (data.metrics) {
                    self.metrics(data.metrics);
                }
                if (data.costPerLine) {
                    self.costPerLine(data.costPerLine);
                }
            });

        }

    }, this);

    // Get billing data for the first time
    this.init = function () {

        // Set url with initial query params
        var url = self.endPoints.getBillingChartData + self.queryString();

        console.log('Initial fetch for base chart data:' + url);
        // Go fetch the billing base chart data
        $.getJSON(url, function (data) {

            self.regionFilters(data.chart.filters.regions);
            self.compareYearFilters(data.chart.filters.years);

            // Create an all filter and put it first in line
            self.regionFilters.unshift({
                id: 'all',
                name: 'All'
            });

            // Default the region filter to all
            self.activeRegionFilter('all');

            // Set default of year filter
            if (data.chart.filters.years.length) {

                // Default the year filter to last year if there is historic data
                self.activeCompareYearFilter(data.chart.filters.years[0].id);

            } else {

                // Default for no historic data
                self.activeCompareYearFilter('noHistory');
            }

            // Setup the category axis data
            self.categoryAxis(data.chart.categoryAxis);
        });

    };

    this.refreshBaseData = function (newParams) {

        // clear current page when refreshing base data
        this.regionCurrentPage(1);

        // Show loader
        self.ajaxResponded(false);

        self.refreshQueryParams = ko.observable(self.initialQueryParams());
        self.refreshQueryString = ko.computed(function() {
            var queryString = '';
            if (self.refreshQueryParams()) {
                ko.utils.arrayForEach(_.keys(self.refreshQueryParams()), function (key) {
                    if (queryString) {
                        queryString += "&";
                    }

                    queryString += key + "=" + self.refreshQueryParams()[key];
                });
            }

            return queryString ? '?' + queryString : '';
        });

        self.cloneRefreshQueryParams = function() {
            return $.extend({}, self.refreshQueryParams() ? self.refreshQueryParams() : {});  //Cloning the params
        };

        self.addRefreshQueryParams = function(params) {
            var clonedParams = self.cloneRefreshQueryParams(),
                keys = _.keys(params);

            _.each(keys, function(key) {
                clonedParams[key] = params[key];
            });

            self.refreshQueryParams(clonedParams);
        };

        // If new query params are passed in
        if (newParams) {

            // Check to see if it's an array of objects or just an object in order to add new params
            if (newParams instanceof Array) {
                $.each(newParams, function (i, param) {
                    self.addRefreshQueryParams(param);
                });
            } else {
                self.addRefreshQueryParams(newParams);
            }

        }

        // Set url with new refresh query params
        var url = self.endPoints.getBillingChartData + self.refreshQueryString();

        console.log('Refreshing base chart data:' + url);
        // Go fetch the new billing base chart data
        $.getJSON(url, function (data) {

            // Hide loader
            self.ajaxResponded(true);

            if (data.chart.filters) {

                // Reset years filters if they exist
                if (data.chart.filters.years) {
                    self.compareYearFilters(data.chart.filters.years);
                }

                // Reset regions filters if they exist
                if (data.chart.filters.regions) {
                    self.regionFilters(data.chart.filters.regions);

                    // Create an all filter and put it first in line
                    self.regionFilters.unshift({
                        id: 'all',
                        name: 'All'
                    });
                }

            }

            // Setup the category axis data if it exists
            if (data.chart.categoryAxis) {
                self.categoryAxis(data.chart.categoryAxis);
            }

        }).done(function () {

            // After setting the new base data for the chart, if "All" is not the current
            // region filter, set it to "All", which will refresh the chart's main data also
            if (self.activeRegionFilter() !== 'all') {
                self.activeRegionFilter('all');
            }

        });

    };

}

ko.bindingHandlers.billing = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        MetTel.DashboardBaseModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.initialQueryParams(options.queryParams);

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'billing',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.billingChart = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            categoryAxis = valueAccessor().categoryAxis,
            chartData = valueAccessor().chartData,
            blueColor = '#C0DBE5',
            grayColor = '#999',
            greenColor = '#8ac008',
            orangeColor = '#f49441',
            initialized = bindingContext.$parent.initializedMainChart(),
            chartConfig = {};

        if (categoryAxis && chartData) {

            chartConfig = {
                legend: {
                    visible: false
                },
                chartArea: {
                    background: 'transparent',
                    margin: 0,
                    height: 350
                },
                transitions: !initialized,
                seriesDefaults: {
                    type: 'column',
                    spacing: 0,
                    gap: 2,
                    overlay: {
                        gradient: 'none'
                    },
                    border: {
                        width: 0
                    }
                },
                series: [
                    {
                        data: chartData.thisYear.data,
                        name: chartData.thisYear.label,
                        color: greenColor,
                        tooltip: {
                            visible: true,
                            background: 'transparent',
                            border: {
                                width: 0
                            },
                            template: '<div class="mettel-billing-tooltip mettel-right"><div class="mettel-tooltip-bubble">#= category # #= MetTel.Utils.formatCurrency(value) #</div></div>'
                        }
                    }
                ],
                valueAxes: [
                    {
                        labels: {
                            font: '12px ProximaNovaRegular, sans-serif',
                            color: greenColor,
                            template: '#= MetTel.Utils.truncateCurrency(value) #',
                            margin: {
                                right: 10
                            }
                        },
                        majorGridLines: {
                            visible: false
                        },
                        min: 0,
                        max: chartData.thisYear.axisMax,
                        line: {
                            width: 0
                        }
                    }
                ],
                categoryAxis: {
                    labels: {
                        font: '12px ProximaNovaRegular, sans-serif',
                        color: grayColor
                    },
                    majorGridLines: {
                        visible: false
                    },
                    categories: categoryAxis.months,
                    axisCrossingValues: [0],
                    line: {
                        width: 0
                    }
                }
            };

            // If there is data for the comparing year
            if (chartData.compareYear) {

                // Add it to the chart config
                chartConfig.series.push({
                    data: chartData.compareYear.data,
                    name: chartData.compareYear.label,
                    color: blueColor,
                    tooltip: {
                        visible: true,
                        background: 'transparent',
                        border: {
                            width: 0
                        },
                        template: '<div class="mettel-billing-tooltip mettel-right"><div class="mettel-tooltip-bubble">#= category # #= MetTel.Utils.formatCurrency(value) #</div></div>'
                    }
                });

            }

            // Check to see if a budget exists for this chart
            if (chartData.budget) {

                // Create the budget axis
                chartConfig.valueAxes.push({
                    labels: {
                        font: '12px ProximaNovaRegular, sans-serif',
                        color: orangeColor,
                        template: '#= MetTel.Utils.truncateCurrency(value) #',
                        margin: {
                            left: 10
                        }
                    },
                    majorGridLines: {
                        visible: false
                    },
                    name: chartData.budget.label,
                    min: 0,
                    max: chartData.budget.axisMax,
                    line: {
                        width: 0
                    }
                });

                // Push the budget axis to the right of the chart
                chartConfig.categoryAxis.axisCrossingValues.push(12);

                // Create budget series
                chartConfig.series.push({
                    type: 'line',
                    width: 1,
                    data: chartData.budget.data,
                    name: chartData.budget.label,
                    color: '#f49441',
                    axis: chartData.budget.label,
                    markers: {
                        size: 10,
                        background: orangeColor,
                        border: {
                            width: 0
                        }
                    },
                    tooltip: {
                        visible: true,
                        background: 'transparent',
                        border: {
                            width: 0
                        },
                        template: '<div class="mettel-billing-tooltip mettel-right line-tooltip"><div class="mettel-tooltip-bubble">#= category # #= MetTel.Utils.formatCurrency(value) #</div></div>'
                    }
                });

                if (chartData.projectedBudget) {
                    chartConfig.series.push({
                        type: 'line',
                        width: 1,
                        dashType: 'dash',
                        data: chartData.projectedBudget.data,
                        name: chartData.projectedBudget.label,
                        color: '#f49441',
                        axis: chartData.budget.label,
                        markers: {
                            visible: false
                        },
                        tooltip: {
                            visible: true,
                            background: 'transparent',
                            border: {
                                width: 0
                            },
                            template: '<div class="mettel-billing-tooltip mettel-right line-tooltip"><div class="mettel-tooltip-bubble">#= category # #= MetTel.Utils.formatCurrency(value) #</div></div>'
                        }
                    });
                }

            }

            // Initialize chart with config options
            $element.kendoChart(chartConfig);

            bindingContext.$parent.initializedMainChart(true);

            // Instead of repeatedly rerendering the graph while the window is being resized,
            // delay the rerendering till after resize is done
            var rerenderGraph = _.debounce(function () {
                $element.kendoChart(chartConfig);
            }, 500);
            $(window).resize(rerenderGraph);
        }

    }
};

ko.bindingHandlers.costPerLineChart = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            categoryAxis = valueAccessor().categoryAxis,
            chartData = valueAccessor().chartData,
            blueColor = '#C0DBE5',
            blueColorSecondary = '#2CB0ED',
            grayColor = '#999',
            initialized = bindingContext.$parent.initializedSecondaryChart(),
            chartConfig = {};

        if (categoryAxis && chartData) {

            chartConfig = {
                legend: {
                    visible: false
                },
                chartArea: {
                    background: 'transparent',
                    margin: 0,
                    height: 100
                },
                transitions: !initialized,
                seriesDefaults: {
                    type: 'line'
                },
                series: [
                    {
                        name: chartData.label,
                        data: chartData.data,
                        color: blueColor,
                        markers: {
                            size: 10,
                            background: blueColorSecondary,
                            border: {
                                width: 0
                            }
                        },
                        width: 1
                    }
                ],
                valueAxis: [
                    {
                        labels: {
                            font: '12px ProximaNovaRegular, sans-serif',
                            color: grayColor,
                            template: '#= MetTel.Utils.truncateCurrency(value) #',
                            margin: {
                                right: 10
                            }
                        },
                        majorGridLines: {
                            visible: false
                        },
                        min: 0,
                        max: chartData.axisMax,
                        majorUnit: chartData.axisUnits,
                        line: {
                            visible: false
                        }
                    }
                ],
                tooltip: {
                    visible: true,
                    background: 'transparent',
                    border: {
                        width: 0
                    },
                    template: '<div class="mettel-billing-tooltip mettel-right line-tooltip"><div class="mettel-tooltip-bubble">#= category # #= MetTel.Utils.formatCurrency(value) #</div></div>'
                },
                categoryAxis: {
                    labels: {
                        font: '12px ProximaNovaRegular, sans-serif',
                        color: grayColor
                    },
                    majorGridLines: {
                        visible: false
                    },
                    categories: categoryAxis.months,
                    line: {
                        visible: false
                    }
                }
            };

            // Initialize chart
            $element.kendoChart(chartConfig);

            bindingContext.$parent.initializedSecondaryChart(true);

            // Instead of repeatedly rerendering the graph while the window is being resized,
            // delay the rerendering till after resize is done
            var rerenderGraph = _.debounce(function () {
                $element.kendoChart(chartConfig);
            }, 500);
            $(window).resize(rerenderGraph);

        }

    }
};

ko.bindingHandlers.registerTooltip = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $elementContainer = $element.parent('[data-mettel-class="region-filter-label-text-container"]');

        if ($element.outerWidth() > $elementContainer.outerWidth()) {

            // Not adding styling to truncate text till now, so we can properly calculate widths in IE
            $elementContainer.addClass('mettel-truncate-text');
            viewModel.labelOverflow = ko.observable(true);

            var $trigger = $element.closest('[data-mettel-class="tooltip-trigger"]'),
                $tooltip = $trigger.find('[data-mettel-class="billing-region-tooltip"]');

            $trigger.on({
                'mouseenter': function () {
                    $tooltip.addClass('mettel-state-active');
                },
                'mouseleave': function () {
                    $tooltip.removeClass('mettel-state-active');
                }
            });
        }
    }
};

ko.bindingHandlers.disableFilter = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        if (!viewModel.compareYearFilters().length) {
            $element.addClass('mettel-state-disabled');
        } else {
            $element.removeClass('mettel-state-disabled');
        }
    }
};

ko.bindingHandlers.billingMetricTooltip = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $tooltip = $element.find('[data-mettel-class="billing-metric-tooltip"]');

        $element.on({
            'mouseenter': function () {
                $tooltip.addClass('mettel-state-active');
            },
            'mouseleave': function () {
                $tooltip.removeClass('mettel-state-active');
            }
        });
    }
};

/*global CallCenterRepModel*/

function CallCenterRepModel(options) {

    var self = this;
    self.options = options ? options : {};

    self.clientId = ko.observable();
    self.generalPhone = ko.observable("866-625-2228");
    self.name = ko.observable("");
    self.liveChatCallback = ko.observable(false);
    self.liveChat = ko.observable(false);

    if (self.options.config.liveChatCallback && typeof self.options.config.liveChatCallback === 'function') {
        self.liveChatCallback(options.config.liveChatCallback);
    }

    self.formattedName = ko.computed(function(){
        if(self.name() === "") {
            return "";
        } else {
            return "Hi, I'm " + self.name() + ". ";
        }
    });

    self.liveChatAvailable = ko.computed(function() {
        return self.liveChat() === true && typeof ko.unwrap(self.liveChatCallback) === 'function';
    });

    self.CallCenterRepIsLoaded = ko.observable(false);

    self.fireLiveChatCallback = function() {
        self.liveChatCallback()(self);
    };

    self.setValues = function(data) {

        var capitalizeFirstLetter = function(str) {
            str = str.toLowerCase();
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        var formatName = function(str){
            var name = str.split(" ");
            for(var i = 0; i < name.length; i++) {
                name[i] = capitalizeFirstLetter(name[i]);
            }
            return name.join(" ");
        };

        var formatPhone = function(str) {
            var phone = str.replace(/\D/g,'');
                phone = phone.slice(0, 3) + "-" + phone.slice(3, 6) + "-" + phone.slice(6);
            return phone;
        };

        if (data.careData) {
            if(data.careData.name && data.careData.name !== "") {
                self.name(formatName(data.careData.name));
            }
            if(data.careData.generalPhone && data.careData.name !== "") {
                self.generalPhone(formatPhone(data.careData.generalPhone));
            }
            self.liveChat(data.careData.liveChat);
        }
    };

    self.init = function() {
        $.ajax({
            url: self.options.endPoints.getCareData,
            contentType: "application/json",
            dataType: "json",
            data: {
                clientId: self.clientId()
            },
            success: function(data) {
                self.setValues(data);

                self.CallCenterRepIsLoaded(true);

                if ($('[data-mettel-class="mettel-footer"]').length) {
                    var $footer = $('[data-mettel-class="mettel-footer"]')[0];
                    ko.applyBindings(self, $footer);
                }
            }
        });
    };

    self.init();
}

function CallPerformanceModel() {
    var self = this;

    // Boolean indicating whether or not the page data has been loaded for first time
    this.initialized = ko.observable(false);

    // Array of categories with respective data for each category
    this.categories = ko.observableArray();

    // List of filters
    this.pastFilters = ko.observableArray([
        {
            "id": 1,
            "label": "Past Month"
        },
        {
            "id": 3,
            "label": "Past 3 Months"
        },
        {
            "id": 6,
            "label": "Past 6 Months"
        },
        {
            "id": 12,
            "label": "Past Year"
        }
    ]);

    // Active filter defaulted to 1 month
    this.activePastFilter = ko.observable(1);

    // Get call performance data for the first time
    this.init = function () {

        // Show loader
        self.ajaxResponded(false);

        // Add filter id to query params
        self.addQueryParams({ past: self.activePastFilter() });

        // Set url with filter params
        var url = self.endPoints.getCallPerformanceData + self.queryString();

        // Go fetch the call performance data
        $.getJSON(url, function (data) {

            // Hide loader
            self.ajaxResponded(true);

            // Data initialized
            self.initialized(true);

            self.categories(data.categories);

        });

    };

    // Anytime a different filter is selected, run the initial data call with the new filter params
    self.activePastFilter.subscribe(function () {
        self.init();
    });

}

ko.bindingHandlers.callPerformance = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        MetTel.DashboardBaseModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'call-performance',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.categoryCandlestick = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),

            // Data
            category = valueAccessor(),
            rangeMin = category.rangeMin,
            boxMin = category.boxMin,
            mean = category.mean,
            boxMax = category.boxMax,
            rangeMax = category.rangeMax,

            // Measurement from left in percent
            rangeMinPosition = rangeMin / 31 * 100,
            boxMinPosition = boxMin / 31 * 100,
            meanPosition = mean / 31 * 100,
            boxMaxPosition = boxMax / 31 * 100,
            rangeMaxPosition = rangeMax / 31 * 100,

            // Elements to be shaped to visually form the candlestick
            candlestickRange = $element.find('[data-mettel-class="category-range"]'),
            candlestickBox = $element.find('[data-mettel-class="category-box"]'),
            candlestickMean = $element.find('[data-mettel-class="category-mean"]'),

            // Elements to create hover-able areas for tooltips
            $rangeMinTooltipTarget = $element.find('[data-mettel-class="category-range-min-tooltip-target"]'),
            $boxMinTooltipTarget = $element.find('[data-mettel-class="category-box-min-tooltip-target"]'),
            $meanTooltipTarget = $element.find('[data-mettel-class="category-mean-tooltip-target"]'),
            $boxMaxTooltipTarget = $element.find('[data-mettel-class="category-box-max-tooltip-target"]'),
            $rangeMaxTooltipTarget = $element.find('[data-mettel-class="category-range-max-tooltip-target"]'),

            // Tooltips
            $rangeMinTooltip = $rangeMinTooltipTarget.siblings('[data-mettel-class="category-range-min-tooltip"]'),
            $boxMinTooltip = $boxMinTooltipTarget.siblings('[data-mettel-class="category-box-min-tooltip"]'),
            $meanTooltip = $meanTooltipTarget.siblings('[data-mettel-class="category-mean-tooltip"]'),
            $boxMaxTooltip = $boxMaxTooltipTarget.siblings('[data-mettel-class="category-box-max-tooltip"]'),
            $rangeMaxTooltip = $rangeMaxTooltipTarget.siblings('[data-mettel-class="category-range-max-tooltip"]');

        // Make sure none of the measurements overflow the graph area past the right edge
        if (rangeMinPosition > 100) {
            rangeMinPosition = 100;
        }
        if (boxMinPosition > 100) {
            boxMinPosition = 100;
        }
        if (meanPosition > 100) {
            meanPosition = 100;
        }
        if (boxMaxPosition > 100) {
            boxMaxPosition = 100;
        }
        if (rangeMaxPosition > 100) {
            rangeMaxPosition = 100;
        }

        // Form the candlestick
        candlestickRange.css({'left': rangeMinPosition + '%', 'right': 100 - rangeMaxPosition + '%'});
        candlestickBox.css({'left': boxMinPosition + '%', 'right': 100 - boxMaxPosition + '%'});
        candlestickMean.css('left', meanPosition + '%');

        // Measurements for ends of tooltip targets
        var betweenRangeMinBoxMin = (rangeMinPosition + boxMinPosition) / 2,
            betweenBoxMinMean = (boxMinPosition + meanPosition) / 2,
            betweenMeanBoxMax = (meanPosition + boxMaxPosition) / 2,
            betweenBoxMaxRangeMax = (boxMaxPosition + rangeMaxPosition) / 2;

        // Form the tooltip targets
        $rangeMinTooltipTarget.css({'left': rangeMinPosition + '%', 'right': 100 - betweenRangeMinBoxMin + '%'});
        $boxMinTooltipTarget.css({'left': betweenRangeMinBoxMin + '%', 'right': 100 - betweenBoxMinMean + '%'});
        $meanTooltipTarget.css({'left': betweenBoxMinMean + '%', 'right': 100 - betweenMeanBoxMax + '%'});
        $boxMaxTooltipTarget.css({'left': betweenMeanBoxMax + '%', 'right': 100 - betweenBoxMaxRangeMax + '%'});
        $rangeMaxTooltipTarget.css({'left': betweenBoxMaxRangeMax + '%', 'right': 100 - rangeMaxPosition + '%'});

        // Position the tooltips
        $rangeMinTooltip.css('left', rangeMinPosition + '%');
        $boxMinTooltip.css('left', boxMinPosition + '%');
        $meanTooltip.css('left', meanPosition + '%');
        $boxMaxTooltip.css('left', boxMaxPosition + '%');
        $rangeMaxTooltip.css('left', rangeMaxPosition + '%');

        // Set up events to show/hide tooltips
        $rangeMinTooltipTarget.on({
            'mouseenter': function () {
                var tooltipWidth = $rangeMinTooltip.outerWidth();
                $rangeMinTooltip.css('margin-left', -(tooltipWidth / 2) + 'px');
                $rangeMinTooltip.show();
            },
            'mouseleave': function () {
                $rangeMinTooltip.hide();
            }
        });

        $boxMinTooltipTarget.on({
            'mouseenter': function () {
                var tooltipWidth = $boxMinTooltip.outerWidth();
                $boxMinTooltip.css('margin-left', -(tooltipWidth / 2) + 'px');
                $boxMinTooltip.show();
            },
            'mouseleave': function () {
                $boxMinTooltip.hide();
            }
        });

        $meanTooltipTarget.on({
            'mouseenter': function () {
                var tooltipWidth = $meanTooltip.outerWidth();
                $meanTooltip.css('margin-left', -(tooltipWidth / 2) + 'px');
                $meanTooltip.show();
            },
            'mouseleave': function () {
                $meanTooltip.hide();
            }
        });

        $boxMaxTooltipTarget.on({
            'mouseenter': function () {
                var tooltipWidth = $boxMaxTooltip.outerWidth();
                $boxMaxTooltip.css('margin-left', -(tooltipWidth / 2) + 'px');
                $boxMaxTooltip.show();
            },
            'mouseleave': function () {
                $boxMaxTooltip.hide();
            }
        });

        $rangeMaxTooltipTarget.on({
            'mouseenter': function () {
                var tooltipWidth = $rangeMaxTooltip.outerWidth();
                $rangeMaxTooltip.css('margin-left', -(tooltipWidth / 2) + 'px');
                $rangeMaxTooltip.show();
            },
            'mouseleave': function () {
                $rangeMaxTooltip.hide();
            }
        });

    }
};


ko.bindingHandlers.checkbox = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();

        accessor.enable = allBindingsAccessor().enable || allBindingsAccessor().enable === false ? allBindingsAccessor().enable : true;

        accessor.value = allBindingsAccessor().value;
        accessor.htmlId = $(element).attr('id');
        accessor.htmlClass = $(element).attr('class');

        ko.renderTemplate("checkbox-template", accessor, {
            afterRender: function (nodes) {
                // add focus state to labels
                var divs = _.each(nodes, function(node, index) {
                    if (index === 1) {
                        var $node = $(node),
                            label = $node.find('.mettel-checkbox-label'),
                            input = $node.find('.mettel-checkbox'),
                            $input = $(input);

                        $input.on('focus', function() {
                            $(label).addClass('mettel-checkbox-label-focused');
                        });

                        $input.on('blur', function() {
                            $(label).removeClass('mettel-checkbox-label-focused');
                        });
                    }
                });
            }
        }, element, 'replaceNode');
    }
};
/*
 * MetTel Tiered Combo Box Component
 *
 */

function ComboBoxTieredModel(options) {
    options = options ? options : {};

    var self = this;

    self.endPoints = options.endPoints;

    self.list = ko.observableArray();
    self.active = ko.observable(true);
    self.selectedItem = ko.observable({text: "N/A"});
    self.customAction = ko.observable(false);

    self.toggleActive = function() {
        self.active(!self.active());
    };

    self.selectItem = function(currentItem) {
        if(currentItem.count > 0 || currentItem.customAction === true) {
            self.selectedItem(currentItem);
            self.active(false);
        }
    };

    // getting json data for the first time
    self.init = function() {

        $.ajax({
            url: self.endPoints.getData,
            contentType: "application/json",
            dataType: "json",
            data: {

            },
            success: function(data) {
                self.list(data.items);
                self.selectedItem(data.items[0]);
            }
        });
    };
}

ko.bindingHandlers.addItemIcon = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // if the option has an icon
        if (viewModel.icon !== undefined) {
            var $element = $(element);

            // add the icon's class
            $element.addClass(viewModel.icon);
        }
    }
};

ko.bindingHandlers.tieredComboBox = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'combo-box-tiered-list', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};
/**
 * Text formatting
 */

ko.bindingHandlers.textSplitCamelCase = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var text = ko.utils.unwrapObservable(valueAccessor()),
            formattedText = text.replace(/([A-Z])/g, ' $1');

        $(element).text(formattedText);
    }
};

/**
 * Number formatting
 */

ko.bindingHandlers.percentFormat = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var rawValue = valueAccessor(),
            formattedValue = numeral(rawValue).format('0,0%');

        $(element).text(formattedValue);
    }
};

ko.bindingHandlers.bytesToSize = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var bytes = valueAccessor(),
            sizes = [' byte(s)', ' KB', ' MB', ' GB', ' TB'],
            i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);

        if (bytes === 0) {
            $(element).text('0 KB');
        } else {
            $(element).text(Math.round(bytes / Math.pow(1024, i), 2) + sizes[i]);
        }
    }
};

/**
 * Currency formatting
 */

ko.bindingHandlers.currencyFormat = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var rawValue = valueAccessor(),
            formattedValue = numeral(rawValue).format('$0,0.00');

        $(element).text(formattedValue);
    }
};

ko.bindingHandlers.currencyWithoutSymbol = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var rawValue = valueAccessor(),
            formattedValue = numeral(rawValue).format('0,0.00');

        $(element).text(formattedValue);
    }
};

/**
 * Time/date formatting
 */

ko.bindingHandlers.prettyDate = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("MMM D, YYYY"));
        }
    }
};

ko.bindingHandlers.dateMonthDay = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("MMMM D"));
        }
    }
};

ko.bindingHandlers.datetimeAttrDate = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).attr('datetime', date.format("YYYY-MM-DD"));
        }
    }
};

ko.bindingHandlers.currentYear = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(new Date());

        if (date) {
            $(element)
                .attr('datetime', date.format("YYYY"))
                .text(date.format("YYYY"));
        }
    }
};

ko.bindingHandlers.textDaysFromNow = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var days = valueAccessor().days,
            breakPoint = valueAccessor().breakPoint,
            formattedText;

        switch (true) {
            case days === 0:
                formattedText = 'today';
                break;
            case days === 1:
                formattedText = 'tomorrow';
                break;
            case days <= breakPoint:
                formattedText = days + ' days from now';
                break;
            default:
                formattedText = 'more than ' + breakPoint + ' days from now';
        }

        formattedText = '(' + formattedText + ')';

        $(element).text(formattedText);
    }
};

ko.bindingHandlers.durationDHrMin = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var start = valueAccessor().start,
            end = valueAccessor().end,
            dur = moment.duration(moment(end).diff(start)),
            durText;

        if (dur) {

            if (dur.days() > 0) {
                durText = dur.days() + 'd ' + dur.hours() + 'hr';
            } else {
                durText = dur.hours() + 'hr ' + dur.minutes() + 'min';
            }

            $(element)
                .attr('datetime', 'P' + dur.days() + 'DT' + dur.hours() + 'H' + dur.minutes() + 'M')
                .text(durText);
        }
    }
};

/**
 * Inputs
 */

ko.bindingHandlers.trimOnBlur = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            value = valueAccessor();

        $element.blur(function () {
            if (value()) {
                value(value().trim());
            }
        });
    }
};

ko.bindingHandlers.numbersOnlyInput = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $input = $(element);

        $input.keydown(function (e) {
            // Allow: backspace, delete, tab, escape, enter and .
            if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
                // Allow: Ctrl+A
                (e.keyCode === 65 && e.ctrlKey === true) ||
                // Allow: home, end, left, right, down, up
                (e.keyCode >= 35 && e.keyCode <= 40)) {
                // let it happen, don't do anything
                return;
            }
            // Ensure that it is a number and stop the keypress
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        });
    }
};

// for a number input, enforce the max limit on blur if user has typed a value that exceeds it
ko.bindingHandlers.maxValueInput = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $input = $(element),
            valueObs = allBindingsAccessor().value,
            numMax = parseInt($input.attr('max'), 10);

        if (!Number.isNaN(numMax)) {
            $input.on('blur', function() {
                if (!Number.isNaN(valueObs())) {
                    if (valueObs() > numMax) {
                        valueObs(numMax);
                    }
                }
            });
        }
    }
};

ko.bindingHandlers.wholeNumbersOnlyInput = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $input = $(element),
            valueObs = allBindingsAccessor().value;

        $input.keydown(function (e) {
            // Allow: backspace, delete, tab, escape, and enter
            if ($.inArray(e.keyCode, [46, 8, 9, 27, 13]) !== -1 ||
                // Allow: Ctrl+A
                (e.keyCode === 65 && e.ctrlKey === true) ||
                // Allow: home, end, left, right, down, up
                (e.keyCode >= 35 && e.keyCode <= 40)) {
                // let it happen, don't do anything
                return;
            }
            // Ensure that it is a number
            if (((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) ||
                // and not 0
                (!$(e.currentTarget).val() && e.keyCode === 48) ||
                // and no period for decimals
                (e.keyCode === 190 || e.keyCode === 110)
                ){
                // stop the keypress
                e.preventDefault();
            }
        });

        // If a value observable is present
        if (typeof valueObs === "function") {
            // On blur, if the value is empty or 0, default it to 1
            $input.blur(function(e) {
                if (!valueObs() || Number(valueObs()) === 0) {
                    valueObs(1);
                }
            });
        }
    }
};

/*
 The available options for this binding are:

 onLoaded - The main callback for when the file has been loaded, returns file object and file data
 onProgress - The progress callback which is fired at intervals while loading, returns file object, amountLoaded and totalAmount
 onError - The callback for when things didnt go how you expected...
 fileFilter - The regex pattern to match the mime types against, e.g (image., application.|text.*), if a file does not meet the filter it will raise an error
 maxFileSize - The maximum file size for loaded files in bytes, if a file exceeds the file size it will raise an error
 readAs - to indicate how you want to read the file, options are (text, image, binary, array), the default behaviour is image
 allowDrop - to indicate you want to enable drag and drop functionality for files on this element
 hoverClass - the class to apply when you are hovering a file over the drag and drop compatible dropzone

 The only required argument is the loaded callback, which can be defined as a root argument

 Source: https://github.com/grofit/knockout.files
 */

ko.bindingHandlers.files = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {

        var allBindings = allBindingsAccessor();
        var loadedCallback, progressCallback, errorCallback, hoverClass, allowDrop, fileFilter, readAs, maxFileSize;
        var filesBinding = allBindings.files;

        if (typeof(ko.unwrap(filesBinding)) === "function") {
            loadedCallback = ko.unwrap(filesBinding);
        }
        else {
            loadedCallback = ko.unwrap(filesBinding.onLoaded);
            progressCallback = ko.unwrap(filesBinding.onProgress);
            errorCallback = ko.unwrap(filesBinding.onError);
            allowDrop = ko.unwrap(filesBinding.allowDrop);
            hoverClass = ko.unwrap(filesBinding.hoverClass);
            fileFilter = ko.unwrap(filesBinding.fileFilter);
            maxFileSize = ko.unwrap(filesBinding.maxFileSize);
            readAs = ko.unwrap(filesBinding.readAs);
        }

        if (typeof(loadedCallback) !== "function") {
            return;
        }

        var readFile = function (file) {

            var reader = new FileReader();
            reader.onload = function (fileLoadedEvent) {
                loadedCallback(file, fileLoadedEvent.target.result, element);
            };

            if (typeof(progressCallback) === "function") {
                reader.onprogress = function (fileProgressEvent) {
                    progressCallback(file, fileProgressEvent.loaded, fileProgressEvent.total);
                };
            }

            if (typeof(errorCallback) === "function") {
                reader.onerror = function (fileErrorEvent) {
                    errorCallback(file, fileErrorEvent.target.error);
                };
            }

            if (readAs === "text") {
                reader.readAsText(file);
            }
            else if (readAs === "array") {
                reader.readAsArrayBuffer(file);
            }
            else if (readAs === "binary") {
                reader.readAsBinaryString(file);
            }
            else {
                reader.readAsDataURL(file);
            }
        };

        var handleFileDrag = function (fileDragEvent) {
            fileDragEvent.stopPropagation();
            fileDragEvent.preventDefault();

            if (fileDragEvent.type === "dragover") {
                fileDragEvent.target.classList.add(hoverClass);
            }
            else {
                fileDragEvent.target.classList.remove(hoverClass);
            }
        };

        var handleDrop = function (fileDropEvent) {
            handleFileDrag(fileDropEvent);
            handleFileSelected(fileDropEvent);
        };

        var handleFileSelected = function (fileSelectionEvent) {
            var files = fileSelectionEvent.target.files || fileSelectionEvent.dataTransfer.files;
            for (var i = 0, f; f = files[i]; i++) {
                if (typeof(fileFilter) !== "undefined" && !f.type.match(fileFilter)) {
                    if (typeof(errorCallback) === "function") {
                        errorCallback(f, "File type does not match filter");
                    }
                    continue;
                }

                if (typeof(maxFileSize) !== "undefined" && f.size >= maxFileSize) {
                    if (typeof(errorCallback) === "function") {
                        errorCallback(f, "File exceeds file size limit");
                    }
                    continue;
                }

                readFile(f);
            }
        };

        element.addEventListener('change', handleFileSelected, false);

        if (allowDrop) {
            element.addEventListener('dragover', handleFileDrag, false);
            element.addEventListener('dragleave', handleFileDrag, false);
            element.addEventListener('drop', handleDrop, false);
        }
    }
};

// adds "id" attribute to the element and matching "for" attribute to label if found
// optional values: id and suffix
// if no id is passed, it will generate a (probably) unique one
// * this binding should go first for elements where the original element is re-rendered (e.g. mettel-combo-box)
ko.bindingHandlers.formElementUniqueId = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $label,
            value = valueAccessor(),
            id = value.id,
            suffix = value.suffix,
            newId;

        // check before (or after) the input for the label
        $label = $element.prev('label');
        if (!$label.length) {
            $label = $element.next('label');
        }

        // if optional id is not included or 0 value, create a random one
        if (!id) {
            id = MetTel.Utils.randomId(5);
        }

        newId = id + suffix;

        $element.attr('id', newId);

        if ($label.length) {
            $label.attr('for', newId);
        }
    }
};

/**
 * UI Modification
 */

ko.bindingHandlers.accordionController = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        viewModel.accordionExpanded = ko.observable(false);
    }
};

ko.bindingHandlers.uniform = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        // Obtain the uniform binding.
        var uniform = allBindingsAccessor().uniform;

        // Initialize the uniform component.
        $(element).uniform(uniform.options);
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var valueObject = allBindingsAccessor().value;
        if (valueAccessor().property) {
            var value = valueAccessor().property();
        }
        if (valueObject) {
            ko.unwrap(valueObject);
        }
        $.uniform.update(element);
    }
};

ko.bindingHandlers.tabContainer = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $tabContainer = $(element);

        $tabContainer.mettelTabContainer();
    }
};

ko.bindingHandlers.tooltipTrigger = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $tooltipTrigger = $(element),
            options = valueAccessor();

        $tooltipTrigger.mettelTooltip(options);
    }
};

ko.bindingHandlers.scrollingSelector = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $multiSelect = $(element),
            options = valueAccessor();

        $multiSelect.mettelScrollingSelector(options);
    }
};

ko.bindingHandlers.labelFocus = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $label = $(element),
            $input = $label.find('input'),
            focusedClass = 'mettel-state-focused';

        $input.on('focus', function() {
            $label.addClass(focusedClass);
        });

        $input.on('blur', function() {
            $label.removeClass(focusedClass);
        });
    }
};

ko.bindingHandlers.flyoutTrigger = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $flyoutTrigger = $(element),
            options = valueAccessor();

        $flyoutTrigger.mettelFlyout(options);
    }
};

ko.bindingHandlers.stopClickBubblingConditionally = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            condition = valueAccessor();

        if (condition) {
            $element.click(function (e) {
                e.stopPropagation();
            });
        }
    }
};

ko.bindingHandlers.keyboardClick = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.keydown(function(e) {
            // for enter or space
            if (e.keyCode === 13 || e.keyCode === 32) {
                $element.click();
            }
        });
    }
};

ko.bindingHandlers.errorModal = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $modal = $(element),
            page = viewModel,
        // On modal close, reset errors
            modalOptions = {
                close: function () {
                    page.errorTitle(null);
                    page.errorMessage(null);
                }
            };

        // Where error is set, this will trigger the modal opening
        if (page.errorTitle()) {
            $modal.modalWindow(modalOptions);
        }
    }
};

ko.bindingHandlers.titleTooltip = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var maxLen = 20,
            text = ko.unwrap(valueAccessor());

        var direction = $(element).data("tooltip-direction") ? $(element).data("tooltip-direction") : 'right';

        if (text.length > maxLen) {
            text = text.substr(0, maxLen - 3) + "&hellip;";
            $(element).html(text);
            setTimeout(function () {
                $(element).mettelTooltip({
                    position: direction,
                    hoverDelay: 100
                });
            }, 1);
        } else {
            $(element).text(text);
        }

    }
};

ko.bindingHandlers.dashboardTooltip = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $tooltipTrigger = $(element),
            text = $.trim($(element).text()),
            pos = "top";
        setTimeout(function () {
            $tooltipTrigger.mettelTooltip({
                position: pos,
                hoverDelay: 100
            });
        }, 1);
    }
};

// Hover menu (currently only used for grid) mouse and keyboard event handling
ko.bindingHandlers.hoverMenu = {
    init: function (element, valueAccessor) {

        var $element = $(element);
        var menuAreaSelector = valueAccessor();
        var $menu = $element.find(menuAreaSelector);
        var $toggle = $element.find('[data-mettel-class="hover-menu-toggle"]');
        var menuShowing = false;
        var activeClass = 'mettel-state-active';

        var $focusableElements,
            $firstFocusableEl,
            $lastFocusableEl,
            hasFocusElements;

        // wait for foreach's to finish rendering focusable elements
        setTimeout(function () {
            $focusableElements = $menu.find(MetTel.Variables.focusableSelectors);
            $firstFocusableEl = $focusableElements.first();
            $lastFocusableEl = $focusableElements.last();
            hasFocusElements = $focusableElements.length ? true : false;

            // keyboard events for focusable elements in menu

            if (hasFocusElements) {

                $firstFocusableEl.keydown(function (e) {
                    // if back tabbing from first, hide menu
                    if (e.keyCode === 9 && e.shiftKey) {
                        hideMenu();
                    }
                });

                $lastFocusableEl.keydown(function (e) {
                    // if forward tabbing from last, hide menu
                    if (e.keyCode === 9 && !e.shiftKey) {
                        hideMenu();
                    }
                });
            }
        }, 5);

        var showMenu = function () {
            $menu.show();
            autoMoveUp($element);
            $element.addClass(activeClass);
            menuShowing = true;
        };

        var hideMenu = function () {
            $menu.hide();
            $element.removeClass(activeClass);
            menuShowing = false;
        };

        var toggleMenu = function () {
            if (menuShowing) {
                hideMenu();
            } else {
                showMenu();
            }
        };

        var autoMoveUp = function (element) {
            var windowHeight = $(window).height();
            var top = $(element).find('[data-mettel-class="hover-menu-toggle"]').offset().top;
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

        // mouse events

        $element.on('mouseover', function (e) {
            e.stopPropagation();
            showMenu();
        });

        $element.on('mouseout', function (e) {
            e.stopPropagation();
            hideMenu();
        });

        // keyboard events

        $toggle.keydown(function (e) {
            e.stopPropagation();

            if (e.keyCode === 13 || e.keyCode === 32) {
                // for enter or space, toggle flyout
                toggleMenu();
            } else if (e.keyCode === 9 && e.shiftKey && menuShowing) {
                // for back tabbing, hide menu
                hideMenu();
            }
        });
    }
};


/* global TicketModel */

function CustomerCareTicketsGridModel(vmCustomerCare, data) {
    // Extend the grid model
    GridModel.call(this, data);

    // pass the clientId through so it can be sent to getTicketTimelineData
    this.completeEvent = function () {
        if (vmCustomerCare.expandedTicketsViewCompany() !== null) {
            _.each(this.rows(), function (row) {
                row.data().ClientId = vmCustomerCare.expandedTicketsViewCompany().id;
            });
        }
    };

    // Called when expanding a row to setup ticket model
    this.handleTimeline = function (vmRow, $placeholder) {

        // Build ticket model, but only once for the row and store it
        if (!vmRow.vmTicket) {
            vmRow.vmTicket = new TicketModel();
            vmRow.vmTicket.lineLinkCallback = vmCustomerCare.lineLinkCallback;
            vmRow.vmTicket.receiveTicket(vmRow.storedExpandableRowData());
            vmRow.vmTicket.contentLoading(false);
        }

        // Bind it to the expanded row
        ko.applyBindingsToNode($placeholder[0], {
            template: {
                name: 'ticket-timeline-template',
                data: vmRow.vmTicket
            }
        });
    };
}

function CustomerCareCompanyModel(companyData, vmCustomerCare) {
    var vmCompany = this;

    $.extend(vmCompany, companyData);

    vmCompany.parent = vmCustomerCare;

    // Data

    vmCompany.onTrackTicketsMoreThanTwoWeeks = 0;
    vmCompany.onTrackTickets = [];
    vmCompany.onTrackTicketTypesTickets = [];
    vmCompany.onTrackMax = undefined;

    vmCompany.watchTicketsMoreThanTwoWeeks = 0;
    vmCompany.watchTickets = [];
    vmCompany.watchTicketTypesTickets = [];
    vmCompany.watchMax = undefined;

    vmCompany.warnTickets = [];

    vmCompany.resolvedTickets = [];

    vmCompany.maxTicketsLastTwoWeeks = undefined;
    vmCompany.maxTickets = undefined;

    vmCompany.init = function () {

        // For both On Track and Watch line graphs
        // build each object representing a day
        // and store them in their arrays
        var a;
        for (a = 0; a < 15; a++) {
            var onTrackDay = {};
            onTrackDay.daysAway = -1 * (a - 14);
            onTrackDay.tickets = 0;
            vmCompany.onTrackTickets.push(onTrackDay);
        }
        for (a = 0; a < 15; a++) {
            var watchDay = {};
            watchDay.daysAway = -1 * (a - 14);
            watchDay.tickets = 0;
            vmCompany.watchTickets.push(watchDay);
        }

        var ticketTypesLength = vmCompany.ticketTypes.length;

        var onTrackMaxes = [],
            watchMaxes = [];

        // Consolidate all company data
        $.each(vmCompany.ticketTypes, function (j, ticketType) {

            // On Track

            // Collect the max from each type
            onTrackMaxes.push(Math.max.apply(null, ticketType.onTrackTickets));

            $.each(ticketType.onTrackTickets, function (k, day) {
                if (k === 0) {
                    // Add this ticketType's >14d tickets to the total count for the company
                    vmCompany.onTrackTicketsMoreThanTwoWeeks += day;
                } else {
                    // For each day (except the first index which represents >14d), add this ticketType's to the count for that day
                    vmCompany.onTrackTickets[k - 1].tickets += day;
                }

                // Object formation for bubble charts
                if (day > 0) {
                    vmCompany.onTrackTicketTypesTickets.push({
                        ticketType: ticketType.name,
                        daysAway: k - 15,
                        y: ticketTypesLength - j,
                        tickets: day
                    });
                }
            });

            // Watch

            // Collect the max from each type
            watchMaxes.push(Math.max.apply(null, ticketType.watchTickets));

            $.each(ticketType.watchTickets, function (k, day) {
                if (k === 0) {
                    // Add this ticketType's >14d tickets to the total count for the company
                    vmCompany.watchTicketsMoreThanTwoWeeks += day;
                } else {
                    // For each day (except the first index which represents >14d), add this ticketType's to the count for that day
                    vmCompany.watchTickets[k - 1].tickets += day;
                }

                // Object formation for bubble charts
                if (day > 0) {
                    vmCompany.watchTicketTypesTickets.push({
                        ticketType: ticketType.name,
                        daysAway: k - 15,
                        y: ticketTypesLength - j,
                        tickets: day
                    });
                }
            });

            // Warn
            $.each(ticketType.warnTickets, function (k, ticket) {
                vmCompany.warnTickets.push(ticket);
            });

            // Resolved
            $.each(ticketType.resolvedTickets, function (k, ticket) {
                vmCompany.resolvedTickets.push(ticket);
            });
        });

        // Find max tickets amount for last two weeks for consolidated company data for normalization
        var maxOnTrack = _.max(vmCompany.onTrackTickets, function (day) {
            return day.tickets;
        });
        var maxWatch = _.max(vmCompany.watchTickets, function (day) {
            return day.tickets;
        });
        vmCompany.maxTicketsLastTwoWeeks = Math.max(maxOnTrack.tickets, maxWatch.tickets);

        // Find the max tickets amount among all ticket types for on track and watch individually and combined
        vmCompany.onTrackMax = Math.max.apply(null, onTrackMaxes);
        vmCompany.watchMax = Math.max.apply(null, watchMaxes);
        vmCompany.maxTickets = Math.max(vmCompany.onTrackMax, vmCompany.watchMax);
    };

    // Tickets Grid
    vmCompany.ticketsGridInitialized = ko.observable(false);

    vmCompany.instantiateTicketsGrid = function (queryParams, removeParams) {

        // If the grid hasn't been set up yet, set it up
        if (!vmCompany.ticketsGridInitialized()) {
            vmCompany.ticketsGrid = new CustomerCareTicketsGridModel(vmCustomerCare);
            vmCompany.ticketsGridInitialized(true);
        }

        // Remove previous rows and reset page query param
        vmCompany.ticketsGrid.resettingGrid(true);
        vmCompany.ticketsGrid.rowsUnfiltered.removeAll();
        vmCompany.ticketsGrid.gridParametersModel.reset();

        if (removeParams) {
            vmCompany.ticketsGrid.gridParametersModel.removeQueryParams(removeParams);
        }

        vmCompany.ticketsGrid.gridParametersModel.addQueryParams(queryParams);
    };

    // Expanded Tickets View Logic
    vmCompany.expandedTickets = ko.observable();

    // Arrow Positioning
    vmCompany.arrowPosition = ko.observable(0);

    vmCompany.calculateArrowPosition = function (element, isCircle) {
        var $element = $(element),
            elementDocLeftOffset = $element.offset().left,
            elementWidth = isCircle ? ($element.attr('r') * 2) : $element.outerWidth(),  // needed because outerWidth isn't working on circle elements
            $table = $element.closest('[data-mettel-class="customer-care-table"]'),
            tableDocLeftOffset = $table.offset().left,
            tableWidth = $table.outerWidth(),
            elementTableLeftOffset = elementDocLeftOffset - tableDocLeftOffset,
            elementCenterPosition = elementTableLeftOffset + (elementWidth / 2),
            arrowProportionPosition = (elementCenterPosition / tableWidth) * 100,
            arrowPercentPosition = arrowProportionPosition.toFixed(1) + '%';

        vmCompany.arrowPosition(arrowPercentPosition);
    };

    vmCompany.viewTicketsTrigger = function (data, event, clientId, type, status, isMoreThanTwoWeeks) {
        var $element = $(event.currentTarget),
            activeClass = 'mettel-state-active';

        vmCompany.calculateArrowPosition(event.currentTarget);

        // If the element is not marked
        if (!$element.hasClass(activeClass)) {

            vmCustomerCare.removeStoredMarker();

            // Mark it and store a reference to it
            $element.addClass(activeClass);
            vmCustomerCare.storedMarker($element);

            var ticketData = {
                    clientId: clientId,
                    ticketType: type,
                    ticketStatus: status
                },
                removeParams;

            if (isMoreThanTwoWeeks) {
                ticketData.dueDate = moment().add(14, 'd');
                ticketData.daysAway = 15;
            } else {
                removeParams = 'daysAway';
            }

            vmCompany.viewTickets(ticketData, removeParams);

        } else {

            // When the same element is clicked again, close the ticket view
            vmCompany.closeTicketsView();
        }
    };

    // Functionality to expand the ticket view with appropriate data
    vmCompany.viewTickets = function (ticketData, removeParams) {

        // If another company's client view is expanded, collapse it
        if (vmCustomerCare.expandedClientViewCompany() && vmCustomerCare.expandedClientViewCompany() !== vmCompany) {
            vmCustomerCare.expandedClientViewCompany(null);
        }

        // If this company's tickets view is not expanded, expand it
        if (!vmCustomerCare.expandedTicketsViewCompany() || vmCustomerCare.expandedTicketsViewCompany() !== vmCompany) {
            vmCustomerCare.expandedTicketsViewCompany(vmCompany);
        }

        // Pass in the expanded ticket info
        vmCompany.expandedTickets(ticketData);

        var addParams = {
                clientId: ticketData.clientId,
                ticketType: ticketData.ticketType,
                ticketStatus: ticketData.ticketStatus,
                rows: 10
            };

        if (typeof ticketData.daysAway !== 'undefined') {
            addParams.daysAway = ticketData.daysAway;
        }

        vmCompany.instantiateTicketsGrid(addParams, removeParams);
    };

    vmCompany.closeTicketsView = function () {
        vmCustomerCare.removeStoredMarker();
        vmCustomerCare.expandedTicketsViewCompany(null);
    };
}

/*function CustomerCareContactModel(options) {

    var self = this;
        self.options = options ? options : {};

    self.userId = ko.observable();
    self.generalPhone = ko.observable("866-625-2228");
    self.name = ko.observable("");
    self.liveChatAvailable = ko.observable(false);

    self.formattedName = ko.computed(function(){
        if(self.name() === "") {
            return "";
        } else {
            return "Hi, I'm " + self.name() + ". ";
        }
    });
    self.customerCareIsLoaded = ko.observable(false);

    self.init = function() {
        $.ajax({
            url: self.options.endPoints.getCareData,
            contentType: "application/json",
            dataType: "json",
            data: {
                id: self.userId()
            },
            success: function(data) {
                self.setValues(data);
            }
        });
    };

    self.setValues = function(data) {

        var capitalizeFirstLetter = function(str) {
            str = str.toLowerCase();
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        var formatName = function(str){
            var name = str.split(" ");
            for(var i = 0; i < name.length; i++) {
               name[i] = capitalizeFirstLetter(name[i]);
            }
            return name.join(" ");
        };


        if (data.careData) {
            if(data.careData.name && data.careData.name !== "") {
                self.name(formatName(data.careData.name));
            }
            if(data.careData.generalPhone && data.careData.name !== "") {
                self.generalPhone(data.careData.generalPhone);
            }
            self.liveChatAvailable(data.careData.liveChat);
            self.customerCareIsLoaded(true);
        }
    };

    self.init();
}*/

function CustomerCareModel() {
    var vmCustomerCare = this;

    vmCustomerCare.companies = ko.observableArray();

    // For view management
    vmCustomerCare.expandedClientViewCompany = ko.observable();
    vmCustomerCare.expandedTicketsViewCompany = ko.observable();

    vmCustomerCare.toggleExpandedClientViewCompany = function (company) {

        // If another company's tickets view is expanded, collapse it and remove the previous marker
        if (vmCustomerCare.expandedTicketsViewCompany() && vmCustomerCare.expandedTicketsViewCompany() !== company) {
            vmCustomerCare.expandedTicketsViewCompany(null);
            vmCustomerCare.removeStoredMarker();
        }

        // If the same company is already expanded
        if (vmCustomerCare.expandedClientViewCompany() === company) {
            // Collapse the client view
            vmCustomerCare.expandedClientViewCompany(null);

            // If its tickets view is showing tickets from the client view, collapse the tickets view as well
            if (vmCustomerCare.expandedTicketsViewCompany() === company && company.expandedTickets().ticketType !== 'all') {
                vmCustomerCare.expandedTicketsViewCompany(null);
                vmCustomerCare.removeStoredMarker();
            }

        } else {
            // If no company is expanded or it's a different company, expand the company
            vmCustomerCare.expandedClientViewCompany(company);
        }
    };

    // when expandedTicketsViewCompany changes, ensure the grid (and its columns) gets re-initialized
    vmCustomerCare.expandedTicketsViewCompany.subscribe(function(value) {
        if (value !== null) {
            value.ticketsGridInitialized(false);
        }
    });

    // Initialize Customer Care
    vmCustomerCare.init = function () {

        // Show loader
        vmCustomerCare.ajaxResponded(false);

        // Set url with query params
        var url = vmCustomerCare.endPoints.getCustomerCareData;

        // Go fetch the data
        $.getJSON(url, function (data) {

            $.each(data.companies, function (i, company) {

                // Create the company model and initialize it
                var newCompanyModel = new CustomerCareCompanyModel(company, vmCustomerCare);
                newCompanyModel.init();
                vmCustomerCare.companies.push(newCompanyModel);
            });

            // Hide loader
            vmCustomerCare.ajaxResponded(true);

            if (vmCustomerCare.completeEvent) {
                vmCustomerCare.completeEvent(this);
            }
        });
    };

    // Stores a marker for the most-recently clicked data point on one of the charts, a ticket block, or a >14d indicator
    vmCustomerCare.storedMarker = ko.observable();

    // Remove any previous marker
    vmCustomerCare.removeStoredMarker = function () {
        if (vmCustomerCare.storedMarker()) {
            // If it's a circle, it's a duplicate, so actually remove it
            if (vmCustomerCare.storedMarker().prop('tagName') === 'circle') {
                vmCustomerCare.storedMarker().remove();
            } else {
                // Otherwise just remove the class
                vmCustomerCare.storedMarker().removeClass('mettel-state-active');
            }
            vmCustomerCare.storedMarker(null);
        }
    };
}

ko.bindingHandlers.customerCare = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (typeof options.queryParams === 'undefined') {
            options.queryParams = {};
        }

        MetTel.DashboardBaseModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.lineLinkCallback = options.lineLinkCallback;
            viewModel.ticketGridCustomColumnTemplates = options.ticketGridCustomColumnTemplates;
            viewModel.ticketGridPivotMenu = options.ticketGridPivotMenu;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'customer-care-template',
                data: viewModel
            }
        }, bindingContext);

        return {controlsDescendantBindings: true};
    }
};

ko.bindingHandlers.companyTicketsGraph = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            tickets = valueAccessor().tickets,
            source = valueAccessor().source,
            maxTickets = viewModel.maxTicketsLastTwoWeeks,
            graphMax = Math.ceil(maxTickets * 1.25),
            grey60 = '#666666',
            grey20 = '#CCCCCC',
            yellow = '#FFA613',
            activeColor = '#2CB0ED',
            baseColor;

        if (source === 'onTrack') {
            baseColor = grey60;
        } else if (source === 'watch') {
            baseColor = yellow;
        }

        var chartConfig = {
            seriesDefaults: {
                type: 'area',
                color: baseColor,
                opacity: 0.1,
                highlight: {
                    markers: {
                        size: 8,
                        color: '#fff',
                        border: {
                            width: 2,
                            color: baseColor,
                            opacity: 1
                        }
                    }
                }
            },
            dataSource: {
                data: tickets
            },
            series: [
                {
                    field: 'tickets',
                    line: {
                        color: baseColor,
                        width: 2,
                        style: 'smooth'
                    }
                }
            ],
            seriesClick: function (e) {

                // Disable functionality if the point has 0 tickets
                if (!e.dataItem.tickets) { return false; }

                var $element = $(e.element),
                    $originalCircle;

                // Check if the user clicked the circle itself or the chart near a circle
                if ($element.prop('tagName') === 'circle') {
                    $originalCircle = $element;
                } else {
                    // If it was the chart, find the appropriate circle
                    $originalCircle = $element.closest('[data-mettel-class="chart-container"]').find('circle:not([style="display: none;"])').filter('[stroke!="#2CB0ED"]').filter('[stroke!="#2cb0ed"]');
                }

                var $parent = $originalCircle.parent(),
                    $newCircle = $originalCircle.clone(),
                    attrs = {
                        'stroke': activeColor
                    },
                    vmCompany = ko.dataFor($(e.element).closest('[data-mettel-class="chart-container"]')[0]),
                    vmCustomerCare = vmCompany.parent,
                    daysAway = e.dataItem.daysAway,
                    dueDate = moment().add(daysAway, 'd'),
                    ticketData = {
                        clientId: vmCompany.id,
                        ticketType: "all",
                        ticketStatus: source,
                        dueDate: dueDate,
                        daysAway: daysAway,
                        tickets: e.dataItem.tickets
                    };

                // If the user clicked the chart nearest the marked circle
                if (vmCustomerCare.storedMarker() && vmCustomerCare.storedMarker().attr('cy') === $originalCircle.attr('cy')) {
                    // Close the tickets view and don't do anything else
                    vmCompany.closeTicketsView();
                    return false;
                }

                vmCompany.calculateArrowPosition($originalCircle[0], true);

                vmCustomerCare.removeStoredMarker();

                // Add the copied circle to the chart as a marker for the clicked data point and store the new one
                $newCircle.attr(attrs)
                    .one('click', function () {
                        // When the same point is clicked again, close the ticket view
                        vmCompany.closeTicketsView();
                    });
                $parent.append($newCircle);
                vmCustomerCare.storedMarker($newCircle);

                vmCompany.viewTickets(ticketData);
            },
            tooltip: {
                visible: true,
                background: 'transparent',
                border: {
                    width: 0
                },
                template: '<div class="mettel-customer-care-tooltip-wrapper mettel-top"><div class="mettel-tooltip-bubble">#= value === 1 ? "1 Ticket" : value + " Tickets" #<br>#= MetTel.Utils.createDaysDueText(dataItem.daysAway, 14) #</div></div>'
            },
            categoryAxis: {
                visible: false,
                majorGridLines: {
                    visible: true,
                    step: 7,
                    dashType: 'dash',
                    color: grey20
                }
            },
            valueAxis: {
                visible: false,
                min: 0,
                max: graphMax,
                majorGridLines: {
                    visible: false
                }
            },
            chartArea: {
                height: 63,
                margin: 0,
                background: 'transparent'
            },
            plotArea: {
                margin: {
                    top: 0,
                    right: 4,
                    bottom: -1,
                    left: 4
                }
            },
            panes: [
                {
                    clip: false
                }
            ]
        };

        $element.kendoChart(chartConfig);
    }
};

ko.bindingHandlers.companyTicketsByTypeGraph = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            tickets = valueAccessor().tickets,
            source = valueAccessor().source,
            vmCompany = bindingContext.$parent,
            ticketTypesLength = vmCompany.ticketTypes.length,
            height = (32 * (ticketTypesLength + 0.5)),
            yMin = 0.5,
            yMax = ticketTypesLength + 1,
            graphMaxTickets = vmCompany[source + 'Max'],
            bubbleDiameterMin = 8,
            bubbleDiameterMax = 24,
            bubbleDiameterMaxGraphSpecific,
            grey80 = '#333333',
            grey20 = '#CCCCCC',
            yellow = '#FF9900',
            activeColor = '#2CB0ED',
            opacity,
            baseColor;

        if (source === 'onTrack') {
            baseColor = grey80;
            opacity = 0.5;
        } else if (source === 'watch') {
            baseColor = yellow;
            opacity = 0.6;
        }

        // Normalization between on track and watch
        if (graphMaxTickets === vmCompany.maxTickets) {
            // If this graph has the max amount of tickets, use the max size
            bubbleDiameterMaxGraphSpecific = bubbleDiameterMax;
        } else {
            // If not, we need to normalize it
            // Do this by calculating what the diameter should be proportionally from bubble area
            var proportion = graphMaxTickets / vmCompany.maxTickets,
                area1 = Math.pow((bubbleDiameterMax / 2), 2) * Math.PI,
                area2 = area1 * proportion;
            bubbleDiameterMaxGraphSpecific = 2 * Math.sqrt(area2 / Math.PI);
        }

        var chartConfig = {
            seriesDefaults: {
                type: 'bubble',
                color: baseColor,
                opacity: opacity,
                maxSize: bubbleDiameterMaxGraphSpecific,
                minSize: bubbleDiameterMin,
                highlight: {
                    border: {
                        width: 0
                    }
                },
                xField: 'daysAway',
                sizeField: 'tickets'
            },
            transitions: false,
            series: [
                {
                    data: tickets
                }
            ],
            seriesClick: function (e) {
                var $originalCircle = $(e.element),
                    $parent = $originalCircle.parent(),
                    $newCircle = $originalCircle.clone(),
                    attrs = {
                        'stroke': activeColor,
                        'stroke-width': 3
                    },
                    vmCompany = ko.contextFor($(e.element).closest('[data-mettel-class="chart-container"]')[0]).$parent,
                    vmCustomerCare = vmCompany.parent,
                    daysAway = Math.abs(e.dataItem.daysAway),
                    dueDate = moment().add(daysAway > 14 ? 14 : daysAway, 'd'),
                    ticketData = {
                        clientId: vmCompany.id,
                        ticketType: e.dataItem.ticketType,
                        ticketStatus: source,
                        dueDate: dueDate,
                        daysAway: daysAway,
                        tickets: e.dataItem.tickets
                    };

                vmCompany.calculateArrowPosition(e.element, true);

                // Add the copied bubble to the chart as a marker for the clicked data point
                $newCircle.attr(attrs)
                    .one('click', function () {
                        // When the same point is clicked again, close the ticket view
                        vmCompany.closeTicketsView();
                    });
                $parent.append($newCircle);

                vmCustomerCare.removeStoredMarker();
                vmCustomerCare.storedMarker($newCircle);

                vmCompany.viewTickets(ticketData);
            },
            tooltip: {
                visible: true,
                background: 'transparent',
                border: {
                    width: 0
                },
                template: '<div class="mettel-customer-care-tooltip-wrapper mettel-top"><div class="mettel-tooltip-bubble">#= value.size === 1 ? "1 Ticket" : value.size + " Tickets" #<br>#= MetTel.Utils.createDaysDueText(Math.abs(dataItem.daysAway), 14) #</div></div>'
            },
            xAxis: {
                visible: false,
                labels: {
                    visible: false
                },
                axisCrossingValue: 0,
                min: -21,  // hack so that gridlines are where they need to be
                max: 1,  // hack so that right-most bubble is hover-able when coming from the right
                majorUnit: 7,
                majorGridLines: {
                    visible: true,
                    dashType: 'dash',
                    color: grey20
                },
                minorGridLines: {
                    visible: false
                },
                majorTicks: {
                    visible: false
                },
                minorTicks: {
                    visible: false
                }
            },
            yAxis: {
                visible: false,
                labels: {
                    visible: false
                },
                line: {
                    width: 0
                },
                min: yMin,
                max: yMax,
                majorGridLines: {
                    visible: false
                },
                minorGridLines: {
                    visible: false
                },
                majorTicks: {
                    visible: false
                },
                minorTicks: {
                    visible: false
                }
            },
            chartArea: {
                height: height,
                margin: 0,
                background: 'transparent'
            },
            plotArea: {
                margin: {
                    top: 0,
                    right: -3,  // hack so that right-most bubble is hover-able when coming from the right
                    bottom: -1,
                    left: -78  // hack so that gridlines are where they need to be
                }
            },
            panes: [
                {
                    clip: false
                }
            ]
        };

        setTimeout(function () {
            $element.kendoChart(chartConfig);
        }, 1);  // setTimeout waits till grid rows are all rendered before drawing the chart
    }
};

window.MetTel = window.MetTel || {};

MetTel.DashboardBaseModel = DashboardBaseModel = function(options) {
    var self = this;

    // Boolean to indicate if GET request is successful - for loader
    self.ajaxResponded = ko.observable();

    // Booleans controlling if button or link is shown
    self.openConfigButtonDisplayed = ko.observable(options.displayOpenConfigButton);
    self.openHelpDeskDisplayed = ko.observable(options.displayOpenHelpDeskLink);
    self.openDashboardConfig = options.openDashboardConfig;
    self.openHelpDeskSection = options.openHelpDeskSection;

    // query params variables and functions
    self.queryParams = ko.observable(options.queryParams);
    self.queryString = ko.computed(function() {
        var queryString = '';
        if (self.queryParams()) {
            ko.utils.arrayForEach(_.keys(self.queryParams()), function (key) {
                if (queryString) {
                    queryString += "&";
                }

                queryString += key + "=" + self.queryParams()[key];
            });
        }

        return queryString ? '?' + queryString : '';
    });

    self.cloneQueryParams = function() {
        return $.extend({}, self.queryParams() ? self.queryParams() : {});  //Cloning the params
    };

    self.addQueryParams = function(params) {
        var clonedParams = self.cloneQueryParams(),
            keys = _.keys(params);

        _.each(keys, function(key) {
            clonedParams[key] = params[key];
        });

        self.queryParams(clonedParams);
    };

    self.removeQueryParams = function(params) {
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

    // Trigger the Open Dashboard Config custom callback
    self.openConfig = function () {
        if (self.openDashboardConfig) {
            self.openDashboardConfig();
        }
    };

    // Trigger the Open Help Desk Section custom callback
    self.openHelpDesk = function () {
        if (self.openHelpDeskSection) {
            self.openHelpDeskSection();
        }
    };
};

ko.bindingHandlers.fixedHeader = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        $(this).fixedHeader(accessor, element);
    }
};

var GlobalSearchModel = function(options) {
  options = options ? options : {};
  var self = this;

  // set up search observable and extend Typeahead
  self.search = ko.observable();

  self.searchFormatted = ko.observable();

  if (options.typeaheadConfig) {
    options.typeaheadConfig.value = self.search;
    MetTel.TypeaheadModel.apply(self, [options.typeaheadConfig]);

    self.selectedObject({});

    self.selectedType = ko.computed(function() {
        return self.selectedObject().type;
    });

    self.ticketsGrid = options.ticketsGrid;
    self.accountsGrid = options.accountsGrid;
    self.assetsGrid = options.assetsGrid;

    self.newTicketEvent = options.newTicketEvent;

    self.ticketURL = options.ticketURL;
    self.locationURL = options.locationURL;
    self.personURL = options.personURL;
    self.invoiceURL = options.invoiceURL;
    self.viewAllURL = options.viewAllURL;

    self.ticketParam = options.ticketParam;
    self.locationParam = options.locationParam;
    self.personParam = options.personParam;
    self.invoiceParam = options.invoiceParam;
    self.viewAllParam = options.viewAllParam;

    if (options.fullScreen !== undefined) {
      self.fullScreen = true;
      self.loadMoreCallback = options.fullScreen.loadMoreCallback;
      self.loadAllCallback = options.fullScreen.loadAllCallback;
    }
    else {
      self.fullScreen = false;
    }
  }

  // extended f'nality
  self.defaultFilter = '';

  if (self.fullScreen && MetTel.Utils.getQueryParams(window.location.search).searchType) {
      self.defaultFilter = MetTel.Utils.getQueryParams(window.location.search).searchType;
  }

  self.filter = ko.observable(self.defaultFilter);

  self.defaultQuickViewFilter = 'tickets';
  self.quickViewFilter = ko.observable(self.defaultQuickViewFilter);

  self.ticketsGridModel = ko.observable(new GridModel());
  self.accountsGridModel = ko.observable(new GridModel());
  self.assetsGridModel = ko.observable(new GridModel());

  self.clearSearch = function() {
    self.search('');
    self.selectedObject({});
    self.results('0');
    self.filter(self.defaultFilter);

    self.addQueryParams({ category: self.filter() });
  };

  self.newTicketClick = function() {
    var strGridModel = self.quickViewFilter(),
      vmGlobalSearchGridModel,
      objSelectedRows;

    switch(strGridModel) {
      case 'tickets':
          vmGlobalSearchGridModel = self.ticketsGridModel();
          break;
      case 'assets':
          vmGlobalSearchGridModel = self.assetsGridModel();
          break;
      case 'accounts':
          vmGlobalSearchGridModel = self.accountsGridModel();
          break;
    }

    objSelectedRows = vmGlobalSearchGridModel.selectedRows();

    self.newTicketEvent(self.selectedObject(), objSelectedRows);
  };

  self.updateQuickViewFilter = function(quickViewFilter) {
    self.quickViewFilter(quickViewFilter);
  };

  self.updateFilter = function(filter) {
    self.filter(filter);
    self.selectedObject({});

    self.addQueryParams({ category: filter });

    var strURL = self.typeaheadUrl + self.queryString();

    // AJAX call to filter results by category
    $.ajax( {
      url: strURL,
      data: {
          filter: self.search(),
          category: filter
      },
      beforeSend: function() {
          self.updatingPossibleSuggestions(true);
      },
      complete: function(data) {
          self.possibleSuggestions.removeAll();

          var objJSON = JSON.parse(data.responseText);

          if (objJSON.results !== undefined) {
              self.results(objJSON.results);
              objJSON = objJSON.suggestions;
          }

          ko.utils.arrayForEach(objJSON, function(suggestion) {
              self.possibleSuggestions.push(suggestion);
          });

          self.updatingPossibleSuggestions(false);
      }
    });

  };

    // Logic to show / hide results container
    self.typeaheadEmpty = ko.observable(true);

    self.search.subscribe(function () {
        if (self.search()) {
            var format = self.search().replace(/[()+-\s]/g, '');
            var pattern = /^\d+$/;
            var isNumber = pattern.test(format);
            format = isNumber ? self.search().replace(/[()+-\s]/g, '') : self.search().replace(/[()+-]/g, '');
            self.searchFormatted(format);
            self.typeaheadEmpty(false);
        } else {
            self.typeaheadEmpty(true);
        }
    });

};

ko.bindingHandlers.updateSelectedHTML = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var objParent = bindingContext.$parent;
        var searchTerm = objParent.searchFormatted();
        var $element = $(element);
        var thisName = $element.html();

        function highlightText(strLookingFor, strLookingWithin) {
            strLookingFor = new RegExp("("+strLookingFor+")", "ig" );
            strLookingWithin = strLookingWithin.replace(strLookingFor, "<strong>$1</strong>");

            return strLookingWithin;
        }

        var unformattedName = viewModel.text;

        if (searchTerm.length >= objParent.stringLength) {
          $element.html(highlightText(searchTerm, thisName));
        }
        else {
          $element.html(unformattedName);
        }
    }
};

ko.bindingHandlers.linkToItem = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var $element = $(element),
      $link = $element.parent(),
      argument = valueAccessor(),
      vmGlobalSearch = bindingContext.$parent,
      objParams,
      strParams;

    objParams = vmGlobalSearch[argument + 'Param'];
    strParams = '';

    for (var k in objParams) {
      if (objParams.hasOwnProperty(k)) {
         strParams += k + '=' + viewModel[objParams[k]] + '&';
      }
    }

    var strURL = vmGlobalSearch[argument + 'URL'] + '?' + strParams;
    $link.attr('href', strURL);

    if (argument === 'ticket') {
        $link.attr('target', '_blank');
    }

  }
};

ko.bindingHandlers.viewAll = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var $element = $(element),
      strParams = '';

    $element.on('click', function() {
      if (viewModel.queryParams().clientId !== undefined) {
        strParams = '&clientId=' + viewModel.queryParams().clientId;
      }
      if (viewModel.queryParams().category !== undefined) {
          strParams += '&searchType=' +viewModel.queryParams().category;
      }

      var strURL = viewModel.viewAllURL + '?' + viewModel.viewAllParam + '=' + viewModel.search() + strParams;
      window.location = strURL;
    });
  }
};

ko.bindingHandlers.selectSuggestion = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    // console.log("selectSuggestion");
    var $element = $(element),
      vmSelection = viewModel,
      vmGlobalSearch = bindingContext.$parent;

    $element.on('click', function() {
      // only do the work if we've selected something different
      if (vmSelection !== vmGlobalSearch.selectedObject()) {
        vmGlobalSearch.selectedObject(vmSelection);

        if (vmGlobalSearch.selectSuggestionEvent) {
          vmGlobalSearch.selectSuggestionEvent(vmSelection);
        }

        var $typeaheadInner = $element.parents('.mettel-typeahead-inner'),
        $ticketsGrid = $typeaheadInner.find('.mettel-global-search-quick-view-grid-tickets'),
        $accountsGrid = $typeaheadInner.find('.mettel-global-search-quick-view-grid-accounts'),
        $assetsGrid = $typeaheadInner.find('.mettel-global-search-quick-view-grid-assets');

        // if switching locations, show default quick view filter
        if (vmGlobalSearch.selectedType() === 'location') {
          vmGlobalSearch.quickViewFilter(vmGlobalSearch.defaultQuickViewFilter);

          vmGlobalSearch.ticketsGridModel().clearSelectedRows();
          vmGlobalSearch.ticketsGridModel().initialized(false);
          vmGlobalSearch.ticketsGridModel().columns.removeAll();
          vmGlobalSearch.ticketsGridModel().rowsUnfiltered.removeAll();
          vmGlobalSearch.ticketsGridModel().gridParametersModel.reset();
          vmGlobalSearch.ticketsGridModel().gridParametersModel.addQueryParams({ locationId: vmSelection.id, clientId: vmSelection.clientId});
          MetTel.Grid.Utils.manageColumns($ticketsGrid[0], vmGlobalSearch.ticketsGridModel().columns());

          vmGlobalSearch.accountsGridModel().clearSelectedRows();
          vmGlobalSearch.accountsGridModel().initialized(false);
          vmGlobalSearch.accountsGridModel().columns.removeAll();
          vmGlobalSearch.accountsGridModel().rowsUnfiltered.removeAll();
          vmGlobalSearch.accountsGridModel().gridParametersModel.reset();
          vmGlobalSearch.accountsGridModel().gridParametersModel.addQueryParams({ locationId: vmSelection.id, clientId: vmSelection.clientId});
          MetTel.Grid.Utils.manageColumns($accountsGrid[0], vmGlobalSearch.accountsGridModel().columns());

          vmGlobalSearch.assetsGridModel().clearSelectedRows();
          vmGlobalSearch.assetsGridModel().initialized(false);
          vmGlobalSearch.assetsGridModel().columns.removeAll();
          vmGlobalSearch.assetsGridModel().rowsUnfiltered.removeAll();
          vmGlobalSearch.assetsGridModel().gridParametersModel.reset();
          vmGlobalSearch.assetsGridModel().gridParametersModel.addQueryParams({ locationId: vmSelection.id, clientId: vmSelection.clientId});
          MetTel.Grid.Utils.manageColumns($assetsGrid[0], vmGlobalSearch.assetsGridModel().columns());
        }
      }
    });
  }
};

ko.bindingHandlers.locationGrid = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    // passing in a string from the view to determine which set of config params to use
    var $element = $(element),
      vmGlobalSearch = bindingContext.$root,
      strGridType = allBindingsAccessor().value, // which grid is this
      objGridConfig = vmGlobalSearch[strGridType], // grab this grid's config params
      vmGrid;

    switch(strGridType) {
      case 'ticketsGrid':
          vmGrid = vmGlobalSearch.ticketsGridModel();
          break;
      case 'assetsGrid':
          vmGrid = vmGlobalSearch.assetsGridModel();
          break;
      case 'accountsGrid':
          vmGrid = vmGlobalSearch.accountsGridModel();
          break;
    }

    // need to set this here, before the infiniteScrolling binding handler runs
    if (objGridConfig.infiniteScrolling) {
        vmGrid.infiniteScrolling(objGridConfig.infiniteScrolling);
    }

    // add the id of the currently selected location to the grid params
    objGridConfig.queryParams.locationId = vmGlobalSearch.selectedObject().id;

    $element.addClass("mettel-grid-global-search");

    MetTel.Grid.Utils.initGrid(element, function() { return objGridConfig; }, allBindingsAccessor, vmGrid, bindingContext);

    if (vmGrid.supportsFrozenHeader()) {
        $element.addClass("mettel-grid-frozen-header");
    }
    else if (vmGrid.supportsFixedHeight()) {
        $element.addClass("mettel-grid-fixed-height");
    }

    // set initial height after loading the grid.
    // quickView will take care of this going forward, but fails
    // initially because it is called before the grids are loaded
    var $quickViewPanel = $element.parents('.mettel-global-search-quick-view-panel'),
      $parentTypeaheadInner = $element.parents('.mettel-typeahead-inner'),
      $parentTypeaheadContainer = $parentTypeaheadInner.find('.mettel-typeahead-container'),
      $parentContainer = $element.parents('.mettel-global-search-quick-view-grid-container'),
      numQuickViewPanelHeight = $quickViewPanel.outerHeight(),
      numTypeaheadHeight = $parentTypeaheadContainer.outerHeight(),
      numQuickViewNavHeight = $parentContainer.siblings('.mettel-tab-navigation').outerHeight(),
      numQuickViewFooterHeight = $parentContainer.siblings('.mettel-global-search-quick-view-footer').outerHeight(),
      numGridHeaderHeight = 32;

      $element.find('.mettel-grid-body').css('height', (numTypeaheadHeight - numQuickViewNavHeight - numQuickViewFooterHeight - numGridHeaderHeight) + 'px');

    return { controlsDescendantBindings: true };
  }
};

ko.bindingHandlers.quickView = {
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var $element = $(element),
      value = ko.utils.unwrapObservable(valueAccessor()),
      $quickViewPanel = $element.parents('.mettel-global-search-quick-view-panel'),
      $parentTypeaheadInner = $element.parents('.mettel-typeahead-inner'),
      numQuickViewPanelHeight = $quickViewPanel.outerHeight(),
      numTypeaheadHeight = $parentTypeaheadInner.find('.mettel-typeahead-container').outerHeight();

      // only update the height if its height is different than that of the typeahead container
      if (numTypeaheadHeight !== numQuickViewPanelHeight) {
        $quickViewPanel.css('height', numTypeaheadHeight + 'px');
      }

      var numQuickViewNavHeight = $element.siblings('.mettel-tab-navigation').outerHeight(),
        numQuickViewFooterHeight = $element.siblings('.mettel-global-search-quick-view-footer').outerHeight(),
        numGridHeaderHeight = 32;

      $element.find('.mettel-grid-body').css('height', (numTypeaheadHeight - numQuickViewNavHeight - numQuickViewFooterHeight - numGridHeaderHeight) + 'px');
  }
};

ko.bindingHandlers.clearSearch = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var $element = $(element),
      $searchInput = $element.siblings('.mettel-typeahead').find('.mettel-search-input');

    $element.on('click', function() {
      viewModel.clearSearch();
      $searchInput.focus();
    });
  }
};

ko.bindingHandlers.openSearch = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

    var $element              = $(element),
      $globalHeader           = $element.parents('.mettel-header'),
      $this                   = $globalHeader,
      $searchInput            = $this.find('.mettel-search-input'),
      $searchTrigger          = $this.find('.mettel-global-search-icon'),
      $globalSearch           = $this.find('.mettel-utility-global-search'),
      activeClass             = 'mettel-search-active',
      transitionClass         = 'mettel-search-transition',
      $utilityNav             = $this.find('.mettel-utility-navigation'),
      $userSettings           = $this.find('.mettel-user-settings'),
      $userInfo               = $this.find($('.mettel-user-name, .mettel-user-company-name')),
      $userTrigger            = $this.find('.mettel-link-user'),
      $userSettingOption      = $this.find('.mettel-link-user'),
      $overlayCloseTrigger    = $this.find('.mettel-user-settings-overlay'),
      $typeaheadList          = $this.find('.mettel-typeahead-list'),
      overlayActive           = 'mettel-overlay-active',
      userSettingsActive      = 'active',
      selectedClass           = 'selected',
      // var boolean to prevent being able to open the user settings when search is open
      settingVar              = true,
      $clearSearch            = $this.find('.mettel-icon-clear');

    $searchTrigger.click(function(){
      // opening menu
      if ($utilityNav.hasClass(activeClass) === false) {
        $utilityNav.addClass(transitionClass);
        $globalSearch.animate({
          width: '320px'
        },
        300,
        function() {
          $utilityNav.addClass(activeClass);
          $utilityNav.removeClass(transitionClass);

          $clearSearch.animate({
              opacity: '1'
          },
          300);

          $searchInput.animate({
              opacity: '1'
          },
          300,
          function() {
            $searchInput.focus();
          });

        });
      }
      // closing menu
      else {
        viewModel.clearSearch();
        $utilityNav.addClass(transitionClass);
        $globalSearch.animate({
          width: '64px'
        },
        300,
        function () {
          $utilityNav.removeClass(transitionClass);
        });

        $utilityNav.removeClass(activeClass);

        setTimeout(function(){
            $clearSearch.animate({
                opacity: '0'
            },
            300);

            $searchInput.animate({
                opacity: '0'
            },
            300);

        },
        500);
      }
    });
  }
};

ko.bindingHandlers.stopBinding = {
    init: function() {
        return { controlsDescendantBindings: true };
    }
};

ko.virtualElements.allowedBindings.stopBinding = true;

ko.bindingHandlers.globalSearch = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var options = valueAccessor();

    ko.renderTemplate("global-search", new GlobalSearchModel(options), {}, element, 'replaceNode');
  }
};

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
function HeaderBreadcrumbsModel() {
    var self = this;

    this.breadcrumbs = ko.observableArray();

    // place to store the resize function, for removal and re-population
    this.resizeFunction = ko.observable(undefined);

    // flag used to "refresh" resize function when breadcrumbs change
    this.breadcrumbFlag = ko.observable(false);

    this.addBreadcrumb = function (itemOrItems) {

        if ($.isArray(itemOrItems)) {
            _.each(itemOrItems, function (item) {
                self.breadcrumbs.push(item);
            });
        } else {
            self.breadcrumbs.push(itemOrItems);
        }

    };

    this.removeBreadcrumb = function (itemOrItems) {

        if ($.isArray(itemOrItems)) {
            _.each(itemOrItems, function (item) {
                self.breadcrumbs.remove(item);
            });
        } else {
            self.breadcrumbs.remove(itemOrItems);
        }

        self.breadcrumbFlag(true);

    };

    this.breadcrumbClick = function (breadcrumbItem) {

        if (breadcrumbItem.click) {

            var clickedBreadcrumbIndex = self.breadcrumbs().indexOf(breadcrumbItem),
                breadcrumbsToRemove = [];

            $.each(self.breadcrumbs(), function (i, breadcrumb) {
                if (i > clickedBreadcrumbIndex) {
                    breadcrumbsToRemove.push(breadcrumb);
                }
            });

            self.removeBreadcrumb(breadcrumbsToRemove);

            if ($.isFunction(breadcrumbItem.click)) {
                breadcrumbItem.click.call(self, breadcrumbItem);
            }

        }

    };

    this.breadcrumbsRenderedFlag = ko.observable();
    this.markBreadcrumbsRendered = function () {
        self.breadcrumbsRenderedFlag(true);
    };

}

ko.bindingHandlers.headerBreadcrumbs = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor(),
            breadcrumbs = options.breadcrumbItems;

        if (options) {
            _.each(breadcrumbs, function (item) {
                viewModel.addBreadcrumb(item);
            });
        }

        ko.applyBindingsToNode(element, { template: { name: 'header-breadcrumbs', data: viewModel, afterRender: viewModel.markBreadcrumbsRendered } }, bindingContext);

        viewModel.breadcrumbFlag(true);

        return { controlsDescendantBindings: true };

    }
};

ko.bindingHandlers.headerBreadcrumbsWidth = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        if (value === true) {

            var $innerContainer = $(element),
                $outerContainer = $innerContainer.closest('[data-mettel-class="header-breadcrumbs-container"]'),
                $breadcrumbs = $innerContainer.find('.mettel-header-breadcrumb-item'),
                breadcrumbsLength = viewModel.breadcrumbs().length,
                lastBreadcrumbIndex = breadcrumbsLength - 1,
                secondToLastBreadcrumbIndex = breadcrumbsLength - 2,
                middleBreadcrumbs = [],
                firstBreadcrumb = [];

            // remove the old resize event
            if (viewModel.resizeFunction() !== undefined) {
                $outerContainer.removeResize(viewModel.resizeFunction());
            }

            if ($innerContainer.hasClass('breadcrumbs-truncated')) {
                $innerContainer.removeClass('breadcrumbs-truncated');
                $innerContainer.find('.hide-breadcrumb').removeClass('hide-breadcrumb');
                $innerContainer.find('.breadcrumb-ellipsis').removeClass('breadcrumb-ellipsis');
            }

            if (breadcrumbsLength > 3) {

                $.each($breadcrumbs, function (i, breadcrumb) {
                    if (i === 0) {
                        firstBreadcrumb.push(breadcrumb);
                    } else if (i !== lastBreadcrumbIndex && i !== secondToLastBreadcrumbIndex) {
                        middleBreadcrumbs.push(breadcrumb);
                    }
                });

            }

            var $firstBreadcrumb = $(firstBreadcrumb),
                $middleBreadcrumbs = $(middleBreadcrumbs),
                truncated = false,
                innerContainerWidth = $innerContainer.outerWidth(),
                breadcrumbsWidth = function () {

                    var outerContainerWidth = $outerContainer.outerWidth();

                    if (innerContainerWidth > outerContainerWidth) {
                        if (!truncated) {
                            truncated = true;
                            $innerContainer.addClass('breadcrumbs-truncated');
                            $middleBreadcrumbs.addClass('hide-breadcrumb');
                            $firstBreadcrumb.addClass('breadcrumb-ellipsis');
                        }
                    } else if (innerContainerWidth <= outerContainerWidth) {
                        if (truncated) {
                            truncated = false;
                            $innerContainer.removeClass('breadcrumbs-truncated');
                            $middleBreadcrumbs.removeClass('hide-breadcrumb');
                            $firstBreadcrumb.removeClass('breadcrumb-ellipsis');
                        }
                    }

                };

            viewModel.resizeFunction(breadcrumbsWidth);

            // Run initially on page load
            viewModel.resizeFunction();

            // reset the flag
            viewModel.breadcrumbFlag(false);

            // configure the new resize event
            $outerContainer.resize(viewModel.resizeFunction());

        }

    }
};
// Help Desk Custom Binding Handlers

ko.bindingHandlers.hideTicket = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $element = $(element),
            tickets = valueAccessor().tickets,
            maxTickets = bindingContext.$parents[1].maxTicketsToShow,
            baseTickets = bindingContext.$parents[1].baseTicketsToShow,
            ticketIndex = valueAccessor().index;

        if(tickets.length > maxTickets && ticketIndex > (baseTickets - 1)) {
            $element.hide();
        }

    }
};

ko.bindingHandlers.maxTicketsToShow = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        viewModel.maxTicketsToShow = valueAccessor();
    }
};

ko.bindingHandlers.baseTicketsToShow = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        viewModel.baseTicketsToShow = valueAccessor();
    }
};

ko.bindingHandlers.hiddenTicketsNumber = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $element = $(element),
            tickets = valueAccessor(),
            baseTickets = bindingContext.$parent.baseTicketsToShow;

        $element.text(tickets.length - baseTickets);

    }
};

ko.bindingHandlers.ticketStatus = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var status = valueAccessor(),
            statusId = status.replace(/\s+/g, '-');

        statusId = statusId.toLowerCase();

        $(element).addClass(statusId);
    }
};

ko.bindingHandlers.timeFromNow = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor()());

        if (date) {
            $(element).text(date.fromNow());
        }
    }
};

ko.bindingHandlers.fullDate = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor()());

        if (date) {
            $(element).text(date.format("MMM D, YYYY"));
        }
    }
};

ko.bindingHandlers.dateWithoutYear = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("MMM D"));
        }
    }
};

ko.bindingHandlers.month = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("MMM"));
        }
    }
};

ko.bindingHandlers.dayOfMonth = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("D"));
        }
    }
};

ko.bindingHandlers.time = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("h:mm A"));
        }
    }
};

ko.bindingHandlers.datetime = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var date = moment(valueAccessor());

        if (date) {
            $(element).text(date.format("ll") + " at " + date.format("h:mm A"));
        }
    }
};

ko.bindingHandlers.dayStatus = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $container = $(element),
            day = valueAccessor(),
            status = day.stepType,
            subStepType = day.subStepType;

        if (status && status !== 'none') {
            $container.addClass('mettel-' + status + '-status');
        }

        if (subStepType && subStepType !== 'none') {
            $container.addClass('mettel-' + subStepType + '-status');
        }

        if (day.changeBegin) {
            $container.addClass('mettel-step-change-begin');
        }

        if (day.changeEnd) {
            $container.addClass('mettel-step-change-end');
        }

        if (day.linkToNext) {
            $container.addClass('mettel-link-next');
        }

        if (day.repeatNext) {
            $container.addClass('mettel-repeat-next');
        }

        if (day.repeatPrevious) {
            $container.addClass('mettel-repeat-previous');
        }

        if (day.todayBegin) {
            $container.addClass('mettel-today-begin');
        }

        if (day.historyEnd) {
            $container.addClass('mettel-history-end');
        }

        if (day.note) {
            $container.addClass('mettel-note');
        }

        if (day.alert) {
            $container.addClass('mettel-alert');
        }
    }
};

ko.bindingHandlers.issueAlert = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $container = $(element),
            alertStatus = valueAccessor().alert;

        if (alertStatus) {
            $container.addClass('mettel-alert');
        }
    }
};

ko.bindingHandlers.dateStatus = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $container = $(element),
            date = valueAccessor();

        if (date.hideDate) {
            $container.addClass('mettel-hide-date');
        }

        if (date.today) {
            $container.addClass('mettel-today');
        }

        if (date.todayBegin) {
            $container.addClass('mettel-today-begin');
        }

        if (date.historyEnd) {
            $container.addClass('mettel-history-end');
        }
    }
};

ko.bindingHandlers.timelineTooltipTrigger = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var day = valueAccessor(),
            $tooltipTrigger = $(element);

        setTimeout(function() {
            if (day.tooltip) {
                $tooltipTrigger.mettelTooltip({ position: 'top' });
            }
        }, 1);
    }
};

// Snapshot
ko.bindingHandlers.ticketSnapshot = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.ticket.endPoints = options.endPoints;
            viewModel.ticket.queryParams = options.queryParams;
            viewModel.ticket.actionCallback = options.actionCallback;
            viewModel.ticket.menuActionCallback = options.menuActionCallback;
            viewModel.ticket.workTicketCallback = options.workTicketCallback;
            viewModel.ticket.lineLinkCallback = options.lineLinkCallback;
            viewModel.ticket.closeTicketCallback = options.closeTicketCallback;
            viewModel.ticket.viewRequest = options.viewRequest;
            viewModel.locationBar.endPoints = options.locationBar.endPoints;
            viewModel.locationBar.openTicketsBlock = options.locationBar.openTicketsBlock;
        }

        viewModel.ticket.init();

        ko.applyBindingsToNode(element, { template: { name: 'ticket-snapshot', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.gridTicketSnapshot = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.ticket.endPoints = options.endPoints;
            viewModel.ticket.queryParams = options.queryParams;
            viewModel.ticket.actionCallback = options.actionCallback;
            viewModel.ticket.workTicketCallback = options.workTicketCallback;
            viewModel.ticket.enableAttachments(options.enableAttachments);
            viewModel.ticket.lineLinkCallback = options.lineLinkCallback;
            viewModel.ticket.closeTicketCallback = options.closeTicketCallback;
            viewModel.ticket.viewRequest = options.viewRequest;
            viewModel.ticket.currentUser = ko.observable(options.currentUser);

            if (options.hideNewNoteForm) {
                viewModel.ticket.hideNewNoteForm(options.hideNewNoteForm);
            }

            viewModel.ticket.approveTicketCallback = options.approveTicketCallback;
            viewModel.ticket.modifyTicketCallback = options.modifyTicketCallback;
            viewModel.ticket.rejectTicketCallback = options.rejectTicketCallback;
            viewModel.ticket.reminderTicketCallback = options.reminderTicketCallback;
            viewModel.ticket.newNoteCharacterLimit = options.newNoteCharacterLimit ? options.newNoteCharacterLimit : false;

            viewModel.locationBar.endPoints = options.locationBar.endPoints;
            viewModel.locationBar.openTicketsBlock = options.locationBar.openTicketsBlock;
        }

        ko.applyBindingsToNode(element, { template: { name: 'ticket-snapshot', data: viewModel } }, bindingContext);

        $('.mettel-ticket-snapshot-close').focus();

        $('.mettel-ticket-snapshot-favorite').focus(function() {
            $(this).parent().addClass('mettel-ticket-snapshot-favorite-focused');
        });

        $('.mettel-ticket-snapshot-favorite').blur(function() {
            $(this).parent().removeClass('mettel-ticket-snapshot-favorite-focused');
        });

        return { controlsDescendantBindings: true };
    }
};

//  General

ko.bindingHandlers.lastInArray = {
    // Pass in an array as the valueAccessor, and the last value in the array is set as the text for the element
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            array = valueAccessor();
        $element.text(_.last(array));
    }
};

function HelpDeskMapModel() {
    var self = this;

    // Extend Base Map Model
    MetTel.BaseMapModel.apply(this);

    // Setup subscribe to change map data
    this.queryParams.subscribe(function () {
        if (self.mapInitialized()) {
            self.clearMarkers();
            self.fetchMapData();
        }
    });

    // This sets the observables on the locations data from the server
    this.setLocations = function (data, endPoints) {

        if (data && data.locations) {

            $.each(data.locations, function (i, location) {
                var newLocation = new LocationModel(endPoints.getLocationData, location, self);

                if (newLocation.init) {
                    newLocation.init();
                }

                data.locations[i] = newLocation;
            });
        }

        self.locations(data.locations);
    };
}

ko.bindingHandlers.mapLocation = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var location = valueAccessor(),
            $element = $(element),
            locationModel = viewModel,
            helpDeskModel = bindingContext.$parent,
            map = helpDeskModel.map,
            $newRing = $element.find('.mettel-ring-new'),
            $inProgressRing = $element.find('.mettel-ring-in-progress'),
            $resolvedRing = $element.find('.mettel-ring-resolved'),
            $closedRing = $element.find('.mettel-ring-closed'),
            $historyContainer = $element.find('[data-mettel-class="weather-history-container"]'),
            minSize = 10,
            paddingMultiplier;

        var processRings = function () {
            setRingMultiplier();
            setRingSizes();
        };

        // Sets multiplier based on zoom level
        var setRingMultiplier = function () {
            var zoomLevel = map.getZoom();

            paddingMultiplier = ((zoomLevel + 1) / 30) * 2;
        };

        // Set sizes of rings based on types of tickets
        var setRingSizes = function () {

            function buildCircle(ring, tickets) {
                ring.css({
                    'padding': Math.ceil(paddingMultiplier * tickets) + 'px',
                    'min-width': minSize + 'px',
                    'min-height': minSize + 'px',
                    'border-width': tickets > 0 ? '1px' : '0'
                });
            }

            // If there are any closed tickets, build the closed ring.
            if (locationModel.closedTickets) {
                buildCircle($closedRing, locationModel.closedTickets);
            }

            // If there are any resolved tickets, build the resolved ring.
            if (locationModel.resolvedTickets) {
                buildCircle($resolvedRing, locationModel.resolvedTickets);
            } else {
                // There are no resolved tickets
                if (!locationModel.newTickets && !locationModel.inProgressTickets) {
                    // And if there are no new tickets and no in progress tickets, hide the resolved ring which also hides the two within.
                    $resolvedRing.hide();
                }
            }

            // If there are any in progress tickets, build the in progress ring.
            if (locationModel.inProgressTickets) {
                buildCircle($inProgressRing, locationModel.inProgressTickets);
            } else {
                // There are no in progress tickets
                if (!locationModel.newTickets) {
                    // And if there are no new tickets, hide the in progress ring which also hides the new tickets.
                    $inProgressRing.hide();
                }
            }

            // If there are any new tickets, build the new ring.
            if (locationModel.newTickets) {
                buildCircle($newRing, locationModel.newTickets);
            } else {
                // If there are no new tickets, hide the new ring.
                $newRing.hide();
            }

        };

        // Show the tooltip
        var showTooltip = function () {

            // Center tooltip
            centerTooltip();

            // and show it
            $historyContainer.show();

            // bring dot and tooltip to front by z-index
            $element.addClass('mettel-state-active');

        };

        // Hide the tooltip
        var hideTooltip = function () {
            $historyContainer.hide();
            $element.removeClass('mettel-state-active');
        };

        // Center tooltip
        var centerTooltip = function () {
            $historyContainer.css({
                'margin-left': ($historyContainer.outerWidth() / 2) * -1 + 'px'
            });
        };

        // Set up location events
        $element.on({
            'mouseenter': function () {

                if (locationModel.visitedLocation()) {
                    // Show the tooltip immediately if they've fetched the weather for this location already
                    showTooltip();

                } else {

                    // Timeout to prevent accidental hovers on locations, thus API calls to weather
                    var tooltipTimeout = setTimeout(function () {

                        locationModel.getWeather(function () {
                            centerTooltip();
                        });

                        // Now, show the tooltip
                        showTooltip();

                    }, 500);

                    // Attach the timeout to the element so it can be cleared in mouseout
                    $element.data('timeout', tooltipTimeout);

                }

            },
            'mouseleave': function () {

                // Clear th fetch for the weather
                clearTimeout($element.data('timeout'));

                // hide location tooltip
                hideTooltip();

            }
        });

        // Plop the marker on the page
        var marker = new RichMarker({
            position: new google.maps.LatLng(location.latitude, location.longitude),
            anchor: RichMarkerPosition.MIDDLE,
            map: map,
            draggable: false,
            shadow: 0,
            content: element
        });

        helpDeskModel.markers.push(marker);

        // Zoom event handler
        google.maps.event.addListener(map, 'zoom_changed', function () {
            processRings();
        });

        processRings();

    }

};

ko.bindingHandlers.helpDeskMap = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.locationCallback = options.locationCallback;
            viewModel.openTicketsBlock = options.openTicketsBlock;
            viewModel.bounds = options.bounds;
            viewModel.queryParams(options.queryParams);

            viewModel.init();
        }

        ko.applyBindingsToNode(element, {
            template: {
                name: 'help-desk-map',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

function NotificationsModel() {
    var self = this;

    // onLoad variable for new notifications bar animation
    this.newNotificationsInitialized = ko.observable(false);

    // onLoad variable for notifications panel animation
    this.panelInitialized = ko.observable(false);

    // The base array of viewed notifications
    this.viewableNotifications = ko.observableArray();

    // The array of new notifications while panel is open
    this.pendingNotifications = ko.observableArray();

    // The total number of notifications
    this.notificationsCount = ko.observable();

    // Boolean indicating if notifications panel is open
    this.notificationsOpen = ko.observable(true);

    this.toggleNotificationsOpen = function () {

        // If notifications panel is being closed, make pending notifications viewable
        if (self.notificationsOpen() === true) {
            self.combineNotifications();
        }

        // Open/close the notifications panel
        self.notificationsOpen(!self.notificationsOpen());
    };

    this.closeNotifications = function () {

        // If notifications panel is being closed, make pending notifications viewable
        if (self.notificationsOpen()) {
            self.combineNotifications();

            // Close the notifications panel
            self.notificationsOpen(!self.notificationsOpen());
        }
    };

    // The actual filter for the notifications
    this.notificationsFilter = ko.observable();

    // Query parameter related observables/functions
    this.queryParams = ko.observable();

    this.queryString = ko.computed(function () {
        var queryString = '';
        if (self.queryParams()) {
            ko.utils.arrayForEach(_.keys(self.queryParams()), function (key) {

                if (queryString) {
                    queryString += "&";
                }

                queryString += key + "=" + self.queryParams()[key];
            });
        }

        return queryString ? '?' + queryString : '';
    });

    this.cloneQueryParams = function () {
        return $.extend({}, self.queryParams() ? self.queryParams() : {});  //Cloning the params
    };

    this.addQueryParams = function (params) {
        var clonedParams = self.cloneQueryParams(),
            keys = _.keys(params);

        _.each(keys, function (key) {
            clonedParams[key] = params[key];
        });

        self.queryParams(clonedParams);
    };

    this.removeQueryParams = function (params) {
        var clonedParams = self.cloneQueryParams();

        if (_.isArray(params)) {
            _.each(params, function (name) {
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

    // Adds necessary observables to each new notification
    this.prepareNotification = function (notification) {

        // For each notification, add a moreOptions observable which is for the more options overlay
        notification.moreOptions = ko.observable(false);

        // If the notification has actions
        if (notification.actions) {

            // Setup the observable for the notification in reference to the action buttons if a default action exists
            notification.activeActionId = ko.observable(notification.actions.defaultAction).extend({
                notify: 'always'
            });

            // Setting up the subscribe for the action button
            notification.activeActionId.subscribe(function (newValue) {
                self.actionCallback(notification, newValue);
            });

            // Create the overlay observable
            notification.activeAction = ko.observable(notification.actions.defaultAction);
        }

        // Add an observable for when the notification needs to be removed
        notification.removeNotif = ko.observable(false);

    };

    // Preps the new notification data
    this.buildNotifications = function (data) {

        // Build out the notifications array
        var notifications = [];
        ko.utils.arrayForEach(data.notifications, function (notification) {

            self.prepareNotification(notification);
            notifications.push(notification);
        });

        // Set the value of the notifications
        self.viewableNotifications(notifications);

    };

    // Function to be called server-side to send a new notification in
    this.receiveNotification = function (newNotification) {
        self.prepareNotification(newNotification.notification);

        // Add the newly prepared notification to the pending array
        self.pendingNotifications.unshift(newNotification.notification);

        // Set total count of notifications from the new data
        self.notificationsCount(newNotification.count);

        // If the notifications panel is closed, make the pending notifications viewable
        if (!self.notificationsOpen()) {
            self.combineNotifications();
        }

    };

    // Make pending notifications viewable
    this.combineNotifications = function () {

        if (self.pendingNotifications().length > 0) {

            // Post to the server to mark pending notifications as viewable
            $.post(self.endPoints.markNotificationsViewable, function (data) {

                // If no filters are applied
                if (self.notificationsFilter() === '') {

                    // Add pending notifications to viewable array
                    self.viewableNotifications(self.pendingNotifications().concat(self.viewableNotifications()));

                } else {

                    // Else run initial ajax call to get all notifications with markAllViewable true params
                    self.init();
                }

                // Then empty pendingNotifications array
                self.pendingNotifications.removeAll();

                // console.log(data);

            }, 'text');

        }

    };

    // Trigger the Notification Option custom callback
    this.notificationOption = function (option, notification) {
        if (self.notificationOptionEvent) {
            self.notificationOptionEvent(option, notification);
        }
    };

    // Remove a notifation - to be triggered if Dismiss or Mark Read is clicked
    this.removeNotification = function (notification) {

        // Trigger slide up animation
        notification.removeNotif(true);

        // Decrement the count by one
        self.notificationsCount(self.notificationsCount() - 1);

        // Remove the notification from the viewable array after the animation is done
        setTimeout(function () {
            self.viewableNotifications.remove(notification);
        }, 400);

    };

    // Trigger the Send Private Message custom callback
    this.privateMessage = function () {
        if (self.privateMessageEvent) {
            self.privateMessageEvent();
        }
    };

    // Notifications Filter
    this.setNotificationsFilter = function (filter) {
        self.notificationsFilter(filter);

        // Let server know to not to send down pending notifications
        self.addQueryParams({ markAllViewable: false });

        // Set new filter params
        self.addQueryParams({ category: filter });

        var strURL = self.endPoints.getHelpDeskNotificationsData + self.queryString();

        // AJAX call to filter results by category
        $.getJSON(strURL, function (data) {

            self.buildNotifications(data);

        });
    };

    // Get notification data for the first time
    this.init = function () {

        // Clear any filter params
        self.removeQueryParams('category');

        // Let server know to send down all notifications as viewable
        self.addQueryParams({ markAllViewable: true });

        var strURL = self.endPoints.getHelpDeskNotificationsData + self.queryString();

        // Go fetch the notifications data.
        $.getJSON(strURL,function (data) {

            self.buildNotifications(data);

            // Set total count of notifications
            self.notificationsCount(data.count);

        }).done(function () {

                self.notificationsFilter('');

                self.panelInitialized(true);

            });

    };

}

ko.bindingHandlers.helpDeskNotifications = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.actionCallback = options.actionCallback;
            viewModel.queryParams(options.queryParams);
            viewModel.notificationOptionEvent = options.notificationOptionEvent;
            viewModel.privateMessageEvent = options.privateMessageEvent;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'help-desk-notifications',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.notification = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $element = $(element),
            notification = valueAccessor(),
            $optionsList = $(notification.options),
            openOrReplyOption = {};

        // Check the notification for the open or reply option
        $.each($optionsList, function (i, option) {
            if (option.id === 2 || option.id === 5) {
                openOrReplyOption = option;
            }
        });

        // On double click of the notification, fire the notificationOptionEvent with the open/reply option and the notification
        $element.on('dblclick', function (event) {
            if (event.target.tagName !== 'BUTTON') {
                bindingContext.$parent.notificationOptionEvent(openOrReplyOption, notification);
            }
        });

    },

    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var $element = $(element),
            notification = valueAccessor();

        // Animate notification out of view
        if (notification.removeNotif()) {
            $element.parent().slideUp();
        }

    }

};

ko.bindingHandlers.showNotifications = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $body = $('body'),
            $page = $body.find('[data-mettel-class="page"]'),
            $pageInner = $page.find('[data-mettel-class="page-inner"]'),
            $pageHeader = $('.mettel-header'),
            show = valueAccessor(),
            animationDuration = 400;

        // tabindex updates when opening and closing
        var inputs = $('.mettel-notifications-outer').find(MetTel.Variables.focusableSelectors),
            tabindex = show ? 0 : -1,
            focusTarget = show ? '.mettel-notifications-close-button' : '.mettel-notifications-toggle';

        $(inputs).attr( { 'tabindex': tabindex } );
        $(focusTarget).focus();

        if (!viewModel.panelInitialized()) {

            // On load prevent animations
            $page.addClass('mettel-notifications-open-static');

        } else {

            // Once loaded allow animations
            $page.removeClass('mettel-notifications-open-static');

        }

        if (!viewModel.panelInitialized() && !Modernizr.csstransitions) {

            // On load in IE9 display notifications panel open without animation
            $page.css("padding-right", "192px");
            $pageHeader.css("right", "192px");
            $pageInner.css("right", "192px");

        }

        if (show) {

            // Animate panel sliding in
            if (!Modernizr.csstransitions) {

                // For IE9 since transitions aren't supported
                $page.animate({
                    "padding-right": "192px"
                }, animationDuration);
                $pageHeader.animate({
                    "right": "192px"
                }, animationDuration);
                $pageInner.animate({
                    "right": "192px"
                }, animationDuration);

            } else {

                // For other newer browsers
                $page.addClass('mettel-notifications-open');

            }

        } else {

            // Animate panel sliding out
            if (!Modernizr.csstransitions) {

                // For IE9 since transitions aren't supported
                $page.animate({
                    "padding-right": 0
                }, animationDuration);
                $pageHeader.animate({
                    "right": 0
                }, animationDuration);
                $pageInner.animate({
                    "right": 0
                }, animationDuration);

            } else {

                // For other newer browsers
                $page.removeClass('mettel-notifications-open');

            }
        }

    }
};

ko.bindingHandlers.showNewNotifications = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $notifListOuter = $('.mettel-notifications-list-outer'),
            notifications = valueAccessor();

        if (notifications.length > 0) {
            $element.slideDown();

            // Without flexbox, use animations to change absolute position of list container
            if (!Modernizr.flexbox || !Modernizr.flexboxlegacy) {
                $notifListOuter.animate({
                    "top": "77px"
                }, 400);
            }

        } else {
            if (!viewModel.newNotificationsInitialized()) {
                $element.hide();
                viewModel.newNotificationsInitialized(true);
            } else {
                $element.delay(1000).slideUp();

                // Without flexbox, use animations to change absolute position of list container
                if (!Modernizr.flexbox || !Modernizr.flexboxlegacy) {
                    $notifListOuter.delay(1000).animate({
                        "top": "45px"
                    }, 400);
                }
            }

        }
    }
};

ko.bindingHandlers.showNotification = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.hide().fadeIn();
    }
};

ko.bindingHandlers.notificationsHeight = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $notifsContainer = $(element),
            $window = $(window),
            $windowHeight = $window.height(),
            $federalBanner = $('.federal_banner'),
            $federalBannerHeight = $federalBanner.outerHeight();

        if ($federalBanner.length > 0) {
            $windowHeight -= $federalBannerHeight;
        }

        $notifsContainer.css('height', $windowHeight + 'px');

        $window.resize(function () {
            $windowHeight = $window.height();
            if ($federalBanner.length > 0) {
                $windowHeight -= $federalBannerHeight;
            }
            $notifsContainer.css('height', $windowHeight + 'px');
        });

    }
};


ko.bindingHandlers.notificationFilterTooltip = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $tooltipTrigger = $(element),
            text = $.trim($(element).text()),
            pos = "top",
            left = 0;

        if (MetTel.Utils.stricmp(text, 'information')) {
            left = -26;
        }

        setTimeout(function () {
            $tooltipTrigger.mettelTooltip({
                position: pos,
                hoverDelay: 100,
                offsetLeft: left
            });
        }, 1);

    }
};
var HierarchyNodeModel = function (level, node) {
    var self = this;

    self.level = level;
    self.title = ko.observable(node.title);
    self.key = ko.observable(node.key);
    self.isEditable = ko.observable(node.isEditable);
    self.isLazy = node.isLazy;
    self.expand = node.expand;
    self.children = ko.observableArray([]);
    self.rowCount = ko.observable(0);               // grid will set this
    self.newNodeTitle = ko.observable();            // title of new node to be added
    self.isCollapsed = ko.observable(false);        // node shows as collapsed
    self.isEllipsis = ko.observable(false);         // node shows as ellipsis
    self.isSelected = ko.observable(false);         // whether node is selected
    self.isOpen = ko.observable(false);             // open flag, only for collapsed mode
    self.isFolder = ko.observable(false);
    self.status = (node.status !== undefined) ? ko.observable(node.status) : ko.observable("complete");
    self.duplicateEntries = ko.observableArray();
    self.suggestedTitle = ko.observable();
    // ability to get the queryString from HierarchyModel
    self.hierarchyQueryString = ko.observable().subscribeTo("queryString", true);

    self.hasObject = ko.observable(node.hasObject);

    //used for caculate related objects count
    self.objectsJson = ko.observable(node.objectsNote);

    //caculate related objects count
    self.getRelatedObjectsCount = function () {
        var currentNode = this;
        var totalCount = 0;
        var parentJsonObject = JSON.parse(currentNode.objectsJson());
        //calculate parent node's objects
        _.each(parentJsonObject, function (value, key) {
            totalCount += value;
        });
        if (currentNode.children().length) {
            //calculate children's objects
            _.each(currentNode.children(), function (node) {
                totalCount += node.getRelatedObjectsCount();
            });
        }
        return totalCount;
    };

    self.selectedChild = ko.computed(function() {
        var foundNode = null;
        _.each(self.children(), function(node) {
            if (node.isSelected()) {
                foundNode = node;
            }
        });
        return foundNode;
    });

    // show the title of the child if it is selected else show 'All'
    self.selectedTitle = ko.computed(function(){
        return self.selectedChild() !== null ? self.selectedChild().title() : 'All';
    });

    self.selectedRowCount = ko.computed(function () {
        return self.selectedChild() !== null ? self.selectedChild().rowCount() : null;
    });

    self.hasChildren = ko.computed(function() {
        return self.children().length > 0;
    });

    if (node.children) {
        self.isFolder(true);

        if (node.children.length) {
            self.children($.map(node.children, function (child) {
                return new HierarchyNodeModel(self.level + 1, child);
            }));
        }
    }
    else if (node.children === undefined) {
        self.status("object");
    }

    // this is called when clicking on a "header"
    self.toggleOpen = function(parent) {

        // if clicking the ellipsis, reset the menu
        if (self.isEllipsis()) {
            parent.resetHierarchy();
        }
        else {
            // "close" all selected nodes except this one
            _.map(_.reject(parent.selectedNodes(), function(item) { return item === self; }), function(node) {
                node.isOpen(false);
            });

            // toggle the node that was clicked
            self.isOpen(!(self.isOpen()));
        }
    };

    // height calculation
    ko.bindingHandlers.calculateHeight = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var objNodeParent = bindingContext.$parent;
            var mode = objNodeParent.mode();

            // only do stuff if isOpen is true
            if (value && (mode === 'collapse')) {
                var $element = $(element),
                    windowHeight = $(window).height(),
                    availableHeight = 0;

                // reset to natural height
                $element.css('height', 'auto');

                var elementsToMeasure = [$('.mettel-header'), $('.mettel-breadcrumbs'), $('.mettel-footer')],
                    $gridControlsContainer = $('.mettel-grid-controls');

                // grid controls contains hierarchy if it exists, so only include one to be measured
                if ($gridControlsContainer.length) {
                    elementsToMeasure.push($gridControlsContainer);
                } else {
                    elementsToMeasure.push($('.mettel-hierarchy'));
                }

                $.each(elementsToMeasure, function(i, element){
                   if(element.length) {
                       availableHeight += element.outerHeight();
                   }
                });

                availableHeight = windowHeight - availableHeight;

                if ($element.outerHeight() > availableHeight) {
                    $element.height(availableHeight);
                    $element.addClass('mettel-hierarchy-list-long');
                }
                else {
                    $element.removeClass('mettel-hierarchy-list-long');
                }

            }
        }
    };

    // handle clicking of icons beside the nodes
    ko.bindingHandlers.modalWindow = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $rootModel = null,
                $grid = $(element).parents('.mettel-grid');

            if ($grid.length > 0){
                // grid w/hierarchy
                if (bindingContext.$root.hierarchyModel) {
                    $rootModel = bindingContext.$root.hierarchyModel();
                }
            }
            else {
               // standalone hierarchy
                $rootModel = bindingContext.$root;
            }

            if ($rootModel && $rootModel.actions) {
                if ($rootModel.actions.editModalEvent && jQuery.isFunction($rootModel.actions.editModalEvent)) {
                    $rootModel.actions.editModalEvent(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                }
            }

        }
    };

};

var HierarchyModel = function (options) {
    var self = this;
    self.options = options ? options : {};

    // info to call server
    self.endPoints = self.options.endPoints;
    self.queryParams = ko.observable(self.options.queryParams);
    self.queryString = ko.computed(function() {
        var queryString = '';
        if (self.queryParams()) {
            ko.utils.arrayForEach(_.keys(self.queryParams()), function (key) {
                if (queryString) {
                    queryString += "&";
                }

                //Joy added encodeURIComponent to deal with special character
                queryString += key + "=" + encodeURIComponent(self.queryParams()[key]);
            });
        }

        return queryString ? '?' + queryString : '';
    });

    self.initialRowCount = ko.observable(undefined);

    self.actions = self.options.actions;

    self.allowAdminMode = ko.observable(self.options.allowAdminMode !== undefined ? self.options.allowAdminMode : true);

    self.loading = ko.observable(false);

    self.queryString.publishOn("queryString");

    self.mode = ko.observable('collapse');      // collapse, expand, admin
    self.selectedNodes = ko.observableArray();  // a list of all selected nodes

    // this is used only in conjunction with the grid
    // and will only change after all selectedNodes updates have been made
    // so that grid updates are only done upon completion of selectedNodes updates
    self.selectedNodeFinished = ko.observable(false);

    // page height observable
    self.pageHeight = ko.observable();

    // selected nodes, excluding "objects" which are not shown
    self.selectedFolders = ko.computed(function() {
        var folders = _.filter(self.selectedNodes(), function(node) {
            return node.status() !== "object";
        });
        return folders;
    });

    self.hasEllipsis = ko.computed(function() {
        return self.selectedNodes().length > 0 ? self.selectedNodes()[0].isEllipsis() : false;
    });

    self.toggleCollapse = function() {
        self.mode(self.mode() === 'collapse' ? 'expand' : 'collapse');

        // close all "open" nodes when entering 'collapse' mode
        if (self.mode() === 'collapse') {
            _.each(self.selectedNodes(), function(node) {
                if (node.isOpen()) {
                    node.isOpen(false);
                }
            });
        }
    };
    self.toggleAdmin = function () {
        self.mode(self.mode() === 'expand' ? 'admin' : 'expand');
    };

    self.previousMode = ko.observable(self.mode());

    self.mode.subscribe(function(newValue) {
        if (newValue === 'admin') {
            self.init('adminHierarchyData');
        }
        else {
            if (self.previousMode() === 'admin') {
                self.init('getHierarchyData');
            }
        }
    });

    // keep track of "previous" mode, since we'll need to change datasets if
    // changing mode from "admin"
    self.mode.subscribe(function(oldValue) {
        self.previousMode(oldValue);
    }, null, "beforeChange");

    self.setRowCount = function(rowCount) {
        if (self.selectedNodes().length > 0) {
           self.selectedNodes()[self.selectedNodes().length - 1].rowCount(rowCount);
        }
    };

    self.addNode = function(parent) {
        var myself = this;
        if (myself.newNodeTitle()) {
            // new nodes will always be empty folders, so need an empty children array
            var objNewNode = {
                'title': myself.newNodeTitle(),
                'level': myself.level + 1,
                'isLazy': true,
                'status': "loading",
                'isEditable': myself.isEditable(),
                'children': []
            };

            var koNewNode = new HierarchyNodeModel(objNewNode.level, objNewNode);
            myself.children.push(koNewNode);

            //Joy modified: key may contain special character which will disturb url, put key in post content
            //var strURL = self.endPoints.addHierarchyData + myself.key() + self.queryString();
            var strURL = self.endPoints.addHierarchyData + self.queryString();

            // // some hackeration so we can test success and failure more easily
            // // TODO: should be removed in production environment
            // if (myself.newNodeTitle().toLowerCase() === "duplicate") {
            //     strURL = "/api/hierarchy/location-fail-duplicate/";
            // }
            // else if (myself.newNodeTitle().toLowerCase() === "suggestion") {
            //     strURL = "/api/hierarchy/location-fail-suggestion/";
            // }

            //add hierarchy to database
            console.log("Add hierarchy, key: " + myself.key() + ", title: " + myself.newNodeTitle());
            $.ajax({
                url: strURL,
                type: "POST",
                data: {
                    title: myself.newNodeTitle(),
                    key: myself.key() //Joy added: key may contain special character which will disturb url
                },
                error: function (data) {
                    var objResponse = data.responseJSON;

                    if (objResponse.type === "duplicate") {
                        koNewNode.key(objResponse.key);
                        _.each(objResponse.data.duplicates, function (duplicate, index) {
                            koNewNode.duplicateEntries.push(duplicate);
                        });
                    }
                    else if (objResponse.type === "suggestion") {
                        koNewNode.key(objResponse.key);
                        koNewNode.suggestedTitle(objResponse.data.suggested);
                    }
                    else {
                        var $errorModal = $('.mettel-modal-dialog.mettel-server-error');
                        var $errorHeader = $errorModal.find('.mettel-modal-subheader');
                        //show error details from backend
                        if (objResponse.type === "exception") {
                            $errorHeader.html(objResponse.message);
                        }
                        $errorModal.modalWindow({
                            close: function () {
                                myself.children.pop(koNewNode);
                            }
                        });
                    }
                    koNewNode.status("alert");
                },
                success: function (data) {
                    myself.newNodeTitle('');

                    if (data.status === "complete") {
                        koNewNode.key(data.key);
                        koNewNode.status("complete");
                        koNewNode.hasObject(data.hasObject);
                        //used for caculate related objects count
                        koNewNode.objectsJson(data.objectsNote);
                    }
                    else {
                        $('.mettel-modal-dialog.mettel-server-error').modalWindow({
                            close: function () {
                                myself.children.pop(koNewNode);
                            }
                        });
                    }
                }
            });
        }
        else {
            var $errorModal = $('.mettel-modal-dialog.mettel-server-error');
            var $errorHeader = $errorModal.find('.mettel-modal-subheader');
            $errorHeader.html("Please type a valid hierarchy value.");
            $errorModal.modalWindow();
        }
    };

    self.clickHeader = function (node) {
        // for initial closed state, root node should toggle
        if ((node.isSelected() === true) || (node.level === 0)) {
            node.toggleOpen(self);
        }

        // if only clicking back one level, do nothing
        if ((self.selectedFolders().length - node.level) > 2) {
            self.selectNode(node.selectedChild());
            node.isOpen(true);
        }

    };

    self.selectNode = function (node) {

        // remove selected nodes that's at the same level or higher
        self.selectedNodes.remove(function (selectedNode) {
            if (selectedNode.level >= node.level) {
                selectedNode.isSelected(false);
                return true;
            } else {
                selectedNode.isOpen(false);
                return false;
            }
        });

        self.selectedNodes.push(node);

        // once there are more than 3 folders, turn ellipsis on
        if (self.selectedFolders().length > 3) {
            self.selectedNodes()[0].isEllipsis(true);
        }

        // beginning level nodes need to be collapsed if the menu has ellipsis the selected node level is 3+
        if (self.hasEllipsis() && (node.status() !== "object")) {
            $.each(self.selectedFolders(), function () {
                var flgIsCollapsed = this.level + 3 <= node.level;

                if (flgIsCollapsed) {
                    this.isCollapsed(true);
                }

                if (flgIsCollapsed && (this.level === 0)) {
                    this.isCollapsed(false);
                }
            });
        }

        /*
            JW: the old way to get grand children is too slow and will send out hundreds of ajax request if a node has hundreds of child nodes. the backend will return isLazy only if this node has children nodes, if isLazy is true then we will get next level nodes.
        */
        if (node.isLazy && node.children().length === 0) {
            $.getJSON(self.endPoints.getHierarchyData + self.queryString(), { key: node.key }, function (data) {
                if (data && data.children && data.children.length) {
                    node.children($.map(data.children, function (child) {
                        return new HierarchyNodeModel(node.level + 1, child);
                    }));
                }
                node.isLazy = false;
            });
        }

        node.isCollapsed(false);
        node.isEllipsis(false);
        node.isSelected(true);

        self.selectedNodeFinished(!(self.selectedNodeFinished()));

        self.actionCallbackFunction();
    };

    self.resetHierarchy = function() {
        self.selectedNodes.remove(function (selectedNode) {
            if (selectedNode.level > 0) {
                selectedNode.isSelected(false);
                return true;
            } else {
                return false;
            }
        });
        self.selectedNodes()[0].isCollapsed(false).isEllipsis(false);

        self.actionCallbackFunction();
    };

    self.actionCallbackFunction = function() {
        if ($.isFunction(self.actionCallback)) {
            self.actionCallback(self.selectedNodes());
        }
    };

    self.expandNodes = function(node) {
        // if expand is true, 'open' the node
        if (node.expand) {
            node.isOpen(true);

            // root level node is already selected, so don't select it again
            if (node.level === 0) {
                // TODO: toggle into expanded mode so we can see the full path of expanded levels?
                // self.toggleCollapse();
            }
            // root level node is already selected, so don't add it again
            else {
                self.selectNode(node);
            }
        }

        // if there are children, check to see if they are expanded
        if (node.hasChildren()) {
            _.each(node.children(), function(node) {
                self.expandNodes(node);
            });
        }
    };

    // The selectNodeHandler is designed in such a way to allow it to be monkey patched by components such as a grid.
    self.selectNodeHandler = function(root) {
        // console.log("selectNodeHandler");
        // root.currentlySelectedNode.subscribe(function(node) {
        //     if (node && self.hierarchyActions().selectNode) {
        //         self.hierarchyActions().selectNode(node);
        //     }
        // });
    };

    // Dynamically look up the selectNodeHandler in case it is getting monkey patched.
    self.selectedNodeFinished.subscribe(function() {
        // passing back the HierarchyModel itself, so we can access selectedNodes
        self["selectNodeHandler"](self);
    });

    ko.bindingHandlers.updateHeight = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());

            // on initialization, set the height
            if (viewModel.pageHeight() === undefined) {
                viewModel.pageHeight($(window).height());
            }

            // observe resize event
            var throttled = _.throttle(function() {
                var windowHeight = $(window).height();

                // only do the work if the height has changed
                if (windowHeight !== viewModel.pageHeight()) {
                    var mode = self.mode();

                    // only do stuff if we're in collapse mode
                    if (mode === 'collapse') {
                        // see if there is an open node
                        var $openNodes = $('.mettel-hierarchy-selected-node.mettel-state-selected');

                        // only need to change height if there's an open node
                        if ($openNodes.length) {
                            var element = $($openNodes[0]).find('.mettel-hierarchy-selected-node-list');

                            var $element = $(element),
                                availableHeight = 0;

                            // reset to natural height
                            $element.css('height', 'auto');

                            $.each([$('.mettel-hierarchy'), $('.mettel-grid-controls'), $('.mettel-header'), $('.mettel-breadcrumbs')], function(i, element){
                               if(element.length) {
                                   availableHeight += element.outerHeight();
                               }
                            });

                            availableHeight = windowHeight - availableHeight;

                            if ($element.outerHeight() > availableHeight) {
                                $element.height(availableHeight);
                                $element.addClass('mettel-hierarchy-list-long');
                            }
                            else {
                                $element.removeClass('mettel-hierarchy-list-long');
                            }

                        }
                    }
                    viewModel.pageHeight(windowHeight);
                }
            }, 250);

            $(window).resize(throttled);
        }
    };

    // getting hierarchy data for the first time
    self.init = function(url) {

        var arrSelectedNodeData = [];

        _.each(self.selectedNodes(), function(node) {
            var objNode = {};
            objNode.title = node.title();
            objNode.key = node.key();
            objNode.level = node.level;
            arrSelectedNodeData.push(objNode);
        });

        var strSelectedNodeData = JSON.stringify(arrSelectedNodeData);

        // show loading indicator
        self.loading(true);

        $.getJSON(self.endPoints[url] + self.queryString(), strSelectedNodeData, function (data) {
            if (data !== null) {
                self.selectedNodes([new HierarchyNodeModel(0, data)]);
                self.expandNodes(self.selectedNodes()[0]);
            }
        })
        .done(function() {
            // stop showing the loading indicator
            self.loading(false);
            if (self.initialRowCount() !== undefined) {
                self.setRowCount(self.initialRowCount());
            }
        });
    };
};

ko.bindingHandlers.hierarchyMenu = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = $.extend({}, valueAccessor(), viewModel.options ? viewModel.options : {});

        if(options) {
            viewModel.endPoints = options.endPoints;
            viewModel.actions = options.actions ? options.actions : {};
            viewModel.allowAdminMode = options.allowAdminMode;
            viewModel.queryParams(options.queryParams);
            viewModel.actionCallback = options.actionCallback;
        }
        viewModel.init('getHierarchyData');

        ko.applyBindingsToNode(element, { template: { name: 'hierarchy-menu', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

function AssetModel(options) {
    var self = this;

    this.service = ko.observable();
    this.type = ko.observable();
    this.subType = ko.observable();
    this.accountLabel = ko.observable();
    this.accountId = ko.observable();
    this.hierarchy = ko.observableArray();
    this.tickets = ko.observableArray();
    this.visitedAsset = ko.observable(false);

    // Asset-related callbacks
    this.triggerAccountCallback = function (accountLabel) {
        options.mapModel.accountCallback(accountLabel);
    };

    this.triggerHierarchyNodeCallback = function (hierarchyId) {
        options.mapModel.hierarchyNodeCallback(hierarchyId);
    };

    this.triggerTicketBlockCallback = function (tickets) {
        options.mapModel.ticketBlockCallback(tickets);
    };

    // Take an asset's data object and set its id and the appropriate observables
    this.setAssetData = function (data) {
        this.id = data.id;

        this.service(data.service);
        this.type(data.type);
        this.subType(data.subType ? data.subType : null);
        this.accountLabel(data.accountLabel);
        this.accountId(data.accountId);
        this.hierarchy(data.hierarchy);
        this.tickets(data.tickets);
    };

    this.init = function (callback) {

        if (!this.visitedAsset()) {

            // If we already have the data, the asset doesn't need to fetch its data
            if (options.assetData) {
                self.setAssetData(options.assetData);

                // And fire its callback if it has one
                if (callback) {
                    callback();
                }

            } else {
                // Only fetch the data for the asset if we don't already have it
                var assetUrl = options.locationEndPoints + '?clientId=' + options.mapModel.queryParams().clientId + '&assetId=' + options.assetId;

                $.getJSON(assetUrl, function (data) {

                    self.setAssetData(data);

                    // Flag that says they've successfully fetched the data for this asset
                    self.visitedAsset(true);
                })
                    // If the callback is included, set it as the current asset
                    .done(callback);
            }

        } else if (callback) {
            // If the callback is included, set it as the current asset
            callback();
        }
    };
}

function BuildingModel(locationEndPoints, building, mapModel) {
    var self = this;

    this.locations = ko.observable();
    this.latitude = building.latitude;
    this.longitude = building.longitude;
    this.activeLocation = ko.observable();

    // Create the location model(s) for the location(s) in this building
    $.each(building.locations, function (i, location) {
        var newLocation = new LocationModel(locationEndPoints, location, mapModel);

        if (newLocation.init) {
            newLocation.init();
        }

        building.locations[i] = newLocation;

    });

    this.locations(building.locations);

    // If there is only one location, set it as the active location
    if (this.locations().length > 0) {
        this.activeLocation(this.locations()[0]);
    }

}

function InventoryMapModel(options) {
    var self = this;

    this.options = options ? options : {};

    // This observable contains the model for the building currently being viewed
    this.activeBuilding = ko.observable();

    // This sets the observables on the locations data from the server
    this.setLocations = function (data, endPoints) {

        if (data && data.locations) {

            // Build full address string to use for grouping
            $.each(data.locations, function (i, location) {
                location.fullAddress = location.addressLine1 + ', ' + location.addressLine2;
            });

            // Group the locations by building
            var locationsGrouped = _.groupBy(data.locations, 'fullAddress'),
                buildings = [];

            // Create the building object and building models
            $.each(locationsGrouped, function (i, building) {
                building = {
                    fullAddress: building[0].fullAddress,
                    latitude: building[0].latitude,
                    longitude: building[0].longitude,
                    locations: building
                };
                var newBuilding = new BuildingModel(endPoints.getLocationData, building, self);
                buildings.push(newBuilding);
            });

            self.buildings(buildings);

        }

        if (self.options.initCallback && $.isFunction(self.options.initCallback)) {
            self.options.initCallback(data);
        }
    };
}

ko.bindingHandlers.inventoryMapBuilding = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var buildingModel = valueAccessor(),
            $element = $(element),
            inventoryMapModel = bindingContext.$parent,
            map = inventoryMapModel.map,
            $marker = $element.find('[data-mettel-class="inventory-location-marker"]'),
            $flyout = $element.find('[data-mettel-class="inventory-location-flyout-container"]'),
            $flyoutInner = $flyout.children('[data-mettel-class="inventory-location-flyout-container-inner"]');

        // Show the flyout
        var showFlyout = function () {
            $flyout.show();
            // Bring marker and flyout to front by z-index
            $element.addClass('mettel-state-active');
        };

        // Hide the flyout
        var hideFlyout = function () {
            $flyout.hide();
            $element.removeClass('mettel-state-active');

            // Only clear the active building if we haven't already selected a new one
            if (buildingModel === inventoryMapModel.activeBuilding()) {
                inventoryMapModel.activeBuilding(null);
            }
        };

        // Center the flyout vertically in relation to the marker
        var centerFlyout = function () {
            $flyout.css({
                'margin-top': (($flyout.outerHeight() / 2) + 8 ) * -1 + 'px'
            });
        };

        // Setup data and click handlers for flyout, and show it
        var initializeFlyout = function (locationModel) {

            // If the location hasn't been viewed yet, get the initial batch of asset data
            if (!locationModel.visitedLocation()) {
                locationModel.getAssetBatchData(1);
            }

            inventoryMapModel.activeBuilding(buildingModel);

            showFlyout();

            centerFlyout();

            // Click handler for clicking anywhere outside the flyout to close it
            var checkClick = function (e) {
                if (!$.contains($element[0], e.target)) {
                    hideFlyout();
                    $(document).off('click', checkClick);
                }
            };

            $(document).on('click', checkClick);

            // Stop clicks anywhere in flyout from bubbling up to the map
            $flyoutInner.on('click dblclick', function (e) {
                e.stopPropagation();
            });

        };

        if (buildingModel.locations().length > 1) {
            var $modal = $element.find('[data-mettel-class="mettel-modal"]'),
                $viewButton = $modal.find('[data-mettel-class="view-floor"]');
        }

        // Set up location events
        $marker.on({
            'click': function () {

                var locationModel;

                if (buildingModel.locations().length === 1) {

                    locationModel = buildingModel.locations()[0];

                    initializeFlyout(locationModel);

                } else {

                    // Open modal
                    $modal.modalWindow();

                    // Setup View button click handler
                    $viewButton.click(function (e) {

                        // Close the modal
                        $modal.modalWindow('close');

                        // Stop bubbling up and form submit
                        e.stopPropagation();
                        e.preventDefault();

                        initializeFlyout(buildingModel.activeLocation());
                    });
                }
            }
        });

        // Plop the marker on the page
        var marker = new RichMarker({
            position: new google.maps.LatLng(buildingModel.latitude, buildingModel.longitude),
            anchor: RichMarkerPosition.BOTTOM,
            map: map,
            draggable: false,
            shadow: 0,
            content: element
        });

        inventoryMapModel.markers.push(marker);

    }

};

ko.bindingHandlers.centerFlyout = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $container = $element.closest('[data-mettel-class="inventory-location-flyout-container"]'),
            value = ko.utils.unwrapObservable(valueAccessor());

        $container.css({
            'margin-top': (($container.outerHeight() / 2) + 8 ) * -1 + 'px'
        });
    }
};

ko.bindingHandlers.closeLocationFlyout = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $flyout = $element.closest('[data-mettel-class="inventory-location-flyout-container"]'),
            $buildingContainer = $flyout.closest('[data-mettel-class="inventory-building-container"]'),
            inventoryMapModel = bindingContext.$parents[1];

        $element.on({
            'click': function () {
                $flyout.hide();
                $buildingContainer.removeClass('mettel-state-active');
                inventoryMapModel.activeBuilding(null);
            }
        });
    }
};

ko.bindingHandlers.nextAsset = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            locationModel = viewModel,
            totalAssets = locationModel.totalAssets();

        // Only set up pagination click handlers if there is more than one asset
        if (totalAssets > 1) {

            // Setup click event
            $element.on({
                'click': function () {

                    // As long as we're not already trying to load an asset
                    if (!locationModel.assetLoading()) {

                        var currentAssetNumber = locationModel.currentAsset().assetNumber;

                        // Got to the next asset, as long as you're not on the last asset
                        if (currentAssetNumber < totalAssets) {

                            var nextAssetIndex = currentAssetNumber,
                                nextAssetModel = locationModel.assets()[nextAssetIndex],
                                afterNextAssetIndex = nextAssetIndex + 1,
                                afterNextAssetModel = locationModel.assets()[afterNextAssetIndex],

                                // This logic determines if the asset should be responsible for calling the next batch of asset Ids
                                // TODO: Move this logic to the location model where we can do these calculations just once and set flags on the appropriate assets
                                callAheadDifference = 5,
                                batchSize = 25,
                                currentPlusDifference = currentAssetNumber + callAheadDifference,
                                currentBatchFactor = currentPlusDifference / batchSize,
                                moreAvailable = totalAssets - callAheadDifference > currentAssetNumber,
                                isBatchCaller = currentPlusDifference % batchSize === 0 && moreAvailable;

                            if (isBatchCaller) {
                                var nextBatchNumber = currentBatchFactor + 1;

                                // Trigger the fetch for more asset Ids
                                locationModel.getAssetBatchData(nextBatchNumber);
                            }

                            // Show the loader
                            locationModel.assetLoading(true);

                            // Set the next asset as the current asset once it's data has been fetched
                            if (nextAssetModel.init) {
                                nextAssetModel.init(function () {
                                    locationModel.currentAsset(nextAssetModel);
                                    locationModel.assetLoading(false);
                                });
                            } else {
                                locationModel.assetLoading(false);
                            }

                            // So we're ready for the next click, get the data for the asset after
                            if (afterNextAssetIndex < totalAssets && afterNextAssetModel.init) {
                                afterNextAssetModel.init();
                            }

                        } else {
                            // If you're on the last asset, go back to the first
                            locationModel.currentAsset(locationModel.assets()[0]);
                        }

                    }
                }
            });
        }
    }
};

ko.bindingHandlers.previousAsset = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            locationModel = viewModel,
            totalAssets = locationModel.totalAssets();

        // Only set up pagination click handlers if there is more than one asset
        if (totalAssets > 1) {

            // Setup click event
            $element.on({
                'click': function () {

                    // As long as we're not already trying to load an asset
                    if (!locationModel.assetLoading()) {

                        var currentAssetNumber = locationModel.currentAsset().assetNumber;

                        var previousAssetIndex = currentAssetNumber - 2,
                            beforePreviousAssetIndex = currentAssetNumber - 3;

                        // If the previous index is negative (you're on the first index)
                        if (previousAssetIndex === -1) {
                            // Set the previous index to the last index in the array
                            previousAssetIndex = totalAssets - 1;
                        }

                        // If the index before is negative, reset it to the correct index at the end of the array
                        switch (beforePreviousAssetIndex) {
                            case -2:
                                beforePreviousAssetIndex = totalAssets - 2;
                                break;
                            case -1:
                                beforePreviousAssetIndex = totalAssets - 1;
                                break;
                        }

                        // Once we have ensured that the indices aren't negative, set the appropriate models
                        var previousAssetModel = locationModel.assets()[previousAssetIndex],
                            beforePreviousAssetModel = locationModel.assets()[beforePreviousAssetIndex],

                            // This logic determines if the asset should be responsible for calling the previous batch of asset Ids
                            // TODO: Move this logic to the location model where we can do these calculations just once and set flags on the appropriate assets
                            callAheadDifference = 5,
                            batchSize = 25,
                            currentMinusDifference = currentAssetNumber - callAheadDifference,
                            currentBatchFactor = currentMinusDifference / batchSize,
                            moreAvailable = currentAssetNumber > callAheadDifference,
                            isBatchCaller = currentMinusDifference % batchSize === 0 && moreAvailable,
                            lastBatchSize = totalAssets - (Math.floor(totalAssets / batchSize) * batchSize);

                        // If appropriate, trigger the fetch for more asset Ids
                        if (currentAssetNumber === 1) {

                            // If we're on the first asset and click back to the last
                            var lastBatchNumber = Math.ceil(totalAssets / batchSize);

                            // Fetch the last batch of Ids, which will also get the data for the last two assets
                            locationModel.getAssetBatchData(lastBatchNumber, true);

                            var batchBeforeLastNumber = lastBatchNumber - 1;

                            // If the last batch size is very small
                            if (lastBatchSize < callAheadDifference && batchBeforeLastNumber > 1) {

                                // Also fetch the Ids for the batch before last
                                locationModel.getAssetBatchData(batchBeforeLastNumber);
                            }
                        } else if (isBatchCaller) {

                            // Or if we're somewhere in the middle, just do a normal fetch of asset Ids
                            locationModel.getAssetBatchData(currentBatchFactor);
                        }

                        // Show the loader
                        locationModel.assetLoading(true);

                        // Set the previous asset as the current asset once it's data has been fetched
                        if (previousAssetModel.init) {
                            previousAssetModel.init(function () {
                                locationModel.currentAsset(previousAssetModel);
                                locationModel.assetLoading(false);
                            });
                        } else {
                            locationModel.assetLoading(false);
                        }

                        // So we're ready for the next click, get the data for the asset before
                        if (beforePreviousAssetModel.init) {
                            beforePreviousAssetModel.init();
                        }

                    }
                }
            });
        }
    }
};

ko.bindingHandlers.truncateAssetHierarchy = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        // Only if it's the final hierarchy node
        if (viewModel === bindingContext.$parent.hierarchy()[(bindingContext.$parent.hierarchy().length - 1)]) {
            // Check to see if they are spilling out
            var $hierarchy = $element.closest('[data-mettel-class="inventory-location-asset-hierarchy"]'),
                $hierarchyContainer = $hierarchy.closest('[data-mettel-class="inventory-location-asset-hierarchy-container"]');

            if ($hierarchy.outerWidth() >= $hierarchyContainer.outerWidth()) {
                $hierarchyContainer.addClass('mettel-hierarchy-truncated');
            }
        }
    }
};

ko.bindingHandlers.inventoryMap = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = $.extend({}, valueAccessor(), viewModel.options ? viewModel.options : {});

        MetTel.BaseMapModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.addressCallback = options.addressCallback;
            viewModel.accountCallback = options.accountCallback;
            viewModel.hierarchyNodeCallback = options.hierarchyNodeCallback;
            viewModel.ticketBlockCallback = options.ticketBlockCallback;
            viewModel.bounds = options.bounds;
            viewModel.queryParams(options.queryParams);

            viewModel.init();
        }

        ko.applyBindingsToNode(element, {
            template: {
                name: 'inventory-map',
                data: viewModel
            }
        }, bindingContext);

        return {controlsDescendantBindings: true};
    }
};

function LocationBarModel(options) {
    options = options ? options : {};
    var self = this;

    this.locationId = ko.observable();
    this.locationName = ko.observable();
    this.locationAddress1 = ko.observable();
    this.locationAddress2 = ko.observable();
    this.locationCity = ko.observable();
    this.locationState = ko.observable();
    this.locationZipCode = ko.observable();
    this.hierarchyTitle = ko.observable();
    this.hierarchyBreadcrumbs = ko.observableArray();
    this.notesTitle = ko.observable();
    this.notes = ko.observableArray();
    this.history = ko.observableArray();
    this.expanded = ko.observable(false);

    this.toggleExpanded = function() {
        self.expanded(!self.expanded());
    };

    this.newNote = ko.observable();

    // Fire the custom callback when a block of tickets is clicked
    this.triggerOpenTicketsBlock = function (timestamp, locationId) {
        self.openTicketsBlock(timestamp, locationId);
    };

    // Fire the custom callback to edit the location label
    this.triggerEditLocationLabel = function (locationId) {
        if (self.editLocationLabel !== undefined) {
            self.editLocationLabel(locationId);
        }
    };

    // Callbacks for the location actions
    this.triggerContacts = function (locationId) {
        self.locationActions.contacts(locationId);
    };
    this.triggerBillingHistory = function (locationId) {
        self.locationActions.billingHistory(locationId);
    };
    this.triggerAccessHours = function (locationId) {
        self.locationActions.accessHours(locationId);
    };
    this.triggerServiceDetails = function (locationId) {
        self.locationActions.serviceDetails(locationId);
    };
    this.triggerAccounts = function (locationId) {
        self.locationActions.accounts(locationId);
    };

    self.init = function () {
        // Get location bar data
        $.getJSON(self.endPoints.getLocationBarData, function (data) {
            self.locationId(data.locationId);
            self.locationName(data.locationName);
            self.locationAddress1(data.locationAddress1);
            self.locationAddress2(data.locationAddress2);
            self.locationCity(data.locationCity);
            self.locationState(data.locationState);
            self.locationZipCode(data.locationZipCode);
            self.hierarchyTitle(data.hierarchyTitle);
            self.hierarchyBreadcrumbs(data.hierarchyBreadcrumbs);
            self.notesTitle(data.notesTitle);
            self.notes(data.notes);

            // Set the temp and conditions as observables - since they get async'd in
            $.each(data.history, function(e, day){
                day.temp = ko.observable('');
                day.conditions = ko.observable('');
                day.weatherAvailable = ko.observable(true);
            });

            self.history(data.history);

            if (self.completeEvent && $.isFunction(self.completeEvent)) {
                self.completeEvent(data);
            }

        })
        .done(function() {
            // Get location weather
            $.getJSON(self.endPoints.getLocationWeather, function (data) {
                $.each(self.history(), function (i, day) {
                    if (data.weather) {
                        if (!data.weather[i].temp && !data.weather[i].conditions) {

                            day.weatherAvailable(false);

                        } else {
                            day.temp(data.weather[i].temp);
                            day.conditions(data.weather[i].conditions);
                        }
                    }
                });
            });
        });
    };
}

ko.bindingHandlers.addNote = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.click('on', function() {
            $(".mettel-new-note-modal").modalWindow();
        });
    }
};

ko.bindingHandlers.saveNote = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.click('on', function() {
            if (viewModel.endPoints.saveNote && viewModel.newNote()) {
                $.post(viewModel.endPoints.saveNote, { notes: viewModel.newNote() }, function () {
                    viewModel.newNote("");
                    $(".mettel-new-note-modal").modalWindow("close");
                    viewModel.init();
                });
            } else {
                console.log("require save note endpoint or notes");
            }
        });
    }
};

ko.bindingHandlers.locationBar = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.openTicketsBlock = options.openTicketsBlock;
            viewModel.editLocationLabel = options.editLocationLabel;
            viewModel.locationActions = options.locationActions;
            viewModel.completeEvent = options.completeEvent;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'location-bar', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.locationBarAbridged = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.openTicketsBlock = options.openTicketsBlock;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'location-bar-abridged', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

// Shared Map Logic and Bindings

/* global AssetModel */

function LocationModel(locationEndPoints, location, mapModel) {
    var self = this;

    this.visitedLocation = ko.observable(false);
    this.id = location.locationId;
    this.latitude = location.latitude;
    this.longitude = location.longitude;
    this.locationId = ko.observable(location.locationId);//for weather history template

    this.init = function () {

        // Help Desk Map
        if (location.history) {

            this.history = location.history;
            this.newTickets = 0;
            this.inProgressTickets = 0;
            this.resolvedTickets = 0;
            this.closedTickets = 0;

            // Location-related callback
            this.triggerLocationCallback = function (location) {
                if (mapModel.locationCallback) {
                    mapModel.locationCallback(location);
                }
            };

            // Fire the custom callback when a block of tickets is clicked
            this.triggerOpenTicketsBlock = function (timestamp, locationId) {
                console.log("open ticket block", timestamp, locationId);
                if (mapModel.openTicketsBlock) {

                    mapModel.openTicketsBlock(timestamp, locationId);
                }
            };

            this.getWeather = function (callback) {

                var locationUrl = locationEndPoints + self.id;

                $.getJSON(locationUrl, function (data) {

                    // Set the temp and conditions for each day
                    $.each(self.history, function (i, day) {

                        if (!data.weather[i].temp && !data.weather[i].conditions) {

                            day.weatherAvailable(false);

                        } else {
                            day.temp(data.weather[i].temp);
                            day.conditions(data.weather[i].conditions);
                        }

                    });

                    // Flag that says they've successfully fetched the weather for this location
                    self.visitedLocation(true);

                    callback();

                });

            };

            $.each(location.history, function (e, day) {

                // Set temp and conditions as observable so when they update via ajax call, they update UI
                day.temp = ko.observable('');
                day.conditions = ko.observable('');
                day.weatherAvailable = ko.observable(true);

                // Figure out how many tickets of each type there are for this location for the current day
                if (e === 0) {
                    $.each(day.tickets, function (i, ticket) {
                        switch (ticket.status) {
                            case "new":
                                self.newTickets += 1;
                                break;

                            case "in-progress":
                                self.inProgressTickets += 1;
                                break;

                            case "resolved":
                                self.resolvedTickets += 1;
                                break;

                            case "closed":
                                self.closedTickets += 1;
                                break;
                        }
                    });
                }
            });
        }

        // Inventory Map
        if (location.hasAssets) {

            var assets = location.assets;

            this.locationId = ko.observable(location.locationId);
            this.addressLine1 = ko.observable(location.addressLine1);
            this.addressLine2 = ko.observable(location.addressLine2);
            this.floor = ko.observable(location.floor ? location.floor : null);
            this.totalAssets = ko.observable();
            this.assets = ko.observableArray();
            this.currentAsset = ko.observable();
            this.assetLoading = ko.observable(false);
            this.fetchedBatches = {};

            // Location-related callback
            this.triggerAddressCallback = function (locationId) {
                mapModel.addressCallback(locationId);
            };

            // From the new asset data, build the new asset models
            this.buildAssets = function (assetIds, batchNumber, assetData, hasLastAssets) {

                // This will be used to determine the asset's number based on what batch it's in
                var batchSize = 25,
                    assetNumberDifference = (batchNumber * batchSize) - (batchSize - 1);

                // Build all the asset models for the location
                $.each(assetIds, function (i, assetId) {

                    var newAsset,
                        assetNumber = i + assetNumberDifference,
                        newAssetModelOptions = {
                            mapModel: mapModel,
                            locationModel: self,
                            locationEndPoints: locationEndPoints,
                            assetId: assetId
                        };

                    // If we have asset data from the fetch (either from the first batch or from the last batch
                    // if we've went to the last batch initially) then we add that data into the options of the
                    // respective asset(s) so it does not need to fetch its own data
                    if (assetData && assetNumber === 1) {
                        newAssetModelOptions.assetData = assetData[0];
                    } else if (assetData && assetNumber === 2) {
                        newAssetModelOptions.assetData = assetData[1];
                    } else if (hasLastAssets && assetNumber === self.totalAssets() - 1) {
                        newAssetModelOptions.assetData = assetData[0];
                    } else if (hasLastAssets && assetNumber === self.totalAssets()) {
                        newAssetModelOptions.assetData = assetData[1];
                    }

                    // And create the new asset model with its options
                    newAsset = new AssetModel(newAssetModelOptions);

                    // So each asset knows what number it is
                    newAsset.assetNumber = assetNumber;

                    assetIds[i] = newAsset;

                    // If this is the first time the user is viewing this location,
                    // get the first two assets ready and show the first
                    if (assetNumber === 1) {
                        newAsset.init(function () {
                            self.currentAsset(newAsset);
                        });
                    } else if (assetNumber === 2) {
                        newAsset.init();
                    }

                    // If the user is going to the last asset initially,
                    // get the last two assets ready and show the last
                    if (hasLastAssets && assetNumber === self.totalAssets() - 1) {
                        newAsset.init();
                    } else if (hasLastAssets && assetNumber === self.totalAssets()) {
                        newAsset.init(function () {
                            self.currentAsset(newAsset);
                            self.assetLoading(false);
                        });
                    }

                    // Replace the placeholder in the assets array with the new asset model
                    self.assets()[assetNumber - 1] = newAsset;

                });

                // Flag that says they've viewed this location
                self.visitedLocation(true);
            };

            // Function to fetch data for a batch
            this.getAssetBatchData = function (batchNumber, getLastAssets) {

                // Check to see if we've already fetched this batch's data
                if (!this.fetchedBatches[batchNumber]) {

                    var queryString = mapModel.queryString().length > 0 ? mapModel.queryString() + '&' : '?',
                        url = locationEndPoints + queryString + 'locationId=' + this.locationId() + '&batch=' + batchNumber;

                    // This parameter gets added if the user clicks previous from the first asset initially
                    if (getLastAssets) {
                        url = url += '&includeLastAssets=true';
                    }

                    $.getJSON(url, function (data) {

                        // Set a flag that says this batch's data has been fetched
                        self.fetchedBatches[batchNumber] = true;

                        // If it's batch 1, we need to do some extra stuff
                        if (data.totalAssets && batchNumber === 1) {

                            // Set the total number of assets
                            self.totalAssets(data.totalAssets);

                            // Create an array of all the asset numbers and set it as the assets array
                            // These are just placeholders that will be used to determine where to stick
                            // the new asset models in the array
                            var arrayOfAssetNumbers = [],
                                i;
                            for (i = 0; i < data.totalAssets; i++) {
                                arrayOfAssetNumbers.push(i +1);
                            }
                            self.assets(arrayOfAssetNumbers);
                        }

                        // Invoke the asset building function
                        self.buildAssets(data.assetIds, batchNumber, data.assetData ? data.assetData : null, getLastAssets);
                    });
                }
            };
        }
    };
}

window.MetTel = window.MetTel || {};

MetTel.BaseMapModel = function () {
    var self = this;

    // Extend the query params
    MetTel.QueryParamsModel.apply(this);

    this.mapInitialized = ko.observable(false);

    // Flag used to trigger ajax call to get points when map is moved
    this.newPointsNeeded = ko.observable(false);

    this.setBoundParams = function (bounds) {
        self.clearMarkers();
        self.bounds = bounds;
        self.fetchMapData();
    };

    this.returnUsableBounds = function (prettyBounds) {
        return new google.maps.LatLngBounds(
            new google.maps.LatLng(prettyBounds.swLat, prettyBounds.swLng),
            new google.maps.LatLng(prettyBounds.neLat, prettyBounds.neLng)
        );
    };

    this.moveMap = function(coordinates) {

        self.coordinates = coordinates;

        // center the map on the US and Canada - workaround for cases when bounds are the same or all map
        this.map.setCenter(new google.maps.LatLng(42.900410, -94.869904));
        this.map.setZoom(4);

        // Set flag to ensure new points are fetched
        this.newPointsNeeded(true);
        self.bounds = this.returnUsableBounds(coordinates);
        this.map.fitBounds(self.bounds);
    };

    // Fetches the data for the map. An array of locations and a message if one exists
    this.fetchMapData = function () {

        // reset user message before new fetch
        this.userMessage('');

        var queryString = self.queryString().length > 0 ? self.queryString() + '&' : '?';

        // if that is just move or zoom (no query parameters are changed) - get bounds from map, otherwise - use new coordinates
        if (!this.newPointsNeeded()) {
            self.coordinates = {
                neLat: self.bounds.getNorthEast().lat(),
                neLng: self.bounds.getNorthEast().lng(),
                swLat: self.bounds.getSouthWest().lat(),
                swLng: self.bounds.getSouthWest().lng()
            };
        }

        var url = self.endPoints.getMapData + queryString +
            'neLat=' + self.coordinates.neLat +
            '&neLng=' + self.coordinates.neLng +
            '&swLat=' + self.coordinates.swLat +
            '&swLng=' + self.coordinates.swLng;

        console.log('Fetch to: ' + url);

        $.getJSON(url, function (data) {
            self.setLocations(data, self.endPoints);
            self.userMessage(data.userMessage);
        });

    };

    this.clearMarkers = function () {
        while (self.markers()[0]) {
            self.markers().pop().setMap(null);
        }
    };

    // Init function for the model
    this.init = function () {

        // This array stores all the buildings for this map
        self.buildings = ko.observableArray();

        // This array stores all the locations for this map
        self.locations = ko.observableArray();

        // Array of all of the markers on the map.
        self.markers = ko.observableArray();

        // Used to store the user message
        self.userMessage = ko.observable();

        self.mapInitialized(true);
    };
};

// Map instantiation
ko.bindingHandlers.map = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var mapModel = viewModel,
            map = new google.maps.Map(element, {
                mapTypeId: google.maps.MapTypeId.MAP
            }),
            bounds;

        if (mapModel.bounds) {

            // If bounds were provided, set them
            bounds = mapModel.returnUsableBounds(mapModel.bounds);

            mapModel.bounds = bounds;
            map.fitBounds(bounds);

        } else {

            // Else, center the map on the US and Canada
            map.setCenter(new google.maps.LatLng(42.900410, -94.869904));
            map.setZoom(4);

        }

        // Map styles
        var mapHue = '#2CB0ED';

        map.setOptions({
            styles: [
                {
                    stylers: [
                        {lightness: 20},
                        {hue: mapHue},
                        {saturation: -50}
                    ]
                },
                {
                    featureType: "road.highway",
                    stylers: [
                        {saturation: -50},
                        {lightness: 50}
                    ]
                },
                {
                    featureType: "water",
                    stylers: [
                        {saturation: -30},
                        {lightness: -10}
                    ]
                },
                {
                    featureType: "poi",
                    stylers: [{lightness: 70}]
                },
                {
                    featureType: "road",
                    stylers: [{gamma: 0.7}]
                },
                {
                    featureType: "landscape",
                    stylers: [
                        {gamma: 9.99},
                        {lightness: -4}
                    ]
                }
            ]
        });

        // Set the map on the model
        mapModel.map = map;

        // Map is loaded event listener
        google.maps.event.addListener(map, 'idle', function() {

            var newBounds = map.getBounds();
            if (!mapModel.bounds) {
                mapModel.bounds = newBounds;
            }
            // Clear out any existing locations and set bounds on model to new value
            mapModel.setBoundParams(newBounds);

            // Reset flag
            mapModel.newPointsNeeded(false);

        });
    }
};

/* global CustomerCatalogSteppedWorkflowModel, CustomerOrderModel, CustomerCatalogModel, productCatalogViewModel, vmSteppedWorkflow */

function ModifyOrderModel() {
    (CustomerOrderModel.bind(this))();
    var vmModifyOrder = this;

    // Flag for order model to determine whether to show/hide things related to modifying an order
    vmModifyOrder.modifyOrder = true;

    vmModifyOrder.services = ko.observableArray();

    vmModifyOrder.uniqueServiceSubcategories = ko.computed(function () {
        var subcategories = [];

        $.each(vmModifyOrder.services(), function (i, item) {
            subcategories.push(item.SubCategoryID);
        });

        return _.uniq(subcategories);
    });

    vmModifyOrder.uniqueModifySubcategories = ko.computed(function () {
        return _.difference(vmModifyOrder.uniqueServiceSubcategories(), vmModifyOrder.uniqueSubcategories());
    });

    vmModifyOrder.modificationType = ko.observable();
    vmModifyOrder.modificationTypeString = ko.observable();
    vmModifyOrder.modificationTypeLabel = ko.observable();
    vmModifyOrder.submitLabel = ko.observable();
    vmModifyOrder.submitForApprovalLabel = ko.observable();

    // Order Item
    vmModifyOrder.orderItemError = ko.observable();
    vmModifyOrder.orderItemError.subscribe(function(newValue) {
        if (newValue) {
            // fire error modal
            productCatalogViewModel.errorTitle("Server Error");
            productCatalogViewModel.errorMessage("Primary Inventory does not exist.");
        }
    });

    // Seller
    vmModifyOrder.modifiedSellerId = ko.observable();
    vmModifyOrder.modifiedSellerName = ko.observable();
    vmModifyOrder.modifiedSellerLogoURL = ko.observable();

    // Pricing
    vmModifyOrder.latestPricing = ko.observableArray([]);
    vmModifyOrder.modifiedTotalMonthlyPrice = ko.observable();
    vmModifyOrder.modifiedTotalOneTimePrice = ko.observable();
    vmModifyOrder.modifiedSkuMonthlyPrice = ko.observable();
    vmModifyOrder.modifiedSkuOneTimePrice = ko.observable();
    vmModifyOrder.noPricingData = ko.observable();
    vmModifyOrder.noPricingMessage("N/A");

    // Used to make sure we're not waiting on pricing data to ensure the pricing is up to date with the user's choices
    vmModifyOrder.pricingCalls = ko.observable(0);
    vmModifyOrder.pricingCallsCompleted = ko.observable(0);
    vmModifyOrder.retrievingPricingData = ko.computed(function() {
        return (vmModifyOrder.pricingCalls() !== vmModifyOrder.pricingCallsCompleted());
    });

    vmModifyOrder.calculateLatestPrices = function(newPricing) {
        var totalMonthly = 0,
            totalOneTime = 0,
            skuMonthly = 0,
            skuOneTime = 0;

        $.each(newPricing, function(i, line) {
            if (line.orderData) {
                totalMonthly += line.orderData.Monthly;
                totalOneTime += line.orderData.OneTime;
                skuMonthly += line.orderData.Monthly;
                skuOneTime += line.orderData.OneTime;

                // Here is where the base sku price is adjusted by subtracting any subPricing from it
                // because we initially just set it equal to the total price
                if (line.orderData.subPricing) {
                    $.each(line.orderData.subPricing, function (i, group) {
                        if (group.choices) {
                            $.each(group.choices, function (j, choice) {

                                // Adjust the base sku prices based on the sub-pricing
                                skuOneTime -= choice.oneTime;
                                skuMonthly -= choice.monthly;

                                if (choice.subPricing) {
                                    $.each(choice.subPricing, function(k, subOptGroup) {
                                        if (subOptGroup.choices) {
                                            $.each(subOptGroup.choices, function(l, subChoice) {

                                                // Adjust the base sku prices based on the sub-sub-pricing
                                                skuOneTime -= subChoice.oneTime;
                                                skuMonthly -= subChoice.monthly;
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });

        vmModifyOrder.modifiedTotalMonthlyPrice(totalMonthly);
        vmModifyOrder.modifiedTotalOneTimePrice(totalOneTime);
        vmModifyOrder.modifiedSkuMonthlyPrice(skuMonthly);
        vmModifyOrder.modifiedSkuOneTimePrice(skuOneTime);
    };

    // Once the active product is loaded and reconstructProduct is done,
    // set the quantity and mark it as ready for pricing
    vmModifyOrder.productReadyForGetModifiedPricing = ko.observable(false);
    productCatalogViewModel.activeProduct.subscribe(function(activeProduct) {
        if (!vmModifyOrder.orderItemError() && activeProduct && vmModifyOrder.originalOrderItemData) {
            var check = setInterval(function() {
                if (activeProduct.productDataLoaded && activeProduct.productDataLoaded()) {

                    // set quantity
                    activeProduct.previewPricingOptionsSelectedQuantity(vmModifyOrder.originalOrderItemData.quantity);

                    clearInterval(check);
                    // wait to make sure reconstructProduct has selected options
                    setTimeout(function() {
                        vmModifyOrder.productReadyForGetModifiedPricing(true);
                    }, 100);
                }
            }, 50);
        } else {
            vmModifyOrder.productReadyForGetModifiedPricing(false);
        }
    });

    vmModifyOrder.recreatedSubSkuFromOldSubItem = function(oldSubItem, optionGroup) {
        // recreate the subSku
        // necessary to get pricing: id, quantity, quantityTypeId, and subSkus if they exist
        // other properties may be necessary for order submittal

        var restructuredSubItem = {
            id: oldSubItem.skuId,
            sku: oldSubItem.sku,
            subcategoryId: optionGroup.subcategoryId,
            productName: oldSubItem.name,
            optionGroupSlugified: oldSubItem.optionGroupSlugified,
            parentFingerPrint: oldSubItem.parentFingerPrint,
            parentConfigType: oldSubItem.parentConfigType,
            quantityTypeId: oldSubItem.quantityTypeId,
            quantity: oldSubItem.quantity,
            fingerPrint: oldSubItem.fingerPrint,
            attributesMap: {},
            subSkus: []
        };

        for (var attrI = 0; attrI < oldSubItem.attributes.length; attrI++) {
            restructuredSubItem.attributesMap[oldSubItem.attributes[attrI].key] = oldSubItem.attributes[attrI].value;
        }

        if (oldSubItem.subItems && oldSubItem.subItems.length) {
            // recreate the sub subSkus

            $.each(oldSubItem.subItems, function(k, oldSubSubItem) {
                restructuredSubItem.subSkus.push(vmModifyOrder.recreatedSubSubSkuFromOldSubSubItem(oldSubSubItem));
            });
        }

        return restructuredSubItem;
    };

    vmModifyOrder.recreatedSubSubSkuFromOldSubSubItem = function(oldSubSubItem) {
        // recreate the sub subSku

        var restructuredSubSubItem = {
            id: oldSubSubItem.skuId,
            attributesMap: {},
            productName: oldSubSubItem.name,
            sku: oldSubSubItem.sku,
            quantity: oldSubSubItem.quantity,
            subcategoryId: oldSubSubItem.subcategoryId
        };

        for (var attrI = 0; attrI < oldSubSubItem.attributes.length; attrI++) {
            restructuredSubSubItem.attributesMap[oldSubSubItem.attributes[attrI].key] = oldSubSubItem.attributes[attrI].value;
        }

        return restructuredSubSubItem;
    };

    vmModifyOrder.captureNoChangeForSubOptGroups = function(subOptionGroups, oldSubItem, newSubItem) {

        $.each(subOptionGroups, function(sogIndex, subOptGroup) {

            // first find out if opt group has no change selected for either opt group type
            if ((subOptGroup.optionGroupTypeId() === 1 && typeof subOptGroup.subSubProductSelection === "function" && subOptGroup.subSubProductSelection().name() === "No change - Keep individual values") ||
                (subOptGroup.optionGroupTypeId() === 2 && subOptGroup.showNoChange() && subOptGroup.optionsUnchanged())) {

                // check to see if there were old sub sub items for this sub item
                if (oldSubItem && oldSubItem.subItems && oldSubItem.subItems.length) {

                    $.each(oldSubItem.subItems, function(ssiIndex, subSubItem) {
                        if (subOptGroup.titleSlugified() === subSubItem.optionGroupSlugified.replace(/^(custom|template)+\-/, "")) {
                            // recreate sub subSku
                            newSubItem.subSkus.push(vmModifyOrder.recreatedSubSubSkuFromOldSubSubItem(subSubItem));

                            if (subOptGroup.optionGroupTypeId() === 1) {
                                return false; // only one choice for multiple choice only so stop searching
                            }
                        }
                    });
                }
            }
        });
    };

    vmModifyOrder.getModifiedPricing = function() {

        if (!vmModifyOrder.productReadyForGetModifiedPricing()) {
            return false;
        }

        var missingPricingData = false,
            temporaryPricing = ko.observableArray([]);
        temporaryPricing.subscribe(function(newValue) {

            // Once we get all pricing data for each line,
            // we can update the latest pricing data and displayed prices
            if (newValue.length === vmModifyOrder.services().length) {

                vmModifyOrder.noPricingData(missingPricingData);

                vmModifyOrder.latestPricing(newValue);

                vmModifyOrder.calculateLatestPrices(newValue);
            }
        });

        $.each(vmModifyOrder.services(), function(i, line) {

            var prodConfig = JSON.parse(productCatalogViewModel.activeProduct().formatForPricingGroups());

            prodConfig.modType = vmModifyOrder.modificationTypeString();

            prodConfig.sellerIds = vmModifyOrder.modifiedSellerId().toString();

            var oldLineSubItems = vmModifyOrder.originalOrderItemData.lines[i] && vmModifyOrder.originalOrderItemData.lines[i].subItems ? vmModifyOrder.originalOrderItemData.lines[i].subItems : [];

            // check if any no change options are selected
            // which means the config doesn't have the sub sku for that option group
            $.each(productCatalogViewModel.previewGroupOptions(), function(j, previewOptionGroup) {
                if (previewOptionGroup.type !== 'skus') {
                    if (previewOptionGroup.configuration === 1) {

                        // if an option group is found with no change selected, or it has sub option groups
                        if (previewOptionGroup.previewSelectedChoice() === "No change - Keep individual values" ||
                            previewOptionGroup.previewSelectedChoiceObject().subOptionGroups().length) {

                            // search through the original sub items to see if there is a corresponding sku
                            var oldSubItem;
                            $.each(oldLineSubItems, function(k, subItem) {
                                if (previewOptionGroup.nameSlugified === subItem.optionGroupSlugified) {
                                    oldSubItem = subItem;
                                    return false;
                                }
                            });

                            // if an option group is found with no change selected, add it to subSkus in prodConfig
                            if (oldSubItem && previewOptionGroup.previewSelectedChoice() === "No change - Keep individual values") {
                                prodConfig.subSkus.push(vmModifyOrder.recreatedSubSkuFromOldSubItem(oldSubItem, previewOptionGroup));
                            }

                            // check the sub option groups for no change
                            else if (oldSubItem && previewOptionGroup.previewSelectedChoiceObject().subOptionGroups().length) {

                                // find new sub item to which the old sub sub items might need to be added
                                var newSubItem;
                                $.each(prodConfig.subSkus, function(l, newSubSku) {
                                    if (previewOptionGroup.nameSlugified === newSubSku.optionGroupSlugified) {
                                        newSubItem = newSubSku;
                                    }
                                });

                                vmModifyOrder.captureNoChangeForSubOptGroups(previewOptionGroup.previewSelectedChoiceObject().subOptionGroups(), oldSubItem, newSubItem);
                            }
                        }
                    }

                    else if (previewOptionGroup.configuration === 2) {

                        // if an option group is found with no change selected
                        if (previewOptionGroup.showNoChange() && previewOptionGroup.optionsUnchanged()) {

                            // search through the original sub items to see if there is a corresponding sku
                            $.each(oldLineSubItems, function(k, subItem) {
                                if (previewOptionGroup.nameSlugified === subItem.optionGroupSlugified) {
                                    // if so, recreate the subSku and add it to prodConfig
                                    prodConfig.subSkus.push(vmModifyOrder.recreatedSubSkuFromOldSubItem(subItem, previewOptionGroup));
                                }
                            });
                        }

                        // at least one choice is selected
                        else if (previewOptionGroup.choices().length) {

                            // check each choice
                            $.each(previewOptionGroup.choices(), function(k, subProduct) {

                                // if the choice is selected, and it has sub option groups
                                if (productCatalogViewModel.availableOptions()[previewOptionGroup.type]()[previewOptionGroup.name][subProduct.choice]() &&
                                    subProduct.subOptionGroups().length) {

                                    // search through the original sub items to see if there is a corresponding sku
                                    var oldSubItem;
                                    $.each(oldLineSubItems, function(l, subItem) {
                                        if (subProduct.subProductSelection() === subItem.sku) {
                                            oldSubItem = subItem;
                                            return false;
                                        }
                                    });

                                    // find new sub item to which the old sub sub items might need to be added
                                    var newSubItem;
                                    $.each(prodConfig.subSkus, function(l, newSubSku) {
                                        if (subProduct.subProductSelection() === newSubSku.sku) {
                                            newSubItem = newSubSku;
                                        }
                                    });

                                    vmModifyOrder.captureNoChangeForSubOptGroups(subProduct.subOptionGroups(), oldSubItem, newSubItem);
                                }
                            });
                        }
                    }
                }
            });

            var dataToPost = {
                productConfig: JSON.stringify(prodConfig)
            };

            vmModifyOrder.pricingCalls(vmModifyOrder.pricingCalls() + 1);

            $.ajax({
                type: 'POST',
                data: JSON.stringify(dataToPost),
                contentType: 'application/json',
                dataType: 'json',
                url: productCatalogViewModel.endPoints.previewPricingOptions + '?clientId=' + productCatalogViewModel.queryParams().clientId,
                complete: function() {
                    vmModifyOrder.pricingCallsCompleted(vmModifyOrder.pricingCallsCompleted() + 1);
                },
                success: function(data) {
                    var row = data.Data.rows[0],
                        newLineObj = {
                            WTN: line.WTN,
                            InventoryID: line.InventoryID,
                            SubCategoryID: line.SubCategoryID,
                            storedSubSkus: prodConfig.subSkus,
                            orderData: row
                        };

                    if (!row) {
                        missingPricingData = true;
                    }

                    temporaryPricing.push(newLineObj);
                },
                error: function() {
                    // TODO: error handling
                }
            });
        });
    };

    ko.postbox.subscribe('productChoicesChanged', function() {
        vmModifyOrder.getModifiedPricing();
    });

    // Adding Cart Items

    vmModifyOrder.disableUpdateModifiedCart = ko.computed(function() {
        return (!productCatalogViewModel.activeProduct() ||
            productCatalogViewModel.productCatalogLoading() ||
            vmModifyOrder.reconstructingProduct() ||
            vmModifyOrder.retrievingPricingData() ||
            vmModifyOrder.orderItemError() ||
            !productCatalogViewModel.activeProduct().enableGetPricing() ||
            productCatalogViewModel.activeProduct().choiceChanged());
    });

    // for both upgrade/replace equipment flow and change plan/features flow
    vmModifyOrder.updateModifiedCart = function() {

        // clear cart contents
        if (vmModifyOrder.items()) {
            vmModifyOrder.items([]);
        }

        var product = productCatalogViewModel.activeProduct(),
            productSku = product.previewSelectedSku().sku,
            quantity = product.previewPricingOptionsSelectedQuantity();

        $.each(vmModifyOrder.latestPricing(), function(i, line) {

            var orderModelData = line.orderData,
                subSkus = line.storedSubSkus,
                modifyOrderData = {
                    line: line
                };

            // for change plan/features flow, find the old items for the corresponding line
            if (vmModifyOrder.modificationType() === 2) {
                $.each(vmModifyOrder.originalOrderItemData.lines, function(j, originalLine) {
                    if (originalLine.id === line.WTN) {
                        modifyOrderData.oldItems = originalLine.subItems;
                        return false;
                    }
                });
            }

            vmModifyOrder.addToCart(product, productSku, quantity, orderModelData, subSkus, modifyOrderData);
        });

        vmSteppedWorkflow.nextStepFocus();
    };

    // for 'other' flows
    vmModifyOrder.addLineItemsToCart = function() {

        $.each(vmModifyOrder.services(), function(i, line) {
            // Essentially blank cart item with WTN and line data
            var cartItem = {
                'WTN': ko.observable(line.WTN),
                'InventoryID': ko.observable(line.InventoryID),
                'SubCategoryID': ko.observable(line.SubCategoryID),
                'lineObject': ko.observable(line),
                'sku': '',
                'skuObject': ko.observable({}),
                'subcategoryId': ko.observable(''),
                'product': ko.observable({}),
                'quantity': ko.observable(''),
                'status': ko.observable(''),
                'contractId': ko.observable(''),
                'activity': ko.observable(''),
                'sellerId': ko.observable(''),
                'sellerName': ko.observable(''),
                'sellerLogoURL': ko.observable(''),
                'oneTimePriceTotal': ko.observable(''),
                'oneTimePriceBase': ko.observable(''),
                'oneTimePricePerUnit': ko.observable(''),
                'monthlyPriceTotal': ko.observable(''),
                'monthlyPriceBase': ko.observable(''),
                'monthlyPricePerUnit': ko.observable(''),
                'pricingGroupId': ko.observable(''),
                'termsId': ko.observable(''),
                'interestRate': ko.observable(''),
                'priceSource': ko.observable(''),
                'attributes': ko.observable(''),
                'attributesObject': ko.observable({}),
                'subItems': ko.observableArray([]),
                'subPricing': ko.observable([]),
                'freeTextEntries': ko.observableArray([]),
                'noPricing': ko.observable(false)
            };

            vmModifyOrder.items.push(cartItem);
        });
    };
}

function ModifyServiceModel() {
    var vmModifyService = this;

    vmModifyService.init = function() {

        vmModifyService.initialized = ko.observable(false);

        var modType = vmModifyService.modType.toString(),
            submitLabel = vmModifyService.submitLabel,
            submitForApprovalLabel = vmModifyService.submitForApprovalLabel;

        // retrieving an order
        if (vmModifyService.ticketId) {
            vmModifyService.vmCatalog = new CustomerCatalogModel();
            vmModifyService.vmOrderModel = window.customerOrder = window.customerOrderViewModel = new ModifyOrderModel();

            vmModifyService.vmOrderModel.modificationTypeString(modType);

            if (modType === "modify_service_equipment") {
                modType = 1;
            }
            else if (modType === "modify_service_features") {
                modType = 2;
            }
            else {
                modType = 3;
                vmModifyService.vmOrderModel.showItemInfo(false);
            }

            vmModifyService.vmOrderModel.modificationType(modType);

            if (modType === 1) {
                vmModifyService.vmOrderModel.modificationTypeLabel('Upgrade/Replace Equipment');
            } else if (modType === 2) {
                vmModifyService.vmOrderModel.modificationTypeLabel('Change Plan/Features');
            }

            var steppedWorkflowEndPoints = {
                endPoints: {
                    getSteppedWorkflowData: {
                        title: vmModifyService.workflowTitle,
                        steps: [
                            {
                                label: 'Details',
                                id: 'details',
                                completed: false
                            },
                            {
                                label: 'Contact',
                                id: 'contact',
                                completed: false
                            },
                            {
                                label: 'Review',
                                id: 'review',
                                completed: false
                            },
                            {
                                label: 'Confirmation',
                                id: 'confirmation',
                                completed: false,
                                hideIndicator: true
                            }
                        ]
                    }
                }
            };

            vmModifyService.vmSteppedWorkflow = window.vmSteppedWorkflow = new CustomerCatalogSteppedWorkflowModel();
            vmModifyService.vmSteppedWorkflow.endPoints = steppedWorkflowEndPoints;

            vmModifyService.initialized(true);

            vmModifyService.vmCatalog.initialized.subscribe(function(value) {
                if (value) {
                    vmModifyService.vmOrderModel.loadExistingOrder(vmModifyService.ticketId);
                    vmModifyService.vmSteppedWorkflow.goToStepById('confirmation');
                }
            });
        }
        else {
            // Store Params
            var queryString = MetTel.Utils.sanitizeString(window.location.search),
                queryParams = MetTel.Utils.getQueryParams(),
                serviceIds = MetTel.Utils.sanitizeString(queryParams.lines),
                category = MetTel.Utils.sanitizeString(queryParams.category),
                ticketContactId = MetTel.Utils.sanitizeString(queryParams.dirId);

            // Fetching/setting data from params
            var getServicesDataQueryString = '?inventoryids=' + serviceIds + '&clientId=' + vmModifyService.queryParams.clientId;

            var url = vmModifyService.endPoints.getServicesData + getServicesDataQueryString;

            $.getJSON(url, function(data) {
            })
            .done(function(data) {
                // Setting up catalog and order models
                vmModifyService.vmCatalog = new CustomerCatalogModel();
                vmModifyService.vmOrderModel = window.customerOrder = window.customerOrderViewModel = new ModifyOrderModel();

                if (ticketContactId) {
                    $.get(vmModifyService.endPoints.getTicketContact, { dirId: ticketContactId }, function (response) {
                        if (response) {
                            vmModifyService.vmOrderModel.ticketContact.sameContact(false);
                            vmModifyService.vmOrderModel.ticketContact.ticketContactEmail(response.Email);
                            vmModifyService.vmOrderModel.ticketContact.ticketContactId = ticketContactId;
                            vmModifyService.vmOrderModel.ticketContact.ticketContactName(response.FirstName + " " + response.LastName);
                            vmModifyService.vmOrderModel.ticketContact.ticketContactPhone(response.Phone);

                        }
                    });
                }

                if (typeof submitLabel !== 'undefined') {
                    vmModifyService.vmOrderModel.submitLabel(submitLabel);
                }

                if (typeof submitForApprovalLabel !== 'undefined') {
                    vmModifyService.vmOrderModel.submitForApprovalLabel(submitForApprovalLabel);
                }
                vmModifyService.vmOrderModel.modificationTypeString(modType);
                vmModifyService.vmOrderModel.lineIds = ko.observable(serviceIds);

                if (modType === "modify_service_equipment") {
                    modType = 1;
                }
                else if (modType === "modify_service_features") {
                    modType = 2;
                }
                else {
                    modType = 3;
                    vmModifyService.vmOrderModel.showItemInfo(false);
                }

                vmModifyService.vmOrderModel.modificationType(modType);

                if (modType === 1) {
                    vmModifyService.vmOrderModel.modificationTypeLabel('Upgrade/Replace Equipment');
                } else if (modType === 2) {
                    vmModifyService.vmOrderModel.modificationTypeLabel('Change Plan/Features');
                }

                vmModifyService.vmOrderModel.services(data);
                vmModifyService.vmOrderModel.ticketCategory = category;

                // Stepped Workflow
                var steppedWorkflowEndPoints = {
                    endPoints: {
                        getSteppedWorkflowData: {
                            title: vmModifyService.workflowTitle,
                            steps: [
                                {
                                    label: 'Details',
                                    id: 'details',
                                    completed: false
                                },
                                {
                                    label: 'Contact',
                                    id: 'contact',
                                    completed: false
                                },
                                {
                                    label: 'Review',
                                    id: 'review',
                                    completed: false
                                },
                                {
                                    label: 'Confirmation',
                                    id: 'confirmation',
                                    completed: false,
                                    hideIndicator: true
                                }
                            ]
                        }
                    }
                };
                // For upgrade/replace equipment and change plans/features, include the items step first
                if (modType < 3) {
                    steppedWorkflowEndPoints.endPoints.getSteppedWorkflowData.steps.unshift({
                        label: 'Items',
                        id: 'items',
                        completed: false,
                        hideIndicator: true
                    });
                }
                vmModifyService.vmSteppedWorkflow = window.vmSteppedWorkflow = new CustomerCatalogSteppedWorkflowModel();
                vmModifyService.vmSteppedWorkflow.endPoints = steppedWorkflowEndPoints;

                // For Change Plan/Features, fetch data for originally purchased item(s) and reconstruct the product,
                // which displays the product screen and selects the appropriate options
                if (modType !== 3) {
                    // Including the same query string we received which includes category, addressId, and Lines
                    var getOrderItemUrl = vmModifyService.endPoints.getOrderItem + queryString + '&modType=' + vmModifyService.vmOrderModel.modificationTypeString();

                    $.getJSON(getOrderItemUrl, function(data) {

                        // store original item
                        vmModifyService.vmOrderModel.originalOrderItemData = data;

                        var item = {
                            product: data.product,
                            quantity: data.quantity,
                            skuObject: data.skuObject,
                            subItems: []
                        };

                        if (data.lines.length === 1) {
                            item.subItems = data.lines[0].subItems;
                        }

                        if (modType === 2) {
                            if (data.lines) {
                                if (data.lines[0].domesticPlanCutOffDate) {
                                    vmModifyService.vmOrderModel.domesticPlanCutOffDate = ko.observable(new Date());
                                    vmModifyService.vmOrderModel.domesticPlanCutOffDateMin = ko.observable(new Date(data.lines[0].domesticPlanCutOffDate));
                                }

                                if (data.lines[0].internationalPlanCutOffDate) {
                                    vmModifyService.vmOrderModel.internationalPlanCutOffDate = ko.observable(new Date());
                                    vmModifyService.vmOrderModel.internationalPlanCutOffDateMin = ko.observable(new Date(data.lines[0].internationalPlanCutOffDate));
                                }
                            }
                        }

                        // For Change Plan/Features, reconstruct the product,
                        // which displays the product screen and selects the appropriate options
                        if (modType === 2) {
                            vmModifyService.vmOrderModel.originalOrderItem = item;
                            vmModifyService.vmOrderModel.reconstructProduct(item);
                        }

                        vmModifyService.vmOrderModel.modifiedSellerId(data.sellerId);
                        vmModifyService.vmOrderModel.modifiedSellerName(data.sellerName);
                        vmModifyService.vmOrderModel.modifiedSellerLogoURL(data.sellerLogoURL);

                        vmModifyService.setModifiedPrices(data.lines);
                    })
                        .fail(function() {
                            vmModifyService.vmOrderModel.orderItemError(true);
                        });

                    // For Upgrade/Replace Equipment, once we get the menu items, auto select the first category
                    if (modType === 1) {
                        vmModifyService.vmCatalog.selectCategoryOnUpdate();
                    }

                }

                // For other flows, add cart items (line info) initially
                if (modType === 3) {
                    vmModifyService.vmOrderModel.addLineItemsToCart();
                }

                vmModifyService.initialized(true);
                vmModifyService.vmSteppedWorkflow.goToStep(0);
            });
        }

    };

    vmModifyService.setModifiedPrices = function(lines) {
        var totalMonthly = 0,
            totalOneTime = 0,
            skuMonthly = 0,
            skuOneTime = 0;

        $.each(lines, function(i, line) {
            totalMonthly += line.totalMonthlyPrice;
            totalOneTime += line.totalOneTimePrice;
            skuMonthly += line.monthlyPrice;
            skuOneTime += line.oneTimePrice;
        });

        vmModifyService.vmOrderModel.modifiedTotalMonthlyPrice(totalMonthly);
        vmModifyService.vmOrderModel.modifiedTotalOneTimePrice(totalOneTime);
        vmModifyService.vmOrderModel.modifiedSkuMonthlyPrice(skuMonthly);
        vmModifyService.vmOrderModel.modifiedSkuOneTimePrice(skuOneTime);
    };
}

ko.bindingHandlers.modifyService = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.queryParams = options.queryParams;
            viewModel.modType = options.modType;
            viewModel.submitLabel = options.submitLabel;
            viewModel.submitForApprovalLabel = options.submitForApprovalLabel;
            viewModel.workflowTitle = options.workflowTitle;
        }

        if ($.deparam.fragment().hasOwnProperty('ticketId')) {
            viewModel.ticketId = $.deparam.fragment().ticketId;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'modify-service-template',
                data: viewModel
            }
        }, bindingContext);

        return {controlsDescendantBindings: true};
    }
};

/* global CallCenterRepModel */
// Represents a client menu item
// client: menu item data (JSON)
// toggleFavoriteUrl: url to toggle method
function NavigationClientViewModel(client, toggleFavoriteUrl) {
    var self = this;
    self.id = client.id;
    self.text = client.text;
    self.url = client.url;
    self.toggleFavoriteUrl = toggleFavoriteUrl + '?id=' + client.id;  // constructs the toggle url method call
    self.isFavorite = ko.observable(client.isFavorite);
    self.isSelected = ko.observable();

    // ajax call to the server of the toggle url method. fired by the clicking of a client star
    self.toggleFavorite = function (client, event) {
        $.ajax({
            url: self.toggleFavoriteUrl,
            type: "POST",
            contentType: "application/json",
            success: function () {
                // on success, flip the flag of a favorite
                self.isFavorite(!self.isFavorite());
            }
        });
        event.preventDefault();
        // prevents anchor redirect
        return false;
    };
}

// Represents a menu item
// item: menu item data (JSON)
function NavigationItemViewModel(item) {
    var self = this;
    self.id = item.id;
    self.text = item.text;
    self.url = item.url;
    self.isAction = item.isAction;
    self.isSelected = ko.observable();
    self.menu = ko.observableArray();
    self.useCallback = item.useCallback;
    self.jsCallBackFunction = item.jsCallBackFunction;

    // expanded parent menu item if child menu item is selected
    self.isExpanded = ko.computed(function () {
        return $.grep(self.menu(), function (i) {
            return i.isSelected();
        }).length > 0;
    });

    // if menu item has an array of child menu items, then loop through them
    // and create NavigationItemViewModel instances to bind
    if (item.menu) {
        self.menu($.map(item.menu, function (item) {
            return new NavigationItemViewModel(item);
        }));
    }
}

// Represents the navigation component
// callback: (OPTIONAL) function to call when json data retrieved via ajax
function NavigationViewModel() {
    var self = this;
    self.clients = ko.observableArray();
    self.menu = ko.observableArray();
    self.isLoaded = ko.observable(false);
    self.isRendered = ko.observable(false);
    self.showClients = ko.observable(true);

    // Selects an item based off the passed url.
    self.setSelectedUrl = function (url) {
        var found = false;

        var urlArray = url.split("?");
        var urlWithoutQuerystring = urlArray[0];

        // Grab the querystring from the passed URL, including the '?' to pass to our util function
        var urlQuerystring = urlArray[1] ? '?' + urlArray[1] : undefined;
        var urlParams = window.MetTel.Utils.getQueryParams(urlQuerystring);

        // clientid will always be numeric, so convert to int
        var clientId = parseInt(urlParams['clientid'], 10);

        // check to see if selected url is a client url
        if (self.clients().length) {
            var result = $.grep(self.clients(), function (c) {
                return c.id === clientId;   // returns the matching NavigationClientViewModel(s)
            });

            if (result.length > 0) {
                found = true;
                result[0].isSelected(found);    // sets the selected state for the first instance of the match
            }
        }

        var secondFound = false;

        // check to see if selected url is a menu url  (not within client section)
        if (self.menu().length) {
            // loop through each parent menu item
            $.each(self.menu(), function () {
                if (this.menu().length) {
                    // check the children menu first then the parent
                    var result = $.grep(this.menu(), function (i) {

                        var passedUrlArray = i.url.split("?");
                        var passedUrlWithoutQuerystring = passedUrlArray[0];

                        return passedUrlWithoutQuerystring === urlWithoutQuerystring;
                    });
                    if (result.length > 0) {
                        secondFound = true;
                        result[0].isSelected(secondFound);    // child menu found
                    }
                } else {

                    var passedUrlArray = this.url.split("?");
                    var passedUrlWithoutQuerystring = passedUrlArray[0];

                    if (passedUrlWithoutQuerystring === urlWithoutQuerystring) {
                        secondFound = true;
                        this.isSelected(secondFound);         // parent menu found
                    }
                }

                return !secondFound;  // break from loop if found
            });
        }
    };
}

ko.bindingHandlers.deferredLink = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $element = $(element),
            vmNavItem = viewModel,
            navItemCallback = bindingContext.$parents[1].navItemCallback;

        $element.on('click', function (e) {
            var link  = $element.attr('href'),
                $menu = $('.mettel-navigation-submenu');

            e.preventDefault();

            // either invoke callback if item dictates or follow link
            if (vmNavItem.useCallback && typeof navItemCallback === 'function') {
                navItemCallback(vmNavItem);
            } else {
                $menu.hide();
                window.location.href = link;
            }
        });
    }
};

ko.bindingHandlers.navigation = {
    init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
        var $element = $(element),
            options = valueAccessor(),
            initNavTabHandlers = function() {
                var $navToggle = $('[data-mettel-class="link-menu-toggle"]'),
                    $homeLink = $('[data-mettel-class="main-nav-link-home"]'),
                    $navPanel = $('[data-mettel-class="mettel-navigation"]'),
                    $navClose = $navPanel.children('[data-mettel-class="mettel-button-close"]'),
                    $helpChat = $navPanel.find('[data-mettel-class="nav-menu-help-chat"]');

                // tabbing from nav menu toggle
                $navToggle.keydown(function(e) {
                    var code = e.keyCode || e.which,
                        navPanelOpen = $navPanel.css('display') !== 'none'; // TODO: find a better way to determine if nav is open

                    // if forward tabbing with panel open, go to panel, other wise go to next as expected
                    if (code === 9 && !e.shiftKey && navPanelOpen) {
                        e.preventDefault();
                        $navClose.focus();
                    }
                });

                // tabbing from nav close button
                $navClose.keydown(function(e) {
                    var code = e.keyCode || e.which;

                    // if back tabbing
                    if (code === 9 && e.shiftKey) {
                        e.preventDefault();
                        $navToggle.focus();
                    }
                });

                // tabbing from bottom of nav panel
                $helpChat.keydown(function(e) {
                    var code = e.keyCode || e.which;

                    // if forward tabbing
                    if (code === 9 && !e.shiftKey) {
                        e.preventDefault();
                        $homeLink.focus();
                    }
                });

                // tabbing from home link
                $homeLink.keydown(function(e) {
                    var code = e.keyCode || e.which,
                        navPanelOpen = $navPanel.css('display') !== 'none'; // TODO: find a better way to determine if nav is open

                    // if back tabbing with nav panel open, got to end of nav panel
                    if (code === 9 && e.shiftKey && navPanelOpen) {
                        e.preventDefault();
                        $helpChat.focus();
                    }
                });
            };

        if (options.showClients === false) {
            viewModel.showClients(false);
        }

        if (options.navItemCallback) {
            viewModel.navItemCallback = options.navItemCallback;
        }

        // ajax call to get data for the navigation component
        $.getJSON(options.endPoints.getNavigationData, function (data) {
            viewModel.showClients(data.showClients);
            // if client menu item data is found
            if (data.clients) {
                viewModel.clients($.map(data.clients, function (client) {
                    return new NavigationClientViewModel(client, options.endPoints.toggleClientFavorite);
                }));
            }

            // if menu item data is found
            if (data.menu) {
                viewModel.menu($.map(data.menu, function (item) {
                    return new NavigationItemViewModel(item);
                }));
            }

            if (options.selectedUrl) {
                // set the navigation menu item selected state
                viewModel.setSelectedUrl(options.selectedUrl);
            }

            viewModel.isLoaded(true);
        });

        /*jshint -W020 */
        CallCenterRepModel = viewModel.CallCenterRepModel = new CallCenterRepModel(options.customerCare);

        viewModel.isLoaded.subscribe(function (value) {
            if (value) {
                $element.addClass('mettel-navigation');
                var $close = $('<button type="button" data-mettel-class="mettel-button-close" class="mettel-button-close"><span class="mettel-accessible-text">Close</span></button>'),
                    name = viewModel.showClients() ? 'navigation-with-client' : 'navigation-without-client';
                ko.applyBindingsToNode(element, {
                    template: {
                        name: name,
                        data: viewModel,
                        afterRender: function () {
                            $element.prepend($close);
                            $close.click(function () {
                                var data = $element.data('bs.offcanvas');
                                if (data) {
                                    data.hide();
                                    $('.mettel-link-menu-toggle').focus();
                                }
                            });

                            $('.mettel-link-menu-toggle').focus();

                            // client search link click handling
                            var searchLink = $('.mettel-navigation-client-search');

                            if (searchLink.length) {
                                $(searchLink).click(function () {
                                    if (jQuery.isFunction(options.clientSearchCallBackFunction)) {
                                        options.clientSearchCallBackFunction();
                                    }
                                });
                            }
                            viewModel.isRendered(true);

                            var heightCalculated = false;

                            // if the menu exceeds the available space, the ctas need to be re-positioned
                            $('.mettel-link-home, .mettel-link-menu-toggle').on('click', function() {
                                if (heightCalculated === false) {
                                    setTimeout(function() {
                                        var scrollHeight = $('[data-mettel-class="mettel-navigation"]')[0].scrollHeight,
                                            buttonHeight = $('[data-mettel-class="mettel-button-close"]').height(),
                                            clientsHeight = $('.mettel-navigation-clients').height(),
                                            menuHeight = $('.mettel-navigation-menu').height(),
                                            ctaHeight = $('.mettel-catalog-menu-cta-container').height(),
                                            spaceLeft = scrollHeight - buttonHeight - clientsHeight - menuHeight;

                                        if (spaceLeft < ctaHeight) {
                                            $('.mettel-catalog-menu-cta-container').css({
                                                'position': 'relative'
                                            });
                                        }

                                        heightCalculated = true;
                                    }, 1);
                                }
                            });

                            // remove visual disabled styles from nav menu toggle button
                            $('[data-mettel-class="link-menu-toggle"]').removeClass('mettel-state-loading');

                            initNavTabHandlers();
                        }
                    }
                }, bindingContext);
            }
        });
    }
};


// navigation sub menu
// Building an object to do the hovering of the submenu. Scrollbar affects the hover. This is why this function is needed.
(function () {
    "use strict";
    function SubMenu(element, options) {
        this.$element = $(element);
        this.$nav = this.$element.closest('[data-mettel-class="mettel-navigation"]');
        this.$submenu = this.$element.siblings('ul').clone(true, true).addClass('mettel-navigation-submenu');
        this.enter();
    }

    SubMenu.prototype.enter = function () {
        // find any nav item with hover and remove hover
        $('.mettel-navigation-item.mettel-state-hover').removeClass('mettel-state-hover');
        // find any submenu and remove them
        $('body').children('.mettel-navigation-submenu').hide().detach();

        this.$element.addClass('mettel-state-hover');
        $('body').append(this.$submenu);
        this.scroll();
        this.$submenu.show();

        this.$nav.on('scroll', $.proxy(this.scroll, this));
        this.$element.add(this.$submenu).add(this.$nav).on('mouseleave', $.proxy(this.leave, this));
    };
    SubMenu.prototype.leave = function (e) {
        var $current = $(e.toElement);
        if (this.$nav.is($current)) {
            var self = this;
            // cursor is over nav (mostly scrollbar) so don't hide submit
            this.$nav.on('mouseenter', '*', function (e) {
                // listen for mouse hovering over something else in the nav (except scrollbar and current parent) and hide submenu
                if (!self.$element.is($(e.toElement))) {
                    self.reset();
                }
            });
            return;
        } else if (this.$element.is($current) || this.$submenu.has($current).length) {
            return; // don't hide if cursor is over parent or submenu
        }

        this.reset();
    };
    SubMenu.prototype.reset = function () {
        this.$nav.off('mouseenter');
        this.$element.removeClass('mettel-state-hover');
        this.$submenu.hide().detach();
        this.$nav.off('scroll', $.proxy(this.scroll, this));
    };

    SubMenu.prototype.scroll = function (e) {
        if (this.$submenu.outerHeight() + ( this.$element.offset().top - $(window).scrollTop() ) > window.innerHeight) {
            // submenu is off-screen (at the bottom) ... reposition it on-screen
            this.$submenu.css('top', this.$element.offset().top + this.$element.outerHeight() - this.$submenu.innerHeight());
        } else {
            this.$submenu.css('top', this.$element.offset().top);
        }
    };
    var old = $.fn.submenu;
    $.fn.submenu = function (option) {
        return this.each(function () {
            var $this = $(this),
                data = $this.data('mettel.submenu'),
                options = typeof option === 'object' && option;

            if (!data) {
                $this.data('mettel.submenu', (data = new SubMenu(this, options)));
            }
            if (typeof option === 'string') {
                data[option]();
            }
        });
    };

    $.fn.submenu.Constructor = SubMenu;

    $.fn.submenu.noConflict = function () {
        $.fn.submenu = old;
        return this;
    };

    $(document).on('mouseenter.mettel.submenu.data-api', '.mettel-state-collapsed .mettel-navigation-item', function (e) {
        var $this = $(this);
        if ($this.siblings('ul').length) {
            e.stopPropagation();
            var data = $this.data('mettel.submenu');
            if (data) {
                data.enter();
            } else {
                $this.submenu($this.data());
            }
        }
    });
})();


function OpenTicketsModel() {
    var self = this;

    // Entire array of all graphs to be built
    this.graphModules = ko.observableArray();

    // To represent max amount of tickets for all modules
    this.maxTickets = ko.observable();

    // Get open tickets data for the first time
    this.init = function () {

        // Set url with query params
        var url = self.endPoints.getOpenTicketsData + self.queryString();

        // Go fetch the open tickets data
        $.getJSON(url, function (data) {

            // Hide loader
            self.ajaxResponded(true);

            self.graphModules(data.graphModules);

            var allTicketsArray = [],
                maxTickets;

            // Go through each module and each day within each module to build an array with all ticket amounts
            $.each(data.graphModules, function (i, graphModule) {
                $.each(graphModule.ticketDays, function (j, day) {
                    allTicketsArray.push(day.tickets);
                });
            });

            // Find out maximum amount of tickets
            maxTickets = Math.max.apply(Math, allTicketsArray);

            self.maxTickets(maxTickets);

            if (self.completeEvent) {
                self.completeEvent(self);
            }


        });

    };

}

ko.bindingHandlers.openTickets = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        MetTel.DashboardBaseModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'open-tickets',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.lastCount = {
    // Pass in the array of days as the valueAccessor, get the amount of tickets on the last day, and set it as the text for the element
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            ticketDays = valueAccessor(),
            lastDay = _.last(ticketDays),
            lastTicketCount = lastDay.tickets;
        $element.text(lastTicketCount);
    }
};

ko.bindingHandlers.openTicketsSparkline = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            ticketDays = valueAccessor(),
            maxTickets = bindingContext.$parent.maxTickets(),
            $moduleContainer = $element.closest('.mettel-open-ticket-module'),
            $contentContainer = $moduleContainer.closest('.mettel-open-tickets-content-inner'),
            contentContainerWidth = $contentContainer.width(),
            modulesAmount = bindingContext.$parent.graphModules().length;

        $contentContainer.attr("class", "mettel-open-tickets-content-inner");

        if (modulesAmount === 1) {
            $moduleContainer.css('width', contentContainerWidth + 'px');
        } else if (modulesAmount === 2 || modulesAmount === 4) {
            $moduleContainer.css('width', (contentContainerWidth - 5) / 2 + 'px');
            $contentContainer.addClass('two-modules');
        } else if (modulesAmount === 3 || modulesAmount >= 6) {
            $moduleContainer.css('width', (contentContainerWidth - 10) / 3 + 'px');
            $contentContainer.addClass('three-modules');
        } else if (modulesAmount === 5) {
            $contentContainer.addClass('three-modules');
            if (bindingContext.$index() < 3) {
                $moduleContainer.css('width', (contentContainerWidth - 10) / 3 + 'px');
            } else {
                $moduleContainer.css('width', (contentContainerWidth - 5) / 2 + 'px');
            }
        }

        var chartConfig = {
            seriesDefaults: {
                type: 'line',
                color: '#ABDFF8',
                width: 2,
                markers: {
                    visible: true,
                    background: '#fff',
                    size: 7,
                    border: {
                        color: '#fff',
                        width: 1
                    }
                },
                highlight: {
                    markers: {
                        color: '#2CB0ED',
                        border: {
                            width: 1,
                            color: '#fff',
                            opacity: 1
                        }
                    }
                }
            },
            dataSource: {
                data: ticketDays
            },
            series: [
                {
                    field: 'tickets'
                }
            ],
            tooltip: {
                visible: true,
                background: 'transparent',
                border: {
                    width: 0
                },
                template: '<div class="mettel-open-tickets-tooltip mettel-right"><div class="mettel-tooltip-bubble">#= dataItem.date # - #= value #</div></div>'
            },
            categoryAxis: {
                crosshair: {
                    visible: false
                },
                line: {
                    visible: false
                },
                majorGridLines: {
                    visible: false
                }
            },
            valueAxis: {
                min: 0,
                max: maxTickets,
                labels: {
                    visible: false
                },
                line: {
                    visible: false
                },
                majorGridLines: {
                    visible: false
                }
            },
            chartArea: {
                height: 60,
                margin: {
                    top: 10,
                    right: 10,
                    bottom: 0,
                    left: 0
                },
                background: 'transparent'
            },
            plotArea: {
                margin: 0
            },
            panes: [
                {
                    clip: false
                }
            ]
        };

        $element.kendoChart(chartConfig);

        var rerenderGraph = _.debounce(function () {

            contentContainerWidth = $contentContainer.width();

            if (modulesAmount === 1) {
                $moduleContainer.css('width', contentContainerWidth + 'px');
            } else if (modulesAmount === 2 || modulesAmount === 4) {
                $moduleContainer.css('width', (contentContainerWidth - 5) / 2 + 'px');
            } else if (modulesAmount === 3 || modulesAmount >= 6) {
                $moduleContainer.css('width', (contentContainerWidth - 10) / 3 + 'px');
            } else if (modulesAmount === 5) {
                if (bindingContext.$index() < 3) {
                    $moduleContainer.css('width', (contentContainerWidth - 10) / 3 + 'px');
                } else {
                    $moduleContainer.css('width', (contentContainerWidth - 5) / 2 + 'px');
                }
            }

            $element.kendoChart(chartConfig);

        }, 500);


        $(window).resize(function () {

            rerenderGraph();

        });

    }
};

ko.bindingHandlers.overlayToggle = {
    init: function (element, valueAccessor) {
        var $element = $(element),
            accessor = valueAccessor();

        // add classname so we can find it later
        $element.addClass('mettel-overlay-toggle-trigger');
        $element.on('click', function () {
            // Toggle the overlay
            accessor(!accessor());
        });
    },
    update: function (element, valueAccessor) {
        var $element = $(element),
            accessor = valueAccessor();

        if (accessor()) {

            $element.addClass('mettel-state-overlay-active');

        } else {

            $element.removeClass('mettel-state-overlay-active');
        }
    }
};

ko.bindingHandlers.overlay = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $toggle = $element.prev().find('.mettel-overlay-toggle-trigger').addBack('.mettel-overlay-toggle-trigger').first(), // the toggle won't always be the previous element (as for the action buttons) so look for it via the classname
            accessor = valueAccessor();

        if (accessor()) {

            $element.addClass('mettel-state-overlay-active');

            var handler = function (e) {
                // When the document is clicked anywhere other than this overlay's toggle, or anywhere within this overlay itself
                if (e.target !== $element[0] && e.target !== $toggle[0] && !$.contains($element[0], e.target)) {

                    // Remove the event handler
                    $(document).off('click', handler);

                    // Close the overlay
                    accessor(false);
                }
            };
            $(document).on('click', handler);

        } else {

            $element.removeClass('mettel-state-overlay-active');
        }
    }
};

/*global ProductCatalogModel, CustomerCatalogModel, ProductModel, customerOrderViewModel, vmSteppedWorkflow, CartItem, ItemGroup */
var hashHistorySaved = false;
var hashHistory = [window.location.hash];
var productCatalogViewModel = false;

/**
 * This is the basic hashhistory loadFragment handler. We check the
 * product dirty flag before navigating away from a product page, in case
 * the user has modified the product in any way.
 */
function pcvmLoadFragment() {

    if (productCatalogViewModel) {

        if (hashHistory.length >= 2 && (hashHistory[hashHistory.length - 2] === window.location.hash)) {

            // If the previous page (2 back, since we just loaded a new fragment) is the same as the current
            // page, then we probably have a back button press.

            // We treat these differently because we don't want the previous page to become a NEW history
            // state, so we just truncate the hash history in that case.

            hashHistorySaved = hashHistory.pop();
            var $modal = $('[data-mettel-class="product-unsaved-changes-modal"]'),
                $confirm = $modal.find('[data-mettel-class="modal-confirm-unsaved-changes-discard"]'),
                $cancel = $modal.find('[data-mettel-class="modal-confirm-unsaved-changes-cancel"]');

            // if the product is dirty, then show the confirm dialog.
            if (productCatalogViewModel.activeProduct() && typeof productCatalogViewModel.activeProduct().productIsDirty !== "undefined") {

                if (productCatalogViewModel.activeProduct().productIsDirty() === true) {
                    $modal.modalWindow();
                    $confirm.focus();

                    $confirm.click(function (event) {
                        $modal.modalWindow('close');
                        productCatalogViewModel.updateLocation($.deparam.fragment());
                    });

                    $cancel.click(function () {
                        $modal.modalWindow('close');
                    });
                }

                else {
                    productCatalogViewModel.updateLocation($.deparam.fragment());
                }

            } else {
                productCatalogViewModel.updateLocation($.deparam.fragment());
            }

        } else if (productCatalogViewModel.updateLocation) {
            // not a back button press, so we can proceed as normal (dirty state will be handled by the
            // normal hashchange.)
            hashHistorySaved = false;
            hashHistory.push(window.location.hash);
            productCatalogViewModel.updateLocation($.deparam.fragment());
        }
    }
}


function toTitleCase(str) {
    return str.replace(/\b\w+/g, function (s) {
        return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase();
    });
}

function asyncComputed(evaluator, owner) {
    var result = ko.observable();

    ko.computed(function () {
        // Get the $.Deferred value, and then set up a callback so that when it's done,
        // the output is transferred onto our "result" observable
        evaluator.call(owner).done(result);
    });

    return result;
}

function PreviewPricingOptionsGridModel(data) {
    GridModel.call(this, data);

    var self = this;

    self.waitDuration = ko.observable(5000);
    self.maxDuration = ko.observable(40000);
    self.apiUrl = ko.observable('/api/ConsumerCatalog/CheckPricing');
    self.asyncIntervals = ko.observableArray();

    this.killAsyncIntervals = function () {
        _.each(self.asyncIntervals(), function (interval) {
            clearInterval(interval);
        });
        self.asyncIntervals.removeAll();
    };

    // overriding default grid method so we can also kill the async intervals when sorting
    this.selectColumn = function (column) {
        if (column.sortable) {
            self.killAsyncIntervals();
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

    this.completeEvent = function () {

        var selectedSet = false;

        _.each(this.rows(), function (row) {

            // set up any pending rows
            if (MetTel.Utils.stricmp(row.data()['Status'], 'pending')) {

                row.disableRow(true);

                var maxAttempts = self.maxDuration() / self.waitDuration(),
                    numAttempts = 0,
                    objInterval;

                objInterval = setInterval(
                    function () {
                        $.ajax({
                            url: self.apiUrl(),
                            type: 'POST',
                            data: JSON.stringify(row.data()),
                            contentType: 'application/json',
                            dataType: 'json',
                            complete: function (response) {
                                response = response.responseJSON;
                                if (MetTel.Utils.stricmp(response.Status, 'valid')) {
                                    self.asyncIntervals.remove(objInterval);
                                    clearInterval(objInterval);
                                    row.disableRow(false);
                                    row.data().Monthly = response.MonthlyCost;
                                    row.data().OneTime = response.OneTimeCost;
                                    row.data().Status = 'valid';
                                    row.data.valueHasMutated();
                                }
                                else if (MetTel.Utils.stricmp(response.Status, 'error')) {
                                    self.asyncIntervals.remove(objInterval);
                                    clearInterval(objInterval);
                                    row.disableRow(false);
                                    row.data().Status = 'error';
                                    row.data.valueHasMutated();
                                }
                                else {
                                    numAttempts++;
                                    // max time has elapsed
                                    if (numAttempts === maxAttempts) {
                                        self.asyncIntervals.remove(objInterval);
                                        clearInterval(objInterval);
                                        row.disableRow(false);
                                        row.data().Status = 'elapsed';
                                        row.data.valueHasMutated();
                                    }
                                }
                            }
                        });
                    },
                    self.waitDuration()
                );

                self.asyncIntervals.push(objInterval);
            }
            // only pre-select rows that are not pending
            else {
                if (selectedSet === false) {
                    selectedSet = true;
                    row.selected(true);
                }
            }
        });

    };
}

function BaseProductModel(options) {
    var vmBaseProduct = this;
    vmBaseProduct.vmProductCatalog = options.productCatalogModel || null;

    vmBaseProduct.mappedProduct = {};

    vmBaseProduct.skus = ko.observableArray();

    // Thumbnails

    vmBaseProduct.thumbnailSelectedObservables = ko.observableArray();
    vmBaseProduct.selectedThumbnail = ko.observable();

    // Find the selected thumbnail and deselect it
    vmBaseProduct.deselectOtherThumbnail = function () {
        $.each(vmBaseProduct.thumbnailSelectedObservables(), function (i, selectedProperty) {
            if (selectedProperty()) {
                selectedProperty(false);
            }
        });
    };

    vmBaseProduct.selectThumbnail = function (newlySelectedThumbnail) {
        vmBaseProduct.deselectOtherThumbnail();
        newlySelectedThumbnail.selected(true);
        vmBaseProduct.selectedThumbnail(newlySelectedThumbnail);
    };

    // Preview

    vmBaseProduct.returnOptionGroupTypeFromId = function (optionGroupTypeId) {
        var newOptionGroupType;

        // Determine new option group's type
        switch (optionGroupTypeId) {
            case 1:
                newOptionGroupType = 'multiple choice';
                break;
            case 2:
                newOptionGroupType = 'checkboxes';
                break;
            case 3:
                newOptionGroupType = 'free text';
                break;
            case 4:
                newOptionGroupType = 'read-only';
                break;
        }

        return newOptionGroupType;
    };

    vmBaseProduct.optionQuantityTypes = ko.observableArray([
        {
            id: 1,
            name: 'Same as Product Quantity'
        },
        {
            id: 2,
            name: 'Multiple of Product Quantity'
        },
        {
            id: 3,
            name: 'Specified by Customer'
        }
    ]);

    vmBaseProduct.oneTimeTerms = productCatalogViewModel.oneTimeTerms;
    vmBaseProduct.pricingTypes = productCatalogViewModel.pricingTypes;
    vmBaseProduct.financeTerms = productCatalogViewModel.financeTerms;

    vmBaseProduct.productDataLoaded = ko.observable(false);


    /**
     * Returns whether or not a SKU attribute option matches
     * any available SKU (based on other selected options)
     *
     * @param {String} option
     * @return {Boolean}
     */
    vmBaseProduct.optionMatchesAvailableSku = function (optionName, value) {
        return ko.computed(function () {
                var pgOptions = productCatalogViewModel.previewGroupOptions();

                var choices = {};

                for (var i = 0; i < pgOptions.length; i++) {
                    if (ko.utils.unwrapObservable(pgOptions[i].type) === "skus") {
                        choices[ko.utils.unwrapObservable(pgOptions[i].name)] = pgOptions[i].previewSelectedChoice();
                    }
                }
                // Override with the proposed value to see if this makes any sense
                choices[optionName] = value;

                for (var j = 0; j < vmBaseProduct.skus().length; j++) {
                    var match = true,
                        attributes = vmBaseProduct.skus()[j].attributes();

                    for (var key in choices) {
                        for (var l = 0; l < attributes.length; l++) {
                            if (MetTel.Utils.stricmp(attributes[l].key(), key) && !MetTel.Utils.stricmp(attributes[l].value(), choices[key])) {
                                match = false;
                            }
                        }
                    }
                    if (match) {
                        return true;
                    }
                }


                return false;
            }
        );
    };

    vmBaseProduct.enableRadioOption = function(type, index, optionName, value) {
        if (type === 'skus' && index > 0) {
            return vmBaseProduct.optionMatchesAvailableSku(optionName, value);
        } else {
            return true;
        }
    };

    vmBaseProduct.enableSelectOption = function(index, optionName, value) {
        if (index > 0) {
            return vmBaseProduct.optionMatchesAvailableSku(optionName, value);
        } else {
            return true;
        }
    };

    vmBaseProduct.setupSkuSelectOptionsDisable = function(optionEl, item) {
        var optionGroup = ko.dataFor($(optionEl).closest('[data-mettel-class="product-preview-option-group"]')[0]);
        ko.applyBindingsToNode(optionEl, {
            enable: vmBaseProduct.enableSelectOption(optionGroup.index, optionGroup.name, item.choice)
        }, item);
    };

    vmBaseProduct.skuAutoSelectRunning = ko.observable(false);

    /**
     * Returns the SKU referred to by the options selected in the
     * preview window.
     *
     * @return {Object} sku
     */
    vmBaseProduct.previewSelectedSku = ko.computed(function () {
        var pgOptions = productCatalogViewModel.previewGroupOptions(),
            skuAutoSelectRunning = vmBaseProduct.skuAutoSelectRunning();

        var choices = {};

        for (var i = 0; i < pgOptions.length; i++) {
            if (ko.utils.unwrapObservable(pgOptions[i].type) === "skus") {
                choices[ko.utils.unwrapObservable(pgOptions[i].name)] = pgOptions[i].previewSelectedChoice();
            }
        }

        if (!vmBaseProduct.viewableSKUs || skuAutoSelectRunning) {
            return {
                'sku': ko.observable('No matching SKU found.')
            };
        }

        for (var j = 0; j < vmBaseProduct.viewableSKUs().length; j++) {
            var match = true,
                attributes = vmBaseProduct.viewableSKUs()[j].attributes();

            for (var key in choices) {
                for (var l = 0; l < attributes.length; l++) {
                    if (MetTel.Utils.stricmp(attributes[l].key(), key) && !MetTel.Utils.stricmp(attributes[l].value(), choices[key])) {
                        match = false;
                    }
                }
            }
            if (match) {
                return vmBaseProduct.viewableSKUs()[j];
            }
        }

        return {
            'sku': ko.observable('No matching SKU found.')
        };
    });

    /**
     * Returns the first SKU found to match the attribute key/value pair passed.
     *
     * @param {String} attrKey
     * @param {String} attrValue
     * @return {Object} sku
     */
    vmBaseProduct.findMatchingSku = function(attrKey, attrValue) {

        var skus = vmBaseProduct.skus(),
            matchingSku;

        for (var i = 0; i < skus.length; i++) {

            if (matchingSku) {
                break;
            }

            var sku = skus[i],
                attrs = sku.attributes();

            for (var j = 0; j < attrs.length; j++) {

                var attr = attrs[j],
                    nameMatches = MetTel.Utils.stricmp(attrKey, attr.key()),
                    valueMatches = MetTel.Utils.stricmp(attrValue, attr.value());

                if (nameMatches && valueMatches) {
                    matchingSku = sku;
                    break;
                }
            }
        }

        return matchingSku;
    };

    vmBaseProduct.previewSelectedSku.subscribe(function(newSku) {
        if (!vmBaseProduct.skuAutoSelectRunning() && newSku.sku() === 'No matching SKU found.') {
            vmBaseProduct.skuAutoSelectRunning(true);

            // find a matching sku
            var allGroups = productCatalogViewModel.previewGroupOptions(),
                matchingSku;

            if (allGroups.length) {
                var firstGroup = allGroups[0],
                    firstGroupName = firstGroup.name,
                    firstChoice = typeof firstGroup.previewSelectedChoice === 'function' ? firstGroup.previewSelectedChoice() : '';

                if (firstGroupName && firstChoice) {
                    matchingSku = vmBaseProduct.findMatchingSku(firstGroupName, firstChoice);
                }
            }

            if (!matchingSku) {
                vmBaseProduct.skuAutoSelectRunning(false);
                return false;
            }

            // map the attributes
            var attributesMap = {};
            for (var i = 0; i < matchingSku.attributes().length; i++) {
                var attr = matchingSku.attributes()[i];
                attributesMap[attr.key().toLowerCase()] = attr.value();
            }

            // select choices for that sku
            for (var j = 0; j < allGroups.length; j++) {
                var group = allGroups[j];

                if (j > 0 && group.type === 'skus') {

                    var newChoice = attributesMap[group.name],
                        forString = (group.name + newChoice).replace(/[^a-z0-9 ]/gi,'').replace(/ /g,'_').toLowerCase(),
                        radio = $('[for="' + forString + '"] input')[0];

                    if (radio) {
                        // radio
                        var radioToClick = radio;
                        /*jshint -W083 */
                        setTimeout(function() { // needs to be delayed to trigger previewSelectedSku
                            radioToClick.click();
                        }, 1);
                    } else {
                        // select
                        var optionGroup = group,
                            formatValue = newChoice.replace(/(\W|_)+/g, '').toLowerCase();
                        setTimeout(function() { // needs to be delayed to trigger previewSelectedSku
                            optionGroup.previewSelectedChoice(formatValue);
                        }, 1);
                    }
                }
            }

            vmBaseProduct.skuAutoSelectRunning(false);
        }
    });


    /**
     * Returns whether or not a particular SKU matches the configured options in a
     * pricing group.
     *
     * @param {Object} sku
     * @return {Boolean}
     */
    vmBaseProduct.skuMatchesPricingGroup = function (sku, pricingGroup) {
        return ko.computed(function () {

            var matched = true,
                pgOptions = pricingGroup.options(),
                skuAttributes = sku.attributes();

            // If there are no options, then it can't match anything.
            if (pgOptions.length === 0) {
                return false;
            }


            // Loop through each option and check it against all attributes in the SKU.
            // If any of the selectedValues in the option match a SKU attribute with the
            // same name and value, then the option passes. If all options mass, the SKU
            // is a match.
            for (var i = 0; i < pgOptions.length; i++) {

                if (ko.utils.unwrapObservable(pgOptions[i].type) === 'ATTRIBUTES') {

                    var optionMatch = false,
                        selectedValues = pgOptions[i].selectedValues();

                    for (var j = 0; j < selectedValues.length; j++) {

                        for (var k = 0; k < skuAttributes.length; k++) {
                            if (MetTel.Utils.stricmp(skuAttributes[k].key(), pgOptions[i].name()) && MetTel.Utils.stricmp(selectedValues[j].value, skuAttributes[k].value())) {
                                optionMatch = true;
                            }
                        }

                    }

                    matched = matched && optionMatch;

                }
            }

            return matched;
        });
    };

    /**
     * Proxy - Get a list of all the checked attributes for a
     * particular SKU name.
     *
     * @param {String} skuName
     * @return {Array}
     */
    // This function may need to be converted to a computed in the future
    // so that the sku's checkedAttrsString is always up to date
    vmBaseProduct.CheckedAttrsForSKU = function (skuName) {
        return productCatalogViewModel.checkedAttrsForSKU(skuName, vmBaseProduct.skus());
    };

    // Flattened Product
    vmBaseProduct.flattenedProduct = function () {
        var cache = [];
        var flattened = JSON.stringify(ko.mapping.toJS(productCatalogViewModel.activeProduct), function (key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Circular reference found, discard key
                    return;
                }
                // Store value in our collection
                cache.push(value);
            }
            return value;
        });

        return flattened;
    };

    vmBaseProduct.stripItemState = function (o) {
        if (Object.prototype.toString.call(o) === '[object Array]') {
            for (var i = 0; i < o.length; i++) {
                o[i] = this.stripItemState(o[i]);
            }
        } else if (typeof o === 'object' && o !== null) {
            if (o.hasOwnProperty('itemState')) {
                delete o.itemState;
            }
            for (var key in o) {
                o[key] = this.stripItemState(o[key]);
            }
        }

        return o;
    };

    vmBaseProduct.formatForPricingGroups = function () {
        // Strip the item states
        var prod = this.stripItemState(JSON.parse(this.flattenedProduct()));

        var structure = {};

        if (typeof customerOrderViewModel === 'undefined') {
            structure.prod = prod;
        } else if (typeof customerOrderViewModel.addressDialogVm === 'function' && typeof customerOrderViewModel.addressDialogVm().addressId === 'function') {
            structure.addressId = customerOrderViewModel.addressDialogVm().addressId();
        }

        if (typeof customerOrderViewModel !== 'undefined' && customerOrderViewModel.modifyOrder) {
            structure.disableAPIPricing = true;
            structure.sellerIds = "0";
        }
        else {
            structure.disableAPIPricing = false;
            var arrSellerIds = _.uniq(_.pluck(prod.sellers, 'sellerId'));
            structure.sellerIds = arrSellerIds.toString();
        }

        structure.productId = prod.hasOwnProperty('id') ? prod.id : 0;
        structure.quantity = vmBaseProduct.previewPricingOptionsSelectedQuantity();
        structure.sku = this.stripItemState(ko.mapping.toJS(vmBaseProduct.previewSelectedSku()));
        structure.subSkus = [];
        structure.sellerCodes = prod.sellerCodes;

        var captureSubSubSkus = function(addedSubSku, selectedChoice) {

            if (addedSubSku) {
                addedSubSku.subSkus = addedSubSku.subSkus || [];

                if (selectedChoice.subOptionGroups && selectedChoice.subOptionGroups().length) {

                    $.each(selectedChoice.subOptionGroups(), function(subOptGroupIndex, subOptGroup) {
                        if (subOptGroup.optionGroupTypeId() === 1) {
                            // Make sure the option group has a choice selected (other than "None" and "No change - Keep individual values")
                            if (subOptGroup.subSubProductSelection() && subOptGroup.subSubProductSelection().name() !== "None" && subOptGroup.subSubProductSelection().name() !== "No change - Keep individual values") {

                                var skuToPush = ko.mapping.toJS(subOptGroup.subSubProductSelection().sku);

                                skuToPush.productName = subOptGroup.subSubProductSelection().name();
                                skuToPush.subcategoryId = subOptGroup.subcategoryId();
                                skuToPush.quantity = addedSubSku.quantity; // quantity same as parent

                                skuToPush.attributesMap = {};
                                $.each(skuToPush.attributes, function(attrIndex, attr) {
                                    skuToPush.attributesMap[attr.key] = attr.value;
                                });

                                addedSubSku.subSkus.push(skuToPush);
                            }
                        } else if (subOptGroup.optionGroupTypeId() === 2) {
                            $.each(subOptGroup.products(), function(subSubProductIndex, subSubProduct) {
                                if (subSubProduct.selected()) {

                                    var skuToPush = ko.mapping.toJS(subSubProduct.sku);

                                    skuToPush.productName = subSubProduct.name();
                                    skuToPush.subcategoryId = subOptGroup.subcategoryId();
                                    skuToPush.quantity = addedSubSku.quantity; // quantity same as parent

                                    skuToPush.attributesMap = {};
                                    $.each(skuToPush.attributes, function(attrIndex, attr) {
                                        skuToPush.attributesMap[attr.key] = attr.value;
                                    });

                                    addedSubSku.subSkus.push(skuToPush);
                                }
                            });
                        }
                    });
                }
            }
        };

        var calculateSubItemQuantity = function(qtyValue, qtyType, parentQty) {
            var actualQty;

            switch (qtyType) {
                case 1:
                    actualQty = parentQty;
                    break;
                case 2:
                    actualQty = qtyValue * parentQty;
                    break;
                case 3:
                    actualQty = qtyValue;
                    break;
            }

            return actualQty;
        };

        // Find all the skus for the selected sub options
        $.each(productCatalogViewModel.previewGroupOptions(), function (i, previewOptionGroup) {
            if (previewOptionGroup.type !== 'skus') {

                // For multiple choice option groups
                // Make sure the option group has a choice selected (other than "None" and "No change - Keep individual values")
                if (previewOptionGroup.configuration === 1 && previewOptionGroup.previewSelectedChoiceObject() && previewOptionGroup.previewSelectedChoice() !== "None" && previewOptionGroup.previewSelectedChoice() !== "No change - Keep individual values") {
                    var skuAdded; // reference used for adding sub sub skus

                    // Make sure the choice(s) have showing sub options
                    if (previewOptionGroup.previewSelectedChoiceObject().subOptionsHaveSelectedAttribute()) {
                        $.each(previewOptionGroup.previewSelectedChoiceObject().subOptions(), function (j, sku) {
                            if (sku.sku === previewOptionGroup.previewSelectedChoiceObject().subProductSelection()) {
                                sku.subcategoryId = previewOptionGroup.subcategoryId;
                                sku.productName = previewOptionGroup.previewSelectedChoice();

                                structure.subSkus.push(sku);
                                skuAdded = sku;

                                var nameSlugified = previewOptionGroup.name.replace(/\s+/g, '-').toLowerCase();
                                structure.subSkus.slice(-1)[0].optionGroupSlugified = nameSlugified;
                                structure.subSkus.slice(-1)[0].parentFingerPrint = previewOptionGroup.name.replace(/(\W|_)+/g, '') + previewOptionGroup.previewSelectedChoice().replace(/(\W|_)+/g, '');
                                structure.subSkus.slice(-1)[0].parentConfigType = previewOptionGroup.configuration;
                                structure.subSkus.slice(-1)[0].quantityTypeId = previewOptionGroup.quantityTypeId();
                                structure.subSkus.slice(-1)[0].quantity = calculateSubItemQuantity(parseInt(previewOptionGroup.previewSelectedChoiceObject().quantity(), 10), previewOptionGroup.quantityTypeId(), vmBaseProduct.previewPricingOptionsSelectedQuantity());
                                structure.subSkus.slice(-1)[0].fingerPrint = previewOptionGroup.previewSelectedChoice().replace(/(\W|_)+/g, '') + sku.sku.replace(/(\W|_)+/g, '');

                                structure.subSkus.slice(-1)[0].attributesMap = {};
                                for (var k = 0; k < sku.attributes.length; k++) {
                                    structure.subSkus.slice(-1)[0].attributesMap[sku.attributes[k].key] = sku.attributes[k].value;
                                }

                                structure.subSkus.slice(-1)[0].subSkus = [];
                                if (previewOptionGroup.miniCatalog() && previewOptionGroup.previewSelectedChoiceObject().miniCatalogLoaded()) {
                                    structure.subSkus.slice(-1)[0].subSkus =
                                        JSON.parse(
                                            previewOptionGroup.previewSelectedChoiceObject()
                                                .miniCatalogItem.formatForPricingGroups()).subSkus;
                                }

                                return false;
                            }
                        });
                    } else {
                        // If not showing sub options, just use it's first sku, since that should be the only one
                        var sku = previewOptionGroup.previewSelectedChoiceObject().subOptions()[0];
                        if (sku) {
                            sku.subcategoryId = previewOptionGroup.subcategoryId;
                            sku.productName = previewOptionGroup.previewSelectedChoice();
                            sku.subSkus = [];

                            structure.subSkus.push(sku);
                            skuAdded = sku;
                            structure.subSkus.slice(-1)[0].optionGroupSlugified = previewOptionGroup.name.replace(/\s+/g, '-').toLowerCase();
                            structure.subSkus.slice(-1)[0].parentFingerPrint = previewOptionGroup.name.replace(/(\W|_)+/g, '') + previewOptionGroup.previewSelectedChoice().replace(/(\W|_)+/g, '');
                            structure.subSkus.slice(-1)[0].parentConfigType = previewOptionGroup.configuration;
                            structure.subSkus.slice(-1)[0].quantityTypeId = previewOptionGroup.quantityTypeId();
                            structure.subSkus.slice(-1)[0].quantity = calculateSubItemQuantity(parseInt(previewOptionGroup.previewSelectedChoiceObject().quantity(), 10), previewOptionGroup.quantityTypeId(), vmBaseProduct.previewPricingOptionsSelectedQuantity());
                            structure.subSkus.slice(-1)[0].fingerPrint = previewOptionGroup.previewSelectedChoice().replace(/(\W|_)+/g, '') + sku.sku.replace(/(\W|_)+/g, '');

                            structure.subSkus.slice(-1)[0].attributesMap = {};
                            for (var k = 0; k < sku.attributes.length; k++) {
                                structure.subSkus.slice(-1)[0].attributesMap[sku.attributes[k].key] = sku.attributes[k].value;
                            }

                            structure.subSkus.slice(-1)[0].subSkus = [];
                            if (previewOptionGroup.miniCatalog() && previewOptionGroup.previewSelectedChoiceObject().miniCatalogLoaded()) {
                                structure.subSkus.slice(-1)[0].subSkus =
                                    JSON.parse(
                                        previewOptionGroup.previewSelectedChoiceObject()
                                            .miniCatalogItem.formatForPricingGroups()).subSkus;
                            }
                        }
                    }

                    captureSubSubSkus(skuAdded, previewOptionGroup.previewSelectedChoiceObject());
                }

                // For checkboxes option groups
                if (previewOptionGroup.configuration === 2) {

                    // Check all possible choices
                    $.each(previewOptionGroup.choices(), function (j, choice) {

                        // If the choice is checked
                        if (productCatalogViewModel.availableOptions()[previewOptionGroup.type]()[previewOptionGroup.name][choice.choice]()) {
                            var skuAdded; // reference used for adding sub sub skus

                            // Make sure the choice has showing sub options
                            if (choice.subOptionsHaveSelectedAttribute()) {

                                // Look through its subOptions
                                $.each(choice.subOptions(), function (k, sku) {
                                    // Find matching sku
                                    if (choice.subProductSelection() === sku.sku) {
                                        sku.subcategoryId = previewOptionGroup.subcategoryId;
                                        sku.productName = choice.choice;
                                        sku.subSkus = [];

                                        structure.subSkus.push(sku);
                                        skuAdded = sku;
                                        structure.subSkus.slice(-1)[0].optionGroupSlugified = previewOptionGroup.name.replace(/\s+/g, '-').toLowerCase();
                                        structure.subSkus.slice(-1)[0].parentFingerPrint = previewOptionGroup.name.replace(/(\W|_)+/g, '') + choice.choice.replace(/(\W|_)+/g, '');
                                        structure.subSkus.slice(-1)[0].parentConfigType = previewOptionGroup.configuration;
                                        structure.subSkus.slice(-1)[0].quantityTypeId = previewOptionGroup.quantityTypeId();
                                        structure.subSkus.slice(-1)[0].quantity = calculateSubItemQuantity(parseInt(choice.quantity(), 10), previewOptionGroup.quantityTypeId(), vmBaseProduct.previewPricingOptionsSelectedQuantity());
                                        structure.subSkus.slice(-1)[0].fingerPrint = choice.choice.replace(/(\W|_)+/g, '') + sku.sku.replace(/(\W|_)+/g, '');

                                        structure.subSkus.slice(-1)[0].attributesMap = {};
                                        for (var l = 0; l < sku.attributes.length; l++) {
                                            structure.subSkus.slice(-1)[0].attributesMap[sku.attributes[l].key] = sku.attributes[l].value;
                                        }

                                        structure.subSkus.slice(-1)[0].subSkus = [];
                                        if (previewOptionGroup.miniCatalog() && choice.miniCatalogLoaded()) {
                                            structure.subSkus.slice(-1)[0].subSkus =
                                                JSON.parse(
                                                    choice.miniCatalogItem.formatForPricingGroups()).subSkus;
                                        }

                                        return false;
                                    }
                                });
                            } else {

                                // If not showing sub options, just use it's first sku, since that should be the only one
                                var sku = choice.subOptions()[0];
                                if (sku) {
                                    sku.subcategoryId = previewOptionGroup.subcategoryId;
                                    sku.productName = choice.choice;
                                    sku.subSkus = [];

                                    structure.subSkus.push(sku);
                                    skuAdded = sku;
                                    structure.subSkus.slice(-1)[0].parentFingerPrint = previewOptionGroup.name.replace(/(\W|_)+/g, '') + choice.choice.replace(/(\W|_)+/g, '');
                                    structure.subSkus.slice(-1)[0].parentConfigType = previewOptionGroup.configuration;
                                    structure.subSkus.slice(-1)[0].quantityTypeId = previewOptionGroup.quantityTypeId();
                                    structure.subSkus.slice(-1)[0].quantity = calculateSubItemQuantity(parseInt(choice.quantity(), 10), previewOptionGroup.quantityTypeId(), vmBaseProduct.previewPricingOptionsSelectedQuantity());
                                    structure.subSkus.slice(-1)[0].fingerPrint = choice.choice.replace(/(\W|_)+/g, '') + sku.sku.replace(/(\W|_)+/g, '');

                                    structure.subSkus.slice(-1)[0].attributesMap = {};
                                    for (var k = 0; k < sku.attributes.length; k++) {
                                        structure.subSkus.slice(-1)[0].attributesMap[sku.attributes[k].key] = sku.attributes[k].value;
                                    }

                                    structure.subSkus.slice(-1)[0].subSkus = [];
                                    if (previewOptionGroup.miniCatalog() && choice.miniCatalogLoaded()) {
                                        structure.subSkus.slice(-1)[0].subSkus =
                                            JSON.parse(
                                                choice.miniCatalogItem.formatForPricingGroups()).subSkus;
                                    }
                                }
                            }

                            captureSubSubSkus(skuAdded, choice);
                        }
                    });
                }
            }
        });

        structure.sellers = prod.sellers;

        var structureStringified = JSON.stringify(structure);

        // Clean subSubSkus from subSkus
        if (structure.subSkus.length) {
            $.each(structure.subSkus, function(i, subSku) {
                if (subSku.subSkus) {
                    delete subSku.subSkus;
                }
            });
        }

        return structureStringified;
    };

    // Pricing

    vmBaseProduct.livePricingInitiated = ko.observable(false);
    vmBaseProduct.previewPricingOptionsGridInitialized = ko.observable(false);
    vmBaseProduct.choiceChanged = ko.observable(false);// for disabling add to cart when a choice or quantity is changed but before publishing change
    vmBaseProduct.previewPricingOptionsSelectedQuantity = ko.observable(1);

    // for quantity number inputs so the numbers don't get converted to strings
    vmBaseProduct.productQuantityInterceptor = ko.computed({
        read: function() {
            return vmBaseProduct.previewPricingOptionsSelectedQuantity();
        },
        write: function(newValue) {
            var parsedValue = parseFloat(newValue);
            vmBaseProduct.previewPricingOptionsSelectedQuantity(isNaN(parsedValue) ? newValue : parsedValue);
        }
    });

    vmBaseProduct.initiateLivePricing = function() {

        if (typeof customerOrderViewModel === 'undefined' || !customerOrderViewModel.modifyOrder) {
            // new order, so product handles pricing
            vmBaseProduct.instantiatePreviewPricingOptionsGrid();
            vmBaseProduct.configurePricingGrid();
        } else {
            // modified order, so order model handles pricing
            customerOrderViewModel.getModifiedPricing();
        }

        vmBaseProduct.livePricingInitiated(true);
    };

    vmBaseProduct.instantiatePreviewPricingOptionsGrid = function () {
        if (!vmBaseProduct.previewPricingOptionsGridInitialized()) {
            vmBaseProduct.previewPricingOptionsGrid = new PreviewPricingOptionsGridModel();
        }

        vmBaseProduct.previewPricingOptionsGridInitialized(true);
    };

    vmBaseProduct.configurePricingGrid = function() {
        vmBaseProduct.previewPricingOptionsGrid.configureGrid(
            'preview-pricing-options',
            {
                getGridData: vmBaseProduct.vmProductCatalog.endPoints.previewPricingOptions
            },
            {
                quantity: vmBaseProduct.previewPricingOptionsSelectedQuantity(),
                clientId: vmBaseProduct.vmProductCatalog.queryParams().clientId,
                dirId: typeof customerOrderViewModel !== 'undefined' && customerOrderViewModel.dirId ? customerOrderViewModel.dirId : undefined
            },
            false,
            {
                productConfig: vmBaseProduct.formatForPricingGroups()
            }
        );
    };

    vmBaseProduct.startWatchingChoicesAndInitiatePricing = function() {

        // This watches all observables related to choices for the product,
        // so on invocation and anytime the user changes a selection going forward,
        // it checks the selected choices to see if their sub products calls have returned data
        // if so, through the subscribe, it initializes pricing if not done so already,
        // or triggers the pricing fetch because of the choice change
        vmBaseProduct.watchProductChoices = ko.computed(function() {

            var flag = true;

            $.each(productCatalogViewModel.previewGroupOptions(), function (i, previewOptionGroup) {

                // For multiple choice option groups and sku options
                if (previewOptionGroup.configuration === 1) {

                    // For multiple choice options groups, make sure the option group has a choice selected (other than "None" and "No change - Keep individual values")
                    if (previewOptionGroup.previewSelectedChoiceObject && previewOptionGroup.previewSelectedChoiceObject() && previewOptionGroup.previewSelectedChoice() !== "None" && previewOptionGroup.previewSelectedChoice() !== "No change - Keep individual values") {

                        // check if sub products data call has returned data
                        if (!previewOptionGroup.previewSelectedChoiceObject().subsLoaded()) {
                            flag = false;
                            return false;
                        }

                        // Watch choice quantity
                        if (previewOptionGroup.previewSelectedChoiceObject().quantity && previewOptionGroup.previewSelectedChoiceObject().quantity()) {
                            var qty = previewOptionGroup.previewSelectedChoiceObject().quantity();
                        }

                        // Make sure the choice(s) have showing sub options
                        if (previewOptionGroup.previewSelectedChoiceObject().subOptionsHaveSelectedAttribute()) {
                            $.each(previewOptionGroup.previewSelectedChoiceObject().subOptions(), function(j, sku) {
                                if (sku.sku === previewOptionGroup.previewSelectedChoiceObject().subProductSelection()) {
                                    return false;
                                }
                            });
                        } else {
                            // If not showing sub options, just use it's first sku, since that should be the only one
                            var sku = previewOptionGroup.previewSelectedChoiceObject().subOptions()[0];
                        }

                        // watch sub sub products for changes
                        if (typeof previewOptionGroup.previewSelectedChoiceObject().subOptionGroups === "function" && previewOptionGroup.previewSelectedChoiceObject().subOptionGroups().length) {
                            $.each(previewOptionGroup.previewSelectedChoiceObject().subOptionGroups(), function(j, subOptGroup) {
                                if (subOptGroup.optionGroupTypeId() === 1) {
                                    var selection = subOptGroup.subSubProductSelection();
                                }
                                else if (subOptGroup.optionGroupTypeId() === 2) {
                                    if (subOptGroup.makeChanges() === "Yes") {
                                        if (subOptGroup.products().length) {
                                            $.each(subOptGroup.products(), function(k, subSubProduct) {
                                                var selected = subSubProduct.selected();
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    }

                    // For skus
                    else if (previewOptionGroup.previewSelectedChoice()) {
                        var previewSelectedChoice = previewOptionGroup.previewSelectedChoice();
                    }

                }

                // For checkboxes option groups
                if (previewOptionGroup.configuration === 2) {

                    // Check all possible choices
                    $.each(previewOptionGroup.choices(), function (j, choice) {

                        // If the choice is checked
                        if (productCatalogViewModel.availableOptions()[previewOptionGroup.type]()[previewOptionGroup.name][choice.choice]()) {

                            // check if sub products data call has returned data
                            if (!choice.subsLoaded()) {
                                flag = false;
                                return false;
                            }

                            // Watch choice quantity
                            if (choice.quantity && choice.quantity()) {
                                var qty = choice.quantity();
                            }

                            // Make sure the choice has showing sub options
                            if (choice.subOptionsHaveSelectedAttribute()) {

                                // Look through its subOptions
                                $.each(choice.subOptions(), function (k, sku) {
                                    // Find matching sku
                                    if (choice.subProductSelection() === sku.sku) {
                                        return false;
                                    }
                                });
                            } else {
                                // If not showing sub options, just use it's first sku, since that should be the only one
                                var sku = choice.subOptions()[0];
                            }

                            // watch sub sub products for changes
                            if (typeof choice.subOptionGroups === "function" && choice.subOptionGroups().length) {
                                $.each(choice.subOptionGroups(), function(j, subOptGroup) {
                                    if (subOptGroup.optionGroupTypeId() === 1) {
                                        var selection = subOptGroup.subSubProductSelection();
                                    }
                                    else if (subOptGroup.optionGroupTypeId() === 2) {
                                        if (subOptGroup.makeChanges() === "Yes") {
                                            if (subOptGroup.products().length) {
                                                $.each(subOptGroup.products(), function(k, subSubProduct) {
                                                    var selected = subSubProduct.selected();
                                                });
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            });

            return flag;

        }).extend({ notify: 'always' });

        // if all subs are loaded when the above computed is first setup, the subscribe below will not fire,
        // so initiate live pricing manually
        if (vmBaseProduct.watchProductChoices()) {
            vmBaseProduct.choiceChanged(true);
            vmBaseProduct.initiateLivePricing();
            vmBaseProduct.choiceChanged(false);
        }

        vmBaseProduct.watchProductChoices.subscribe(function(areSubsLoaded) {
            vmBaseProduct.choiceChanged(true);
            if (areSubsLoaded) {

                if ((typeof customerOrderViewModel !== 'undefined' && customerOrderViewModel.modifyOrder) || vmBaseProduct.livePricingInitiated()) {
                    vmBaseProduct.publishChangedChoices();
                } else {
                    vmBaseProduct.initiateLivePricing();
                    vmBaseProduct.choiceChanged(false);
                }
            }
        });

        vmBaseProduct.productQuantitySubscription = vmBaseProduct.previewPricingOptionsSelectedQuantity.subscribe(function () {
            vmBaseProduct.publishChangedChoices();
        });
    };

    vmBaseProduct.stopWatchingChoices = function() {
        if (vmBaseProduct.watchProductChoices && ko.isComputed(vmBaseProduct.watchProductChoices)) {
            vmBaseProduct.watchProductChoices.dispose();
        }

        if (vmBaseProduct.productQuantitySubscription) {
            vmBaseProduct.productQuantitySubscription.dispose();
        }
    };

    vmBaseProduct.publishChangedChoices = function() {
        if (vmBaseProduct.vmProductCatalog.activeProduct() && vmBaseProduct.vmProductCatalog.activeProduct() === vmBaseProduct) {
            vmBaseProduct.debouncedPublish();
        }
    };

    vmBaseProduct.debouncedPublish = _.debounce(function () {
        ko.postbox.publish('productChoicesChanged');
        vmBaseProduct.choiceChanged(false);
    }, 500);

    ko.postbox.subscribe('productChoicesChanged', function(newValue) {
        if ((typeof customerOrderViewModel === 'undefined' || !customerOrderViewModel.modifyOrder) &&
            (vmBaseProduct.vmProductCatalog.activeProduct() && vmBaseProduct.vmProductCatalog.activeProduct() === vmBaseProduct)) {
            vmBaseProduct.getLivePricing();
        }
    });

    vmBaseProduct.getLivePricing = function() {
        if (vmBaseProduct.previewPricingOptionsGridInitialized() && vmBaseProduct.previewSelectedSku().sku() !== 'No matching SKU found.') {

            vmBaseProduct.previewPricingOptionsGrid.resettingGrid(true);
            vmBaseProduct.previewPricingOptionsGrid.rowsUnfiltered.removeAll();
            vmBaseProduct.previewPricingOptionsGrid.killAsyncIntervals();
            vmBaseProduct.previewPricingOptionsGrid.clearSelectedRows();

            vmBaseProduct.configurePricingGrid();
        }
    };

    // return true if pricing fetched, but primary pricing is pending
    vmBaseProduct.primaryPricingPending = ko.computed(function() {
        return (vmBaseProduct.previewPricingOptionsGridInitialized() &&
        vmBaseProduct.enableGetPricing() &&
        !vmBaseProduct.choiceChanged() &&
        vmBaseProduct.previewPricingOptionsGrid.rows() &&
        vmBaseProduct.previewPricingOptionsGrid.rows()[0] &&
        vmBaseProduct.previewPricingOptionsGrid.rows()[0].data() &&
        MetTel.Utils.stricmp(vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().Status, 'pending'));
    });

    // return true if pricing fetched, but primary pricing isn't available
    vmBaseProduct.primaryPricingNotAvailable = ko.computed(function() {
        return (vmBaseProduct.previewPricingOptionsGridInitialized() &&
        vmBaseProduct.enableGetPricing() &&
        !vmBaseProduct.choiceChanged() &&
        vmBaseProduct.previewPricingOptionsGrid.rows() &&
        vmBaseProduct.previewPricingOptionsGrid.rows()[0] &&
        vmBaseProduct.previewPricingOptionsGrid.rows()[0].data() &&
        (MetTel.Utils.stricmp(vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().Status, 'error') || MetTel.Utils.stricmp(vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().Status, 'elapsed')));
    });

    vmBaseProduct.primaryPricingLoading = ko.computed(function() {
        return (!vmBaseProduct.previewPricingOptionsGridInitialized() ||
        // vmBaseProduct.previewPricingOptionsGrid.selectedRows().length === 0 ||
        vmBaseProduct.previewPricingOptionsGrid.resettingGrid() ||
        vmBaseProduct.previewPricingOptionsGrid.pendingRequest() ||
        vmBaseProduct.choiceChanged() ||
        vmBaseProduct.primaryPricingPending());
    });

    vmBaseProduct.primaryMonthlyPricing = ko.computed(function() {
        if (vmBaseProduct.previewPricingOptionsGridInitialized() &&
            vmBaseProduct.enableGetPricing() &&
            !vmBaseProduct.choiceChanged() &&
            vmBaseProduct.previewPricingOptionsGrid.rows() &&
            vmBaseProduct.previewPricingOptionsGrid.rows()[0] &&
            vmBaseProduct.previewPricingOptionsGrid.rows()[0].data() &&
            !vmBaseProduct.primaryPricingPending() &&
            !vmBaseProduct.primaryPricingNotAvailable() &&
            typeof vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().Monthly === 'number') {
            return vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().Monthly;
        } else {
            return null;
        }
    });

    vmBaseProduct.primaryOneTimePricing = ko.computed(function() {
        if (vmBaseProduct.previewPricingOptionsGridInitialized() &&
            vmBaseProduct.enableGetPricing() &&
            !vmBaseProduct.choiceChanged() &&
            vmBaseProduct.previewPricingOptionsGrid.rows() &&
            vmBaseProduct.previewPricingOptionsGrid.rows()[0] &&
            vmBaseProduct.previewPricingOptionsGrid.rows()[0].data() &&
            !vmBaseProduct.primaryPricingPending() &&
            !vmBaseProduct.primaryPricingNotAvailable() &&
            typeof vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().OneTime === 'number') {
            return vmBaseProduct.previewPricingOptionsGrid.rows()[0].data().OneTime;
        } else {
            return null;
        }
    });

    vmBaseProduct.additionalPricingAvailable = ko.computed(function() {
        return (vmBaseProduct.previewPricingOptionsGridInitialized() &&
        vmBaseProduct.enableGetPricing() &&
        !vmBaseProduct.choiceChanged() &&
        vmBaseProduct.previewPricingOptionsGrid.rows() &&
        vmBaseProduct.previewPricingOptionsGrid.rows().length > 1);
    });

    // disable add to cart button until grid is loaded and a row is selected
    // also disable while re-fetching data or when get pricing is disabled
    vmBaseProduct.disableAddToCart = ko.computed(function() {
        return (!vmBaseProduct.previewPricingOptionsGridInitialized() ||
        vmBaseProduct.previewPricingOptionsGrid.selectedRows().length === 0 ||
        vmBaseProduct.previewPricingOptionsGrid.resettingGrid() ||
        vmBaseProduct.previewPricingOptionsGrid.pendingRequest() ||
        !vmBaseProduct.enableGetPricing() ||
        vmBaseProduct.choiceChanged() ||
        vmBaseProduct.primaryPricingPending());
    });

    // Fetching/building Product Data

    vmBaseProduct.buildProduct = function (data) {

        // Add item states
        MetTel.Utils.crawlCreateItemStates(data);

        // Mapping options
        var mapping = {
            // in case properties are omitted for availability
            'availability': {
                create: function (options) {
                    var objData = options.data;

                    objData.typeId = ko.observable(objData.typeId);
                    objData.items = ko.observable(objData.items);
                    objData.itemState = ko.observable(objData.itemState);
                    objData.productId = ko.observable(data.id);

                    objData.typeName = ko.computed(function () {
                        if (!vmBaseProduct.availabilityTypes) {
                            return false;
                        }
                        var availabilityOption = _.find(vmBaseProduct.availabilityTypes(), function (availabilityType) {
                            return availabilityType.id === objData.typeId();
                        });

                        if (availabilityOption) {
                            return availabilityOption.name;
                        }
                        else {
                            return undefined;
                        }
                    });

                    return objData;
                }
            }
        };

        // This goes through all the data and turns them to observables
        vmBaseProduct.mappedProduct = ko.mapping.fromJS(data, mapping);

        // Add all these newly mapped observables to the existing product model
        $.extend(vmBaseProduct, vmBaseProduct.mappedProduct);

        // Control main product item state
        if (vmBaseProduct.id() === 0) {
            vmBaseProduct.itemState('CREATE');
        } else if (!vmBaseProduct.isTemplate()) {
            // If it's not new and not a template, store all original values that affect it's item state
            vmBaseProduct.originalType = vmBaseProduct.type();
            vmBaseProduct.originalName = vmBaseProduct.name();
            vmBaseProduct.originalDescription = vmBaseProduct.description();
            vmBaseProduct.originalStandalone = vmBaseProduct.standalone();
            vmBaseProduct.originalPurchasable = vmBaseProduct.purchasable();

            // Compare the originals to their related observables if/when they change
            vmBaseProduct.updateProductItemState = ko.computed(function () {
                if (vmBaseProduct.type() === vmBaseProduct.originalType &&
                    vmBaseProduct.name() === vmBaseProduct.originalName &&
                    vmBaseProduct.description() === vmBaseProduct.originalDescription &&
                    vmBaseProduct.standalone() === vmBaseProduct.originalStandalone &&
                    vmBaseProduct.purchasable() === vmBaseProduct.originalPurchasable) {
                    vmBaseProduct.itemState('NOCHANGE');
                } else {
                    vmBaseProduct.itemState('UPDATE');
                }
            });
        }

        // Thumbnails
        if (vmBaseProduct.thumbnails) {

            var thumbnailSelectedObservables = [];

            $.each(vmBaseProduct.thumbnails(), function (i, thumbnail) {

                // Store the original sort order
                thumbnail.originalSortOrder = thumbnail.sortOrder();

                // Set the first thumbnail as selected
                thumbnail.selected = ko.observable(i === 0);

                // Collect the observables so we can deselect later
                thumbnailSelectedObservables.push(thumbnail.selected);

                // Attach method to edit a thumbnail
                thumbnail.editThumbnail = function (dataURL, fileName) {
                    thumbnail.fileDataUrl = ko.observable(dataURL);
                    thumbnail.fileName = ko.observable(fileName);
                    thumbnail.mediumURL(dataURL);
                    thumbnail.smallURL(dataURL);
                    if (thumbnail.itemState() !== 'CREATE') {
                        thumbnail.itemState('UPDATE');
                    }
                };
            });

            vmBaseProduct.thumbnailSelectedObservables(thumbnailSelectedObservables);

            // Put the first thumbnail in as the selected thumbnail
            vmBaseProduct.selectedThumbnail(vmBaseProduct.thumbnails()[0]);

            // Returns the thumbnails that haven't been deleted
            vmBaseProduct.viewableThumbnails = ko.computed(function () {
                return _.filter(vmBaseProduct.thumbnails(), function (thumbnail) {
                    return thumbnail.itemState() !== 'DELETE';
                });
            });
        }

        // Attributes
        if (vmBaseProduct.attributes) {

            $.each(vmBaseProduct.attributes(), function (i, attribute) {

                // Store original value to determine if it changes
                attribute.originalAttId = attribute.attId();

                // Update item state based off original value
                attribute.updateAttributeItemState = ko.computed(function () {
                    if (attribute.itemState() === 'NOCHANGE' || attribute.itemState() === 'UPDATE') {
                        if (attribute.attId() !== attribute.originalAttId) {
                            attribute.itemState('UPDATE');
                        } else {
                            attribute.itemState('NOCHANGE');
                        }
                    }
                });
            });

            // Returns the attributes that haven't been deleted
            vmBaseProduct.viewableAttributes = ko.computed(function () {
                return _.filter(vmBaseProduct.attributes(), function (attribute) {
                    return attribute.itemState() !== 'DELETE';
                });
            });
        }

        // SKUs
        if (vmBaseProduct.skus) {

            $.each(vmBaseProduct.skus(), function(i, sku) {
                sku.checkedAttrsString = ko.observable();
            });

            // Stored grid columns and initial data for federated skus grid
            this.federatedSkusInitialData = {
                "Name": "federated-skus",
                "Columns": [
                    {
                        "DataField": "SKU",
                        "PrimaryKey": true,
                        "Editable": false,
                        "EditType": "Text",
                        "EditDropDownList": null,
                        "EditAutoCompleteList": null,
                        "EditDatePickerSettings": null,
                        "Width": 0,
                        "ColumnName": "SKU",
                        "Align": "Left",
                        "Hidden": false,
                        "HideDialog": false,
                        "Sortable": true,
                        "SortType": "String",
                        "SearchType": "TextBox",
                        "SearchDropDownList": [],
                        "SearchAutoCompleteList": null,
                        "SearchDatePickerSettings": null,
                        "DataFormatString": null,
                        "Formatter": null,
                        "SearchDefaultValue": null,
                        "Searchable": true,
                        "Frozen": true,
                        "SummaryType": "None",
                        "SummaryTemplate": null,
                        "EditClientSideValidators": []
                    },
                    {
                        "DataField": "Manufacturer",
                        "PrimaryKey": true,
                        "Editable": false,
                        "EditType": "Text",
                        "EditDropDownList": null,
                        "EditAutoCompleteList": null,
                        "EditDatePickerSettings": null,
                        "Width": 0,
                        "ColumnName": "Manufacturer",
                        "Align": "Left",
                        "Hidden": false,
                        "HideDialog": false,
                        "Sortable": true,
                        "SortType": "String",
                        "SearchType": "TextBox",
                        "SearchDropDownList": [],
                        "SearchAutoCompleteList": null,
                        "SearchDatePickerSettings": null,
                        "DataFormatString": null,
                        "Formatter": null,
                        "SearchDefaultValue": null,
                        "Searchable": true,
                        "Frozen": true,
                        "SummaryType": "None",
                        "SummaryTemplate": null,
                        "EditClientSideValidators": []
                    },
                    {
                        "DataField": "Name",
                        "PrimaryKey": false,
                        "Editable": false,
                        "EditType": "Text",
                        "EditDropDownList": null,
                        "EditAutoCompleteList": null,
                        "EditDatePickerSettings": null,
                        "Width": 0,
                        "ColumnName": "Name",
                        "Align": "Left",
                        "Hidden": false,
                        "HideDialog": false,
                        "Sortable": true,
                        "SortType": "String",
                        "SearchType": "TextBox",
                        "SearchDropDownList": [],
                        "SearchAutoCompleteList": null,
                        "SearchDatePickerSettings": null,
                        "DataFormatString": null,
                        "Formatter": null,
                        "SearchDefaultValue": null,
                        "Searchable": true,
                        "Frozen": false,
                        "SummaryType": "None",
                        "SummaryTemplate": null,
                        "EditClientSideValidators": []
                    },
                    {
                        "DataField": "Description",
                        "PrimaryKey": false,
                        "Editable": false,
                        "EditType": "Text",
                        "EditDropDownList": null,
                        "EditAutoCompleteList": null,
                        "EditDatePickerSettings": null,
                        "Width": 0,
                        "ColumnName": "Description",
                        "Align": "Left",
                        "Hidden": false,
                        "HideDialog": false,
                        "Sortable": true,
                        "SortType": "String",
                        "SearchType": "TextBox",
                        "SearchDropDownList": [],
                        "SearchAutoCompleteList": null,
                        "SearchDatePickerSettings": null,
                        "DataFormatString": null,
                        "Formatter": null,
                        "SearchDefaultValue": null,
                        "Searchable": true,
                        "Frozen": false,
                        "SummaryType": "None",
                        "SummaryTemplate": null,
                        "EditClientSideValidators": []
                    },
                    {
                        "DataField": "Attributes",
                        "PrimaryKey": false,
                        "Editable": false,
                        "EditType": "Text",
                        "EditDropDownList": null,
                        "EditAutoCompleteList": null,
                        "EditDatePickerSettings": null,
                        "Width": 0,
                        "ColumnName": "Attributes",
                        "Align": "Left",
                        "Hidden": true,
                        "HideDialog": false,
                        "Sortable": true,
                        "SortType": "String",
                        "SearchType": "TextBox",
                        "SearchDropDownList": [],
                        "SearchAutoCompleteList": null,
                        "SearchDatePickerSettings": null,
                        "DataFormatString": null,
                        "Formatter": null,
                        "SearchDefaultValue": null,
                        "Searchable": true,
                        "Frozen": false,
                        "SummaryType": "None",
                        "SummaryTemplate": null,
                        "EditClientSideValidators": []
                    }
                ],
                "ToolBarSettings": {
                    "Hidden": false,
                    "ShowSearchToolBar": false,
                    "ShowRefreshButton": false,
                    "ShowSearchButton": true,
                    "ShowShareButton": false,
                    "ShowAddButton": false,
                    "ShowEditButton": false,
                    "ShowDeleteButton": false,
                    "ShareMessage": null,
                    "CloseOnEscape": false,
                    "MultipleSearch": true,
                    "ShowSearchOverlay": true,
                    "CloseAfterSearch": false,
                    "ExcelEasyExport": false,
                    "ExcelExportUrl": "",
                    "ShowNewWindowButton": false,
                    "ShowColumnChooserButton": false
                },
                "Data": {
                    "page": 1,
                    "total": 1,
                    "records": 0,
                    "userdata": null,
                    "totalrow": null,
                    "rows": []
                }
            };


            // Returns all the SKUs that haven't been deleted
            vmBaseProduct.viewableSKUs = ko.computed(function () {
                return _.filter(vmBaseProduct.skus(), function (sku) {
                    return sku.itemState() !== 'DELETE';
                });
            });

            // Returns an array of existing sku names trimmed and in lower case
            vmBaseProduct.existingSKUNames = ko.computed(function () {
                if (vmBaseProduct.viewableSKUs()) {
                    var existingSKUNames = [];

                    $.each(vmBaseProduct.viewableSKUs(), function (i, sku) {
                        existingSKUNames.push(sku.sku().toLowerCase().trim());
                    });

                    return existingSKUNames;
                }
            });
        }

        // Custom Options

        if (vmBaseProduct.customOptions) {
            $.each(vmBaseProduct.customOptions(), function (i, optionGroup) {

                optionGroup.optionGroupType(optionGroup.optionGroupType().toLowerCase().trim());

                if (typeof optionGroup.quantityTypeId === 'undefined') {
                    optionGroup.quantityTypeId = ko.observable(1);
                }

                optionGroup.quantityTypeName = ko.computed(function() {
                    return _.pluck(
                        _.filter(vmBaseProduct.optionQuantityTypes(), function(type) {
                            return type.id === optionGroup.quantityTypeId();
                        }),
                        'name'
                    )[0];
                });

                // Mark each option group as custom
                optionGroup.custom = true;

                if ((optionGroup.optionGroupTypeId() === 1 || optionGroup.optionGroupTypeId() === 2) && typeof optionGroup.showInSubProducts === 'undefined') {
                    optionGroup.showInSubProducts = ko.observable(false);
                }

                if (optionGroup.products) {

                    optionGroup.rows = ko.observableArray(optionGroup.products());
                }
            });

            // Returns all the custom option groups that haven't been deleted
            vmBaseProduct.viewableCustomOptions = ko.computed(function () {
                return _.filter(vmBaseProduct.customOptions(), function (optionGroup) {
                    return optionGroup.itemState() !== 'DELETE';
                });
            });
        }

        // Template Options
        if (vmBaseProduct.templateOptions) {
            $.each(vmBaseProduct.templateOptions(), function (i, optionGroup) {

                if (typeof optionGroup.quantityTypeId === 'undefined') {
                    optionGroup.quantityTypeId = ko.observable(1);
                }

                optionGroup.quantityTypeName = ko.computed(function() {
                    return _.pluck(
                        _.filter(vmBaseProduct.optionQuantityTypes(), function(type) {
                            return type.id === optionGroup.quantityTypeId();
                        }),
                        'name'
                    )[0];
                });

                optionGroup.optionGroupType(optionGroup.optionGroupType().toLowerCase().trim());

                // Mark each option group as from the template
                optionGroup.fromTemplate = true;

                if (typeof (optionGroup.miniCatalog) === 'undefined') {
                    optionGroup.miniCatalog = ko.observable(false);
                }

                if ((optionGroup.optionGroupTypeId() === 1 || optionGroup.optionGroupTypeId() === 2) && typeof optionGroup.showInSubProducts === 'undefined') {
                    optionGroup.showInSubProducts = ko.observable(false);
                }

                if (optionGroup.products) {

                    // Store original hidden values and watch them to update item states
                    $.each(optionGroup.products(), function (i, option) {
                        option.originalHiddenValue = option.hidden();

                        option.updateItemState = ko.computed(function () {
                            if (option.hidden() !== option.originalHiddenValue) {
                                option.itemState('UPDATE');
                            } else {
                                option.itemState('NOCHANGE');
                            }
                        });
                    });

                    // To keep consistent with custom options
                    optionGroup.rows = ko.observableArray(optionGroup.products());

                    // Create/update the count of products that are visible
                    optionGroup.visibleAmount = ko.computed(function () {
                        var visibleCount = 0;
                        $.each(optionGroup.rows(), function (i, row) {
                            if (!row.hidden()) {
                                visibleCount += 1;
                            }
                        });
                        return visibleCount;
                    });
                }
            });
        }

        // Purchasable
        if (vmBaseProduct.purchasable) {

            // Returns true if at least one pricing group has been marked as available
            vmBaseProduct.pricingGroupAvailable = ko.computed(function () {
                var availableFlag = false;
                if (vmBaseProduct.sellers()) {
                    $.each(vmBaseProduct.sellers(), function (i, seller) {
                        if (seller.pricingGroups()) {
                            $.each(seller.pricingGroups(), function (j, pricingGroup) {
                                if (pricingGroup.available()) {
                                    availableFlag = true;
                                    return false;
                                }
                            });
                        }
                    });
                }
                return availableFlag;
            });
        }

        // Pricing
        vmBaseProduct.getPricingQuantity = ko.observable();

        vmBaseProduct.enableGetPricing = ko.computed(function () {
            var validSku = (vmBaseProduct.previewSelectedSku().sku() !== 'No matching SKU found.');
            return (vmBaseProduct.viewableSKUs().length && validSku);
        });

        // Finalize
        if (this.buildProduct.finalize) {
            this.buildProduct.finalize();
        }
    };

    vmBaseProduct.getProductData = function (callback) {
        var productUrl;

        // Determine url based on if it's an existing product or a new one
        if (options.productId) {
            productUrl = options.productCatalogModel.endPoints.getProductData + '?id=' + options.productId + (typeof customerOrderViewModel !== 'undefined' ? '&clientId=' + productCatalogViewModel.queryParams().clientId : '');

            if (typeof customerOrderViewModel !== 'undefined') {
                var addressString = "&addressId=" + customerOrderViewModel.addressDialogVm().addressId();

                if (customerOrderViewModel.modifyOrder) {
                    productUrl += '&modType=' + customerOrderViewModel.modificationTypeString();
                    productUrl += '&lines=' + customerOrderViewModel.lineIds();
                    productUrl += '&topic=' + customerOrderViewModel.ticketCategory;

                    // for change plan/features, the address call does not always complete before the product
                    // fortunately in this case, we have the addressId in the params
                    if (customerOrderViewModel.modificationType() === 2) {
                        if (typeof customerOrderViewModel.addressDialogVm().addressId() === 'undefined') {
                            addressString = "&addressId=" + MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().addressId);
                        }
                    }
                }

                productUrl += addressString;

                if (customerOrderViewModel.dirId) {
                    productUrl += "&dirId=" + customerOrderViewModel.dirId;
                }
            }

        } else if (options.parent) {
            productUrl = options.productCatalogModel.endPoints.getNewProductData + '?subcategoryId=' + options.parent.id + (typeof customerOrderViewModel !== 'undefined' ? '&addressId=' + customerOrderViewModel.addressDialogVm().addressId() : '');
        }

        if (typeof productUrl !== 'undefined') {

            $.getJSON(productUrl, function (data) {

                vmBaseProduct.buildProduct(data);

                options.productCatalogModel.activeProduct(vmBaseProduct);

                vmBaseProduct.productDataLoaded(true);

                productCatalogViewModel.productCatalogLoading(false);

                // for non-retrieved orders
                if (typeof customerOrderViewModel !== 'undefined' && !productCatalogViewModel.retrievedOrder()) {
                    vmBaseProduct.startWatchingChoicesAndInitiatePricing();
                }

                if (callback) {
                    callback();
                }
            });
        }
    };
}

function ProductsGridModel(gridData) {
    // Extend the grid model
    GridModel.call(this, gridData);
    this.appliedDropdownFilters = ko.observableArray();
}

function SubcategoryModel(productCatalogModel, data, endPoints, queryString, newProductsGridData) {
    var subcategory = this;

    // Properties
    this.id = data.id;

    // Observables
    this.name = ko.observable(data.name);
    this.visible = ko.observable(data.visible);
    this.selected = ko.observable(false);
    this.products = ko.observableArray();
    this.nameEdit = ko.observable(this.name());
    this.nameEditUnsuccessful = ko.observable(false);
    this.dontInit = ko.observable(false);
    this.disableVisibilityToggle = ko.observable(false);

    this.subcategoryVisibilityError = function () {
        productCatalogModel.visibilityError(true);
        productCatalogModel.errorTitle("Visibility Was Not Saved");
        productCatalogModel.errorMessage("We ran into a problem while trying to save the visibility setting.  Please try again.");
        subcategory.visible(!subcategory.visible());
    };

    // When customer visibility is toggled, post to the server the new status
    this.visible.subscribe(function (newValue) {

        if (productCatalogModel.visibilityError()) {
            productCatalogModel.visibilityError(false);
        } else {
            // Only post if we're not switching the value back because of an error

            // Temporarily disable the toggle while we're waiting for a response
            subcategory.disableVisibilityToggle(true);

            $.post(endPoints.postSubcategoryVisibility + queryString, {
                id: subcategory.id,
                visible: newValue
            }, function (response) {

                if (response.is_success) {
                    console.log("Post SUCCESSFUL for subcategory's visible status", newValue);
                } else {
                    subcategory.subcategoryVisibilityError();
                }

                subcategory.disableVisibilityToggle(false);

            }, 'json')
                .fail(function () {
                    subcategory.subcategoryVisibilityError();

                    subcategory.disableVisibilityToggle(false);
                });
        }
    });

    // When a subcategory becomes selected, trigger its init
    this.selected.subscribe(function (newValue) {
        productCatalogViewModel.checkMenuForScrollbar();
        if (newValue) {
            if (subcategory.dontInit()) {
                subcategory.dontInit(false);
            } else {
                subcategory.init();
            }
        }
    });

    // Rename the subcategory
    this.editSubcategoryName = function () {
        var url = endPoints.postEditedSubcategoryName + queryString;

        productCatalogModel.contentLoading(true);

        // Post the new name for the subcategory
        $.post(url, {
            subcategoryId: subcategory.id,
            subcategoryName: subcategory.nameEdit()
        }, function (response) {

            if (response.is_success) {
                // Actually change the name
                subcategory.name(subcategory.nameEdit());
                // Close the modal
                if (subcategory.editSubcategoryNameCallback) {
                    subcategory.editSubcategoryNameCallback();
                }
            } else {
                subcategory.nameEditUnsuccessful(true);
            }

            productCatalogModel.contentLoading(false);

        }, 'json')
            .fail(function () {
                subcategory.nameEditUnsuccessful(true);
                productCatalogModel.contentLoading(false);
            });
    };

    this.addProduct = function () {
        productCatalogModel.activeSubcategory(null);
        var newProduct = new ProductModel({
            productCatalogModel: productCatalogModel,
            parent: subcategory
        });
        newProduct.getProductData();
    };

    this.init = function () {

        var $page = $('[data-mettel-class="page"]');

        // If a product is active
        if (productCatalogModel.activeProduct()) {
            // We need to clear it
            productCatalogModel.deactivateProduct();
            // Find and remove necessary subcategory flyouts
            $page.children('[data-mettel-class~="subcategory-filter-by-flyout"]').remove();
            $page.children('[data-mettel-class~="subcategory-filter-flyout"]').remove();
            // And the grid needs to be set up again
            productCatalogModel.gridInitialized(false);
        }

        // If the grid hasn't been set up yet, set it up
        if (!productCatalogModel.gridInitialized()) {

            // The new grid model handles the new data if it exists, or fetches the data if it does not
            productCatalogModel.productsGrid = new ProductsGridModel();

            productCatalogModel.productsGrid.noResultsMessage('There are no products to display.');

            // Add grid rows to the products array
            productCatalogModel.productsGrid.rows.subscribe(function () {
                productCatalogModel.products(productCatalogModel.productsGrid.rows());
            });

            // When a grid row is clicked, this will open the product
            productCatalogModel.productsGrid.selectedRow.subscribe(function (newValue) {
                if (newValue !== undefined) {
                    location.href = "#product=" + newValue.data().ProductID;
                }
            });

            productCatalogModel.gridInitialized(true);

        } else {
            // If it has been set up, wipe it clean so it's ready for the new data

            productCatalogModel.productsGrid.resettingGrid(true);

            // Clear existing rows in the grid
            productCatalogModel.productsGrid.rowsUnfiltered.removeAll();

            // Clear existing filters in the grid
            productCatalogModel.productsGrid.clearFilters();
            productCatalogModel.productsGrid.dropdownFilters.removeAll();
            productCatalogModel.productsGrid.clearPostColumnlessFitlers();
            $page.children('[data-mettel-class~="subcategory-filter-flyout"]').remove(); // Find and remove necessary subcategory flyouts
            productCatalogModel.productsGrid.updateAppliedDropdownFilters();

            // Reset the page query params
            productCatalogModel.productsGrid.gridParametersModel.reset();

            // Clear observables related to sorting by column
            productCatalogModel.productsGrid.clearSelectedColumn();
        }

        // If we've just created a new subcategory, we've already got the data, so store it
        // This will prevent the grid's ajax call
        if (newProductsGridData) {
            productCatalogModel.productsGrid.storedGridData(newProductsGridData);
            newProductsGridData = false;
        }

        var productsGridQueryParams = {
            id: subcategory.id
        };

        if (typeof customerOrderViewModel !== 'undefined') {
            productsGridQueryParams.clientId = productCatalogViewModel.queryParams().clientId;
            if (typeof customerOrderViewModel.addressDialogVm === 'function' && typeof (customerOrderViewModel.addressDialogVm().addressId()) !== 'undefined') {
                productsGridQueryParams.addressId = customerOrderViewModel.addressDialogVm().addressId();
            }
            // if the address is not set up via the service, we can see if it's in the querystring (which will only be true if this is a Modify Service)
            else if (typeof customerOrderViewModel.modifyOrder !== 'undefined' && typeof MetTel.Utils.getQueryParams().addressId !== 'undefined') {
                productsGridQueryParams.addressId = MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().addressId);
            }
            if (customerOrderViewModel.dirId) {
                productsGridQueryParams.dirId = customerOrderViewModel.dirId;
            }
        }

        productCatalogModel.productsGrid.gridParametersModel.addQueryParams(productsGridQueryParams);

        productCatalogModel.productsGrid.updateAppliedDropdownFilters = function() {
            var array = _.filter(productCatalogModel.productsGrid.dropdownFilters(), function(filter) {
                return filter.applied() === true;
            });

            // setup search filter when there are enough options, but only once
            $.each(array, function(i, filter) {
                if (filter.options.length > 10 && !filter.search) {
                    filter.search = ko.observable("");
                }
            });

            productCatalogModel.productsGrid.appliedDropdownFilters(array);
            productCatalogModel.productsGrid.appliedDropdownFilters.valueHasMutated();
        };

        // Set it as the active subcategory
        productCatalogModel.activeSubcategory(subcategory);

        productCatalogModel.productsGrid.recalculateHeight();
    };
}

function CategoryModel(productCatalogModel, data, endPoints, queryString, newProductsGridData) {
    var self = this;

    // Properties
    this.id = data.id;
    this.name = data.name;
    this.visible = data.visible;

    // Observables
    this.selected = ko.observable(false);
    this.subcategories = ko.observableArray(data.subcategories ? data.subcategories : null);
    this.newSubcategoryName = ko.observable('');
    this.addSubcategoryUnsuccessful = ko.observable(false);

    // Add a new subcategory
    this.addNewSubcategory = function () {
        var url = endPoints.postNewSubcategory + queryString;

        productCatalogModel.contentLoading(true);

        // Post new subcategory name
        $.post(url, {
            categoryId: self.id,
            subcategoryName: self.newSubcategoryName()
        }, function (response) {

            if (response.subcategoryId && response.products) {

                // Build new subcategory model
                var newSubcategory = new SubcategoryModel(productCatalogModel, {
                    id: response.subcategoryId,
                    name: self.newSubcategoryName(),
                    visible: true
                }, endPoints, queryString, response.products);

                // Add its selected observable to the array
                productCatalogModel.selectedObservables.push(newSubcategory.selected);

                // Add the new subcategory to the array
                self.subcategories.push(newSubcategory);

                // Select the new subcategory
                productCatalogModel.falsifyCategorySelectedObservables();
                self.selected(true);
                newSubcategory.selected(true);

                // Reset new subcategory name observable
                self.newSubcategoryName('');

                // Close the modal
                if (self.addNewSubcategoryCallback) {
                    self.addNewSubcategoryCallback();
                }
            } else {
                self.addSubcategoryUnsuccessful(true);
            }

            productCatalogModel.contentLoading(false);

        }, 'json')
            .fail(function () {
                self.addSubcategoryUnsuccessful(true);
                productCatalogModel.contentLoading(false);
            });
    };

    this.init = function () {

        if (this.subcategories()) {

            // Create new models for the subcategories and collect their selected observables
            $.each(this.subcategories(), function (i, subcategory) {

                subcategory = new SubcategoryModel(productCatalogModel, subcategory, endPoints, queryString, newProductsGridData);
                productCatalogModel.selectedObservables.push(subcategory.selected);
                self.subcategories()[i] = subcategory;

            });
        }
    };
}

function MostPopularGridModel() {
    // Extend the grid model
    GridModel.call(this);
}

var BaseCatalogModel = function () {
    var productCatalog = this;

    // Extend the query params
    MetTel.QueryParamsModel.apply(this);

    // Observables

    this.pcvmLoadFragmentSet = ko.observable(false);

    // Errors
    this.errorTitle = ko.observable(null);
    this.errorMessage = ko.observable(null);

    // Flag for a visibility post error
    this.visibilityError = ko.observable(false);

    // Stores all categories and their subcategories
    this.categories = ko.observableArray();

    // Observable array that holds all selected observables for categories and subcategories
    this.selectedObservables = ko.observableArray();

    // For adding a new category with a new subcategory
    this.newCategoryName = ko.observable('');
    this.newSubcategoryName = ko.observable('');

    // Holds the currently selected subcategory
    this.activeSubcategory = ko.observable();

    // Holds the currently selected product
    this.activeProduct = ko.observable();

    // Clears active product observable and removes necessary modals
    this.deactivateProduct = function () {

        // Find and remove necessary modals
        var $page = $('[data-mettel-class="page"]'),
            $productModals = $page.children('[data-mettel-class="product-modal"]');
        $productModals.remove();

        // Nullify active product
        productCatalog.activeProduct(null);
    };

    // Determines to show categories once menu is loaded
    this.menuLoading = ko.observable(true);

    // Determines to show loader over all content
    this.contentLoading = ko.observable(false);

    // Determines to show loader over entire product catalog
    this.productCatalogLoading = ko.observable(false);

    // Determines to show loader over recently ordered items
    this.recentlyOrderedLoading = ko.observable(false);

    this.recentlyOrderedInitialized = ko.observable(false);

    this.mostPopularGridCreated = ko.observable(false);
    this.mostPopularInitialized = ko.observable(false);

    // Flag for loading an existing order
    this.retrievedOrder = ko.observable(false);

    this.addCategoryUnsuccessful = ko.observable(false);

    // Flag to show if the products grid model has been set up yet
    this.gridInitialized = ko.observable(false);

    // Federated SKU search
    this.federatedSKUSearch = ko.observable('');

    // Boolean to determine to display thumbnails or a list
    this.thumbnailView = ko.observable(false);

    // Toggle between thumbnail and list view
    this.switchView = function () {
        productCatalog.thumbnailView(!productCatalog.thumbnailView());
    };

    this.allSellers = ko.observableArray();
    // Pricing Group Tab
    this.pricingGroupTab = ko.observable(0);

    // Holds all the products to populate the thumbnails view
    this.products = ko.observableArray();

    // Set all category/subcategory selected observables to false
    this.falsifyCategorySelectedObservables = function () {
        $.each(productCatalog.selectedObservables(), function (i, selectedProperty) {
            if (selectedProperty()) {
                selectedProperty(false);
            }
        });
    };

    // Most Popular

    this.initializeMostPopular = function() {

        productCatalog.thumbnailView(true);

        productCatalog.mostPopular = new MostPopularGridModel();

        productCatalog.mostPopularGridCreated(true);

        productCatalog.mostPopular.noResultsMessage('There are no products to display.');

        // Add grid rows to the products array
        productCatalog.mostPopular.rows.subscribe(function () {
            productCatalog.products(productCatalog.mostPopular.rows());
        });

        // When a grid row is clicked, this will open the product
        productCatalog.mostPopular.selectedRow.subscribe(function (newValue) {
            if (newValue !== undefined) {
                location.href = "#product=" + newValue.data().ProductID;
            }
        });

        var mostPopularQueryParams = {
            clientId: productCatalog.queryParams().clientId,
            addressId: customerOrderViewModel.addressDialogVm().addressId(),
            dirId: MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().dirId)
        };

        productCatalog.mostPopular.gridParametersModel.addQueryParams(mostPopularQueryParams);

        productCatalog.mostPopularInitialized(true);
    };

    // Recently Ordered

    this.recentlyOrderedItems = ko.observableArray();

    this.initializeRecentlyOrdered = function() {

        productCatalog.recentlyOrderedLoading(true);

        var url = productCatalog.endPoints.getRecentlyOrdered + '?clientId=' + productCatalog.queryParams().clientId + '&addressId=' + customerOrderViewModel.addressDialogVm().addressId();

        if (MetTel.Utils.getQueryParams().dirId) {
            url += '&dirId=' + MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().dirId);
        }

        $.getJSON(url, function(response) {
            productCatalog.recentlyOrderedItems(response);

            productCatalog.recentlyOrderedLoading(false);
        });

        productCatalog.recentlyOrderedInitialized(true);
    };

    // Get product catalog data
    this.init = function (includeSaveAsDefault) {

        if (typeof productCatalog.endPoints.getMostPopular !== 'undefined' && !customerOrderViewModel.modifyOrder && !productCatalog.retrievedOrder()) {
            customerOrderViewModel.addressDialogVm().addressId.subscribe(function(newValue) {
                if (newValue) {
                    productCatalog.initializeMostPopular();
                }
            });
        }

        if (typeof productCatalog.endPoints.getRecentlyOrdered !== 'undefined' && !customerOrderViewModel.modifyOrder && !productCatalog.retrievedOrder()) {
            customerOrderViewModel.addressDialogVm().addressId.subscribe(function(newValue) {
                if (newValue) {
                    productCatalog.initializeRecentlyOrdered();
                }
            });
        }

        if (typeof productCatalog.endPoints.getMenuItems !== 'undefined') {
            productCatalog.productCatalogLoading(true);

            // Set url with query params
            var url = productCatalog.endPoints.getMenuItems + productCatalog.queryString();

            if (typeof customerOrderViewModel !== 'undefined' && customerOrderViewModel.modifyOrder) {
                url += '&modType=' + customerOrderViewModel.modificationTypeString();

                var subCatagoryId = 1;

                // TODO: get this value correctly for retrieved orders + modify equipment
                if (customerOrderViewModel.services().length > 0) {
                    subCatagoryId = customerOrderViewModel.services()[0].SubCategoryID;
                }
                url += '&subCatagoryId=' + subCatagoryId;

            }

            if (typeof customerOrderViewModel !== 'undefined') {

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

                if (addressString) {
                    url += "&addressId=" + addressString;
                }

                if (customerOrderViewModel.dirId) {
                    url += "&dirId=" + customerOrderViewModel.dirId;
                }

                if (customerOrderViewModel.modifyOrder) {
                    url += "&subcategoryIds=" + customerOrderViewModel.uniqueServiceSubcategories().toString();
                }
            }

            var loadMenu = function(includeSaveAsDefault) {
                // Go fetch the product catalog data

                if (includeSaveAsDefault) {
                    url += '&saveAsDefault=' + customerOrderViewModel.saveAddressAsDefault();
                }

                $.getJSON(url, function (data) {

                    // Create new models for the categories, collect their selected observables, and initialize them
                    $.each(data.categories, function (i, category) {

                        category = new CategoryModel(productCatalog, category, productCatalog.endPoints, productCatalog.queryString());
                        productCatalog.selectedObservables.push(category.selected);
                        category.init();
                        data.categories[i] = category;

                    });

                    productCatalog.categories(data.categories);

                    productCatalog.menuLoading(false);
                    productCatalog.productCatalogLoading(false);

                    if (!productCatalog.pcvmLoadFragmentSet()) {
                        $(window).bind('hashchange', pcvmLoadFragment);
                        productCatalog.pcvmLoadFragmentSet(true);
                    }
                    pcvmLoadFragment();
                });
            };

            if (url.indexOf("addressId") >= 0 || typeof customerOrderViewModel === 'undefined') {
                loadMenu(includeSaveAsDefault);
            }
            else {
                // if no address is specified initially, wait to query for the menu until we have our addressId
                var addressSubscription = customerOrderViewModel.addressDialogVm().addressId.subscribe(function(newValue) {
                    url += "&addressId=" + newValue;
                    loadMenu(includeSaveAsDefault);
                    addressSubscription.dispose();
                });

            }
        }
        else {
            productCatalog.menuLoading(false);
        }

        // Pricing Types
        if (typeof customerOrderViewModel === 'undefined') {
            this.pricingTypes = asyncComputed(function () {
                return $.getJSON(productCatalog.endPoints.pricingTypes);
            });
        }

        // Pricing Terms
        if (typeof customerOrderViewModel === 'undefined') {
            this.financeTerm = asyncComputed(function () {
                return $.getJSON(productCatalog.endPoints.pricingTerms);
            });
        }

        // OneTime Terms
        if (typeof customerOrderViewModel === 'undefined') {
            this.oneTimeTerms = asyncComputed(function () {
                return $.getJSON(productCatalog.endPoints.oneTimeTerms);
            });
        }

    };


    this.availableOptions = ko.observable({
        skus: ko.observable({}),
        customOptions: ko.observable({}),
        templateOptions: ko.observable({})
    });

    /**
     * Option matches available sku proxy
     *
     * @param {String} key
     * @param {Object} value
     * @return {Boolean}
     */
    this.optionMatchesAvailableSku = function (key, value) {
        return ko.computed(function () {
            if (productCatalog.activeProduct() !== null) {
                return ko.utils.unwrapObservable(productCatalog.activeProduct().optionMatchesAvailableSku(key, value));
            }

            return false;
        });
    };

    /**
     * Get a list of all the checked attributes for a
     * particular SKU name.
     *
     * @param {String} skuName
     * @param {Array} skus
     * @return {Array}
     */
    this.checkedAttrsForSKU = function(skuName, skus) {
        var checkedAttrs = [],
            skuCheckedAttrsObservable;

        $.each(skus, function (i, sku) {
            if (sku.sku() === skuName) {
                var attrs = sku.attributes();
                skuCheckedAttrsObservable = sku.checkedAttrsString;

                $.each(attrs, function (i, attr) {
                    if (typeof attr.itemState === 'function' && attr.itemState() === 'DELETE') {
                        return;
                    }
                    if (attr.selected()) {
                        checkedAttrs.push(attr.value());
                    }
                });

                return;
            }
        });

        if (typeof skuCheckedAttrsObservable !== 'undefined') {
            skuCheckedAttrsObservable(checkedAttrs.join(", "));
        }

        return checkedAttrs.join(", ");
    };

    this.formatSubOption = function (sku) {
        var attributes = sku.attributes;

        var str = "";

        $.each(attributes, function (i, attr) {
            if (attr.selected) {
                str += ko.utils.unwrapObservable(attr.value) + ', ';
            }
        });

        return str.substr(0, str.length - 2);
    };


    // For sub-product flyouts in product preview
    this.setupSubOptionsWatches = function (optionGroup, choices, newOption) {

        var setupSubSubProducts = function(subOptionGroupsArray, subOptionGroupsObs) {

            $.each(subOptionGroupsArray, function(j, subOptGroup) {
                subOptGroup.titleSlugified = subOptGroup.title.replace(/\s+/g, '-').toLowerCase();

                // multiple choice
                if (subOptGroup.optionGroupTypeId === 1) {
                    subOptGroup.subSubProductSelection = null;

                    // For non-required and non-hidden multiple choice options groups, we need a "None" option
                    if (!subOptGroup.required && !subOptGroup.hidden && !subOptGroup.miniCatalog) {

                        var noneOption = {
                            name: 'None',
                            refProductId: 'None'
                        };

                        subOptGroup.products.unshift(noneOption);
                    }

                    // insert "no change" option for modify service if needed
                    if (subOptGroup.showNoChange) {

                        var noChangeOption = {
                            name: 'No change - Keep individual values',
                            refProductId: 'NoChange'
                        };

                        subOptGroup.products.unshift(noChangeOption);
                    }

                // checkboxes
                } else if (subOptGroup.optionGroupTypeId === 2) {

                    // for "no change" for modify service
                    subOptGroup.showNoChange = subOptGroup.showNoChange || false;
                    subOptGroup.makeChanges = "Yes";
                    if (subOptGroup.showNoChange) {
                        subOptGroup.makeChanges = "No";
                    }
                    subOptGroup.optionsUnchanged = true;

                    // adding selected indicators
                    $.each(subOptGroup.products, function(k, subSubProduct) {
                        // preselect/autoselect first checkbox for required and hidden option groups unless modifying an order
                        subSubProduct.selected = ((typeof customerOrderViewModel === 'undefined' || !customerOrderViewModel.modifyOrder) && (subOptGroup.required || subOptGroup.hidden)) ? k === 0 : false;
                    });
                }

                var mappedSubOptGroup = ko.mapping.fromJS(subOptGroup);

                if (mappedSubOptGroup.optionGroupTypeId() === 1) {
                    mappedSubOptGroup.subSubProductSelection(mappedSubOptGroup.products().length ? mappedSubOptGroup.products()[0] : null); // preselect/autoselect first radio
                } else if (mappedSubOptGroup.optionGroupTypeId() === 2) {

                    // for "no change" for modify service
                    mappedSubOptGroup.canMakeChanges = ko.computed(function() {
                        return mappedSubOptGroup.makeChanges() === 'Yes';
                    });
                }

                subOptionGroupsObs.push(mappedSubOptGroup);
            });
        };

        // For multiple choice and checkboxes
        if (optionGroup.optionGroupTypeId() === 1 || optionGroup.optionGroupTypeId() === 2) {
            $.each(choices, function (i, choice) {

                // Determines to show the group of sub-options only if any of the sku attributes are selected
                choice.subOptionsHaveSelectedAttribute = ko.computed(function () {
                    var flag = false,
                        foundSelected = false;
                    if (choice.subOptions().length) {
                        $.each(choice.subOptions(), function (j, sku) {
                            if (foundSelected) {
                                return false;
                            }
                            $.each(sku.attributes, function (k, attr) {
                                if (attr.selected) {
                                    flag = true;
                                    foundSelected = true;
                                    return false;
                                }
                            });
                        });
                    }
                    return flag;
                });

                choice.subOptionGroups = ko.observableArray([]);

                // Determines whether or not to show the "subProduct" flyout for the choice
                // based on both subProduct skus and sub sub products
                choice.showSubChoices = ko.computed(function() {
                    return (choice.subOptionsHaveSelectedAttribute() || choice.subOptionGroups().length);
                });

                // only for actual products, not the "None" option
                if (choice.refProductId) {
                    choice.subsLoaded = ko.observable(false);
                }

                // For multiple choice
                if (optionGroup.optionGroupTypeId() === 1) {

                    // Fetches data for the selected sub-product once and stores it
                    // and updates the selected choice
                    choice.checkSubOptions = ko.computed(function () {
                        if (typeof newOption.previewSelectedChoice !== 'function') {
                            newOption.previewSelectedChoice = ko.observable();
                        }
                        if (newOption.previewSelectedChoice() === choice.choice) {
                            newOption.previewSelectedChoiceObject(choice);
                            if (!choice.subOptionsChecked) {
                                choice.subOptionsChecked = true;
                                // We don't need to fetch sub options for the "None" choice, which has no refProductId
                                if (choice.refProductId) {

                                    var address = MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().addressId);
                                    if (typeof customerOrderViewModel !== 'undefined') {
                                        if ((typeof customerOrderViewModel.addressDialogVm().addressId()) !== 'undefined') {
                                            address = customerOrderViewModel.addressDialogVm().addressId();
                                        }
                                    }

                                    // check for subproducts endpoints, not necessary to get this data for order retrieval
                                    if (productCatalogViewModel.endPoints.subproducts) {
                                        var subProductUrl = productCatalogViewModel.endPoints.subproducts + '?productId=' + choice.refProductId;

                                        if (typeof customerOrderViewModel !== 'undefined') {
                                            subProductUrl += '&addressId=' + address + '&clientId=' + productCatalogViewModel.queryParams().clientId;

                                            if (customerOrderViewModel.dirId) {
                                                subProductUrl += "&dirId=" + customerOrderViewModel.dirId;
                                            }
                                        }

                                        $.getJSON(subProductUrl, function (response) {

                                            choice.subOptions(response.skus || []);
                                            // Selects first sub-option by default
                                            choice.subProductSelection(choice.subOptions().length ? choice.subOptions()[0].sku : null);
                                            if (response.subOptionGroups) {
                                                setupSubSubProducts(response.subOptionGroups, choice.subOptionGroups);
                                            }

                                            choice.subsLoaded(true);
                                        });
                                    }
                                } else {
                                    choice.subProductSelection(null);
                                }
                            }
                        }
                    });
                }

                // For checkboxes
                if (optionGroup.optionGroupTypeId() === 2) {

                    // Fetches data for the selected sub-product once and stores it
                    choice.checkSubOptions = ko.computed(function () {
                        if (productCatalogViewModel.availableOptions()[newOption.type]()[newOption.name][choice.choice]() && !choice.subOptionsChecked) {
                            choice.subOptionsChecked = true;

                            var address = MetTel.Utils.sanitizeString(MetTel.Utils.getQueryParams().addressId);
                            if (typeof customerOrderViewModel !== 'undefined') {
                                if ((typeof customerOrderViewModel.addressDialogVm().addressId()) !== 'undefined') {
                                    address = customerOrderViewModel.addressDialogVm().addressId();
                                }
                            }

                            // check for subproducts endpoints, not necessary to get this data for order retrieval
                            if (productCatalogViewModel.endPoints.subproducts) {
                                var subProductUrl = productCatalogViewModel.endPoints.subproducts + '?productId=' + choice.refProductId;

                                if (typeof customerOrderViewModel !== 'undefined') {
                                    subProductUrl += '&addressId=' + address + '&clientId=' + productCatalogViewModel.queryParams().clientId;

                                    if (customerOrderViewModel.dirId) {
                                        subProductUrl += "&dirId=" + customerOrderViewModel.dirId;
                                    }
                                }

                                $.getJSON(subProductUrl, function (response) {

                                    choice.subOptions(response.skus || []);
                                    // Selects first sub-option by default
                                    choice.subProductSelection(choice.subOptions().length ? choice.subOptions()[0].sku : null);

                                    if (response.subOptionGroups) {
                                        setupSubSubProducts(response.subOptionGroups, choice.subOptionGroups);
                                    }
                                    choice.subsLoaded(true);
                                });
                            }
                        }
                    });
                }
            });
        }

        // For checkboxes
        if (optionGroup.optionGroupTypeId() === 2) {

            // Allow the sub options flyout to show
            // If any of the selected checkboxes have sub choices (skus or sub sub products)
            newOption.showSubOptions = ko.computed(function () {
                var flag = false;
                if (productCatalogViewModel.availableOptions()[newOption.type]()[newOption.name]) {
                    $.each(productCatalogViewModel.availableOptions()[newOption.type]()[newOption.name], function (choiceName, choiceChecked) {
                        // Check if any are checked
                        if (choiceChecked()) {
                            // If checked, see if they have sub choices (skus or sub sub products)
                            $.each(newOption.choices(), function (i, choice) {
                                if (choice.choice === choiceName) {
                                    if (choice.showSubChoices()) {
                                        flag = true;
                                    }
                                }
                            });
                        }
                    });
                }
                return flag;
            });
        }
    };


    /**
     * Builds the preview group options. This is a slight modification of pricingGroupOptions.
     * Essentially translates the complex structure of the SKUs, custom options, and template
     * options into a flat structure that can be easily consumed by the template.
     *
     * @return {Observable}
     */
    this.previewGroupOptions = ko.computed(function () {
        var optionsArray = [];

        var product = productCatalog.activeProduct();
        if (typeof product === 'undefined' || product === null) {
            return [];
        }

        var optionGroupIndex = 0;

        // Get the available SKU keys and all their values
        var attributeMap = {};
        var skus = product.viewableSKUs();

        $.each(skus, function (i, sku) {
            var attributes = _.filter(sku.attributes(), function (attribute) {
                return attribute.selected();
            });

            $.each(attributes, function (i, attribute) {
                var aKeyLc = attribute.key().toLowerCase(),
                    aValueLc = attribute.value().toLowerCase();

                if (!attributeMap.hasOwnProperty(aKeyLc)) {
                    attributeMap[aKeyLc] = [];
                }
                attributeMap[aKeyLc].push(attribute.value().toLowerCase());

                if (!(productCatalogViewModel.availableOptions().skus()[aKeyLc])) {
                    productCatalogViewModel.availableOptions().skus()[aKeyLc] = {};
                }

                productCatalogViewModel.availableOptions().skus()[aKeyLc][aValueLc] = ko.observable(i === 0);

                var attrValue = aValueLc;

                // Subscribe to each value
                productCatalogViewModel.availableOptions().skus()[aKeyLc][aValueLc].subscribe(function (newValue) {
                    for (var choice in productCatalogViewModel.availableOptions().skus()[aKeyLc]) {
                        if (choice !== attrValue) {
                            productCatalogViewModel.availableOptions().skus()[aKeyLc][choice](false);
                        } else {
                            productCatalogViewModel.availableOptions().skus()[aKeyLc][choice](newValue);
                        }
                    }
                });
            });

        });

        // Build the array.
        for (var key in attributeMap) {
            attributeMap[key] = _.uniq(attributeMap[key]);

            optionsArray.push({
                name: key,
                nameSlugified: key.replace(/\s+/g, '-').toLowerCase(),
                originalName: key,
                /*jshint -W083 */
                choices: ko.observableArray($.map(attributeMap[key], function (obj, index) {
                    return {choice: obj};
                })),
                type: 'skus',
                index: optionGroupIndex++,
                configuration: 1,
                previewSelectedChoice: ko.observable(attributeMap[key][0]),
                hidden: ko.observable(false),
                miniCatalog: ko.observable(false),
                required: ko.observable(true),
                itemState: ko.observable('NOCHANGE')
            });
        }

        // Custom Options

        var customOptions = product.customOptions();

        $.each(customOptions, function (i, optionGroup) {
            var choices = [];
            if (optionGroup.optionGroupTypeId() === 3 || optionGroup.optionGroupTypeId() === 4) {
                var optionArray = {
                    name: 'Custom ' + optionGroup.title(),
                    id: optionGroup.id(),
                    originalName: optionGroup.title(),
                    type: 'customOptions',
                    index: optionGroupIndex++,
                    miniCatalog: ko.observable(false),
                    configuration: optionGroup.optionGroupTypeId(),
                    itemState: ko.observable(optionGroup.itemState())
                };

                if (optionGroup.optionGroupTypeId() === 4) {
                    optionArray.text = optionGroup.text();
                } else if (optionGroup.optionGroupTypeId() === 3) {
                    optionArray.rows = optionGroup.rowsText() || 3;
                    optionArray.maxLength = optionGroup.maximumCharacters() || 500;
                    optionArray.text = ko.observable('');
                }

                optionsArray.push(optionArray);
            } else {
                $.each(optionGroup.rows(), function (i, row) {

                    if (!(productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()])) {
                        productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()] = {};
                    }

                    // preselect/autoselect first checkbox for required and hidden option groups unless modifying an order
                    productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()][row.name()] = ((typeof customerOrderViewModel === 'undefined' || !customerOrderViewModel.modifyOrder) && (optionGroup.required() || optionGroup.hidden())) ? ko.observable(i === 0) : ko.observable();


                    if (optionGroup.optionGroupTypeId() === 1) {
                        var attrValue = row.name();
                        productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()][row.name()].subscribe(function (newValue) {
                            for (var choice in productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()]) {
                                if (choice !== attrValue) {
                                    productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()][choice](false);
                                } else {
                                    productCatalogViewModel.availableOptions().customOptions()['Custom ' + optionGroup.title()][choice](newValue);
                                }
                            }
                        });
                    }

                    var choice = {
                        choice: row.name(),
                        id: row.id(),
                        refProductId: row.refProductId ? row.refProductId() : 0,
                        subProductSelection: ko.observable(),
                        subOptions: ko.observableArray(),
                        subOptionsChecked: false,
                        quantity: ko.observable(1),
                        price: row.price ? row.price() : 0,
                        thumbnail: row.thumbnail ? row.thumbnail() : '',
                        miniCatalogLoaded: ko.observable(false)
                    };

                    if (row.hasOwnProperty('description')) {
                        choice.description = row.description();
                    }

                    if (row.hasOwnProperty('type')) {
                        choice.type = row.type();
                    }

                    if (row.hasOwnProperty('refProductId')) {
                        choice.refProductId = row.refProductId ? row.refProductId() : 0;
                    }

                    choices.push(choice);
                });

                // For non-required and non-hidden multiple choice options groups, we need a "None" option
                if (optionGroup.optionGroupTypeId() === 1 && (!optionGroup.required() && !optionGroup.hidden()) && !optionGroup.miniCatalog()) {

                    var noneOption = {
                        choice: 'None',
                        subProductSelection: ko.observable(),
                        subOptions: ko.observableArray(),
                        quantity: ko.observable(1)
                    };

                    choices.unshift(noneOption);
                }

                // insert "no change" option for modify service if needed
                if (optionGroup.optionGroupTypeId() === 1 && typeof optionGroup.showNoChange !== 'undefined' && optionGroup.showNoChange()) {

                    var noChangeOption = {
                        choice: 'No change - Keep individual values',
                        subProductSelection: ko.observable(),
                        subOptions: ko.observableArray(),
                        subOptionsChecked: false,
                        quantity: ko.observable(1)
                    };

                    choices.unshift(noChangeOption);
                }

                var newOptionName = 'Custom ' + optionGroup.title();

                var newOption = {
                    name: newOptionName,
                    id: optionGroup.id(),
                    nameSlugified: newOptionName.replace(/\s+/g, '-').toLowerCase(),
                    originalName: optionGroup.title(),
                    choices: ko.observableArray(choices),
                    type: 'customOptions',
                    index: optionGroupIndex++,
                    configuration: optionGroup.optionGroupTypeId(),
                    previewSelectedChoice: optionGroup.optionGroupTypeId() === 1 ? (ko.observable(choices.length ? choices[0].choice : null)) : null, // preselect/autoselect first radio
                    previewSelectedChoiceObject: ko.observable(),
                    required: ko.observable(optionGroup.required()),
                    hidden: ko.observable(optionGroup.hidden()),
                    miniCatalog: ko.observable(optionGroup.miniCatalog()),
                    showInSubProducts: ko.observable(optionGroup.showInSubProducts()),
                    itemState: ko.observable(optionGroup.itemState()),
                    quantityTypeId: typeof optionGroup.quantityTypeId !== 'undefined' ? ko.observable(optionGroup.quantityTypeId()) : ko.observable(1),
                    quantityTypeName: ko.observable(optionGroup.quantityTypeName()),
                    showNoChange: ko.observable(optionGroup.showNoChange ? optionGroup.showNoChange() : false),
                    subcategoryId: optionGroup.subcategoryId()
                };

                if (optionGroup.optionGroupTypeId() === 2) {

                    // for "no change" for modify service
                    newOption.makeChanges = ko.observable("Yes");

                    if (optionGroup.showNoChange && optionGroup.showNoChange()) {
                        newOption.makeChanges = ko.observable("No");
                    }

                    newOption.optionsUnchanged = ko.observable(true);
                    newOption.canMakeChanges = ko.computed(function() {
                        return newOption.makeChanges() === 'Yes';
                    });
                }

                optionsArray.push(newOption);

                productCatalog.setupSubOptionsWatches(optionGroup, choices, newOption);
            }
        });


        // Template Options

        if (product.templateOptions) {

            var templateOptions = product.templateOptions();

            $.each(templateOptions, function (i, optionGroup) {
                var choices = [];
                if (optionGroup.optionGroupTypeId() === 3 || optionGroup.optionGroupTypeId() === 4) {
                    var optionArray = {
                        name: 'Template ' + optionGroup.title(),
                        id: optionGroup.id(),
                        originalName: optionGroup.title(),
                        type: 'templateOptions',
                        miniCatalog: ko.observable(false),
                        index: optionGroupIndex++,
                        configuration: optionGroup.optionGroupTypeId(),
                        itemState: ko.observable(optionGroup.itemState())
                    };

                    if (optionGroup.optionGroupTypeId() === 4) {
                        optionArray.text = optionGroup.text();
                    } else if (optionGroup.optionGroupTypeId() === 3) {
                        optionArray.rows = optionGroup.rowsText() || 3;
                        optionArray.maxLength = optionGroup.maximumCharacters() || 500;
                        optionArray.text = ko.observable('');
                    }

                    optionsArray.push(optionArray);
                } else {
                    $.each(optionGroup.rows(), function (i, row) {

                        if (row.hidden() === true) {
                            return;
                        }

                        if (!(productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()])) {
                            productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()] = {};
                        }

                        // preselect/autoselect first checkbox for required and hidden option groups
                        productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()][row.name()] = (optionGroup.required() || optionGroup.hidden()) ? ko.observable(i === 0) : ko.observable();

                        if (optionGroup.optionGroupTypeId() === 1) {
                            var attrValue = row.name();
                            productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()][row.name()].subscribe(function (newValue) {
                                for (var choice in productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()]) {
                                    if (choice !== attrValue) {
                                        productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()][choice](false);
                                    } else {
                                        productCatalogViewModel.availableOptions().templateOptions()['Template ' + optionGroup.title()][choice](newValue);
                                    }
                                }
                            });
                        }

                        var choice = {
                            choice: row.name(),
                            id: row.id(),
                            refProductId: row.refProductId ? row.refProductId() : 0,
                            subProductSelection: ko.observable(),
                            subOptions: ko.observableArray(),
                            subOptionsChecked: false,
                            quantity: ko.observable(1),
                            miniCatalogLoaded: ko.observable(false)
                        };

                        if (row.hasOwnProperty('description')) {
                            choice.description = row.description();
                        }

                        if (row.hasOwnProperty('refProductId')) {
                            choice.refProductId = row.refProductId ? row.refProductId() : 0;
                        }

                        choices.push(choice);
                    });

                    // For non-required and non-hidden multiple choice options groups, we need a "None" option
                    if (optionGroup.optionGroupTypeId() === 1 && (!optionGroup.required() && !optionGroup.hidden())) {

                        var noneOption = {
                            choice: 'None',
                            subProductSelection: ko.observable(),
                            subOptions: ko.observableArray()
                        };

                        choices.unshift(noneOption);
                    }

                    // insert "no change" option for modify service if needed
                    if (optionGroup.optionGroupTypeId() === 1 && typeof optionGroup.showNoChange !== 'undefined' && optionGroup.showNoChange()) {

                        var noChangeOption = {
                            choice: 'No change - Keep individual values',
                            subProductSelection: ko.observable(),
                            subOptions: ko.observableArray(),
                            subOptionsChecked: false,
                            quantity: ko.observable(1)
                        };

                        choices.unshift(noChangeOption);
                    }

                    var newOptionName = 'Template ' + optionGroup.title();

                    var newOption = {
                        name: newOptionName,
                        id: optionGroup.id(),
                        nameSlugified: newOptionName.replace(/\s+/g, '-').toLowerCase(),
                        originalName: optionGroup.title(),
                        choices: ko.observableArray(choices),
                        type: 'templateOptions',
                        index: optionGroupIndex++,
                        configuration: optionGroup.optionGroupTypeId(),
                        previewSelectedChoice: optionGroup.optionGroupTypeId() === 1 ? (ko.observable(choices.length ? choices[0].choice : null)) : null, // preselect/autoselect first radio
                        previewSelectedChoiceObject: ko.observable(),
                        required: ko.observable(optionGroup.required()),
                        hidden: ko.observable(optionGroup.hidden()),
                        miniCatalog: ko.observable(optionGroup.miniCatalog()),
                        showInSubProducts: ko.observable(optionGroup.showInSubProducts()),
                        itemState: ko.observable(optionGroup.itemState()),
                        quantityTypeId: typeof optionGroup.quantityTypeId !== 'undefined' ? ko.observable(optionGroup.quantityTypeId()) : ko.observable(1),
                        quantityTypeName: ko.observable(optionGroup.quantityTypeName()),
                        showNoChange: ko.observable(optionGroup.showNoChange ? optionGroup.showNoChange() : false),
                        subcategoryId: optionGroup.subcategoryId()
                    };

                    if (optionGroup.optionGroupTypeId() === 2) {

                        // for "no change" for modify service
                        newOption.makeChanges = ko.observable("Yes");

                        if (optionGroup.showNoChange && optionGroup.showNoChange()) {
                            newOption.makeChanges = ko.observable("No");
                        }

                        newOption.optionsUnchanged = ko.observable(true);
                        newOption.canMakeChanges = ko.computed(function() {
                            return newOption.makeChanges() === 'Yes';
                        });
                    }

                    optionsArray.push(newOption);

                    productCatalog.setupSubOptionsWatches(optionGroup, choices, newOption);
                }
            });
        }

        return optionsArray;

    }).extend({notify: 'always'});


    /**
     * Product Catalog Submenu
     */

    this.selectCategoryOnUpdate = function(onlySelectIfSingle) {
        var categoriesSubscription = productCatalog.categories.subscribe(function(newValue) {
            if (newValue.length  && (!onlySelectIfSingle || newValue.length === 1)) {
                var categoryId = productCatalog.categories()[0].id;
                if (categoryId) {
                    location.href = '#category=' + categoryId;
                }
            }
            categoriesSubscription.dispose();
        });
    };

        // For styling specifically for when the scrollbar is present on the product catalog menu
    this.checkMenuForScrollbar = function () {
        if (Modernizr.overflowscroll) {
            var $menu = $('[data-mettel-class="product-catalog-menu"]'),
                $categoriesList = $menu.children('[data-mettel-class="product-catalog-categories"]'),
                scrollbarClass = 'mettel-menu-scrollbar';

            if ($categoriesList.outerHeight() > $menu.outerHeight()) {
                $menu.addClass(scrollbarClass);
            } else {
                $menu.removeClass(scrollbarClass);
            }
        }
    };

    // Building an object to do the hovering of the submenu. Scrollbar affects the hover. This is why this function is needed.
    (function () {
        "use strict";

        var hoverClass = 'mettel-state-hover',
            selectedCategoryClass = 'mettel-state-selected',
            $pageInner = $('[data-mettel-class="page-inner"]'),
            $menu = $pageInner.find('[data-mettel-class="product-catalog-menu"]'),
            federalBannerHeight = $('.federal_banner').outerHeight();

        function ProductCatalogSubMenu(element, options) {
            this.$element = $(element);
            this.$parent = this.$element.parent('[data-mettel-class="product-catalog-category"]');
            this.$menu = this.$element.closest('[data-mettel-class="product-catalog-menu"]');
            this.$submenu = this.$element.siblings('[data-mettel-class="product-catalog-subcategories-container"]').clone(true, true).addClass('mettel-product-catalog-submenu');
            this.enter();
        }

        ProductCatalogSubMenu.prototype.enter = function () {
            // find any menu item with hover and remove hover
            $menu.find('.' + hoverClass + '[data-mettel-class="product-catalog-subcategories-container"]').removeClass(hoverClass);
            // find any submenu and remove them
            $pageInner.children('mettel-product-catalog-submenu').hide().detach();

            // Only show the submenu if the category isn't selected
            if (this.$parent.hasClass(selectedCategoryClass)) {
                return false;
            }
            this.$element.addClass(hoverClass);
            this.$parent.addClass(hoverClass);
            $pageInner.append(this.$submenu);
            this.scroll();
            this.$submenu.show();

            this.$element.add(this.$submenu).add(this.$menu).on('mouseleave', $.proxy(this.leave, this));
        };
        ProductCatalogSubMenu.prototype.resize = function (e) {
            this.$container = this.$submenu.closest("[data-mettel-class='page-inner']");
            if (parseInt($(this.$submenu).css('height'), 10) > parseInt($(this.$container).css('height'), 10)) {
                $(this.$submenu).css({
                    'height': $(this.$container).css('height')
                });
                $(this.$submenu).addClass("mettel-allow-scroll");
            } else {
                $(this.$submenu).css({
                    'height': 'initial'
                });
                $(this.$submenu).removeClass("mettel-allow-scroll");
            }
        };
        ProductCatalogSubMenu.prototype.leave = function (e) {
            var $current = $(e.toElement);
            if (this.$menu.is($current)) {
                var self = this;
                // cursor is over menu (mostly scrollbar) so don't hide submit
                this.$menu.on('mouseenter', '*', function (e) {
                    // listen for mouse hovering over something else in the menu (except scrollbar and current parent) and hide submenu
                    if (!self.$element.is($(e.toElement))) {
                        self.reset();
                    }
                });
                return;
            } else if (this.$element.is($current) || this.$submenu.has($current).length) {
                return; // don't hide if cursor is over parent or submenu
            }
            $(this.$submenu).css({
                'height': 'initial'
            });
            $(this.$submenu).removeClass("mettel-allow-scroll");
            this.reset();
        };
        ProductCatalogSubMenu.prototype.reset = function () {
            this.$menu.off('mouseenter');
            this.$element.removeClass(hoverClass);
            this.$parent.removeClass(hoverClass);
            this.$submenu.hide().detach();
            this.$menu.off('scroll', $.proxy(this.scroll, this));
        };

        ProductCatalogSubMenu.prototype.scroll = function (e) {
            if (this.$submenu.outerHeight() + (this.$element.offset().top - $(window).scrollTop()) > (window.innerHeight - 32)) {
                // submenu is off-screen (at the bottom) ... reposition it on-screen
                this.$submenu.css('top', 'auto');
                this.$submenu.css('bottom', 0);
            } else {
                this.$submenu.css('top', this.$element.offset().top - 45 - federalBannerHeight);
                this.$submenu.css('bottom', 'auto');
            }
            this.resize();
        };
        var old = $.fn.productCatalogSubmenu;
        $.fn.productCatalogSubmenu = function (option) {
            return this.each(function () {
                var $this = $(this),
                    data = $this.data('mettel.productCatalogMenu'),
                    options = typeof option === 'object' && option;

                if (!data) {
                    $this.data('mettel.productCatalogMenu', (data = new ProductCatalogSubMenu(this, options)));
                }
                if (typeof option === 'string') {
                    data[option]();
                }
            });
        };

        $.fn.productCatalogSubmenu.Constructor = ProductCatalogSubMenu;

        $.fn.productCatalogSubmenu.noConflict = function () {
            $.fn.productCatalogSubmenu = old;
            return this;
        };

        $(document).on('mouseenter.mettel.productCatalogMenu', '[data-mettel-class="product-catalog-category-link"]', function (e) {
            var $this = $(this);
            if ($this.siblings('[data-mettel-class="product-catalog-subcategories-container"]').length) {
                e.stopPropagation();
                var data = $this.data('mettel.productCatalogMenu');
                if (data) {
                    data.enter();
                } else {
                    $this.productCatalogSubmenu($this.data());
                }
            }
        });
    })();
};

ko.bindingHandlers.productCatalogCategory = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $subcategoriesContainer = $element.find('[data-mettel-class="product-catalog-subcategories-container"]'),
            hoverClass = 'mettel-category-hover';

        $element.on({
            'mouseenter': function () {
                if (!viewModel.selected()) {
                    $subcategoriesContainer.addClass(hoverClass);
                }
            },
            'mouseleave': function () {
                $subcategoriesContainer.removeClass(hoverClass);
            },
            'click': function () {
                $subcategoriesContainer.removeClass(hoverClass);
            }
        });
    }
};


ko.bindingHandlers.addCategoryTrigger = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.next('[data-mettel-class="product-catalog-add-category-modal"]'),
            $firstTextInput = $modal.find('#new-category-name'),
            modalOptions = {};

        modalOptions.close = function () {
            if (viewModel.addCategoryUnsuccessful()) {
                viewModel.addCategoryUnsuccessful(false);
            }
        };

        $element.on({
            'click': function (e) {
                e.preventDefault(); // Prevent premature hash change

                // Open the modal with focus on the first input
                $modal.modalWindow(modalOptions);
                $firstTextInput.focus();

                // Allow the successful post to close the modal
                viewModel.addNewCategoryCallback = function () {
                    $modal.modalWindow('close');
                };
            }
        });
    }
};

ko.bindingHandlers.addSubcategoryTrigger = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.next('[data-mettel-class="product-catalog-add-subcategory-modal"]'),
            $textInput = $modal.find('#new-subcategory-name'),
            modalOptions = {};

        modalOptions.close = function () {
            if (viewModel.addSubcategoryUnsuccessful()) {
                viewModel.addSubcategoryUnsuccessful(false);
            }
        };

        $element.click(function (e) {
            e.preventDefault(); // Prevent premature hash change

            // Open the modal with focus on the input
            $modal.modalWindow(modalOptions);
            $textInput.focus();

            // Allow the successful post to close the modal
            viewModel.addNewSubcategoryCallback = function () {
                $modal.modalWindow('close');
            };
        });
    }
};

ko.bindingHandlers.filterCategoryFlyout = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $flyout = $element.prev(),
            $cancel = $flyout.find('.mettel-product-catalog-grid-filter-cancel'),
            $apply = $flyout.find('.mettel-product-catalog-grid-filter-apply'),
            flyoutOptions = {
                event: 'click',
                position: 'bottom',
                customTabbing: true
            },
            objOriginalDropdownValues = {};

        flyoutOptions.open = function() {
            // capture which filters are applied, so we can reset to them upon cancel
            _.each(productCatalogViewModel.productsGrid.dropdownFilters(), function(filter) {
                objOriginalDropdownValues[filter.column] = filter.applied();
            });

            $cancel.focus();
        };

        flyoutOptions.cancel = function() {
            // upon cancel, reset any filters that were applied
            _.each(productCatalogViewModel.productsGrid.dropdownFilters(), function(filter) {
                filter.applied(objOriginalDropdownValues[filter.column]);
            });
        };

        flyoutOptions.flyout = $flyout;

        $element.mettelFlyout(flyoutOptions);

        $cancel.on('click', function() {
            $element.mettelFlyout('cancel', flyoutOptions);
        });

        $apply.on('click', function() {
            $element.mettelFlyout('close', flyoutOptions);

            _.each(productCatalogViewModel.productsGrid.dropdownFilters(), function(filter) {
                // remove any previously selected filters that the user unchecked
                if (objOriginalDropdownValues[filter.column] === true && filter.applied() === false) {
                    // check for a searchRow, since "All" is not really a filter so has no searchRow
                    if (filter.searchRow()) {
                        productCatalogViewModel.productsGrid.removeFilter(filter.searchRow());
                    }
                }
            });

            // update the list of filters to show
            productCatalogViewModel.productsGrid.updateAppliedDropdownFilters();

            $('.mettel-product-catalog-grid-filter-option-trigger').focus();
        });
    }
};

ko.bindingHandlers.filterOptionsFlyout = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $flyout = $element.prev(),
            flyoutOptions = {
                event: 'click',
                position: 'bottom',
                customTabbing: true
            },
            filterSubscription;

        flyoutOptions.open = function() {
            // when a radio button is selected, apply the filter and close the flyout
            filterSubscription = viewModel.activeValue.subscribe(function(newValue) {

                // find matching operator
                var newOperator;
                $.each(viewModel.options, function(i, option) {
                    if (option.value === newValue) {
                        newOperator = option.op;
                        return false;
                    }
                });

                productCatalogViewModel.productsGrid.addFilter(viewModel, newValue, newOperator);

                setTimeout(function() {
                    $element.mettelFlyout('close', flyoutOptions);
                    filterSubscription.dispose();
                },
                250);
            });

            $flyout.find('input').first().focus();
        };

        flyoutOptions.cancel = function() {
            if (filterSubscription) {
                filterSubscription.dispose();
            }
        };

        flyoutOptions.flyout = $flyout;

        $element.mettelFlyout(flyoutOptions);
    }
};

ko.bindingHandlers.clearProductFilterSearch = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $clear = $(element),
            $input = $clear.prev('[data-mettel-class="products-grid-search-filter"]'),
            filter = viewModel;

        $clear.click(function() {
            filter.search('');
            $input.focus();
        });
    }
};

ko.bindingHandlers.thumbnailSizeController = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            minThumbnailWidth = 266,
            thumbnailsContainerWidth = $element.outerWidth(),
            columns = Math.floor(thumbnailsContainerWidth / minThumbnailWidth);

        viewModel.thumbnailWidthPercent = 100 / columns;
        viewModel.thumbnailHeightPx = (thumbnailsContainerWidth / columns) + 40; // 40px for pricing bar
    }
};

ko.bindingHandlers.triggerSubcategoryNameModal = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.next('[data-mettel-class="edit-subcategory-name-modal"]'),
            $textInput = $modal.find('#edit-subcategory-name'),
            modalOptions = {};

        modalOptions.close = function () {
            if (viewModel.nameEditUnsuccessful()) {
                viewModel.nameEditUnsuccessful(false);
            }
        };

        $element.click(function () {

            // Open the modal with focus on the input
            $modal.modalWindow(modalOptions);
            $textInput.focus();

            // To ensure the cursor is put at the end string for all browsers
            var strLength = $textInput.val().length * 2;
            $textInput[0].setSelectionRange(strLength, strLength);

            // Allow the successful post to close the modal
            viewModel.editSubcategoryNameCallback = function () {
                $modal.modalWindow('close');
            };
        });
    }
};

ko.bindingHandlers.productsGridLoaderHeight = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        if (!viewModel.initialized()) {
            var $element = $(element),
                $grid = $element.parent(),
                windowHeight = $(window).outerHeight(),
                headerHeight = $('[data-mettel-class="mettel-header"]').outerHeight(),
                footerHeight = $('[data-mettel-class="mettel-footer"]').outerHeight(),
                temporaryGridHeight = windowHeight - headerHeight - footerHeight;

            $grid.css('height', temporaryGridHeight + 'px');

            // once content as loaded, we can "un-set" the height
            viewModel.initialized.subscribe(function (value) {
                if (value === true) {
                    $grid.css('height', '');
                }
            });
        }
    }
};

ko.bindingHandlers.productsTilesThumbnailController = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $container = $(element),
            $loader = $container.children('[data-mettel-class="product-image-placeholder-container"]'),
            $templateIndicator = $container.children('[data-mettel-class="product-image-template-container"]'),
            $noImageIndicator = $container.children('[data-mettel-class="product-image-na-container"]'),
            $imgContainer = $container.children('[data-mettel-class="product-image-inner"]'),
            $img = $imgContainer.children('[data-mettel-class="product-image"]'),
            imgUrl = valueAccessor().imgUrl,
            isTemplate = valueAccessor().isTemplate,
            hiddenClass = 'mettel-state-hidden',
            visuallyHiddenClass = 'mettel-visually-hidden';

        if (isTemplate) {
            // hide loader, show template indicator
            $loader.addClass(hiddenClass);
            $templateIndicator.removeClass(hiddenClass);
            $img.remove(); // remove image element, since it has no src attribute
        } else if (imgUrl) {
            // remove display none so image can load, but keep visually hidden
            $imgContainer.removeClass(hiddenClass);
            $img
                .on('load', function() {
                    // hide loader, show image
                    $loader.addClass(hiddenClass);
                    $imgContainer.removeClass(visuallyHiddenClass);
                })
                .on('error', function() {
                    // bad url, so hide loader, re-hide thumbnail, and show no image indicator
                    $loader.addClass(hiddenClass);
                    $imgContainer.addClass(hiddenClass);
                    $noImageIndicator.removeClass(hiddenClass);
                })
                .attr('src', imgUrl);
        } else {
            // hide loader, show no image indicator
            $loader.addClass(hiddenClass);
            $noImageIndicator.removeClass(hiddenClass);
            $img.remove(); // remove image element, since it has no src attribute
        }
    }
};

ko.bindingHandlers.productsGridThumbnailController = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $container = $(element),
            $templateIndicator = $container.children('[data-mettel-class="image-column-template-indicator"]'),
            $noImageIndicator = $container.children('[data-mettel-class="image-column-no-image-indicator"]'),
            $thumbnailContainer = $container.children('[data-mettel-class="grid-cell-thumbnail-container"]'),
            $thumbnail = $thumbnailContainer.children('[data-mettel-class="grid-cell-thumbnail"]'),
            imgUrl = viewModel.row.data().ThumbnailURL,
            isTemplate = viewModel.row.data().isTemplate,
            hiddenClass = 'mettel-state-hidden';

        if (isTemplate) {
            // show template
            $templateIndicator.removeClass(hiddenClass);
            $thumbnail.remove(); // remove image element, since it has no src attribute
        } else if (imgUrl) {
            // show thumbnail
            $thumbnailContainer.removeClass(hiddenClass);
            $thumbnail.error(function() {
                // bad url, so hide re-hide thumbnail and show no image indicator
                $thumbnailContainer.addClass(hiddenClass);
                $noImageIndicator.removeClass(hiddenClass);
            }).attr('src', imgUrl);
        } else {
            // show no image indicator
            $noImageIndicator.removeClass(hiddenClass);
            $thumbnail.remove(); // remove image element, since it has no src attribute
        }
    }
};

ko.bindingHandlers.productCatalogErrorModal = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $modal = $(element),
            vmProductCatalog = viewModel,
        // On modal close, reset errors
            modalOptions = {
                close: function () {
                    vmProductCatalog.errorTitle(null);
                    vmProductCatalog.errorMessage(null);
                }
            };

        // Where error is set, this will trigger the modal opening
        if (vmProductCatalog.errorTitle()) {
            $modal.modalWindow(modalOptions);
        }
    }
};

ko.bindingHandlers.productImgTooltipController = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $img = $(element),
            imgUrl = valueAccessor();

        // Once the image is loaded, set up the tooltip
        $img.load(function () {
            $img.mettelTooltip({
                position: "top",
                hoverDelay: 0,
                tooltipHoverable: true
            });
        }).attr('src', imgUrl);

        $('#edit-product-image-input').on('focus', function() {
            $(this).parent().addClass('mettel-edit-product-image-container-focused');
        });

        $('#edit-product-image-input').on('blur', function() {
            $(this).parent().removeClass('mettel-edit-product-image-container-focused');
        });

        // keyboard interaction
        $img.keydown(function (e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                $(this).trigger('mouseenter');
                $('.mettel-delete-product-image').focus();
            }
        });

        $('.mettel-product-image-controls-tooltip:visible').find(':tabbable').on('blur', function( event ) {
            if ( event.relatedTarget === null || $( event.relatedTarget ).parents('.mettel-product-image-controls-tooltip').length === 0 ) {
                $('#product-image-file-upload').focus();
                $img.trigger('mouseleave');
            }
        });

    }
};

/**
 * Use this for navigation. It properly handles checking the dirty flag and showing the confirm
 * dialog.
 */
ko.bindingHandlers.navigateTo = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $('[data-mettel-class="product-unsaved-changes-modal"]'),
            $confirm = $modal.find('[data-mettel-class="modal-confirm-unsaved-changes-discard"]'),
            $cancel = $modal.find('[data-mettel-class="modal-confirm-unsaved-changes-cancel"]');

        // Create a unique URL by adding a random string so the back button detection works.
        var nav = ko.unwrap(valueAccessor()) + "&s=" + Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

        /**
         * Click handler
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function () {

            if (productCatalogViewModel.activeProduct() && productCatalogViewModel.activeProduct().productIsDirty && productCatalogViewModel.activeProduct().productIsDirty() === true) {
                $modal.modalWindow();
                $confirm.focus();
            } else {
                location.href = nav;
            }

            /**
             * Confirm click handler. Close the dialog and continue
             * with navigation.
             *
             * @param {Event} e
             * @return void
             */
            $confirm.click(function (event) {
                $modal.modalWindow('close');
                location.href = nav;
            });


            /**
             * Cancel click handler. Hide the dialog and stay where we are.
             *
             * @param {Event} e
             * @return void
             */
            $cancel.click(function () {
                $modal.modalWindow('close');
            });

            return false;
        });
    }
};

// TODO: move to appropriate location
/**
 * Initializes the preview pane and shows it.
 */
ko.bindingHandlers.previewProduct = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            vmProduct = viewModel,
            tooltipsInstantiated = false;

        /**
         * Click handler for the show preview button.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();

            // Allow the template to render.
            productCatalogViewModel.activeProduct().productPreviewInitialized(true);

            // Set up the available options.
            this.availableOptions = ko.observable({
                skus: ko.observable({}),
                customOptions: ko.observable({}),
                templateOptions: ko.observable({})
            });

            var $preview = $('[data-mettel-class="product-preview"]');

            // Show
            $preview.show();

            vmProduct.startWatchingChoicesAndInitiatePricing();

            // Only do this stuff the first time the "preview" button is clicked
            if (!tooltipsInstantiated) {
                // Find all the product tooltip triggers
                var $tooltipTriggers = $preview.find('[data-mettel-class="product-description-tooltip-trigger"]');

                // And setup each of their tooltips
                $tooltipTriggers.each(function (i, trigger) {
                    $(trigger).mettelTooltip({
                        position: "right",
                        hoverDelay: 100
                    });
                });

                // Flag so it doesn't happen again
                tooltipsInstantiated = true;
            }
        });
    }
};

/**
 * Shows the product pricing modal.
 */
ko.bindingHandlers.viewAllPricing = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.parent().find('[data-mettel-class="preview-get-pricing-modal"]'),
            $formInner = $modal.find('[data-mettel-class="preview-pricing-options-form-inner"]'),
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

        /**
         * Click handler for the view all pricing button.
         * Shows the modal.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();

            $modal.modalWindow(modalOptions);
        });
    }
};

/**
 * Adds product to cart, opens cart, and if the pricing modal is open, closes it.
 */
ko.bindingHandlers.addToCartAndOpen = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.closest('[data-mettel-class="preview-get-pricing-modal"]'),
            product = viewModel,
            options = valueAccessor();

        $element.click(function (e) {
            e.preventDefault();

            if (typeof customerOrderViewModel !== 'undefined' && productCatalogViewModel.activeProduct()) {

                var quantity = product.previewPricingOptionsSelectedQuantity(),
                    productSku = productCatalogViewModel.activeProduct().previewSelectedSku().sku,
                    orderModelData = product.previewPricingOptionsGrid.selectedRows()[0].data(),
                    subSkus = JSON.parse(product.formatForPricingGroups()).subSkus;

                if (options && options.usePrimaryPricing) {
                    orderModelData = product.previewPricingOptionsGrid.rows()[0].data();
                }

                customerOrderViewModel.addToCart(product, productSku, quantity, orderModelData, subSkus);

                // Open cart when adding item to cart
                productCatalogViewModel.viewCart(true);
                setTimeout(function() {
                    $('.mettel-shopping-cart-checkout-button').focus();
                }, 600);
            }

            if ($modal.length) {
                $modal.modalWindow('close');
            }
        });
    }
};

/**
 * Simple binding handler to show the specifications modal. All of the logic is in the template.
 */
ko.bindingHandlers.showSpecifications = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.parent().find('[data-mettel-class="product-preview-specification-modal"]'),
            $done = $modal.find('[data-mettel-class="product-preview-specifications-modal-done"]');


        /**
         * Click handler for the Specifications button.
         *
         * @param {Event} e
         * @return void
         */
        $element.click(function (e) {
            e.preventDefault();

            $modal.modalWindow();
        });


        /**
         * Click handler for the Done button.
         *
         * @param {Event} e
         * @return void
         */
        $done.click(function (e) {
            e.preventDefault();

            $modal.modalWindow('close');
        });
    }
};


/**
 * Moves loading indicator to page inner so it covers entire catalog and shows/hides it
 */
ko.bindingHandlers.productCatalogLoader = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $overlay = $(element),
            $body = $('body'),
            $page = $body.children('[data-mettel-class="page"]'),
            $pageInner = $page.children('[data-mettel-class="page-inner"]'),
            loadingFlag = valueAccessor(),
            activeClass = 'mettel-state-active',
            preventScrollClass = 'mettel-prevent-scroll',
            pageHeightClass = 'mettel-modal-open';

        // Only move it to the page if it hasn't already been done
        if ($overlay.parent()[0] !== $pageInner[0]) {
            $overlay.appendTo($pageInner);
        }

        if (loadingFlag) {
            $overlay.addClass(activeClass);
            $body.addClass(preventScrollClass);
            $page.addClass(pageHeightClass);
        } else {
            $overlay.removeClass(activeClass);
            $body.removeClass(preventScrollClass);
            $page.removeClass(pageHeightClass);
        }
    }
};

window.MetTel = window.MetTel || {};

MetTel.QueryParamsModel = function() {

    var self = this;

    this.queryParams = ko.observable();

    this.queryString = ko.computed(function() {
        var queryString = '';
        if (self.queryParams()) {
            ko.utils.arrayForEach(_.keys(self.queryParams()), function (key) {
                if (queryString) {
                    queryString += "&";
                }

                queryString += key + "=" + self.queryParams()[key];
            });
        }

        return queryString ? '?' + queryString : '';
    });

    this.cloneQueryParams = function() {
        return $.extend({}, self.queryParams() ? self.queryParams() : {});  //Cloning the params
    };

    this.addQueryParams = function(params) {
        var clonedParams = self.cloneQueryParams(),
            keys = _.keys(params);

        _.each(keys, function(key) {
            clonedParams[key] = params[key];
        });

        self.queryParams(clonedParams);
    };

    this.removeQueryParams = function(params) {
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

};
ko.bindingHandlers.radioButton = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();

        accessor.enable = allBindingsAccessor().enable || allBindingsAccessor().enable === false ? allBindingsAccessor().enable : true;
        accessor.afterRenderCallback = accessor.afterRenderCallback;
        accessor.checked = allBindingsAccessor().checked;
        accessor.checkedValue = allBindingsAccessor().checkedValue;
        accessor.htmlValue = $(element).attr('value');
        accessor.htmlId = $(element).attr('id');
        accessor.htmlName = $(element).attr('name');

        if (accessor.click === undefined) {
            accessor.click = $.noop();
        }

        ko.renderTemplate("radio-button-template", accessor, {
            afterRender: function (nodes) {
                if (accessor.afterRenderCallback) {
                    // get the rendered label element
                    var elements = nodes.filter(function(node) {
                        // Ignore any #text nodes before and after the modal element.
                        return node.nodeType === 1;
                    });

                    var $container = $(elements[0]);

                    accessor.afterRenderCallback($container);

                }

                // add focus state to labels
                var labels = _.each(nodes, function(node) {
                    if (node.className === 'mettel-radio-label') {
                        var $node = $(node),
                            input = $node.find('.mettel-radio-input'),
                            $input = $(input);

                        $input.on('focus', function() {
                            $node.addClass('mettel-radio-label-focused');
                        });

                        $input.on('blur', function() {
                            $node.removeClass('mettel-radio-label-focused');
                        });

                    }
                });

            }
        }, element, 'replaceNode');
    }
};

function ReportModel(report) {
    var self = this;

    self.id = report.id;
    self.title = ko.observable(report.title);
    self.updated = ko.observable(report.updated);
    self.price = ko.observable(report.price);
    self.subscribe = ko.observable(report.subscribe);
    self.favorite = ko.observable(report.favorite);
    self.subscribeToggled = ko.observable(false);
    self.favoriteToggled = ko.observable(false);
    self.running = ko.observable(false);

    self.toggleRunning = function () {
        if (self.running() === false) {
            self.running(true);
        }
    };

    self.toggleFavorite = function () {
        self.favorite(!(self.favorite()));
        self.favoriteToggled(true);
    };

    self.toggleSubscribe = function () {
        self.subscribe(!(self.subscribe()));
        self.subscribeToggled(true);
    };

    ko.bindingHandlers.setSubscribe = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());

            if (viewModel.subscribeToggled() === true) {
                var reportsModel = bindingContext.$root;
                viewModel.subscribeToggled(false);

                $.ajax({
                    url: '/api/reports/' + self.id + '/subscribe',
                    type: 'PUT',
                    contentType: "application/json",
                    data: {
                        subscribe: self.subscribe()
                    },
                    success: function (data) {
                        // do nothing
                    },
                    error: function (data) {
                        var response = data.responseJSON;

                        if (response.type === "error") {
                            self.subscribe(!(self.subscribe()));
                            reportsModel.error(response.message);
                        }
                    }
                });
            }
        }
    };

    ko.bindingHandlers.setFavorite = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());

            if (viewModel.favoriteToggled() === true) {
                var reportsModel = bindingContext.$root;
                viewModel.favoriteToggled(false);

                $.ajax({
                    url: '/api/reports/' + self.id + '/favorite',
                    type: 'PUT',
                    contentType: "application/json",
                    data: {
                        favorite: self.favorite()
                    },
                    success: function (data) {
                        // do nothing
                    },
                    error: function (data) {
                        var response = data.responseJSON;

                        if (response.type === "error") {
                            self.favorite(!(self.favorite()));
                            reportsModel.error(response.message);
                        }
                    }
                });
            }

        }
    };

    ko.bindingHandlers.runReport = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());

            if (value) {
                var reportsModel = bindingContext.$root;

                $.ajax({
                    url: '/api/reports/' + viewModel.id + '/run',
                    contentType: "application/json",
                    data: {

                    },
                    success: function (data) {
                        viewModel.updated(data.updated);
                        viewModel.running(false);
                    },
                    error: function (data) {
                        var response = data.responseJSON;

                        if (response.type === "error") {
                            viewModel.running(false);
                            reportsModel.error(response.message);
                        }
                    }
                });

            }
        }
    };

    ko.bindingHandlers.viewHistory = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var $element = $(element);

            $element.click(function () {
                var $modal = $('.mettel-modal-dialog.modal-view-history');
                var $gridContainer = $modal.find('[data-mettel-class="report-history-grid"]');

                // GridModel config
                var strURL = '/api/reports/' + viewModel.id + '/history';
                var strDataBind = "grid: { gridName: 'ReportHistory', endPoints: { getGridData: '" + strURL + "'}, multiselect: false, frozenHeader: true, queryParams: { clientId: '83784' } }";
                $gridContainer.attr('data-bind', strDataBind);

                // GridModel creation and binding
                var reportHistoryGridModel = new GridModel();
                ko.applyBindings(reportHistoryGridModel, $gridContainer[0]);

                // modal header text updaate
                var $modalHeader = $modal.find('.mettel-modal-header-text');
                $modalHeader.html('View History for ' + viewModel.title());

                // opening modal
                $modal.modalWindow({
                    close: function () {
                        // ko + dom cleanup
                        $modalHeader.empty();
                        ko.cleanNode($gridContainer[0]);
                        $gridContainer.attr('class', '');
                        $gridContainer.attr('data-bind', '');
                        $gridContainer.empty();
                    }
                });
            });
        }
    };

    ko.bindingHandlers.uniformChecked = {
        init: function (element, valueAccessor) {
            $(element).uniform({
                wrapperClass: 'mettel-checkbox',
                focusClass: 'mettel-checkbox-label-focused'
            });
        }
    };
}

function ReportsModel(options) {
    options = options ? options : {};
    var self = this;

    self.endPoints = options.endPoints;
    self.favorites = ko.observableArray();
    self.available = ko.observableArray();
    self.filters = ko.observableArray();
    self.availableFilter = ko.observable();
    self.availableFilterToggled = false;
    self.error = ko.observable('');

    // getting json data for the first time
    self.init = function () {
        $.ajax({
            url: self.endPoints.getReportData,
            contentType: "application/json",
            dataType: "json",
            data: {

            },
            success: function (data) {

                _.each(data.filters, function (filter) {
                    self.filters.push(filter);
                });

                _.each(data.reports, function (report) {
                    var objReport = new ReportModel(report);

                    if (report.favorite) {
                        self.favorites.push(objReport);
                    }
                    else {
                        self.available.push(objReport);
                    }
                });

            },
            complete: function () {
                self.availableFilterToggled = true;
            }
        });
    };

    ko.bindingHandlers.getFilteredReportData = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var $element = $(element);

            if (viewModel.availableFilterToggled === true) {
                $.ajax({
                    url: self.endPoints.getReportData + '?filter=' + value,
                    contentType: "application/json",
                    dataType: "json",
                    data: {

                    },
                    success: function (data) {
                        // clear out old available reports
                        self.available([]);

                        _.each(data.reports, function (report) {
                            var objReport = new ReportModel(report);

                            if (report.favorite === false) {
                                self.available.push(objReport);
                            }
                        });
                    },
                    error: function (data) {
                        var response = data.responseJSON;

                        if (response.type === "error") {
                            viewModel.error(response.message);
                        }
                    }
                });

            }
        }
    };

    ko.bindingHandlers.handleError = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var value = ko.utils.unwrapObservable(valueAccessor());

            if (value) {
                var $element = $(element);

                $element.modalWindow({
                    close: function () {
                        // unset the errror
                        viewModel.error('');
                    }
                });
            }

        }
    };
}

ko.bindingHandlers.reportsModel = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'reports-menu', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };


    }
};

ko.bindingHandlers.selectedTicketExpanded = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.ticket.endPoints = options.endPoints;
            viewModel.ticket.queryParams = options.queryParams;
            viewModel.ticket.enableAttachments(options.enableAttachments);
            viewModel.ticket.actionCallback = options.actionCallback;
            viewModel.ticket.menuActionCallback = options.menuActionCallback;
            viewModel.ticket.lineLinkCallback = options.lineLinkCallback;
            viewModel.ticket.closeTicketCallback = options.closeTicketCallback;
            viewModel.ticket.viewRequest = options.viewRequest;
            viewModel.locationBar.endPoints = options.locationBar.endPoints;
            viewModel.locationBar.openTicketsBlock = options.locationBar.openTicketsBlock;
            viewModel.locationBar.editLocationLabel = options.locationBar.editLocationLabel;
            viewModel.locationBar.locationActions = options.locationBar.locationActions;
            viewModel.ticket.currentUser(options.currentUser);

            if (options.hideNewNoteForm) {
                viewModel.ticket.hideNewNoteForm(options.hideNewNoteForm);
            }

            viewModel.ticket.approveTicketCallback = options.approveTicketCallback;
            viewModel.ticket.modifyTicketCallback = options.modifyTicketCallback;
            viewModel.ticket.rejectTicketCallback = options.rejectTicketCallback;
            viewModel.ticket.reminderTicketCallback = options.reminderTicketCallback;
            viewModel.ticket.newNoteCharacterLimit = options.newNoteCharacterLimit ? options.newNoteCharacterLimit : false;
        }

        viewModel.ticket.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'selected-ticket-expanded',
                data: viewModel,
                afterRender: function() {
                    var initializedSubscription = viewModel.ticket.initialized.subscribe(function(newValue) {
                        if (newValue) {
                            $('.mettel-selected-ticket-favorite').focus(function() {
                                $(this).parent().addClass('mettel-selected-ticket-favorite-focused');
                            });

                            $('.mettel-selected-ticket-favorite').blur(function() {
                                $(this).parent().removeClass('mettel-selected-ticket-favorite-focused');
                            });

                            initializedSubscription.dispose();
                        }
                    });
                }
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

function SteppedWorkflowStep(options) {
    var self = this;

    self.label = options.label;
    self.id = options.id;
    self.completed = ko.observable(options.completed);
    self.hideIndicator = options.hideIndicator;
}

function SteppedWorkflowModel(options) {
    options = options ? options : {};
    var self = this;

    self.title = ko.observable(options.title);
    self.steps = ko.observableArray(options.steps);
    self.visibleIndicators = ko.computed(function () {
        return _.filter(self.steps(), function (step) {
            return !step.hideIndicator;
        });
    });
    self.activeStep = ko.observable(options.active);

    self.activeWorkflowStep = ko.computed(function() {
        return _.find(self.steps(), function(step) {
            return step.id === self.activeStep();
        });
    });

    self.activeWorkflowStepIndex = ko.computed(function() {
        return _.indexOf(self.steps(), self.activeWorkflowStep());
    });

    self.previousStep = function() {
        // if we're not already at the first step, update the active step
        if (self.activeWorkflowStepIndex() !== 0) {
            self.activeWorkflowStep().completed(false);
            self.activeStep(self.steps()[self.activeWorkflowStepIndex() - 1].id);
        }
    };

    self.nextStep = function() {
        // if we're not already at the last step, update the active step
        if ((self.activeWorkflowStepIndex() + 1) < self.steps().length) {
            self.activeWorkflowStep().completed(true);
            self.activeStep(self.steps()[self.activeWorkflowStepIndex() + 1].id);
        }
    };

    /**
     * Takes a 0-based index and updates the stepped workflow to make the step at that index the current step
     *
     * @param {int} index
     */
    self.goToStep = function(index) {
        // make sure we have a valid index
        if (index < self.steps().length && index >= 0) {

            // iterate over all steps, setting 'complete'
            _.each(self.steps(), function(objStep, numIndex) {
                if (numIndex < index) {
                    objStep.completed(true);
                }
                else {
                    objStep.completed(false);
                }
            });

            // update the current step to the one we want
            self.activeStep(self.steps()[index].id);
        }
    };

    /**
     * Takes a string id updates the stepped workflow to make the step with that id the current step
     *
     * @param {string} id
     */
    self.goToStepById = function(id) {
        // make sure we have a valid id
        if (typeof id !== 'undefined') {

            var arrIds = _.pluck(self.steps(), 'id'),
                index = _.indexOf(arrIds, id);

            if (index !== -1) {
                // iterate over all steps, setting 'complete'
                _.each(self.steps(), function(objStep, numIndex) {
                    if (numIndex < index) {
                        objStep.completed(true);
                    }
                    else {
                        objStep.completed(false);
                    }
                });

                // update the current step to the one we want
                self.activeStep(self.steps()[index].id);
            }

        }
    };

    self.populateData = function(data) {
        self.title(data.title);
        self.activeStep(data.active);
        var newSteps = [];
        _.each(data.steps, function(step) {
            var vmStep = new SteppedWorkflowStep({
                label: step.label,
                id: step.id,
                completed: step.completed,
                hideIndicator: step.hideIndicator
            });
            newSteps.push(vmStep);
        });
        self.steps(newSteps);
    };

    // getting json data for the first time
    self.init = function() {
        if (typeof self.endPoints.getSteppedWorkflowData === "string") {
            $.getJSON(self.endPoints.getSteppedWorkflowData, function (data) {
                self.populateData(data);
            });
        }
        else if (typeof self.endPoints.getSteppedWorkflowData === "object") {
            self.populateData(self.endPoints.getSteppedWorkflowData);
        }

    };
}

ko.bindingHandlers.steppedWorkflow = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'stepped-workflow', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

/* global productCatalogViewModel:true, CustomerCatalogModel, customerOrderViewModel:true, CustomerOrderModel, SiteJS, section, showAllFormErrors */

function TicketModel() {
    var self = this;
    // Initial observables
    this.initialized = ko.observable(false);
    this.id = ko.observable();
    this.favorited = ko.observable();
    this.enableAlertNote = ko.observable(false);
    this.subscribedToEmails = ko.observable();
    this.shortDescription = ko.observable();
    this.status = ko.observable('');
    this.createdTimestamp = ko.observable();
    this.createdUser = ko.observable();
    this.updatedTimestamp = ko.observable();
    this.updatedUser = ko.observable();
    this.issues = ko.observableArray();
    this.timelineHeaderDays = ko.observableArray();
    this.notesFilter = ko.observable(false);
    this.notesFilters = ko.observableArray();
    this.newNoteLineSelectors = ko.observableArray();
    this.newNoteSubscribers = ko.observableArray();
    this.potentialNoteSubscribers = ko.observableArray();
    this.lineSelect = ko.observable(false);
    this.subscriberSelect = ko.observable(false);
    this.noteDays = ko.observableArray();
    this.newNotes = ko.observable(false);
    this.creationNoteDay = ko.observable();
    this.currentDateTime = ko.observable();
    this.disableClose = ko.observable(false);
    this.contentLoading = ko.observable(true); // for ticket timeline loader
    this.gettingTicketData = ko.observable(false); // for page loader
    this.numberNewNotes = ko.observable();
    this.urgentDisabled = ko.observable(false);
    this.urgentPrivate = ko.observable(false);
    this.privateDisabled = ko.observable(false);
    this.catalogInitiated = ko.observable(false);
    this.differentDataModelUrl = ko.observable();
    this.differentDataModelLoaded = ko.observable();
    this.subscribers = ko.observable();
    this.legacyTicket = ko.observable(false); // this indicates a "Max" ticket
    this.hideNewNoteForm = ko.observable(false);

    this.resultNotes = {
        "FormID": ko.observable(),
        "UserData": ko.observable(),
        "Errors": ko.observableArray([]),
        "Sections": ko.observableArray([]),
        "initialized": ko.observable(false),
        "showBtnGroup": ko.observable(false),
        "btnGroupDetails": ko.observableArray()
    };
    this.resultNotesErrors = [];

    this.needsApproval = ko.observable();
    this.enableApproval = ko.observable();

    this.allNewNoteLinesEnabled = ko.observable(true);
    this.userMentionsInitialized = ko.observable(false);

    ko.postbox.subscribe("tokenAutoComplete.renderComplete", function (newValue) {
        if (newValue) {
            setTimeout(function () {
                    self.userMentionsInitialized(true);
                },
                1);
        }
    }, this);

    this.totalNotes = ko.computed(function () {
        var count = 0;
        for (var i = 0; i < self.noteDays().length; i++) {
            //The first item/creation note may have two notes
            count = count + self.noteDays()[i].notes().length;
        }
        return count;
    });
    this.currentUserObject = ko.observable();

    // Show the ticket overview once the rest of the content is done loading
    this.showOverview = ko.observable(false);
    this.contentLoading.subscribe(function (newValue) {
        if (!newValue) {
            self.showOverview(true);
        }
    });

    this.totalAttachments = ko.observable(0);

    /*
     Count total number of notes so we can say "showing x of y notes" when filtering by attachment
     */

    self.noteDays.subscribe(function () {

        var count = 0;

        for (var i = 0; i < self.noteDays().length; i++) {
            //The first item/creation note may have two notes
            if (i === 0) {
                if (self.noteDays()[0].notes()[0] && self.noteDays()[0].notes()[0].attachments) {
                    count = count + self.noteDays()[0].notes()[0].attachments.length;
                }
                if (self.noteDays()[0].notes()[1] && self.noteDays()[0].notes()[1].attachments) {
                    count = count + self.noteDays()[0].notes()[1].attachments.length;
                }
            } else {
                if (self.noteDays()[i].notes()[0] && self.noteDays()[i].notes()[0].attachments) {
                    count = count + self.noteDays()[i].notes()[0].attachments.length;
                }
            }
        }

        self.totalAttachments(count);

    }, this);


    this.showAttachmentsOnly = ko.observable(false);
    this.showAttachmentsFraction = ko.observable(false);
    this.attachments = ko.observableArray();
    this.currentUser = ko.observable();
    this.enableAttachments = ko.observable(true);
    this.updatedNote = ko.observable(function () {
        return {};
    });

    this.fetchIssueNotes = function(clientId, resultTypeId, detailId) {
        var strParams = '?clientId=' + clientId + '&resultTypeId=' + resultTypeId + '&detailId=' + detailId;

        self.resultNotes.initialized(false);
        self.resultNotesErrors = [];

        $.getJSON(self.endPoints.getResultTypeForm + strParams, function (data) {
            self.resultNotes.Sections([]);
            self.resultNotes.showBtnGroup(false);
            self.resultNotes.btnGroupDetails([]);

            // pushing into the ViewModel
            _.each(data.Sections, function (sectionModel) {
                /*jshint -W055 */
                var newSection = new section(sectionModel);
                self.resultNotes.Sections.push(newSection);

                // capture errors, but do not validate custom fields
                _.each(newSection.Fields(), function (field) {
                    if (MetTel.Utils.stricmp(field.InputType(), "Custom") === false) {
                        self.resultNotesErrors.push(field);
                    }
                });

                // group actions, logic partly taken from Sam's previous implementation
                if (data.UserData !== null) {
                    self.resultNotes.showBtnGroup(true);
                    _.each(data.UserData, function (detail) {
                        var objDetail = {
                            DetailId: detail.DetailId,
                            DetailValue: MetTel.Utils.formatToPhoneNumber(detail.DetailValue),
                            IsBTN: detail.IsBTN,
                            Checked: ko.observable(true),
                            Enabled: detail.DetailId !== detailId
                        };

                        objDetail.Checked.subscribe(function (value) {
                            if (objDetail.IsBTN && !value) {
                                _.each(self.resultNotes.btnGroupDetails(), function (item) {
                                    if (item.DetailId !== detailId && !item.IsBTN) {
                                        item.Checked(false);
                                    }
                                });
                            }
                            else if (!objDetail.IsBTN && value) {
                                _.each(self.resultNotes.btnGroupDetails(), function (item) {
                                    if (item.IsBTN) {
                                        item.Checked(true);
                                    }
                                });
                            }
                        });
                        self.resultNotes.btnGroupDetails.push(objDetail);
                    });
                }
            });

            // validation
            var resultErrors = ko.validation.group(self.resultNotesErrors);
            resultErrors.showAllMessages();

            // show the notes
            self.resultNotes.initialized(true);
        });
    };

    this.cancelNoteUpdate = function (note) {
        note.newSubNote('');
        note.showUpdateForm(false);
        self.closeAllNoteMenus();
    };

    this.updateNoteClick = function (note) {

        self.closeAllNoteMenus();
        note.showUpdateForm(true);

        self.updatedNote = ko.computed(function () {
            return {
                "refNoteId": note.noteId,
                "notes": note.newSubNote()
            };
        });
    };

    this.updateNoteDismissUrgencyClick = function (note) {

        self.closeAllNoteMenus();
        note.showUpdateForm(true);

        self.updatedNote = ko.computed(function () {
            return {
                "refNoteId": note.noteId,
                "dismiss": true,
                "notes": note.newSubNote()
            };
        });

    };

    this.dismissUrgencyClick = function (note) {

        self.closeAllNoteMenus();
        note.showUpdateForm(false);

        self.updatedNote = ko.computed(function () {
            return {
                "refNoteId": note.noteId,
                "dismiss": true
            };
        });

        self.updateNote(note);
    };

    this.closeAllNoteMenus = function () {
        $.each(self.noteDays(), function (i, noteDay) {
            $.each(noteDay.notes(), function (x, note) {
                note.urgencyMenu(false);
            });
        });
        self.creationNoteDay().notes()[0].urgencyMenu(false);
    };

    this.filteredLines = ko.computed(function () {
        var count = 0;
        for (var i = 0; i < self.notesFilters().length; i++) {
            if (self.notesFilters()[i].active() === true) {
                count++;
            }
        }
        return count;
    });

    this.attachmentsDisplayed = ko.computed(function () {
        var count = 0;
        for (var i = 0; i < self.noteDays().length; i++) {
            if ((self.noteDays()[i].active() === true) && (self.noteDays()[i].notes())) {
                for (var x = 0; x < self.noteDays()[i].notes().length; x++) {
                    if (self.noteDays()[i].notes()[x].hasAttachment === true) {
                        if (self.noteDays()[i].notes()[x].active() === true) {
                            count = count + self.noteDays()[i].notes()[x].attachments.length;
                        }
                    }
                }
            }
        }
        if (count < self.totalAttachments()) {
            self.showAttachmentsFraction(true);
        } else {
            self.showAttachmentsFraction(false);
        }
        return count + "/" + self.totalAttachments();
    }, this);

    this.resolvedIssues = [];
    this.uniqueLineIds = [];
    this.builtLineIds = [];
    this.notesFiltersAry = [];
    this.newNoteLineSelectorsAry = [];
    this.data = false;

    // Flag to indicate if any tickets are unresolved
    this.openIssuesFlag = ko.observable(true);

    // Disable ticket button if there are any unresolved issues or if the ticket is already closed
    this.ticketClosable = ko.computed(function () {
        return self.status() && self.status().toLowerCase() !== 'closed' && self.openIssuesFlag() === false && !self.disableClose();
    });
    this.viewRequestModel = {
        disable: ko.observable(),
        callback: null
    };

    this.init = function () {
        self.getTicket();
    };

    this.getCurrentUser = function () {
        $.ajax({
            url: self.endPoints.getCurrentUser + '?clientId=' + self.queryParams.clientId,
            type: "POST",
            data: {},
            contentType: "application/json",
            success: function (data) {
                self.currentUserObject(data);
            },
            complete: function () {
            }
        });
    };

    this.currentUserFullName = ko.pureComputed(function () {
        if (self.currentUserObject() == null) {
            return "";
        }
        return self.currentUserObject().FirstName + " " + self.currentUserObject().LastName;
    }, this);

    this.getTicket = function (showLoader) {
        self.checkViewRequest();
        self.getTicketObj(showLoader);
    };

    this.createSLAEvents = function(issues) {
        $.each(issues, function(i, issue) {

            if (issue.slaDueDate) {
                var slaDueDate = issue.slaDueDate,
                    slaEvent = {
                        timestamp: slaDueDate,
                        slaDue: true,
                        tooltipMetadata: issue.slaTooltipMetaData
                    };

                // find where to put the SLA event
                // iterate backwards over the days since it will likely be closer to the end
                var dayIndex;
                for (var j = issue.days.length - 1; j >= 0; j--) {
                    var day = issue.days[j];

                    if (!moment(day.date).isAfter(slaDueDate)) {
                        // we've either found the matching date or surpassed the date

                        if (moment(slaDueDate).isSame(day.date, 'day') && day.events) {

                            // we've found the matching date, so need to find the correct spot in the events
                            var eventIndex = 0; // default to 0, necessary because following loop will not catch index if only one event
                            for (var k = day.events.length - 1; k >= 0; k--) {
                                var event = day.events[k];

                                if (!moment(event.timestamp).isAfter(slaDueDate)) {
                                    // we've found the position in the events, so store the position
                                    eventIndex = k + 1;
                                    break;
                                }
                            }

                            // now put the SLA event in the correct position
                            if (typeof eventIndex === 'number') {
                                day.events.splice(eventIndex, 0, slaEvent);
                            }

                        } else {

                            // we've passed the date, so there is no matching date
                            // so store the appropriate position in the days
                            dayIndex = j + 1;
                        }

                        // so we can stop searching
                        break;
                    }
                }

                // if a matching date was not found, we stored the position of the new day
                // so create the new day and add it to the existing days
                if (typeof dayIndex === 'number') {
                    var newDay = {
                        date: moment(slaDueDate).format('MM/DD/YYYY'),
                        events: [
                            slaEvent
                        ]
                    };

                    issue.days.splice(dayIndex, 0, newDay);
                }
            }
        });
    };

    this.buildTimelineDatesMap = function(issues) {
        var unsortedMap = {},
            foundDatesAfterToday = false;

        $.each(issues, function(i, issue) {
            $.each(issue.days, function(j, day) {
                var iterationMoment = moment(day.date),
                    sortableDate = iterationMoment.format('YYYY-MM-DD');

                // create the date property if it doesn't exist
                // if it does, store the highest amount of events
                if (day.events && (!unsortedMap[sortableDate] || day.events.length > unsortedMap[sortableDate])) {
                    unsortedMap[sortableDate] = day.events.length;
                }

                // to help determine if we need to add tomorrow
                if (!foundDatesAfterToday) {
                    if (iterationMoment.isAfter(self.todayDate)) {
                        foundDatesAfterToday = true;
                    }
                }
            });
        });

        // add tomorrow object if there are future dates and tomorrow hasn't already been added
        if (foundDatesAfterToday && !unsortedMap[self.tomorrowDate]) {
            unsortedMap[self.tomorrowDate] = 0;
        }

        // sort them by date
        var sortedMap = {};
        Object.keys(unsortedMap).sort().forEach(function(key) {
            sortedMap[key] = unsortedMap[key];
        });

        return sortedMap;
    };

    this.buildTimelineHeaderArray = function(datesMap) {
        var headerArray = [],
            historyEndMarked = false;

        $.each(datesMap, function(date, amount) {
            var newDateObj = {
                    date: date
                };

            // today properties
            if (date === self.todayDate) {
                newDateObj.today = true;
                newDateObj.todayBegin = true;
                newDateObj.historyEnd = true;
                historyEndMarked = true;
            }

            // historyEnd if today didn't exist
            if (date === self.tomorrowDate && !historyEndMarked) {
                var prevColumnObj = headerArray[headerArray.length - 1];

                prevColumnObj.historyEnd = true;
                historyEndMarked = true;
            }

            if (amount === 0) {
                // tomorrow object with no events
                newDateObj.hideDate = true;
                headerArray.push(newDateObj);

            } else if (amount === 1) {
                // if just one event per day, just push one object
                headerArray.push(newDateObj);

            } else {
                // create duplicate objects for days with multiple events
                for (var i = 0; i < amount; i++) {
                    var dupDateObj = $.extend({}, newDateObj);

                    dupDateObj.dupIndex = i;
                    dupDateObj.dupAmount = amount;

                    // mark date to be hidden if it's not the first of the duplicates
                    if (i > 0) {
                        dupDateObj.hideDate = true;
                        delete dupDateObj.todayBegin;
                    }

                    // if it's not the last of the duplicates
                    if (i < amount - 1) {
                        delete dupDateObj.historyEnd;
                    }

                    headerArray.push(dupDateObj);
                }
            }
        });

        return headerArray;
    };

    this.buildIssues = function(issues, headerDays) {

        /**
         * Recursive function to look backwards through the issue starting
         * at the end to find where to mark the end the resolved step
         * @param {object} columnObj - an object representing a cell in the timeline table
         */
        var endResolvedStep = function(columnObj) {

            if (columnObj.date > self.todayDate) {
                // if it's in the future, keep checking
                if (columnObj.prevColumnObj) {
                    endResolvedStep(columnObj.prevColumnObj);
                }

            } else if (columnObj.stepType === 'resolved') {
                // it's today or in the past
                // and it's resolved

                if (!columnObj.showStepIndicator && !columnObj.note) {
                    // we haven't reached the resolved event or a note yet
                    // so don't show the resolved step here

                    columnObj.stepType = 'none';
                    columnObj.subStepType = 'none';

                    // and keep checking
                    if (columnObj.prevColumnObj) {
                        endResolvedStep(columnObj.prevColumnObj);
                    }

                } else {
                    // we've found the resolved event or the last note after the resolved event
                    // so mark it as the end of the step and stop checking
                    columnObj.changeEnd = true;
                }
            }
        };

        $.each(issues, function(i, issue) {
            var newDays = [],
                daysData = {},
                issueFoundToBeResolved,
                foundOpenTimestamp;

            // map the days for this issue
            $.each(issue.days, function(j, day) {
                var sortableDate = moment(day.date).format('YYYY-MM-DD');
                daysData[sortableDate] = day;
            });

            // populate the new array of days for this issue to match the header days
            $.each(headerDays, function(j, day) {
                var sortableDate = moment(day.date).format('YYYY-MM-DD'),
                    newDateObj = $.extend({}, day),
                    matchingDate = daysData[sortableDate], // if this issue's days data has a day that matches the header day
                    eventsOnThisDay = matchingDate ? matchingDate.events : false, // if the matching date has events
                    matchingEvent,
                    dupIndex = day.dupIndex, // if the corresponding header day is a duplicate date
                    dupAmount = day.dupAmount, // if the corresponding header day is a duplicate date
                    prevColumnObj = newDateObj.prevColumnObj = j > 0 ? newDays[j - 1] : false; // find the previous object in the array

                if (eventsOnThisDay) {

                    // find matching event
                    var eventIndex = dupIndex || 0; // if duplicate, use that index, if not use the first
                    matchingEvent = eventsOnThisDay[eventIndex];

                    if (matchingEvent) {

                        if (matchingEvent.stepType && matchingEvent.subStepType) {
                            newDateObj.stepType = matchingEvent.stepType;
                            newDateObj.subStepType = matchingEvent.subStepType;
                            newDateObj.showStepIndicator = true;

                            if (!foundOpenTimestamp) {
                                if (newDateObj.stepType = 'open') {
                                    issue.openTimestamp = matchingEvent.timestamp;
                                    foundOpenTimestamp = true;
                                }
                            }

                            if (!issueFoundToBeResolved && matchingEvent.stepType === 'resolved') {
                                self.resolvedIssues.push(issue.issueId);
                                issueFoundToBeResolved = true;
                            }

                            if (newDateObj.stepType !== prevColumnObj.stepType) {
                                newDateObj.changeBegin = true;
                                prevColumnObj.changeEnd = true;
                            }
                        }

                        // if (matchingEvent.timestamp) {
                            newDateObj.timestamp = matchingEvent.timestamp;
                        // }

                        if (matchingEvent.tooltipMetadata) {
                            newDateObj.tooltipMetadata = matchingEvent.tooltipMetadata;
                        }

                        if (matchingEvent.note) {
                            newDateObj.note = true;
                        }

                        if (matchingEvent.alert) {
                            newDateObj.alert = true;
                        }

                        if (matchingEvent.slaDue) {
                            newDateObj.slaDue = true;

                            // if this date is the SLA due date and it's in the future, mark as changeEnd
                            if (moment(matchingDate.date).isAfter(self.todayDate)) {
                                newDateObj.changeEnd = true;
                            }
                        }

                        newDateObj.tooltip = true;
                    }
                }

                // marking appropriate step and sub step types for those without it already
                if (!newDateObj.stepType && !newDateObj.subStepType) {
                    // the object doesn't have the step info

                    if (prevColumnObj) {
                        // it's not the first column

                        if (sortableDate === self.tomorrowDate && issue.slaDueDate && !moment(issue.slaDueDate).isBefore(sortableDate)) {
                            // if it's tomorrow and the SLA is in the future, it's the SLA bar
                            newDateObj.stepType = 'sla';
                            newDateObj.subStepType = 'none';

                        } else if (moment(sortableDate).isAfter(self.todayDate) && (!issue.slaDueDate || moment(sortableDate).isAfter(issue.slaDueDate))) {
                            // if it's after today
                            // and SLA due date doesn't exist or is in the past
                            newDateObj.stepType = 'none';
                            newDateObj.subStepType = 'none';

                        } else {
                            // match it to the previous object's info
                            newDateObj.stepType = prevColumnObj.stepType;
                            newDateObj.subStepType = prevColumnObj.subStepType;
                        }

                    } else {
                        // it's the first, default to 'none'
                        newDateObj.stepType = 'none';
                        newDateObj.subStepType = 'none';
                    }
                }

                // add link and repeat properties
                if (typeof dupIndex === 'number') {

                    if (dupIndex > 0) {
                        newDateObj.repeatPrevious = true;

                        if (matchingEvent) {
                            prevColumnObj.linkToNext = true;
                        }
                    }

                    if (dupIndex < dupAmount - 1) {
                        newDateObj.repeatNext = true;
                    }
                }

                // at the last day, check back to see where to end the resolved step
                if (j === headerDays.length - 1) {
                    endResolvedStep(newDateObj);
                }

                newDays.push(newDateObj);
            });

            issue.days = newDays;
        });
    };

    this.receiveTicket = function (data) {
        self.data = data;
        self.id(data.id);
        self.favorited(data.favorited);
        if (typeof data.enableAlertNote !== 'undefined') {
            self.enableAlertNote(data.enableAlertNote);
        }
        self.subscribedToEmails(data.subscribedToEmails);
        self.shortDescription(data.shortDescription);
        self.status(data.status);
        self.createdTimestamp(data.created ? data.created.timestamp : null);
        self.createdUser(data.created ? data.created.user : null);
        self.updatedUser(data.updated ? data.updated.user : null);

        self.subscribers(data.subscribers ? data.subscribers : []);

        self.viewRequestModel.disable(!data.enableViewRequest);
        self.disableClose(data.disableClose);
        self.needsApproval(typeof data.needsApproval !== 'undefined' ? data.needsApproval : false);
        self.enableApproval(typeof data.enableApproval !== 'undefined' ? data.enableApproval : false);

        self.hideNewNoteForm(typeof data.hideNewNoteForm !== 'undefined' ? data.hideNewNoteForm : false);

        //get potential note subscribers now that we have ticket id
        self.getSubscribers();

        // Issue and line specific object creation
        var issues = data.issues;

        // Set current date
        self.todayDate = moment().format('YYYY-MM-DD');
        self.tomorrowDate = moment(this.todayDate).add(1, 'days').format('YYYY-MM-DD');

        // The following logic takes the raw timeline data, shapes it for the UI,
        // sets up the actions, and also calls buildLine to setup line filters/selectors
        self.createSLAEvents(issues);
        self.datesMap = self.buildTimelineDatesMap(issues);
        self.timelineHeaderDaysAry = self.buildTimelineHeaderArray(self.datesMap);
        self.buildIssues(issues, self.timelineHeaderDaysAry);
        self.checkIssues(issues);

        // Set the open issues flag
        if (self.resolvedIssues.length === issues.length) {
            self.openIssuesFlag(false);
        }

        self.issues(issues);
        self.timelineHeaderDays(self.timelineHeaderDaysAry);

        if (self.notesFilters().length === 0) {
            //initial load
            self.loadTicket(data);
        } else if ((self.notesFilters().length > 0) && (self.updatedTimestamp() !== data.updated.timestamp)) {
            //subsequent loads
            // if (MetTel.Utils.stricmp(self.currentUser(), data.updated.user) === true) {
            //do not show new notes button if note is user's note
            // self.loadTicket(data);
            // } else {

            var localCount = 1, // start at 1 for the creation note that had already been pulled out
                newCount = 0;

            $.each(self.noteDays(), function (i, noteDay) {
                localCount += noteDay.notes().length;
            });

            $.each(data.noteDays, function (i, noteDay) {
                newCount += noteDay.notes.length;
            });

            // if (newCount > localCount) {
            // Updates to notes
            self.newNotes(true);
            // }
            // }
        }
    };

    this.loadTicket = function (data) {
        self.newNotes(false);
        self.updatedTimestamp(data.updated.timestamp);
        self.notesFilters(self.notesFiltersAry);
        self.newNoteLineSelectors(self.newNoteLineSelectorsAry);
        self.setupNotes(data);
    };

    /*
     Executed in order to determine whether or not we are showing a note based upon
     "show attachments only" filter toggle state.
     */

    this.attachmentsFilterState = function (hasAttachment, noteDay) {

        var activeNotes = false;
        if (typeof noteDay === 'object') {
            //when the second argument is passed, we want to see if *any* of the notes
            //have attachments. And we want to make sure that particular note is active/chosen
            //as a particular line before showing
            for (var i = 0; i < noteDay.notes().length; i++) {
                if (noteDay.notes()[i].attachments) {
                    if (noteDay.notes()[i].active() === true) {
                        activeNotes = true;
                    }
                } else if (!noteDay.notes()[i].attachments) {
                    if ((noteDay.notes()[i].active() === true) && (self.showAttachmentsOnly() === false)) {
                        activeNotes = true;
                    }
                }
            }
            //If there are no active notes, meaning a line is de-selected
            //we don't want to show, regardless of whether or not there is an attachment
            if (activeNotes === false) {
                return false;
            }
        }

        //Based upon 'attachments only' setting and whether or not there is an attachment
        //show a note

        if ((self.showAttachmentsOnly() === true) && (hasAttachment === true)) {
            return true;
        } else if ((self.showAttachmentsOnly() === true) && (hasAttachment === false)) {
            return false;
        } else if (self.showAttachmentsOnly() === false) {
            return true;
        } else {
            return true;
        }

    };

    this.initialSubscribes = function () {

        /**
         * Sends the current state to the api
         */
        self.favorited.subscribe(function () {
            $.post(self.endPoints.favoriteAPI, {
                id: self.id(),
                favorited: self.favorited()
            }, function () {
                console.log("Favorite state", self.favorited());
            }, 'text');
        });
    };

    /**
     * Get list of potential subscribers for urgent notes
     */

    this.getSubscribers = function () {

        if (typeof self.endPoints !== 'undefined') {
            if (typeof self.endPoints.getNoteSubscribers !== 'undefined') {
                $.getJSON(self.endPoints.getNoteSubscribers, function (data) {
                    data.forEach(function (item) {
                        item.active = ko.observable(true);
                        if (!item.name) {
                            item.subscriberLabel = item.label;
                        } else {
                            item.subscriberLabel = item.label + ": " + item.name;
                        }
                        item.active.subscribe(function () {
                            self.setNewNoteSubscribers();
                        });
                    });
                    self.potentialNoteSubscribers(data ? data : null);
                }).done(function () {
                    self.setNewNoteSubscribers();
                });
            }
        }
    };

    /**
     * This function gets the initial ticket data from the server. The url (self.endPoints.getTicketData) for the call
     * is provided from the endpoint when the ticket model is setup.
     */

    this.getTicketObj = function (showLoader) {

        if (showLoader) {
            self.gettingTicketData(true);
            if (typeof SiteJS !== 'undefined') {
                SiteJS.ShowGeneralLoading();
            }
        }

        $.getJSON(self.endPoints.getTicketData, function (data) {
            self.receiveTicket(data);
        }).done(function () {
            if (!self.initialized()) {
                self.getCurrentUser();
                self.initialSubscribes();
                self.initialized(true);
            }
            self.contentLoading(false);

            self.gettingTicketData(false);
            if (typeof SiteJS !== 'undefined') {
                SiteJS.HideGeneralLoading();
            }

        }).fail(function (jqxhr, textStatus, error) {

        });
    };

    this.updateNotes = function () {
        self.updatedTimestamp(self.data.updated.timestamp);
        self.notesFilters(self.notesFiltersAry);
        self.newNoteLineSelectors(self.newNoteLineSelectorsAry);
        self.setupNotes(self.data);
        self.newNotes(false);
    };


    this.buildLine = function (issue) {

        // Building out the notes filter for each line
        var notesFilterLine = {
            lineId: issue.lineId,
            number: issue.number,
            active: ko.observable(true)
        };

        // Subscription to fire whenever a notes filter is toggled
        notesFilterLine.active.subscribe(self.filterNoteDays);
        self.notesFiltersAry.push(notesFilterLine);

        // Building out the new note line selector for each line
        var newNoteLine = {
            lineId: issue.lineId,
            number: issue.number,
            active: ko.observable(true)
        };

        // Subscription that fires whenever the active observable is changed aka user selected/deselected a line in the new note form
        newNoteLine.active.subscribe(self.setNewNoteLines);
        self.newNoteLineSelectorsAry.push(newNoteLine);

        self.builtLineIds.push(issue.lineId);
    };

    /**
     *  Sets up actions button observables, menu actions, invokes building of lines, and marks duplicate lines
     */

    this.checkIssues = function (issues) {

        self.uniqueLineIds = [];

        $.each(issues, function (issueIndex, issue) {

            /**
             * Setup the observable for each issue in reference to the action buttons if a default action exists
             */
            if (issue.actions) {
                if (issue.actions.defaultAction) {
                    issue.activeActionId = ko.observable(issue.actions.defaultAction);
                } else {
                    issue.customMessage = ko.observable(issue.actions.customMessage);
                    issue.activeActionId = ko.observable();
                }
                issue.activeMenuActionId = ko.observable();
            }

            if (issue.menuActions) {
                // if there is only 1 action and it is 'Work Task', clear the array
                // as this is redundant with the 'Work' button always showing
                if (issue.menuActions.length === 1 && _.contains(_.pluck(issue.menuActions, 'id'), 1) && !issue.actions.customMessage) {
                    issue.menuActions = [];
                }
                else {
                    if (typeof issue.activeMenuActionId === 'undefined') {
                        issue.activeMenuActionId = ko.observable();
                    }

                    issue.newAssignee = ko.observable();
                    issue.newAssigneeObject = ko.observable({});
                    issue.newAssigneeObjectValid = ko.computed(function () {
                        if (issue.activeMenuActionId() === 3) {
                            return !$.isEmptyObject(issue.newAssigneeObject());
                        }
                        else {
                            return true;
                        }
                    });
                }
            }

            // Check if line has been built yet, if not, build it
            if (_.indexOf(self.builtLineIds, issue.lineId, true) < 0) {
                self.buildLine(issue);
            }

            // If the previous issue's lineId doesn't match the current, it is a unique line
            // If not, it's an issue for the same line, so mark it as a duplicate
            if (issue.lineId !== _.last(self.uniqueLineIds)) {
                self.uniqueLineIds.push(issue.lineId);
            } else {
                issue.duplicate = ko.observable(true);
            }
        });
    };

    /**
     *
     */

    this.checkViewRequest = function () {
        if (self.viewRequest) {
            self.viewRequestModel.disable(self.viewRequest.disable);
            self.viewRequestModel.callback = self.viewRequest.callback;
        }
    };

    /**
     *
     * @param data : note object
     */

    this.setupNotes = function (data) {

        if (!data.noteDays) {
            return false;
        }

        var noteDays = data.noteDays;

        $.each(noteDays, function (noteDayIndex, noteDay) {
            noteDay.noteDayHasAttachment = self.noteDayHasAttachment(noteDay.notes);
            noteDay.notes = self.noteHasAttachment(noteDay.notes);
        });

        // Separate out the creation note
        var firstNoteDay = noteDays[0];

        if (firstNoteDay.notes.length === 1) {
            // If the first day only has one note (the creation note), remove the whole day
            noteDays.shift(firstNoteDay);
            firstNoteDay.notes = ko.observableArray(firstNoteDay.notes);
            firstNoteDay.notes()[0].active = ko.observable(true);
            //we want to make sure creation note is displayed, regardless of filter setting
            firstNoteDay.hasAttachment = true;
            firstNoteDay.notes()[0].urgencyMenu = ko.observable(false);
            self.creationNoteDay(firstNoteDay);

        } else if (firstNoteDay.notes.length > 1) {
            // If there are multiple notes, create a new object for the creation note
            var creationNoteDay = {};
            creationNoteDay.date = firstNoteDay.date;
            creationNoteDay.notes = ko.observableArray([firstNoteDay.notes[0]]);
            creationNoteDay.notes()[0].active = ko.observable(true);
            //we want to make sure creation note is displayed, regardless of filter setting
            creationNoteDay.hasAttachment = true;
            creationNoteDay.notes()[0].hasAttachment = true;
            creationNoteDay.notes()[0].urgencyMenu = ko.observable(false);
            creationNoteDay.notes()[0].showUpdateForm = ko.observable(false);
            creationNoteDay.notes()[0].newSubNote = ko.observable('');
            self.creationNoteDay(creationNoteDay);
            // And remove the creation note from the first note day
            firstNoteDay.notes.shift(firstNoteDay.notes[0]);
        }

        // Add an observable active property to each note day and each note day's note
        $.each(noteDays, function (noteDayIndex, noteDay) {

            noteDay.active = ko.observable(true);
            noteDay.notes = ko.observableArray(noteDay.notes);
            // Subscribe to the notes array for each day so that if a note is added, it filters
            noteDay.notes.subscribe(self.filterNoteDays);

            $.each(noteDay.notes(), function (noteIndex, note) {
                note.active = ko.observable(true);
                //toggle to show urgent update form
                note.showUpdateForm = ko.observable(false);
                note.urgencyMenu = ko.observable(false);
                note.newSubNote = ko.observable('');

                // swap any tagged user's full names in for the usernames
                if (note.taggedUsers) {
                    _.each(note.taggedUsers, function(taggedUser) {
                        note.notes = note.notes.replace('[~' + taggedUser.userName.toLowerCase() + ']', '[~' + taggedUser.name + ']');
                    });
                }
            });

        });

        self.noteDays(noteDays);
        self.noteDays.subscribe(self.filterNoteDays); // Subscribe to the note days array so that if a note is added, it filters

        /**
         * Sort out the note days by reverse chronological order. However, since the earliest date
         * is always the "created" note, it should be first.
         */
        self.noteDays.sort(function (a, b) {

            var aDate = moment(a.date).unix(),
                bDate = moment(b.date).unix();

            if (aDate > bDate) {
                return -1;
            } else if (aDate < bDate) {
                return 1;
            } else {
                return 0;
            }
        });

        // Set the new note line ids and title to all
        self.setNewNoteLines();
    };


    this.noteHasAttachment = function (note) {
        for (var i = 0; i < note.length; i++) {
            if (note[i].attachments && note[i].attachments.length) {
                note[i].hasAttachment = true;
            } else {
                note[i].hasAttachment = false;
            }
        }
        return note;
    };


    this.noteDayHasAttachment = function (notes) {
        for (var i = 0; i < notes.length; i++) {
            if (notes[i].attachments && notes[i].attachments.length) {
                return true;
            }
        }
        return false;
    };

    /**
     *
     * @param ticketId
     * Close tickets
     */

    this.closeTicket = function (ticketId) {
        // Only run callback if ticket is able to be closed
        if (self.ticketClosable()) {
            self.closeTicketCallback(ticketId);
        }
    };

    /**
     * This filters out the note days and notes array
     */
    self.filterNoteDays = function () {

        // Iterate through each day
        $.each(self.noteDays(), function (noteDayIndex, noteDay) {

            noteDay.active(false);

            // Iterate through each day's notes
            $.each(noteDay.notes(), function (noteIndex, note) {

                note.active(false);

                if (note.lineIds.length === 0) {
                    // Always show notes without any lines associated (aka a general note)
                    noteDay.active(true);
                    note.active(true);

                } else {

                    // Iterate through each note's lineIds
                    $.each(note.lineIds, function (lineIdIndex, lineId) {

                        // Iterate through each of the note filters
                        $.each(self.notesFilters(), function (filterIndex, filter) {

                            // Check to se if the current note's lineId is the same as the current filter.lineId
                            // If so, check to see if the filter is currently active
                            // If so, toggle the active property on that note, and that day, to true
                            if (filter.lineId === lineId && filter.active()) {

                                noteDay.active(true);
                                note.active(true);

                            }

                        });

                    });

                }

            });

        });

    };

    /**
     * Set all notes filters back to active
     */
    this.enableAllNoteFilters = function () {

        $.each(self.notesFilters(), function (filterIndex, filter) {
            filter.active(true);
        });

    };

    /**
     * Create a new note model for the new note form to use
     */
    this.newNote = ko.observable({
        active: ko.observable(true),
        title: ko.observable(),
        lineIds: ko.observableArray(),
        subscriberIds: ko.observableArray(),
        subscriberTitle: ko.observable(),
        isPrivate: ko.observable(false),
        isAlert: ko.observable(false),
        notes: ko.observable(''),
        submitted: ko.observable(false)
    });

    this.textLimitNotice = ko.observable();
    this.textLimitExceeded = ko.observable(false);

    this.limitNewNoteCharacters = ko.computed(function(){
        var text = self.newNote().notes();

        if(!self.newNoteCharacterLimit){
            return false;
        }

        var limit = self.newNoteCharacterLimit.limit ? self.newNoteCharacterLimit.limit : 100;

        if(text.length > parseInt(limit, 10)) {
            self.textLimitExceeded(true);
        } else {
            self.textLimitExceeded(false);
        }

        var indicator =  (limit - text.length) + " characters left";

        self.textLimitNotice(indicator);
    });

    /**
     * The valid flag which checks required fields
     */
    this.newNoteFormValid = ko.computed(function () {

        // Set form validity to true until something switches it
        var valid = true;

        // Fields to watch
        self.newNote().notes();

        // Text Field
        if (self.newNote().notes().length === 0) {
            valid = false;
        }

        return valid;

    });

    this.updateNote = function (note) {

        var callback;

        if (note.newSubNote().length > 0) {
            var newSubNote = {
                notes: note.newSubNote(),
                timestamp: moment(Date()).format("MM/DD/YYYY"),
                user: self.currentUser()
            };

            note.subNotes.push(newSubNote);

            callback = function () {
                self.noteDays.notifySubscribers();
                note.newSubNote('');
                note.showUpdateForm(false);
                self.getTicket();
            };
        }
        else {
            callback = function () {
                self.getTicket();
            };
        }

        $.ajax({
                type: "post",
                url: self.endPoints.newNoteAPI,
                dataType: "json",
                contentType: "application/json; charset=utf-8",
                data: ko.toJSON(self.updatedNote())
            })
            .done(
                function () {
                    if (callback) {
                        callback.apply(self, arguments);
                    }
                }
            ).fail(
            function () {

            }
        );
    };

    /**
     * This function adds a new note to the note days array. When called, it first
     * checks to see if there is a note day with the same date as today. If so, it
     * will push the note onto that day's notes array. Else, it will generate a new
     * note day (today) and push the note onto today's notes array.
     */

    this.addNewNote = function (selectedObjects) {

        var taggedUsers = [];

        if (selectedObjects && selectedObjects().length) {
            taggedUsers = selectedObjects();
        }

        // remove any users who were tagged and then their name deleted
        taggedUsers = _.reject(taggedUsers, function (user) {
            return self.newNote().notes().indexOf("[~" + user.userName + "]") < 0;
        });

        // Check to see form is valid
        if (self.newNoteFormValid() && !self.textLimitExceeded()) {

            self.newNote().submitted(true);

            var postNote = {
                    isPrivate: self.newNote().isPrivate(),
                    isAlert: self.newNote().isAlert(),
                    lineIds: self.newNote().lineIds().join(','),
                    alertTo: self.newNote().isAlert() ? self.newNote().subscriberIds().join(',') : '',
                    notes: self.newNote().notes(),
                    attachments: self.attachments(),
                    taggedUsers: taggedUsers
                },
                localNote = {
                    user: self.currentUser(),
                    active: ko.observable(true),
                    title: self.newNote().title(),
                    isPrivate: self.newNote().isPrivate(),
                    isAlert: self.newNote().isAlert(),
                    newSubNote: ko.observable(""),
                    lineIds: self.newNote().lineIds(),
                    notes: self.newNote().notes(),
                    showUpdateForm: ko.observable(false),
                    hasAttachment: (self.attachments() && self.attachments().length > 0) ? true : false,
                    attachments: self.attachments(),
                    urgencyMenu: ko.observable(false),
                    tempNewNote: ko.observable(true),
                    taggedUsers: taggedUsers
                };

            // If all lines are selected, treat new note as a general note with no line Ids
            if (self.newNote().lineIds().length === self.newNoteLineSelectors().length) {
                postNote.lineIds = '';
            }

            var latestNoteDay;

            // Sets the local time to the note's time-stamp
            localNote.timestamp = new Date();

            // Set the latest note day to the created date
            latestNoteDay = self.noteDays()[0];

            // BP-3317: Show loading, disabling the form
            if (typeof SiteJS !== 'undefined') {
                SiteJS.ShowGeneralLoading();
            }
            $('textarea, button, input', $('form.mettel-new-note-form')).prop('disabled', true);

            $.ajax({
                    type: "post",
                    url: self.endPoints.newNoteAPI,
                    dataType: "json",
                    contentType: "application/json; charset=utf-8",
                    data: ko.toJSON(postNote)
                })
                .done(
                    function (data) {
                        // BP-3317: managing newly added attachments
                        if (data.attachments && data.attachments.length > 0) {
                            localNote.attachments = data.attachments;
                        }

                        var noteDay = {};
                        noteDay.date = moment(localNote.timestamp).format("MM/DD/YYYY");
                        noteDay.active = ko.observable(true);
                        noteDay.noteDayHasAttachment = (localNote.attachments && localNote.attachments.length > 0) ? true : false;
                        noteDay.notes = ko.observableArray([localNote]);
                        noteDay.notes.subscribe(self.filterNoteDays);
                        self.noteDays.unshift(noteDay);
                        // BP-3317: managing newly added attachments.
                        // Updating view only when successful, with URL availability of the new attachement(s) if any


                        self.getTicket();
                        self.resetNewNoteForm();
                        self.attachments([]);
                    }
                ).complete(function () {
                // BP-3317: Hide loading, enabling the form
                if (typeof SiteJS !== 'undefined') {
                    SiteJS.HideGeneralLoading();
                }
                $('textarea, button, input', $('form.mettel-new-note-form')).prop('disabled', false);
            }).fail();
        }

    };

    // Set all new note lines to active/in-active
    this.toggleAllNewNoteLines = function () {
        $.each(self.newNoteLineSelectors(), function (i, line) {
            line.active(!self.allNewNoteLinesEnabled());
        });
        self.allNewNoteLinesEnabled(!self.allNewNoteLinesEnabled());
    };

    this.enableAllNoteSubscribers = function () {
        $.each(self.potentialNoteSubscribers(), function (i, subscriber) {
            subscriber.active(true);
        });
    };

    // Reset new note form
    this.resetNewNoteForm = function () {
        self.newNote().isPrivate(false);
        self.newNote().isAlert(false);
        self.newNote().notes('');
        self.newNote().submitted(false);
    };

    /**
     *
     * @param fileMetaData
     * @param uploadData
     *
     * Push file meta-data and data into observable array so that it may be pushed to server when submit button clicked
     */

    self.fileLoaded = function (fileMetaData, uploadData, target) {
        self.attachments.push({
            lastModified: fileMetaData.lastModified,
            fullFileName: fileMetaData.name,
            name: MetTel.Utils.extractFileName(fileMetaData.name),
            size: fileMetaData.size,
            type: fileMetaData.type,
            extension: "." + MetTel.Utils.extractFileExtension(fileMetaData.name),
            data: uploadData
        });
        //clear the input in case you want to upload same file twice. otherwise, binding handler won't fire.
        $(target).val('');
    };

    self.fileProgress = function () {
        //file upload progress event handler/callback
    };

    self.fileError = function () {
        //file upload error event handler/callback
    };

    /**
     * This generates the new note line ids array and builds the title
     */
    self.setNewNoteLines = function () {
        var lineIds = [],
            newNoteTitle = "";
        $.each(self.newNoteLineSelectors(), function (lineIndex, line) {
            if (line.active()) {
                // If the new note title hasn't been defined, don't put a comma in front of first number
                if (!newNoteTitle) {
                    newNoteTitle = newNoteTitle.concat(line.number);
                } else {
                    // Else, put a comma before hand
                    newNoteTitle = newNoteTitle.concat(', ' + line.number);
                }
                // If the line.active is true, push it to the line ids
                lineIds.push(line.lineId);
            }
        });

        // If they've chosen all or no lines for the new note, display "All Lines"
        if (lineIds.length === 0 || lineIds.length === self.newNoteLineSelectors().length) {
            newNoteTitle = "All Services/Lines";
        }

        // Set the new note title
        self.newNote().title(newNoteTitle);
        // Set the new note line ids
        self.newNote().lineIds(lineIds);
    };

    /**
     * This generates the subscriber list and builds the title for the select
     */
    self.setNewNoteSubscribers = function () {
        var subscriberIds = [],
            newNoteTitle = "";
        $.each(self.potentialNoteSubscribers(), function (subscriberIndex, subscriber) {
            if (subscriber.active()) {
                // If the new note title hasn't been defined, don't put a comma in front of first number
                if (!newNoteTitle) {
                    newNoteTitle = newNoteTitle.concat(subscriber.label);
                } else {
                    // Else, put a comma before hand
                    newNoteTitle = newNoteTitle.concat(', ' + subscriber.label);
                }
                // If the line.active is true, push it to the line ids
                subscriberIds.push(subscriber.id);
            }
        });

        // If they've chosen all or no subscribers for the new note, display "Notify All Note Subscribers"
        if (subscriberIds.length === 0 || subscriberIds.length === self.potentialNoteSubscribers().length) {
            newNoteTitle = "Notify All Note Subscribers";
        }

        // Set the new note title
        self.newNote().subscriberTitle(newNoteTitle);
        // Set the new note line ids
        self.newNote().subscriberIds(subscriberIds);
    };

    /**
     * Update the current date and time that is displayed
     */
    setInterval(function () {
        var currentDateTime = new Date();
        self.currentDateTime(currentDateTime);
    }, 1000);

    // scroll timeline to right after rendering action buttons is finished
    this.scrollTimeline = function (elements, data) {
        setTimeout(function () {
            var $container = $(elements[0]).closest('[data-mettel-class="issue-timeline"]').find('[data-mettel-class="issue-timeline-timeline-container"]').eq(0);
            if ($container[0]) {
                $container.scrollLeft($container[0].scrollWidth - $container.outerWidth());
            }
        }, 0);
    };

}

ko.bindingHandlers.ticketOverview = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        $element.hide();

        // Catalog Model
        productCatalogViewModel = new CustomerCatalogModel();
        productCatalogViewModel.retrievedOrder(true);
        productCatalogViewModel.endPoints = viewModel.endPoints;
        productCatalogViewModel.queryParams(viewModel.queryParams);

        // used for loading indicator
        viewModel.catalogInitiated(true);

        // Customer Order Model
        customerOrderViewModel = new CustomerOrderModel({});
        customerOrderViewModel.init();
        customerOrderViewModel.loadExistingOrder(viewModel.id());
        customerOrderViewModel.showAddress(false);
        customerOrderViewModel.page('confirmation');

        // wait until the catalog is loaded to show the overview
        productCatalogViewModel.productCatalogLoading.subscribe(function (newValue) {
            if (!customerOrderViewModel.legacyTicket() && !customerOrderViewModel.customTicket()) {
                $element.show();
            }
        });

        // use iframe for orders that employ a non-standard data model
        customerOrderViewModel.differentDataModel.subscribe(function (newValue) {
            if (newValue) {
                var leftPanelHeight = $('.mettel-footer').offset().top - $('.mettel-ticket-overview-inner').offset().top;

                // apply height to the iframe so it at least fills the screen
                $('.mettel-ticket-overview-iframe').height(leftPanelHeight + 'px');

                var url = '/helpdesk/load?hideNav=true&stepId=review&clientID=' + viewModel.queryParams.clientId + '&ticketId=' + viewModel.id();
                viewModel.differentDataModelUrl(url);

                // show the loading indicator until the iframe is at least partially loaded
                // we are looking for .mettel-content to determine this
                viewModel.differentDataModelLoaded(false);
                $('.mettel-ticket-overview-iframe').hide();

                var iframeInterval = setInterval(function () {
                    var elementFound = $('.mettel-ticket-overview-iframe').contents().find('.mettel-content').length;

                    if (elementFound) {
                        clearInterval(iframeInterval);
                        viewModel.differentDataModelLoaded(true);
                        $('.mettel-ticket-overview-iframe').show();
                    }
                }, 250);

            }
        });

        // handling of Max tickets
        customerOrderViewModel.legacyTicket.subscribe(function (newValue) {
            if (newValue) {
                viewModel.legacyTicket(true);
            }
        });

        ko.applyBindingsToNode(element, {
            template: {
                name: 'readonly-order-summary',
                data: customerOrderViewModel
            }
        }, bindingContext);

        return {controlsDescendantBindings: true};
    }
};

ko.bindingHandlers.highLightTaggedElement = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = valueAccessor();

        if (value) {
            var regex = /(<([^>]+)>)/ig;
            value = value.replace(regex, "");
        }

        var newRegex = /\[~(.*?)\]/g,
            newString = value;

        if (value) {
            newString = value.replace(newRegex, '<strong>$1</strong>');
        }

        $(element).html(newString);
    }
};

ko.bindingHandlers.newNoteToggleView = {
    init: function() {
        $('.mettel-add-attachment-input').focus(function() {
            $(this).prev().addClass('mettel-add-attachment-input-focused');
        });
        $('.mettel-add-attachment-input').blur(function() {
            $(this).prev().removeClass('mettel-add-attachment-input-focused');
        });
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var valueObs = ko.unwrap(valueAccessor()),
            $element = $(element);

        if (valueObs) {
            var $textarea = $element.find('.mettel-new-note-text'),
                formClicked = false;

            if ($textarea.val() === "") {
                $element.addClass('mettel-state-collapsed');
            }

            $textarea.on('focus', function () {
                $element.removeClass('mettel-state-collapsed');

                // set up click handlers for the other new note form inputs/buttons
                // because we don't want to collapse the new note when clicking those
                $('.mettel-new-note-form').find('.mettel-new-note-view-line-select, .mettel-toggle, .mettel-new-note-subscribers-notify-select, .mettel-add-attachment-input, .mettel-new-note-remove-attachment').one('click', function () {
                    formClicked = true;
                });
            });

            $textarea.on('blur', function (event) {
                // give the click event some time to fire before collapsing
                // and only collapse if the note field is empty and a new note form input/button has not been clicked
                _.delay(function () {
                    if ($textarea.val() === "" && formClicked === false) {
                        $element.addClass('mettel-state-collapsed');
                    }
                    else {
                        formClicked = false;
                    }
                }, 250);
            });

            // to handle form submission
            bindingContext.$parent.newNote().submitted.subscribe(function (newValue) {
                if (newValue) {
                    $element.addClass('mettel-state-collapsed');
                }
            });
        }
    }
};

ko.bindingHandlers.configureTicketActions = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        viewModel.enableApproval.subscribe(function (newValue) {
            setTimeout(function () {
                var $element = $(element);

                if (newValue) {
                    var $approveButton = $element.find('.mettel-ticket-approval-approve'),
                        $modifyButton = $element.find('.mettel-ticket-approval-modify'),
                        $rejectButton = $element.find('.mettel-ticket-approval-reject'),
                        $approveModal = $('.mettel-ticket-approval-approve-modal'),
                        $modifyModal = $('.mettel-ticket-approval-modify-modal'),
                        $rejectModal = $('.mettel-ticket-approval-reject-modal');

                    $approveButton.on('click', function () {

                        $approveModal.modalWindow();

                        var $confirmButton = $('.mettel-ticket-approval-approve-modal-confirm'),
                            $cancelButton = $('.mettel-ticket-approval-approve-modal-cancel');

                        $confirmButton.on('click', function () {
                            if (typeof viewModel.approveTicketCallback === 'function') {
                                viewModel.approveTicketCallback(viewModel, $approveModal);
                            }

                            $confirmButton.off();
                            $cancelButton.off();
                        });

                        $cancelButton.on('click', function () {
                            $approveModal.modalWindow('close');
                            $confirmButton.off();
                            $cancelButton.off();
                        });
                    });

                    $modifyButton.on('click', function () {
                        $modifyModal.modalWindow();

                        var $confirmButton = $('.mettel-ticket-approval-modify-modal-confirm'),
                            $cancelButton = $('.mettel-ticket-approval-modify-modal-cancel');

                        $confirmButton.on('click', function () {
                            if (typeof viewModel.modifyTicketCallback === 'function') {
                                viewModel.modifyTicketCallback(viewModel, $modifyModal);
                            }
                            $confirmButton.off();
                            $cancelButton.off();
                        });

                        $cancelButton.on('click', function () {
                            $modifyModal.modalWindow('close');
                            $confirmButton.off();
                            $cancelButton.off();
                        });
                    });

                    $rejectButton.on('click', function () {
                        $rejectModal.modalWindow();

                        var $confirmButton = $('.mettel-ticket-approval-reject-modal-confirm'),
                            $cancelButton = $('.mettel-ticket-approval-reject-modal-cancel');

                        $confirmButton.on('click', function () {
                            if (typeof viewModel.rejectTicketCallback === 'function') {
                                viewModel.rejectTicketCallback(viewModel, $rejectModal);
                            }
                            $confirmButton.off();
                            $cancelButton.off();
                        });

                        $cancelButton.on('click', function () {
                            $rejectModal.modalWindow('close');
                            $confirmButton.off();
                            $cancelButton.off();
                        });
                    });
                }
                else {
                    var $reminderButton = $element.find('.mettel-ticket-approval-reminder'),
                        $reminderModal = $('.mettel-ticket-approval-reminder-modal');

                    $reminderButton.on('click', function () {
                        if (typeof viewModel.reminderTicketCallback === 'function') {
                            viewModel.reminderTicketCallback(viewModel, $reminderModal);
                        }
                    });
                }
            });
        });
    }
};

ko.bindingHandlers.configureIssueActions = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.next('.mettel-ticket-issue-actions-modal'),
            $submit = $modal.find('.mettel-ticket-issue-actions-submit'),
            objIssue = viewModel,
            objTicket = bindingContext.$parents[0],
            numClientId = objTicket.queryParams.clientId,
            numDetailId = objIssue.lineId,
            modalOptions = {};

        $element.on('click', function() {
            objIssue.activeMenuActionId(1);

            // when the user changes result, fetch new notes
            objIssue.activeActionId.subscribe(function(newResult) {
                objTicket.fetchIssueNotes(numClientId, newResult, numDetailId);
            });

            $submit.on('click', function() {
                // fire the callback if there are no errors
                if (objTicket.resultNotesErrors.isValid()) {
                    objTicket.actionCallback(objIssue, objTicket, $modal);
                }
                // if there are errors, show them
                else {
                    showAllFormErrors($modal);
                }
            });

            modalOptions.close = function () {
                objTicket.resultNotes.initialized(false);
                objTicket.resultNotesErrors = [];
                objTicket.resultNotes.Sections([]);
                objIssue.activeMenuActionId(null);
                $submit.off();
            };

            $modal.modalWindow(modalOptions);
            objTicket.fetchIssueNotes(numClientId, objIssue.activeActionId(), numDetailId);
        });
    }
};

ko.bindingHandlers.configureIssueMenuAction = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $modal = $element.parents('.mettel-ticket-issue-pivot-menu').prev('.mettel-ticket-issue-actions-modal'),
            $submit = $modal.find('.mettel-ticket-issue-actions-submit'),
            objAction = viewModel,
            objIssue = bindingContext.$parent,
            objTicket = bindingContext.$parents[1],
            numClientId = objTicket.queryParams.clientId,
            numDetailId = objIssue.lineId,
            modalOptions = {};

        $element.on('click', function() {

            // disable click if loading
            if (objTicket.gettingTicketData()) {
                return false;
            }

            objIssue.activeMenuActionId(objAction.id);

            // when the user changes result, fetch new notes
            objIssue.activeActionId.subscribe(function(newResult) {
                if (objIssue.activeMenuActionId() !== 3) {
                    objTicket.fetchIssueNotes(numClientId, newResult, numDetailId);
                }
            });

            $submit.on('click', function() {
                // fire the callback if there are no errors
                if (objTicket.resultNotesErrors.isValid() && objIssue.newAssigneeObjectValid()) {
                    objTicket.menuActionCallback(objIssue, objTicket, $modal);
                }
                // if there are errors, show them
                else {
                    showAllFormErrors($modal);
                }
            });

            if (objIssue.activeMenuActionId() === 3) {
                $modal.addClass('mettel-ticket-issue-actions-modal-reassign');
            }
            else {
                $modal.removeClass('mettel-ticket-issue-actions-modal-reassign');
            }

            if (objIssue.activeMenuActionId() === 1 || objIssue.activeMenuActionId() === 2 || objIssue.activeMenuActionId() === 3) {

                modalOptions.close = function () {
                    objTicket.resultNotes.initialized(false);
                    objTicket.resultNotesErrors = [];
                    objTicket.resultNotes.Sections([]);
                    objIssue.activeMenuActionId(null);
                    objIssue.newAssignee(null);
                    objIssue.newAssigneeObject({});
                    $submit.off();
                };

                var $errorMessages = $modal.find('.mettel-error-message');
                $errorMessages.hide();

                $modal.modalWindow(modalOptions);

                if (objIssue.activeMenuActionId() !== 3) {
                    objTicket.fetchIssueNotes(numClientId, objIssue.activeActionId(), numDetailId);
                }
                else {
                    objTicket.resultNotes.initialized(true);
                    ko.validation.group(objTicket.resultNotesErrors);
                }
            }
            else {
                objTicket.menuActionCallback(objIssue, objTicket, $modal);
            }
        });
    }
};

ko.bindingHandlers.toggle = {
    update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();

        accessor.value = allBindingsAccessor().value;
        accessor.htmlId = $(element).attr('id');
        accessor.htmlClass = $(element).attr('class');
        accessor.disabled = accessor.disabled ? accessor.disabled : false;

        ko.renderTemplate("toggle-template", accessor, {
            afterRender: function (nodes) {
                if (accessor.trueClass || accessor.falseClass) {
                    // get the rendered label element
                    var elements = nodes.filter(function(node) {
                        // Ignore any #text nodes before and after the modal element.
                        return node.nodeType === 1;
                    });

                    var $label = $(elements[0]);

                    // set initial value
                    if (accessor.value()) {
                        $label.addClass(accessor.trueClass);
                    }
                    else {
                        $label.addClass(accessor.falseClass);
                    }

                    // subscribe to changes
                    accessor.value.subscribe(function(value) {
                        if (value) {
                            $label.addClass(accessor.trueClass);
                            $label.removeClass(accessor.falseClass);
                        }
                        else {
                            $label.addClass(accessor.falseClass);
                            $label.removeClass(accessor.trueClass);
                        }
                    });
                }

                var labels = _.each(nodes, function(node, index) {
                    if (index === 1) {
                        var $node = $(node),
                            input = $node.find('.mettel-toggle-checkbox'),
                            $input = $(input);

                        $input.on('focus', function() {
                            $node.addClass('mettel-toggle-label-focused');
                        });

                        $input.on('blur', function() {
                            $node.removeClass('mettel-toggle-label-focused');
                        });
                    }
                });
            }
        }, element, 'replaceNode');
    }
};

window.MetTel = window.MetTel || {};

MetTel.TokenAutoCompleteModel = TokenAutoCompleteModel = function (options) {

    ko.utils.extend(this, new TypeaheadModel(options));

    var self = this;
        self.selectedArray = ko.observableArray();
        self.secondaryTextProperty = options.secondaryTextProperty;
        self.endPoints = options.endPoints;
        self.selectedObjects = options.selectedObjects;
        self.textInput = options.textInput;

    self.selectedArray.subscribe(function(){

        var user = {};
        var selected = [];

        for(var i = 0; i < self.selectedArray().length; i++) {
            user = {};
            user.userName = self.selectedArray()[i]['userName'];
            user.name = self.selectedArray()[i]['name'];
            user.dirId = self.selectedArray()[i]['dirId'];
            selected.push(user);
        }

        selected = _.uniq(selected, function(item, key, name) {
            return item.userName;
        });

        /* we do this so it will be available to ticket view model*/
        self.selectedObjects(selected);
    });

    self.selectedObjects.subscribe(function(val){
        /* upon submit of note, we clear selectedArray, otherwise old values linger*/
        if(val === null) {
            self.selectedArray([]);
        }
    });

    self.search.subscribe(function(){
        _.delay(self.checkIfStillTagged, 100);
    });

    /* make sure that the user didn't delete a tagged user in note, remove
    from selectedArray if they did.
     */
    self.checkIfStillTagged = function() {
        var str = self.search();
        for (var i = 0; i < self.selectedArray().length; i++) {
            if (str.indexOf('[~' + self.selectedArray()[i][self.secondaryTextProperty] + ']') ===  false) {
                self.selectedArray()[i]['shouldPost'] = false;
            } else {
                self.selectedArray()[i]['shouldPost'] = true;
            }
        }
        var stillTagged = _.filter(self.selectedArray(), function(selected) {
            return selected['shouldPost'] === true;
        });
        self.selectedArray(stillTagged);
    };

    /* swap the tagged user for properly formatted text*/
    self.swapToken = function(selectionObject) {

        selectionObject.shouldPost = true;
        self.selectedArray.push(selectionObject);

        var revisedStr,
            textField = self.search(),
            strToArr = textField.split(' '),
            start = textField.lastIndexOf(self.tokenDefinition()),
            tokenStr = textField.substring(start, textField.length),
            lastOccurrence = _.lastIndexOf(strToArr, tokenStr);

        strToArr[lastOccurrence] =  '[~' + selectionObject[self.secondaryTextProperty] + ']';
        revisedStr = strToArr.join(" ");

        self.search(revisedStr);
        $(self.textInput).focus();
    };

    /* triggered when user selects a sugestion*/
    self.selectSuggestion = function(selectionObject) {

        self.hasError(false);
        self.selectedObject(selectionObject);

        self.swapToken(selectionObject);

        if (self.selectSuggestionEvent) {
            self.selectSuggestionEvent(selectionObject);
        }

        self.possibleSuggestions.removeAll();
        self.isActive(false);

        if (self.selectedText() !== undefined && self.selectedValue() !== undefined && self.hideSuggestions() === false) {
            self.defaultValue(selectionObject[self.valueProperty]);
        }
    };

    ko.bindingHandlers.truncateTypeaheadResults = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var $element = $(element);
            var result = $element.html();
            if(result.length > 55) {
                result = result.substring(0, 55) + "...";
            }
            $element.html(result);
        }
    };

    ko.bindingHandlers.updateSelectedText = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var objParent = bindingContext.$parent;
            var searchTerm = objParent.search();
            var $element = $(element);
            var thisName = $element.html();

            var unformattedName = viewModel[objParent.textProperty];

            if (searchTerm.length >= self.stringLength) {

                var start = searchTerm.lastIndexOf(objParent.tokenDefinition());
                searchTerm = searchTerm.substring(start + 1, searchTerm.length);

                var matcher = new RegExp("("+searchTerm.substring(0, searchTerm.length)+")", "ig" );
                thisName = thisName.replace(matcher, "<strong class='mettel-token-complete'>$1</strong>");
                $element.html(thisName);
            }
            else {
                $element.html(unformattedName);
            }
        }
    };

    ko.bindingHandlers.downAndUpArrowAndEnterPress = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var allBindings = allBindingsAccessor(),
                $element = $(element);

            $element.on('keydown', function (event) {
                var keyCode = (event.which ? event.which : event.keyCode);

                // 38 is up arrow, 40 is down arrow
                if ((keyCode === 38) || (keyCode === 40) || (keyCode === 13)) {
                    event.preventDefault();

                    if (viewModel.possibleSuggestions().length > 0) {
                        var $searchInput = $($('.mettel-search-input')[0]);
                        var $newItemLink = $($element.find('.mettel-typeahead-additional-link')[0]);
                        var $suggestedLinks = $element.find('.mettel-typeahead-link');
                        var numSuggestedLinks = $suggestedLinks.length;

                        var focusedElement = document.activeElement;
                        var $focusedElement = $(focusedElement);

                        // the 'new item' link is currently focused
                        if ($focusedElement.hasClass('mettel-typeahead-additional-link')) {
                            if (keyCode === 38) {
                                $searchInput.focus();
                            }
                            else {
                                $($suggestedLinks[0]).focus();
                            }
                        }
                        // a typeahead link is currently focused
                        else if ($focusedElement.hasClass('mettel-typeahead-link')) {

                            if (keyCode === 13) {
                                $focusedElement.trigger("click");
                            }

                            var arrSuggestedItems = _.toArray($suggestedLinks);
                            var focusedIndex = _.indexOf(arrSuggestedItems, focusedElement);

                            var newFocusedIndex;

                            if (keyCode === 38) {
                                newFocusedIndex = focusedIndex - 1;
                            }
                            else {
                                newFocusedIndex = focusedIndex + 1;
                            }

                            if (newFocusedIndex === -1) {
                                if ($newItemLink.length > 0) {
                                    $newItemLink.focus();
                                }
                                else {
                                    $searchInput.focus();
                                }
                            }
                            else if (newFocusedIndex === numSuggestedLinks) {
                                $searchInput.focus();
                            }
                            else {
                                $suggestedLinks[newFocusedIndex].focus();
                            }
                        }
                        // the search field is currently focused
                        else if ($focusedElement.hasClass('mettel-search-input')) {
                            if (keyCode === 13) {
                                $($suggestedLinks[0]).focus();
                                $($suggestedLinks[0]).trigger("click");
                            } else if (keyCode === 38) {
                                $($suggestedLinks[0]).parent().toggleClass("mettel-first-item", false);
                                $($suggestedLinks[numSuggestedLinks-1]).focus();
                            } else if (keyCode === 40) {
                                if(numSuggestedLinks > 1) {
                                    $($suggestedLinks[0]).parent().toggleClass("mettel-first-item", false);
                                    if (typeof ko.unwrap(viewModel.customAction) === 'undefined') {
                                        $($suggestedLinks[0]).focus();
                                    }
                                    else {
                                        $($suggestedLinks[1]).focus();
                                    }
                                } else {
                                    $($suggestedLinks[numSuggestedLinks-1]).focus();
                                }
                            }
                            else if ($newItemLink.length > 0) {
                                $newItemLink.focus();
                            }
                            else {
                                $($suggestedLinks[0]).focus();
                            }
                        }
                        return false;
                    }
                }
                return true;
            });
        }
    };

};


ko.bindingHandlers.tokenAutoComplete = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        accessor.value = allBindingsAccessor().value;
        accessor.textInput = element;
        var tokenAutoCompleteModel = new TokenAutoCompleteModel(accessor);
        ko.renderTemplate("token-auto-complete", tokenAutoCompleteModel, { afterRender: ko.postbox.publish('tokenAutoComplete.renderComplete', true) }, element, 'replaceNode');
    }
};

function BranchModel(options) {
    var self = this;
    self.viewable = ko.observable(true);
    self.oldLabel = options.label;
    /*jshint -W030 */
    self.save;

    self.approveClick = function (parentContext) {
        if (options.save) {
            options.save(parentContext);
        }
        self.viewable(true);
        self.oldLabel = self.label();
    };

    // Setup all the properties from the data
    if (options) {
        $.each(options, function (key, value) {
            if (key === 'selected') {
                self["checked"] = ko.observable(value);
            }
            else if (key === "label") {
                self["label"] = ko.observable(value);
            }
            else {
                self[key] = value;
            }

        });
    }

    // Initial Setup - sets all the states for the branches
    // console.log('The state of "' + self.label + ' (' + self.id + ')" is ' + self.state());
    this.state = ko.observable('');

    // Based on the checked property, set the state to either checked or unchecked
    if (this.checked()) {
        self.state('checked');
    } else {
        self.state('unchecked');
    }

    // Now, if children exist, test to see if it should be partially checked based on their statuses
    if (this.children) {
        this.totalChildren = this.children.length; // Set a property on the model of how many childen there are.
        var totalChildrenChecked = 0; // Store a local variable of how many children are checked

        // Iterate over each of the children
        $.each(self.children, function (i, child) {
            // If one is checked, increment the total number of children checked
            if (child.checked()) {
                totalChildrenChecked += 1;
            } else {
                // If a child already has a state of 'partially-checked', set the parent to 'partially-checked'
                if (child.state() === 'partially-checked') {
                    self.state('partially-checked');
                }
            }
        });

        // After the each, if the total children checked isn't 0 (no children checked - thus, it remains unchecked)
        // OR the total children checked is equal to the total children (all children checked - thus, it stays checked)
        if (totalChildrenChecked !== 0 && totalChildrenChecked !== self.totalChildren) {
            self.state('partially-checked');
        }
    }

    // Function to update children to a specific state
    this._updateChildren = function (state) {
        $.each(self.children, function (i, child) {
            child.state(state);
        });
    };

    // Subscription listening to the checked property
    self.checked.subscribe(function (checked) {
        if (checked) {
            self.state('checked');
        } else {
            // Only update the state if it's not 'partially-checked'
            if(self.state() !== 'partially-checked') {
                self.state('unchecked');
            }
        }
    });

    // Subscription listening for the state property to change
    self.state.subscribe(function (newState) {

        switch(newState) {
            case 'checked':
                if (!self.checked()) {
                    self.checked(true);
                }
                if (self.children) {
                    self._updateChildren('checked');
                }
                break;

            case 'unchecked':
                if (self.checked()) {
                    self.checked(false);
                }
                if (self.children) {
                    self._updateChildren('unchecked');
                }
                break;

            case 'partially-checked':
                if (self.checked()) {
                    self.checked(false);
                }
                break;

            default:
                console.error('An invalid state was set to the branch with an id of ' + self.id);
        }

    });

    // If the branch has children..
    if (this.children) {

        // Iterate through them..
        $.each(self.children, function (i, child) {

            // Attach a subscription to each one's state
            child.state.subscribe(function () {

                // Whenever a state changes, reset the total amount checked and the partially flag
                var totalChildrenChecked = 0,
                    anyPartiallyCheckedChildren = false;

                // Iterate through the children and check their states and update the count and flag accordingly
                $.each(self.children, function (e, newChild) {

                    switch (newChild.state()) {
                        case 'checked':
                            totalChildrenChecked += 1;
                            break;
                        case 'partially-checked':
                            anyPartiallyCheckedChildren = true;
                    }

                });

                // Determine the state of the parent
                if (
                    anyPartiallyCheckedChildren || // one of the children are partially checked
                    totalChildrenChecked > 0 && totalChildrenChecked < self.totalChildren // some of the children are checked
                    ) {
                    // Some of the children are checked or one of the children is 'partially-checked'
                    self.state('partially-checked');
                } else {
                    if (totalChildrenChecked === 0) {
                        // If no children are checked...
                        self.state('unchecked');
                    } else if (totalChildrenChecked === self.totalChildren) {
                        // If all the children are checked
                        self.state('checked');
                    }
                }
            });
        });

    }
}

function TreeCheckboxesModel(options) {
    var self = this;

    this.tree = ko.observableArray();
    $.extend(this, options);

    self.init = function () {

        // Get tree checkboxes data
        $.getJSON(self.endPoints.getTreeCheckboxesData, function (data) {

            // Recursive function that sets up the BranchModel over each branch object and assigns it to the tree observable when done.
            var crawler = function (array) {
                $.each(array, function (i, branch) {

                    // If the branch has children 'branches'
                    if (branch.children) {
                        // Rerun the function. <3 recursiveness
                        crawler(branch.children);
                    }

                    if (typeof options !== "undefined") {
                        branch.save = options.approveClick;
                    }
                    // Overwrite the object in the array with the new BranchModel
                    array[i] = new BranchModel(branch);
                });

                return array;
            };

            // Assign the value of the tree equal to the new model with the Branch Models
            self.tree(crawler(data.tree));

        });
    };
    this.getTreeData = function () {
        // Create a new array with the pertinent data
        // Recursive so child arrays are also copied
        var copyTreeData = function (array) {

            var newArray = [];

            $.each(array, function (i, item) {

                var newItem = {};

                newItem.id = item.id;
                newItem.label = ko.observable(item.label);
                newItem.selected = item.checked();

                if (item.children) {
                    newItem.children = copyTreeData(item.children);
                }

                newArray.push(newItem);

            });

            // Return the new array
            return newArray;

        };

        // Copy the tree data for the post
        var treeData = copyTreeData(self.tree());
        return treeData;
    };
    // Send data to server
    this.postTreeData = function () {
        var treeData = this.getTreeData();

        $.post(self.endPoints.postTreeCheckboxesData, treeData, function () {
            console.log('Post for tree data successful', treeData);
        }, 'text');

    };

}

ko.bindingHandlers.treeCheckboxes = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = valueAccessor();

        if (options && options.endPoints) {
            viewModel.endPoints = options.endPoints;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, { template: { name: 'tree-checkboxes', data: viewModel } }, bindingContext);

        return { controlsDescendantBindings: true };

    }
};

ko.bindingHandlers.toggleBranchExpanded = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            $primaryBranchContainer = $element.closest('[data-mettel-class="tree-primary-branch"]'),
            $accessibleSpan = $element.find('.mettel-accessible-text'),
            collapsedClass = 'mettel-state-collapsed',
            collapsedAccessibleText = 'Expand primary branch',
            expandedAccessibleText = 'Collapse primary branch';

        $element.click(function () {
            // opening menu
            if ($primaryBranchContainer.hasClass(collapsedClass)) {
                $primaryBranchContainer.removeClass(collapsedClass);
                $accessibleSpan.text(expandedAccessibleText);
            }
            // closing menu
            else {
                $primaryBranchContainer.addClass(collapsedClass);
                $accessibleSpan.text(collapsedAccessibleText);
            }
        });
    }
};

ko.bindingHandlers.testForGrandchildren = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            hasGrandchildren = false;

        if (viewModel.children) {
            $.each(viewModel.children, function (i, child) {
                if (child.children) {
                    hasGrandchildren = true;
                    return false;
                }
            });
        }

        if (!hasGrandchildren) {
            $element.addClass('mettel-branch-no-grandchildren');
        }
    }
};

window.MetTel = window.MetTel || {};

MetTel.TypeaheadListModel = TypeaheadListModel = function (options) {

    ko.utils.extend(this, new TypeaheadModel(options));
    var self = this;

    self.selectedObjects = ko.observableArray();
    self.clonedSelectedObjects = ko.observableArray();
    self.clonedSelectedObjects.extend({notify: 'always'});
    self.typeAheadIsActive = ko.observable(false);
    self.footerElement = options.footerElement;
    self.typeAheadElement = options.typeAheadElement;
    self.modalHeaderText = options.modalHeaderText ? options.modalHeaderText : "";
    self.modalButtonText = options.modalButtonText ? options.modalButtonText : "";
    self.currentUser = ko.observable();
    self.availableSubscriptionTypes = ko.observableArray([
        {
            "typeValue": "None",
            "typeText": "None"
        },
        {
            "typeValue": "Milestones",
            "typeText": "Milestones"
        },
        {
            "typeValue": "Notes",
            "typeText": "Notes"
        },
        {
            "typeValue": "MilestonesAndNotes",
            "typeText": "Milestones & Notes"
        }
    ]);

    self.allTypesSelected = ko.pureComputed(function(){
       var notSelected =  _.filter(self.clonedSelectedObjects(), function(obj) {
           return (obj.subscriptionType() === "") || (!obj.subscriptionType()) && (obj.subscriptionEnabled() === true);
       });
        return (notSelected.length && (notSelected.length > 0)) ? false : true;
    });

    self.initialized = ko.observable(false);

    self.selectedObjects.subscribe(function(){
        self.clonedSelectedObjects(self.selectedObjects());
    });

    self.typeAheadIsActive.subscribe(function(value){
       if(value === true) {
           self.resizeTable();
       }
    });

    self.resizeTable = function() {
        $(".mettel-typeahead-list").css(
            {
                "max-height": self.selectedObjectsTableHeight() + "px",
                "overflow-y": "auto"
            }
        );
    };

    self.clonedSelectedObjects.subscribe(function (value) {
        self.resizeTable();
        _.delay(self.formatUniform, 200);
    });

    self.formatUniform = function() {
        $('[data-mettel-class="combo-box"]').uniform({
            selectClass: 'mettel-combo-box',
            selectAutoWidth: false
        });
    };

    self.setSubscribedToEmails = function() {
        self.subscribedToEmails = self.ticketModel.subscribedToEmails.subscribe(function (value) {
            self.handleCurrentUserSubscriptionChange(value);
        });
    };

    self.init = function () {

        var afterInitialLoad = function() {
            self.setSubscribedToEmails();
            self.initialized(true);
        };

        var bindModalCloseEvent = function() {
            $("body").click(function (event) {
                var target = $(event.target);
                if (target.is($(".mettel-close-button"))) {
                    self.resetSelections();
                }
            });
        };

        self.ticketModel.currentUserObject.subscribe(function(value){

            var setCurrentUser = function() {
                var currentUser = {
                    "dirId": self.ticketModel.currentUserObject().DirID,
                    "userName": self.ticketModel.currentUserObject().UserName,
                    "fullName": self.ticketModel.currentUserObject().FirstName + " " + self.ticketModel.currentUserObject().LastName,
                    "name": self.ticketModel.currentUserObject().FirstName + " " + self.ticketModel.currentUserObject().LastName,
                    "email": self.ticketModel.currentUserObject().Email,
                    "subscriptionType": "MilestonesAndNotes",
                    "subscriptionEnabled": true
                };
                currentUser = ko.mapping.fromJS(currentUser);
                self.currentUser(currentUser);
            };

            if(!self.initialized()) {
                setCurrentUser();
                self.refreshSubscriptionList(afterInitialLoad);
                bindModalCloseEvent();
            } else {
                self.refreshSubscriptionList();
            }
        });
    };

    self.refreshSubscriptionList = function (callback) {
        //We would do this if the return object from save was a new ticket

        for (var i = 0; i < self.ticketModel.subscribers().length; i++) {
            self.ticketModel.subscribers()[i].subscriptionEnabled = true;
        }

        var subscribers = ko.mapping.fromJS(self.ticketModel.subscribers);
        self.selectedObjects(subscribers());
        if(_.isFunction(callback)) {
            callback.apply(self, arguments);
        }
    };

    self.handleCurrentUserSubscriptionChange = function (value) {
        if (value === false) {
            self.removeSelection(self.currentUser());
            self.saveSubscribers();
        } else if (value === true) {
            self.resizeTable();
            self.selectedObjects.push(self.currentUser());
            self.saveSubscribers();
        }
    };

    /* check to see if either part of selectedObjects of clonedSelectedObjects
        so we know whether or not to display in typeahead select list
     */
    self.isAlreadySelected = function (item) {

        var selectedObject = _.filter(self.selectedObjects(), function (suggestion) {
            return (suggestion[self.valueProperty]().toString() === item.toString()) && suggestion.subscriptionEnabled();
        });
        selectedObject = selectedObject.length ? true : false;

        var clonedObject = _.filter(self.clonedSelectedObjects(), function (suggestion) {
            return suggestion[self.valueProperty]().toString() === item.toString();
        });
        clonedObject = clonedObject.length ? true : false;

        return ((!selectedObject && !clonedObject) || (!selectedObject && clonedObject)) ? false : true;
    };

    self.doOnBlur = function() {
        //
    };

    self.doOnFocus = function() {
        //
    };

    /* make sure toggle status is correct based
        upon whether not current user is subscribed */
    self.checkSubscriptionStatus = function() {

        var ifOwn = _.filter(ko.mapping.toJS(self.selectedObjects()), function(user) {
            return ((self.currentUser().userName().toLowerCase() === user.userName.toLowerCase()) && (user.subscriptionEnabled === true));
        });

        var state = (ifOwn.length > 0) ? true : false;

        self.subscribedToEmails.dispose();
        self.ticketModel.subscribedToEmails(state);
        self.setSubscribedToEmails();
    };

    self.saveSubscribers = function (callback) {

        /* Only send back objects w/ enabled subscription */
        var filtered = _.filter(ko.mapping.toJS(self.clonedSelectedObjects), function(item){
            return item.subscriptionEnabled === true;
        });

        var sendData = {};
            sendData.subscribers = ko.mapping.toJS(filtered);
            sendData.ticketId = self.ticketModel.id();

        $.ajax({
            url: options.endPoints.saveSubscriberList,
            type: "POST",
            data: ko.toJSON(sendData),
            contentType: "application/json",
            success: function (data) {
                /* they are just sending "ok" back.
                make sure only the selected objects are display.
                We may want to pull the ticket again in the future */
                //filtered = ko.mapping.fromJS(filtered);
                self.selectedObjects(ko.mapping.fromJS(filtered)());
                self.checkSubscriptionStatus();
            },
            complete: function () {
                self.hasError(false);
                $('.mettel-typeahead-list-container').modalWindow("close");
                if(_.isFunction(callback)) {
                    callback.apply(self, arguments);
                }
            }
        });
    };

    self.selectedObjectsTableHeight = function () {
        var tableHeight = $(".mettel-selected-list-container").height();
        var modalHeaderHeight = $(".mettel-modal-header").height();
        var modalFooterHeight = $(".mettel-modal-footer").height();
        var modalHeight = $(".mettel-modal-dialog").height();

        var remainingSpace = modalHeight - (tableHeight + modalHeaderHeight + modalFooterHeight);
        var approxRows = parseInt(((remainingSpace - 94) / 32), 10);
        var maxDropDownHeight = approxRows * 32;

        return (maxDropDownHeight < 32) ? 32 : maxDropDownHeight;
    };

    self.addSelection = function () {
        if (self.selectedObject()[self.textProperty]) {

            /* check to see if already selected, either enabled or disabled */
            var alreadySelected = _.filter(self.selectedObjects(), function(user) {
                return self.selectedObject().dirId.toString() === user.dirId().toString();
            });

            if(alreadySelected.length) {
                /* check to see if already selected, but disabled. If so, enable. */
                _.each(self.selectedObjects(), function (user) {
                    if ((self.selectedObject().dirId.toString() === user.dirId().toString()) && (user.subscriptionEnabled() === false)) {
                        user.subscriptionEnabled(true);
                    }
                });
            } else {
                self.selectedObject().subscriptionEnabled = true;
                self.selectedObject().subscriptionType = "";
                self.selectedObject().fullName = self.selectedObject().name;
                var selected = ko.mapping.fromJS(ko.mapping.toJS(self.selectedObject));
                self.clonedSelectedObjects.push(selected);
            }

            self.hasError(false);
            self.search("");

        } else {
            self.hasError(true);
        }
    };

    /* In case user clicks delete, but closes, and doesn't
    actually save, we want to re-enable subscriber
     */
    self.resetSelections = function() {
        var objects = self.clonedSelectedObjects();
        _.each(objects, function(object){
            object.subscriptionEnabled(true);
        });
        self.clonedSelectedObjects(objects);
    };

    self.removeSelection = function (item) {

        var objects = self.clonedSelectedObjects();
        _.each(objects, function(object){
            if(object[self.valueProperty]().toString() === item[self.valueProperty]().toString()) {
                object.subscriptionEnabled(false);
            }
        });
        self.clonedSelectedObjects(objects);
    };

    self.cancelSelection = function () {
        self.hasError(false);
        self.typeAheadIsActive(false);
    };
};

ko.bindingHandlers.selectOnBlur = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        if (viewModel.selectOnBlur === true) {
            $element.on("blur", function () {
                viewModel.doOnBlur();
            });
        }

    }
};

ko.bindingHandlers.selectOnFocus = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        if (viewModel.selectOnBlur === true) {
            $element.on("blur", function () {
                viewModel.doOnFocus();
            });
        }

    }
};

ko.bindingHandlers.typeAheadList = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        accessor.value = allBindingsAccessor().value;
        var typeAheadListModel = new TypeaheadListModel(accessor);

        typeAheadListModel.ticketModel = bindingContext.$parent;
        typeAheadListModel.init();

        ko.renderTemplate("typeahead-external-list", typeAheadListModel, {}, element, 'replaceNode');
    }
};

window.MetTel = window.MetTel || {};

MetTel.TypeaheadMultiselectModel = TypeaheadMultiselectModel = function (options) {

    ko.utils.extend(this, new TypeaheadModel(options));
    var self = this;
    self.postRenderCallback = options.postRenderCallback || false;
    self.gridViewModel = options.viewModel || false;
    self.filterColumn = options.filterColumn || false;
    self.searchFocus = ko.observable(true);
    self.selectedArray = ko.observableArray();
    self.cachedFilter = ko.observable();
    self.cachedSearchObjects = ko.observableArray();
    self.filterRules = ko.observableArray();
    self.isSelected = ko.observable(false);
    self.visibleListDisplay = ko.observable(false);
    self.updatingUniform = ko.observable(true);

    /* overridden from parent */
    self.close = function () {
        var placeholder;
        self.possibleSuggestions.removeAll();
        self.isActive(false);
        $("[data-mettel-class='mettel-typeahead-search-input']").val("");
        if (self.cachedSearchObjects().length > 0) {
            if (self.cachedSearchObjects().length > 1) {
                placeholder = self.cachedSearchObjects()[0][options.textProperty] + "...";
            } else {
                placeholder = self.cachedSearchObjects()[0][options.textProperty];
            }
        } else if (options.placeholderText) {
            placeholder = options.placeholderText;
        }
        $("[data-mettel-class='mettel-typeahead-search-input']").attr("placeholder", placeholder);
        self.searchFocus(false);

        /* we only want to make a call if selected items is > 0 and
         previous value is undefined/0. but if 0, and previous > 0, then make call
         */
        if ((self.selectedArray().length === 0) && (self.filterRules().length > 0)) {
            self.resetFilterParameters();
        } else if (self.selectedArray().length > 0) {
            self.resetFilterParameters();
        }

        self.cacheSearchObjects();
        self.gridViewModel.multiSelectSearch("");
    };

    self.clear = function () {
        self.possibleSuggestions.removeAll();
        self.selectedArray([]);
        self.cachedSearchObjects([]);
        self.cacheSearchObjects();
        $("[data-mettel-class='mettel-typeahead-search-input']").val("");
        self.searchFocus(true);
        self.gridViewModel.clearFilters();
        if (options.placeholderText) {
            $("[data-mettel-class='mettel-typeahead-search-input']").attr("placeholder", options.placeholderText);
        }
    };

    /* We need to show what is selected if they come back to search field */

    self.searchFocus.subscribe(function (val) {
        if (val === true) {
            self.visibleListDisplay(true);
            self.postRender();
        }
    });

    /* Remove line filter parameters from grid paramaters when we reset line filters */

    self.removeFilterParameters = function () {
        if (self.gridViewModel.gridParametersModel.searchFilter()) {
            var filters = JSON.parse(self.gridViewModel.gridParametersModel.searchFilter());
            return _.filter(filters.rules, function (rule) {
                return rule.field.toLowerCase() !== "wtn";
            });
        }
    };

    /*
     remove last set of query parameters from grid view model, then add newest.
     swap cached for new. this can only be used if parent grid view model is passed.
     */

    self.resetFilterParameters = function () {

        var data;
        var noLines;

        if (self.gridViewModel.gridParametersModel.searchFilter()) {
            noLines = self.removeFilterParameters();
        } else {
            noLines = [];
        }

        var filter = {
            "groupOp": "OR",
            "rules": []
        };

        self.filterRules([]);

        if (self.filterColumn) {
            ko.utils.arrayForEach(self.selectedArray(), function (row) {
                data = _.filter(self.cachedSearchObjects(), function (item) {
                    return row.toString() === item[options.valueProperty].toString();
                });
                var rule = {
                    "field": self.filterColumn,
                    "op": "eq",
                    "data": data[0][options.textProperty]
                };

                self.filterRules().push(rule);
            });
            filter.rules = filter.rules.concat(self.filterRules());

            if (noLines.length) {
                filter = _.union(filter.rules, noLines);
            }

            self.gridViewModel.gridParametersModel.page(1);
            self.gridViewModel.gridParametersModel.searchFilter(JSON.stringify(filter));
        }
    };

    self.removeLineFilter = function (data, event) {

        var newCachedSearchObjects = [];
        newCachedSearchObjects = _.filter(self.cachedSearchObjects(), function (item) {
            return data[options.valueProperty].toString() !== item[options.valueProperty].toString();
        });

        var newSelectedArray = [];
        newSelectedArray = _.filter(self.selectedArray(), function (item) {
            return data[options.valueProperty].toString() !== item.toString();
        });

        self.selectedArray(newSelectedArray);
        self.cachedSearchObjects(newCachedSearchObjects);

        self.resetFilterParameters();

    };

    self.cacheSearchObjects = ko.computed(function () {
        var cached = [];
        $.each(self.selectedArray(), function (key, value) {
            var item = _.filter(self.possibleSuggestions(), function (possibleSuggestion) {
                return possibleSuggestion[options.valueProperty] === value;
            });
            if (item[0] !== undefined) {
                cached.push(item[0]);
            }
        });
        if (cached.length > 0) {
            self.cachedSearchObjects(_.union(self.cachedSearchObjects(), cached));
        }
    });

    /* Used in combination with enterkey binding handler. If results have not yet
     returned when enter key pressed, listen
     for a change to possibleSuggestions(), then check all options,
     dispose() the subscription, and close() */

    self.selectAllReturned = function (event) {
        self.visibleListDisplay(false);
        if (!self.possibleSuggestions().length) {
            var subscription = self.possibleSuggestions.subscribe(function (value) {
                if (value.length) {
                    self.checkAllOptions();
                    subscription.dispose();
                    self.close();
                }
            });
        } else {
            // If results return before enter key is pressed
            self.checkAllOptions();
            self.close();
        }
    };

    /* Execute when updating finished */

    self.updatingPossibleSuggestions.subscribe(function (value) {
        if ((value === false) && (self.postRenderCallback)) {
            self.updatingUniform(true);
            self.mergeCachedSelections();
            self.postRenderCallback.apply(self, options);
        }
    });

    /* Cache selections so that when subsequent search is made
     original selections remain part of display list
     */

    self.mergeCachedSelections = function () {
        //remove dupes
        var dupesRemoved;
        dupesRemoved = _.filter(self.cachedSearchObjects(), function (element, index) {
            for (index += 1; index < self.cachedSearchObjects().length; index += 1) {
                if (_.isEqual(element, self.cachedSearchObjects()[index])) {
                    return false;
                }
            }
            return true;
        });
        self.cachedSearchObjects(dupesRemoved);
        if (self.cachedSearchObjects().length > 0) {
            var merged = _.union(self.possibleSuggestions(), self.cachedSearchObjects());
            self.possibleSuggestions(merged);
        }
    };

    self.postRender = function () {
        self.mergeCachedSelections();
        self.renderSelects();
    };

    /* Check all options.*/

    self.checkAllOptions = function () {
        $.each(self.possibleSuggestions(), function (key, value) {
            if (!$("#" + options.textProperty + "-" + value[options.valueProperty]).is(':checked')) {
                $("#number-" + value[options.valueProperty]).trigger('click');
            }
        });
    };

    /* This requires some sensitivity given the functionality of uniform() */

    self.renderSelects = function () {

        self.visibleListDisplay(true);

        var updateComplete = function() {
            self.updatingUniform(false);
        };

        var render = function () {
            $("[data-mettel-class='checkbox']").not(".mettel-uniform-applied").uniform({
                wrapperClass: 'mettel-checkbox',
                focusClass: 'mettel-checkbox-label-focused'
            }).addClass("mettel-uniform-applied");
            _.defer(updateComplete);
        };

        if ($("[data-mettel-class='checkbox']").length) {
            _.delay(render, 150);
        } else {
            var subscription = self.possibleSuggestions.subscribe(function (value) {
                if (value.length) {
                    _.delay(render, 150, subscription.dispose());
                }
            });
        }

    };

    /* make sure cached items are removed when de-selected on re-populate */

    self.selectedArray.subscribe(function () {
        var newArray = [];

        $.each(self.selectedArray(), function (key, value) {
            var item = _.filter(self.possibleSuggestions(), function (possibleSuggestion) {
                return possibleSuggestion[options.valueProperty] === value;
            });
            if (item[0] !== undefined) {
                newArray.push(item[0]);
            }
        });
        self.cachedSearchObjects(newArray);
    });

    self.selectedOptions = ko.computed(function () {
        return self.selectedArray();
    });

    /* override parent */

    ko.bindingHandlers.updateSelectedText = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var objParent = bindingContext.$parent;
            var searchTerm = objParent.multiSelectSearch();
            var $element = $(element);
            var thisName = $element.html();

            var unformattedName = viewModel[objParent.textProperty];

            searchTerm = MetTel.Utils.escapeRegExp(searchTerm);

            if (searchTerm.length >= self.stringLength) {
                var matcher = new RegExp("(" + searchTerm + ")", "ig");
                thisName = thisName.replace(matcher, "<strong>$1</strong>");
                $element.html(thisName);
            }
            else {
                $element.html(unformattedName);
            }
        }
    };

};

ko.bindingHandlers.typeAheadMultiselect = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();
        accessor.value = allBindingsAccessor().value;
        var vmTypeahead = new TypeaheadMultiselectModel(accessor);

        ko.renderTemplate("typeahead-multiselect-list", vmTypeahead, {}, element, 'replaceNode');
    }
};

ko.bindingHandlers.enterkey = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        var callback = valueAccessor();
        $(element).keypress(function (event) {
            var keyCode = (event.which ? event.which : event.keyCode);
            if ( $(event.target).filter("[data-mettel-class='mettel-typeahead-search-input']").length && keyCode === 13 ) {
                callback.call(viewModel);
                return false;
            }
            return true;
        });
    }
};




window.MetTel = window.MetTel || {};

MetTel.TypeaheadModel = TypeaheadModel = function(options) {
    var self = this;

    // info to call server
    self.stringLength = options.stringLength ? options.stringLength : 3;
    self.typeaheadUrl = options.typeaheadUrl;
    self.placeholderText = options.placeholderText;
    self.htmlId = options.htmlId;

    self.skipFirstChange = options.skipFirstChange ? options.skipFirstChange : false;
    self.useOverlay = options.useOverlay !== undefined ? options.useOverlay : true;
    self.isDirty = ko.observable(false);

    self.isActive = ko.observable(false);
    self.hasError = ko.observable(false);

    self.selectOnBlur = options.selectOnBlur || false;

    // ability to customize the data contract
    self.paramName = options.paramName || "filter";
    self.textProperty = options.textProperty || "text";
    self.valueProperty = options.valueProperty || "value";
    self.dataRoot = options.dataRoot;

    self.displaySuggestions = ko.computed(function() {
        var flgDisplay = true;

        if (self.skipFirstChange === true && self.isDirty() === false) {
            flgDisplay = false;
        }

        return flgDisplay;
    });

    self.search = options.value;// || ko.observable();

    self.results = ko.observable('0');

    self.customAction = ko.observable(options.customAction);
    self.customActionEvent = options.customActionEvent;
    self.customActionClicked = function() {
        if (self.search() !== '') {
            self.hasError(false);
        }

        if(self.customActionEvent){
            self.customActionEvent(self);
        }
    };
    self.applyTokenFilter = options.applyTokenFilter || false;
    self.tokenDefinition = options.tokenDefinition ? ko.observable(options.tokenDefinition) : ko.observable(false);

    self.selectSearchText = function() {
        if (self.search() !== undefined) {
            var found = _.find(self.possibleSuggestions(), function(value){
                return value[self.textProperty].toLowerCase() === self.search().toLowerCase();
            });

            if (found !== undefined) {
                self.selectSuggestion(found);
            }
        }
    };

    self.validateInput = options.validateInput || false;
    self.validateInputMessage = options.validateInputMessage ? ko.observable(options.validateInputMessage) : ko.observable('Please select a suggestion.');

    self.customBlurCallback = options.customBlurCallback || false;

    self.selectedObject = ko.observable({});

    self.selectedValue = ko.computed(function() {
        return self.selectedObject()[self.valueProperty];
    });

    self.selectedText = ko.computed(function() {
        return self.selectedObject()[self.textProperty];
    });

    self.selectSuggestionEvent = options.selectSuggestionEvent;

    self.localData = ko.isObservable(options.localData) ? options.localData : ko.observableArray(options.localData);
    self.usingLocalData = ko.observable(false);
    self.defaultValue = options.selectedValue || ko.observable();

    self.hideSuggestions = ko.observable(false);

    self.queryParams = ko.observable(options.queryParams);

    self.queryString = ko.computed(function() {
        var queryString = '';
        if (self.queryParams()) {
            ko.utils.arrayForEach(_.keys(self.queryParams()), function (key) {

                if (queryString) {
                    queryString += "&";
                }
                //Joy added encodeURIComponent to deal with special character
                queryString += key + "=" + encodeURIComponent(self.queryParams()[key]);
            });
        }

        return queryString.length > 0 ? '?' + queryString : '';
    });

    self.cloneQueryParams = function() {
        return $.extend({}, self.queryParams() ? self.queryParams() : {});  //Cloning the params
    };

    self.addQueryParams = function(params) {
        var clonedParams = self.cloneQueryParams(),
            keys = _.keys(params);

        _.each(keys, function(key) {
            clonedParams[key] = params[key];
        });

        self.queryParams(clonedParams);
    };

    self.removeQueryParams = function(params) {
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

    self.close = function() {
        self.possibleSuggestions.removeAll();
        self.isActive(false);
    };

    self.selectSuggestion = function(selectionObject) {

        self.hasError(false);
        self.selectedObject(selectionObject);
        self.search(selectionObject[self.textProperty]);

        if (self.selectSuggestionEvent) {
            self.selectSuggestionEvent(selectionObject);
        }

        self.possibleSuggestions.removeAll();
        self.isActive(false);

        if (self.selectedText() !== undefined && self.selectedValue() !== undefined && self.hideSuggestions() === false) {
            self.defaultValue(selectionObject[self.valueProperty]);
        }
    };

    self.possibleSuggestions = ko.observableArray().extend(
        {
            rateLimit: {
                timeout: 150,
                method: "notifyWhenChangesStop"
            }
        });
    //self.possibleSuggestions = ko.observableArray();
    self.updatingPossibleSuggestions = ko.observable(false);

    self.prePopulate = function(firstPass) {
        var found = _.find(self.localData(), function(value){
            return value[self.valueProperty] === self.defaultValue();
        });

        // found a match, select it
        if (found !== undefined) {
            self.selectSuggestion(found);
        }
        // no match found
        else {
            var newObj = {};
            newObj[self.valueProperty] = self.search();
            newObj[self.textProperty] = self.defaultValue();

            // handle prepopulation at instantiation
            if (firstPass === true) {
                self.selectSuggestion(newObj);
            }
            // handle programmatic changing of the bound observable
            // don't call selectSuggestion since that will re-set defaultValue and cause an infinite loop
            else {
                self.selectedObject(newObj);
            }
            self.search("No matches");
        }
    };

    if (!self.typeaheadUrl) {
        self.usingLocalData(true);

        // if using local data, search the local data for the observable value passed in
        if (self.defaultValue()) {
            self.prePopulate(true);
        }

        self.defaultValue.subscribe(function (value) {
            if (value) {
                self.prePopulate(false);
            }
        });
    }

    // programatically look for a suggestion and select it if it is found
    self.querySuggestions = function(suggestion) {
        if (suggestion !== undefined) {

            // hide the suggestions in the UI while doing the query
            self.hideSuggestions(true);

            // wait until we have the suggestions back
            var objSubscription = self.updatingPossibleSuggestions.subscribe(function(value) {
                if (value === false) {

                    // look for the passed text
                    var found = _.find(self.possibleSuggestions(), function(value){
                        return value[self.textProperty].toLowerCase() === suggestion.toLowerCase();
                    });

                    if (found !== undefined) {
                        self.selectSuggestion(found);
                    }

                    self.hideSuggestions(false);
                    objSubscription.dispose();
                }
            });

            self.search(suggestion);
        }
    };

    self.removeTokenStr = function(str) {
        if(str.indexOf(self.tokenDefinition()) > -1){
            var start = str.lastIndexOf(self.tokenDefinition());
            return str.substring(start + 1, str.length);
        } else {
            return false;
        }
    };

    self.search.subscribe(_.throttle(function(value) {

        if(options.applyTokenFilter) {
            value = self.removeTokenStr(value);
        }

        if(options.applyTokenFilter && (value === false)) {
            return false;
        }

        if (!self.updatingPossibleSuggestions() && self.displaySuggestions()) {

            if (self.selectedText() !== value) {

                self.defaultValue("");
                self.selectedObject({});

                if (value) {
                    value = value.trim();
                }

                if (value && value.length >= self.stringLength) {

                    var objParam = {};
                    objParam[self.paramName] = value;

                    if (self.usingLocalData() === true) {
                        self.updatingPossibleSuggestions(true);
                        self.possibleSuggestions.removeAll();
                        self.selectedObject({});

                        var suggestions = _.filter(self.localData(), function(suggestion) {
                            return suggestion[self.textProperty].substring(0, value.length).toLowerCase() === value.toLowerCase();
                        });

                        var numIndex = 0;

                        ko.utils.arrayForEach(suggestions, function(suggestion) {
                            if (numIndex < 10) {
                                self.possibleSuggestions.push(suggestion);
                                numIndex++;
                            }
                        });

                        self.updatingPossibleSuggestions(false);
                    }
                    else {
                        $.ajax( {
                            url: self.typeaheadUrl + self.queryString(),
                            data: objParam,
                            beforeSend: function() {
                                self.updatingPossibleSuggestions(true);
                            },
                            complete: function(data) {
                                self.possibleSuggestions.removeAll();
                                self.selectedObject({});
                                self.results(0);

                                var objJSON = JSON.parse(data.responseText);

                                // if a custom data root was passed, traverse the response to get to it
                                if (self.dataRoot) {
                                    if (_.isString(self.dataRoot)) {
                                        var arrRoot = self.dataRoot.split(".");

                                        _.each(arrRoot, function(value) {
                                            objJSON = objJSON[value.toString()];
                                        });

                                    }
                                }

                                if (objJSON.results >=0) {
                                    self.results(objJSON.results);
                                    objJSON = objJSON.suggestions;
                                }

                                ko.utils.arrayForEach(objJSON, function(suggestion) {
                                    self.possibleSuggestions.push(suggestion);
                                });
                                self.updatingPossibleSuggestions(false);
                            }
                        });
                    }
                }
                else {
                    self.possibleSuggestions.removeAll();
                }
            }
        }

        self.isDirty(true);

    }, 250));

    ko.bindingHandlers.updateSelectedText = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var objParent = bindingContext.$parent;
            var searchTerm = objParent.search();
            var $element = $(element);
            var thisName = $element.html();

            var unformattedName = viewModel[objParent.textProperty];

            if (searchTerm.length >= self.stringLength) {
                var matcher = new RegExp("("+searchTerm+")", "ig" );
                thisName = thisName.replace(matcher, "<strong>$1</strong>");
                $element.html(thisName);
            }
            else {
                $element.html(unformattedName);
            }
        }
    };

    ko.bindingHandlers.escapePress = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            var allBindings = allBindingsAccessor(),
                $element = $(element),
                input = $element.find('.mettel-search-input'),
                $input = $(input);

            $element.on('keydown', function (event) {
                var keyCode = (event.which ? event.which : event.keyCode);
                if (keyCode === 27) {
                    // allBindings.escapePress.call(viewModel);
                    $input.blur();
                    viewModel.close();
                    return false;
                }
                return true;
            });
        }
    };

    ko.bindingHandlers.downAndUpArrowPress = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var allBindings = allBindingsAccessor(),
                $element = $(element);

            $element.on('keydown', function (event) {
                var keyCode = (event.which ? event.which : event.keyCode);
                // 38 is up arrow, 40 is down arrow
                if ((keyCode === 38) || (keyCode === 40)) {
                    event.preventDefault();

                    if (viewModel.possibleSuggestions().length > 0) {
                        var $searchInput = $($('.mettel-search-input')[0]);
                        var $newItemLink = $($element.find('.mettel-typeahead-additional-link')[0]);
                        var $suggestedLinks = $element.find('.mettel-typeahead-link');
                        var numSuggestedLinks = $suggestedLinks.length;

                        var focusedElement = document.activeElement;
                        var $focusedElement = $(focusedElement);

                        // the 'new item' link is currently focused
                        if ($focusedElement.hasClass('mettel-typeahead-additional-link')) {
                            if (keyCode === 38) {
                                $searchInput.focus();
                            }
                            else {
                                $($suggestedLinks[0]).focus();
                            }
                        }
                        // a typeahead link is currently focused
                        else if ($focusedElement.hasClass('mettel-typeahead-link')) {
                            var arrSuggestedItems = _.toArray($suggestedLinks);
                            var focusedIndex = _.indexOf(arrSuggestedItems, focusedElement);

                            var newFocusedIndex;

                            if (keyCode === 38) {
                                newFocusedIndex = focusedIndex - 1;
                            }
                            else {
                                newFocusedIndex = focusedIndex + 1;
                            }

                            if (newFocusedIndex === -1) {
                                if ($newItemLink.length > 0) {
                                    $newItemLink.focus();
                                }
                                else {
                                    $searchInput.focus();
                                }
                            }
                            else if (newFocusedIndex === numSuggestedLinks) {
                                $searchInput.focus();
                            }
                            else {
                                $suggestedLinks[newFocusedIndex].focus();
                            }
                        }
                        // the search field is currently focused
                        else if ($focusedElement.hasClass('mettel-search-input')) {
                            if (keyCode === 38) {
                                $($suggestedLinks[numSuggestedLinks-1]).focus();
                            }
                            else if ($newItemLink.length > 0) {
                                $newItemLink.focus();
                            }
                            else {
                                $($suggestedLinks[0]).focus();
                            }
                        }
                        return false;
                    }
                }
                return true;
            });
        }
    };

};

ko.bindingHandlers.selectOnBlur = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element);

        if (viewModel.selectOnBlur === true) {
            $element.on("blur", function() {
                viewModel.selectSearchText();
            });
        }

    }
};

ko.bindingHandlers.validateTypeahead = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            strPreviousValue;

        $element.on("focus", function() {
            strPreviousValue = $element.val();
        });

        if (viewModel.validateInput) {
            $element.on("blur", function() {
                var strSearch = viewModel.search();

                if (strSearch === undefined) {
                    strSearch = '';
                }

                if (strPreviousValue !== strSearch) {
                    var arrList = _.pluck(viewModel.possibleSuggestions(), viewModel.textProperty.toString());

                    arrList = _.map(arrList, function(suggestion) {
                        return suggestion.toLowerCase();
                    });

                    var found = _.contains(arrList, strSearch.toLowerCase());

                    if (found) {
                        viewModel.hasError(false);
                    }
                    else {
                        viewModel.hasError(true);
                    }
                }
            });
        }
        else if (viewModel.customBlurCallback) {
            $element.on("blur", function() {
                viewModel.customBlurCallback(viewModel);
            });
        }

    }
};

ko.bindingHandlers.customActionConfig = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            input = ($element.parent().prev()),
            $input = $(input);

        if (!window.isSafariWindows) {
            $input.on('focus', function () {
                viewModel.isActive(true);
            });
        } else {
            $input.on('click', function () {
                viewModel.isActive(true);
            });
        }
    }
};

ko.bindingHandlers.typeAhead = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        var accessor = valueAccessor();
        accessor.value = allBindingsAccessor().value;

        var vmTypeahead = new TypeaheadModel(accessor);

        ko.renderTemplate("typeahead-list", vmTypeahead, {}, element, 'replaceNode');
    }
};

/**
 * Used for any necessary browser or operating system detection
 */

// Add a class to distinguish IE10
// Needed in hierarchy menu in locations grid where flex fails
if ($.browser.msie && $.browser.version === "10.0") {
    $("html").addClass("ie10");
}

// Distinguish Windows
if (navigator.appVersion.indexOf("Win") !== -1) {

    // Add a class to distinguish Windows
    // Needed in some grid views because of a scrollbar
    $("html").addClass("windows");

    // Distinguish Safari for Windows
    // Needed for a typeahead in Report Management page
    if ($.browser.safari) {
        window.isSafariWindows = true;
    }
}

(function (MetTel, $, undefined) {

    MetTel.Utils = {
        formatToPhoneNumber: function (text) {
            if (text) {
                text = text.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
            }
            return text;
        },
        isObservableArray: function(value) {
            // per https://github.com/knockout/knockout/pull/706#issuecomment-33545542
            return ko.isObservable(value) && 'push' in value;
        },
        /**
         * Parse query string.
         * ?a=b&c=d to {a: b, c: d}
         * @param {String} (option) queryString
         * @return {Object} query params
         */
        getQueryParams: function (queryString) {
            var query = (queryString || window.location.search).substring(1); // delete ?
            if (!query) {
                return false;
            }
            return _
                .chain(query.split('&'))
                .map(function (params) {
                    var p = params.split('=');
                    return [p[0], decodeURIComponent(p[1])];
                })
                .object()
                .value();
        },

        stripHTML: function (string, replacer) {
            // if replacer is not passed, replace with an empty string
            replacer = replacer || '';
            return string.replace(/(<([^>]+)>)/ig, replacer);
        },

        truncateCurrency: function (value) {
            if (value < 1000) {
                return '$' + value;
            } else if (value >= 1000 && value < 1000000) {
                return '$' + value / 1000 + 'k';
            } else if (value >= 1000000) {
                return '$' + value / 1000000 + 'm';
            }
        },

        formatCurrency: function (value) {
            return numeral(value).format('$0,0.00');
        },

        extractNewImage: function (e, input, imgLoadedCallback) {

            if (input.files && input.files[0]) {
                var fileName = input.files[0].name,
                    reader = new FileReader();

                // Once the image is uploaded
                reader.onload = function (e) {

                    // Fire the callback
                    imgLoadedCallback(e.target.result, fileName);
                };

                reader.readAsDataURL(input.files[0]);
                $(input).val('');
            }
        },

        capitalize: function (str) {
            return str.toLowerCase().replace(/\b[a-z]/g, function (letter) {
                return letter.toUpperCase();
            });
        },

        extractFileExtension: function(filename) {
            return (/[.]/.exec(filename)) ? /[^.]+$/.exec(filename) : undefined;
        },

        extractFileName: function(filename) {
            return filename.substr(0, filename.lastIndexOf('.'));
        },

        crawlCreateItemStates: function (data, itemStateValue) {
            // Crawl an object tree and create item state properties on all objects

            // If no item state value is passed in, default it to 'NOCHANGE'
            if (!itemStateValue) {
                itemStateValue = 'NOCHANGE';
            }

            // Check data to see if it is an object/array
            if (data && typeof data === 'object') {

                // Iterate over its values/properties and crawl them
                $.each(data, function (indexOrKey, value) {
                    MetTel.Utils.crawlCreateItemStates(value, itemStateValue);
                });

                // If it's not an array, it's an object, and so needs an item state
                if (data.constructor !== Array) {
                    data.itemState = itemStateValue;
                }
            }
        },

        crawlDeleteFunctions: function (obj) {
            // Crawl an object tree and delete any functions inside of it
            // If it's not falsy
            if (!obj) { return false; }

            // Iterate over its values/properties
            $.each(obj, function (indexOrKey, value) {

                // Check value to see if it is an object/array
                if (typeof value === 'object') {
                    // Crawl it
                    MetTel.Utils.crawlDeleteFunctions(value);
                }

                // Check if its value is a function
                else if ($.isFunction(value)) {

                    // If so delete it, that's why we're here
                    delete obj[indexOrKey];
                }
            });
        },

        createDaysDueText: function (days, breakPoint) {
            var formattedText;

            switch(true) {
                case days === 0:
                    formattedText = 'Due today';
                    break;
                case days === 1:
                    formattedText = 'Due tomorrow';
                    break;
                case days <= breakPoint:
                    formattedText = 'Due in ' + days + ' days';
                    break;
                default:
                    formattedText = 'Due in more than ' + breakPoint + ' days';
            }

            return formattedText;
        },

        escapeRegExp: function(str) {
            return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        },

        stricmp: function (a, b) {
            if (typeof a === 'undefined') {
                return false;
            }

            if (typeof b === 'undefined') {
                return false;
            }

            var opa = a, opb = b;

            while (ko.isObservable(opa)) {
                opa = ko.utils.unwrapObservable(opa);
            }
            while (ko.isObservable(opb)) {
                opb = ko.utils.unwrapObservable(opb);
            }

            if (String(opa).toLowerCase() === String(opb).toLowerCase()) {
                return true;
            }

            return false;
        },

        isNumeric: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        filteredList: function(list, searchParam, searchString) {
            // takes a list to filter, parameter on the list item to search, and a search string to search by
            // returns the filtered list
            return _.filter(list, function(item){
                return item[searchParam].toLowerCase().indexOf(searchString.toLowerCase()) !== -1;
            });
        },

        stripSpecialCharacters: function(string) {
            return string.replace(/[^\w\s]/gi, "");
        },

        replaceAllButNumbers: function(string) {
            return string.replace(/[^0-9]/gi, "");
        },

        sanitizeString: function(string) {
            if (typeof string === 'string') {
                return string.replace(/[\{\}\[\]\(\)\;\"\'<>]/g, '');
            }
        },

        slugify: function(string){
            var st = string.toString().toLowerCase();
            st = st.replace(/[\u00C0-\u00C5]/ig,'a');
            st = st.replace(/[\u00C8-\u00CB]/ig,'e');
            st = st.replace(/[\u00CC-\u00CF]/ig,'i');
            st = st.replace(/[\u00D2-\u00D6]/ig,'o');
            st = st.replace(/[\u00D9-\u00DC]/ig,'u');
            st = st.replace(/[\u00D1]/ig,'n');
            st = st.replace(/[^a-z0-9 ]+/gi,'');
            st = st.trim().replace(/ /g,'-');
            st = st.replace(/[\-]{2}/g,'');
            return (st.replace(/[^a-z\- ]*/gi,''));
        },

        // slugify with numbers intact
        slugifyNum: function(str) {
            return str.toString().toLowerCase()
                .replace(/\s+/g, '-')           // Replace spaces with -
                .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                .replace(/^-+/, '')             // Trim - from start of text
                .replace(/-+$/, '');            // Trim - from end of text
        },

        randomId: function(length) {
            var newId = '',
                chars = '0123456789abcdefghijklmnopqrstuvwxyz';

            if (!length) {
                length = 5;  // default to 5
            }

            for (var i = length; i > 0; i--) {
                newId += chars[Math.floor(Math.random() * chars.length)];
            }

            return newId;
        }
    };
}(window.MetTel = window.MetTel || {}, jQuery));

// TODO: Pull MetTel functions in in a cleaner way

String.prototype.trimEnd = function String$trimEnd() {
    /// <summary locid="M:J#String.trimEnd" />
    /// <returns type="String"></returns>
    return this.replace(/\s+$/, '');
};

(function (MetTel, $, undefined) {

    MetTel.Variables = {
        'focusableSelectors' : 'input, select, textarea, a, button'
    };

}(window.MetTel = window.MetTel || {}, jQuery));

function VarianceModel(options) {
    var self = this;
    self.options = options ? options : {};

    // The list of locations
    this.locations = ko.observableArray();

    // Get Variance data for the first time
    this.init = function (callback) {

        // Set url with filter params
        var url = self.endPoints.getVarianceData + self.queryString();

        // Go fetch the Variance data
        $.getJSON(url, function (data) {
            self.locations(data.locations);
            if (callback) {
                callback(data);
            }
        });

    };

    // When a location is clicked, fire the custom callback to open a location
    this.triggerOpenLocation = function (location) {
        self.openLocation(location);
    };

}

ko.bindingHandlers.truncateVarianceLocation = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            text = valueAccessor().text,
            maxLines = valueAccessor().maxLines,
            lineHeight = $element.css('line-height'),
            maxHeight,
            checkAndTruncate = function (text) {
                var newText;

                if ($element.outerHeight() > maxHeight) {
                    // If it's overflowing, remove the last character
                    newText = text.slice(0, -1);
                    $element.text(newText);

                    // And check again
                    checkAndTruncate(newText);
                } else {
                    // If it's not overflowing anymore, take off three more characters
                    newText = text.slice(0, -3);

                    if (newText.charAt(newText.length - 1) === ' ') {
                        // If the last character is a space, remove it too
                        newText = newText.slice(0, -1);
                    }

                    // And add the ellipsis
                    newText = newText + '...';
                    $element.text(newText);
                }
            };

        // Flag for title truncation
        viewModel.titleTruncated = false;

        // Remove 'px' from line height
        if (lineHeight.indexOf('px') > 0) {
            lineHeight = lineHeight.substring(0, lineHeight.indexOf('px'));
        }

        // Set max height based on max lines and line height
        maxHeight = lineHeight * maxLines;

        // Set text initially to be tested
        $element.text(text);

        // Initial test to see if text is overflowing
        if ($element.outerHeight() > maxHeight) {

            // Truncate it
            checkAndTruncate(text);

            // If truncated, include the tooltip in the markup
            viewModel.titleTruncated = true;

            // Find tooltip and setup events
            var $tooltip = $element.parent('[data-mettel-class="variance-location-title"]').siblings('[data-mettel-class="variance-title-tooltip-container"]');

            $element.on({
                'mouseenter': function () {
                    $tooltip.show();
                },
                'mouseleave': function () {
                    $tooltip.hide();
                }
            });
        }
    }
};

ko.bindingHandlers.variance = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var options = $.extend({}, valueAccessor(), viewModel.options ? viewModel.options : {});

        MetTel.DashboardBaseModel.apply(viewModel, [options]);

        if (options) {
            viewModel.endPoints = options.endPoints;
            viewModel.openLocation = options.openLocation;
        }

        viewModel.init();

        ko.applyBindingsToNode(element, {
            template: {
                name: 'variance',
                data: viewModel
            }
        }, bindingContext);

        return { controlsDescendantBindings: true };
    }
};

ko.bindingHandlers.varianceHeight = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

        // This custom binding is only used for browsers that don't support flexbox (IE9)
        if (!Modernizr.flexbox && !Modernizr.flexboxlegacy) {

            var $element = $(element),
                offsetElementSelectors = valueAccessor(),
                $window = $(window),
                windowHeight,
                elementNewHeight,
                calculateAndSetHeight = function () {

                    // Using a fixed value here because as the page is loading, the header changes height
                    var offsetHeight = 77;

                    windowHeight = $window.outerHeight();

                    // Find all the elements if they're being displayed, get their heights, and add them all
                    $.each(offsetElementSelectors, function (i, elementSelector) {
                        offsetHeight = offsetHeight + $(elementSelector).outerHeight();
                    });

                    // Calculate and set the new height of the variance container
                    elementNewHeight = windowHeight - offsetHeight;
                    $element.css('height', elementNewHeight + 'px');

                };

            // Invoke on load
            calculateAndSetHeight();

            // Attach the function to the view model so it can be invoked elsewhere
            viewModel.calculateAndSetHeight = calculateAndSetHeight;

            // Invoke on resize but debounce it
            var debounceCaclAndSetHeight = _.debounce(function () {
                calculateAndSetHeight();
            }, 500);

            $window.resize(function () {
                debounceCaclAndSetHeight();
            });
        }
    }
};

ko.bindingHandlers.varianceScoreChart = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            score = valueAccessor().score,
            percentChange = valueAccessor().percentChange,
            difference = 100 - score,
            startAngle = ((360 * (-difference / 100)) / 2) + 90,
            backgroundColor = '#EBEBEB',
            positiveScoreColor = '#E9A623',
            negativeScoreColor = '#67B1ED',
            scoreColor;

        // Set score color based on percent change
        if (percentChange >= 0) {
            scoreColor = positiveScoreColor;
        } else {
            scoreColor = negativeScoreColor;
        }

        $element.kendoChart({
            legend: {
                visible: false
            },
            chartArea: {
                background: 'transparent',
                margin: 0,
                width: 192,
                height: 192
            },
            plotArea: {
                margin: 0
            },
            seriesDefaults: {
                type: 'donut',
                startAngle: startAngle,
                size: 6,
                holeSize: 90,
                overlay: {
                    gradient: 'none'
                }
            },
            series: [
                {
                    name: 'score',
                    data: [
                        {
                            category: 'background',
                            value: difference,
                            color: backgroundColor
                        },
                        {
                            category: 'score',
                            value: score,
                            color: scoreColor
                        }
                    ]
                }
            ]
        });

    }
};

ko.bindingHandlers.varianceHistorySparkline = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var $element = $(element),
            history = valueAccessor().history,
            historyMin = Math.min.apply( Math, history ),
            historyMax = Math.max.apply( Math, history ),
            dollarChange = valueAccessor().dollarChange,
            grayColor = '#999999',
            positiveMarkerColor = '#E9A623',
            negativeMarkerColor = '#67B1ED',
            markerColor;

        if (dollarChange >= 0) {
            markerColor = positiveMarkerColor;
        } else {
            markerColor = negativeMarkerColor;
        }

        $element.kendoSparkline({
            type: 'line',
            series: [
                {
                    data: history,
                    color: grayColor,
                    width: 1,
                    markers: {
                        visible: true,
                        background: markerColor,
                        size: 5,
                        border: {
                            width: 0
                        }
                    }
                }
            ],
            tooltip: {
                visible: false
            },
            categoryAxis: {
                line: {
                    visible: false
                },
                crosshair: {
                    visible: false
                }
            },
            valueAxis: {
                min: historyMin,
                max: historyMax
            },
            chartArea: {
                width: 86,
                height: 26,
                margin: 3,
                background: 'transparent'
            }
        });

    }
};

ko.bindingHandlers.shippingOptionsRadioButton = {
    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var accessor = valueAccessor();

        accessor.enable = allBindingsAccessor().enable || allBindingsAccessor().enable === false ? allBindingsAccessor().enable : true;
        accessor.afterRenderCallback = accessor.afterRenderCallback;
        accessor.checked = allBindingsAccessor().checked;
        accessor.checkedValue = allBindingsAccessor().checkedValue;
        accessor.htmlValue = $(element).attr('value');
        accessor.htmlId = $(element).attr('id');
        accessor.htmlName = $(element).attr('name');

        if (accessor.click === undefined) {
            accessor.click = $.noop();
        }

        ko.renderTemplate("radio-button-shipping-template", accessor, {
            afterRender: function (nodes) {
                if (accessor.afterRenderCallback) {
                    // get the rendered label element
                    var elements = nodes.filter(function (node) {
                        // Ignore any #text nodes before and after the modal element.
                        return node.nodeType === 1;
                    });

                    var $container = $(elements[0]);

                    accessor.afterRenderCallback($container);

                }

            }
        }, element, 'replaceNode');
    }
};
