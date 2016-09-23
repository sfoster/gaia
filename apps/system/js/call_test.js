'use strict';
/*
  The Call-mode UI & functionality
*/
(function(exports) {
  var CallTest = function() {};
  CallTest.prototype = {
    start: function() {
      return new Promise((res, rej) => {
        // hook up listeners etc
        console.log('CallTest starting');
        res(true);
      });
    },
    stop: function() {
      // unhook listeners etc
    }
  };
  exports.CallTest = CallTest;
})(window);
