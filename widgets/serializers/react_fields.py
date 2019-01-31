"""Custom serializer fields for dynamic react fields"""
from rest_framework import serializers
from rest_framework.fields import empty


class ReactField:
    """A react field is a mixin for getting the field spec"""

    def _get_props(self):
        """Returns the field properties"""
        props = {}

        # piggyback on the DRF help_text for html placeholder
        if self.help_text:
            props["placeholder"] = self.help_text

        return props

    def _get_input_type(self):
        """Returns the field's input type"""
        raise NotImplementedError()

    def get_field_spec(self):
        """
        Returns the default field specs for a field

        Returns:
            dict: representing the field spec
        """
        return {
            "field_name": self.field_name,
            "label": self.label,
            "input_type": self._get_input_type(),
            "props": self._get_props(),
            # DRF uses empty as a marker for no-input, but it's not JSON serializable
            "default": "" if self.default is empty else self.default,
        }


class ReactCharField(serializers.CharField, ReactField):
    """ReactField extension of DRF CharField"""

    def _get_input_type(self):
        """Returns the field's input type"""
        return (
            "textarea" if self.max_length is None or self.max_length > 200 else "text"
        )

    def _get_props(self):
        """Returns the field properties"""
        return {
            **super()._get_props(),
            "max_length": self.max_length or "",
            "min_length": self.min_length or "",
        }


class ReactIntegerField(serializers.IntegerField, ReactField):
    """ReactField extension of DRF IntegerField"""

    def _get_input_type(self):
        """Returns the field's input type"""
        return "number"

    def _get_props(self):
        """Returns the field properties"""
        return {
            **super()._get_props(),
            "max": self.max_value or 1,
            "min": self.min_value or 0,
        }


class ReactURLField(serializers.URLField, ReactField):
    """ReactField extension of DRF UrlField"""

    def __init__(self, **kwargs):
        if "show_embed" in kwargs:
            self.show_embed = kwargs.pop("show_embed")
        else:
            self.show_embed = False

        super().__init__(**kwargs)

    def _get_input_type(self):
        """Returns the field's input type"""
        return "url"

    def _get_props(self):
        """Returns the field properties"""
        return {
            **super()._get_props(),
            "max_length": self.max_length or "",
            "min_length": self.min_length or "",
            "show_embed": self.show_embed,
        }


class ReactMarkdownWysiwygField(serializers.CharField, ReactField):
    """ReactField extension of CharField"""

    def _get_input_type(self):
        """Returns the field's input type"""
        return "markdown_wysiwyg"
