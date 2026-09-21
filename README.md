# ひもほどき / himoparty

ひもの端を上下左右の空いた場所へ動かし、交差や接触をほどくパズルです。

**[ブラウザーで遊ぶ → https://31916.ch/himoparty/](https://31916.ch/himoparty/)**

Chrome / Edgeで開き、右上の「インストール」からPCのアプリとして追加できます。初回読み込み後、画面下に「オフラインでも遊べます」と出たら、ネットがなくても遊べます。

GitHub Pagesの公開リポジトリ向け無料ホスティングを使用します。サーバー契約は不要です。URLにはアカウントに設定済みのドメインを使用しており、今回新しい有料サービスやドメインを契約していません。

## PCブラウザー・PWA版（0.2.0）

`web/` が新しいブラウザー版です。小学生・高齢者を想定し、時間制限なし、クリックでの操作、大きな文字、数字付きのひも、ヒント、１手戻す機能を備えています。インストール用マニフェストとService Workerにより、一度読み込めばオフラインでも遊べます。

画面の **「コントローラーをつなぐ」** で工作機器の接続を補助します。Pico / Pico W用USBコードの保存、ポート選択、スティックとボタンのテスト、中央調整・方向反転に対応します。USBゲームパッド・キーボードとして動く機器も選べます。

元のコントローラーと接続テストはWi-Fi（UDP）方式でした。USB接続には [新しいCircuitPython用コードと手順](raspberry_pi/usb/README.md) を使います。実物の基板での動作は未確認です。

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

`game/` は既存のProcessing版、`raspberry_pi/code.py` は専用コントローラー用CircuitPythonコード、`connection_check/` はUDP接続確認用コードです。これらの既存ファイルは変更せず、PWAは `web/`、USB用のコードは `raspberry_pi/usb/` に追加しています。

元のBGMはPWA版の配信物には含めていません。PWA版は無音です。
