'use strict';
/*
  The Emoji-mode UI & functionality
*/
(function(exports) {
  var EmojiTest = function() {};
  EmojiTest.prototype = {
    start: function() {
      return new Promise((res, rej) => {
        // hook up listeners etc
        this.registerHandlers();
        res(true);
        console.log('EmojiTest starting');
      });
    },
    stop: function() {
      // unhook listeners etc
    },
    registerHandlers: function() {
      var sendSMS = document.querySelector('#smiley_emoji_btn');
      var receiver = '4088882345';
      var messageBody = ':)';
       if (sendSMS) {
         sendSMS.onclick = function() {
           console.log('Haiku:sending smiley emoji');
           navigator.mozMobileMessage.send(receiver, messageBody);
         };
       }
       navigator.mozMobileMessage.addEventListener(
         'received', this.onMessageReceived.bind(this)
       );
       navigator.mozMobileMessage.addEventListener(
         'failed', this.onMessageFailed.bind(this)
       );
     },

    onMessageReceived: function(e) {
       var message = e.message;
       console.log('Haiku: New Message Received');
       console.log('Haiku: Message sender', message.sender);
       console.log('Haiku: Message receiver', message.receiver);
       console.log('Haiku: Message body', message.body);
     },

     onMessageFailed: function(e) {
       var message = e.message;
       console.log('Haiku:Failed to send message');
       console.log('Haiku: Message sender', message.sender);
       console.log('Haiku: Message receiver', message.receiver);
       console.log('Haiku: Message body', message.body);
     }

  };
  exports.EmojiTest = EmojiTest;
})(window);
