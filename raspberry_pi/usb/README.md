# 工作コントローラーのUSB接続

Pico / Pico W系のCircuitPythonから、PCブラウザー版へUSB CDCで操作データを送ります。元の `../code.py`（Wi-Fi / UDP）と同じGPIOを使います。旧コードと `connection_check/recv_test.py` は残してあります。

ゲームの **「コントローラーをつなぐ」** から、準備、ファイル保存、ポート選択、上下左右・A/Bの反応確認、中央調整、方向反転、ゲーム開始まで進めます。PCのChrome / Edgeを想定しています。追加のPCサーバーやWi-Fi設定は不要です。

## 準備

詳しい配線とコピー手順は [README.txt](README.txt) を参照してください。このファイルと `boot.py`、`code.py` はPWAにも同梱し、ゲームをキャッシュした後はオフラインで保存できます。

既存の `boot.py` / `code.py` は先にPCへバックアップします。CircuitPythonの `CIRCUITPY` ドライブへ2ファイルをコピーし、USBを抜き差ししてから接続してください。ファイルの自動書き込みや、基板への自動インストールは行いません。

Linux搭載のRaspberry Pi 4などや純正Wiiリモコン用ではありません。機種や配線が違う場合は、その機器に合わせた対応が必要です。すでにUSB HIDゲームパッドやキーボードとして動く機器は、ゲーム内で該当する接続方式を選べます。

## 通信仕様

ASCII、改行区切り、約20Hz、ブラウザー側のオープン設定は115200 baudです。

```text
HIMO1,x,y,stick,A,B\n
HIMO1,0.000,-0.500,0,1,0\n
```

`x,y` は -1〜1、ボタンは押したとき1、離したとき0。スティック押し込みもAとして扱います。旧UDP形式とはボタン値の意味が違います。明示した形式に合わない行や長すぎる行は破棄し、コンソールのログを操作として扱いません。

`boot.py` でコンソールとデータ用のUSB CDCを両方有効にします。ブラウザーはユーザー操作でデータ用ポートを選び、DTRを有効にして読み取ります。COM番号を固定せず、初回接続時に自動でポートを開くこともありません。

入力は中央・ボタンを離した状態が250ms続くまで有効化しません。方向入力はしきい値0.55、解除0.28、長押し時は初回480ms、その後220ms間隔です。A/Bは押した瞬間のみ反応します。データが1.6秒途切れた場合も操作を停止し、再テストから再開します。

## 検証

リポジトリの一番上で：

```sh
python -m unittest discover -s raspberry_pi/usb -p 'test_*.py'
```

標準Python上でCircuitPythonモジュールを模擬し、GPIO値からのパケット作成、分割書き込み、未接続時、起動設定を検証します。Web側の通信・入力テストは `cd web && npm test`。**実機のUSB列挙・配線・電圧・操作感の検証は未実施**です。

実機では、正しいドライブとデータ用ポートが出ること、6つの入力、中央調整、方向反転、切断停止・再接続、オフラインでの再接続を確認してください。

仕様の参照：[CircuitPython usb_cdc](https://docs.circuitpython.org/en/latest/shared-bindings/usb_cdc/)、[Chrome Web Serial](https://developer.chrome.com/docs/capabilities/serial)、[MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)。
