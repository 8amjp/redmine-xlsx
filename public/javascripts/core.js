(function() {

/**
 * エクセル入出力に関する処理
 */

  const Promise = XlsxPopulate.Promise;
  const core = document.getElementById('core');
  const templateDir = '/templates';
  const format = '.json';

  // イベントの追加
  if(document.getElementById('file-input'))    document.getElementById('file-input').addEventListener('change', importExcel, false);
  if(document.getElementById('import-submit')) document.getElementById('import-submit').addEventListener('click', postIssue, false);
  if(document.getElementById('export-submit')) document.getElementById('export-submit').addEventListener('click', exportExcel, false);

  // `postdata`の初期化
  var postdata = {
    'issue' : {}
  };
  if(core.dataset.postdata) postdata = JSON.parse(core.dataset.postdata);

  // リクエストヘッダの設定
  var requestheaders = {
    'Content-type': 'application/json'
  };
  if(core.dataset.switch_user) requestheaders['X-Redmine-Switch-User'] = core.dataset.switch_user;

  // ファイルを入力
  function importExcel(e) {
    getWorkbook(e)
      .then(function (workbook) {
        // シートの読み込み
        let map = JSON.parse(core.dataset.template).mapping_table;
        let sheet =workbook.sheet(0);
        // 基本フィールドのデータ
        Object.keys(map).forEach(function(key) {
          switch (key) {
            // id/nameを持つフィールド
            case 'project':
            case 'tracker':
            case 'status':
            case 'priority':
            case 'author':
            case 'assigned_to':
            case 'category':
            case 'fixed_version':
              // すべて数値型に変換
              postdata.issue[key + '_id'] = parseInt(sheet.cell(map[key].id.cell).value(), 10);
              break;
            // 数値型
            case 'id':
            case 'done_ratio':
            case 'is_private':
            case 'estimated_hours':
            case 'total_estimated_hours':
            case 'spent_hours':
            case 'total_spent_hours':
              // 数値型に変換
              postdata.issue[key] = parseInt(sheet.cell(map[key].cell).value(), 10);
              break;
            // テキスト型
            case 'subject':
            case 'description':
              postdata.issue[key] = sheet.cell(map[key].cell).value();
              break;
            // 日付型
            case 'start_date':
            case 'due_date':
              var date = sheet.cell(map[key].cell).value();
              if (date) postdata.issue[key] = moment(XlsxPopulate.numberToDate(date)).format('YYYY-MM-DD');
              break;
            // 日付と時刻型
            case 'created_on':
            case 'updated_on':
            case 'closed_on':
              var date = sheet.cell(map[key].cell).value();
              if (date) postdata.issue[key] = moment(XlsxPopulate.numberToDate(date)).format(moment.ISO_8601);
              break;
            case 'custom_fields':
              // カスタムフィールドのデータ
              var custom_fields = [];
              var value;
              map.custom_fields.forEach(function(item) {
                switch (item.type) {
                  // 列挙型
                  case 'enumeration':  // キー・バリュー リスト
                  case 'list':         // リスト
                    if (item.multiple) {  // 複数選択可能な場合
                      value = [];
                      item.cell.forEach(function(enumeration){
                        if (sheet.cell(enumeration.cell).value()) value.push((item.type == 'enumeration') ? enumeration.value : sheet.cell(enumeration.cell).value());
                      });
                    } else {
                      value = (item.type == 'enumeration') ? parseInt(sheet.cell(item.cell).value(), 10) : sheet.cell(item.cell).value();
                    }
                    break;
                  // 日付型
                  case 'date':
                  case 'datetime':
                    var date = sheet.cell(item.cell).value();
                    if (date) {
                      date = XlsxPopulate.numberToDate(date);
                      var format = (item.type == 'date') ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:mm:ss';
                      value = moment(date).format(format);
                    }
                    break;
                  // 数値型/真偽値
                  case 'int':
                  case 'bool':
                    value = parseInt(sheet.cell(item.cell).value(), 10);
                    break;
                  // その他(テキスト型)
                  default:
                    value = sheet.cell(item.cell).value();
                    break;
                }
                if (value) custom_fields.push({"value": value, "id": item.id});
              });
              if(custom_fields) postdata.issue.custom_fields = custom_fields;
              break;
            // 添付ファイル
            case 'attachments':
              break;
          }
        });
      })
      .then(function () {
        clearImportResult();
        showPostData(postdata.issue);
      })
      .catch(function (err) {
        showImportResult((err.message || err), null);
      });
  }

  // 入力ファイルの取得
  function getWorkbook(e) {
    let file = e.target.files[0];
    if (!file) return Promise.reject("ファイルを選択してください！");
    return XlsxPopulate.fromDataAsync(file);
  }

  // データ送信
  function postIssue() {
    let xhr = new XMLHttpRequest();
    let url = location.pathname;
    try {
      xhr.open('POST', url, true);
      xhr.responseType = "json";
      Object.keys(requestheaders).forEach(function(key) {
        xhr.setRequestHeader(key, requestheaders[key]);
      });
      xhr.onreadystatechange = function () {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
          showImportResult(null, xhr.response);
        }
      };
      xhr.send(JSON.stringify(postdata));
    } catch(e) {
      console.log(e);
    }
  }

/**
 * 出力処理
 */

  // ファイルを出力
  function exportExcel() {
    let filename = JSON.parse(core.dataset.currentdata).issue.id;
    return generate()
      .then(function (blob) {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, `${filename}.xlsx`);
        } else {
          let url = window.URL.createObjectURL(blob);
          let a = document.createElement("a");
          document.body.appendChild(a);
          a.href = url;
          a.download = `${filename}.xlsx`;
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      })
      .catch(function (err) {
        alert(err.message || err);
        throw err;
      });
  }

  // 出力用ファイルの生成
  function generate() {
    let issue = JSON.parse(core.dataset.currentdata).issue;
    return getTemplateFile(JSON.parse(core.dataset.template).filename)
      .then(function (workbook) {
        // シートに書き込み
        let sheet = workbook.sheet(0);
        let map = JSON.parse(core.dataset.template).mapping_table;
        // チケットの基本データ
        Object.keys(issue).forEach(function(key) {
          if (!(key in map)) return;
          switch (key) {
            // id/nameを持つフィールド
            case 'project':
            case 'tracker':
            case 'status':
            case 'priority':
            case 'author':
            case 'assigned_to':
            case 'category':
            case 'fixed_version':
              if (map[key] && 'cell' in map[key].id)   sheet.cell(map[key].id.cell).value(parseInt(issue[key].id, 10));
              if (map[key] && 'cell' in map[key].name) sheet.cell(map[key].name.cell).value(issue[key].name);
              break;
            // 数値型
            case 'id':
            case 'done_ratio':
            case 'is_private':
            case 'estimated_hours':
            case 'total_estimated_hours':
            case 'spent_hours':
            case 'total_spent_hours':
              if ('cell' in map[key]) sheet.cell(map[key].cell).value(parseInt(issue[key], 10));
              break;
            // テキスト型
            case 'subject':
            case 'description':
              if ('cell' in map[key]) sheet.cell(map[key].cell).value(issue[key]);
              break;
            // 日付型
            case 'start_date':
            case 'due_date':
            case 'created_on':
            case 'updated_on':
            case 'closed_on':
              if ('cell' in map[key]) sheet.cell(map[key].cell).value(new Date(issue[key]));
              break;
            // カスタムフィールドのデータ
            case 'custom_fields':
              map.custom_fields.forEach( function(item) {
                if (item.cell && issue.custom_fields) {
                  // カスタムフィールドIDが一致する配列のみ抽出
                  var cf = issue.custom_fields.filter( function(custom_fields) {
                    if (custom_fields.id == item.id) return true;
                  });
                  switch (item.type) {
                    // 列挙型
                    case 'enumeration':  // キー・バリュー リスト
                    case 'list':         // リスト
                      if (cf[0].multiple) {  // 複数選択可能な場合
                        item.cell.forEach( function(enumeration) {
                          sheet.cell(enumeration.cell).value(cf[0].value.includes(enumeration.value) ? 1 : 0);
                        });
                      } else {  // それ以外(enumerationなら真偽値、listなら値)
                        sheet.cell(item.cell).value((item.type == 'enumeration') ? parseInt(cf[0].value, 10) : cf[0].value);
                      }
                      break;
                    // 日付型
                    case 'date':
                    case 'datetime':
                      if (cf[0].value) sheet.cell(item.cell).value(new Date(cf[0].value));
                      break;
                    // 数値型/真偽値
                    case 'int':
                    case 'bool':
                      sheet.cell(item.cell).value(parseInt(cf[0].value, 10));
                      break;
                    // その他(テキスト型)
                    default:
                      sheet.cell(item.cell).value(cf[0].value);
                  }
                }
              });
              break;
            // 添付ファイル
            case 'attachments':
              if ('cell' in map.attachments) {
                var attachments = [];
                issue.attachments.forEach( function(attachment) {
                  attachments.push(attachment.filename);
                });
                sheet.cell(map.attachments.cell).value(attachments.join('\n'));
              }
              break;
          }
        });
        return workbook.outputAsync();
      })
  }

  // テンプレートファイルの取得
  function getTemplateFile(filename) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", `${templateDir}/${filename}`, true);
      xhr.responseType = "arraybuffer";
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE){
          if (xhr.status === 200) {
            resolve(XlsxPopulate.fromDataAsync(xhr.response));
          } else {
            resolve(XlsxPopulate.fromBlankAsync());
          }
          showExportResult(xhr.status);
        }
      };
      xhr.send();
    });
  }

/**
 * 画面表示に関する処理
 */

  // インポート結果の出力先
  const importResult = document.getElementById('import-result');
  // エクスポート結果の出力先
  const exportResult = document.getElementById('export-result');
  // 現在のデータがあればそれを表示、なければテキストエリアをを無効にする
  if(core.dataset.currentdata) {
    showCurrentData(JSON.parse(core.dataset.currentdata).issue);
  } else {
    disableCurrentData();
  }
  // ポストしないデータのテキストエリアをを無効にする
  if(document.getElementById('postdata_id')) document.getElementById('postdata_id').disabled = true;

  // インポート結果を初期化
  function clearImportResult() {
    importResult.innerHTML = '';
  }

  // インポート結果を表示
  function showImportResult(error, response) {
    let url = core.dataset.host_name;
    let id;
    if (error) {
      importResult.appendChild( createAlert( 'alert-danger', error ));
    }
    if (response) {
      // URL取得
      switch (response.statusCode) {
        case 200: // OK
          id = JSON.parse(core.dataset.currentdata).issue.id;
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
          importResult.appendChild( createAlert( 'alert-info', response.body ));
          break;
      }
    }
  }

  // エクスポート結果を表示
  function showExportResult(status) {
    switch (status) {
      case 200: // OK
        exportResult.appendChild( createAlert( 'alert-success', 'エクスポートが完了しました。' ));
        break;
      default:
        exportResult.appendChild( createAlert( 'alert-warning', 'テンプレートがありません。空白のブックを使用します。' ));
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
          var postvalue    = document.getElementById(`postdata_${key}`)    || document.getElementById(`postdata_${key}_id`);
          var currentvalue = document.getElementById(`currentdata_${key}`) || document.getElementById(`currentdata_${key}_id`);
          if (postvalue) postvalue.value = issue[`${key}_id`] || issue[key];
          if (currentvalue && postvalue.value != currentvalue.value) postvalue.classList.add('text-danger');
          break;
      }
    })
  }

})();