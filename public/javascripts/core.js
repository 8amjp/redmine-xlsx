(function() {
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
    if(0 !== Object.keys(json.issue).length) {
      xlsx.issue = json.issue;
      if(core.dataset.workbookname) xlsx.workbookname = core.dataset.workbookname;
      showCurrentIssue(json.issue);
    } else {
      disableCurrentIssue();
    }
    //
    if(0 !== Object.keys(json.defaults).length) xlsx.defaults = json.defaults;
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
  if(document.getElementById('postissue_id')) document.getElementById('postissue_id').disabled = true;

  if(document.getElementById('import-submit')) document.getElementById('import-submit').disabled = true;

  // イベントの追加
  if(document.getElementById('file-input')) {
    document.getElementById('file-input').addEventListener('change', function(){
      importResult.innerHTML = '';
      xlsx.importExcel(this.files[0])
      .then(function (response) {
        showPostData(response.issue);
        document.getElementById('import-submit').disabled = false;
        document.getElementById('import-submit').addEventListener('click', function(){
          importSubmit(response)
        }, false);
      })
      .catch(function (reason) {
        showImportResult(reason);
      });
    }, false);
  }
  if(document.getElementById('export-submit')) {
    document.getElementById('export-submit').addEventListener('click', function(){
      xlsx.exportExcel()
    }, false);
  }

 // インポート
  function importSubmit(response) {
    xlsx.postIssue()
    .then(function (response) {
      showImportResult(response);
    })
    .catch(function (reason) {
      showImportResult(reason);
    });
  }

  // インポート結果を表示
  function showImportResult(response) {
    let url = core.dataset.host_name;
    let id;
    switch (response.statusCode) {
      case 200: // OK
        id = JSON.parse(core.dataset.json).issue.id;
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
        if (response.body.errors.length > 0) {
          response.body.errors.forEach(function(message) {
            importResult.appendChild( createAlert( 'alert-danger', message ));
          });
        }
        break;
      default:
        importResult.appendChild( createAlert( 'alert-info', response ));
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
  function showCurrentIssue(issue) {
    let field;
    Object.keys(issue).forEach(function(key) {
      switch (key) {
        case 'custom_fields':
          issue.custom_fields.forEach(function(item) {
            field = document.getElementById(`issue_custom_field_values_${item.id}`);
            if(field) field.value = item.value;
          });
          break;
        default:
          field = document.getElementById(`issue_${key}`) || document.getElementById(`issue_${key}_id`);
          if(field) field.value = issue[key].id || issue[key];
          break;
      }
    })
  }

  // 現在のデータを表示するテキストエリアを無効にする
  function disableCurrentIssue() {
    [].forEach.call(document.getElementsByClassName('issue'),function(element){
      element.disabled = true;
    });
  }

  // 読み込まれたデータをテーブルに表示
  function showPostData(issue) {
    let fields;
    Object.keys(issue).forEach(function(key) {
      key = key.replace(/_id$/, '');
      switch (key) {
        case 'custom_fields':
          issue.custom_fields.forEach(function(item) {
            fields = [
              document.getElementById(`issue_custom_field_values_${item.id}`),
              document.getElementById(`postissue_custom_field_values_${item.id}`)
            ];
            if (fields[1]) fields[1].value = item.value;
            if (fields[0] && fields[0].value != fields[1].value) fields[1].classList.add('text-danger');
          });
          break;
        default:
          fields = [
            document.getElementById(`issue_${key}`),
            document.getElementById(`postissue_${key}`)
          ];
          if (fields[1]) fields[1].value = issue[key] || issue[`${key}_id`];
          if (fields[0] && fields[0].value != fields[1].value) fields[1].classList.add('text-danger');
          break;
      }
    })
  }
})();