var Promise = XlsxPopulate.Promise;
var core        = document.getElementById('core');
var fileInput   = document.getElementById('file-input');
var currentdata = document.getElementById('currentdata');
var result      = document.getElementById('result');
var templateDir = '/templates/';
var fileds = ['id','project','tracker','status','priority','author','assigned_to','subject','description','start_date','done_ratio','created_on','updated_on'];
var issue;
var table;

// ページ読み込み時の処理
window.onload = function() {
  issue = JSON.parse(core.dataset.issue).issue;
  table = JSON.parse(core.dataset.table);
  currentdata.value = `ID: ${issue.id}\nプロジェクト: ${issue.project.name}(${issue.project.id})\nトラッカー: ${issue.tracker.name}(${issue.tracker.id})\n題名: ${issue.subject}`;
}

// マッピングテーブルを返す
function getMappingTable () {
  return table[issue.project.id][issue.tracker.id];
}

/*
  入力処理
  */

// ファイルを入力
function importExcel() {
  getWorkbook()
    .then(function (workbook) {
      // シートの読み込み
      var mappingtable = getMappingTable();
      var sheet =workbook.sheet(0);

      result.value = workbook.sheet(0).cell("C2").value();
    })
    .catch(function (err) {
      var message = (err.message || err);
      result.value = `${message}\n${result.value}`;
    });
}

// 入力ファイルの取得
function getWorkbook() {
  var file = fileInput.files[0];
  if (!file) return Promise.reject("ファイルを選択してください！");
  return XlsxPopulate.fromDataAsync(file);
}

// シートを読み込み
function readSheet (sheet) {
  var mappingtable = getMappingTable();
  data.forEach(function(item) {
    sheet.cell(item.cell.toUpperCase()).value(item.value);
  });
}

// データ送信
function postIssue(data) {
  var xhr = new XMLHttpRequest();
  var url = location.href;
  try{
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
    xhr.onreadystatechange = function () {
      if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        result.value = `${xhr.responseText}\n${result.value}`;
      }
    };
    xhr.send(JSON.stringify(data));
  } catch(e) {
    console.log('catch', e);
  }
}

/*
  出力処理
  */

// ファイルを出力
function exportExcel() {
  var outputFileName = `${issue.id}.xlsx`;
  return generate()
    .then(function (blob) {
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, outputFileName);
      } else {
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.href = url;
        a.download = outputFileName;
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
  var mappingtable = getMappingTable();
  return getTemplate(mappingtable.template)
    .then(function (workbook) {
      // シートに書き込み
      var sheet = workbook.sheet(0);
      // チケットの基本データ
      fileds.forEach(function(key) {
        // 対象のキーがnameプロパティを持っていればその値を、そうでなければ対象のキーの値を出力
        if(mappingtable.issue[key]) sheet.cell(mappingtable.issue[key].toUpperCase()).value(issue[key]['name'] || issue[key]);
      });
      // カスタムフィールドのデータ
      mappingtable.issue.custom_fields.forEach(function(item) {
        if (item.cell) {
          // カスタムフィールドIDが一致する配列のみ抽出
          var cf = issue.custom_fields.filter(function(custom_fields, i) {
            if (custom_fields.id == item.id) return true;
          });
          sheet.cell(item.cell.toUpperCase()).value(cf[0].value);
        }
      });
      return workbook.outputAsync();
    })
}

// テンプレートファイルの取得
function getTemplate(templatePath) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", `${templateDir}${templatePath}`, true);
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