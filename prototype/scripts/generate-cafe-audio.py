"""Compatibility entry point: regenerate the complete selected-voice audio set.
Legacy positional arguments are no longer used; manifests retain synthesis inputs.
"""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('generate-selected-audio.py')), run_name='__main__')
