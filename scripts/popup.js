const STORAGE_KEY = {
  FILTER_COMPANY_NAMES: 'FILTER_COMPANY_NAMES',
};

const MESSAGE_TYPE = {
  ADD: 'FILTER_COMPANY_NAME_ADD',
  CLEAR: 'FILTER_COMPANY_NAME_CLEAR',
  DELETE: 'FILTER_COMPANY_NAME_DELETE',
};

async function isShowEmptyView() {
  const storageList = document.getElementById('storageList');
  if (storageList.childNodes.length === 0) {
    storageList.appendChild(document.createTextNode('Empty Block Company!'));
  }
}

async function handleDelete(e) {
  const companyName = e.target.dataset?.name;
  const delId = e.target.dataset?.id;
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  !!tab &&
    chrome.tabs
      .sendMessage(tab.id, {
        type: MESSAGE_TYPE.DELETE,
        data: companyName,
      })
      .then(() => {
        document.querySelector(`#${delId}`).remove();
        isShowEmptyView();
      });
}

function addCompanyNameListView(storageList, storageFilterCompanyNamesArray) {
  storageFilterCompanyNamesArray.forEach((name, index) => {
    const listItem = document.createElement('li');
    const delId = `${name}-${index}`;
    listItem.setAttribute('id', delId);
    const divC = document.createElement('div');
    divC.classList.add('item');
    const nameNode = document.createTextNode(name);
    const deleteNode = document.createElement('span');
    deleteNode.classList.add('del');
    deleteNode.appendChild(document.createTextNode('X'));
    deleteNode.setAttribute('data-name', name);
    deleteNode.setAttribute('data-id', delId);
    deleteNode.addEventListener('click', this.handleDelete);
    divC.appendChild(nameNode);
    divC.appendChild(deleteNode);
    listItem.appendChild(divC);
    storageList.appendChild(listItem);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get(null, function (data) {
    const storageList = document.getElementById('storageList');
    storageList.innerHTML = '';
    const storageFilterCompanyNamesArray =
      data?.[STORAGE_KEY.FILTER_COMPANY_NAMES] || [];
    storageFilterCompanyNamesArray.length
      ? addCompanyNameListView(storageList, storageFilterCompanyNamesArray)
      : isShowEmptyView();
  });
});
