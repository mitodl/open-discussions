"""Delete es course records that don't have a database object"""
from django.core.management.base import BaseCommand

from course_catalog.models import Course
from search.connection import get_default_alias_name
from search.constants import COURSE_TYPE
from search.indexing_api import es_iterate_all_documents, gen_course_id
from search.tasks import deindex_document


class Command(BaseCommand):
    """Delete es course records that don't have a database object"""

    help = "Remove courses with no database record from the opensearch index"

    def handle(self, *args, **options):
        """Delete es course records that don't have a database object"""
        index = get_default_alias_name(COURSE_TYPE)

        es_course_ids = set()
        bad_courses = []
        bad_documents = []

        for course_obj in Course.objects.filter(published=True):
            es_course_ids.add(gen_course_id(course_obj.platform, course_obj.course_id))

        query = {"term": {"object_type": "course"}}

        for listing in es_iterate_all_documents(index, query):
            es_id = listing["_id"]
            if es_id not in es_course_ids:
                bad_courses.append(listing)

        for course in bad_courses:
            query = {"parent_id": {"type": "resourcefile", "id": course["_id"]}}
            for document in es_iterate_all_documents(index, query):
                bad_documents.append(document)

        self.stdout.write(f"Removing {len(bad_documents)} document records")

        for doc in bad_documents:
            deindex_document(
                doc["_id"],
                COURSE_TYPE,
                routing=doc["_source"]["resource_relations"]["parent"],
            )

        self.stdout.write(f"Removing {len(bad_courses)} course records")

        for course in bad_courses:
            deindex_document(course["_id"], COURSE_TYPE)
