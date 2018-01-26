/**
 * 画面表示に関する処理
 */

// インポート結果の出力先
const importResult = document.getElementById('import-result');
// エクスポート結果の出力先
const exportResult = document.getElementById('export-result');

const core = document.getElementById('core');
if(core.dataset.json) {
  let json = JSON.parse(core.dataset.json);
  //
  if(0 !== Object.keys(json.template).length) xlsx.template = json.template;
  // 現在のデータがあればそれを表示、なければテキストエリアをを無効にする
  if(0 !== Object.keys(json.currentdata).length) {
    xlsx.currentdata = json.currentdata;
    if(json.currentdata.issue && json.currentdata.issue.id) xlsx.outputfilename = json.currentdata.issue.id;
    showCurrentData(json.currentdata.issue);
  } else {
    disableCurrentData();
  }
  //
  if(0 !== Object.keys(json.postdata).length) xlsx.postdata = json.postdata;
  //
  let enumerations = {};
  if(0 !== Object.keys(json.projects).length)         enumerations.projects      = json.projects;
  if(0 !== Object.keys(json.trackers).length)         enumerations.trackers      = json.trackers;
  if(0 !== Object.keys(json.issue_statuses).length)   enumerations.status        = json.issue_statuses;
  if(0 !== Object.keys(json.issue_priorities).length) enumerations.priority      = json.issue_priorities;
  if(0 !== Object.keys(json.issue_categories).length) enumerations.category      = json.issue_categories;
  if(0 !== Object.keys(json.versions).length)         enumerations.fixed_version = json.versions;
  xlsx.enumerations = enumerations;
}

// ポストしないデータのテキストエリアをを無効にする
if(document.getElementById('postdata_id')) document.getElementById('postdata_id').disabled = true;

// イベントの追加
if(document.getElementById('file-input')) {
  document.getElementById('file-input').addEventListener('change', function(){
    xlsx.importExcel(this)
    .then(function (response) {
      clearImportResult();
      showPostData(response.issue);
    })
    .catch(function (reason) {
      showImportResult(reason);
    });
  }, false);
}
if(document.getElementById('import-submit')) {
  document.getElementById('import-submit').addEventListener('click', function(){
    xlsx.postIssue()
    .then(function (response) {
      showImportResult(response);
    })
  }, false);
}
if(document.getElementById('export-submit')) {
  document.getElementById('export-submit').addEventListener('click', function(){
    xlsx.exportExcel()
  }, false);
}

// インポート結果を初期化
function clearImportResult() {
  importResult.innerHTML = '';
}

// インポート結果を表示
function showImportResult(response) {
  let url = core.dataset.host_name;
  let id;
  switch (response.statusCode) {
    case 200: // OK
      id = JSON.parse(core.dataset.json).currentdata.issue.id;
      importResult.appendChild( createAlert( 'alert-success',
        `インポートが完了しました。<br><a href="${url}issues/${id}" class="alert-link">このチケットに移動する</a>`
      ));
      break;
    case 201: // Created
      // URL取得
      id = response.body.issue.id;
      importResult.appendChild( createAlert( 'alert-success',
        `新しいチケット#<a href="${url}issues/${id}" class="alert-link">${id}</a>が作成されました。<br><a href="${url}issues/${id}" class="alert-link">このチケットに移動する</a>`
      ));
      break;
    case 422: // Unprocessable Entity
      response.body.errors.forEach(function(message) {
        importResult.appendChild( createAlert( 'alert-danger', message ));
      });
      break;
    default:
      console.log(response.body);
      importResult.appendChild( createAlert( 'alert-danger', response.body ));
      break;
  }
}

// 表示用アラートを作成
function createAlert(type, message) {
  let element = document.createElement('div');
  element.classList.add('alert', type);
  element.setAttribute('role', 'alert');
  element.innerHTML = message;
  return element;
}

// 現在のデータをテーブルに表示
function showCurrentData(issue) {
  Object.keys(issue).forEach(function(key) {
    switch (key) {
      case 'custom_fields':
        issue.custom_fields.forEach(function(item) {
          var currentvalue = document.getElementById(`currentdata_cf_${item.id}`);
          if(currentvalue) currentvalue.value = item.value;
        });
        break;
      default:
        var currentvalue = document.getElementById(`currentdata_${key}`) || document.getElementById(`currentdata_${key}_id`);
        if(currentvalue) currentvalue.value = issue[key].id || issue[key];
        break;
    }
  })
}

// 現在のデータを表示するテキストエリアを無効にする
function disableCurrentData() {
  [].forEach.call(document.getElementsByClassName('currentdata'),function(element){
    element.disabled = true;
  });
}

// 読み込まれたデータをテーブルに表示
function showPostData(issue) {
  Object.keys(issue).forEach(function(key) {
    key = key.replace(/_id$/, '');
    switch (key) {
      case 'custom_fields':
        issue.custom_fields.forEach(function(item) {
          var postvalue    = document.getElementById(`postdata_cf_${item.id}`);
          var currentvalue = document.getElementById(`currentdata_cf_${item.id}`);
          if (postvalue) postvalue.value = item.value;
          if (currentvalue && postvalue.value != currentvalue.value) postvalue.classList.add('text-danger');
        });
        break;
      default:
        var postvalue    = document.getElementById(`postdata_${key}`);
        var currentvalue = document.getElementById(`currentdata_${key}`);
        if (postvalue) postvalue.value = issue[key] || issue[`${key}_id`];
        if (currentvalue && postvalue.value != currentvalue.value) postvalue.classList.add('text-danger');
        break;
    }
  })
}