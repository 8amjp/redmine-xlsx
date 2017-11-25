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

## Install

Redmineと同じサーバー上に

`git clone git://github.com/8amjp/redmine-xio.git`

で取得して、

`npm install`

で追加モジュールをインストールしてください。

## Usage

起動前にいくつか準備するものがあります。

### 設定ファイル(config.json)

Excelファイル(.xlsx)のエクスポートは、`public/templates` ディレクトリ内のテンプレートファイルを読み込んで
追記する方式を取っていますので、事前に準備する必要があります。

テンプレートファイル、及びマッピングテーブル(チケットの項目とセル番号との対比表)は、次の3種類の指定方法があります。

* Redmine全体で1つだけ準備する
* Redmineの「プロジェクト」毎に準備する
* Redmineの「プロジェクト」及び「トラッカー」毎に準備する 

## Author

[8amjp](https://github.com/8amjp)
