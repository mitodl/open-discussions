"""
infinite_example views
"""
from django.shortcuts import render


def index(request, **kwargs):  # pylint: disable=unused-argument
    """Render the example app"""
    return render(request, "example.html")
