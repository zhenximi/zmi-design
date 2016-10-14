var count = 0;
var list = "";

for (var i= 0xE001; i < 0xE090; i++) {
  var iHEX = i.toString(16).toUpperCase();
  list = list + "<li>" + "<span class=\"icon-name\">" + iHEX +"</span>" + "<span class=\"icon-name\">&#x" + iHEX +";</span></li>"
}
console.log (list);
$( document ).ready(function() {
    $('#num-list').html(list);
});
