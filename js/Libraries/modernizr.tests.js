/**
 * Test detecting if scrollbars are available
 * on overflow-scroll elements.
 */
Modernizr.addTest('overflowscroll',function(){

    var container = document.createElement('div');
    container.style.cssText= 'height: 200px; width: 400px; overflow:scroll';

    var content = document.createElement('div');
    content.style.cssText= 'height: 400px;';
    container.appendChild(content);

    var fake = false,
        root = document.body || (function () {
                fake = true;
                return document.documentElement.appendChild(document.createElement('body'));
            }());

    var oldCssText = root.style.cssText;
    root.style.cssText = 'padding:0;margin:0';
    root.appendChild(container);

    var result =  container.clientWidth != container.offsetWidth;

    root.removeChild(container);
    root.style.cssText = oldCssText;

    if (fake) {
        document.documentElement.removeChild(root);
    }

    return result;
});
