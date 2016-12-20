$(document).ready(
  function() {
    //Grab the inline template
    var template = document.getElementById('render-partial').innerHTML;

    //Parse it (optional, only necessary if template is to be used again)
    Mustache.parse(template);

    //Render the data into the template
    var rendered = Mustache.render(template, {reportName: "Revenue Report", reportGroup: "Administrative", formatName: "Microsoft Excel (xlsx)", requestedTime: "11/14/2016 12:36", requestedBy: "zmi@mettel.net"});

    //Overwrite the contents of #target with the rendered HTML
    document.getElementById('render-partial').innerHTML = rendered;
  }
);
