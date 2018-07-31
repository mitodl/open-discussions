from django.db import migrations
from django.db.models import Q


def remove_gravatar_urls(apps, schema_editor):
    Profile = apps.get_model('profiles', 'Profile')
    gravatar_url = 'https://www.gravatar.com/avatar/'
    for profile in Profile.objects.filter(
        Q(image__startswith=gravatar_url) |
        Q(image_small__startswith=gravatar_url) |
        Q(image_medium__startswith=gravatar_url)
    ):
        profile.image = None
        profile.image_medium = None
        profile.image_small = None
        profile.save()


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0006_image_fields'),
    ]

    operations = [
        migrations.RunPython(remove_gravatar_urls),
    ]
