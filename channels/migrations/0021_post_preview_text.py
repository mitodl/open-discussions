# Generated by Django 2.1.5 on 2019-02-12 18:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("channels", "0020_remove_article_thumbnail")]

    operations = [
        migrations.AddField(
            model_name="post", name="preview_text", field=models.TextField(null=True)
        )
    ]
