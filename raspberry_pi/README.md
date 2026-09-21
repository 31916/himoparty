# コントローラー

PCブラウザー版は [USB接続用のコードと手順](usb/README.md) を使います。

## Processing版へのWi-Fi接続

`code.py` はPico WのCircuitPythonからUDPで操作を送る、Processing版用のコードです。

1. `settings.example.toml` をPico Wの `CIRCUITPY` ドライブへコピーし、名前を `settings.toml` に変えます。
2. その端末上でWi-Fi名・パスワードと、Processingを動かすPCのローカルIPアドレスを入力します。
3. `code.py` を同じドライブへコピーして再起動します。受信ポートは初期値5005です。

接続情報を含む `settings.toml` はGitに追加しません。ブラウザー版ではこのWi-Fi設定は不要です。
