'use strict';
/*
  The Call-mode UI & functionality
*/
(function(exports) {
  // Telephony object
  var tel = navigator.mozTelephony;

  var isValid = function t_isValid(sanitizedNumber) {
    var validExp = /^(?!,)([0-9#+*,]){1,50}$/;
    return validExp.test(sanitizedNumber);
  };


  var CallTest = function() {};
  CallTest.prototype = {
    start: function() {
      return new Promise((res, rej) => {
        console.log('CallTest starting');
        // hook up listeners etc
        tel.muted = false;
        // tel.speakerEnabled = true;
        tel.onincoming = this.handleIncomingCall.bind(this);
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
      var sanitizedNumber = telNumber.replace(/(\s|-|\.|\(|\))/g, '');
      if (!isValid(sanitizedNumber)) {
        console.warn('Invalid number: ', sanitizedNumber);
        return;
      }
      // Place a call
      /* TODO:
          * only ring n times
          * loop some ringing audio while connecting

      */
      console.log('dialing: ', sanitizedNumber);
      var call = tel.dial(sanitizedNumber).then(function(call) {
        // Events for that call
        call.onstatechange = function (event) {
            /*
                Possible values for state:
                "dialing", "ringing", "busy", "connecting", "connected",
                "disconnecting", "disconnected", "incoming"
            */
            console.log('call state change', event.state, call);
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
      console.log('incoming call from: '+ call.id);

      if (!this.shouldAcceptCall(call)) {
        console.log('Hanging up incoming call from: ' + call.id.number);
        return;
      }

      call.answer();
      setTimeout(() => {
        console.log('times up, hanging up from this call');
        call.hangUp();
      }, 1000);
    },
    shouldAcceptCall: function(call) {
      var incomingNum = call.id && call.id.number;
      return incomingNum === window.app.pairNumber;
    }
  };
  exports.CallTest = CallTest;
})(window);
