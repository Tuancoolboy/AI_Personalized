import os
from unittest.mock import patch

import pytest

from backend.config import Settings


def test_settings_requires_openai_key_in_development():
    with patch.dict(
        os.environ,
        {"APP_ENV": "development", "OPENAI_API_KEY": ""},
        clear=False,
    ):
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            Settings()


def test_settings_allows_empty_key_in_test():
    with patch.dict(
        os.environ,
        {"APP_ENV": "test", "OPENAI_API_KEY": ""},
        clear=False,
    ):
        settings = Settings()
        assert settings.app_env == "test"
