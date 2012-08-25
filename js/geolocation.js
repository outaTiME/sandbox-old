// geo-location shim

// currentely only serves lat/long
// depends on jQuery

// doublecheck the ClientLocation results because it may returning null results

;(function(geolocation){

  if (geolocation) return;

  var cache;

  geolocation = window.navigator.geolocation = {};
  geolocation.getCurrentPosition = function(callback){

    if (cache) callback(cache);

    $.getScript('//www.google.com/jsapi',function(){

     // sometimes ClientLocation comes back null
     if (google.loader.ClientLocation) {
      cache = {
        coords : {
          "latitude": google.loader.ClientLocation.latitude,
          "longitude": google.loader.ClientLocation.longitude
        }
      };
     }

      callback(cache);
    });

  };

  geolocation.watchPosition = geolocation.getCurrentPosition;

})(navigator.geolocation);
