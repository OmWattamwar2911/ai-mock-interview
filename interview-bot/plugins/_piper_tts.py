"""
_piper_tts.py – Offline Text-to-Speech using Piper.

Runs 100% offline on Windows, Linux, and macOS without external API keys.
Requires Piper binary and a voice ONNX model:
  https://github.com/rhasspy/piper/releases
  https://github.com/rhasspy/piper/blob/master/VOICES.md
"""

import asyncio
import io
import wave
import logging
import os
import subprocess
from typing import Optional
from livekit.agents import tts
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger("plugins.piper")


class PiperTTS(tts.TTS):
    def __init__(
        self,
        *,
        executable: str = "piper",
        voice_model: str = "en_US-lessac-medium.onnx",
    ):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=22050,
            num_channels=1,
        )
        self._executable = executable
        self._voice_model = voice_model

    def _verify_installed(self):
        if not os.path.exists(self._voice_model) and not os.path.isabs(self._voice_model):
            # Check relative to cwd or script dir
            script_dir = os.path.dirname(__file__)
            candidate = os.path.join(script_dir, "..", "models", self._voice_model)
            if os.path.exists(candidate):
                self._voice_model = candidate

    async def _synthesize_impl(
        self,
        text: str,
        *,
        conn_options: Optional[tts.APIConnectOptions] = None,
    ) -> tts.SynthesizedAudio:
        self._verify_installed()

        # Run piper as subprocess piping text to stdin and capturing wav on stdout
        cmd = [
            self._executable,
            "--model", self._voice_model,
            "--output-raw",
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            raw_pcm, stderr = await process.communicate(input=text.encode("utf-8"))

            if process.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                logger.error(f"Piper error: {err_msg}")
                raise RuntimeError(f"Piper synthesis failed (code {process.returncode}): {err_msg}")

            # Return SynthesizedAudio with raw PCM
            return tts.SynthesizedAudio(
                text=text,
                data=AudioBuffer(
                    data=raw_pcm,
                    sample_rate=self.sample_rate,
                    num_channels=self.num_channels,
                ),
            )
        except FileNotFoundError:
            raise RuntimeError(
                f"Piper executable '{self._executable}' not found on system PATH.\n"
                "Install Piper on Windows from https://github.com/rhasspy/piper/releases\n"
                "Or set PROFILE=cloud in .env to use OpenAI / ElevenLabs TTS."
            )
