/**
 * Excel入出力を行うモジュール
 */

var xlsx = (function() {
  const Promise = XlsxPopulate.Promise;

  var _currentdata = {};
  var _postdata = { 'issue' : {} };
  var _template = {};
  var _enumerations = {};
  var _outputfilename = 'issue';

  return {
    // 現在のデータを設定
    set currentdata(value) {
      _currentdata = value;
    },
    // ポスト用データを設定
    set postdata(value) {
      _postdata = value;
    },
    // 
    set template(value) {
      _template = value;
    },
    // 
    set enumerations(value) {
      _enumerations = value;
    },
    set outputfilename(value) {
      _outputfilename = value;
    },
    
    // ファイルを入力
    importExcel: function(e) {
      return new Promise(function (resolve, reject) {
        getWorkbook(e)
        .then(function (workbook) {
          parse(workbook);
        })
        .then(function () {
          resolve(_postdata);
        })
        .catch(function (reason) {
          reject(reason);
        })
      })
    },
    
    // データ送信
    postIssue: function() {
      return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        let url = location.pathname;
        xhr.open('POST', url, true);
        xhr.responseType = 'json';
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onreadystatechange = function () {
          if (xhr.readyState === XMLHttpRequest.DONE){
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(xhr.status);
            }
          }
        };
        xhr.send(JSON.stringify(_postdata));
      });
    },

    // ファイルを出力
    exportExcel: function() {
      let defaultName = `${_outputfilename}.xlsx`;
      return generate()
      .then(function (blob) {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, defaultName);
        } else {
          let url = window.URL.createObjectURL(blob);
          let a = document.createElement('a');
          document.body.appendChild(a);
          a.href = url;
          a.download = defaultName;
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
  }; 

  // 入力ファイルの取得
  function getWorkbook(e) {
    let file = e.files[0];
    if (!file) return Promise.reject('ファイルを選択してください!');
    return XlsxPopulate.fromDataAsync(file);
  }

  // シートを読み込んでポスト用データを作成
  function parse(workbook) {
    return new Promise(function (resolve, reject) {
      let map = _template.mapping_table;
      let sheet = workbook.sheet(0);
      // 基本フィールドのデータ
      Object.keys(map).forEach(function(key) {
        switch (key) {
          // author/assigned_to: 読み込み時は無視
          case 'author':
          case 'assigned_to':
            break;
          // id/nameを持つフィールド:リストから一致するidを取得
          case 'project':
          case 'tracker':
          case 'status':
          case 'priority':
          case 'category':
          case 'fixed_version':
            if (_enumerations[key]) {
              var values = _enumerations[key].filter( function(e) {
                return (e.name == sheet.cell(map[key].cell).value());
              });
              if (values.length > 0) _postdata.issue[`${key}_id`] = values[0].id;
            }
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
            var value = parseInt(sheet.cell(map[key].cell).value(), 10);
            if (value) _postdata.issue[key] = value;
            break;
          // テキスト型
          case 'subject':
          case 'description':
            var value = sheet.cell(map[key].cell).value();
            if (value) _postdata.issue[key] = value;
            break;
          // 日付型
          case 'start_date':
          case 'due_date':
            var date = sheet.cell(map[key].cell).value();
            if (date) _postdata.issue[key] = moment(XlsxPopulate.numberToDate(date)).format('YYYY-MM-DD');
            break;
          // 日付と時刻型
          case 'created_on':
          case 'updated_on':
          case 'closed_on':
            var date = sheet.cell(map[key].cell).value();
            if (date) _postdata.issue[key] = moment(XlsxPopulate.numberToDate(date)).format(moment.ISO_8601);
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
                  var date = sheet.cell(item.cell).value();
                  if (date) value = moment(XlsxPopulate.numberToDate(date)).format('YYYY-MM-DD');
                  break;
                case 'datetime':
                  var date = sheet.cell(item.cell).value();
                  if (date) value = moment(XlsxPopulate.numberToDate(date)).format('YYYY-MM-DDTHH:mm:ss');
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
            if(custom_fields.length > 0) _postdata.issue.custom_fields = custom_fields;
            break;
          // 添付ファイル
          case 'attachments':
            break;
        }
      });
      resolve();
    });
  }

  // 出力用ファイルの生成
  function generate() {
    return getTemplateFile(_template.filename)
    .then(function (workbook) {
      return append(workbook);
    });
  }

  // 出力用テンプレートファイルの取得
  function getTemplateFile(filename) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", filename, true);
      xhr.responseType = "arraybuffer";
      xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE){
          if (xhr.status === 200) {
            resolve(XlsxPopulate.fromDataAsync(xhr.response));
          } else {
            resolve(XlsxPopulate.fromBlankAsync());
          }
        }
      };
      xhr.send();
    });
  }

  // 出力用ファイルに書き込み
  function append(workbook) {
    let sheet = workbook.sheet(0);
    let issue = _currentdata.issue;
    let map = _template.mapping_table;
    // チケットの基本データ
    Object.keys(issue).forEach(function(key) {
      if (!(key in map)) return;
      switch (key) {
        // id/nameを持つフィールド:`name`の値を出力
        case 'project':
        case 'tracker':
        case 'status':
        case 'priority':
        case 'author':
        case 'assigned_to':
        case 'category':
        case 'fixed_version':
          if ('cell' in map[key]) sheet.cell(map[key].cell).value(issue[key].name);
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
  }
})();