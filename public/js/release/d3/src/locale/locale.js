// wrapped by build app
define("d3/src/locale/locale", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "number-format";
import "time-format";

d3.locale = function(locale) {
  return {
    numberFormat: d3_locale_numberFormat(locale),
    timeFormat: d3_locale_timeFormat(locale)
  };
};

});
