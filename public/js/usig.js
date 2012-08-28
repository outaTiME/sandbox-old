
$(function () {

  // querystring

  var qs = (function (a) {
    if (a === "") {
      return {};
    }
    var b = {};
    for (var i = 0; i < a.length; ++i) {
      var p = a[i].split('=');
      if (p.length !== 2) {
        continue;
      }
      b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
  }(window.location.search.substr(1).split('&')));

  // place on map

  var map;
  var n = usig.NormalizadorDirecciones.init({
    debug: true,
    onReady: function () {
      try {
        var geocoder = new usig.GeoCoder({
          debug: true
        });
        var address = n.normalizar(qs.query, 10)[0];
        if (address instanceof usig.Direccion) { // solo un string entre calles 'callao y santa fe'
          geocoder.geoCodificarCalleYCalle(
            address.getCalle().codigo, // calle #1
            address.getCalleCruce().codigo, // calle #2
            function (res) {
              if (res instanceof usig.Punto) {
                $.getJSON("http://ws.usig.buenosaires.gob.ar/rest/convertir_coordenadas?x=" +
                    res.x + "&y=" + res.y + "&output=lonlat&callback=?",
                  function (data) {
                    var result = data.resultado;
                    var latlng = new google.maps.LatLng(result.y, result.x);
                    var mapOptions = {
                      zoom: 16,
                      center: latlng,
                      mapTypeId: google.maps.MapTypeId.ROADMAP
                    };
                    map = new google.maps.Map(document.getElementById('map_canvas'),
                        mapOptions);
                    var marker = new google.maps.Marker({
                      position: latlng,
                      map: map
                    });
                  }
                );
              }
            },
            function (res) {
              console.error("error: %o", res);
            }
          );
        } else {
          console.error("error: no usig.Direccion instance");
        }
      } catch (error) {
        console.error("error: %o", error);
      }
    }
  });

});
