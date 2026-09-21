# ひもほどき / himoparty

ひもの端を上下左右の空いた場所へ動かし、交差や接触をほどくパズルです。

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

## Processing版

`game/` は既存のProcessing版、`raspberry_pi/` は専用コントローラー用CircuitPythonコード、`connection_check/` はUDP接続確認用コードです。PWA版は独立した実装で、これらのファイルは変更していません。

元のBGMはPWA版の配信物には含めていません。PWA版は無音です。
