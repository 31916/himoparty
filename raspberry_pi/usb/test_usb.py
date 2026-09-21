"""Host-side simulation of the shipped firmware; does not replace a board test."""
from pathlib import Path
import runpy
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parent


class EndSimulation(Exception):
    pass


class FirmwareTests(unittest.TestCase):
    def run_code(self, connected=True, chunk_size=1000, data_enabled=True):
        output = bytearray()
        values = {"GP26": 49152, "GP27": 16384, "GP16": False, "GP0": True, "GP1": False}

        def write(data):
            count = min(chunk_size, len(data))
            output.extend(data[:count])
            return count

        def sleep(_):
            raise EndSimulation()

        serial = SimpleNamespace(connected=connected, write=write)
        modules = {
            "board": SimpleNamespace(**{pin: pin for pin in values}),
            "analogio": SimpleNamespace(AnalogIn=lambda pin: SimpleNamespace(value=values[pin])),
            "digitalio": SimpleNamespace(DigitalInOut=lambda pin: SimpleNamespace(value=values[pin]), Pull=SimpleNamespace(UP="UP")),
            "usb_cdc": SimpleNamespace(data=serial if data_enabled else None),
            "time": SimpleNamespace(sleep=sleep),
        }
        with patch.dict(sys.modules, modules):
            try:
                runpy.run_path(str(ROOT / "code.py"))
            except EndSimulation:
                pass
        return output.decode("ascii"), serial

    def test_boot_enables_data_without_disabling_console(self):
        calls = []
        with patch.dict(sys.modules, {"usb_cdc": SimpleNamespace(enable=lambda **args: calls.append(args))}):
            runpy.run_path(str(ROOT / "boot.py"))
        self.assertEqual(calls, [{"console": True, "data": True}])

    def test_gpio_values_become_marked_newline_packet_with_pressed_one(self):
        output, serial = self.run_code()
        self.assertEqual(output, "HIMO1,0.500,-0.500,1,0,1\n")
        self.assertEqual(serial.write_timeout, 0.1)

    def test_partial_writes_complete_the_same_packet(self):
        self.assertEqual(self.run_code(chunk_size=3)[0], "HIMO1,0.500,-0.500,1,0,1\n")

    def test_disconnected_host_receives_no_data(self):
        self.assertEqual(self.run_code(connected=False)[0], "")

    def test_missing_boot_setup_has_actionable_error(self):
        with self.assertRaisesRegex(RuntimeError, "Copy boot.py"):
            self.run_code(data_enabled=False)


if __name__ == "__main__":
    unittest.main()
