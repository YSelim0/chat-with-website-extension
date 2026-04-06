export async function getActiveTabHostname() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.url) {
    return null;
  }

  try {
    return new URL(activeTab.url).hostname;
  } catch {
    return null;
  }
}
