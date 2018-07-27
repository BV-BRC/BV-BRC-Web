define([], function () {

  // returns current time in HH:MM:SS, 12 hour format
  return function () {
    var time = new Date().toTimeString().split(' ')[0];
    var hours = parseInt(time.split(':')[0]);
    hours = (hours + 11) % 12 + 1;
    return hours + time.slice(time.indexOf(':'));
  };
});
