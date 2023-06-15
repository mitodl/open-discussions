"""Management command for backpopulating ocw topics"""

from django.core.management import BaseCommand
from django.db.models import Q

from course_catalog.models import Course, CourseTopic
from course_catalog.utils import get_ocw_topics
from search.search_index_helpers import upsert_course


class Command(BaseCommand):
    """Populate ocw course run topics"""

    help = "Populate ocw course run topics"

    def handle(self, *args, **options):
        for course in Course.objects.filter(Q(platform="ocw") & Q(published=True)):
            course_topics = set()
            for run in course.runs.filter(published=True):
                run_topics = [
                    CourseTopic.objects.get_or_create(name=topic)[0]
                    for topic in get_ocw_topics(run.raw_json["course_collections"])
                ]
                run.topics.set(run_topics)
                course_topics.update(set(run_topics))
            course.topics.set([course_topic.id for course_topic in course_topics])
            upsert_course(course.id)
