# ひもほどき / himoparty

ひもの端を上下左右の空いた場所へ動かし、交差や接触をほどくパズルです。

**[ブラウザーで遊ぶ → https://31916.ch/himoparty/](https://31916.ch/himoparty/)**

Chrome / Edgeで開き、右上の「インストール」からPCのアプリとして追加できます。初回読み込み後、画面下に「オフラインでも遊べます」と出たら、ネットがなくても遊べます。

GitHub Pagesの公開リポジトリ向け無料ホスティングを使用します。サーバー契約は不要です。URLにはアカウントに設定済みのドメインを使用しており、今回新しい有料サービスやドメインを契約していません。

## PCブラウザー・PWA版（0.1.0）

`web/` が新しいブラウザー版です。小学生・高齢者を想定し、時間制限なし、クリックでの操作、大きな文字、数字付きのひも、ヒント、１手戻す機能を備えています。インストール用マニフェストとService Workerにより、一度読み込めばオフラインでも遊べます。

```sh
cd web
npm test
npm run build
npm start
```

Node.js 22以降が必要です。外部npmパッケージのインストールは不要です。`http://localhost:4173` を開いてください。

- [PWA版の起動・配信・仕様](web/README.md)
- [既存リポジトリの調査と今回の設計](docs/repository-review.md)
- [検証記録](docs/verification.md)

## Processing版

`game/` は既存のProcessing版、`raspberry_pi/` は専用コントローラー用CircuitPythonコード、`connection_check/` はUDP接続確認用コードです。PWA版は独立した実装で、これらのファイルは変更していません。

元のBGMはPWA版の配信物には含めていません。PWA版は無音です。
