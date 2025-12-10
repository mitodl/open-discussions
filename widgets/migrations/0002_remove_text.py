from django.db import migrations


def remove_text_widgets(apps, schema_editor):
    """Remove text widget instances
    """
    WidgetInstance = apps.get_model("widgets", "WidgetInstance")
    WidgetInstance.objects.filter(widget_type="Text").delete()


class Migration(migrations.Migration):
    dependencies = [("widgets", "0001_initial")]

    operations = [
        migrations.RunPython(
            remove_text_widgets, reverse_code=migrations.RunPython.noop
        )
    ]
