"""Form tests"""
from authentication.forms import PasswordAndProfileForm


def test_password_and_profile_form_clean():
    """Verify that the form doesn't error with correct inputs"""
    form = PasswordAndProfileForm({
        'fullname': 'Example Name',
        'password': 'abc',
        'password_confirm': 'abc',
        'auth_type': 'register',
    })

    assert form.is_valid() is True


def test_password_and_profile_form_clean_password_mismatch():
    """Verify that on a password mismatch we get an error"""
    form = PasswordAndProfileForm({
        'fullname': 'Example Name',
        'password': 'abc',
        'password_confirm': 'abC',
        'auth_type': 'register',
    })

    assert form.is_valid() is False
    assert form.errors == {
        'password_confirm': ['Passwords must match'],
    }
