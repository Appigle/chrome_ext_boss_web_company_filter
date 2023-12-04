const MESSAGE_TYPE = {
  ADD: 'FILTER_COMPANY_NAME_ADD',
  CLEAR: 'FILTER_COMPANY_NAME_CLEAR',
  SELECTION: 'PAGE_CONTENT_SELECTION',
};

const CUSTOM_MENU_ID = {
  Filter_Key_Words: 'Filter_Key_Words',
};

// A generic onclick callback function.
chrome.contextMenus.onClicked.addListener(genericOnClick);

// A generic contextMenu onclick callback function.
async function genericOnClick(info) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  const ADD_KEY = `${CUSTOM_MENU_ID.Filter_Key_Words}_ADD`;
  switch (info.menuItemId) {
    case ADD_KEY:
      !!tab &&
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPE.ADD,
          data: info,
        });
      break;
    case `${CUSTOM_MENU_ID.Filter_Key_Words}_CLEAR`:
      !!tab &&
        chrome.tabs.sendMessage(tab.id, {
          type: MESSAGE_TYPE.CLEAR,
        });
      break;
    default:
  }
}

chrome.runtime.onInstalled.addListener(function () {
  let context = 'selection';
  chrome.contextMenus.create({
    title: '屏蔽公司: %s',
    contexts: [context],
    id: `${CUSTOM_MENU_ID.Filter_Key_Words}_ADD`,
  });
  chrome.contextMenus.create({
    title: '移除全部屏蔽公司',
    contexts: [context],
    id: `${CUSTOM_MENU_ID.Filter_Key_Words}_CLEAR`,
  });

  // Intentionally create an invalid item, to show off error checking in the
  // create callback.
  chrome.contextMenus.create(
    { title: 'Oops', parentId: 999, id: 'errorItem' },
    function () {
      if (chrome.runtime.lastError) {
        console.log('Got expected error: ' + chrome.runtime.lastError.message);
      }
    }
  );
});
