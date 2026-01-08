"""Command to generate the channel avatar SVGs"""
import os

from django.core.management.base import BaseCommand

TEMPLATE = """
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 90 90">
    <defs>
        <linearGradient spreadMethod="pad" id="gradient" x1="80%" y1="116%" x2="0%" y2="0%">
            <stop offset="0%" style="stop-color:{top_color};stop-opacity:1;"/>
            <stop offset="100%" style="stop-color:{bottom_color};stop-opacity:1;"/>
        </linearGradient>
    </defs>
    <rect width="90" height="90" y="0" x="0" fill="url(#gradient)"/>
</svg>
"""

COLORS = [
    ["#61BB3A", "#02A0C6"],
    ["#03152D", "#6B829A"],
    ["#E01238", "#D97422"],
    ["#1CC5D9", "#35C880"],
    ["#3023AE", "#C86DD7"],
]

DIRECTORY = "static/images/channel_avatars"


class Command(BaseCommand):
    """Command to generate the channel avatar SVGs"""

    help = "Command to generate the channel avatar SVGs"

    def handle(self, *args, **options):
        # get a list of the colors plus the reverse gradient of each
        all_colors = COLORS + list(map(reversed, COLORS))
        os.makedirs(DIRECTORY, exist_ok=True)
        for idx, (top_color, bottom_color) in enumerate(all_colors):
            with open(f"{DIRECTORY}/channel-avatar-{idx}.svg", "w") as f:
                f.write(TEMPLATE.format(top_color=top_color, bottom_color=bottom_color))
