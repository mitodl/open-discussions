# Generated manually for discussion removal - drop channels tables

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0007_remove_discussion_models"),
    ]

    operations = [
        # Drop all channels app tables
        migrations.RunSQL(
            sql="""
                DROP TABLE IF EXISTS channels_spamcheckresult CASCADE;
                DROP TABLE IF EXISTS channels_article CASCADE;
                DROP TABLE IF EXISTS channels_comment CASCADE;
                DROP TABLE IF EXISTS channels_channelmembershipconfig_channels CASCADE;
                DROP TABLE IF EXISTS channels_channelmembershipconfig CASCADE;
                DROP TABLE IF EXISTS channels_channelgrouprole CASCADE;
                DROP TABLE IF EXISTS channels_channelsubscription CASCADE;
                DROP TABLE IF EXISTS channels_post CASCADE;
                DROP TABLE IF EXISTS channels_linkmeta CASCADE;
                DROP TABLE IF EXISTS channels_channelinvitation CASCADE;
                DROP TABLE IF EXISTS channels_channel CASCADE;
                DROP TABLE IF EXISTS channels_subscription CASCADE;
                DROP TABLE IF EXISTS channels_redditaccesstoken CASCADE;
                DROP TABLE IF EXISTS channels_redditrefreshtoken CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Drop all channels_fields app tables
        migrations.RunSQL(
            sql="""
                DROP TABLE IF EXISTS channels_fields_subfield CASCADE;
                DROP TABLE IF EXISTS channels_fields_fieldlist CASCADE;
                DROP TABLE IF EXISTS channels_fields_fieldchannelgrouprole CASCADE;
                DROP TABLE IF EXISTS channels_fields_fieldchannel CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
