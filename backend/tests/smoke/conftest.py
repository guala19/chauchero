import os
import pytest
import httpx

_DEFAULT_URL = os.environ.get(
    "SMOKE_TEST_URL", "https://chauchero-production.up.railway.app"
)


def pytest_addoption(parser):
    parser.addoption(
        "--base-url",
        default=_DEFAULT_URL,
        help="Base URL of the deployed API to smoke-test (or set SMOKE_TEST_URL env var)",
    )


@pytest.fixture(scope="session")
def base_url(request):
    return request.config.getoption("--base-url").rstrip("/")


@pytest.fixture(scope="session")
def client(base_url):
    with httpx.Client(base_url=base_url, timeout=15) as c:
        yield c
