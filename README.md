Redmine Xio
===========

Redmine Xlsx Input-Output tool.
    
[Redmine](http://www.redmine.org/)に、Excelファイルをインポート/エクスポートできる機能を追加します。  
が、プラグインを作るのは大変なので、[Express](https://www.npmjs.com/package/express)でWebサーバーを立ててAPIで連携します。

## Description

例えば、  
http://localhost/redmine/issues/1 にアクセスするとチケット#1の情報を表示しますが、  
http://localhost:3000/redmine/issues/1 にアクセスするとチケット#1をExcel形式でインポート/エクスポートできる画面を表示します。

## Requirement

このツールは[Express](https://www.npmjs.com/package/express)をベースとし、下記のnpmモジュールを使用しています。

* [xlsx-populate](https://www.npmjs.com/package/xlsx-populate) Excelファイルの読み書き
* [request](https://www.npmjs.com/package/request) Redmine Rest APIとの通信
* [bootstrap](https://www.npmjs.com/package/bootstrap)
* [jQuery](https://www.npmjs.com/package/jquery)
* [moment](https://www.npmjs.com/package/moment) 日付の計算

## Install

Redmineと同じサーバー上に

`git clone git://github.com/8amjp/redmine-xio.git`

で取得して、

`npm install`

で追加モジュールをインストールしてください。

## Usage

起動前にいくつか準備するものがあります。

### 設定ファイル

#### config.json
この設定ファイルでは、Redmineと連携するためのAPIアクセスキーを指定します。

#### templates.json

Excelファイル(.xlsx)のエクスポートは、事前に用意したテンプレートファイルを読み込んで追記する方式を取っています。  
そのテンプレートファイルの名前、またマッピングテーブル(チケットの項目とセル番号との対比表)についてはこの設定ファイルで指定します。  
テンプレートファイル、及びマッピングテーブルは、次の3種類の指定方法があります。

* Redmine全体で1つだけ準備する
* Redmineの「プロジェクト」毎に準備する
* Redmineの「プロジェクト」及び「トラッカー」毎に準備する 

##### title

##### filename

`public/templates` ディレクトリ内の

##### mapping_table

チケットの項目が、どのセルに対応しているのかを記述します。

###### 型の指定

`{ "id" : 2, "cell" : "C2", "type" : "datetime" }`

###### 複数選択可能なキー・バリュー リスト

下記のように指定します。

```
{ "id" : 3, "cell" : [
  { "value" : "1", "cell" : "C3" },
  { "value" : "2", "cell" : "D3" },
  { "value" : "3", "cell" : "E3" }
], "type" : "enumeration", "multiple" : true}
```

`cell`の一番目で指定されたセルの値がtrueの場合、`value`の一番目で指定された値が入力されます。

## Author

[8amjp](https://github.com/8amjp)
