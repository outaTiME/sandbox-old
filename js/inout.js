

/** Main method, will be called from template. **/
function initialize(data) {

  // prototype google maps

  // Poygon getBounds extension - google-maps-extensions
  // http://code.google.com/p/google-maps-extensions/source/browse/google.maps.Polygon.getBounds.js
  if (!google.maps.Polygon.prototype.getBounds) {
    google.maps.Polygon.prototype.getBounds = function (latLng) {
      var bounds = new google.maps.LatLngBounds();
      var paths = this.getPaths();
      var path;

      for (var p = 0; p < paths.getLength(); p++) {
        path = paths.getAt(p);
        for (var i = 0; i < path.getLength(); i++) {
          bounds.extend(path.getAt(i));
        }
      }

      return bounds;
    };
  }

  // Polygon containsLatLng - method to determine if a latLng is within a polygon
  google.maps.Polygon.prototype.containsLatLng = function (latLng) {
    // Exclude points outside of bounds as there is no way they are in the poly
    var bounds = this.getBounds();

    if (bounds !== null && !bounds.contains(latLng)) {
      return false;
    }

    // Raycast point in polygon method
    var inPoly = false;

    var numPaths = this.getPaths().getLength();
    for (var p = 0; p < numPaths; p++) {
      var path = this.getPaths().getAt(p);
      var numPoints = path.getLength();
      var j = numPoints - 1;

      for (var i = 0; i < numPoints; i++) {
        var vertex1 = path.getAt(i);
        var vertex2 = path.getAt(j);

        if (vertex1.lng() < latLng.lng() && vertex2.lng() >= latLng.lng() || vertex2.lng() < latLng.lng() && vertex1.lng() >= latLng.lng())  {
          if (vertex1.lat() + (latLng.lng() - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < latLng.lat()) {
            inPoly = !inPoly;
          }
        }

        j = i;
      }
    }

    return inPoly;
  };

  // own code

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

  var a = $(window), c = $("#box");

  function block() {
    $('#home #box .overlay').show();
  }

  function unblock() {
    $('#home #box .overlay').hide();
  }

  if (!Modernizr.flexbox && !Modernizr['flexbox-legacy']) {
    var d = c.closest(".container");
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

  function checkLocationSize(section) {
    var location_span = $('section#' + section + ' .page-header span');
    var width = $('section#' + section + ' div.page-header').outerWidth() -
      $('section#' + section + ' div.page-header i').outerWidth() -
      $('section#' + section + ' div.page-header button').outerWidth() -
      9 - // icon margin
      18;
    location_span.width(width);
  }

  checkLocationSize('view');

  a.resize(function () {
    $.doTimeout('resize', 250, function () {
      // map size changed ??
      checkLocationSize('view');
    });
  });

  // set main map size
  $("#map").height(
    $("#1").outerHeight() -
    $("#view .page-header").outerHeight() - 18 -
    // $("#view .alert").outerHeight() - 18 -
    // $("#view #btn-back").outerHeight() - 18 -
    4
  );

  /** Page events. **/
  var marker, bounds = new google.maps.LatLngBounds(), map, map_bounds, shared_polygon, triangleCoords = [];

  /** Parse input data. **/
  var d_bounds = data;
  if (d_bounds.length > 0) {
    var d_points = d_bounds[0].points;
    if (d_points.length > 0) {
      for (var i = 0; i < d_points.length; i++) {
        var d_point = d_points[i], latlng = new google.maps.LatLng(d_point.lat, d_point.lng);
        triangleCoords.push(latlng);
        bounds.extend(latlng);
      }
    }
  }

  /** Attach inout classes to elem. **/
  function inoutClass(elem, inside) {
    // remove clases (if applied)
    elem.removeClass('in');
    elem.removeClass('out');
    // attach new clases
    if (inside === true) {
      elem.addClass('in');
    } else {
      elem.addClass('out');
    }
  }

  $("#home form").submit(function (e) {
    var found = false;
    $("form .control-group").removeClass("error");
    // console.debug('Home form submit event...');
    e.preventDefault();
    block();
    // blur
    $("form :input:visible:enabled:first").blur();
    var area = $("form .area"), button = $("form button"), keywords = $("#search #keywords");
    $.ajax({
      type: "GET",
      url: '/inout/address',
      // dataType: "json",
      data: {
        keywords: keywords.val(),
        bounds: bounds.getNorthEast().lat() + "," + bounds.getNorthEast().lng() + "|" +
          bounds.getSouthWest().lat() + "," + bounds.getSouthWest().lng()
      },
      error: function (xhr, status) {
        // console.error(status);
      },
      success: function (data, textStatus, jqXHR) {
        // console.info('Yay, data: %o', data);
        var results = data.results;
        for (var i = 0; i < results.length; i++) {
          var result = results[i], type = result.types[0];
          // if (type === "street_address" || type === "route") {
          var coords = result.geometry.location, pos = new google.maps.LatLng(coords.lat, coords.lng),
            icon_elem = $("section#view .page-header i"), title_elem = $("section#view .page-header span"),
            map_elem = $("section#view #map"), map_container_elem = $(".map-container");
          if (marker) {
            marker.setPosition(pos);
          } else {
            marker = new google.maps.Marker({
              position: pos,
              map: map,
              clickable: false
            });
          }
          // update title
          title_elem.text(data.results[0].formatted_address);
          // title_elem.textOverflow();
          var contains = shared_polygon.containsLatLng(pos);
          // attach classes
          inoutClass(icon_elem, contains);
          inoutClass(title_elem, contains);
          inoutClass(map_elem, contains);
          // hide
          $(".inside, .outside", map_container_elem).hide();
          // bounds management
          if (contains) {
            // green
            map.setCenter(pos);
            map.setZoom(16);
            // show
            $(".inside", map_container_elem).show();
          } else {
            // red
            var bounds_ext = new google.maps.LatLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
            bounds_ext.extend(pos);
            var distance = google.maps.geometry.spherical.computeDistanceBetween(bounds.getCenter(), pos) / 1000;
            // show
            var outside = $(".outside", map_container_elem);
            $("p.small", outside).text(distance.toFixed(1) + "kms away");
            outside.show();
            if (distance > 1500) {
              map.setCenter(pos);
              map.setZoom(6);
            } else {
              map.fitBounds(bounds_ext);
            }
          }
          unblock();
          // go to map ...
          scrollHelper("#view");
          // mark
          found = true;
          break;
          // }
        }
        // not found ...
        if (found === false) {
          unblock();
          $("form .control-group").addClass("error");
          $("form :input:visible:enabled:first").select().focus();
        }
      } /*,
      complete: function (jqXHR, textStatus) {
        unblock();
      } */
    });

  });

  $("body").on("click", "#btn-back", function (event) {
    var area = $("form .area"), button = $("form button"), keywords = $("#search #keywords");
    // console.debug('Cancel button click event fired...');
    scrollHelper("#place_locator", function () {
      $("form :input:visible:enabled:first").select().focus();
    });
  });

  $("body").on("click", "#btn-save", function (event) {

    block(); // loading

    // get points
    var save_points = [], path = shared_polygon.getPath();

    for (var j = 0; j < path.getLength(); j++) {
      var point = path.getAt(j);
      save_points.push({
        lat: point.lat(),
        lng: point.lng()
      });
    }

    $.ajax({
      type: "POST",
      url: '/inout/bounds',
      dataType: "json",
      data: {
        // username: 'user@mail.com',
        bounds: [{ // only one bounds
          points: save_points
        }]
      },
      error: function (xhr, status) {
        // console.error(status);
      },
      success: function (data, textStatus, jqXHR) {
        // console.info('Bounds saved!', data);
      },
      complete: function (jqXHR, textStatus) {
        setTimeout(unblock, 1000);
      }
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
          4
        );
        map_bounds_size = true;
        // initialize map
        initializeBoundsMap();
      }
      google.maps.event.trigger(map_bounds, 'resize');
    } else {
      google.maps.event.trigger(map, 'resize');
      scrollHelper("#place_locator", function () {
        $("form :input:visible:enabled:first").select().focus();
      });
    }
  });

  (function () {
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: bounds.getCenter(),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true,
      zoomControl: true,
      minZoom: 4
    });

    // load done
    google.maps.event.addListenerOnce(map, 'idle', function () {
      unblock();
    });

    // map.fitBounds(bounds);
    shared_polygon = new google.maps.Polygon({
      paths: triangleCoords,
      strokeColor: "#0000FF",
      strokeOpacity: 0.6,
      strokeWeight: 2,
      fillColor: "#0000FF",
      fillOpacity: 0.15,
      clickable: false
    });
    shared_polygon.setMap(map);
    // select first form element
    $("form :input:visible:enabled:first").select().focus();
  }());

  /*

  (function () {

    // ajax call
    $.ajax({
      type: "GET",
      url: '/inout/bounds',
      dataType: "json",
      data: {
        // username: 'user@mail.com'
      },
      error: function (xhr, status) {
        // console.error(status);
      },
      success: function (data, textStatus, jqXHR) {
        var d_bounds = data.bounds;
        if (d_bounds.length > 0) {
          var d_points = d_bounds[0].points;
          if (d_points.length > 0) {
            for (var i = 0; i < d_points.length; i++) {
              var d_point = d_points[i], latlng = new google.maps.LatLng(d_point.lat, d_point.lng);
              triangleCoords.push(latlng);
              bounds.extend(latlng);
            }
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
                strokeOpacity: 0.6,
                strokeWeight: 2,
                fillColor: "#0000FF",
                fillOpacity: 0.15,
                clickable: false
              });
              shared_polygon.setMap(map);
              // console.info('Bounds loaded, %o', d_points);
            }());
          }
        }
      },
      complete: function (jqXHR, textStatus) {
        setTimeout(function () {
          unblock();
        // select first form element
          $("form :input:visible:enabled:first").select().focus();
        }, 1000);
      }
    });
  }());

  */

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
      // console.info('Vertex inserted.');
      updateBounds(this);
    });

    google.maps.event.addListener(polygon.getPath(), 'remove_at', function (evt) {
      // console.info('Vertex removed.');
      updateBounds(this);
    });

    google.maps.event.addListener(polygon.getPath(), 'set_at', function (evt) {
      // console.info('Vertex moved.');
      updateBounds(this);
    });

    google.maps.event.addListener(polygon, 'rightclick', function (mev) {
      if (mev.vertex !== null) {
        // console.info('Right click event at polygon. Vertex: %i', mev.vertex);
        polygon.getPath().removeAt(mev.vertex);
      }
    });

  }

}
