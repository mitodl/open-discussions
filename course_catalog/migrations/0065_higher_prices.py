# Generated by Django 2.2.10 on 2020-04-01 14:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("course_catalog", "0064_add_indexes")]

    operations = [
        migrations.AlterField(
            model_name="courseprice",
            name="price",
            field=models.DecimalField(decimal_places=2, max_digits=12),
        )
    ]
