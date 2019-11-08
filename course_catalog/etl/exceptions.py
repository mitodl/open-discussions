"""ETL Exceptions"""


class ExtractException(Exception):
    """Base class for extract exceptions"""


class ExtractVideoException(ExtractException):
    """Exception for video extraction"""


class ExtractPlaylistException(ExtractException):
    """Exception for playlist extraction"""


class ExtractPlaylistItemException(ExtractException):
    """Exception for playlist item extraction"""
