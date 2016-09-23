'use strict';
/*
  The Call-mode UI & functionality
*/
(function(exports) {
  // Telephony object
  var tel = navigator.mozTelephony;

  var CallTest = function() {};
  CallTest.prototype = {
    start: function() {
      return new Promise((res, rej) => {
        console.log('CallTest starting');
        // hook up listeners etc
        tel.muted = false;
        tel.speakerEnabled = true;

        tel.ready.then((result) => {
          console.log('Telephony is ready');
        }, (err) => {
          console.warn('Telephony error:', err.message);
        });

        res(true);
      });
    },
    stop: function() {
      // unhook listeners etc
    },
    initiateCall: function() {
      this._callInProgress = true;
      var app = window.app;
      var telNumber = app.pairNumber;
      if (!telNumber) {
        console.warn('no pair number configured');
        return;
      }
      // Place a call
      var call = tel.dial(telNumber).then(function(call) {
        // Events for that call
        call.onstatechange = function (event) {
            /*
                Possible values for state:
                "dialing", "ringing", "busy", "connecting", "connected",
                "disconnecting", "disconnected", "incoming"
            */
            console.log('call state change', event.state);
        };

        // Above options as direct events
        call.onconnected = function () {
            // Call was connected
            console.log('call connected');
        };

        call.ondisconnected = function () {
            console.log('call disconnected');
        };
      }, function(err) {
        console.warn('Error trying to dial: ', err);
      });
      return call;
    }
  };
  exports.CallTest = CallTest;
})(window);
