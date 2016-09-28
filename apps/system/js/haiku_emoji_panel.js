'use strict';
/*
  The Emoji-mode UI & functionality
*/
(function(exports) {
  var EmojiPanel = function() {
    this.receivedMessages = [];
  };
  var mozMessage = navigator.mozMobileMessage;
  var logStatus = document.querySelector('#status-log');

  var resetStatus = function() {
    // Reset Status text back to 'Touch to send' after 10 seconds
    setTimeout(() => {
        console.log('Haiku: Reset text ');
        logStatus.innerText = 'Touch to send emoji';
      }, 5000);
  };

  EmojiPanel.prototype = {
    start: function() {
      return new Promise((res, rej) => {
        // hook up listeners etc
        this.registerHandlers();
        res(true);
        console.log('EmojiPanel starting');
      });
    },
    stop: function() {
      // unhook listeners etc
    },
    registerHandlers: function() {
      var emojis = document.querySelector('#emoji-icons');
      // Handle clicks on the emojis
      emojis.addEventListener('click', this.emojiClickHandler);

      mozMessage.addEventListener(
        'received', this.onMessageReceived.bind(this)
      );
      mozMessage.addEventListener(
        'failed', this.onMessageFailed.bind(this)
      );
      mozMessage.addEventListener(
        'sending', this.onMessageSending.bind(this)
      );
      mozMessage.addEventListener(
        'sent', this.onMessageSent.bind(this)
      );
    },

    emojiClickHandler: function(e) {
      var target = e.target;
      var receiver = window.app.pairNumber;
      var messageBody = target && target.dataset.icon;

      if (!messageBody) {
        return;
      }

      console.log('Haiku:sending emoji ', messageBody);
      mozMessage.send(receiver, messageBody);
    },
    clearReceivedMessages: function() {
      var emojis = document.querySelector('#emoji-icons');
      var emojiNodes = emojis.querySelectorAll('.received');
      for(var i=0; i<emojiNodes.length; i++) {
        emojiNodes[i].classList.remove('received');
      }
      emojis.classList.remove('received');
    },
    onMessageReceived: function(e) {
      var message = e.message;
      console.log('Haiku: New Message Received..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);

      logStatus.innerText = 'You just received emoji ' + message.body + '...';

      var emojis = document.querySelector('#emoji-icons');
      if (message.body === 'left' ||
          message.body === 'middle' ||
          message.body === 'right')
      {
        this.receivedMessages.push(message);
        emojis.classList.add('received');
        emojis.querySelector('> .' + message.body).classList.add('received');
      }
    },

    onMessageSending: function(e) {
      var message = e.message;
      console.log('Haiku: sending message .. ');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      // Display status
      logStatus.innerText = 'Sending emoji ' + message.body + '...';
      // TBD Change opacity and animate to highlight emoji  clicked and sent..
    },

    onMessageSent: function(e) {
      var message = e.message;
      console.log('Haiku: Message Sent..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      //Display message for 10 seconds
      logStatus.innerText = message.body + ' emoji sent successfully...';
      resetStatus();
    },

    onMessageFailed: function(e) {
      var message = e.message;
      console.log('Haiku:Failed to send message..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      logStatus.innerText =  ' Failed to send emoji ' + message.body;
      resetStatus();
    }
  };
  exports.EmojiPanel = EmojiPanel;
})(window);
