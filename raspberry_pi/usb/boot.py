# Save as CIRCUITPY/boot.py, then unplug and reconnect USB.
import usb_cdc

# Keep the editor/REPL console, and add a separate controller data port.
usb_cdc.enable(console=True, data=True)
