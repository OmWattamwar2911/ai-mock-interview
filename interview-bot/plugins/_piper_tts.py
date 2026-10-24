"""
_piper_tts.py – Offline Text-to-Speech using Piper.

Runs 100% offline on Windows, Linux, and macOS without external API keys.
Requires Piper binary and a voice ONNX model:
  https://github.com/rhasspy/piper/releases
  https://github.com/rhasspy/piper/blob/master/VOICES.md
"""

import asyncio
import logging
import os
import uuid
from typing import Optional
from livekit import rtc
from livekit.agents import tts
from livekit.agents.types import APIConnectOptions

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
            script_dir = os.path.dirname(__file__)
            candidate = os.path.join(script_dir, "..", "models", self._voice_model)
            if os.path.exists(candidate):
                self._voice_model = candidate

    def synthesize(
        self,
        text: str,
        *,
        conn_options: Optional[APIConnectOptions] = None,
    ) -> tts.ChunkedStream:
        return PiperChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options or APIConnectOptions(),
        )


class PiperChunkedStream(tts.ChunkedStream):
    async def _main_task(self) -> None:
        tts_inst: PiperTTS = self._tts  # type: ignore
        tts_inst._verify_installed()

        cmd = [
            tts_inst._executable,
            "--model",
            tts_inst._voice_model,
            "--output-raw",
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            raw_pcm, stderr = await process.communicate(input=self._input_text.encode("utf-8"))

            if process.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                logger.error(f"Piper error: {err_msg}")
                return

            if raw_pcm:
                samples_per_channel = len(raw_pcm) // 2
                if samples_per_channel > 0:
                    frame = rtc.AudioFrame(
                        data=raw_pcm,
                        sample_rate=tts_inst.sample_rate,
                        num_channels=tts_inst.num_channels,
                        samples_per_channel=samples_per_channel,
                    )
                    self._event_ch.send_nowait(
                        tts.SynthesizedAudio(
                            frame=frame,
                            request_id=str(uuid.uuid4()),
                            is_final=True,
                        )
                    )
        except FileNotFoundError:
            logger.warning(
                f"Piper executable '{tts_inst._executable}' not found on system PATH.\n"
                "Install Piper from https://github.com/rhasspy/piper/releases or use PROFILE=cloud."
            )
        except Exception as e:
            logger.error(f"Piper synthesis unexpected error: {e}")
