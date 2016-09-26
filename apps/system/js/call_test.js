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
    },
    handleIncomingCall: function(event) {
      var call = event.call;
      var app = window.app;
      console.log('incoming call from: '+ call.id);
      console.log('is expected call from the paired number? ',
                  call.id === app.pairNumber, call.id, app.pairNumber);

      call.answer();
      setTimeout(() => {
        console.log('times up, hanging up from this call');
        call.hangUp();
      }, 1000);
    }
  };
  exports.CallTest = CallTest;
})(window);
