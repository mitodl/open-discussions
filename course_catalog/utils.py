""" Utils for course catalog """
from open_discussions.utils import generate_filepath


def learning_path_image_upload_uri(instance, filename):
    """
    upload_to handler for user-created Learning Path image
    """
    return generate_filepath(
        filename, instance.author.username, instance.title, "learning_path"
    )


def program_image_upload_uri(instance, filename):
    """
    upload_to handler for Program image
    """
    return generate_filepath(filename, instance.title, "", "program")
