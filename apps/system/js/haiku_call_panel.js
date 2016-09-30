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
  CallPanel.CALL_STATES = {
    'offline': 1,
    'dialing' : 1,
    'ringing': 1,
    'busy': 1,
    'incoming': 1,
    'connecting': 1,
    'connected': 1,
    'disconnected': 1
  };

  CallPanel.prototype = {
    callState: '',
    start: function() {
      return new Promise((res, rej) => {
        console.log('CallPanel starting');
        this.missedCalls = [];
        // hook up listeners etc
        tel.muted = false;
        // tel.speakerEnabled = true;
        tel.onincoming = this.handleIncomingCall.bind(this);

        // start UI
        this.panelNode = document.querySelector('#panel_call');
        this.callButton = new exports.CallButton(
            this.panelNode.querySelector('.btn'), this, window.app);
        this.callButton.start();
        this.audio = document.querySelector('#call_tone');
        this.audio.load();

        this.statusNode = document.querySelector('#status');

        this.registerHandlers();
        this.changeState('offline');
        res(true);
      });
    },
    stop: function() {
      // unhook listeners etc
    },
    registerHandlers: function() {
      window.addEventListener('connection-voicechange', (evt) => {
        var voiceConnected = evt.detail.connected;
        this.statusNode.textContent = (voiceConnected) ?
          evt.detail.signal + '%' : 'offline';

        if (voiceConnected && this.callState === 'offline') {
          // network connected, calls possible but none connected
          this.changeState('disconnected');
          console.log('voice connected, waiting for calls: ', evt);
        } else if (this.callState !== 'offline' && !voiceConnected) {
          this.changeState('offline');
          console.log('voice disconnected, now offline: ', evt);
        }
      });
    },
    changeState: function(toState) {
      function resetMissedStatus() {
        // Reset Status text back to 'Touch to send' after 5 seconds
        setTimeout(() => {
          this.panelNode.classList.remove('missed');
          this.updateLogStatus('Touch to call.');
          if (fromState === 'incoming') {
            this.callButton.changeState('missed');
          }
        }, 5000);
      }
      // state reflects current action. Action causes state change
      if (!(toState in CallPanel.CALL_STATES)) {
        console.log('CallPanel: changeState: ignoring unexpected state ' +
                    toState);
        return;
      }
      var fromState = this.callState;
      if (toState == fromState) {
        return;
      }

      this.callState = toState;
      this.callButton.changeState(toState);

      var stateNames = Object.keys(CallPanel.CALL_STATES);
      this.panelNode.classList.remove.apply(
          this.panelNode.classList, stateNames);
      this.panelNode.classList.add(toState);

      if (fromState === 'incoming') {
        // stop the ring tone
        if (this._incomingAnnounce) {
          this._incomingAnnounce.stop();
          this._incomingAnnounce = null;
        }
      }

      switch (toState) {
        case 'disconnected':
          if (fromState === 'offline') {
            this.updateLogStatus('Touch to call.');
          }

          if (fromState === 'incoming') {
            // misssed call, change background color to red
            // and text as missed call
            // after 5 second reset text and show red circle
            this.missedCalls.push(this._callInProgress.id);
            this._callInProgress = null;
            this.panelNode.classList.add('missed');
            this.updateLogStatus('Missed call.');
            resetMissedStatus.call(this);
          }

          if (fromState === 'dialing') {
            // Call not answered, change background color to red
            // after 6 rings and text as 'No Answer'
            // reset text after 5 seconds
            // TBD need to check if call is disconnected before 6 rings
            // than its not a No Answer call
            this._callInProgress = null;
            this.panelNode.classList.add('missed');
            this.updateLogStatus('No Answer.');
            resetMissedStatus.call(this);
          }

          if (fromState === 'connected') {
            this._callInProgress = null;
            this.updateLogStatus('Touch to call.');
          }
          break;
        case 'offline':
          this.updateLogStatus('Searching...');
          break;
        case 'incoming':
          this.updateLogStatus('Ringing...');
          this.announceIncoming(6, () => {
            console.log('incoming timeout, hanging up');
            this.hangupCurrentCall();
          });
          break;
        case 'dialing':
          this.updateLogStatus('Ringing...');
          break;
        case 'connected':
            this.updateLogStatus('Touch to end call.');
            break;
        default:
          console.log('CallPanel changeState from: %s to %s ',
                      fromState, toState);
          break;
      }
    },
    // actions:
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
      /* TODO:
          * only ring n times
          * loop some ringing audio while connecting

      */
      console.log('dialing: ', sanitizedNumber);
      if (this._callInProgress) {
        console.log('cleanup previous call');
        this._callInProgress = null;
      }
      // set state optimistically to ensure UI seems responsive
      this.changeState('dialing');
      return tel.dial(sanitizedNumber).then((call) => {
        this._callInProgress = call;
        console.log('tel.dial callback');
        // handle events for that call
        call.onstatechange = (event) => {
          var stateName = event.call.state;
          this.changeState(stateName);
          console.log('outgoing call, state change:', event.call.state, call);
        };
      }, function(err) {
        console.warn('Error trying to dial: ', err);
      });
    },
    handleIncomingCall: function(event) {
      var call = event.call;
      console.log('incoming call', call);

      if (this._callInProgress) {
        console.log('handleIncomingCall: clean up previous call');
        this._callInProgress = null;
      }
      if (this.isKnownCaller(call)) {
        this._callInProgress = call;
        // bind to events for the incoming call
        call.onstatechange = (event) => {
            console.log('incoming call, state change:', event.call.state, call);
            this.changeState(event.call.state);
        };
        this.changeState('incoming');
      } else {
        console.log('Hanging up incoming call from: ' + call.id.number);
        this.updateLogStatus('Rejecting call from: ' + call.id.number);
        call.hangUp();
        return;
      }
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
        console.log('hangupCurrentCall:', this._callInProgress);
        this._callInProgress.hangUp();
      }
    },
    updateLogStatus: function(msg) {
      document.querySelector('#call-status-log').textContent = msg;
    },
    clearMissedCalls: function() {
      this.missedCalls.length = 0;
      this.callButton.changeState(this.callState);
    },
    announceIncoming: function(rings, onTimeout) {
      var audio = this.audio;
      var duration = 1000 * audio.duration;
      var adjust = -400;
      console.log('announceIncoming, %s rings at % ms each',
                  rings, duration+adjust);
      if (this._incomingAnnounce) {
        this._incomingAnnounce.stop();
      }
      function ring() {
        audio.pause();
        if (rings-- <= 0) {
          clearInterval(itv);
          onTimeout && onTimeout();
        } else {
          console.log('playing call tone', duration+'ms');
          audio.currentTime = 0.01;
          audio.play();
        }
      }
      ring();
      var itv = setInterval(ring, duration+adjust);
      return (this._incomingAnnounce = {
        toneDuration: duration+adjust,
        stop: () => {
          this.audio.pause();
          clearInterval(itv);
        }
      });
    },

  };
  exports.CallPanel = CallPanel;
})(window);
