
$(function () {

  var

    /** Current section anchor point. **/
    _section,

    /** Easy scroll helper to use cross app. **/
    scrollHelper = function (section, callback) {
      section = section || _section || "#place_locator";
      $(".tab-pane.active").scrollTo(section, 400, {
        easing: 'easeOutExpo',
        onAfter: callback || $.noop
      });
      // store displacement
      _section = section;
    },
    map_bounds_size = false;

  /** Layout **/

  var a = $(window);

  if (!Modernizr.flexbox && !Modernizr['flexbox-legacy']) {
    var c = $("#box"), d = c.closest(".container");
    c.bind("center", function () {
      var e = a.height() - d.height(), f = Math.floor(e / 2);
      if (f > 0) {
        d.css({marginTop: f});
      }
    }).trigger("center");
    a.resize(function () {
      $.doTimeout('resize', 250, function () {
        c.trigger("center");
      });
    });
  }

  a.resize(function () {
    $.doTimeout('resize', 250, function () {
      // map size changed ??
    });
  });

  // set main map size
  $("#map").height(
    $("#1").outerHeight() -
    $("#view .page-header").outerHeight() - 18 -
    // $("#view .alert").outerHeight() - 18 -
    // $("#view #btn-back").outerHeight() - 18 -
    2
  );

  // select first form element
  $("form :input:visible:enabled:first").select().focus();

  /** Page events. **/

  var marker, bounds = new google.maps.LatLngBounds(), map, map_bounds, shared_polygon;

  $("#home form").submit(function (e) {
    // console.debug('Home form submit event...');
    e.preventDefault();
    var area = $("form .area"), button = $("form button"), keywords = $("#search #keywords");
    // prevent iPhone issue
    area.css({height: button.outerHeight()});
    button.hide();
    keywords.attr("readonly", true);

    $.ajax({
      type: "POST",
      url: '/search',
      // dataType: "json",
      data: {
        keywords: keywords.val(),
        bounds: bounds.getNorthEast().lat() + "," + bounds.getNorthEast().lng() + "|" +
          bounds.getSouthWest().lat() + "," + bounds.getSouthWest().lng()
      },
      error: function (xhr, status) {
        console.error(status);
      },
      success: function (data, textStatus, jqXHR) {
        data = $.parseJSON(data);
        console.info('Yay, data: %o', data);
        if (data.results.length > 0) {
          var coords = data.results[0].geometry.location, pos = new google.maps.LatLng(coords.lat, coords.lng);
          if (marker) {
            marker.setPosition(pos);
          } else {
            marker = new google.maps.Marker({
              position: pos,
              map: map,
              clickable: false
            });
          }
          map.setCenter(pos);
          map.setZoom(16);
          // go to map ...
          scrollHelper("#view", function () {
            // pass
          });
        }
      },
      complete: function (jqXHR, textStatus) {
        button.show();
        keywords.attr("readonly", false).focus();
      }
    });

  });

  $("body").on("click", "#btn-back", function (event) {
    var area = $("form .area"), button = $("form button"), keywords = $("#search #keywords");
    // console.debug('Cancel button click event fired...');
    scrollHelper("#place_locator", function () {
      button.show();
      keywords.attr("readonly", false).focus();
    });
  });

  $("body").on("click", ".nav-tabs a[data-toggle='tab']", function (event) {
    var index = $(this).attr("href"), area = $("form .area"), button = $("form button"),
      keywords = $("#search #keywords");
    if (index === "#2") {
      if (map_bounds_size === false) {
        $("#map-bounds").height(
          $("#2").outerHeight() -
          $("#2 .page-header").outerHeight() - 18 -
          2
        );
        map_bounds_size = true;
        // initialize map
        initializeBoundsMap();
      }
      google.maps.event.trigger(map_bounds, 'resize');
    } else {
      google.maps.event.trigger(map, 'resize');
      scrollHelper("#place_locator", function () {
        button.show();
        keywords.attr("readonly", false).focus();
      });
    }
  });

  // default coords
  var triangleCoords = [
    new google.maps.LatLng(-43.26519102639606, -65.38240830126955),
    new google.maps.LatLng(-43.29753940849775, -65.28676429003906),
    new google.maps.LatLng(-43.26099753659681, -65.23561389794924),
    new google.maps.LatLng(-43.21983026907506, -65.29466776074219),
    new google.maps.LatLng(-43.237691354803474, -65.32419586669914),
    new google.maps.LatLng(-43.246938002453014, -65.38343826953127)
  ];

  for (var i = 0; i < triangleCoords.length; i++) {
    bounds.extend(triangleCoords[i]);
  }

  function updateBounds(path) {
    var clone = [];
    // override bounds
    bounds = new google.maps.LatLngBounds();
    for (var j = 0; j < path.getLength(); j++) {
      var point = path.getAt(j);
      bounds.extend(point);
      clone.push(point);
    }
    // update path in shared
    shared_polygon.setPath(clone);
  }

  /** Initialize main map. */

  (function () {

    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: bounds.getCenter(),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: true,
      minZoom: 4
    });

    // map.fitBounds(bounds);

    shared_polygon = new google.maps.Polygon({
      paths: triangleCoords,
      strokeColor: "#0000FF",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#0000FF",
      fillOpacity: 0.25,
      clickable: false
    });

    shared_polygon.setMap(map);

  }());

  /** Initialize bounds map. */

  function initializeBoundsMap() {

    map_bounds = new google.maps.Map(document.getElementById('map-bounds'), {
      zoom: 10,
      center: bounds.getCenter(),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: true,
      minZoom: 4
    });

    map_bounds.fitBounds(bounds);

    var polyOptions = {
      strokeWeight: 0,
      fillOpacity: 0.45,
      editable: true
    };

    var drawingManager = new google.maps.drawing.DrawingManager({
      // drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      drawingControlOptions: {
        drawingModes: [google.maps.drawing.OverlayType.POLYGON]
      },
      polylineOptions: {
        editable: true
      },
      polygonOptions: polyOptions,
      map: map_bounds
    });

    var polygon = new google.maps.Polygon({
      paths: triangleCoords,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.35,
      editable: true
    });

    polygon.setMap(map_bounds);

    google.maps.event.addListener(polygon.getPath(), 'insert_at', function (evt) {
      console.info('Vertex inserted.');
      updateBounds(this);
    });

    google.maps.event.addListener(polygon.getPath(), 'remove_at', function (evt) {
      console.info('Vertex removed.');
      updateBounds(this);
    });

    google.maps.event.addListener(polygon.getPath(), 'set_at', function (evt) {
      console.info('Vertex moved.');
      updateBounds(this);
    });
  }

});
