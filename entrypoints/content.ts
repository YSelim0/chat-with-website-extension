export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.info(
      'Chat With Website content script ready:',
      window.location.href,
    );
  },
});
