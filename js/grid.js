$(document).ready(function() {
    $('#sample').DataTable(
      {
        "ajax": "data/objects.txt",
        "paging": false,
        "columns": [
        { "data": "Date" },
        { "data": "ServiceService" },
        { "data": "TypeType" },
        { "data": "UsageUsage" }
  ]
      }
    );
} );
