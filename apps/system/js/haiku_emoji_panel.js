'use strict';
/*
  The Emoji-mode UI & functionality
*/
(function(exports) {
  var EmojiPanel = function() {};
  var mozMessage = navigator.mozMobileMessage;
  var logStatus = document.querySelector('#status-log');
  var receivedEmoji = document.querySelector('#received-emoji');

  var resetStatus = function() {
    // Reset Status text back to 'Touch to send' after 10 seconds
    setTimeout(() => {
        console.log('Haiku: Reset text ');
        logStatus.innerText = "Touch to send emoji";
      }, 5000);
  };

  var showReceivedEmojiUI = function(flag) {
    var emojiIcons = document.querySelector('#emoji-icons');
    var receivedSection = document.querySelector('#received-section');

    if (flag) {
      emojiIcons.style.display = 'none';
      receivedSection.style.display = 'flex';
    } else {
      emojiIcons.style.display = 'flex';
      receivedSection.style.display = 'none';
      logStatus.innerText = "Touch to send emoji";
    }
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

      // Handle click on received emoji icon to hide received section and
      // reset UI back to send emoji screen
      receivedEmoji.onclick = function() {
        showReceivedEmojiUI(false);
      };

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
      var receiver = app.pairNumber;

      if (!target) {
        return;
      }

      var messageBody = target.dataset.icon;

      console.log('Haiku:sending emoji ', messageBody);
      mozMessage.send(receiver, messageBody);
    },

    onMessageReceived: function(e) {
      var message = e.message;
      console.log('Haiku: New Message Received..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);

      logStatus.innerText = "You just received emoji " + message.body + "...";
      receivedEmoji.classList.remove("left", "middle", "right");
      if (message.body == 'left' ||
          message.body == 'middle' ||
          message.body == 'right') {
        receivedEmoji.classList.add(message.body);
        showReceivedEmojiUI(true);
      }
    },

    onMessageSending: function(e) {
      var message = e.message;
      console.log('Haiku: sending message .. ');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      // Display status
      logStatus.innerText = "Sending emoji " + message.body + "...";
      // TBD Change opacity and animate to highlight emoji  clicked and sent..
    },

    onMessageSent: function(e) {
      var message = e.message;
      console.log('Haiku: Message Sent..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      //Display message for 10 seconds
      logStatus.innerText = message.body + " emoji sent successfully...";
      resetStatus();
    },

    onMessageFailed: function(e) {
      var message = e.message;
      console.log('Haiku:Failed to send message..');
      console.log('Haiku: Message sender', message.sender);
      console.log('Haiku: Message receiver', message.receiver);
      console.log('Haiku: Message body', message.body);
      logStatus.innerText =  " Failed to send emoji " + message.body;
      resetStatus();
    }
  };
  exports.EmojiPanel = EmojiPanel;
})(window);
