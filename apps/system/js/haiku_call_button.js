'use strict';
/*
  Call button and its states
*/
(function(exports) {

  var CallButton = function(panel, app) {
    this.panel = panel;
    this.app = app;
  };
  CallButton.prototype = {
    start: function() {
      this.btnNode = document.querySelector('#buttons .btn');
      this.btnNode.addEventListener('click', this.onClick.bind(this));
    },
    stop: function() {
      // unhook listeners etc
    },
    onClick: function() {
      switch (this.panel.callState) {
        case 'offline':
          console.log('not connected, cant call out');
          break;
        case 'dialing':
          // cancel outgoing call
          this.panel.hangupCurrentCall();
          break;
        case 'incoming':
          // pickup incoming call
          this.panel.acceptIncomingCall();
          break;
        case 'connected':
          // hangup current call
          this.panel.hangupCurrentCall();
          break;
        default:
          // includes case 'disconnected':
          this.panel.initiateCall();
          break;
      }
    },
    changeState: function(toState) {
      this.btnNode.classList.remove(
        'offline', 'connected', 'disconnected', 'dialing', 'incoming'
      );
      this.btnNode.classList.add(toState);
    }

  };
  exports.CallButton = CallButton;
})(window);
