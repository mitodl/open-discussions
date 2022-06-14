"""Utility functions for channels_fields"""


def get_group_role_name(field_name, role):
    """Get the group name for a FieldChannel and role"""
    return f"field_{field_name}_{role}"
