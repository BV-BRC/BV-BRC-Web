define([], function () {

  return function (/* array */ a, /* array */ b) {
    if (!a || !a.length || !b || !b.length) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    return a.every(function (e) {
      return (b.indexOf(e) > -1);
    });
  };
});
