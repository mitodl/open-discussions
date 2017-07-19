"""Configuration for betamax"""
from betamax import Betamax
from betamax.util import deserialize_prepared_request
from betamax.matchers.body import BodyMatcher


class CustomBodyMatcher(BodyMatcher):
    """Override BodyMatcher to skip OAuth body checks"""

    name = 'custom-body'

    def match(self, request, recorded_request):
        recorded_request = deserialize_prepared_request(recorded_request)

        request_body = request.body or b''
        recorded_body = recorded_request.body or b''

        # Don't check body for oauth workflow
        if request.url.endswith('api/v1/access_token'):
            return True

        return recorded_body == request_body


Betamax.register_request_matcher(CustomBodyMatcher)


with Betamax.configure() as config:
    config.cassette_library_dir = "cassettes"
    config.default_cassette_options['match_requests_on'] = ['uri', 'method', 'custom-body']
