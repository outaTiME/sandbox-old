

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

  /*

  $('div.modal').on('shown', function () {
    console.info("id %s modal, shown ...", $(this).attr('id'));
    hljs.highlightBlock($('pre code', this).get(0));
  });

  */

  // color
  hljs.initHighlightingOnLoad();

});
