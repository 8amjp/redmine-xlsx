(function(){
  const Promise = XlsxPopulate.Promise;
  const core = document.getElementById('core');
  const fileInput    = document.getElementById('file-input');
  const exportButton = document.getElementById('export-submit');
  const importButton = document.getElementById('import-submit');
  const currentData  = document.getElementById('current-data');
  const importedData = document.getElementById('imported-data');
  const importResult = document.getElementById('import-result');
  const exportResult = document.getElementById('export-result');
  const templateSelector = document.getElementById('template-selector');
  const templateDir = '/templates';

  var postdata;

  /*
    入出力共通の処理
    */
  window.onload = function() {
    if(fileInput) fileInput.addEventListener('change', importExcel, false);
    if(exportButton) exportButton.addEventListener('click', exportExcel, false);
    if(importButton) importButton.addEventListener('click', postIssue, false);
    if(currentData) currentData.value = JSON.stringify(JSON.parse(core.dataset.issue), null, '  ');
    if(templateSelector) addTemplateSelector();
  };

  // テンプレートの情報を返す
  function getTemplateInfo(project_id, tracker_id) {
    var template = JSON.parse(core.dataset.template);
    return template[project_id][tracker_id] || template[project_id] || template;
  }

  /*
    入力処理
    */

  // テンプレート選択オプションの追加
  function addTemplateSelector() {
    var template = JSON.parse(core.dataset.template);
    var options = []
    if (template.mapping_table) {
      options.push({text:template.title, value: {}})
    } else {
      Object.keys(template).forEach(function(key1) {
        if (template[key1].mapping_table) {
            options.push({ text:template[key1].title, value: {project:{id:key1}} })
        } else {
          Object.keys(template[key1]).forEach(function(key2) {
            if (template[key1][key2].mapping_table) {
              options.push({ text:template[key1][key2].title, value: {project:{id:key1}, tracker:{id:key2}} })
            }
          })
        }
      })
    }
    options.forEach(function(item) {
      var option = document.createElement("option");
      option.text = item.text;
      option.value = JSON.stringify(item.value);
      templateSelector.add(option);
    });
  }

  // ファイルを入力
  function importExcel(e) {
    getWorkbook(e)
      .then(function (workbook) {
        postdata = {
          'issue' : {}
        };
        // シートの読み込み
        var issue = core.dataset.issue ? JSON.parse(core.dataset.issue).issue : JSON.parse(templateSelector.value);
        var template = getTemplateInfo(issue.project.id, issue.tracker.id);
        var table = template.mapping_table;
        var sheet =workbook.sheet(0);
        // 基本フィールドのデータ
        Object.keys(table).forEach(function(key) {
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
              postdata.issue[key + '_id'] = parseInt(sheet.cell(table[key].id.cell).value(), 10);
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
              postdata.issue[key] = parseInt(sheet.cell(table[key].cell).value(), 10);
              break;
            // テキスト型
            case 'subject':
            case 'description':
              postdata.issue[key] = sheet.cell(table[key].cell).value();
              break;
            // 日付型
            case 'start_date':
              postdata.issue[key] = moment(sheet.cell(table[key].cell).value()).format('YYYY-MM-DD');
              break;
            // 日付と時刻型
            case 'created_on':
            case 'updated_on':
            case 'closed_on':
              postdata.issue[key] = moment(sheet.cell(table[key].cell).value()).format(moment.ISO_8601);
              break;
            case 'custom_fields':
              // カスタムフィールドのデータ
              var custom_fields = [];
              table.custom_fields.forEach(function(item) {
                var value;
                switch (item.type) {
                  // 列挙型
                  case 'enumeration':
                    if (Array.isArray(item.cell)) {  // 配列(複数選択可能なキー・バリュー リスト)の場合
                      value = [];
                      item.cell.forEach(function(enumeration){
                        if (sheet.cell(enumeration.cell).value()) value.push(enumeration.value);
                      });
                    } else {
                      value = parseInt(sheet.cell(item.cell).value(), 10);
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
              // 内容の出力
              importedData.value = JSON.stringify(postdata, null, '  ');
              break;
          }
        });
      })
      .catch(function (err) {
        importedData.value = (err.message || err);
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
    try{
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
      xhr.onreadystatechange = function () {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
          importResult.value = `${xhr.responseText}\n${importResult.value}`;
        }
      };
      xhr.send(JSON.stringify(postdata));
    } catch(e) {
      console.log(e);
    }
  }

  /*
    出力処理
    */

  // ファイルを出力
  function exportExcel() {
    var filename = JSON.parse(core.dataset.issue).issue.id;
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
    var issue = JSON.parse(core.dataset.issue).issue;
    var template = getTemplateInfo(issue.project.id, issue.tracker.id);
    return getTemplateFile(template.filename)
      .then(function (workbook) {
        // シートに書き込み
        var sheet = workbook.sheet(0);
        var table = template.mapping_table;
        // チケットの基本データ
        Object.keys(issue).forEach(function(key) {
          if (!(key in table)) return;
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
              if (table[key] && 'cell' in table[key].id)   sheet.cell(table[key].id.cell).value(parseInt(issue[key].id, 10));
              if (table[key] && 'cell' in table[key].name) sheet.cell(table[key].name.cell).value(issue[key].name);
              break;
            // 数値型
            case 'id':
            case 'done_ratio':
            case 'is_private':
            case 'estimated_hours':
            case 'total_estimated_hours':
            case 'spent_hours':
            case 'total_spent_hours':
              if ('cell' in table[key]) sheet.cell(table[key].cell).value(parseInt(issue[key], 10));
              break;
            // テキスト型
            case 'subject':
            case 'description':
              if ('cell' in table[key]) sheet.cell(table[key].cell).value(issue[key]);
              break;
            // 日付型
            case 'start_date':
            case 'created_on':
            case 'updated_on':
            case 'closed_on':
              if ('cell' in table[key]) sheet.cell(table[key].cell).value(new Date(issue[key]));
              break;
            // カスタムフィールドのデータ
            case 'custom_fields':
              table.custom_fields.forEach( function(item) {
                if (item.cell && issue.custom_fields) {
                  // カスタムフィールドIDが一致する配列のみ抽出
                  var cf = issue.custom_fields.filter( function(custom_fields) {
                    if (custom_fields.id == item.id) return true;
                  });
                  var value = cf[0].value;
                  switch (item.type) {
                    // 列挙型
                    case 'enumeration':
                      if (Array.isArray(value)) {  // 複数選択可能なキー・バリュー リストの場合
                        item.cell.forEach( function(enumeration) {
                          sheet.cell(enumeration.cell).value(value.includes(enumeration.value) ? 1 : 0);
                        });
                      } else {  // それ以外(真偽値)
                        sheet.cell(item.cell).value(parseInt(value, 10));
                      }
                      break;
                    // 日付型
                    case 'date':
                    case 'datetime':
                      if (value) sheet.cell(item.cell).value(new Date(value));
                      break;
                    // 数値型/真偽値
                    case 'int':
                    case 'bool':
                      sheet.cell(item.cell).value(parseInt(value, 10));
                      break;
                    // その他(テキスト型)
                    default:
                      sheet.cell(item.cell).value(value);
                  }
                }
              });
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
            exportResult.value = 'テンプレートがありません。空白のブックを使用します。';
          }
        }
      };
      xhr.send();
    });
  }
})();