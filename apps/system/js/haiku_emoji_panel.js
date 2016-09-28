'use strict';
/*
  The Emoji-mode UI & functionality
*/
(function(exports) {
  var EmojiPanel = function() {
    this.receivedMessages = [];
  };
  var mozMessage = navigator.mozMobileMessage;
  var logStatus = document.querySelector('#emoji-status-bottom');

  var resetStatus = function() {
    // Reset Status text back to 'Touch to send' after 10 seconds
    setTimeout(() => {
        console.log('Haiku: Reset text ');
        logStatus.innerText = 'Touch to send.';
      }, 5000);
  };

  var emoji_map = {
    left: 'Smiley',
    middle: 'Heart',
    right: 'Unicorn'
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
      function flashEmojis() {
        // TBD Handle animating received emojis
        logStatus.innerText = 'You just received emoji ' + emoji_map[this.receivedMessages.pop().body] + '...';
        if (this.receivedMessages.length == 0) {
          stopFlash();
        }
      }

      function stopFlash() {
        clearInterval(intervalId);
        resetStatus();
      }

      var emojis = document.querySelector('#panel_emoji');
      var emojiNodes = emojis.querySelectorAll('section[id="emoji-icons"] > div');
      for(var i=0; i<emojiNodes.length; i++) {
        emojiNodes[i].classList.remove('received');
      }
      emojis.classList.remove('received');
      emojis.querySelector('section').classList.remove('received');

      var intervalId = setInterval(flashEmojis.bind(this), 1000);
    },

    onMessageReceived: function(e) {
      var message = e.message;
      console.log('Haiku: New Message Received..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);

      var emojis = document.querySelector('#panel_emoji');
      if (message.body === 'left' ||
          message.body === 'middle' ||
          message.body === 'right')
      {
        this.receivedMessages.push(message);
        emojis.classList.add('received');
        emojis.querySelector('section').classList.add('received');
        emojis.querySelector('section[id="emoji-icons"] > div.' + message.body).classList.add('received');
        logStatus.innerText = 'Touch to view.';
      }
    },

    onMessageSending: function(e) {
      var message = e.message;
      console.log('Haiku: sending message .. ');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      // Display status
      logStatus.innerText = 'Sending emoji...';
    },

    onMessageSent: function(e) {
      var message = e.message;
      console.log('Haiku: Message Sent..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      //Display message for 5 seconds
      logStatus.innerText = emoji_map[message.body] + ' has been sent.';
      resetStatus();
    },

    onMessageFailed: function(e) {
      var message = e.message;
      console.log('Haiku:Failed to send message..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      logStatus.innerText =  ' Failed to send emoji.';
      resetStatus();
    }
  };
  exports.EmojiPanel = EmojiPanel;
})(window);
