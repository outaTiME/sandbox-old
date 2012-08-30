
/** Main method, will be called from template. **/
function initialize(street) {
  var n = usig.NormalizadorDirecciones.init({
    onReady: function () {
      var dom = $("#normalized");
      try {
        dom.append(n.normalizar(street, 10)[0].codigo);
      } catch (error) {
        dom.append("error");
      }
      // done
      dom.trigger('done');
    }
  });
}
