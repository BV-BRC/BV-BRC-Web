/*
 * convert an attribute name of the form some_words into Some Words. With rewrites.
 */
define([], function () {

  return function (name) {
          if (name == "host_gender") {
            return "Host Sex";
        }
        else if (name == "h1_clade_us") {
            return "H1 Clade US";
        }
        else
        {
            return name.replace(/_/g, ' ');
        }
  };
});
