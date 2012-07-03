

$(function () {
  var oTable = $('#logs').dataTable({
    "bScrollInfinite": true,
    "bScrollCollapse": true,
    "sScrollY": "429px",
    // "sScrollX": "100%",
    "bPaginate": false,
    "bFilter": false,
    "bInfo": false,
    "bSort": false,
    "bSortable": false
  });

  $(window).bind('resize', function () {
    $.doTimeout('resize', 250, function () {
      oTable.fnAdjustColumnSizing();
    });
  });

});
