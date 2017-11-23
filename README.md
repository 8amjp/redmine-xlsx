redmine-xlsx-express
====================

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
  - [jQuery](https://www.npmjs.com/package/jquery)
  - [popper.js](https://www.npmjs.com/package/popper.js)

## Install

`git clone git://github.com/8amjp/redmine-xlsx-express.git`

## Usage

Redmineと同じサーバーで起動させます。

### テンプレートファイルの準備

Excelファイル(.xlsx)のエクスポートは、`public/templates` ディレクトリ内のテンプレートファイルを読み込んで
追記する方式を取っていますので、事前に準備する必要があります。  
また、テンプレートファイルはRedmineの「プロジェクト」「トラッカー」毎に準備する必要があります。  
例えば、プロジェクトIDが「1」、トラッカーIDが「2」のチケットをエクスポートする際には、
`public/templates/1/2.xlsx` をテンプレートとして使用します。

### チケットのフィールド<=>セル番号の対比表

対比表も「プロジェクト」「トラッカー」毎に準備する必要があります。  

## Author

[8amjp](https://github.com/8amjp)
