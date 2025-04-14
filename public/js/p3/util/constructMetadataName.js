/*
 * convert an attribute name of the form some_words into Some Words. With rewrites.
 */
define([], function () {

  return function (name) {
          if (name == "host_gender") {
            return "Host Sex";
        }
        else
        {
            return name.replace(/_/g, ' ');
        }
  };
});
