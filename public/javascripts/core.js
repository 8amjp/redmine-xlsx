(function(){
  const Promise = XlsxPopulate.Promise;
  const core = document.getElementById('core');
  const fileInput    = document.getElementById('file-input');
  const exportButton = document.getElementById('export-submit');
  const importButton = document.getElementById('import-submit');
  const currentData  = document.getElementById('current-data');
  const importedData = document.getElementById('imported-data');
  const importResult = document.getElementById('import-result');
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

  // セルのアドレスの書式として正しいかどうかを返す
  function isCell(s) {
    return /[A-Z]+[0-9]+/.test(s);
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
          if (key == 'custom_fields') return;
          if (table[key]) {
            if (table[key].id) {
              var item = {key: key + '_id', cell: table[key].id};
            } else {
              var item = {key: key, cell: table[key]};
            }
            if (isCell(item.cell)) postdata.issue[item.key] = sheet.cell(item.cell).value();
          }
        });
        // カスタムフィールドのデータ
        var custom_fields = [];
        table.custom_fields.forEach(function(item) {
          if (isCell(item.cell)) custom_fields.push({"value": sheet.cell(item.cell).value(), "id": item.id});
        });
        if(custom_fields) postdata.issue.custom_fields = custom_fields;
        importedData.value = JSON.stringify(postdata, null, '  ');
/*
      })
      .catch(function (err) {
        importedData.value = (err.message || err);
*/
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
        Object.keys(table).forEach(function(key) {
          if (key == 'custom_fields') return;
          if (table[key]      && isCell(table[key]))       sheet.cell(table[key]).value(issue[key]);
          if (table[key].id   && isCell(table[key].id))    sheet.cell(table[key].id).value(issue[key].id);
          if (table[key].name && isCell(table[key].name))  sheet.cell(table[key].name).value(issue[key].name);
        });
        // カスタムフィールドのデータ
        table.custom_fields.forEach(function(item) {
          if (item.cell && issue.custom_fields) {
            // カスタムフィールドIDが一致する配列のみ抽出
            var cf = issue.custom_fields.filter(function(custom_fields, i) {
              if (custom_fields.id == item.id) return true;
            });
            if (isCell(item.cell)) sheet.cell(item.cell).value(cf[0].value);
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
            reject("Received a " + xhr.status + " HTTP code.");
          }
        }
      };
      xhr.send();
    });
  }
})();