"""
test_interviewer.py – Verification test suite for Module 2: Voice Interview Bot
Tests:
  1. Multilingual context and prompt builder
  2. Single question pacing and follow-up protocol
  3. Pluggable providers (cloud vs local profile fallback)
  4. Authentication headers and endpoint contract
  5. Feedback JSON extraction and parsing
"""

import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from interviewer import InterviewerAgent, LANGUAGE_NAMES
from plugins.stt import build_stt
from plugins.llm import build_llm
from plugins.tts import build_tts


def test_multilingual_context():
    print("  Testing multilingual context builder...")
    agent = InterviewerAgent("session-123", "http://localhost:3000", "test-secret", 20)

    # Test English
    en_ctx = {
        "language": "en",
        "resume": {"name": "Alex", "skills": ["Python", "FastAPI"], "experienceYears": 3},
        "jd": {"title": "Backend Engineer", "requiredSkills": ["Python", "PostgreSQL"], "responsibilities": ["Build APIs"]},
        "skillGap": {"missingSkills": ["Docker"]},
        "codingProblem": {"title": "Two Sum"},
    }
    en_block = agent._build_context_block(en_ctx)
    assert "English (en)" in en_block, "English language should be present in context"
    assert "Two Sum" in en_block, "Coding challenge should be included"
    assert "Pacing Rules" in en_block, "Pacing rules must be present"

    # Test Spanish
    es_ctx = {**en_ctx, "language": "es"}
    es_block = agent._build_context_block(es_ctx)
    assert "Spanish (Español) (es)" in es_block, "Spanish language should be configured"
    assert "Mandatory Language Requirement" in es_block

    # Test Hindi
    hi_ctx = {**en_ctx, "language": "hi"}
    hi_block = agent._build_context_block(hi_ctx)
    assert "Hindi" in hi_block, "Hindi language should be configured"

    print("  ✓ Multilingual prompt generation verified for English, Spanish, Hindi.")


def test_auth_headers():
    print("  Testing internal authenticated endpoint headers...")
    secret = "rehearse-bot-secret-xyz"
    agent = InterviewerAgent("session-abc", "http://localhost:3000", secret, 25)
    headers = agent._headers()
    assert headers["x-internal-secret"] == secret
    assert headers["Content-Type"] == "application/json"
    print("  ✓ Internal API security headers correctly include shared secret.")


def test_feedback_extraction():
    print("  Testing feedback JSON parser...")
    agent = InterviewerAgent("session-test", "http://localhost:3000", "secret", 20)

    # Valid JSON in transcript
    agent._transcript = [
        {"role": "user", "text": "I solved it using two pointers."},
        {
            "role": "assistant",
            "text": 'Great interview. Here is my feedback: {"overallScore": 8.5, "strengths": ["Clear speech"], "weaknesses": ["Edge cases"], "improvementPlan": ["Review sliding window"], "perQuestion": []}',
        },
    ]
    summary = agent._extract_feedback_json()
    assert summary["overallScore"] == 8.5
    assert "Clear speech" in summary["strengths"]

    # Fallback when no JSON
    agent._transcript = [{"role": "assistant", "text": "Thank you, goodbye!"}]
    fallback = agent._extract_feedback_json()
    assert fallback["overallScore"] == 7.0
    assert "_note" in fallback
    print("  ✓ Feedback JSON parser extracts structured summaries and gracefully falls back.")


def test_pluggable_providers():
    print("  Testing pluggable provider builders (cloud vs local)...")
    
    # 1. Local profile
    local_stt = build_stt("local", language="en")
    assert local_stt is not None, "Local STT should be instantiated"

    local_llm = build_llm("local")
    assert local_llm is not None, "Local LLM should be instantiated"

    local_tts = build_tts("local", language="es")
    assert local_tts is not None, "Local TTS should be instantiated"

    # 2. Cloud profile (handles fallback gracefully)
    cloud_stt = build_stt("cloud", language="fr")
    assert cloud_stt is not None, "Cloud STT should instantiate or fallback"

    cloud_llm = build_llm("cloud")
    assert cloud_llm is not None, "Cloud LLM should instantiate"

    cloud_tts = build_tts("cloud", language="de")
    assert cloud_tts is not None, "Cloud TTS should instantiate or fallback"

    print("  ✓ Pluggable profiles (cloud and local) verified across languages.")


def main():
    print("\n🔍 Running Voice Interview Bot Verification Tests...\n")
    test_multilingual_context()
    test_auth_headers()
    test_feedback_extraction()
    test_pluggable_providers()
    print("\n✅ All Voice Interview Bot tests passed successfully!\n")


if __name__ == "__main__":
    main()
