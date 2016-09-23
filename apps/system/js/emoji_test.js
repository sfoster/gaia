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
        res(true);
        console.log('EmojiTest starting');
      });
    },
    stop: function() {
      // unhook listeners etc
    }
  };
  exports.EmojiTest = EmojiTest;
})(window);
