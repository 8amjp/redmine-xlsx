var view = (function() {
  /*
    画面表示に関する処理
    */

  const importResult = document.getElementById('import-result');
  const exportResult = document.getElementById('export-result');

  // 現在のデータがない場合、現在のデータを出力するテキストエリアを無効にする
  /*
  if (!(core.dataset.currentdata)) {
    [].forEach.call(document.getElementsByClassName('currentdata'),function(element){
      element.disabled = true;
    });
  }*/

  return {
    clearImportResult: function() {
      importResult.innerHTML = '';
    },

    showImportResult: function(error, response) {
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
    },

    showExportResult: function(status) {
      if (status != 200) {
        exportResult.appendChild( this.createAlert( 'alert-warning', 'テンプレートがありません。空白のブックを使用します。' ));
      }
    },

    createAlert: function(type, message) {
      let element = document.createElement('div');
      element.classList.add('alert', type);
      element.setAttribute('role', 'alert');
      element.innerHTML = message;
      return element;
    },

    // 現在のデータをテーブルに出力
    showCurrentData: function(issue) {
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
    },
    
    // 読み込まれたデータをテーブルに出力
    showPostData: function(issue) {
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

  };
})();