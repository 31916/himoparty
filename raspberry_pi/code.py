import time
import board
from analogio import AnalogIn
from digitalio import DigitalInOut, Direction, Pull
import wifi
import socketpool

# Wi-Fi 接続情報
SSID = 'SSIDはここに入れてください'
PASSWORD = 'パスワードはここに入れてください'

# UDP送信先
SERVER_IP = "IPv4アドレスはここに入れてください(2.5Hz)"
SERVER_PORT = 5005

RETRY_WAIT_SEC = 5

led = DigitalInOut(board.LED)
led.direction = Direction.OUTPUT
led.value = False

adc_x = AnalogIn(board.GP26)
adc_y = AnalogIn(board.GP27)
button = DigitalInOut(board.GP16)
button.pull = Pull.UP

sw1 = DigitalInOut(board.GP0)
sw1.pull = Pull.UP
sw2 = DigitalInOut(board.GP1)
sw2.pull = Pull.UP

def normalize(val):
    return (val - 32768) / 32768

def apply_deadzone(val, threshold=0.1):
    return 0 if abs(val) < threshold else val

while True:
    if not wifi.radio.ipv4_address:
        while not wifi.radio.ipv4_address:
            try:
                led.value = not led.value
                wifi.radio.connect(SSID, PASSWORD)
            except (ConnectionError, Exception):
                time.sleep(RETRY_WAIT_SEC)

        led.value = True
        pool = socketpool.SocketPool(wifi.radio)
        sock = pool.socket(pool.AF_INET, pool.SOCK_DGRAM)

    try:
        axis_x = apply_deadzone(normalize(adc_x.value))
        axis_y = apply_deadzone(normalize(adc_y.value))

        button_value = 1 if not button.value else 0
        sw1_value = 1 if not sw1.value else 0
        sw2_value = 1 if not sw2.value else 0

        msg = f"{axis_x:.3f},{axis_y:.3f},{button_value},{sw1_value},{sw2_value}"
        sock.sendto(msg.encode(), (SERVER_IP, SERVER_PORT))

        time.sleep(0.1)

    except OSError:
        if 'sock' in locals() and sock:
            sock.close()
        led.value = False
    except Exception:
        time.sleep(1)
