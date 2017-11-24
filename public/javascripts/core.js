var Promise = XlsxPopulate.Promise;
var core         = document.getElementById('core');
var fileInput    = document.getElementById('file-input');
var currentdata  = document.getElementById('currentdata');
var imported     = document.getElementById('imported');
var result       = document.getElementById('result');
var submitButton = document.getElementById('submit');

var templateDir = '/templates';
var fileds = ['id','project','tracker','status','priority','author','assigned_to','subject','description','start_date','done_ratio','created_on','updated_on'];
var issue;
var table;
var postdata;

// ページ読み込み時の処理
window.onload = function() {
  issue = JSON.parse(core.dataset.issue).issue;
  table = JSON.parse(core.dataset.table);
  currentdata.value = `ID: ${issue.id}\nプロジェクト: ${issue.project.name}(${issue.project.id})\nトラッカー: ${issue.tracker.name}(${issue.tracker.id})\n題名: ${issue.subject}`;
}

/*
  入出力共通の処理
  */

// マッピングテーブルを返す
function getMappingTable () {
  return table[issue.project.id][issue.tracker.id] || table[issue.project.id] || table;
}

/*
  入力処理
  */

// ファイルを入力
function importExcel() {
  getWorkbook()
    .then(function (workbook) {
      postdata = {
        'issue' : {}
      };
      // シートの読み込み
      var mappingtable = getMappingTable();
      var sheet =workbook.sheet(0);
      // カスタムフィールドのデータ
      var custom_fields = [];
      mappingtable.custom_fields.forEach(function(item) {
        if (item.cell) custom_fields.push({"value": sheet.cell(item.cell.toUpperCase()).value(), "id": item.id});
      });
      // 基本フィールドのデータ// TODO
      if(mappingtable['project'])         postdata['issue']['project_id']       = sheet.cell(mappingtable['project'].toUpperCase()).value();
      if(mappingtable['tracker'])         postdata['issue']['tracker_id']       = sheet.cell(mappingtable['tracker'].toUpperCase()).value();
      if(mappingtable['status'])          postdata['issue']['status_id']        = sheet.cell(mappingtable['status'].toUpperCase()).value();
      if(mappingtable['priority'])        postdata['issue']['priority_id']      = sheet.cell(mappingtable['priority'].toUpperCase()).value();
      if(mappingtable['category'])        postdata['issue']['category_id']      = sheet.cell(mappingtable['category'].toUpperCase()).value();
      if(mappingtable['fixed_version'])   postdata['issue']['fixed_version_id'] = sheet.cell(mappingtable['fixed_version'].toUpperCase()).value();
      if(mappingtable['assigned_to'])     postdata['issue']['assigned_to_id']   = sheet.cell(mappingtable['assigned_to'].toUpperCase()).value();
      if(mappingtable['subject'])         postdata['issue']['subject']          = sheet.cell(mappingtable['subject'].toUpperCase()).value();
      if(mappingtable['description'])     postdata['issue']['description']      = sheet.cell(mappingtable['description'].toUpperCase()).value();
      if(mappingtable['start_date'])      postdata['issue']['start_date']       = sheet.cell(mappingtable['start_date'].toUpperCase()).value();
      if(mappingtable['done_ratio'])      postdata['issue']['done_ratio']       = sheet.cell(mappingtable['done_ratio'].toUpperCase()).value();
      if(mappingtable['estimated_hours']) postdata['issue']['estimated_hours']  = sheet.cell(mappingtable['estimated_hours'].toUpperCase()).value();
      if(mappingtable['custom_fields'])   postdata['issue']['custom_fields']    = custom_fields;
      if(mappingtable['created_on'])      postdata['issue']['created_on']       = sheet.cell(mappingtable['created_on'].toUpperCase()).value();
      if(mappingtable['updated_on'])      postdata['issue']['updated_on']       = sheet.cell(mappingtable['updated_on'].toUpperCase()).value();
      imported.value = JSON.stringify(postdata, null, '\t');
    })
    .catch(function (err) {
      imported.value = (err.message || err);
    });
}

// 入力ファイルの取得
function getWorkbook() {
  var file = fileInput.files[0];
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
        result.value = `${xhr.responseText}\n${result.value}`;
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
  return getTemplate()
    .then(function (workbook) {
      // シートに書き込み
      var sheet = workbook.sheet(0);
      // チケットの基本データ
      fileds.forEach(function(key) {
        // 対象のキーがnameプロパティを持っていればその値を、そうでなければ対象のキーの値を出力 //TODO
        if(mappingtable[key]) sheet.cell(mappingtable[key].toUpperCase()).value(issue[key]['name'] || issue[key]);
      });
      // カスタムフィールドのデータ
      mappingtable.custom_fields.forEach(function(item) {
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
function getTemplate() {
  var templatePath = `${templateDir}/${issue.project.id}/${issue.tracker.id}.xlsx`;
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", templatePath, true);
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