(function (root, factory) {
  const ttsUtils = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ttsUtils;
  }
  root.MessageTts = ttsUtils;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function splitText(text, maxLength = 149) {
    const sentences = text.match(/[^.!?。！？]+[.!?。！？]?/gu) || [text];
    const chunks = [];

    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);
      let chunk = '';
      words.forEach((word) => {
        let remainingWord = word;
        while (remainingWord.length > maxLength) {
          if (chunk) {
            chunks.push(chunk);
            chunk = '';
          }
          chunks.push(remainingWord.slice(0, maxLength));
          remainingWord = remainingWord.slice(maxLength);
        }

        const next = chunk ? `${chunk} ${remainingWord}` : remainingWord;
        if (next.length > maxLength && chunk) {
          chunks.push(chunk);
          chunk = remainingWord;
        } else {
          chunk = next;
        }
      });
      if (chunk) chunks.push(chunk);
    });

    return chunks;
  }

  function isMobileDevice(navigatorLike, hasCoarsePointer = false) {
    const userAgent = navigatorLike.userAgent || '';
    const isIPadDesktopMode = navigatorLike.maxTouchPoints > 1 && /Macintosh/i.test(userAgent);
    return Boolean(
      hasCoarsePointer ||
      (navigatorLike.userAgentData && navigatorLike.userAgentData.mobile) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
      isIPadDesktopMode
    );
  }

  return { splitText, isMobileDevice };
});
