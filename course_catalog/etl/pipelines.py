"""ETL pipelines"""
from toolz import compose

from course_catalog.etl import micromasters, loaders


micromasters_etl = compose(
    loaders.load_programs, micromasters.transform, micromasters.extract
)
