import pytest
from app.services.gemini_listing import validate_onboarding_output


def output(**patch):
    return dict(value=None, value_hi=None, farm_size_acres=None, crops=[], confirmed=None, unknown=False, confidence="high", **patch)


@pytest.mark.parametrize("area", [-2, 0, 501, float("inf"), float("nan"), True, "2"])
def test_rejects_invalid_area(area):
    payload = output()
    payload["farm_size_acres"] = area
    with pytest.raises(ValueError):
        validate_onboarding_output(payload, "farm_size", [])


@pytest.mark.parametrize("malformed", [None, [], {"value": 2}, {"crops": "Spinach"}])
def test_rejects_malformed_output(malformed):
    with pytest.raises(ValueError):
        validate_onboarding_output(malformed, "crops", ["Spinach"])


def test_rejects_out_of_state_district():
    payload = output()
    payload["value"] = "Lucknow"
    with pytest.raises(ValueError):
        validate_onboarding_output(payload, "district", ["Sonipat", "Panipat"])


def test_preserves_valid_decimal():
    payload = output()
    payload["farm_size_acres"] = 2.75
    assert validate_onboarding_output(payload, "farm_size", [])["farm_size_acres"] == 2.75
