var count = 0;
var list = "";
var current = 0xE08B;
for (var i= 0xE001; i < current; i++) {
  var iHEX = i.toString(16).toUpperCase();
  list = list + "<li>" + "<span class=\"icon-name\">" + iHEX +"</span>" + "<span class=\"icon\">&#x" + iHEX +";</span></li>"
}
console.log (list);
$( document ).ready(function() {
    $('#num-list').html(list);
});
