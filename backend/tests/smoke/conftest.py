import pytest
import httpx


def pytest_addoption(parser):
    parser.addoption(
        "--base-url",
        default="https://chauchero-production.up.railway.app",
        help="Base URL of the deployed API to smoke-test",
    )


@pytest.fixture(scope="session")
def base_url(request):
    return request.config.getoption("--base-url").rstrip("/")


@pytest.fixture(scope="session")
def client(base_url):
    with httpx.Client(base_url=base_url, timeout=15) as c:
        yield c
