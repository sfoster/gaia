'use strict';
/*
  Call button and its states
*/
(function(exports) {

  var CallButton = function(node, panel, app) {
    this.panel = panel;
    this.app = app;
    this.domNode = node;
  };
  CallButton.prototype = {
    start: function() {
      this.domNode = document.querySelector('#buttons .btn');
      this.domNode.addEventListener('click', this.onClick.bind(this));
    },
    stop: function() {
      // unhook listeners etc
    },
    onClick: function() {
      this.panel.clearMissedCalls();
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
      this.domNode.classList.remove(
        'offline', 'connected', 'disconnected', 'dialing', 'incoming'
      );
      this.domNode.classList.add(toState);
    }

  };
  exports.CallButton = CallButton;
})(window);
