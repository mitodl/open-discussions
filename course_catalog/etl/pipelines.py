"""ETL pipelines"""
from toolz import compose

from course_catalog.etl import micromasters, loaders, xpro


micromasters_etl = compose(
    loaders.load_programs, micromasters.transform, micromasters.extract
)

xpro_etl = compose(loaders.load_programs, xpro.transform, xpro.extract)
