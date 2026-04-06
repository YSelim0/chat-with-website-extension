export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.info('Chat With Website installed.');
  });
});
