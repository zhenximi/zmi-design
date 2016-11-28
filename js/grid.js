$(document).ready(function() {
    // $('#sample').DataTable({
    //     "scrollY": 300,
    //     "paging": false,
    //     "searching": false,
    //     "info": true,
    //     "ajax": "data/objects.txt",
    //     "columns": [{
    //         "data": "Date"
    //     }, {
    //         "data": "ServiceService"
    //     }, {
    //         "data": "TypeType"
    //     }, {
    //         "data": "UsageUsage"
    //     }]
    // });
    $('#sample').DataTable( {
      ajax: {
        url: "zmi-design/data/objects.txt",
        type: "GET"
      },
      columns: [{
          "data": "Date"
      }, {
          "data": "ServiceService"
      }, {
          "data": "TypeType"
      }, {
          "data": "UsageUsage"
      }],
        deferRender:    true,
        scrollY:        200,
        scrollCollapse: true,
        scroller:       true,
        stateSave:      true
    } );
    $('#sample2').DataTable ( {
        serverSide: true,
        ordering: false,
        processing: true,
        searching: false,
        ajax: function ( data, callback, settings ) {
            var out = [];

            for ( var i=data.start, ien=data.start+data.length ; i<ien ; i++ ) {
                out.push( [ i+'-1', i+'-2', i+'-3', i+'-4', i+'-5' ] );
            }

            setTimeout( function () {
                callback( {
                    draw: data.draw,
                    data: out,
                    recordsTotal: 12217,
                    recordsFiltered: 12217
                } );
            }, 1 );
        },
        deferLoading: [300, 500],
        scrollY: 200,
        scroller: {
            loadingIndicator: true,
            serverWait: 100,
            displayBuffer: 50
        },
        language: {
          "loadingRecords": "Please wait - get records from server..."
        }
    } );
    $(function() {
        $('#grid').w2grid({
            name: 'grid',
            show: {
                toolbar: false,
                footer: true,
            },
            columns: [{
                field: 'personid',
                caption: 'ID',
                size: '100px',
                sortable: true,
                resizable: true,
                searchable: 'int'
            }, {
                field: 'fname',
                caption: 'First Name',
                size: '200px',
                sortable: true,
                resizable: true,
                searchable: true
            }, {
                field: 'lname',
                caption: 'Last Name',
                size: '200px',
                sortable: true,
                resizable: true,
                searchable: true
            }, {
                field: 'email',
                caption: 'Email',
                size: '100%',
                resizable: true,
                sortable: true
            }],
        });
        generate(12217);
    });

    function generate(num) {
        var fname = ['Vitali', 'Katsia', 'John', 'Peter', 'Sue', 'Olivia', 'Thomas', 'Sergei', 'Alexander', 'Anton', 'Divia'];
        var lname = ['Peterson', 'Rene', 'Johnson-Petrov', 'Cuban', 'Twist', 'Sidorov', 'Vasiliev', 'Hertz', 'Volkov'];
        w2ui.grid.records = [];
        for (var i = 0; i < num; i++) {
            w2ui['grid'].records.push({
                recid: i + 1,
                personid: i + 1,
                fname: fname[Math.floor(Math.random() * fname.length)],
                lname: lname[Math.floor(Math.random() * lname.length)],
                email: 'vm@gmail.com',
                sdate: '1/1/2013',
                manager: '--'
            });
        }
        w2ui.grid.buffered = w2ui.grid.records.length;
        w2ui.grid.total = w2ui.grid.buffered
        w2ui.grid.refresh();
    }

});
