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

  var CallPanel = function() {};
  CallPanel.prototype = {
    callState: 'offline',
    start: function() {
      return new Promise((res, rej) => {
        console.log('CallPanel starting');
        // hook up listeners etc
        tel.muted = false;
        // tel.speakerEnabled = true;
        tel.onincoming = this.handleIncomingCall.bind(this);

        // start UI
        this.callButton = new exports.CallButton(this, window.app);
        this.callButton.start();

        this.statusNode = document.querySelector('#status');

        window.addEventListener('connection-voicechange', (evt) => {
          var voiceConnected = evt.detail.connected;
          this.statusNode.textContent = (voiceConnected) ?
            evt.detail.signal + '%' : 'offline';

          if (voiceConnected && this.callState === 'offline') {
            // network connected, calls possible but none connected
            this.callState = 'disconnected';
            this.callButton.changeState(this.callState);
            console.log('voice connected, waiting for calls: ', evt);
          } else if (this.callState !== 'offline' && !voiceConnected) {
            this.callState = 'offline';
            this.callButton.changeState(this.callState);
            console.log('voice disconnected, now offline: ', evt);
          }
        });

        res(true);
      });
    },
    stop: function() {
      // unhook listeners etc
    },

    initiateCall: function() {
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
      var call = this._callInProgress = tel.dial(sanitizedNumber)
      .then(function(call) {
        // Events for that call
        call.onstatechange = function (event) {
            /*
                Possible values for state:
                "dialing", "ringing", "busy", "connecting", "connected",
                "disconnecting", "disconnected", "incoming"
            */
            console.log('call state change', event.state, call);
        };

        // Above optionsiKknownCaller direct events
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

      if (this.isKnownCaller(call)) {
        this._callInProgress = call;
      } else {
        console.log('Hanging up incoming call from: ' + call.id.number);
        return;
      }

      // TODO: announce new call
      call.answer();
      setTimeout(() => {
        console.log('times up, hanging up from this call');
        call.hangUp();
      }, 1000);
    },
    acceptIncomingCall: function() {
      if (this._callInProgress) {
        console.log('acceptIncomingCall');
        this._callInProgress.answer();
      }
    },
    isKnownCaller: function(call) {
      var incomingNum = call.id && call.id.number;
      return incomingNum === window.app.pairNumber;
    },
    hangupCurrentCall: function() {
      if (this._callInProgress) {
        console.log('hangupCurrentCall');
        this._callInProgress.hangUp();
      }
    }
  };
  exports.CallPanel = CallPanel;
})(window);
