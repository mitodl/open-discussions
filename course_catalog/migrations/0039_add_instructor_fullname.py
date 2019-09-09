# Generated by Django 2.1.11 on 2019-09-12 18:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0038_program_prices")]

    operations = [
        migrations.AddField(
            model_name="courseinstructor",
            name="full_name",
            field=models.CharField(blank=True, max_length=256, null=True),
        ),
        migrations.AlterField(
            model_name="courseinstructor",
            name="first_name",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
        migrations.AlterField(
            model_name="courseinstructor",
            name="last_name",
            field=models.CharField(blank=True, max_length=128, null=True),
        ),
    ]
