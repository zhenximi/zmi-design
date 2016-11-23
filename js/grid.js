$(document).ready(function() {
    $('#sample').DataTable(
      {
        "scrollY":        600,
        "scrollCollapse": true,
        "deferRender":    true,
        "scroller":       true,
        "paging": false,
        "serverSide": true,
        "ordering": false,
        "searching": false,
        "info": false,
        "ajax": "data/objects.txt",
        "columns": [
        { "data": "Date" },
        { "data": "ServiceService" },
        { "data": "TypeType" },
        { "data": "UsageUsage" }
      ]
      }
    );
    // $('#sample2').w2grid({
    //     name: 'grid',
    //     header: 'List of Names',
    //     url: 'data/objects.txt',
    //     columns: [
    //         { field: 'fname', caption: 'First Name', size: '30%' },
    //         { field: 'lname', caption: 'Last Name', size: '30%' },
    //         { field: 'email', caption: 'Email', size: '40%' },
    //         { field: 'sdate', caption: 'Start Date', size: '120px' }
    //     ]
    // });

} );
