NodeCGで動作する配信画面と管理ツールです。
2025年版です。競技関連の全システムを統合しました。

# 2024からの更新内容
* 会場タイマーと連携
* 入力担当者の役割分け
    * 審判：タイマー、リトライ
    * 運営：競技者、得点
* 役割分け用の機能対応
    * 制御用画面を2つに分ける：Dashboardを2タブに
    * ローカルネットワークから表示可能に

# 装置構成想定
* Wi-Fiアクセスポイント（ルーターモード）：WANに接続
    * L2SW
        * ノートPC（審判・タイマー）（静的IP）
            * NodeCG
            * 会場用タイマー表示（外部モニター）
            * 審判向けNodeCG操作画面（PC画面）
        * ミニPC（配信）
            * OBS
                * NodeCGにはローカルネットワーク経由でアクセス（グラフィック処理をミニPC（のブラウザ）で実施）
            * NodeCG操作画面（マスタ）
    * 運営タブレット端末
        * 運営向けNodeCG操作画面

# ポート開放
[https://support.borndigital.co.jp/hc/ja/articles/360002711593-Windows10%E3%81%A7%E7%89%B9%E5%AE%9A%E3%81%AE%E3%83%9D%E3%83%BC%E3%83%88%E3%82%92%E9%96%8B%E6%94%BE%E3%81%99%E3%82%8B]
[https://eset-support.canon-its.jp/faq/show/235?site_domain=default]

# 導入方法
## 初期条件
* Windows 11（10以降はおそらくOK）
* Powershell 7以降
* Node.jsインストール済み
    * V22系列のインストールが必要

## NodeCGの導入・プロジェクト構築
[https://qiita.com/nanana08/items/73e3dcb33676c93eddac]

このリポジトリを *クローンせずに* 以下を実行

```powershell
# nodecgをインストール
# プロジェクトを作成
npm install --global nodecg@latest
nodecg setup

# bundles配下にこのリポジトリをクローン
nodecg install shibu2sclub/yasarobo-live-info-2025
```

## トラブルシューティング
### Windows Powershell (Ver. 5以下)でnodecg setupに失敗する
```nodecg setup```を行おうとすると、「このシステムではスクリプトの実行が無効になっているため…」と出る。

* Powershell (Ver. 7以降)をインストールする。
    * ターミナルを開いて一番上に出てくるリンクからPowershellをインストール。
* ターミナルを再度開いて、既定のターミナルを```Windows Powershell```から```Powershell```に変更。
* VSCodeなどでターミナルを動かしている場合は一度元のターミナルを閉じて新しくターミナルを開き、```Powershell```に切り替える。

# 起動
```powershell
npm start
```

```localhost:9090```にアクセス。
