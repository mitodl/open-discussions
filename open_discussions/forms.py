"""open_discussions forms"""
from django import forms

AUTH_TYPE_REGISTER = 'register'
AUTH_TYPE_LOGIN = 'login'


class LoginForm(forms.Form):
    """Form to login an existing user"""
    auth_type = forms.CharField(initial=AUTH_TYPE_LOGIN, widget=forms.HiddenInput)
    email = forms.EmailField(label='Email')
    password = forms.CharField(label='Password', widget=forms.PasswordInput)


class EmailForm(forms.Form):
    """Form to start registration"""
    auth_type = forms.CharField(initial=AUTH_TYPE_REGISTER, widget=forms.HiddenInput)
    email = forms.EmailField(label='Email')


class PasswordAndProfileForm(forms.Form):
    """Form to register a new user"""
    auth_type = forms.CharField(initial=AUTH_TYPE_REGISTER, widget=forms.HiddenInput)
    fullname = forms.CharField(label='Full Name')
    password = forms.CharField(label='Password', widget=forms.PasswordInput)
    password_confirm = forms.CharField(label='Password Confirm', widget=forms.PasswordInput)

    def clean(self):
        """Validate that password and confirmation match"""
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")

        if password != password_confirm:
            self.add_error('password_confirm', 'Passwords must match')
