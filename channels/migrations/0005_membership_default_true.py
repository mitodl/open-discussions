"""
Set all membership_is_managed to true at the time this migration is run,
since all Channels come from micromasters at this point
"""
from django.db import migrations


def set_membership_to_true(apps, schema_editor):
    """Set membership_is_managed to true"""
    Channel = apps.get_model('channels', 'Channel')
    # At the point the migration runs
    Channel.objects.all().update(membership_is_managed=True)


class Migration(migrations.Migration):
    dependencies = [
        ('channels', '0004_channel_membership_is_managed'),
    ]

    operations = [
        migrations.RunPython(set_membership_to_true, reverse_code=migrations.RunPython.noop),
    ]
