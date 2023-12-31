const STORAGE_KEY = {
  FILTER_COMPANY_NAMES: 'FILTER_COMPANY_NAMES',
};
const MESSAGE_TYPE = {
  ADD: 'FILTER_COMPANY_NAME_ADD',
  CLEAR: 'FILTER_COMPANY_NAME_CLEAR',
  DELETE: 'FILTER_COMPANY_NAME_DELETE',
};

// Get the selected text content
function getSelectedText() {
  let selectedText = '';
  if (window.getSelection) {
    selectedText = window.getSelection().toString();
  } else if (document.selection && document.selection.type !== 'Control') {
    selectedText = document.selection.createRange().text;
  }
  return selectedText;
}

class FilterExtension {
  constructor() {
    this.FILTER_COMPANY_NAMES = []; // default filter company names: [companyName1, companyName2]
    this.domMutationObserver = null;
    this.storageCompanyNames = null; // cache the data retrieved from localStorage
    this.storageCompanyNamesTempCacheTime = 10 * 60 * 1000; // 10mins cache time
    this.storageDataTempCache = {};
    this.lastStorageDataTempCacheTime = -1;
    this.removedCompanyNames = ''; // record removed company name
  }

  init() {
    this.addMessageListener();
    this.onObserverDomMutationAction();
  }
  getDomTextContent(dom, selectId) {
    try {
      return dom.querySelector(selectId).textContent || '';
    } catch (error) {
      return '';
    }
  }
  async onStartCompanyNamesFilterAction() {
    const cardWrappers = document.querySelector('.job-list-box');
    this.removedCompanyNames = ''; // reset removedCompanyNames
    const filterCompanyNames = await this.getAllFilterCompanyNames();
    for (let i = cardWrappers.children.length - 1; i >= 0; i--) {
      const cardWrapper = cardWrappers.children[i];
      const companyName = this.getDomTextContent(cardWrapper, '.company-name');
      const companyJobName = this.getDomTextContent(cardWrapper, '.job-name');
      const companyJobSalary = this.getDomTextContent(cardWrapper, '.salary');
      if (filterCompanyNames.find((f) => companyName.includes(f))) {
        this.removedCompanyNames += `|${companyName}/${companyJobName}/${companyJobSalary}\n`;
        cardWrapper.remove();
      }
    }
    !!this.removedCompanyNames &&
      console.warn(
        `%c [${this.removedCompanyNames}], Don't do any resistance, you have been killed!`,
        'font-size:13px; background:yellow; color:#bf2c9f;'
      );
  }
  onObserverDomMutationAction() {
    this.domMutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const { removedNodes = [], addedNodes = [] } = mutation;
        // If it is deletion operation or type is not equal childList, it will be return early
        if (mutation.type !== 'childList' || removedNodes.length) {
          return;
        }
        const jobListBoxNode = addedNodes[0];
        if (!jobListBoxNode?.classList?.contains('job-list-box')) {
          return;
        }
        this.onStartCompanyNamesFilterAction();
      });
    });

    const observerOptions = {
      childList: true, // Observe changes to the child nodes
      subtree: true, // Observe changes in the entire subtree
      attributes: false, // Observe attribute modifications
      attributeOldValue: false, // Record the old value of modified attributes
    };
    this.domMutationObserver.observe(document.body, observerOptions);
  }
  // Handling all the filter company names from sync setting
  async getAllFilterCompanyNames() {
    const storageCompanyNames = await this.handleStorageSyncData('get', [
      STORAGE_KEY.FILTER_COMPANY_NAMES,
    ]);
    this.storageCompanyNames =
      storageCompanyNames?.[STORAGE_KEY.FILTER_COMPANY_NAMES] || [];
    return [...this.FILTER_COMPANY_NAMES, ...this.storageCompanyNames];
  }
  setIsFilterCompanyNamesChanged(method = '', key, changed) {
    return new Promise((resolve, reject) => {
      switch (method.toLowerCase()) {
        case 'get':
          resolve(localStorage.getItem(key));
          break;
        case 'set':
          localStorage.setItem(key, changed);
          resolve('done');
          break;
        default:
          reject('No method provided');
      }
    });
  }
  async onAddNewFilterCompanyNameToStorage(data = {}) {
    const selectionText = data?.selectionText || getSelectedText();
    if (!selectionText) {
      return;
    }
    const storageCompanyNames = await this.handleStorageSyncData('get', [
      STORAGE_KEY.FILTER_COMPANY_NAMES,
    ]);
    let storageCompanyNamesArray =
      storageCompanyNames?.[STORAGE_KEY.FILTER_COMPANY_NAMES] || [];
    storageCompanyNamesArray.push(selectionText);
    storageCompanyNamesArray = Array.from(
      new Set(storageCompanyNamesArray)
    ).sort();
    this.handleStorageSyncData('set', {
      [STORAGE_KEY.FILTER_COMPANY_NAMES]: storageCompanyNamesArray,
    });
  }
  async handleStorageSyncData(method = '', data = []) {
    return new Promise(async (resolve, reject) => {
      switch (method.toLowerCase()) {
        case 'get':
          const key = data.toString();
          const currentTime = new Date().getTime();
          const isStorageDataChanged =
            await this.setIsFilterCompanyNamesChanged(
              'get',
              'isStorageDataChanged'
            );
          if (
            !isStorageDataChanged &&
            this.storageDataTempCache[key] &&
            this.lastStorageDataTempCacheTime > 0 &&
            currentTime - this.lastStorageDataTempCacheTime <=
              this.storageCompanyNamesTempCacheTime
          ) {
            resolve(this.storageDataTempCache[key]);
          } else {
            chrome.storage.sync.get(data).then((result) => {
              this.storageDataTempCache[key] = result;
              this.setIsFilterCompanyNamesChanged(
                'set',
                'isStorageDataChanged',
                ''
              );
              this.lastStorageDataTempCacheTime = new Date().getTime();
              resolve(result);
            });
          }
          break;
        case 'set':
          chrome.storage.sync.set(data).then(() => {
            this.setIsFilterCompanyNamesChanged(
              'set',
              'isStorageDataChanged',
              'changed'
            );
            resolve('done');
          });
          break;
        case 'clear':
          chrome.storage.sync.clear().then(() => {
            this.setIsFilterCompanyNamesChanged(
              'set',
              'isStorageDataChanged',
              'changed'
            );
            resolve('done');
          });
          break;
        case 'delete':
          const storageCompanyNames = await this.handleStorageSyncData('get', [
            STORAGE_KEY.FILTER_COMPANY_NAMES,
          ]);
          const storageCompanyNamesArray =
            storageCompanyNames[STORAGE_KEY.FILTER_COMPANY_NAMES] || [];
          for (let i = storageCompanyNamesArray.length - 1; i >= 0; i--) {
            const element = storageCompanyNamesArray[i];
            if (data.indexOf(element) >= 0) {
              storageCompanyNamesArray.splice(i, 1);
            }
          }
          return this.handleStorageSyncData('set', {
            [STORAGE_KEY.FILTER_COMPANY_NAMES]: storageCompanyNamesArray,
          });
        default:
          reject('No method provided');
      }
    });
  }
  // Adding message listener from chrome tab/runtime and trigger corresponding actions
  addMessageListener() {
    chrome.runtime.onMessage.addListener((e) => {
      switch (e.type) {
        case MESSAGE_TYPE.ADD:
          return this.onAddNewFilterCompanyNameToStorage(e.data);
        case MESSAGE_TYPE.CLEAR:
          return this.handleStorageSyncData('clear');
        case MESSAGE_TYPE.DELETE:
          return this.handleStorageSyncData('delete', [e.data]);
        default:
          return Promise.resolve();
      }
    });
  }

  destroy() {
    this.domMutationObserver.disconnect();
    this.domMutationObserver = null;
    window.removeEventListener('beforeunload', ext.destroy);
  }
}

const ext = new FilterExtension();
ext.init();

window.addEventListener('beforeunload', (e) => {
  ext.destroy.call(ext);
});
