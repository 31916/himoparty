"""Pico / Pico W CircuitPython USB controller for the himoparty PWA.

Uses the same GPIO wiring as raspberry_pi/code.py (the original Wi-Fi version).
No additional libraries, Wi-Fi credentials or PC server are required.
"""
import time
import board
import usb_cdc
from analogio import AnalogIn
from digitalio import DigitalInOut, Pull

axis_x = AnalogIn(board.GP26)
axis_y = AnalogIn(board.GP27)
stick = DigitalInOut(board.GP16)
button_a = DigitalInOut(board.GP0)
button_b = DigitalInOut(board.GP1)
for button in (stick, button_a, button_b):
    button.pull = Pull.UP

serial = usb_cdc.data
if serial is None:
    raise RuntimeError("Copy boot.py too, then unplug and reconnect USB.")
serial.write_timeout = 0.1


def normalize(value):
    return max(-1.0, min(1.0, (value - 32768) / 32768))


def packet():
    # Explicit protocol marker + normalized axes + three active-high buttons.
    return "HIMO1,{:.3f},{:.3f},{},{},{}\n".format(
        normalize(axis_x.value), normalize(axis_y.value),
        int(not stick.value), int(not button_a.value), int(not button_b.value)
    ).encode("ascii")


while True:
    if serial.connected:
        try:
            data = packet()
            sent = 0
            while sent < len(data) and serial.connected:
                count = serial.write(data[sent:])
                if not count:
                    # Separate an interrupted packet from the next complete one.
                    serial.write(b"\n")
                    break
                sent += count
        except OSError:
            pass  # The browser can close/reopen its port without restarting the board.
    time.sleep(0.05)
