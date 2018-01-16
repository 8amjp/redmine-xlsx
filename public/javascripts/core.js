(function() {

/**
 * エクセル入出力に関する処理
 */

  const Promise = XlsxPopulate.Promise;
  const core = document.getElementById('core');
  const templateDir = '/templates';

  // イベントの追加
  if(document.getElementById('file-input'))    document.getElementById('file-input').addEventListener('change', importExcel, false);
  if(document.getElementById('import-submit')) document.getElementById('import-submit').addEventListener('click', postIssue, false);
  if(document.getElementById('export-submit')) document.getElementById('export-submit').addEventListener('click', exportExcel, false);

  // `postdata`の初期化
  var postdata = { 'issue' : {} };
  if(core.dataset.postdata) postdata = JSON.parse(core.dataset.postdata);

  // ファイルを入力
  function importExcel(e) {
    getWorkbook(e)
      .then(function (workbook) {
        // シートの読み込み
        var mapping_table = JSON.parse(core.dataset.mapping_table);
        var sheet =workbook.sheet(0);
        // 基本フィールドのデータ
        Object.keys(mapping_table).forEach(function(key) {
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
              postdata.issue[key + '_id'] = parseInt(sheet.cell(mapping_table[key].id.cell).value(), 10);
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
              postdata.issue[key] = parseInt(sheet.cell(mapping_table[key].cell).value(), 10);
              break;
            // テキスト型
            case 'subject':
            case 'description':
              postdata.issue[key] = sheet.cell(mapping_table[key].cell).value();
              break;
            // 日付型
            case 'start_date':
            case 'due_date':
              var date = sheet.cell(mapping_table[key].cell).value();
              if (date) postdata.issue[key] = moment(XlsxPopulate.numberToDate(date)).format('YYYY-MM-DD');
              break;
            // 日付と時刻型
            case 'created_on':
            case 'updated_on':
            case 'closed_on':
              var date = sheet.cell(mapping_table[key].cell).value();
              if (date) postdata.issue[key] = moment(XlsxPopulate.numberToDate(date)).format(moment.ISO_8601);
              break;
            case 'custom_fields':
              // カスタムフィールドのデータ
              var custom_fields = [];
              mapping_table.custom_fields.forEach(function(item) {
                var value;
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
    var file = e.target.files[0];
    if (!file) return Promise.reject("ファイルを選択してください！");
    return XlsxPopulate.fromDataAsync(file);
  }

  // データ送信
  function postIssue() {
    var xhr = new XMLHttpRequest();
    var url = location.href;
    try {
      xhr.open('POST', url, true);
      xhr.responseType = "json";
      xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
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
    var filename = JSON.parse(core.dataset.currentdata).issue.id;
    return generate()
      .then(function (blob) {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, `${filename}.xlsx`);
        } else {
          var url = window.URL.createObjectURL(blob);
          var a = document.createElement("a");
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
    var issue = JSON.parse(core.dataset.currentdata).issue;
    return getTemplateFile(core.dataset.template_name)
      .then(function (workbook) {
        // シートに書き込み
        var sheet = workbook.sheet(0);
        var mapping_table = JSON.parse(core.dataset.mapping_table);
        // チケットの基本データ
        Object.keys(issue).forEach(function(key) {
          if (!(key in mapping_table)) return;
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
              if (mapping_table[key] && 'cell' in mapping_table[key].id)   sheet.cell(mapping_table[key].id.cell).value(parseInt(issue[key].id, 10));
              if (mapping_table[key] && 'cell' in mapping_table[key].name) sheet.cell(mapping_table[key].name.cell).value(issue[key].name);
              break;
            // 数値型
            case 'id':
            case 'done_ratio':
            case 'is_private':
            case 'estimated_hours':
            case 'total_estimated_hours':
            case 'spent_hours':
            case 'total_spent_hours':
              if ('cell' in mapping_table[key]) sheet.cell(mapping_table[key].cell).value(parseInt(issue[key], 10));
              break;
            // テキスト型
            case 'subject':
            case 'description':
              if ('cell' in mapping_table[key]) sheet.cell(mapping_table[key].cell).value(issue[key]);
              break;
            // 日付型
            case 'start_date':
            case 'due_date':
            case 'created_on':
            case 'updated_on':
            case 'closed_on':
              if ('cell' in mapping_table[key]) sheet.cell(mapping_table[key].cell).value(new Date(issue[key]));
              break;
            // カスタムフィールドのデータ
            case 'custom_fields':
              mapping_table.custom_fields.forEach( function(item) {
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
              if ('cell' in mapping_table.attachments) {
                var attachments = [];
                issue.attachments.forEach( function(attachment) {
                  attachments.push(attachment.filename);
                });
                sheet.cell(mapping_table.attachments.cell).value(attachments.join('\n'));
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
    if (error) {
      importResult.appendChild( this.createAlert( 'alert-danger', error ));
    }
    if (response) {
      switch (response.statusCode) {
        case 200: // OK
          importResult.appendChild( this.createAlert( 'alert-success', 'インポートが完了しました。' ));
          break;
        case 201: // Created
          importResult.appendChild( this.createAlert( 'alert-success', `新しいチケット#<strong>${response.body.issue.id}</strong>が作成されました。` ));
          break;
        case 422: // Unprocessable Entity
          response.body.errors.forEach(function(message) {
            importResult.appendChild( this.createAlert( 'alert-danger', message ));
          });
        default:
          importResult.appendChild( this.createAlert( 'alert-info', response.body ));
          break;
      }
    }
  }

  // エクスポート結果を表示
  function showExportResult(status) {
    if (status != 200) {
      exportResult.appendChild( this.createAlert( 'alert-warning', 'テンプレートがありません。空白のブックを使用します。' ));
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
          issue[key].forEach(function(item) {
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
          issue[key].forEach(function(item) {
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