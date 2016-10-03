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
      }, 2000);
  };

  var emoji_map = {
    left: 'Smiley',
    middle: 'Heart',
    right: 'ThumbsUp'
  };

  EmojiPanel.prototype = {
    _shouldBlockEmojiClicks: false,
    start: function() {
      return new Promise((res, rej) => {
        // hook up listeners etc
        this.registerHandlers();
        this.audio = document.querySelector('#sms_tone');
        this.audio.load();
        this._receivedAnimInProgress = null;
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
      emojis.addEventListener('click', (e) => {
        if (!this._shouldBlockEmojiClicks) {
          this.emojiClickHandler(e);
          emojis.classList.add('sending');
          this._shouldBlockEmojiClicks = true;
          setTimeout(() => {
            this._shouldBlockEmojiClicks = false;
            emojis.classList.remove('sending');
          }, 2000);
        }
      });

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

      var smsTone = document.querySelector('#sms_tone');
      smsTone.play();
      var emojiSound = document
          .querySelector('#'+ messageBody +'_tone');
      emojiSound.play();

      console.log('Haiku:sending emoji ', messageBody);
      mozMessage.send(receiver, messageBody);
    },

    clearReceivedMessages: function() {
      var flashEmojis = () => {
        this._receivedAnimInProgress = true;
        var currentMessage = this.receivedMessages.shift();
        var msgArrayLength = this.receivedMessages.length;

        if (currentMessage && currentMessage.body) {
          logStatus.innerText = 'You just received emoji ' +
                                emoji_map[currentMessage.body] + '...';
          var currentNode = document.querySelector(
              'section[id="emoji-icons"] > div.' +
              currentMessage.body);
          var emojiSound = document.querySelector(
              '#'+ currentMessage.body +'_tone');
          emojiSound.play();

          //animate emoji to increase scale x2 then reset scale after 2000ms
          currentNode.classList.add('iconReceived');
          setTimeout(function() {
            currentNode.classList.remove('iconReceived');
            if (msgArrayLength === 0) {
              logStatus.innerText = 'Touch to send.';
            }
          }, 2000);


          if (msgArrayLength === 0) {
            stopFlash();
          }
        }
      };

      var stopFlash = () => {
        this._receivedAnimInProgress = null;
        clearInterval(intervalId);
      };

      var emojis = document.querySelector('#panel_emoji');
      var emojiNodes = emojis.querySelectorAll(
          'section[id="emoji-icons"] > div');
      for(var i=0; i<emojiNodes.length; i++) {
        emojiNodes[i].classList.remove('received');
      }
      emojis.classList.remove('received');
      emojis.querySelector('section').classList.remove('received');

      // Reset text to blank before showing received emoji animations
      logStatus.innerText = '';
      var intervalId = setInterval(flashEmojis.bind(this), 3000);
    },

    onMessageReceived: function(e) {
      var message = e.message;
      console.log('Haiku: New Message Received: ', e);
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);

      if (message.body === 'left' ||
          message.body === 'middle' ||
          message.body === 'right')
      {
        this.receivedMessages.push(message);
        // Execute inside if received animations are not playing
        if (!this._receivedAnimInProgress) {
          // Check if received class is set on the panel once
          var emojis = document.querySelector('#panel_emoji');
          if (!emojis.classList.contains('received')) {
            this.audio.play();
            emojis.classList.add('received');
            emojis.querySelector('section').classList.add('received');
            emojis.querySelector(
              'section[id="emoji-icons"] > div.' + message.body
            ).classList.add('received');
          }
          // Set log status to view new messages
          logStatus.innerText = 'Touch to view.';
        }
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
